import Link from "next/link";
import { prisma } from "@/lib/prisma";
import KPICard from "./components/ui/KPICard";
import DashboardActions from "./components/DashboardActions";
import AuditLogViewer from "./components/AuditLogViewer";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfPrevMonth = new Date(year, now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(year, now.getMonth(), 0, 23, 59, 59, 999);

  const [projects, recentTasks, monthlyTx, prevMonthTx, yearAllTx, recentTransactions, recentDistributions, overdueTasks, last6MonthsTx] = await Promise.all([
    prisma.project.findMany({
      where: { archived: false },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, name: true, description: true, color: true, updatedAt: true,
        tasks: { select: { id: true, status: true, dueDate: true } },
        _count: { select: { phases: true } },
      },
    }),
    prisma.task.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { project: { select: { id: true, name: true, color: true } } },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      select: { type: true, amount: true, category: true },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
      select: { type: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: startOfYear } },
      select: { type: true, amount: true, category: true },
    }),
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, amount: true, description: true, category: true, createdAt: true },
    }),
    prisma.distribution.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, llcNetProfit: true, type: true, createdAt: true },
    }),
    // Overdue tasks: past due, not done
    prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["done"] },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: { project: { select: { id: true, name: true, color: true } } },
    }),
    // Last 6 months of transactions for cash flow trend
    prisma.transaction.findMany({
      where: { date: { gte: new Date(year, now.getMonth() - 5, 1) } },
      select: { type: true, amount: true, date: true },
    }),
  ]);

  // Filter donations in JS instead of using Prisma contains (LibSQL compatibility)
  const yearTx = yearAllTx.filter(t => t.type === "income" && (t.category ?? "").includes("Donation"));

  const allTasks = projects.flatMap((p) => p.tasks);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const dueThisWeek = allTasks.filter((t) => {
    if (!t.dueDate || t.status === "done") return false;
    const due = new Date(t.dueDate);
    return due >= now && due <= endOfWeek;
  }).length;

  let monthlyIncome = 0, monthlyExpenses = 0;
  for (const t of monthlyTx) { if (t.type === "income") monthlyIncome += t.amount; else monthlyExpenses += t.amount; }

  // Previous month totals for MoM comparison
  let prevMonthIncome = 0, prevMonthExpenses = 0;
  for (const t of prevMonthTx) { if (t.type === "income") prevMonthIncome += t.amount; else prevMonthExpenses += t.amount; }

  const incomeChange = prevMonthIncome > 0 ? ((monthlyIncome - prevMonthIncome) / prevMonthIncome) * 100 : 0;
  const expenseChange = prevMonthExpenses > 0 ? ((monthlyExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 : 0;

  // Profit margin
  const profitMargin = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  // YTD profit margin
  let ytdIncome = 0, ytdExpenses = 0;
  for (const t of yearAllTx) { if (t.type === "income") ytdIncome += t.amount; else ytdExpenses += t.amount; }
  const ytdProfitMargin = ytdIncome > 0 ? ((ytdIncome - ytdExpenses) / ytdIncome) * 100 : 0;

  // Donation stats
  const donationCount = yearTx.length;
  const totalDonations = yearTx.reduce((s, t) => s + t.amount, 0);
  const avgDonation = donationCount > 0 ? totalDonations / donationCount : 0;

  // Next tax deadline
  const deadlines = [
    { name: "Q4 Est. Tax", date: new Date(year, 0, 15) },
    { name: "1065 / K-1 Due", date: new Date(year, 2, 15) },
    { name: "Q1 Est. Tax / 1040", date: new Date(year, 3, 15) },
    { name: "Q2 Est. Tax", date: new Date(year, 5, 15) },
    { name: "WI Annual Report", date: new Date(year, 5, 30) },
    { name: "Q3 Est. Tax", date: new Date(year, 8, 15) },
    { name: "Q4 Est. Tax", date: new Date(year + 1, 0, 15) },
  ];
  const nextDeadline = deadlines.find((d) => d.date >= now) || deadlines[0];
  const daysUntilDeadline = Math.ceil((nextDeadline.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Next 3 upcoming deadlines
  const upcomingDeadlines = deadlines
    .filter((d) => d.date >= now)
    .slice(0, 3)
    .map((d) => ({
      name: d.name,
      date: d.date.toISOString(),
      daysAway: Math.ceil((d.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));

  // Overdue tasks formatted
  const overdueItems = overdueTasks.map((t) => ({
    id: t.id,
    title: t.title,
    projectName: t.project.name,
    projectId: t.project.id,
    projectColor: t.project.color,
    daysOverdue: Math.ceil((now.getTime() - new Date(t.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
    priority: t.priority,
  }));

  // Cash flow trend — last 6 months
  const cashFlowMonths: { month: string; income: number; expenses: number; net: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(year, now.getMonth() - i, 1);
    const mEnd = new Date(year, now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const label = m.toLocaleDateString("en-US", { month: "short" });
    let income = 0, expenses = 0;
    for (const tx of last6MonthsTx) {
      const txDate = new Date(tx.date);
      if (txDate >= m && txDate <= mEnd) {
        if (tx.type === "income") income += tx.amount;
        else expenses += tx.amount;
      }
    }
    cashFlowMonths.push({ month: label, income: Math.round(income * 100) / 100, expenses: Math.round(expenses * 100) / 100, net: Math.round((income - expenses) * 100) / 100 });
  }

  const projectCards = projects.map((p) => {
    const statusCounts = { todo: 0, in_progress: 0, review: 0, done: 0 };
    for (const t of p.tasks) {
      const s = t.status as keyof typeof statusCounts;
      if (s in statusCounts) statusCounts[s]++;
    }
    const total = p.tasks.length;
    const done = statusCounts.done;
    return {
      id: p.id, name: p.name, description: p.description, color: p.color,
      updatedAt: p.updatedAt.toISOString(), statusCounts, totalTasks: total,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  // Combined activity feed — tasks, transactions, distributions
  type ActivityItem = { id: string; text: string; detail: string; timestamp: string; color: string; href?: string };
  const activity: ActivityItem[] = [];

  for (const t of recentTasks) {
    activity.push({
      id: `task-${t.id}`,
      text: t.title,
      detail: `${statusLabel(t.status)} · ${t.project.name}`,
      timestamp: t.updatedAt.toISOString(),
      color: t.project.color,
      href: `/projects/${t.project.id}`,
    });
  }

  for (const t of recentTransactions) {
    const prefix = t.type === "income" ? "+" : "-";
    const fmtAmt = "$" + t.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    activity.push({
      id: `tx-${t.id}`,
      text: `${t.description}`,
      detail: `${t.type === "income" ? "Income" : "Expense"} · ${t.category} · ${prefix}${fmtAmt}`,
      timestamp: t.createdAt.toISOString(),
      color: t.type === "income" ? "#22C55E" : "#EF4444",
      href: "/finance",
    });
  }

  for (const d of recentDistributions) {
    const fmtDist = "$" + d.llcNetProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    activity.push({
      id: `dist-${d.id}`,
      text: `Distribution: ${fmtDist}`,
      detail: `${d.type.replace(/_/g, " ")} — 50/50 split`,
      timestamp: d.createdAt.toISOString(),
      color: "#E8501A",
      href: "/finance/distributions",
    });
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    totalProjects: projects.length, dueThisWeek, monthlyIncome, monthlyExpenses,
    prevMonthIncome, prevMonthExpenses, incomeChange, expenseChange,
    profitMargin, ytdProfitMargin, ytdIncome,
    donationCount, avgDonation, daysUntilDeadline, nextDeadlineName: nextDeadline.name,
    projectCards, activity: activity.slice(0, 10),
    upcomingDeadlines, overdueItems, cashFlowMonths,
  };
}

function formatCurrency(n: number) {
  return (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusLabel(s: string) {
  const m: Record<string, string> = { todo: "To Do", in_progress: "In Progress", review: "Review", done: "Done" };
  return m[s] || s;
}

function statusColor(s: string) {
  const m: Record<string, string> = {
    todo: "bg-[#27272A] text-[#A1A1AA]",
    in_progress: "bg-blue-500/15 text-blue-400",
    review: "bg-amber-500/15 text-amber-400",
    done: "bg-green-500/15 text-green-400",
  };
  return m[s] || "bg-[#27272A] text-[#A1A1AA]";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function Home() {
  let data;
  try {
    data = await getDashboardData();
  } catch (err) {
    console.error("Dashboard data fetch failed:", err);
    // Return a minimal dashboard instead of crashing
    data = {
      totalProjects: 0, dueThisWeek: 0, monthlyIncome: 0, monthlyExpenses: 0,
      prevMonthIncome: 0, prevMonthExpenses: 0, incomeChange: 0, expenseChange: 0,
      profitMargin: 0, ytdProfitMargin: 0, ytdIncome: 0,
      donationCount: 0, avgDonation: 0, daysUntilDeadline: 99, nextDeadlineName: "Unknown",
      projectCards: [], activity: [], upcomingDeadlines: [], overdueItems: [], cashFlowMonths: [],
    };
  }
  const deadlineColor = data.daysUntilDeadline < 15 ? "text-red-400" : data.daysUntilDeadline <= 30 ? "text-amber-400" : "text-green-400";

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">Overview of your projects and finances</p>
        </div>
        <DashboardActions />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="Active Projects"
          value={data.totalProjects}
          accent="text-[#E8501A]"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>}
        />
        <KPICard
          label="Tasks This Week"
          value={data.dueThisWeek}
          accent="text-[#3B82F6]"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
        />
        <KPICard
          label="Monthly Income"
          value={formatCurrency(data.monthlyIncome)}
          accent="text-[#22C55E]"
          valueColor={data.monthlyIncome > 0 ? "text-[#22C55E]" : "text-[#52525B]"}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>}
          trend={data.prevMonthIncome > 0 ? { value: data.incomeChange, label: `${data.incomeChange >= 0 ? "+" : ""}${data.incomeChange.toFixed(1)}% vs last month` } : undefined}
        />
        <KPICard
          label="Monthly Expenses"
          value={formatCurrency(data.monthlyExpenses)}
          accent="text-[#EF4444]"
          valueColor={data.monthlyExpenses > 0 ? "text-[#EF4444]" : "text-[#52525B]"}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" /></svg>}
          trend={data.prevMonthExpenses > 0 ? { value: data.expenseChange, label: `${data.expenseChange >= 0 ? "+" : ""}${data.expenseChange.toFixed(1)}% vs last month` } : undefined}
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <p className="text-xs text-[#52525B]">YTD Donations</p>
          <p className="text-xl font-bold text-[#FAFAFA]">{data.donationCount}</p>
        </div>
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <p className="text-xs text-[#52525B]">Avg Donation</p>
          <p className="text-xl font-bold text-green-400">{data.avgDonation > 0 ? formatCurrency(data.avgDonation) : "—"}</p>
        </div>
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <p className="text-xs text-[#52525B]">Next Tax Deadline</p>
          <p className={`text-xl font-bold ${deadlineColor}`}>{data.daysUntilDeadline}d</p>
          <p className="text-[10px] text-[#52525B] mt-0.5">{data.nextDeadlineName}</p>
        </div>
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <p className="text-xs text-[#52525B]">Profit Margin</p>
          <p className={`text-xl font-bold ${data.monthlyIncome === 0 ? "text-[#52525B]" : data.profitMargin >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
            {data.monthlyIncome === 0 ? "—" : `${data.profitMargin.toFixed(1)}%`}
          </p>
          <p className={`text-[10px] mt-0.5 ${data.ytdProfitMargin >= 0 ? "text-[#22C55E]/70" : "text-[#EF4444]/70"}`}>
            YTD: {data.ytdIncome === 0 ? "—" : `${data.ytdProfitMargin.toFixed(1)}%`}
          </p>
        </div>
      </div>

      {/* Alerts Row: Overdue Tasks + Upcoming Deadlines + Cash Flow */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        {/* Overdue Tasks */}
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <h3 className="text-xs font-semibold text-[#FAFAFA]">Overdue Tasks</h3>
            {data.overdueItems.length > 0 && (
              <span className="ml-auto rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
                {data.overdueItems.length}
              </span>
            )}
          </div>
          {data.overdueItems.length === 0 ? (
            <p className="text-xs text-[#52525B] py-2">All caught up!</p>
          ) : (
            <div className="space-y-2">
              {data.overdueItems.map((task) => (
                <Link
                  key={task.id}
                  href={`/projects/${task.projectId}`}
                  className="flex items-start gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-[#1A1A1E] transition-colors"
                >
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: task.projectColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#FAFAFA] truncate">{task.title}</p>
                    <p className="text-[10px] text-[#52525B]">{task.projectName}</p>
                  </div>
                  <span className="text-[10px] text-red-400 shrink-0">{task.daysOverdue}d late</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M2.25 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h15a2.25 2.25 0 0 1 2.25 2.25v11.25m-19.5 0A2.25 2.25 0 0 0 4.5 21h15a2.25 2.25 0 0 0 2.25-2.25m-19.5 0v-2.25" />
            </svg>
            <h3 className="text-xs font-semibold text-[#FAFAFA]">Upcoming Deadlines</h3>
          </div>
          {data.upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-[#52525B] py-2">No upcoming deadlines</p>
          ) : (
            <div className="space-y-2.5">
              {data.upcomingDeadlines.map((dl, i) => {
                const dlColor = dl.daysAway < 15 ? "text-red-400" : dl.daysAway <= 30 ? "text-amber-400" : "text-green-400";
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#FAFAFA]">{dl.name}</p>
                      <p className="text-[10px] text-[#52525B]">
                        {new Date(dl.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${dlColor}`}>{dl.daysAway}d</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cash Flow Trend */}
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-4 w-4 text-[#E8501A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            <h3 className="text-xs font-semibold text-[#FAFAFA]">Cash Flow (6 months)</h3>
          </div>
          {(() => {
            const months = data.cashFlowMonths;
            const maxVal = Math.max(...months.map((m) => Math.max(m.income, m.expenses)), 1);
            return (
              <div className="space-y-2">
                {months.map((m) => (
                  <div key={m.month} className="flex items-center gap-2">
                    <span className="w-8 text-[10px] text-[#52525B] tabular-nums">{m.month}</span>
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="h-1.5 rounded-full bg-[#1A1A1E]">
                        <div className="h-full rounded-full bg-[#22C55E] transition-[width] duration-300" style={{ width: `${(m.income / maxVal) * 100}%` }} />
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1A1A1E]">
                        <div className="h-full rounded-full bg-[#EF4444] transition-[width] duration-300" style={{ width: `${(m.expenses / maxVal) * 100}%` }} />
                      </div>
                    </div>
                    <span className={`w-16 text-right text-[10px] font-medium tabular-nums ${m.net >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                      {m.net >= 0 ? "+" : ""}{formatCurrency(m.net)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-1 text-[10px] text-[#52525B]">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-[#22C55E]" />Income</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-[#EF4444]" />Expenses</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Projects Grid */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Active Projects</h2>
            <Link href="/projects" className="text-xs text-[#A1A1AA] hover:text-[#E8501A] transition-[color]">View all</Link>
          </div>

          {data.projectCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#27272A] py-16 flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1E] mb-3 text-[#52525B]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <p className="text-sm text-[#A1A1AA]">No projects yet</p>
              <p className="text-xs text-[#52525B]">Create your first project to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.projectCards.map((project, index) => (
                <Link key={project.id} href={`/projects/${project.id}`}
                  className="group rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 hover:border-[#3F3F46] transition-[border-color] duration-150 animate-stagger-in"
                  style={{ animationDelay: `${index * 40}ms` }}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-[#FAFAFA] group-hover:text-[#E8501A] transition-colors truncate">{project.name}</h3>
                      {project.description && <p className="text-xs text-[#A1A1AA] mt-1 line-clamp-2">{project.description}</p>}
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-[#52525B]">{project.progress}% complete</span>
                      <span className="text-[11px] text-[#52525B]">{project.totalTasks} tasks</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#1A1A1E]">
                      <div className="h-full rounded-full bg-[#E8501A] transition-[width] duration-300" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {project.statusCounts.todo > 0 && <span className="flex items-center gap-1 text-[#A1A1AA]"><span className="h-1.5 w-1.5 rounded-full bg-[#52525B]" />{project.statusCounts.todo}</span>}
                    {project.statusCounts.in_progress > 0 && <span className="flex items-center gap-1 text-blue-400"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />{project.statusCounts.in_progress}</span>}
                    {project.statusCounts.review > 0 && <span className="flex items-center gap-1 text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{project.statusCounts.review}</span>}
                    {project.statusCounts.done > 0 && <span className="flex items-center gap-1 text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />{project.statusCounts.done}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className="text-sm font-semibold text-[#FAFAFA] mb-4">Recent Activity</h2>
          <div className="rounded-xl bg-[#0F0F11] border border-[#27272A]">
            {data.activity.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs text-[#52525B]">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-[#27272A]">
                {data.activity.map((item, index) => {
                  const inner = (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#FAFAFA] truncate">{item.text}</p>
                        <p className="text-[10px] text-[#52525B] mt-0.5">{item.detail}</p>
                      </div>
                      <span className="text-[10px] text-[#52525B] shrink-0">{timeAgo(item.timestamp)}</span>
                    </div>
                  );
                  return item.href ? (
                    <Link key={item.id} href={item.href} className="block px-4 py-3 hover:bg-[#1A1A1E] transition-[background-color] animate-stagger-in" style={{ animationDelay: `${index * 40}ms` }}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={item.id} className="px-4 py-3 hover:bg-[#1A1A1E] transition-[background-color] animate-stagger-in" style={{ animationDelay: `${index * 40}ms` }}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="h-4 w-4 text-[#E8501A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Audit Trail</h2>
        </div>
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A]">
          <AuditLogViewer limit={10} />
        </div>
      </div>
    </div>
  );
}
