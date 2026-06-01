import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // On empty database or first deploy, just return 0
    // This prevents crashes from missing seed data
    const config = await prisma.taxConfig.findFirst().catch(() => null);
    if (!config) {
      return NextResponse.json({ created: 0 });
    }

    let created = 0;
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Burn Rate Alert
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthExpenses = await prisma.transaction.findMany({
      where: { type: "expense", date: { gte: monthStart, lte: monthEnd } },
      select: { amount: true },
    });
    const totalExpenses = monthExpenses.reduce((s, t) => s + t.amount, 0);

    if (totalExpenses >= config.burnRateThreshold) {
      const monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const allBurnNotifs = await prisma.notification.findMany({
        where: { type: "burn_rate", read: false },
      });
      const existingBurnRate = allBurnNotifs.find((n) => n.message.includes(monthLabel));

      if (!existingBurnRate) {
        await prisma.notification.create({
          data: {
            type: "burn_rate",
            title: "Burn Rate Alert",
            message: `Monthly expenses for ${monthLabel} have reached $${totalExpenses.toFixed(2)} — threshold: $${config.burnRateThreshold.toFixed(2)}.`,
            link: "/finance",
          },
        });
        created++;
      }
    }

    // Overdue Tasks
    const overdueTasks = await prisma.task.findMany({
      where: { dueDate: { lt: today }, status: { notIn: ["done"] } },
      include: { project: { select: { id: true, name: true } } },
    });

    const unreadOverdueNotifs = await prisma.notification.findMany({
      where: { type: "overdue", read: false },
    });

    for (const task of overdueTasks) {
      if (!unreadOverdueNotifs.some((n) => n.message.includes(task.id))) {
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

    // Upcoming Phase Deadlines (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingPhases = await prisma.phase.findMany({
      where: { status: "active", endDate: { gte: today, lte: sevenDaysFromNow } },
      include: { project: { select: { id: true, name: true } } },
    });

    const unreadDeadlineNotifs = await prisma.notification.findMany({
      where: { type: "deadline", read: false },
    });

    for (const phase of upcomingPhases) {
      if (!unreadDeadlineNotifs.some((n) => n.message.includes(phase.id))) {
        const daysLeft = Math.ceil((phase.endDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

    // Tax Payment Deadlines (within 14 days)
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

    const upcomingTaxPayments = await prisma.taxPayment.findMany({
      where: { paid: false, dueDate: { gte: today, lte: fourteenDaysFromNow } },
    });

    for (const payment of upcomingTaxPayments) {
      if (!unreadDeadlineNotifs.some((n) => n.message.includes(payment.id))) {
        const daysLeft = Math.ceil((payment.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        await prisma.notification.create({
          data: {
            type: "deadline",
            title: "Tax Payment Due",
            message: `Q${payment.quarter} ${payment.year} ${payment.type} tax payment ($${payment.amount.toFixed(2)}) is due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. [tax:${payment.id}]`,
            link: "/finance/tax",
          },
        });
        created++;
      }
    }

    return NextResponse.json({ created });
  } catch (error) {
    console.error("POST /api/notifications/check error:", error);
    return NextResponse.json({ created: 0 });
  }
}
