import { prisma } from "@/lib/prisma";
import RecurringClient from "./RecurringClient";

export const revalidate = 300;

async function getData() {
  const expenses = await prisma.recurringExpense.findMany({ orderBy: { service: "asc" } });
  const categories = await prisma.category.findMany({
    where: { type: "expense" },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return {
    expenses: expenses.map((e) => ({
      ...e,
      nextDueDate: e.nextDueDate?.toISOString() || null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    categories: categories.map((c) => c.name),
  };
}

export default async function RecurringPage() {
  const data = await getData();
  return <RecurringClient expenses={data.expenses} categories={data.categories} />;
}
