import { prisma } from "@/lib/prisma";
import RecurringIncomeClient from "./RecurringIncomeClient";

export const dynamic = "force-dynamic";

async function getData() {
  const incomes = await prisma.recurringIncome.findMany({ orderBy: { source: "asc" } });
  const categories = await prisma.category.findMany({
    where: { type: { in: ["income", "both"] } },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return {
    incomes: incomes.map((e) => ({
      ...e,
      nextDueDate: e.nextDueDate?.toISOString() || null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    categories: categories.map((c) => c.name),
  };
}

export default async function RecurringIncomePage() {
  let data;
  try {
    data = await getData();
  } catch (err) {
    console.error("Recurring income page error:", err);
    data = { incomes: [], categories: [] };
  }
  return <RecurringIncomeClient incomes={data.incomes} categories={data.categories} />;
}
