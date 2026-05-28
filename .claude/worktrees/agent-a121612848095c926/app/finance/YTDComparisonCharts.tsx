"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface YTDMonth {
  month: string;
  currentIncome: number;
  currentExpenses: number;
  previousIncome: number;
  previousExpenses: number;
}

interface YTDTotals {
  currentIncome: number;
  currentExpenses: number;
  currentNet: number;
  previousIncome: number;
  previousExpenses: number;
  previousNet: number;
  incomeChange: number;
  expenseChange: number;
  netChange: number;
}

interface YTDData {
  currentYear: number;
  previousYear: number;
  months: YTDMonth[];
  totals: YTDTotals;
}

function formatCurrency(n: number) {
  return (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: "#1A1A1E",
        border: "1px solid #27272A",
        borderRadius: "8px",
        color: "#FAFAFA",
        fontSize: 13,
        padding: "10px 14px",
      }}
    >
      <p style={{ marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: entry.color, margin: "2px 0" }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

function ChangeIndicator({ value, invertColor }: { value: number; invertColor?: boolean }) {
  if (value === 0) return <span className="text-xs text-[#52525B]">--</span>;

  // For expenses, going up is bad (red), going down is good (green)
  // For income/net, going up is good (green), going down is bad (red)
  const isPositive = value > 0;
  const isGood = invertColor ? !isPositive : isPositive;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isGood ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
      {isPositive ? (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
        </svg>
      ) : (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
        </svg>
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function YTDComparisonCharts() {
  const [data, setData] = useState<YTDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/finance/ytd-comparison");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load comparison data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 mb-8">
        <div className="h-4 w-56 bg-[#27272A] rounded mb-4 animate-pulse" />
        <div className="h-[280px] bg-[#09090B] rounded animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 mb-8">
        <p className="text-sm text-[#52525B]">{error || "No data available"}</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Collapsible Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 hover:border-[#E8501A]/30 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-4 w-4 text-[#52525B] transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <h3 className="text-sm font-semibold text-[#FAFAFA]">
            Year-over-Year Comparison
          </h3>
          <span className="text-xs text-[#52525B]">
            {data.currentYear} vs {data.previousYear}
          </span>
        </div>
        <span className="text-xs text-[#52525B] group-hover:text-[#A1A1AA] transition-colors">
          {expanded ? "Collapse" : "Expand"}
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-6">
          {/* Charts Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Income Comparison */}
            <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5">
              <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">
                Income Comparison
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.months} barGap={2} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#52525B", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#52525B", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#A1A1AA" }} />
                    <Bar
                      dataKey="currentIncome"
                      name={`${data.currentYear}`}
                      fill="#E8501A"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="previousIncome"
                      name={`${data.previousYear}`}
                      fill="#3F3F46"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Comparison */}
            <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5">
              <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">
                Expense Comparison
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.months} barGap={2} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#52525B", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#52525B", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#A1A1AA" }} />
                    <Bar
                      dataKey="currentExpenses"
                      name={`${data.currentYear}`}
                      fill="#EF4444"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="previousExpenses"
                      name={`${data.previousYear}`}
                      fill="#3F3F46"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {/* Income Card */}
            <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
              <p className="text-xs text-[#52525B] mb-1">YTD Income</p>
              <div className="flex items-baseline justify-between">
                <p className="text-lg font-semibold text-[#22C55E] tabular-nums">
                  {formatCurrency(data.totals.currentIncome)}
                </p>
                <ChangeIndicator value={data.totals.incomeChange} />
              </div>
              <p className="text-xs text-[#52525B] mt-1">
                vs {formatCurrency(data.totals.previousIncome)} in {data.previousYear}
              </p>
            </div>

            {/* Expenses Card */}
            <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
              <p className="text-xs text-[#52525B] mb-1">YTD Expenses</p>
              <div className="flex items-baseline justify-between">
                <p className="text-lg font-semibold text-[#EF4444] tabular-nums">
                  {formatCurrency(data.totals.currentExpenses)}
                </p>
                <ChangeIndicator value={data.totals.expenseChange} invertColor />
              </div>
              <p className="text-xs text-[#52525B] mt-1">
                vs {formatCurrency(data.totals.previousExpenses)} in {data.previousYear}
              </p>
            </div>

            {/* Net Card */}
            <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
              <p className="text-xs text-[#52525B] mb-1">YTD Net</p>
              <div className="flex items-baseline justify-between">
                <p className={`text-lg font-semibold tabular-nums ${data.totals.currentNet >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {formatCurrency(data.totals.currentNet)}
                </p>
                <ChangeIndicator value={data.totals.netChange} />
              </div>
              <p className="text-xs text-[#52525B] mt-1">
                vs {formatCurrency(data.totals.previousNet)} in {data.previousYear}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
