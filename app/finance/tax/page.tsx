import { prisma } from "@/lib/prisma";
import TaxCenterClient from "./TaxCenterClient";

export const dynamic = "force-dynamic";

async function getTaxData() {
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const [taxConfig, transactions, taxPayments, distributions] = await Promise.all([
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
    id: "", federalTaxRate: 0.12, selfEmploymentRate: 0.153, seDeduction: 0.5,
    stateTaxRate: 0.0465, stateName: "Wisconsin", ownershipSplit: 0.5,
    qbiDeductionRate: 0.2, taxReserveRate: 0.3,
    partner1Name: "Brett Breunig", partner2Name: "Jude Begay",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const quarterlyIncome = [0, 0, 0, 0];
  const quarterlyExpenses = [0, 0, 0, 0];
  for (const t of transactions) {
    const q = Math.floor(new Date(t.date).getUTCMonth() / 3);
    if (t.type === "income") quarterlyIncome[q] += t.amount;
    else quarterlyExpenses[q] += t.amount;
  }

  return {
    config: { ...config, createdAt: config.createdAt.toString(), updatedAt: config.updatedAt.toString() },
    year,
    totalIncome,
    totalExpenses,
    quarterlyIncome,
    quarterlyExpenses,
    taxPayments: taxPayments.map((tp) => ({
      ...tp,
      dueDate: tp.dueDate.toISOString(),
      paidDate: tp.paidDate?.toISOString() || null,
      createdAt: tp.createdAt.toISOString(),
      updatedAt: tp.updatedAt.toISOString(),
    })),
    totalDistributed: distributions.reduce((s, d) => s + d.partner1Share + d.partner2Share, 0),
  };
}

export default async function TaxCenterPage() {
  let data;
  try {
    data = await getTaxData();
  } catch (err) {
    console.error("Tax center page error:", err);
    data = {
      config: {
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      year: new Date().getFullYear(),
      totalIncome: 0,
      totalExpenses: 0,
      quarterlyIncome: [0, 0, 0, 0],
      quarterlyExpenses: [0, 0, 0, 0],
      taxPayments: [],
      totalDistributed: 0,
    };
  }
  return <TaxCenterClient {...data} />;
}
