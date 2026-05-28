"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import PageHeader from "../components/ui/PageHeader";
import KPICard from "../components/ui/KPICard";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

const LazyCharts = dynamic(() => import("./Charts"), {
  ssr: false,
  loading: () => (
    <div className="space-y-8">
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 mb-8">
        <div className="h-4 w-36 bg-[#27272A] rounded mb-4 animate-pulse" />
        <div className="h-[280px] bg-[#09090B] rounded animate-pulse" />
      </div>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5">
          <div className="h-4 w-28 bg-[#27272A] rounded mb-4 animate-pulse" />
          <div className="h-[220px] bg-[#09090B] rounded animate-pulse" />
        </div>
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5">
          <div className="h-4 w-36 bg-[#27272A] rounded mb-4 animate-pulse" />
          <div className="h-[220px] bg-[#09090B] rounded animate-pulse" />
        </div>
      </div>
    </div>
  ),
});

const LazyYTDCharts = dynamic(() => import("./YTDComparisonCharts"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 mb-8">
      <div className="h-4 w-56 bg-[#27272A] rounded mb-4 animate-pulse" />
      <div className="h-[280px] bg-[#09090B] rounded animate-pulse" />
    </div>
  ),
});

const LazyBudgetTracker = dynamic(() => import("./BudgetTracker"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 mb-8">
      <div className="h-4 w-48 bg-[#27272A] rounded mb-4 animate-pulse" />
      <div className="space-y-4">
        <div className="h-12 bg-[#09090B] rounded animate-pulse" />
        <div className="h-12 bg-[#09090B] rounded animate-pulse" />
        <div className="h-12 bg-[#09090B] rounded animate-pulse" />
      </div>
    </div>
  ),
});

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  projectId: string | null;
  recurring: boolean;
  notes: string | null;
  receiptSaved: boolean;
  taxDeductible: string;
  project: { id: string; name: string; color: string } | null;
}

interface Category { id: string; name: string; type: string; color: string; icon: string | null; }
interface Project { id: string; name: string; }

interface FinanceData {
  transactions: Transaction[];
  categories: Category[];
  projects: Project[];
  summary: { monthlyIncome: number; monthlyExpenses: number; monthlyNet: number; ytdNet: number };
  monthlyChart: { month: string; income: number; expenses: number }[];
  categoryBreakdown: { category: string; amount: number }[];
  incomeCategoryBreakdown: { category: string; amount: number; color: string }[];
}

function formatCurrency(n: number) {
  return (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrencyShort(n: number) {
  return (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const inputClasses = "w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors";

const DEDUCTIBLE_LABELS: Record<string, { label: string; color: string }> = {
  yes: { label: "Deductible", color: "text-green-400" },
  no: { label: "Non-deductible", color: "text-[#52525B]" },
  partial: { label: "Partial", color: "text-amber-400" },
  unknown: { label: "", color: "" },
};

export default function FinanceClient({ data }: { data: FinanceData }) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<"income" | "expense">("expense");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [budgetExpanded, setBudgetExpanded] = useState(false);
  const PAGE_SIZE = 20;

  const filtered = useMemo(() => {
    let list = data.transactions;
    if (typeFilter !== "all") list = list.filter((t) => t.type === typeFilter);
    if (categoryFilter !== "all") list = list.filter((t) => t.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) =>
        t.description.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00");
      list = list.filter((t) => new Date(t.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59.999");
      list = list.filter((t) => new Date(t.date) <= to);
    }
    return list;
  }, [data.transactions, typeFilter, categoryFilter, searchQuery, dateFrom, dateTo]);

  // Reset page to 1 whenever filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCurrentPage(1); }, [typeFilter, categoryFilter, searchQuery, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedTransactions = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilters = typeFilter !== "all" || categoryFilter !== "all" || searchQuery.trim() !== "" || dateFrom !== "" || dateTo !== "";

  function clearAllFilters() {
    setTypeFilter("all");
    setCategoryFilter("all");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selected.size} transaction(s)?`)) return;
    for (const id of selected) {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    }
    setSelected(new Set());
    router.refresh();
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === paginatedTransactions.length) setSelected(new Set());
    else setSelected(new Set(paginatedTransactions.map((t) => t.id)));
  }

  const uniqueCategories = [...new Set(data.transactions.map((t) => t.category))].sort();

  function openAdd(type: "income" | "expense") {
    setAddModalType(type);
    setShowAddModal(true);
  }

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Finance"
        description="Track income and expenses for Fire Within University"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.location.href = "/api/finance/export?format=xlsx"}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </Button>
            <Button size="sm" onClick={() => openAdd("income")} className="!bg-green-600 hover:!bg-green-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Income
            </Button>
            <Button size="sm" onClick={() => openAdd("expense")} className="!bg-red-600 hover:!bg-red-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Expense
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <KPICard label="Monthly Income" value={formatCurrencyShort(data.summary.monthlyIncome)} accent="text-[#22C55E]"
          valueColor={data.summary.monthlyIncome > 0 ? "text-[#22C55E]" : "text-[#52525B]"}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>} />
        <KPICard label="Monthly Expenses" value={formatCurrencyShort(data.summary.monthlyExpenses)} accent="text-[#EF4444]"
          valueColor={data.summary.monthlyExpenses > 0 ? "text-[#EF4444]" : "text-[#52525B]"}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" /></svg>} />
        <KPICard label="Monthly Net" value={formatCurrencyShort(data.summary.monthlyNet)} accent={data.summary.monthlyNet >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}
          valueColor={data.summary.monthlyNet > 0 ? "text-[#22C55E]" : data.summary.monthlyNet < 0 ? "text-[#EF4444]" : "text-[#52525B]"}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" /></svg>} />
        <KPICard label="Year-to-Date Net" value={formatCurrencyShort(data.summary.ytdNet)} accent={data.summary.ytdNet >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}
          valueColor={data.summary.ytdNet > 0 ? "text-[#22C55E]" : data.summary.ytdNet < 0 ? "text-[#EF4444]" : "text-[#52525B]"}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M2.25 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h15a2.25 2.25 0 0 1 2.25 2.25v11.25m-19.5 0A2.25 2.25 0 0 0 4.5 21h15a2.25 2.25 0 0 0 2.25-2.25m-19.5 0v-2.25" /></svg>} />
      </div>

      {/* Charts (lazy-loaded) */}
      <LazyCharts
        monthlyChart={data.monthlyChart}
        incomeCategoryBreakdown={data.incomeCategoryBreakdown}
        formatCurrency={formatCurrency}
      />

      {/* Year-over-Year Comparison (lazy-loaded, collapsible) */}
      <LazyYTDCharts />

      {/* Budget vs. Actual (lazy-loaded, collapsible) */}
      <div className="mb-8">
        <button
          onClick={() => setBudgetExpanded(!budgetExpanded)}
          className="w-full flex items-center justify-between rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#E8501A]/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <svg
              className={`h-4 w-4 text-[#52525B] transition-transform ${budgetExpanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <h3 className="text-sm font-semibold text-[#FAFAFA]">
              Budget vs. Actual
            </h3>
            <span className="text-xs text-[#52525B]">
              Monthly budget tracking
            </span>
          </div>
          <span className="text-xs text-[#52525B] group-hover:text-[#A1A1AA] transition-colors">
            {budgetExpanded ? "Collapse" : "Expand"}
          </span>
        </button>

        {budgetExpanded && (
          <div className="mt-4">
            <LazyBudgetTracker />
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Transaction Table */}
        <div className="lg:col-span-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
            <div className="relative w-full sm:w-auto">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525B] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className={`${inputClasses} w-full sm:w-auto sm:min-w-[200px] pl-8`}
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`${inputClasses} w-[calc(50%-4px)] sm:w-auto`}>
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${inputClasses} w-[calc(50%-4px)] sm:w-auto`}>
              <option value="all">All Categories</option>
              {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`${inputClasses} w-[calc(50%-12px)] sm:w-auto`}
              title="From date"
            />
            <span className="text-xs text-[#52525B]">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`${inputClasses} w-[calc(50%-12px)] sm:w-auto`}
              title="To date"
            />
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs text-[#A1A1AA] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#E8501A]/30 transition-colors"
              >
                Clear filters
              </button>
            )}
            {selected.size > 0 && (
              <Button variant="danger" size="sm" onClick={deleteSelected}>
                Delete ({selected.size})
              </Button>
            )}
            <span className="text-xs text-[#52525B] ml-auto">{filtered.length} transactions</span>
          </div>

          {/* Table */}
          <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-[#27272A]">
                  <th className="w-8 py-3 px-3">
                    <input type="checkbox" checked={selected.size === paginatedTransactions.length && paginatedTransactions.length > 0} onChange={toggleSelectAll}
                      className="rounded border-[#27272A] bg-[#09090B] text-[#E8501A] focus:ring-[#E8501A]/30" />
                  </th>
                  <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Date</th>
                  <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Description</th>
                  <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Category</th>
                  <th className="text-center py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Receipt</th>
                  <th className="text-center py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Deductible</th>
                  <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-[#52525B]">
                      {hasActiveFilters ? "No transactions match your filters." : "No transactions yet. Add your first income or expense to get started."}
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((t, index) => {
                    const deductible = DEDUCTIBLE_LABELS[t.taxDeductible] || DEDUCTIBLE_LABELS.unknown;
                    return (
                      <tr key={t.id} className="border-b border-[#27272A]/50 hover:bg-[#1A1A1E]/50 transition-[background-color] animate-stagger-in" style={{ animationDelay: `${index * 30}ms` }}>
                        <td className="py-3 px-3">
                          <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)}
                            className="rounded border-[#27272A] bg-[#09090B] text-[#E8501A] focus:ring-[#E8501A]/30" />
                        </td>
                        <td className="py-3 px-3 text-xs text-[#A1A1AA] whitespace-nowrap cursor-pointer hover:text-[#FAFAFA] transition-colors" onClick={() => setEditingTransaction(t)}>
                          {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="py-3 px-3 cursor-pointer" onClick={() => setEditingTransaction(t)}>
                          <p className="text-sm text-[#FAFAFA] truncate max-w-[250px]">{t.description}</p>
                          {t.notes && <p className="text-[11px] text-[#52525B] truncate max-w-[250px]">{t.notes}</p>}
                          {t.project && (
                            <Link href={`/projects/${t.project.id}`} className="text-[10px] text-[#E8501A] hover:underline" onClick={(e) => e.stopPropagation()}>
                              {t.project.name}
                            </Link>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs text-[#A1A1AA]">{t.category}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <ReceiptToggle transactionId={t.id} saved={t.receiptSaved} />
                        </td>
                        <td className="py-3 px-3 text-center">
                          {t.type === "expense" && deductible.label && (
                            <span className={`text-[10px] font-medium ${deductible.color}`}>{deductible.label}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`text-sm font-medium tabular-nums ${t.type === "income" ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                            {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
              <span className="text-xs text-[#52525B]">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-[#27272A] bg-[#0F0F11] px-3 py-1.5 text-xs text-[#FAFAFA] hover:border-[#E8501A]/30 hover:text-[#E8501A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#27272A] disabled:hover:text-[#FAFAFA]"
                >
                  Previous
                </button>
                <span className="text-xs text-[#A1A1AA] tabular-nums px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-[#27272A] bg-[#0F0F11] px-3 py-1.5 text-xs text-[#FAFAFA] hover:border-[#E8501A]/30 hover:text-[#E8501A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#27272A] disabled:hover:text-[#FAFAFA]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Category Sidebar */}
        <div>
          <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">Spending by Category</h3>
          <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
            {data.categoryBreakdown.length === 0 ? (
              <p className="text-xs text-[#52525B] text-center py-8">No expenses this month</p>
            ) : (
              <div className="space-y-3">
                {data.categoryBreakdown.map((cat) => {
                  const max = data.categoryBreakdown[0]?.amount || 1;
                  const pct = Math.round((cat.amount / max) * 100);
                  const catData = data.categories.find((c) => c.name === cat.category);
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#A1A1AA]">{cat.category}</span>
                        <span className="text-xs font-medium text-[#FAFAFA] tabular-nums">{formatCurrency(cat.amount)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1A1A1E]">
                        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, backgroundColor: catData?.color || "#A1A1AA" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        open={showAddModal}
        initialType={addModalType}
        onClose={() => setShowAddModal(false)}
        categories={data.categories}
        projects={data.projects}
        onSaved={() => { setShowAddModal(false); router.refresh(); }}
      />

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        categories={data.categories}
        projects={data.projects}
        onSaved={() => { setEditingTransaction(null); router.refresh(); }}
        onDeleted={() => { setEditingTransaction(null); setSelected((prev) => { const next = new Set(prev); if (editingTransaction) next.delete(editingTransaction.id); return next; }); router.refresh(); }}
      />
    </div>
  );
}

/* ─── Receipt Toggle (inline) ─── */
function ReceiptToggle({ transactionId, saved }: { transactionId: string; saved: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptSaved: !saved }),
      });
      router.refresh();
    } catch (err) { console.error("Failed to toggle receipt:", err); }
    finally { setLoading(false); }
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      disabled={loading}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
        saved ? "bg-green-500/15 text-green-400" : "bg-[#27272A] text-[#52525B] hover:text-[#A1A1AA]"
      }`}
    >
      {saved ? (
        <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Yes</>
      ) : "No"}
    </button>
  );
}

/* ─── Add Transaction Modal ─── */
function AddTransactionModal({ open, initialType, onClose, categories, projects, onSaved }: {
  open: boolean; initialType: "income" | "expense"; onClose: () => void; categories: Category[]; projects: Project[]; onSaved: () => void;
}) {
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptSaved, setReceiptSaved] = useState(false);
  const [taxDeductible, setTaxDeductible] = useState("unknown");
  const [autoStripeFee, setAutoStripeFee] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; description: string; date: string }[] | null>(null);

  // Reset when modal opens with new type
  useState(() => { setType(initialType); });

  const filteredCategories = categories.filter((c) => c.type === type || c.type === "both");
  const isDonation = category.toLowerCase().includes("donation");
  const parsedAmount = parseFloat(amount) || 0;
  const stripeFee = parsedAmount > 0 ? Math.round((parsedAmount * 0.029 + 0.30) * 100) / 100 : 0;
  const showSpendingAlert = type === "expense" && parsedAmount > 100;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!amount || parsedAmount <= 0) errs.amount = "Amount must be a positive number";
    if (!description.trim()) errs.description = "Description is required";
    if (!category) errs.category = "Category is required";
    if (!date) errs.date = "Date is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent, skipDuplicateCheck = false) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setErrors({});
    if (skipDuplicateCheck) setDuplicateWarning(null);
    try {
      // Create main transaction
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, amount: parsedAmount, description: description.trim(),
          category, date, projectId: projectId || null,
          notes: notes.trim() || null, receiptSaved, taxDeductible: type === "expense" ? taxDeductible : "unknown",
          ...(skipDuplicateCheck ? { skipDuplicateCheck: true } : {}),
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        if (data.error === "duplicate_warning") {
          setDuplicateWarning(data.duplicates);
          setSaving(false);
          return;
        }
      }

      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }

      // Auto-create Stripe fee if toggled on
      if (autoStripeFee && type === "income" && isDonation && stripeFee > 0) {
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "expense",
            amount: stripeFee,
            description: `Stripe fee on ${description.trim()}`,
            category: "Stripe Processing Fees",
            date,
            projectId: projectId || null,
            notes: `Auto-calculated: 2.9% + $0.30 on ${formatCurrency(parsedAmount)}`,
            receiptSaved: true,
            taxDeductible: "yes",
            skipDuplicateCheck: true,
          }),
        });
      }

      // Reset form
      setType(initialType); setAmount(""); setDescription(""); setCategory("");
      setDate(new Date().toISOString().split("T")[0]); setProjectId(""); setNotes("");
      setReceiptSaved(false); setTaxDeductible("unknown"); setAutoStripeFee(false);
      setDuplicateWarning(null);
      onSaved();
    } catch (err) { setErrors({ form: err instanceof Error ? err.message : "Failed to save" }); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={type === "income" ? "Add Income" : "Add Expense"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{errors.form}</div>}

        {/* Duplicate Warning */}
        {duplicateWarning && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-base leading-none mt-0.5">&#9888;&#65039;</span>
              <span className="font-medium">A similar transaction already exists</span>
            </div>
            <ul className="ml-6 mb-3 space-y-1 text-xs text-amber-300/80">
              {duplicateWarning.map((d) => (
                <li key={d.id}>
                  {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} &mdash; {d.description}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 ml-6">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="rounded-md bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors"
              >
                Create Anyway
              </button>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="rounded-md px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Spending Alert */}
        {showSpendingAlert && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">&#9888;&#65039;</span>
            <span>Per your Operating Agreement (Section 5.4), expenditures over $100 require written or electronic consent from both members before purchase.</span>
          </div>
        )}

        {/* Type toggle */}
        <div className="flex rounded-lg bg-[#09090B] border border-[#27272A] p-1">
          {(["expense", "income"] as const).map((t) => (
            <button key={t} type="button" onClick={() => { setType(t); setCategory(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                type === t ? (t === "income" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400") : "text-[#52525B] hover:text-[#A1A1AA]"
              }`}>{t === "income" ? "Income" : "Expense"}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Amount <span className="text-red-400">*</span></label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
              className={`${inputClasses} ${errors.amount ? "!border-red-500" : ""}`} placeholder="0.00" autoFocus />
            {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Date <span className="text-red-400">*</span></label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className={`${inputClasses} ${errors.date ? "!border-red-500" : ""}`} />
            {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Description <span className="text-red-400">*</span></label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            className={`${inputClasses} ${errors.description ? "!border-red-500" : ""}`} placeholder="What was this for?" />
          {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Category <span className="text-red-400">*</span></label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className={`${inputClasses} ${errors.category ? "!border-red-500" : ""}`}>
              <option value="">Select category</option>
              {filteredCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Project (optional)</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClasses}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Stripe Fee Auto-Calc — shown for donation income */}
        {type === "income" && isDonation && parsedAmount > 0 && (
          <div className="rounded-lg border border-[#27272A] bg-[#09090B] px-4 py-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={autoStripeFee} onChange={(e) => setAutoStripeFee(e.target.checked)}
                className="rounded border-[#27272A] bg-[#09090B] text-[#E8501A] focus:ring-[#E8501A]/30" />
              <div>
                <span className="text-sm text-[#FAFAFA]">Auto-create Stripe fee</span>
                <p className="text-xs text-[#52525B]">
                  Creates a {formatCurrency(stripeFee)} expense (2.9% + $0.30) for Stripe Processing Fees
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Expense-specific fields */}
        {type === "expense" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Tax Deductible?</label>
              <select value={taxDeductible} onChange={(e) => setTaxDeductible(e.target.value)} className={inputClasses}>
                <option value="unknown">Not sure</option>
                <option value="yes">Yes — Deductible</option>
                <option value="no">No — Not deductible</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={receiptSaved} onChange={(e) => setReceiptSaved(e.target.checked)}
                  className="rounded border-[#27272A] bg-[#09090B] text-[#E8501A] focus:ring-[#E8501A]/30" />
                <span className="text-sm text-[#A1A1AA]">Receipt saved?</span>
              </label>
            </div>
          </div>
        )}

        {/* Income receipt toggle */}
        {type === "income" && (
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={receiptSaved} onChange={(e) => setReceiptSaved(e.target.checked)}
                className="rounded border-[#27272A] bg-[#09090B] text-[#E8501A] focus:ring-[#E8501A]/30" />
              <span className="text-sm text-[#A1A1AA]">Receipt / confirmation saved?</span>
            </label>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClasses} resize-none`} placeholder="Additional details..." />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : type === "income" ? "Add Income" : "Add Expense"}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Edit Transaction Modal ─── */
function EditTransactionModal({ transaction, onClose, categories, projects, onSaved, onDeleted }: {
  transaction: Transaction | null; onClose: () => void; categories: Category[]; projects: Project[]; onSaved: () => void; onDeleted: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptSaved, setReceiptSaved] = useState(false);
  const [taxDeductible, setTaxDeductible] = useState("unknown");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate fields when transaction changes
  useEffect(() => {
    if (transaction) {
      setType(transaction.type as "income" | "expense");
      setAmount(String(transaction.amount));
      setDescription(transaction.description);
      setCategory(transaction.category);
      setDate(transaction.date.split("T")[0]);
      setProjectId(transaction.projectId || "");
      setNotes(transaction.notes || "");
      setReceiptSaved(transaction.receiptSaved);
      setTaxDeductible(transaction.taxDeductible);
      setErrors({});
    }
  }, [transaction]);

  const open = transaction !== null;
  const filteredCategories = categories.filter((c) => c.type === type || c.type === "both");
  const parsedAmount = parseFloat(amount) || 0;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!amount || parsedAmount <= 0) errs.amount = "Amount must be a positive number";
    if (!description.trim()) errs.description = "Description is required";
    if (!category) errs.category = "Category is required";
    if (!date) errs.date = "Date is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction || !validate()) return;
    setSaving(true);
    setErrors({});
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: parsedAmount,
          description: description.trim(),
          category,
          date,
          projectId: projectId || null,
          notes: notes.trim() || null,
          receiptSaved,
          taxDeductible: type === "expense" ? taxDeductible : "unknown",
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      onSaved();
    } catch (err) { setErrors({ form: err instanceof Error ? err.message : "Failed to save" }); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!transaction || !confirm("Are you sure you want to delete this transaction? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      onDeleted();
    } catch (err) { setErrors({ form: err instanceof Error ? err.message : "Failed to delete" }); }
    finally { setDeleting(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={type === "income" ? "Edit Income" : "Edit Expense"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{errors.form}</div>}

        {/* Type toggle */}
        <div className="flex rounded-lg bg-[#09090B] border border-[#27272A] p-1">
          {(["expense", "income"] as const).map((t) => (
            <button key={t} type="button" onClick={() => { setType(t); setCategory(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                type === t ? (t === "income" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400") : "text-[#52525B] hover:text-[#A1A1AA]"
              }`}>{t === "income" ? "Income" : "Expense"}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Amount <span className="text-red-400">*</span></label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
              className={`${inputClasses} ${errors.amount ? "!border-red-500" : ""}`} placeholder="0.00" />
            {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Date <span className="text-red-400">*</span></label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className={`${inputClasses} ${errors.date ? "!border-red-500" : ""}`} />
            {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Description <span className="text-red-400">*</span></label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            className={`${inputClasses} ${errors.description ? "!border-red-500" : ""}`} placeholder="What was this for?" />
          {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Category <span className="text-red-400">*</span></label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className={`${inputClasses} ${errors.category ? "!border-red-500" : ""}`}>
              <option value="">Select category</option>
              {filteredCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Project (optional)</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClasses}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Expense-specific fields */}
        {type === "expense" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Tax Deductible?</label>
              <select value={taxDeductible} onChange={(e) => setTaxDeductible(e.target.value)} className={inputClasses}>
                <option value="unknown">Not sure</option>
                <option value="yes">Yes — Deductible</option>
                <option value="no">No — Not deductible</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={receiptSaved} onChange={(e) => setReceiptSaved(e.target.checked)}
                  className="rounded border-[#27272A] bg-[#09090B] text-[#E8501A] focus:ring-[#E8501A]/30" />
                <span className="text-sm text-[#A1A1AA]">Receipt saved?</span>
              </label>
            </div>
          </div>
        )}

        {/* Income receipt toggle */}
        {type === "income" && (
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={receiptSaved} onChange={(e) => setReceiptSaved(e.target.checked)}
                className="rounded border-[#27272A] bg-[#09090B] text-[#E8501A] focus:ring-[#E8501A]/30" />
              <span className="text-sm text-[#A1A1AA]">Receipt / confirmation saved?</span>
            </label>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClasses} resize-none`} placeholder="Additional details..." />
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-red-500/20 [@media(hover:hover)_and_(pointer:fine)]:hover:border-red-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <div className="flex items-center gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || deleting}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
