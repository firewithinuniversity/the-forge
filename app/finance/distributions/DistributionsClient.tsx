"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

interface DistributionData {
  id: string;
  date: string;
  type: string;
  llcNetProfit: number;
  partner1Share: number;
  partner2Share: number;
  method: string | null;
  approvedBy: string | null;
  notes: string | null;
}

interface Props {
  distributions: DistributionData[];
  partner1Name: string;
  partner2Name: string;
  ownershipSplit: number;
  netProfit: number;
  taxReserveRate: number;
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const inputClasses = "w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors";

const AGREEMENT_REMINDERS = [
  { section: "Section 3.2", text: "Distributions made equally (50/50) to members." },
  { section: "Section 3.3", text: "Tax distributions made quarterly before estimated tax due dates." },
  { section: "Section 5.4", text: "Any single expenditure over $100 requires both members' approval." },
  { section: "Section 7.4", text: "Never commingle personal and business funds." },
];

const DISTRIBUTION_TYPES = [
  { value: "tax_distribution", label: "Tax Distribution" },
  { value: "profit_distribution", label: "Profit Distribution" },
  { value: "owner_draw", label: "Owner Draw" },
  { value: "reimbursement", label: "Reimbursement" },
];

const PAYMENT_METHODS = [
  { value: "relay_transfer", label: "Relay Transfer" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];

export default function DistributionsClient({ distributions, partner1Name, partner2Name, ownershipSplit, netProfit, taxReserveRate }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    type: "profit_distribution",
    llcNetProfit: "",
    method: "relay_transfer",
    notes: "",
  });

  const taxReserve = netProfit > 0 ? netProfit * taxReserveRate : 0;
  const totalDist1 = distributions.reduce((s, d) => s + d.partner1Share, 0);
  const totalDist2 = distributions.reduce((s, d) => s + d.partner2Share, 0);
  const totalDistributed = totalDist1 + totalDist2;
  const remaining = Math.max(0, netProfit - taxReserve - totalDistributed);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "profit_distribution",
    llcNetProfit: "",
    method: "relay_transfer",
    approvedBy: false,
    notes: "",
  });

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const amount = parseFloat(form.llcNetProfit) || 0;
    if (amount <= 0) errs.llcNetProfit = "Amount must be a positive number";
    if (!form.date) errs.date = "Date is required";
    if (!form.approvedBy) errs.approvedBy = "Both members must approve distributions per OA Section 3.2";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function addDistribution(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const profit = parseFloat(form.llcNetProfit) || 0;
    try {
      await fetch("/api/distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          type: form.type,
          llcNetProfit: profit,
          partner1Share: profit * ownershipSplit,
          partner2Share: profit * (1 - ownershipSplit),
          method: form.method,
          approvedBy: "Both",
          notes: form.notes.trim() || null,
        }),
      });
      setShowAdd(false);
      setForm({ date: new Date().toISOString().split("T")[0], type: "profit_distribution", llcNetProfit: "", method: "relay_transfer", approvedBy: false, notes: "" });
      setErrors({});
      router.refresh();
    } catch (err) { setErrors({ form: err instanceof Error ? err.message : "Failed to save distribution" }); }
    finally { setSaving(false); }
  }

  async function deleteDistribution(id: string) {
    if (!confirm("Delete this distribution record?")) return;
    await fetch(`/api/distributions/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function startEdit(d: DistributionData) {
    setEditingId(d.id);
    setEditForm({
      date: new Date(d.date).toISOString().split("T")[0],
      type: d.type,
      llcNetProfit: String(d.llcNetProfit),
      method: d.method || "relay_transfer",
      notes: d.notes || "",
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const amount = parseFloat(editForm.llcNetProfit) || 0;
      if (amount <= 0) {
        setErrors({ editForm: "Amount must be a positive number" });
        setSaving(false);
        return;
      }
      const res = await fetch(`/api/distributions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editForm.date,
          type: editForm.type,
          llcNetProfit: amount,
          partner1Share: amount * ownershipSplit,
          partner2Share: amount * (1 - ownershipSplit),
          method: editForm.method,
          notes: editForm.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update distribution");
      }
      setEditingId(null);
      setErrors({});
      router.refresh();
    } catch (err) {
      setErrors({ editForm: err instanceof Error ? err.message : "Failed to update distribution" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Distributions"
        description="LLC member distributions — 50/50 split"
        actions={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Record Distribution
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <p className="text-xs text-[#52525B]">YTD Net Profit</p>
          <p className={`text-xl font-bold ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(netProfit)}</p>
        </div>
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <p className="text-xs text-[#52525B]">Tax Reserve ({(taxReserveRate * 100).toFixed(0)}%)</p>
          <p className="text-xl font-bold text-[#E8501A]">{fmt(taxReserve)}</p>
        </div>
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <p className="text-xs text-[#52525B]">Total Distributed</p>
          <p className="text-xl font-bold text-[#FAFAFA]">{fmt(totalDistributed)}</p>
        </div>
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <p className="text-xs text-[#52525B]">Remaining Undistributed</p>
          <p className={`text-xl font-bold ${remaining > 0 ? "text-green-400" : "text-[#52525B]"}`}>{fmt(remaining)}</p>
        </div>
      </div>

      {/* Undistributed Profit Breakdown */}
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 mb-6">
        <h2 className="text-sm font-semibold text-[#FAFAFA] mb-3">Undistributed Profit Tracker</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
          <div>
            <p className="text-[#52525B] mb-1">Net Profit</p>
            <p className={`text-sm font-bold ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(netProfit)}</p>
          </div>
          <div>
            <p className="text-[#52525B] mb-1">- Tax Reserve</p>
            <p className="text-sm font-bold text-[#E8501A]">{fmt(taxReserve)}</p>
          </div>
          <div>
            <p className="text-[#52525B] mb-1">- Distributed</p>
            <p className="text-sm font-bold text-[#FAFAFA]">{fmt(totalDistributed)}</p>
          </div>
          <div>
            <p className="text-[#52525B] mb-1">= Available</p>
            <p className={`text-sm font-bold ${remaining > 0 ? "text-green-400" : "text-[#52525B]"}`}>{fmt(remaining)}</p>
          </div>
        </div>
      </div>

      {/* Distribution history */}
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] overflow-hidden mb-8 overflow-x-auto">
        {distributions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#A1A1AA]">No distributions recorded yet</p>
            <p className="text-xs text-[#52525B]">Record distributions when you pay out profits to members</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[#27272A]">
                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Date</th>
                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Type</th>
                <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Total</th>
                <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">{partner1Name}</th>
                <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">{partner2Name}</th>
                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Method</th>
                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Notes</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((d) => {
                const isEditing = editingId === d.id;

                if (isEditing) {
                  const editAmount = parseFloat(editForm.llcNetProfit) || 0;
                  return (
                    <tr key={d.id} className="border-b border-[#27272A]/50 bg-[#1A1A1E]/30">
                      <td className="py-3 px-4">
                        <input type="date" className={`${inputClasses} w-36`} value={editForm.date}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                      </td>
                      <td className="py-3 px-4">
                        <select className={`${inputClasses} w-40`} value={editForm.type}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                          {DISTRIBUTION_TYPES.map((dt) => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input type="number" step="0.01" min="0" className={`${inputClasses} w-28 text-right`}
                          value={editForm.llcNetProfit}
                          onChange={(e) => setEditForm({ ...editForm, llcNetProfit: e.target.value })} />
                      </td>
                      <td className="py-3 px-4 text-right text-green-400 text-sm">{fmt(editAmount * ownershipSplit)}</td>
                      <td className="py-3 px-4 text-right text-green-400 text-sm">{fmt(editAmount * (1 - ownershipSplit))}</td>
                      <td className="py-3 px-4">
                        <select className={`${inputClasses} w-36`} value={editForm.method}
                          onChange={(e) => setEditForm({ ...editForm, method: e.target.value })}>
                          {PAYMENT_METHODS.map((pm) => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input className={`${inputClasses} w-32`} value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          placeholder="Notes" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button size="sm" onClick={() => saveEdit(d.id)} disabled={saving}>
                            {saving ? "..." : "Save"}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => { setEditingId(null); setErrors({}); }}>
                            Cancel
                          </Button>
                        </div>
                        {errors.editForm && <p className="text-xs text-red-400 mt-1 whitespace-nowrap">{errors.editForm}</p>}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={d.id} className="border-b border-[#27272A]/50 hover:bg-[#1A1A1E]/50 transition-colors">
                    <td className="py-3 px-4 text-[#FAFAFA]">{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="py-3 px-4 text-[#A1A1AA] capitalize">{d.type.replace(/_/g, " ")}</td>
                    <td className="py-3 px-4 text-right text-[#FAFAFA]">{fmt(d.llcNetProfit)}</td>
                    <td className="py-3 px-4 text-right text-green-400">{fmt(d.partner1Share)}</td>
                    <td className="py-3 px-4 text-right text-green-400">{fmt(d.partner2Share)}</td>
                    <td className="py-3 px-4 text-[#52525B] capitalize">{d.method?.replace(/_/g, " ") || "—"}</td>
                    <td className="py-3 px-4 text-[#52525B] text-xs max-w-[150px] truncate">{d.notes || "—"}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(d)} className="rounded p-1 text-[#52525B] hover:text-[#E8501A] hover:bg-[#E8501A]/10 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </button>
                        <button onClick={() => deleteDistribution(d.id)} className="rounded p-1 text-[#52525B] hover:text-red-400 hover:bg-red-500/10 transition-colors">
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
                <td className="py-3 px-4 font-semibold text-[#FAFAFA]" colSpan={2}>Total</td>
                <td className="py-3 px-4 text-right font-semibold text-[#FAFAFA]">{fmt(distributions.reduce((s, d) => s + d.llcNetProfit, 0))}</td>
                <td className="py-3 px-4 text-right font-semibold text-green-400">{fmt(totalDist1)}</td>
                <td className="py-3 px-4 text-right font-semibold text-green-400">{fmt(totalDist2)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Operating Agreement Reminders */}
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-6">
        <h2 className="text-base font-semibold text-[#FAFAFA] mb-4">Operating Agreement Reminders</h2>
        <div className="space-y-3">
          {AGREEMENT_REMINDERS.map((r) => (
            <div key={r.section} className="flex gap-3">
              <span className="text-xs font-medium text-[#E8501A] shrink-0 w-24">{r.section}</span>
              <span className="text-sm text-[#A1A1AA]">{r.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Distribution Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record Distribution">
        <form onSubmit={addDistribution} className="space-y-4">
          {errors.form && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{errors.form}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Date <span className="text-red-400">*</span></label>
              <input type="date" className={`${inputClasses} ${errors.date ? "!border-red-500" : ""}`} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Type</label>
              <select className={inputClasses} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {DISTRIBUTION_TYPES.map((dt) => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#52525B] mb-1">Total LLC Amount Being Distributed <span className="text-red-400">*</span></label>
            <input type="number" step="0.01" min="0" className={`${inputClasses} ${errors.llcNetProfit ? "!border-red-500" : ""}`}
              value={form.llcNetProfit} onChange={(e) => setForm({ ...form, llcNetProfit: e.target.value })} placeholder="0.00" required />
            {errors.llcNetProfit && <p className="text-xs text-red-400 mt-1">{errors.llcNetProfit}</p>}
            {form.llcNetProfit && parseFloat(form.llcNetProfit) > 0 && (
              <div className="mt-2 rounded-lg bg-[#1A1A1E] px-3 py-2 text-xs">
                <div className="flex items-center justify-between text-[#A1A1AA]">
                  <span>{partner1Name} ({(ownershipSplit * 100).toFixed(0)}%)</span>
                  <span className="font-medium text-green-400">{fmt(parseFloat(form.llcNetProfit) * ownershipSplit)}</span>
                </div>
                <div className="flex items-center justify-between text-[#A1A1AA] mt-1">
                  <span>{partner2Name} ({((1 - ownershipSplit) * 100).toFixed(0)}%)</span>
                  <span className="font-medium text-green-400">{fmt(parseFloat(form.llcNetProfit) * (1 - ownershipSplit))}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-[#52525B] mb-1">Payment Method</label>
            <select className={inputClasses} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {PAYMENT_METHODS.map((pm) => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#52525B] mb-1">Notes</label>
            <input className={inputClasses} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
          </div>

          {/* Required approval checkbox */}
          <div className={`rounded-lg border px-4 py-3 ${errors.approvedBy ? "border-red-500/30 bg-red-500/5" : "border-[#27272A] bg-[#09090B]"}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={form.approvedBy} onChange={(e) => setForm({ ...form, approvedBy: e.target.checked })}
                className="rounded border-[#27272A] bg-[#09090B] text-[#E8501A] focus:ring-[#E8501A]/30 mt-0.5" />
              <div>
                <span className="text-sm text-[#FAFAFA]">Both members have approved this distribution</span>
                <p className="text-xs text-[#52525B] mt-0.5">Required per Operating Agreement Section 3.2</p>
              </div>
            </label>
            {errors.approvedBy && <p className="text-xs text-red-400 mt-2">{errors.approvedBy}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Record Distribution"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
