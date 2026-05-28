import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dueIncomes = await prisma.recurringIncome.findMany({
      where: {
        active: true,
        nextDueDate: { lte: today },
      },
    });

    if (dueIncomes.length === 0) {
      return NextResponse.json({ count: 0, message: "No income due" });
    }

    let created = 0;
    let skipped = 0;

    for (const income of dueIncomes) {
      const dueDate = income.nextDueDate!;
      const description = `${income.source} (auto)`;

      // Idempotency check: skip if a transaction already exists for this income on this date
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
          type: "income",
          amount: income.amount,
          description,
          category: income.category,
          date: dueDate,
          recurring: true,
        },
      });

      // Advance nextDueDate based on frequency
      const next = new Date(dueDate);
      if (income.frequency === "weekly") {
        next.setDate(next.getDate() + 7);
      } else if (income.frequency === "annual") {
        next.setFullYear(next.getFullYear() + 1);
      } else {
        // monthly (default)
        next.setMonth(next.getMonth() + 1);
      }

      await prisma.recurringIncome.update({
        where: { id: income.id },
        data: { nextDueDate: next },
      });

      created++;
    }

    // Create a notification only if transactions were actually created
    if (created > 0) {
      await prisma.notification.create({
        data: {
          type: "auto_transaction",
          title: "Auto-created income",
          message: `Created ${created} recurring income transaction(s)${skipped > 0 ? `, skipped ${skipped} duplicate(s)` : ""}`,
          link: "/finance/recurring-income",
        },
      });
    }

    return NextResponse.json({ created, skipped, message: `Created ${created} transaction(s), skipped ${skipped} duplicate(s)` });
  } catch (error) {
    console.error("POST /api/recurring-income/auto-create error:", error);
    return NextResponse.json({ error: "Failed to auto-create income transactions" }, { status: 500 });
  }
}
