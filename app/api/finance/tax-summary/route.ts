import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const [taxConfig, transactions, taxPayments, distributions] =
      await Promise.all([
        prisma.taxConfig.findFirst(),
        prisma.transaction.findMany({
          where: { date: { gte: yearStart, lte: yearEnd } },
          orderBy: { date: "asc" },
        }),
        prisma.taxPayment.findMany({
          where: { year },
          orderBy: [{ quarter: "asc" }, { type: "asc" }],
        }),
        prisma.distribution.findMany({
          where: { date: { gte: yearStart, lte: yearEnd } },
          orderBy: { date: "asc" },
        }),
      ]);

    const config = taxConfig || {
      id: "",
      federalTaxRate: 0.12,
      selfEmploymentRate: 0.153,
      seDeduction: 0.5,
      stateTaxRate: 0.0465,
      stateName: "Wisconsin",
      ownershipSplit: 0.5,
      qbiDeductionRate: 0.2,
      taxReserveRate: 0.3,
      partner1Name: "Brett Breunig",
      partner2Name: "Jude Begay",
    };

    // ── Income breakdown by category ──────────────────────────────────
    const incomeTransactions = transactions.filter((t) => t.type === "income");
    const expenseTransactions = transactions.filter((t) => t.type === "expense");

    const totalIncome = incomeTransactions.reduce((s, t) => s + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((s, t) => s + t.amount, 0);

    const incomeByCategory: Record<string, number> = {};
    for (const t of incomeTransactions) {
      incomeByCategory[t.category] =
        (incomeByCategory[t.category] || 0) + t.amount;
    }

    // ── Expense breakdown by category with deductible split ───────────
    const expenseByCategory: Record<
      string,
      { total: number; deductible: number; nonDeductible: number }
    > = {};
    let totalDeductible = 0;
    let totalNonDeductible = 0;

    for (const t of expenseTransactions) {
      if (!expenseByCategory[t.category]) {
        expenseByCategory[t.category] = {
          total: 0,
          deductible: 0,
          nonDeductible: 0,
        };
      }
      expenseByCategory[t.category].total += t.amount;

      if (t.taxDeductible === "yes") {
        expenseByCategory[t.category].deductible += t.amount;
        totalDeductible += t.amount;
      } else if (t.taxDeductible === "partial") {
        // Count 50% as deductible for partial
        const deductiblePortion = t.amount * 0.5;
        expenseByCategory[t.category].deductible += deductiblePortion;
        expenseByCategory[t.category].nonDeductible +=
          t.amount - deductiblePortion;
        totalDeductible += deductiblePortion;
        totalNonDeductible += t.amount - deductiblePortion;
      } else {
        expenseByCategory[t.category].nonDeductible += t.amount;
        totalNonDeductible += t.amount;
      }
    }

    // ── Tax calculations per partner ──────────────────────────────────
    const netProfit = totalIncome - totalExpenses;
    const split = config.ownershipSplit;

    function calculatePartnerTax(partnerShare: number) {
      const seTax =
        partnerShare > 0 ? partnerShare * config.selfEmploymentRate : 0;
      const seDeductionAmt = seTax * config.seDeduction;
      const qbiDeduction =
        partnerShare > 0 ? partnerShare * config.qbiDeductionRate : 0;
      const taxableIncome = Math.max(
        0,
        partnerShare - qbiDeduction - seDeductionAmt
      );
      const federalTax = taxableIncome * config.federalTaxRate;
      const stateTax = taxableIncome * config.stateTaxRate;

      return {
        grossShare: partnerShare,
        seTax,
        seDeductionAmt,
        qbiDeduction,
        taxableIncome,
        federalTax,
        stateTax,
        totalTax: federalTax + seTax + stateTax,
      };
    }

    const partner1Share = netProfit * split;
    const partner2Share = netProfit * (1 - split);
    const partner1Tax = calculatePartnerTax(partner1Share);
    const partner2Tax = calculatePartnerTax(partner2Share);

    // ── Tax payments made ─────────────────────────────────────────────
    const totalPaid = taxPayments
      .filter((tp) => tp.paid)
      .reduce((s, tp) => s + tp.amount, 0);

    // Split payments by type for reporting
    const paymentsByType: Record<string, { paid: number; total: number }> = {};
    for (const tp of taxPayments) {
      if (!paymentsByType[tp.type]) {
        paymentsByType[tp.type] = { paid: 0, total: 0 };
      }
      paymentsByType[tp.type].total += tp.amount;
      if (tp.paid) paymentsByType[tp.type].paid += tp.amount;
    }

    // ── Distributions ─────────────────────────────────────────────────
    const totalDistributed = distributions.reduce(
      (s, d) => s + d.partner1Share + d.partner2Share,
      0
    );
    const partner1Distributed = distributions.reduce(
      (s, d) => s + d.partner1Share,
      0
    );
    const partner2Distributed = distributions.reduce(
      (s, d) => s + d.partner2Share,
      0
    );

    // Total estimated liability (both partners combined)
    const totalEstimatedLiability = partner1Tax.totalTax + partner2Tax.totalTax;
    const remainingOwed = Math.max(0, totalEstimatedLiability - totalPaid);

    return NextResponse.json({
      year,
      config: {
        partner1Name: config.partner1Name,
        partner2Name: config.partner2Name,
        ownershipSplit: config.ownershipSplit,
        federalTaxRate: config.federalTaxRate,
        selfEmploymentRate: config.selfEmploymentRate,
        seDeduction: config.seDeduction,
        stateTaxRate: config.stateTaxRate,
        stateName: config.stateName,
        qbiDeductionRate: config.qbiDeductionRate,
      },
      income: {
        total: totalIncome,
        byCategory: Object.entries(incomeByCategory)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
      },
      expenses: {
        total: totalExpenses,
        totalDeductible,
        totalNonDeductible,
        byCategory: Object.entries(expenseByCategory)
          .map(([category, data]) => ({ category, ...data }))
          .sort((a, b) => b.total - a.total),
      },
      netProfit,
      partner1: {
        name: config.partner1Name,
        ...partner1Tax,
        distributed: partner1Distributed,
        remainingOwed: Math.max(
          0,
          partner1Tax.totalTax - totalPaid * split
        ),
      },
      partner2: {
        name: config.partner2Name,
        ...partner2Tax,
        distributed: partner2Distributed,
        remainingOwed: Math.max(
          0,
          partner2Tax.totalTax - totalPaid * (1 - split)
        ),
      },
      payments: {
        totalPaid,
        totalEstimatedLiability,
        remainingOwed,
        byType: Object.entries(paymentsByType).map(([type, data]) => ({
          type,
          ...data,
        })),
        details: taxPayments.map((tp) => ({
          id: tp.id,
          quarter: tp.quarter,
          type: tp.type,
          amount: tp.amount,
          paid: tp.paid,
          paidDate: tp.paidDate?.toISOString() || null,
          dueDate: tp.dueDate.toISOString(),
        })),
      },
      distributions: {
        total: totalDistributed,
        partner1Total: partner1Distributed,
        partner2Total: partner2Distributed,
        count: distributions.length,
      },
    });
  } catch (error) {
    console.error("GET /api/finance/tax-summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tax summary" },
      { status: 500 }
    );
  }
}
