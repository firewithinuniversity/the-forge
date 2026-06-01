"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

interface RecurringExpenseData {
  id: string;
  service: string;
  category: string;
  monthlyCost: number;
  annualCost: number | null;
  billingCycle: string;
  nextDueDate: string | null;
  active: boolean;
  notes: string | null;
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const inputClasses = "w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors";

type StatusFilter = "all" | "active" | "paused" | "cancelled";

function getDueDateStyle(dateStr: string | null): { text: string; className: string } {
  if (!dateStr) return { text: "—", className: "text-[#52525B]" };
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (diffDays < 0) return { text: `${formatted} (overdue)`, className: "text-red-400" };
  if (diffDays <= 7) return { text: `${formatted} (${diffDays}d)`, className: "text-amber-400" };
  return { text: formatted, className: "text-green-400" };
}

// Status helpers — we use the active boolean + notes prefix for paused/cancelled
// "active" = active:true, "paused" = active:false + status "paused", "cancelled" = active:false + status "cancelled"
type ServiceStatus = "active" | "paused" | "cancelled";

function getServiceStatus(exp: RecurringExpenseData): ServiceStatus {
  if (exp.active) return "active";
  // Check if it was explicitly paused or cancelled via a convention
  // We'll use a simple approach: inactive = paused by default unless notes contain [CANCELLED]
  if (exp.notes?.includes("[CANCELLED]")) return "cancelled";
  return "paused";
}

const STATUS_STYLES: Record<ServiceStatus, { label: string; classes: string }> = {
  active: { label: "Active", classes: "bg-green-500/15 text-green-400" },
  paused: { label: "Paused", classes: "bg-amber-500/15 text-amber-400" },
  cancelled: { label: "Cancelled", classes: "bg-red-500/15 text-red-400" },
};

export default function RecurringClient({ expenses, categories }: { expenses: RecurringExpenseData[]; categories: string[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoCreating, setAutoCreating] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ service: "", category: "", monthlyCost: "", annualCost: "", billingCycle: "monthly", nextDueDate: "", notes: "" });

  const activeExpenses = expenses.filter((e) => e.active);
  const totalMonthly = activeExpenses.reduce((s, e) => s + e.monthlyCost, 0);
  const totalAnnual = activeExpenses.reduce((s, e) => s + (e.annualCost || e.monthlyCost * 12), 0);

  // Count expenses that are due (nextDueDate <= today)
  const dueCount = expenses.filter((e) => {
    if (!e.active || !e.nextDueDate) return false;
    const due = new Date(e.nextDueDate);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return due <= now;
  }).length;

  async function autoCreateDue() {
    setAutoCreating(true);
    setToast(null);
    try {
      const res = await fetch("/api/recurring-expenses/auto-create", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to auto-create");
      setToast({ type: "success", message: `Created ${data.count} recurring transaction(s)` });
      router.refresh();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to auto-create transactions" });
    } finally {
      setAutoCreating(false);
      setTimeout(() => setToast(null), 5000);
    }
  }

  const filteredExpenses = statusFilter === "all" ? expenses : expenses.filter((e) => getServiceStatus(e) === statusFilter);

  function validateForm(): boolean {
    const errs: Record<string, string> = {};
    if (!form.service.trim()) errs.service = "Service name is required";
    if (!form.category) errs.category = "Category is required";
    const cost = parseFloat(form.monthlyCost) || 0;
    if (cost < 0) errs.monthlyCost = "Cost cannot be negative";
    if (form.annualCost && parseFloat(form.annualCost) < 0) errs.annualCost = "Cost cannot be negative";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    setErrors({});
    try {
      await fetch("/api/recurring-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nextDueDate: form.nextDueDate || null,
        }),
      });
      setShowAdd(false);
      setForm({ service: "", category: "", monthlyCost: "", annualCost: "", billingCycle: "monthly", nextDueDate: "", notes: "" });
      router.refresh();
    } catch (err) { setErrors({ form: err instanceof Error ? err.message : "Failed to add expense" }); }
    finally { setSaving(false); }
  }

  async function setStatus(exp: RecurringExpenseData, newStatus: ServiceStatus) {
    const updates: Record<string, unknown> = {};
    if (newStatus === "active") {
      updates.active = true;
      // Remove [CANCELLED] tag if present
      if (exp.notes?.includes("[CANCELLED]")) {
        updates.notes = exp.notes.replace("[CANCELLED]", "").trim();
      }
    } else if (newStatus === "paused") {
      updates.active = false;
      // Remove [CANCELLED] tag if present
      if (exp.notes?.includes("[CANCELLED]")) {
        updates.notes = exp.notes.replace("[CANCELLED]", "").trim();
      }
    } else {
      updates.active = false;
      if (!exp.notes?.includes("[CANCELLED]")) {
        updates.notes = ((exp.notes || "") + " [CANCELLED]").trim();
      }
    }
    await fetch(`/api/recurring-expenses/${exp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    router.refresh();
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/recurring-expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyCost: parseFloat(form.monthlyCost) || 0,
          annualCost: form.annualCost ? parseFloat(form.annualCost) : null,
          nextDueDate: form.nextDueDate || null,
          notes: form.notes || null,
        }),
      });
      setEditingId(null);
      router.refresh();
    } catch (err) { console.error("Failed to save edit:", err); }
    finally { setSaving(false); }
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this recurring expense?")) return;
    await fetch(`/api/recurring-expenses/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function startEdit(exp: RecurringExpenseData) {
    setEditingId(exp.id);
    setForm({
      service: exp.service,
      category: exp.category,
      monthlyCost: String(exp.monthlyCost),
      annualCost: exp.annualCost ? String(exp.annualCost) : "",
      billingCycle: exp.billingCycle,
      nextDueDate: exp.nextDueDate ? new Date(exp.nextDueDate).toISOString().split("T")[0] : "",
      notes: (exp.notes || "").replace("[CANCELLED]", "").trim(),
    });
  }

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Recurring Expenses"
        description="Monthly subscriptions and fixed costs for Fire Within University"
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={autoCreateDue} disabled={dueCount === 0 || autoCreating} className="relative">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              {autoCreating ? "Creating..." : "Auto-Create Due"}
              {dueCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-[#E8501A] text-[10px] font-bold text-white px-1">
                  {dueCount}
                </span>
              )}
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Expense
            </Button>
          </>
        }
      />

      {/* Toast */}
      {toast && (
        <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm flex items-center justify-between ${
          toast.type === "success"
            ? "border-green-500/30 bg-green-500/10 text-green-400"
            : "border-red-500/30 bg-red-500/10 text-red-400"
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-3 text-current opacity-60 hover:opacity-100 transition-opacity">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <p className="text-xs text-[#52525B]">Active Services</p>
          <p className="text-2xl font-bold text-[#FAFAFA]">{activeExpenses.length}</p>
        </div>
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <p className="text-xs text-[#52525B]">Monthly Total</p>
          <p className="text-2xl font-bold text-red-400">{fmt(totalMonthly)}</p>
        </div>
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <p className="text-xs text-[#52525B]">Annual Total</p>
          <p className="text-2xl font-bold text-red-400">{fmt(totalAnnual)}</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 mb-4">
        {(["all", "active", "paused", "cancelled"] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
              statusFilter === s ? "bg-[#E8501A]/15 text-[#E8501A]" : "bg-[#1A1A1E] text-[#52525B] hover:text-[#A1A1AA]"
            }`}>
            {s}
          </button>
        ))}
        <span className="text-xs text-[#52525B] ml-auto">{filteredExpenses.length} services</span>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-[#27272A]">
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Service</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Category</th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Monthly</th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Annual</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Cycle</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Next Due</th>
              <th className="text-center py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((exp) => {
              const status = getServiceStatus(exp);
              const statusStyle = STATUS_STYLES[status];
              const dueDateInfo = getDueDateStyle(exp.nextDueDate);
              const isEditing = editingId === exp.id;

              if (isEditing) {
                return (
                  <tr key={exp.id} className="border-b border-[#27272A]/50 bg-[#1A1A1E]/30">
                    <td className="py-3 px-4 font-medium text-[#FAFAFA]">{exp.service}</td>
                    <td className="py-3 px-4 text-[#A1A1AA]">{exp.category}</td>
                    <td className="py-3 px-4">
                      <input type="number" step="0.01" className={`${inputClasses} w-24 text-right`} value={form.monthlyCost}
                        onChange={(e) => setForm({ ...form, monthlyCost: e.target.value })} />
                    </td>
                    <td className="py-3 px-4">
                      <input type="number" step="0.01" className={`${inputClasses} w-24 text-right`} value={form.annualCost}
                        onChange={(e) => setForm({ ...form, annualCost: e.target.value })} placeholder="auto" />
                    </td>
                    <td className="py-3 px-4 text-[#52525B] capitalize">{exp.billingCycle}</td>
                    <td className="py-3 px-4">
                      <input type="date" className={`${inputClasses} w-36`} value={form.nextDueDate}
                        onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
                    </td>
                    <td className="py-3 px-4 text-center" colSpan={2}>
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" onClick={() => saveEdit(exp.id)} disabled={saving}>Save</Button>
                        <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={exp.id} className={`border-b border-[#27272A]/50 hover:bg-[#1A1A1E]/50 transition-colors ${status !== "active" ? "opacity-60" : ""}`}>
                  <td className="py-3 px-4 font-medium text-[#FAFAFA]">{exp.service}</td>
                  <td className="py-3 px-4 text-[#A1A1AA]">{exp.category}</td>
                  <td className="py-3 px-4 text-right text-[#FAFAFA] cursor-pointer hover:text-[#E8501A] transition-colors"
                    onClick={() => startEdit(exp)}>
                    {exp.monthlyCost > 0 ? fmt(exp.monthlyCost) : "Free"}
                  </td>
                  <td className="py-3 px-4 text-right text-[#A1A1AA]">
                    {(exp.annualCost || exp.monthlyCost * 12) > 0 ? fmt(exp.annualCost || exp.monthlyCost * 12) : "Free"}
                  </td>
                  <td className="py-3 px-4 text-[#52525B] capitalize">{exp.billingCycle.replace("_", " ")}</td>
                  <td className={`py-3 px-4 text-xs ${dueDateInfo.className}`}>{dueDateInfo.text}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="relative group inline-block">
                      <button className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${statusStyle.classes}`}>
                        {statusStyle.label}
                      </button>
                      <div className="absolute right-0 top-full mt-1 z-20 w-32 rounded-lg border border-[#27272A] bg-[#1A1A1E] shadow-xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                        {(["active", "paused", "cancelled"] as ServiceStatus[]).filter((s) => s !== status).map((s) => (
                          <button key={s} onClick={() => setStatus(exp, s)}
                            className="w-full text-left px-3 py-2 text-xs text-[#FAFAFA] hover:bg-[#27272A] transition-colors capitalize">
                            {s === "active" ? "Activate" : s === "paused" ? "Pause" : "Cancel"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(exp)} className="rounded p-1 text-[#52525B] hover:text-[#E8501A] hover:bg-[#E8501A]/10 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteExpense(exp.id)} className="rounded p-1 text-[#52525B] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#27272A]">
              <td className="py-3 px-4 font-semibold text-[#FAFAFA]" colSpan={2}>Total (Active)</td>
              <td className="py-3 px-4 text-right font-semibold text-[#FAFAFA]">{fmt(totalMonthly)}</td>
              <td className="py-3 px-4 text-right font-semibold text-[#FAFAFA]">{fmt(totalAnnual)}</td>
              <td colSpan={4}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setErrors({}); }} title="Add Recurring Expense">
        <form onSubmit={addExpense} className="space-y-4">
          {errors.form && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{errors.form}</div>}
          <div>
            <label className="block text-xs text-[#52525B] mb-1">Service Name <span className="text-red-400">*</span></label>
            <input className={`${inputClasses} ${errors.service ? "!border-red-500" : ""}`} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} placeholder="e.g., Vercel Pro" autoFocus />
            {errors.service && <p className="text-xs text-red-400 mt-1">{errors.service}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Category <span className="text-red-400">*</span></label>
              <select className={`${inputClasses} ${errors.category ? "!border-red-500" : ""}`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Billing Cycle</label>
              <select className={inputClasses} value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="per_transaction">Per Transaction</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Monthly Cost</label>
              <input type="number" step="0.01" min="0" className={`${inputClasses} ${errors.monthlyCost ? "!border-red-500" : ""}`} value={form.monthlyCost} onChange={(e) => setForm({ ...form, monthlyCost: e.target.value })} placeholder="0.00" />
              {errors.monthlyCost && <p className="text-xs text-red-400 mt-1">{errors.monthlyCost}</p>}
            </div>
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Annual Cost (optional)</label>
              <input type="number" step="0.01" min="0" className={`${inputClasses} ${errors.annualCost ? "!border-red-500" : ""}`} value={form.annualCost} onChange={(e) => setForm({ ...form, annualCost: e.target.value })} placeholder="0.00" />
              {errors.annualCost && <p className="text-xs text-red-400 mt-1">{errors.annualCost}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#52525B] mb-1">Next Due Date (optional)</label>
            <input type="date" className={inputClasses} value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-[#52525B] mb-1">Notes</label>
            <input className={inputClasses} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setShowAdd(false); setErrors({}); }}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Expense"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
