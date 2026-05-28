import { prisma } from "@/lib/prisma";
import DistributionsClient from "./DistributionsClient";

export const revalidate = 300;

async function getData() {
  const [distributions, taxConfig] = await Promise.all([
    prisma.distribution.findMany({ orderBy: { date: "desc" } }),
    prisma.taxConfig.findFirst(),
  ]);

  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: yearStart, lte: yearEnd } },
  });

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const config = taxConfig || {
    partner1Name: "Brett Breunig",
    partner2Name: "Jude Begay",
    ownershipSplit: 0.5,
    taxReserveRate: 0.3,
    federalTaxRate: 0.12,
    selfEmploymentRate: 0.153,
    seDeduction: 0.5,
    stateTaxRate: 0.0465,
    qbiDeductionRate: 0.2,
  };

  return {
    distributions: distributions.map((d) => ({
      ...d,
      date: d.date.toISOString(),
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    partner1Name: config.partner1Name,
    partner2Name: config.partner2Name,
    ownershipSplit: config.ownershipSplit,
    netProfit,
    taxReserveRate: config.taxReserveRate,
    federalTaxRate: config.federalTaxRate,
    selfEmploymentRate: config.selfEmploymentRate,
    seDeduction: config.seDeduction,
    stateTaxRate: config.stateTaxRate,
    qbiDeductionRate: config.qbiDeductionRate,
  };
}

export default async function DistributionsPage() {
  const data = await getData();
  return <DistributionsClient {...data} />;
}
