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

    let count = 0;

    for (const expense of dueExpenses) {
      const dueDate = expense.nextDueDate!;

      // Create the transaction
      await prisma.transaction.create({
        data: {
          type: "expense",
          amount: expense.monthlyCost,
          description: `${expense.service} (auto)`,
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

      count++;
    }

    // Create a notification
    await prisma.notification.create({
      data: {
        type: "auto_transaction",
        title: "Auto-created transaction",
        message: `Created ${count} recurring expense transaction(s)`,
        link: "/finance/recurring",
      },
    });

    return NextResponse.json({ count, message: `Created ${count} transaction(s)` });
  } catch (error) {
    console.error("POST /api/recurring-expenses/auto-create error:", error);
    return NextResponse.json({ error: "Failed to auto-create transactions" }, { status: 500 });
  }
}
