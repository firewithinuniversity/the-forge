import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    let created = 0;

    // ── Burn Rate Alert ──────────────────────────────────────────────────
    const config = await prisma.taxConfig.findFirst();
    if (config) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const expenses = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: "expense",
          date: { gte: monthStart, lte: monthEnd },
        },
      });

      const totalExpenses = expenses._sum.amount || 0;

      if (totalExpenses >= config.burnRateThreshold) {
        // Only create if no unread burn_rate notification exists for this month
        const monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const existingBurnRate = await prisma.notification.findFirst({
          where: {
            type: "burn_rate",
            read: false,
            message: { contains: monthLabel },
          },
        });

        if (!existingBurnRate) {
          await prisma.notification.create({
            data: {
              type: "burn_rate",
              title: "Burn Rate Alert",
              message: `Monthly expenses for ${monthLabel} have reached $${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — exceeding your $${config.burnRateThreshold.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} threshold.`,
              link: "/finance",
            },
          });
          created++;
        }
      }
    }

    // ── Overdue Tasks ────────────────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: today },
        status: { not: "done" },
      },
      include: { project: { select: { id: true, name: true } } },
    });

    for (const task of overdueTasks) {
      const existingOverdue = await prisma.notification.findFirst({
        where: {
          type: "overdue",
          read: false,
          message: { contains: task.id },
        },
      });

      if (!existingOverdue) {
        await prisma.notification.create({
          data: {
            type: "overdue",
            title: "Overdue Task",
            message: `"${task.title}" in ${task.project.name} is past due. [task:${task.id}]`,
            link: `/projects/${task.projectId}`,
          },
        });
        created++;
      }
    }

    // ── Upcoming Phase Deadlines (within 7 days) ─────────────────────────
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingPhases = await prisma.phase.findMany({
      where: {
        status: "active",
        endDate: { gte: today, lte: sevenDaysFromNow },
      },
      include: { project: { select: { id: true, name: true } } },
    });

    for (const phase of upcomingPhases) {
      const existingDeadline = await prisma.notification.findFirst({
        where: {
          type: "deadline",
          read: false,
          message: { contains: phase.id },
        },
      });

      if (!existingDeadline) {
        const daysLeft = Math.ceil(
          (phase.endDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        await prisma.notification.create({
          data: {
            type: "deadline",
            title: "Phase Deadline Approaching",
            message: `"${phase.name}" in ${phase.project.name} ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. [phase:${phase.id}]`,
            link: `/projects/${phase.projectId}`,
          },
        });
        created++;
      }
    }

    // ── Tax Payment Deadlines (within 14 days) ──────────────────────────
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
    fourteenDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingTaxPayments = await prisma.taxPayment.findMany({
      where: {
        paid: false,
        dueDate: { gte: today, lte: fourteenDaysFromNow },
      },
    });

    for (const payment of upcomingTaxPayments) {
      const existingTax = await prisma.notification.findFirst({
        where: {
          type: "deadline",
          read: false,
          message: { contains: payment.id },
        },
      });

      if (!existingTax) {
        const daysLeft = Math.ceil(
          (payment.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        await prisma.notification.create({
          data: {
            type: "deadline",
            title: "Tax Payment Due",
            message: `Q${payment.quarter} ${payment.year} ${payment.type} tax payment ($${payment.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) is due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. [tax:${payment.id}]`,
            link: "/finance/tax",
          },
        });
        created++;
      }
    }

    return NextResponse.json({ created });
  } catch (error) {
    console.error("POST /api/notifications/check error:", error);
    return NextResponse.json(
      { error: "Failed to check notifications" },
      { status: 500 }
    );
  }
}
