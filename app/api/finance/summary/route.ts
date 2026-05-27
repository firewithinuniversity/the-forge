import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [monthlyTransactions, yearlyTransactions, last12Months] = await Promise.all([
      prisma.transaction.findMany({
        where: { date: { gte: startOfMonth, lte: endOfMonth } },
        select: { type: true, amount: true },
      }),
      prisma.transaction.findMany({
        where: { date: { gte: startOfYear } },
        select: { type: true, amount: true },
      }),
      prisma.transaction.findMany({
        where: { date: { gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } },
        select: { type: true, amount: true, date: true, category: true },
      }),
    ]);

    let monthlyIncome = 0, monthlyExpenses = 0;
    for (const t of monthlyTransactions) {
      if (t.type === "income") monthlyIncome += t.amount;
      else monthlyExpenses += t.amount;
    }

    let ytdIncome = 0, ytdExpenses = 0;
    for (const t of yearlyTransactions) {
      if (t.type === "income") ytdIncome += t.amount;
      else ytdExpenses += t.amount;
    }

    // Monthly chart data (last 12 months)
    const monthlyChart: { month: string; income: number; expenses: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      let income = 0, expenses = 0;
      for (const t of last12Months) {
        const td = new Date(t.date);
        const tk = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, "0")}`;
        if (tk === key) {
          if (t.type === "income") income += t.amount;
          else expenses += t.amount;
        }
      }
      monthlyChart.push({ month: label, income, expenses });
    }

    // Category breakdown
    const categoryBreakdown: Record<string, { category: string; amount: number; type: string }> = {};
    for (const t of monthlyTransactions as { type: string; amount: number; category?: string }[]) {
      const cat = (t as { category?: string }).category || "Other";
      // Need to get category from the full transactions
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { category: cat, amount: 0, type: t.type };
      categoryBreakdown[cat].amount += t.amount;
    }

    // Re-fetch monthly with category for breakdown
    const monthlyWithCategory = await prisma.transaction.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      select: { type: true, amount: true, category: true },
    });

    const catBreakdown: Record<string, number> = {};
    for (const t of monthlyWithCategory) {
      if (t.type === "expense") {
        catBreakdown[t.category] = (catBreakdown[t.category] || 0) + t.amount;
      }
    }

    return NextResponse.json({
      monthlyIncome,
      monthlyExpenses,
      monthlyNet: monthlyIncome - monthlyExpenses,
      ytdNet: ytdIncome - ytdExpenses,
      monthlyChart,
      categoryBreakdown: Object.entries(catBreakdown)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
    });
  } catch (error) {
    console.error("GET /api/finance/summary error:", error);
    return NextResponse.json({ error: "Failed to fetch finance summary" }, { status: 500 });
  }
}
