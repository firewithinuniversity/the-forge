"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

interface MonthlyChartData {
  month: string;
  income: number;
  expenses: number;
}

interface IncomeCategoryData {
  category: string;
  amount: number;
  color: string;
}

interface ChartsProps {
  monthlyChart: MonthlyChartData[];
  incomeCategoryBreakdown: IncomeCategoryData[];
  formatCurrency: (n: number) => string;
}

export default function Charts({ monthlyChart, incomeCategoryBreakdown, formatCurrency }: ChartsProps) {
  return (
    <>
      <MonthlyOverviewChart data={monthlyChart} formatCurrency={formatCurrency} />

      {/* Profit Trend + Income by Category — 2-column grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <ProfitTrendChart data={monthlyChart} formatCurrency={formatCurrency} />
        <IncomeByCategoryChart data={incomeCategoryBreakdown} formatCurrency={formatCurrency} />
      </div>
    </>
  );
}

const INCOME_PALETTE = [
  "#22C55E",
  "#E8501A",
  "#3B82F6",
  "#A855F7",
  "#F43F5E",
  "#06B6D4",
  "#F97316",
  "#84CC16",
  "#EC4899",
  "#14B8A6",
];

export function MonthlyOverviewChart({
  data,
  formatCurrency,
}: {
  data: MonthlyChartData[];
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 mb-8">
      <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">
        Monthly Overview
      </h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
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
            <Tooltip
              contentStyle={{
                backgroundColor: "#1A1A1E",
                border: "1px solid #27272A",
                borderRadius: "8px",
                color: "#FAFAFA",
                fontSize: 13,
              }}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#A1A1AA" }} />
            <Bar
              dataKey="income"
              name="Income"
              fill="#22C55E"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill="#EF4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProfitTrendChart({
  data,
  formatCurrency,
}: {
  data: MonthlyChartData[];
  formatCurrency: (n: number) => string;
}) {
  const profitData = data.map((d) => ({
    month: d.month,
    profit: d.income - d.expenses,
  }));

  return (
    <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5">
      <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">
        Profit Trend
      </h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={profitData}>
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
            <Tooltip
              contentStyle={{
                backgroundColor: "#1A1A1E",
                border: "1px solid #27272A",
                borderRadius: "8px",
                color: "#FAFAFA",
                fontSize: 13,
              }}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <ReferenceLine y={0} stroke="#52525B" strokeDasharray="3 3" />
            <defs>
              <linearGradient id="profitColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity={1} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={1} />
              </linearGradient>
            </defs>
            <Line
              type="monotone"
              dataKey="profit"
              name="Net Profit"
              stroke="url(#profitColor)"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload, index } = props as { cx?: number; cy?: number; payload?: { profit: number }; index?: number };
                if (cx == null || cy == null || !payload) return <circle key={index} />;
                const color = payload.profit >= 0 ? "#22C55E" : "#EF4444";
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color}
                    stroke={color}
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function IncomeByCategoryChart({
  data,
  formatCurrency,
}: {
  data: IncomeCategoryData[];
  formatCurrency: (n: number) => string;
}) {
  const coloredData = data.map((d, i) => ({
    ...d,
    color: d.color || INCOME_PALETTE[i % INCOME_PALETTE.length],
  }));

  const total = coloredData.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5">
      <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">
        Income by Category
      </h3>
      {coloredData.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center">
          <p className="text-xs text-[#52525B]">No income data available</p>
        </div>
      ) : (
        <div className="h-[220px] flex items-center">
          <div className="w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={coloredData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="amount"
                  nameKey="category"
                  stroke="none"
                >
                  {coloredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1A1E",
                    border: "1px solid #27272A",
                    borderRadius: "8px",
                    color: "#FAFAFA",
                    fontSize: 13,
                  }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 space-y-2 overflow-y-auto max-h-[220px] pr-1">
            {coloredData.map((entry, i) => {
              const pct =
                total > 0 ? ((entry.amount / total) * 100).toFixed(1) : "0";
              return (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#A1A1AA] truncate">
                      {entry.category}
                    </p>
                  </div>
                  <span className="text-xs text-[#52525B] tabular-nums flex-shrink-0">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
