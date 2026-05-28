import { prisma } from "@/lib/prisma";
import FinanceClient from "./FinanceClient";

function roundCents(n: number): number { return Math.round(n * 100) / 100; }

export const dynamic = "force-dynamic";

async function getFinanceData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfChart = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  const [transactions, categories, projects, monthlyTx, yearlyTx, chartTx] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { date: "desc" },
      take: 200,
      include: { project: { select: { id: true, name: true, color: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.transaction.findMany({ where: { date: { gte: startOfMonth, lte: endOfMonth } }, select: { type: true, amount: true, category: true } }),
    prisma.transaction.findMany({ where: { date: { gte: startOfYear } }, select: { type: true, amount: true } }),
    prisma.transaction.findMany({ where: { date: { gte: startOfChart } }, select: { type: true, amount: true, date: true, category: true } }),
  ]);

  let monthlyIncome = 0, monthlyExpenses = 0;
  for (const t of monthlyTx) { if (t.type === "income") monthlyIncome += t.amount; else monthlyExpenses += t.amount; }
  monthlyIncome = roundCents(monthlyIncome);
  monthlyExpenses = roundCents(monthlyExpenses);

  let ytdIncome = 0, ytdExpenses = 0;
  for (const t of yearlyTx) { if (t.type === "income") ytdIncome += t.amount; else ytdExpenses += t.amount; }
  ytdIncome = roundCents(ytdIncome);
  ytdExpenses = roundCents(ytdExpenses);

  const monthlyChart: { month: string; income: number; expenses: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });
    let inc = 0, exp = 0;
    for (const t of chartTx) {
      const td = new Date(t.date);
      const tk = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, "0")}`;
      if (tk === key) { if (t.type === "income") inc += t.amount; else exp += t.amount; }
    }
    monthlyChart.push({ month: label, income: roundCents(inc), expenses: roundCents(exp) });
  }

  const catBreakdown: Record<string, number> = {};
  for (const t of monthlyTx) { if (t.type === "expense") catBreakdown[t.category] = (catBreakdown[t.category] || 0) + t.amount; }

  // Income by category (across all chart months, not just current month)
  const incomeCatBreakdown: Record<string, number> = {};
  for (const t of chartTx) {
    if (t.type === "income") {
      incomeCatBreakdown[t.category] = (incomeCatBreakdown[t.category] || 0) + t.amount;
    }
  }

  // Map income categories to colors from the category table
  const categoryColorMap: Record<string, string> = {};
  for (const c of categories) { categoryColorMap[c.name] = c.color; }

  return {
    transactions: transactions.map((t) => ({
      ...t,
      date: t.date.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    categories,
    projects,
    summary: {
      monthlyIncome,
      monthlyExpenses,
      monthlyNet: roundCents(monthlyIncome - monthlyExpenses),
      ytdNet: roundCents(ytdIncome - ytdExpenses),
    },
    monthlyChart,
    categoryBreakdown: Object.entries(catBreakdown).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    incomeCategoryBreakdown: Object.entries(incomeCatBreakdown)
      .map(([category, amount]) => ({ category, amount, color: categoryColorMap[category] || "" }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export default async function FinancePage() {
  const data = await getFinanceData();
  return <FinanceClient data={data} />;
}
