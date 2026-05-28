"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/app/components/ui/PageHeader";
import Card from "@/app/components/ui/Card";
import JSZip from "jszip";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

/* -- Export History ----------------------------------------- */
interface ExportEntry {
  label: string;
  date: string;
}
function getHistory(): ExportEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("forge-export-history") || "[]");
  } catch { return []; }
}
function logExport(label: string) {
  const history = getHistory();
  history.unshift({ label, date: new Date().toLocaleDateString("en-US") });
  if (history.length > 20) history.length = 20;
  localStorage.setItem("forge-export-history", JSON.stringify(history));
}

/* -- Download helper --------------------------------------- */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* -- Shared status type ------------------------------------ */
type DlStatus = "idle" | "loading" | "done";

export default function ExportsClient() {
  // Monthly state
  const [monthYear, setMonthYear] = useState(currentYear);
  const [monthIdx, setMonthIdx] = useState(new Date().getMonth());
  const [monthStatus, setMonthStatus] = useState<DlStatus>("idle");

  // Quarterly state
  const [qYear, setQYear] = useState(currentYear);
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [qStatus, setQStatus] = useState<DlStatus>("idle");

  // Annual state
  const [annualYear, setAnnualYear] = useState(currentYear);
  const [annualStatus, setAnnualStatus] = useState<DlStatus>("idle");

  // CPA state
  const [cpaYear, setCpaYear] = useState(currentYear);
  const [cpaStatus, setCpaStatus] = useState<DlStatus>("idle");

  // History
  const [history, setHistory] = useState<ExportEntry[]>([]);
  useEffect(() => { setHistory(getHistory()); }, []);

  const refreshHistory = useCallback(() => setHistory(getHistory()), []);

  /* -- Download handlers ----------------------------------- */
  async function downloadCsv(type: string, params: Record<string, string | number>, label: string, setStatus: (s: DlStatus) => void) {
    setStatus("loading");
    try {
      const qs = new URLSearchParams();
      qs.set("type", type);
      for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
      const res = await fetch(`/api/finance/export-csv?${qs.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : `FWU-Export.csv`;
      downloadBlob(blob, filename);
      logExport(label);
      refreshHistory();
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error(err);
      setStatus("idle");
      alert("Export failed — please try again.");
    }
  }

  async function downloadCpaZip() {
    setCpaStatus("loading");
    try {
      const res = await fetch(`/api/finance/export-csv?type=cpa&year=${cpaYear}`);
      if (!res.ok) throw new Error("Export failed");
      const { files, year } = await res.json() as { files: Record<string, string>; year: number };

      const zip = new JSZip();
      for (const [name, content] of Object.entries(files)) {
        zip.file(name, content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `FWU-CPA-Package-${year}.zip`);
      logExport(`CPA Package — ${year}`);
      refreshHistory();
      setCpaStatus("done");
      setTimeout(() => setCpaStatus("idle"), 3000);
    } catch (err) {
      console.error(err);
      setCpaStatus("idle");
      alert("Export failed — please try again.");
    }
  }

  /* -- Button component ------------------------------------ */
  function DlButton({ status, onClick, label }: { status: DlStatus; onClick: () => void; label: string }) {
    return (
      <button
        onClick={onClick}
        disabled={status === "loading"}
        className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
          status === "done"
            ? "bg-emerald-600 text-white"
            : status === "loading"
            ? "bg-[#E8501A]/60 text-white/70 cursor-wait"
            : "bg-[#E8501A] text-white [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#F06A30]"
        }`}
      >
        {status === "loading" && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        )}
        {status === "done" && (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        )}
        {status === "loading" ? "Preparing your export…" : status === "done" ? "Downloaded ✓" : label}
      </button>
    );
  }

  /* -- Select styling -------------------------------------- */
  const selectClass = "bg-[#1A1A1E] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none";

  return (
    <div>
      <PageHeader title="Exports" description="Download clean financial records — monthly, quarterly, annually, or CPA-ready." />

      <div className="space-y-6">
        {/* -- Monthly Export ------------------------------- */}
        <Card>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <h3 className="text-[#FAFAFA] font-semibold text-base">Monthly Export</h3>
              <p className="text-[#A1A1AA] text-sm mt-0.5">Download all transactions, income, and expenses for a specific month.</p>
            </div>
          </div>
          <p className="text-[#52525B] text-xs mb-4">Includes: summary, income by category, expenses by category, full transaction list</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">Month</label>
              <select className={selectClass} value={monthIdx} onChange={e => setMonthIdx(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">Year</label>
              <select className={selectClass} value={monthYear} onChange={e => setMonthYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <DlButton
              status={monthStatus}
              label="Download Monthly Report"
              onClick={() => downloadCsv("monthly", { month: monthIdx, year: monthYear }, `${MONTHS[monthIdx]} ${monthYear} Monthly Report`, setMonthStatus)}
            />
          </div>
        </Card>

        {/* -- Quarterly Export ----------------------------- */}
        <Card>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <h3 className="text-[#FAFAFA] font-semibold text-base">Quarterly Export</h3>
              <p className="text-[#A1A1AA] text-sm mt-0.5">Download the full quarter — transactions, tax estimate, and payment status.</p>
            </div>
          </div>
          <p className="text-[#52525B] text-xs mb-4">Includes: quarter summary, monthly breakdown, tax estimate per partner, transactions</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">Quarter</label>
              <select className={selectClass} value={quarter} onChange={e => setQuarter(Number(e.target.value))}>
                <option value={1}>Q1 (Jan–Mar)</option>
                <option value={2}>Q2 (Apr–Jun)</option>
                <option value={3}>Q3 (Jul–Sep)</option>
                <option value={4}>Q4 (Oct–Dec)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">Year</label>
              <select className={selectClass} value={qYear} onChange={e => setQYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <DlButton
              status={qStatus}
              label="Download Quarterly Report"
              onClick={() => downloadCsv("quarterly", { quarter, year: qYear }, `Q${quarter} ${qYear} Quarterly Report`, setQStatus)}
            />
          </div>
        </Card>

        {/* -- Annual Export -------------------------------- */}
        <Card>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="text-[#FAFAFA] font-semibold text-base">Annual Export</h3>
              <p className="text-[#A1A1AA] text-sm mt-0.5">Full year financial summary — use this for year-end review and tax prep.</p>
            </div>
          </div>
          <p className="text-[#52525B] text-xs mb-4">Includes: annual summary, income/expense by category (monthly grid), quarterly tax payments, distributions, recurring expenses</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">Year</label>
              <select className={selectClass} value={annualYear} onChange={e => setAnnualYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <DlButton
              status={annualStatus}
              label="Download Annual Report"
              onClick={() => downloadCsv("annual", { year: annualYear }, `${annualYear} Annual Report`, setAnnualStatus)}
            />
          </div>
        </Card>

        {/* -- CPA Package --------------------------------- */}
        <Card>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div>
              <h3 className="text-[#FAFAFA] font-semibold text-base">Export for CPA</h3>
              <p className="text-[#A1A1AA] text-sm mt-0.5">Everything your CPA needs to file Form 1065 and generate K-1s. Downloads as a ZIP file.</p>
            </div>
          </div>
          <p className="text-[#52525B] text-xs mb-4">Contains 6 files: Annual Summary, All Transactions, Distributions, Tax Payments, Recurring Expenses, Partner Summary</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">Year</label>
              <select className={selectClass} value={cpaYear} onChange={e => setCpaYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <DlButton
              status={cpaStatus}
              label="Download CPA Package (.zip)"
              onClick={downloadCpaZip}
            />
          </div>
        </Card>

        {/* -- Existing XLSX Export ------------------------- */}
        <Card>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#E8501A]/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#E8501A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <h3 className="text-[#FAFAFA] font-semibold text-base">Excel Workbook (.xlsx)</h3>
              <p className="text-[#A1A1AA] text-sm mt-0.5">Multi-sheet Excel workbook with all financial data — great for custom analysis.</p>
            </div>
          </div>
          <p className="text-[#52525B] text-xs mb-4">10 sheets: Transactions, Income by Source, Expenses by Category, Monthly Summary, Tax Estimates, Partner Split, Distributions, Recurring, Tax Payments, Filing Dates</p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/api/finance/export?mode=full&year=${currentYear}&format=xlsx`}
              className="px-6 py-2.5 rounded-lg font-medium text-sm bg-[#1A1A1E] border border-[#27272A] text-[#FAFAFA] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#3F3F46] transition-colors"
            >
              Download {currentYear} XLSX
            </a>
            <a
              href="/api/export-all"
              className="px-6 py-2.5 rounded-lg font-medium text-sm bg-[#1A1A1E] border border-[#27272A] text-[#A1A1AA] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#3F3F46] transition-colors"
            >
              Full JSON Backup
            </a>
          </div>
        </Card>

        {/* -- Export History ------------------------------- */}
        {history.length > 0 && (
          <Card>
            <h3 className="text-[#FAFAFA] font-semibold text-base mb-3">Recent Exports</h3>
            <div className="space-y-2">
              {history.slice(0, 10).map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[#A1A1AA]">{entry.label}</span>
                  <span className="text-[#52525B]">{entry.date}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
