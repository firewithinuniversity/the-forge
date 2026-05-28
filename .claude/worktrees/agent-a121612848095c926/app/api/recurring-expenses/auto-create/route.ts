import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dueExpenses = await prisma.recurringExpense.findMany({
      where: {
        active: true,
        nextDueDate: { lte: today },
      },
    });

    if (dueExpenses.length === 0) {
      return NextResponse.json({ count: 0, message: "No expenses due" });
    }

    let created = 0;
    let skipped = 0;

    for (const expense of dueExpenses) {
      const dueDate = expense.nextDueDate!;
      const description = `${expense.service} (auto)`;

      // Idempotency check: skip if a transaction already exists for this expense on this date
      const startOfDay = new Date(dueDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dueDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await prisma.transaction.findFirst({
        where: {
          description,
          date: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Create the transaction
      await prisma.transaction.create({
        data: {
          type: "expense",
          amount: expense.billingCycle === "annual" ? (expense.annualCost || expense.monthlyCost * 12) : expense.monthlyCost,
          description,
          category: expense.category,
          date: dueDate,
          recurring: true,
        },
      });

      // Advance nextDueDate by 1 month or 1 year
      const next = new Date(dueDate);
      if (expense.billingCycle === "annual") {
        next.setFullYear(next.getFullYear() + 1);
      } else {
        next.setMonth(next.getMonth() + 1);
      }

      await prisma.recurringExpense.update({
        where: { id: expense.id },
        data: { nextDueDate: next },
      });

      created++;
    }

    // Create a notification only if transactions were actually created
    if (created > 0) {
      await prisma.notification.create({
        data: {
          type: "auto_transaction",
          title: "Auto-created transaction",
          message: `Created ${created} recurring expense transaction(s)${skipped > 0 ? `, skipped ${skipped} duplicate(s)` : ""}`,
          link: "/finance/recurring",
        },
      });
    }

    return NextResponse.json({ created, skipped, message: `Created ${created} transaction(s), skipped ${skipped} duplicate(s)` });
  } catch (error) {
    console.error("POST /api/recurring-expenses/auto-create error:", error);
    return NextResponse.json({ error: "Failed to auto-create transactions" }, { status: 500 });
  }
}
