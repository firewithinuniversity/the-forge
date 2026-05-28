import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const currentYear = searchParams.get("year")
      ? parseInt(searchParams.get("year")!, 10)
      : new Date().getFullYear();
    const previousYear = currentYear - 1;

    const startOfPrevYear = new Date(previousYear, 0, 1);
    const endOfCurrentYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startOfPrevYear, lte: endOfCurrentYear },
      },
      select: { type: true, amount: true, date: true },
    });

    // Bucket transactions by year-month
    const buckets: Record<string, { income: number; expenses: number }> = {};
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!buckets[key]) buckets[key] = { income: 0, expenses: 0 };
      if (t.type === "income") buckets[key].income += t.amount;
      else buckets[key].expenses += t.amount;
    }

    const months = MONTH_LABELS.map((label, i) => {
      const cur = buckets[`${currentYear}-${i}`] || { income: 0, expenses: 0 };
      const prev = buckets[`${previousYear}-${i}`] || { income: 0, expenses: 0 };
      return {
        month: label,
        currentIncome: Math.round(cur.income * 100) / 100,
        currentExpenses: Math.round(cur.expenses * 100) / 100,
        previousIncome: Math.round(prev.income * 100) / 100,
        previousExpenses: Math.round(prev.expenses * 100) / 100,
      };
    });

    // Compute totals
    let currentIncome = 0, currentExpenses = 0, previousIncome = 0, previousExpenses = 0;
    for (const m of months) {
      currentIncome += m.currentIncome;
      currentExpenses += m.currentExpenses;
      previousIncome += m.previousIncome;
      previousExpenses += m.previousExpenses;
    }

    const currentNet = currentIncome - currentExpenses;
    const previousNet = previousIncome - previousExpenses;

    function pctChange(current: number, previous: number): number {
      if (previous === 0) return current === 0 ? 0 : 100;
      return Math.round(((current - previous) / previous) * 10000) / 100;
    }

    return NextResponse.json({
      currentYear,
      previousYear,
      months,
      totals: {
        currentIncome: Math.round(currentIncome * 100) / 100,
        currentExpenses: Math.round(currentExpenses * 100) / 100,
        currentNet: Math.round(currentNet * 100) / 100,
        previousIncome: Math.round(previousIncome * 100) / 100,
        previousExpenses: Math.round(previousExpenses * 100) / 100,
        previousNet: Math.round(previousNet * 100) / 100,
        incomeChange: pctChange(currentIncome, previousIncome),
        expenseChange: pctChange(currentExpenses, previousExpenses),
        netChange: pctChange(currentNet, previousNet),
      },
    });
  } catch (error) {
    console.error("GET /api/finance/ytd-comparison error:", error);
    return NextResponse.json(
      { error: "Failed to fetch YTD comparison data" },
      { status: 500 }
    );
  }
}
