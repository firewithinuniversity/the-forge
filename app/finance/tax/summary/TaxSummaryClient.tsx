"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "../../../components/ui/PageHeader";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Select from "../../../components/ui/Select";
import Badge from "../../../components/ui/Badge";

// ── Types ──────────────────────────────────────────────────────────────────

interface TaxConfig {
  partner1Name: string;
  partner2Name: string;
  ownershipSplit: number;
  federalTaxRate: number;
  selfEmploymentRate: number;
  seDeduction: number;
  stateTaxRate: number;
  stateName: string;
  qbiDeductionRate: number;
}

interface CategoryAmount {
  category: string;
  amount: number;
}

interface ExpenseCategory {
  category: string;
  total: number;
  deductible: number;
  nonDeductible: number;
}

interface PartnerTax {
  name: string;
  grossShare: number;
  seTax: number;
  seDeductionAmt: number;
  qbiDeduction: number;
  taxableIncome: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  distributed: number;
  remainingOwed: number;
}

interface PaymentDetail {
  id: string;
  quarter: number;
  type: string;
  amount: number;
  paid: boolean;
  paidDate: string | null;
  dueDate: string;
}

interface PaymentByType {
  type: string;
  paid: number;
  total: number;
}

interface TaxSummaryData {
  year: number;
  config: TaxConfig;
  income: {
    total: number;
    byCategory: CategoryAmount[];
  };
  expenses: {
    total: number;
    totalDeductible: number;
    totalNonDeductible: number;
    byCategory: ExpenseCategory[];
  };
  netProfit: number;
  partner1: PartnerTax;
  partner2: PartnerTax;
  payments: {
    totalPaid: number;
    totalEstimatedLiability: number;
    remainingOwed: number;
    byType: PaymentByType[];
    details: PaymentDetail[];
  };
  distributions: {
    total: number;
    partner1Total: number;
    partner2Total: number;
    count: number;
  };
}

interface Props {
  initialData: TaxSummaryData;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const TYPE_LABELS: Record<string, string> = {
  federal: "Federal",
  state: "State",
  self_employment: "Self-Employment",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function TaxSummaryClient({ initialData }: Props) {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - i;
    return { value: String(y), label: String(y) };
  });

  const [data, setData] = useState<TaxSummaryData>(initialData);
  const [selectedYear, setSelectedYear] = useState(String(data.year));
  const [loading, setLoading] = useState(false);

  const fetchYear = useCallback(async (year: string) => {
    setSelectedYear(year);
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/tax-summary?year=${year}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      /* keep previous data on error */
    } finally {
      setLoading(false);
    }
  }, []);

  function handlePrint() {
    window.print();
  }

  const { config, income, expenses, netProfit, partner1, partner2, payments, distributions } = data;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-8 max-w-6xl mx-auto">
      {/* Print-friendly styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          div[class*="bg-[#0F0F11]"] { background: #f9f9f9 !important; border-color: #ddd !important; }
          div[class*="bg-[#09090B]"] { background: white !important; }
          * { color: black !important; border-color: #ddd !important; }
          table th { background: #f3f3f3 !important; }
          .text-green-400, .text-red-400, .text-\\[\\#E8501A\\] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <PageHeader
        title={`Annual Tax Summary — ${data.year}`}
        description={`Comprehensive tax liability overview for Fire Within University LLC`}
        actions={
          <div className="flex items-center gap-3 no-print">
            <Select
              options={yearOptions}
              value={selectedYear}
              onChange={(e) => fetchYear(e.target.value)}
              className="w-28"
            />
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12Zm-3 0h.008v.008h-.008V12Z" />
              </svg>
              Print / Export
            </Button>
            <Link href="/finance/tax">
              <Button variant="ghost" size="sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
                Tax Center
              </Button>
            </Link>
          </div>
        }
      />

      {loading && (
        <div className="mb-6 rounded-xl border border-[#E8501A]/30 bg-[#E8501A]/5 p-3 text-center text-sm text-[#E8501A]">
          Loading {selectedYear} data...
        </div>
      )}

      {/* ── KPI Overview ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard label="Total Income" value={fmt(income.total)} color="text-green-400" />
        <KPICard label="Total Expenses" value={fmt(expenses.total)} color="text-red-400" />
        <KPICard label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? "text-green-400" : "text-red-400"} />
        <KPICard label="Total Tax Liability" value={fmt(payments.totalEstimatedLiability)} color="text-[#E8501A]" />
      </div>

      {/* ── Income Summary ────────────────────────────────────────────── */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[#FAFAFA] mb-4">Income Summary</h2>
        {income.byCategory.length === 0 ? (
          <p className="text-sm text-[#52525B]">No income recorded for {data.year}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272A]">
                  <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Category</th>
                  <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Amount</th>
                  <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {income.byCategory.map((row) => (
                  <tr key={row.category} className="border-b border-[#27272A]/50 hover:bg-[#1A1A1E]/50 transition-colors">
                    <td className="py-3 px-3 text-[#FAFAFA]">{row.category}</td>
                    <td className="py-3 px-3 text-right text-green-400 font-medium">{fmt(row.amount)}</td>
                    <td className="py-3 px-3 text-right text-[#A1A1AA]">
                      {income.total > 0 ? `${((row.amount / income.total) * 100).toFixed(1)}%` : "0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#27272A]">
                  <td className="py-3 px-3 font-semibold text-[#FAFAFA]">Total Income</td>
                  <td className="py-3 px-3 text-right font-semibold text-green-400">{fmt(income.total)}</td>
                  <td className="py-3 px-3 text-right text-[#A1A1AA]">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* ── Expense Summary ───────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#FAFAFA]">Expense Summary</h2>
          <div className="flex items-center gap-3">
            <Badge variant="success">Deductible: {fmt(expenses.totalDeductible)}</Badge>
            <Badge variant="danger">Non-Deductible: {fmt(expenses.totalNonDeductible)}</Badge>
          </div>
        </div>
        {expenses.byCategory.length === 0 ? (
          <p className="text-sm text-[#52525B]">No expenses recorded for {data.year}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272A]">
                  <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Category</th>
                  <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Total</th>
                  <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Deductible</th>
                  <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Non-Deductible</th>
                </tr>
              </thead>
              <tbody>
                {expenses.byCategory.map((row) => (
                  <tr key={row.category} className="border-b border-[#27272A]/50 hover:bg-[#1A1A1E]/50 transition-colors">
                    <td className="py-3 px-3 text-[#FAFAFA]">{row.category}</td>
                    <td className="py-3 px-3 text-right text-red-400 font-medium">{fmt(row.total)}</td>
                    <td className="py-3 px-3 text-right text-green-400">{fmt(row.deductible)}</td>
                    <td className="py-3 px-3 text-right text-[#A1A1AA]">{fmt(row.nonDeductible)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#27272A]">
                  <td className="py-3 px-3 font-semibold text-[#FAFAFA]">Total Expenses</td>
                  <td className="py-3 px-3 text-right font-semibold text-red-400">{fmt(expenses.total)}</td>
                  <td className="py-3 px-3 text-right font-semibold text-green-400">{fmt(expenses.totalDeductible)}</td>
                  <td className="py-3 px-3 text-right font-semibold text-[#A1A1AA]">{fmt(expenses.totalNonDeductible)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* ── Tax Liability Estimate (Per Partner) ──────────────────────── */}
      <div className="print-break" />
      <h2 className="text-base font-semibold text-[#FAFAFA] mb-4">Tax Liability Estimate</h2>
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <PartnerTaxCard partner={partner1} config={config} />
        <PartnerTaxCard partner={partner2} config={config} />
      </div>

      {/* ── Payments vs Liability ─────────────────────────────────────── */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[#FAFAFA] mb-4">Payments vs Liability</h2>

        {/* Summary bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#A1A1AA]">Paid</span>
            <span className="text-sm text-[#A1A1AA]">
              {fmt(payments.totalPaid)} of {fmt(payments.totalEstimatedLiability)}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-[#1A1A1E] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#E8501A] transition-[width] duration-500"
              style={{
                width: `${payments.totalEstimatedLiability > 0 ? Math.min(100, (payments.totalPaid / payments.totalEstimatedLiability) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#52525B]">
              {payments.totalEstimatedLiability > 0
                ? `${((payments.totalPaid / payments.totalEstimatedLiability) * 100).toFixed(0)}% paid`
                : "No liability"}
            </span>
            <span className={`text-sm font-semibold ${payments.remainingOwed > 0 ? "text-red-400" : "text-green-400"}`}>
              {payments.remainingOwed > 0
                ? `${fmt(payments.remainingOwed)} remaining`
                : "Fully paid"}
            </span>
          </div>
        </div>

        {/* Payment type breakdown */}
        {payments.byType.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[#A1A1AA] mb-3">By Tax Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {payments.byType.map((pt) => (
                <div key={pt.type} className="rounded-lg bg-[#1A1A1E] p-3">
                  <p className="text-xs text-[#52525B] mb-1">{TYPE_LABELS[pt.type] || pt.type}</p>
                  <p className="text-sm font-medium text-[#FAFAFA]">
                    {fmt(pt.paid)} <span className="text-[#52525B]">/ {fmt(pt.total)}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quarterly payment details */}
        {payments.details.length > 0 && (
          <div className="overflow-x-auto">
            <h3 className="text-sm font-medium text-[#A1A1AA] mb-3">Quarterly Payment Details</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272A]">
                  <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Quarter</th>
                  <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Type</th>
                  <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Amount</th>
                  <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Due Date</th>
                  <th className="text-center py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B]">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.details.map((p) => (
                  <tr key={p.id} className="border-b border-[#27272A]/50 hover:bg-[#1A1A1E]/50 transition-colors">
                    <td className="py-3 px-3 text-[#FAFAFA] font-medium">Q{p.quarter}</td>
                    <td className="py-3 px-3 text-[#A1A1AA]">{TYPE_LABELS[p.type] || p.type}</td>
                    <td className="py-3 px-3 text-right text-[#FAFAFA]">{fmt(p.amount)}</td>
                    <td className="py-3 px-3 text-[#A1A1AA]">
                      {new Date(p.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={p.paid ? "success" : "warning"}>
                        {p.paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {payments.details.length === 0 && (
          <p className="text-sm text-[#52525B]">No tax payments recorded for {data.year}.</p>
        )}
      </Card>

      {/* ── Distributions ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[#FAFAFA] mb-4">Distributions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg bg-[#1A1A1E] p-4">
            <p className="text-xs text-[#52525B] mb-1">Total Distributed</p>
            <p className="text-2xl font-bold text-[#FAFAFA]">{fmt(distributions.total)}</p>
            <p className="text-xs text-[#52525B] mt-1">{distributions.count} distribution{distributions.count !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-lg bg-[#1A1A1E] p-4">
            <p className="text-xs text-[#52525B] mb-1">{config.partner1Name}</p>
            <p className="text-2xl font-bold text-[#FAFAFA]">{fmt(distributions.partner1Total)}</p>
          </div>
          <div className="rounded-lg bg-[#1A1A1E] p-4">
            <p className="text-xs text-[#52525B] mb-1">{config.partner2Name}</p>
            <p className="text-2xl font-bold text-[#FAFAFA]">{fmt(distributions.partner2Total)}</p>
          </div>
        </div>
      </Card>

      {/* ── Footer disclaimer ─────────────────────────────────────────── */}
      <p className="text-xs text-[#52525B] text-center mt-8 mb-4">
        These are estimates based on configured tax rates. Consult a CPA for official filing amounts.
      </p>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function KPICard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
      <p className="text-xs text-[#52525B] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function PartnerTaxCard({ partner, config }: { partner: PartnerTax; config: TaxConfig }) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-[#FAFAFA] mb-1">{partner.name}</h3>
      <p className="text-xs text-[#52525B] mb-4">
        {pct(partner.name === config.partner1Name ? config.ownershipSplit : 1 - config.ownershipSplit)} ownership share
      </p>
      <div className="space-y-2">
        <TaxRow label="Gross Share of Profit" value={fmt(partner.grossShare)} />
        <TaxRow label={`QBI Deduction (${pct(config.qbiDeductionRate)})`} value={`-${fmt(partner.qbiDeduction)}`} />
        <TaxRow label={`SE Deduction (50% of SE tax)`} value={`-${fmt(partner.seDeductionAmt)}`} />
        <TaxRow label="Taxable Income" value={fmt(partner.taxableIncome)} bold />
        <div className="h-px bg-[#27272A] my-2" />
        <TaxRow label={`Federal Tax (${pct(config.federalTaxRate)})`} value={fmt(partner.federalTax)} />
        <TaxRow label={`Self-Employment Tax (${pct(config.selfEmploymentRate)})`} value={fmt(partner.seTax)} />
        <TaxRow label={`${config.stateName} State Tax (${pct(config.stateTaxRate)})`} value={fmt(partner.stateTax)} />
        <div className="flex items-center justify-between py-2 border-t border-[#E8501A]/30 mt-2">
          <span className="text-sm font-medium text-[#E8501A]">Total Estimated Tax</span>
          <span className="text-sm font-bold text-[#E8501A]">{fmt(partner.totalTax)}</span>
        </div>
        <div className="flex items-center justify-between py-2 bg-[#1A1A1E] rounded-lg px-3 -mx-1">
          <span className="text-sm text-[#A1A1AA]">Remaining Owed</span>
          <span className={`text-sm font-semibold ${partner.remainingOwed > 0 ? "text-red-400" : "text-green-400"}`}>
            {partner.remainingOwed > 0 ? fmt(partner.remainingOwed) : "Paid in full"}
          </span>
        </div>
      </div>
    </Card>
  );
}

function TaxRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${bold ? "font-medium text-[#FAFAFA]" : "text-[#A1A1AA]"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-semibold text-[#FAFAFA]" : "font-medium text-[#FAFAFA]"}`}>{value}</span>
    </div>
  );
}
