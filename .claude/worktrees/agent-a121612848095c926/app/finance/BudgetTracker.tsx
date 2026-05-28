"use client";

import { useState, useEffect, useCallback } from "react";

interface BudgetItem {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgetAmount: number;
  actualSpent: number;
  percentUsed: number;
}

interface CategoryOption {
  id: string;
  name: string;
  color: string;
  type: string;
}

function formatCurrency(n: number) {
  return (
    (n < 0 ? "-" : "") +
    "$" +
    Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const inputClasses =
  "w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors";

export default function BudgetTracker() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add budget form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/budgets?month=${month}&year=${year}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBudgets(data);
    } catch {
      setError("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Fetch categories once for the add form
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) return;
        const data = await res.json();
        setCategories(data);
      } catch {
        // silent fail
      }
    }
    loadCategories();
  }, []);

  function navigateMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setMonth(newMonth);
    setYear(newYear);
  }

  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryId || !newAmount) return;
    const parsedAmount = parseFloat(newAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be a positive number");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: newCategoryId,
          amount: parsedAmount,
          month,
          year,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setNewCategoryId("");
      setNewAmount("");
      setShowAddForm(false);
      fetchBudgets();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave(id: string) {
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    try {
      const res = await fetch(`/api/budgets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingId(null);
      setEditAmount("");
      fetchBudgets();
    } catch {
      // Keep editing state on error
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this budget?")) return;
    try {
      await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      fetchBudgets();
    } catch {
      // silent
    }
  }

  function startEdit(item: BudgetItem) {
    setEditingId(item.id);
    setEditAmount(item.budgetAmount.toString());
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAmount("");
  }

  // Filter categories for add form: only expense/both types, exclude already-budgeted ones
  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const availableCategories = categories.filter(
    (c) =>
      (c.type === "expense" || c.type === "both") &&
      !budgetedCategoryIds.has(c.id)
  );

  // Totals
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgetAmount, 0);
  const totalActual = budgets.reduce((sum, b) => sum + b.actualSpent, 0);
  const totalPercent =
    totalBudgeted > 0
      ? Math.round((totalActual / totalBudgeted) * 1000) / 10
      : 0;

  function getBarColor(percent: number): string {
    if (percent > 100) return "#EF4444"; // red
    if (percent >= 75) return "#F59E0B"; // amber
    return "#22C55E"; // green
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5">
        <div className="h-4 w-48 bg-[#27272A] rounded mb-4 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-[#09090B] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5">
        <p className="text-sm text-[#52525B]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: month nav + totals */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateMonth(-1)}
            className="rounded-lg border border-[#27272A] bg-[#0F0F11] p-1.5 text-[#A1A1AA] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#E8501A]/30 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <span className="text-sm font-semibold text-[#FAFAFA] min-w-[140px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className="rounded-lg border border-[#27272A] bg-[#0F0F11] p-1.5 text-[#A1A1AA] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#E8501A]/30 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>

        {/* Totals summary */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#52525B]">Budgeted:</span>
            <span className="text-[#FAFAFA] font-medium tabular-nums">
              {formatCurrency(totalBudgeted)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#52525B]">Spent:</span>
            <span
              className="font-medium tabular-nums"
              style={{ color: getBarColor(totalPercent) }}
            >
              {formatCurrency(totalActual)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#52525B]">Used:</span>
            <span
              className="font-medium tabular-nums"
              style={{ color: getBarColor(totalPercent) }}
            >
              {totalPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Total progress bar */}
      {budgets.length > 0 && (
        <div className="h-2 rounded-full bg-[#1A1A1E] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.min(totalPercent, 100)}%`,
              backgroundColor: getBarColor(totalPercent),
            }}
          />
        </div>
      )}

      {/* Budget items */}
      {budgets.length === 0 ? (
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] py-12 text-center">
          <p className="text-sm text-[#52525B] mb-3">
            No budgets set for {MONTH_NAMES[month - 1]} {year}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm text-[#E8501A] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#F06A30] transition-colors"
          >
            Set your first budget
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4 [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#27272A]/80 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.categoryColor }}
                  />
                  <span className="text-sm text-[#FAFAFA] font-medium">
                    {item.categoryName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#52525B]">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditSave(item.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="w-24 rounded-md bg-[#09090B] border border-[#E8501A]/50 px-2 py-1 text-sm text-[#FAFAFA] text-right focus:outline-none focus:ring-1 focus:ring-[#E8501A]/30 tabular-nums"
                        autoFocus
                      />
                      <button
                        onClick={() => handleEditSave(item.id)}
                        className="text-[#22C55E] [@media(hover:hover)_and_(pointer:fine)]:hover:text-green-300 transition-colors"
                        title="Save"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#A1A1AA] transition-colors"
                        title="Cancel"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#A1A1AA] tabular-nums">
                        {formatCurrency(item.actualSpent)} /{" "}
                        {formatCurrency(item.budgetAmount)}
                      </span>
                      <span
                        className="text-xs font-medium tabular-nums min-w-[42px] text-right"
                        style={{ color: getBarColor(item.percentUsed) }}
                      >
                        {item.percentUsed}%
                      </span>
                      <button
                        onClick={() => startEdit(item)}
                        className="text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] transition-colors"
                        title="Edit budget"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#EF4444] transition-colors"
                        title="Remove budget"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full bg-[#1A1A1E] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.min(item.percentUsed, 100)}%`,
                    backgroundColor: getBarColor(item.percentUsed),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Budget button / form */}
      {showAddForm ? (
        <form
          onSubmit={handleAddBudget}
          className="rounded-xl bg-[#0F0F11] border border-[#E8501A]/30 p-4 space-y-3"
        >
          {formError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                Category
              </label>
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className={inputClasses}
              >
                <option value="">Select category</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                Budget Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className={inputClasses}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setFormError(null);
                setNewCategoryId("");
                setNewAmount("");
              }}
              className="rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-1.5 text-xs text-[#A1A1AA] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#FAFAFA] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#52525B] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !newCategoryId || !newAmount}
              className="rounded-lg bg-[#E8501A] px-3 py-1.5 text-xs font-medium text-white [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#F06A30] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Add Budget"}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full rounded-xl border border-dashed border-[#27272A] py-3 text-sm text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#E8501A]/30 transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Budget
        </button>
      )}
    </div>
  );
}
