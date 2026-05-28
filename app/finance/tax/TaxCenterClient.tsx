"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

interface TaxConfig {
  id: string;
  federalTaxRate: number;
  selfEmploymentRate: number;
  seDeduction: number;
  stateTaxRate: number;
  stateName: string;
  ownershipSplit: number;
  qbiDeductionRate: number;
  taxReserveRate: number;
  partner1Name: string;
  partner2Name: string;
}

interface TaxPaymentData {
  id: string;
  year: number;
  quarter: number;
  type: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  paid: boolean;
  notes: string | null;
}

interface Props {
  config: TaxConfig;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  quarterlyIncome: number[];
  quarterlyExpenses: number[];
  taxPayments: TaxPaymentData[];
  totalDistributed: number;
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const QUARTER_PERIODS = ["Jan – Mar", "Apr – Jun", "Jul – Sep", "Oct – Dec"];
const QUARTER_DUE = ["April 15", "June 15", "September 15", "January 15"];

const FILING_DATES = [
  { form: "Form 1065 (Partnership Return)", due: "March 15", notes: "$220/partner/month penalty if late" },
  { form: "Schedule K-1 to each partner", due: "March 15", notes: "Generated with Form 1065" },
  { form: "Personal return (Form 1040)", due: "April 15", notes: "Extension to Oct 15 via Form 4868" },
  { form: "Wisconsin Form 1 (State Personal)", due: "April 15", notes: "File at tap.revenue.wi.gov" },
  { form: "Wisconsin Form 3 (State Partnership)", due: "March 15", notes: "CPA handles with 1065" },
  { form: "WI Annual Report + $25 fee", due: "June 30", notes: "Filed at apps.dfi.wi.gov" },
];

// All deadlines with their actual dates for the current year
function getDeadlines(year: number) {
  return [
    { name: "Q4 Estimated Tax (prior year)", date: new Date(year, 0, 15) },
    { name: "Form 1065 / K-1 / WI Form 3", date: new Date(year, 2, 15) },
    { name: "Q1 Estimated Tax / Form 1040 / WI Form 1", date: new Date(year, 3, 15) },
    { name: "Q2 Estimated Tax", date: new Date(year, 5, 15) },
    { name: "WI Annual Report + $25 fee", date: new Date(year, 5, 30) },
    { name: "Q3 Estimated Tax", date: new Date(year, 8, 15) },
    // Q4 is Jan 15 of NEXT year
    { name: "Q4 Estimated Tax", date: new Date(year + 1, 0, 15) },
  ];
}

function getNextDeadline(year: number) {
  const now = new Date();
  const deadlines = getDeadlines(year);
  for (const d of deadlines) {
    if (d.date >= now) return d;
  }
  // All passed — show first of next year
  return getDeadlines(year + 1)[0];
}

const inputClasses = "w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors";

export default function TaxCenterClient({ config, year, totalIncome, totalExpenses, quarterlyIncome, quarterlyExpenses, taxPayments, totalDistributed }: Props) {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ ...config });

  const netProfit = totalIncome - totalExpenses;
  const split = config.ownershipSplit;
  const partner1Share = netProfit * split;
  const partner2Share = netProfit * (1 - split);

  const seTax = partner1Share > 0 ? partner1Share * config.selfEmploymentRate : 0;
  const seDeductionAmt = seTax * config.seDeduction;
  const qbiDeduction = partner1Share > 0 ? partner1Share * config.qbiDeductionRate : 0;
  const taxableIncome = Math.max(0, partner1Share - qbiDeduction - seDeductionAmt);
  const federalTax = taxableIncome * config.federalTaxRate;
  const stateTax = taxableIncome * config.stateTaxRate;
  const totalTax = federalTax + seTax + stateTax;
  const quarterlyPayment = totalTax / 4;

  const taxReserve = netProfit > 0 ? netProfit * config.taxReserveRate : 0;
  const distributableCash = netProfit - taxReserve - totalDistributed;

  // Next deadline
  const nextDeadline = getNextDeadline(year);
  const daysUntil = Math.ceil((nextDeadline.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const deadlineColor = daysUntil < 15 ? "text-red-400 border-red-500/30 bg-red-500/5" :
    daysUntil <= 30 ? "text-amber-400 border-amber-500/30 bg-amber-500/5" :
    "text-green-400 border-green-500/30 bg-green-500/5";
  const deadlineDotColor = daysUntil < 15 ? "bg-red-400" : daysUntil <= 30 ? "bg-amber-400" : "bg-green-400";

  async function saveSettings() {
    setSaving(true);
    try {
      await fetch("/api/tax-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          federalTaxRate: parseFloat(String(settings.federalTaxRate)),
          selfEmploymentRate: parseFloat(String(settings.selfEmploymentRate)),
          seDeduction: parseFloat(String(settings.seDeduction)),
          stateTaxRate: parseFloat(String(settings.stateTaxRate)),
          stateName: settings.stateName,
          ownershipSplit: parseFloat(String(settings.ownershipSplit)),
          qbiDeductionRate: parseFloat(String(settings.qbiDeductionRate)),
          taxReserveRate: parseFloat(String(settings.taxReserveRate)),
          partner1Name: settings.partner1Name,
          partner2Name: settings.partner2Name,
        }),
      });
      setShowSettings(false);
      router.refresh();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function togglePayment(payment: TaxPaymentData) {
    await fetch(`/api/tax-payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !payment.paid, paidDate: !payment.paid ? new Date().toISOString() : null }),
    });
    router.refresh();
  }

  function handleExport() {
    window.open(`/api/finance/export?mode=full&year=${year}`, "_blank");
  }

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-8 max-w-6xl mx-auto">
      <PageHeader
        title="Tax Center"
        description={`${year} tax estimates and partner split for Fire Within University LLC`}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/finance/tax/summary">
              <Button variant="secondary" size="sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                </svg>
                Annual Summary
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => setShowSettings(true)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Tax Rates
            </Button>
            <Button size="sm" onClick={handleExport}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export for CPA
            </Button>
          </div>
        }
      />

      {/* Next Deadline Card */}
      <div className={`rounded-xl border p-4 mb-6 flex items-center justify-between ${deadlineColor}`}>
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${deadlineDotColor} animate-pulse`} />
          <div>
            <p className="text-sm font-semibold">Next Deadline: {nextDeadline.name}</p>
            <p className="text-xs opacity-80">
              {nextDeadline.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{daysUntil}</p>
          <p className="text-[10px] uppercase tracking-wider opacity-80">days away</p>
        </div>
      </div>

      {/* YTD Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="YTD Revenue" value={fmt(totalIncome)} color="text-green-400" />
        <StatCard label="YTD Expenses" value={fmt(totalExpenses)} color="text-red-400" />
        <StatCard label="YTD Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? "text-green-400" : "text-red-400"} />
        <StatCard label="Tax Reserve" value={fmt(taxReserve)} color="text-[#E8501A]" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Partner Split */}
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-6">
          <h2 className="text-base font-semibold text-[#FAFAFA] mb-4">Partner Split (50/50)</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[#27272A]">
              <span className="text-sm text-[#A1A1AA]">LLC Net Profit</span>
              <span className="text-sm font-medium text-[#FAFAFA]">{fmt(netProfit)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#27272A]">
              <span className="text-sm text-[#A1A1AA]">{config.partner1Name} ({pct(split)})</span>
              <span className="text-sm font-medium text-[#FAFAFA]">{fmt(partner1Share)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#27272A]">
              <span className="text-sm text-[#A1A1AA]">{config.partner2Name} ({pct(1 - split)})</span>
              <span className="text-sm font-medium text-[#FAFAFA]">{fmt(partner2Share)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#27272A]">
              <span className="text-sm text-[#A1A1AA]">Total Distributed</span>
              <span className="text-sm font-medium text-[#FAFAFA]">{fmt(totalDistributed)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-[#FAFAFA]">Available for Distribution</span>
              <span className={`text-sm font-semibold ${distributableCash >= 0 ? "text-green-400" : "text-red-400"}`}>
                {fmt(Math.max(0, distributableCash))}
              </span>
            </div>
          </div>
        </div>

        {/* Tax Breakdown */}
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-6">
          <h2 className="text-base font-semibold text-[#FAFAFA] mb-1">Estimated Tax — {config.partner1Name}</h2>
          <p className="text-xs text-[#52525B] mb-4">Per-partner estimate based on {pct(split)} share</p>
          <div className="space-y-3">
            <TaxRow label="Taxable income (after QBI + SE deduction)" value={fmt(taxableIncome)} />
            <TaxRow label={`Federal income tax (${pct(config.federalTaxRate)})`} value={fmt(federalTax)} />
            <TaxRow label={`Self-employment tax (${pct(config.selfEmploymentRate)})`} value={fmt(seTax)} />
            <TaxRow label={`${config.stateName} state tax (${pct(config.stateTaxRate)})`} value={fmt(stateTax)} />
            <div className="flex items-center justify-between py-2 border-t border-[#E8501A]/30">
              <span className="text-sm font-medium text-[#E8501A]">Total Estimated Tax</span>
              <span className="text-sm font-bold text-[#E8501A]">{fmt(totalTax)}</span>
            </div>
            <div className="flex items-center justify-between py-2 bg-[#1A1A1E] rounded-lg px-3 -mx-1">
              <span className="text-sm text-[#A1A1AA]">Quarterly Payment</span>
              <span className="text-sm font-semibold text-[#FAFAFA]">{fmt(quarterlyPayment)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quarterly Breakdown */}
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-6 mb-8">
        <h2 className="text-base font-semibold text-[#FAFAFA] mb-4">Quarterly Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[#27272A]">
                <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Quarter</th>
                <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Period</th>
                <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Income</th>
                <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Expenses</th>
                <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Net</th>
                <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Your Share</th>
                <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Due Date</th>
                <th className="text-center py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Paid</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map((q) => {
                const qNet = quarterlyIncome[q] - quarterlyExpenses[q];
                const payment = taxPayments.find((tp) => tp.quarter === q + 1 && tp.type === "federal");
                return (
                  <tr key={q} className="border-b border-[#27272A]/50 hover:bg-[#1A1A1E]/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-[#FAFAFA]">Q{q + 1}</td>
                    <td className="py-3 px-3 text-[#A1A1AA]">{QUARTER_PERIODS[q]}</td>
                    <td className="py-3 px-3 text-right text-green-400">{fmt(quarterlyIncome[q])}</td>
                    <td className="py-3 px-3 text-right text-red-400">{fmt(quarterlyExpenses[q])}</td>
                    <td className={`py-3 px-3 text-right font-medium ${qNet >= 0 ? "text-[#FAFAFA]" : "text-red-400"}`}>{fmt(qNet)}</td>
                    <td className="py-3 px-3 text-right text-[#A1A1AA]">{fmt(qNet * split)}</td>
                    <td className="py-3 px-3 text-[#A1A1AA]">{QUARTER_DUE[q]}</td>
                    <td className="py-3 px-3 text-center">
                      {payment ? (
                        <button onClick={() => togglePayment(payment)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${payment.paid ? "bg-green-500/15 text-green-400" : "bg-[#27272A] text-[#52525B] hover:text-[#A1A1AA]"}`}>
                          {payment.paid ? (
                            <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Paid</>
                          ) : "Unpaid"}
                        </button>
                      ) : (
                        <span className="text-xs text-[#52525B]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#27272A]">
                <td className="py-3 px-3 font-semibold text-[#FAFAFA]" colSpan={2}>Annual Total</td>
                <td className="py-3 px-3 text-right font-semibold text-green-400">{fmt(totalIncome)}</td>
                <td className="py-3 px-3 text-right font-semibold text-red-400">{fmt(totalExpenses)}</td>
                <td className={`py-3 px-3 text-right font-semibold ${netProfit >= 0 ? "text-[#FAFAFA]" : "text-red-400"}`}>{fmt(netProfit)}</td>
                <td className="py-3 px-3 text-right font-semibold text-[#A1A1AA]">{fmt(partner1Share)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Filing Dates */}
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-6">
        <h2 className="text-base font-semibold text-[#FAFAFA] mb-4">Important Filing Dates</h2>
        <div className="space-y-2">
          {FILING_DATES.map((fd) => (
            <div key={fd.form} className="flex items-center justify-between py-2.5 border-b border-[#27272A]/50 last:border-0">
              <div>
                <span className="text-sm text-[#FAFAFA]">{fd.form}</span>
                {fd.notes && <p className="text-xs text-[#52525B] mt-0.5">{fd.notes}</p>}
              </div>
              <span className="text-sm font-medium text-[#E8501A] shrink-0 ml-4">{fd.due}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tax Rates Settings Modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Tax Rate Settings" maxWidth="sm:max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Partner 1 Name</label>
              <input className={inputClasses} value={settings.partner1Name} onChange={(e) => setSettings({ ...settings, partner1Name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Partner 2 Name</label>
              <input className={inputClasses} value={settings.partner2Name} onChange={(e) => setSettings({ ...settings, partner2Name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Federal Tax Rate</label>
              <input type="number" step="0.01" className={inputClasses} value={settings.federalTaxRate} onChange={(e) => setSettings({ ...settings, federalTaxRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Self-Employment Rate</label>
              <input type="number" step="0.001" className={inputClasses} value={settings.selfEmploymentRate} onChange={(e) => setSettings({ ...settings, selfEmploymentRate: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#52525B] mb-1">State Tax Rate</label>
              <input type="number" step="0.001" className={inputClasses} value={settings.stateTaxRate} onChange={(e) => setSettings({ ...settings, stateTaxRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs text-[#52525B] mb-1">State Name</label>
              <input className={inputClasses} value={settings.stateName} onChange={(e) => setSettings({ ...settings, stateName: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Ownership Split</label>
              <input type="number" step="0.01" className={inputClasses} value={settings.ownershipSplit} onChange={(e) => setSettings({ ...settings, ownershipSplit: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs text-[#52525B] mb-1">QBI Deduction Rate</label>
              <input type="number" step="0.01" className={inputClasses} value={settings.qbiDeductionRate} onChange={(e) => setSettings({ ...settings, qbiDeductionRate: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#52525B] mb-1">Tax Reserve Rate</label>
              <input type="number" step="0.01" className={inputClasses} value={settings.taxReserveRate} onChange={(e) => setSettings({ ...settings, taxReserveRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs text-[#52525B] mb-1">SE Deduction</label>
              <input type="number" step="0.01" className={inputClasses} value={settings.seDeduction} onChange={(e) => setSettings({ ...settings, seDeduction: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <p className="text-xs text-[#52525B]">Rates are entered as decimals (e.g., 0.12 = 12%). Changes recalculate all estimates.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={saveSettings} disabled={saving}>{saving ? "Saving..." : "Save Rates"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
      <p className="text-xs text-[#52525B] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function TaxRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#27272A]/50">
      <span className="text-sm text-[#A1A1AA]">{label}</span>
      <span className="text-sm font-medium text-[#FAFAFA]">{value}</span>
    </div>
  );
}
