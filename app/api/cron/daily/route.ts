import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // 1. Auto-create recurring expense transactions
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dueExpenses = await prisma.recurringExpense.findMany({
      where: { active: true, nextDueDate: { lte: today } },
    });

    let expCreated = 0;
    for (const expense of dueExpenses) {
      const dueDate = expense.nextDueDate!;
      const description = `${expense.service} (auto)`;

      const startOfDay = new Date(dueDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dueDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await prisma.transaction.findFirst({
        where: { description, date: { gte: startOfDay, lte: endOfDay } },
      });
      if (existing) continue;

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

      const next = new Date(dueDate);
      if (expense.billingCycle === "annual") next.setFullYear(next.getFullYear() + 1);
      else next.setMonth(next.getMonth() + 1);
      await prisma.recurringExpense.update({ where: { id: expense.id }, data: { nextDueDate: next } });
      expCreated++;
    }

    if (expCreated > 0) {
      await prisma.notification.create({
        data: {
          type: "auto_transaction",
          title: "Auto-created transaction",
          message: `Created ${expCreated} recurring expense transaction(s)`,
          link: "/finance/recurring",
        },
      });
    }
    results.recurringExpenses = { created: expCreated };
  } catch (e) {
    results.recurringExpenses = { error: String(e) };
  }

  // 2. Auto-create recurring income transactions
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dueIncomes = await prisma.recurringIncome.findMany({
      where: { active: true, nextDueDate: { lte: today } },
    });

    let incCreated = 0;
    for (const income of dueIncomes) {
      const dueDate = income.nextDueDate!;
      const description = `${income.source} (auto)`;

      const startOfDay = new Date(dueDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dueDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await prisma.transaction.findFirst({
        where: { description, date: { gte: startOfDay, lte: endOfDay } },
      });
      if (existing) continue;

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

      const next = new Date(dueDate);
      if (income.frequency === "weekly") next.setDate(next.getDate() + 7);
      else if (income.frequency === "annual") next.setFullYear(next.getFullYear() + 1);
      else next.setMonth(next.getMonth() + 1);
      await prisma.recurringIncome.update({ where: { id: income.id }, data: { nextDueDate: next } });
      incCreated++;
    }

    if (incCreated > 0) {
      await prisma.notification.create({
        data: {
          type: "auto_transaction",
          title: "Auto-created income",
          message: `Created ${incCreated} recurring income transaction(s)`,
          link: "/finance/recurring-income",
        },
      });
    }
    results.recurringIncome = { created: incCreated };
  } catch (e) {
    results.recurringIncome = { error: String(e) };
  }

  // 3. Fire due reminders
  try {
    const now = new Date();
    const dueReminders = await prisma.reminder.findMany({
      where: { fired: false, remindAt: { lte: now } },
    });

    for (const r of dueReminders) {
      await prisma.notification.create({
        data: {
          type: "reminder",
          title: `Reminder: ${r.title}`,
          message: r.message || `Reminder: ${r.title}`,
          link: r.link,
        },
      });
    }

    if (dueReminders.length > 0) {
      await prisma.reminder.updateMany({
        where: { id: { in: dueReminders.map((r) => r.id) } },
        data: { fired: true },
      });
    }
    results.reminders = { fired: dueReminders.length };
  } catch (e) {
    results.reminders = { error: String(e) };
  }

  // 4. Check system notifications (overdue tasks, burn rate, tax payments)
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Burn rate check
    const expenses = await prisma.transaction.findMany({
      where: { type: "expense", date: { gte: monthStart, lte: monthEnd } },
      select: { amount: true },
    });
    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
    const config = await prisma.taxConfig.findFirst();
    const threshold = (config as Record<string, unknown>)?.burnRateThreshold as number | undefined;
    if (threshold && totalExpenses > threshold) {
      const existing = await prisma.notification.findFirst({
        where: { type: "burn_rate", title: { startsWith: `Burn rate alert` } },
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            type: "burn_rate",
            title: `Burn rate alert — ${monthLabel}`,
            message: `Monthly expenses ($${totalExpenses.toFixed(2)}) exceed threshold ($${threshold.toFixed(2)})`,
            link: "/finance",
          },
        });
      }
    }

    // Tax payment due within 14 days
    const fourteenDaysFromNow = new Date(now);
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
    const dueTaxPayments = await prisma.taxPayment.findMany({
      where: { paid: false, dueDate: { lte: fourteenDaysFromNow, gte: now } },
    });
    for (const tp of dueTaxPayments) {
      const daysUntil = Math.ceil((tp.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const tag = `tax-due-${tp.id}`;
      const existing = await prisma.notification.findFirst({ where: { type: "deadline", title: { startsWith: "Tax Payment Due" } } });
      if (!existing) {
        await prisma.notification.create({
          data: {
            type: "deadline",
            title: `Tax Payment Due`,
            message: `Q${tp.quarter} ${tp.year} ${tp.type.replace("_", " ")} ($${tp.amount.toFixed(2)}) is due in ${daysUntil} days.`,
            link: "/finance/tax",
          },
        });
      }
    }

    results.notifications = { checked: true };
  } catch (e) {
    results.notifications = { error: String(e) };
  }

  return NextResponse.json({ ok: true, results });
}
