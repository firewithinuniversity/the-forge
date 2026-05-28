import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      projects,
      phases,
      tasks,
      notes,
      transactions,
      categories,
      budgets,
      taxConfig,
      taxPayments,
      recurringExpenses,
      distributions,
      notifications,
      reminders,
      projectTemplates,
      auditLogs,
      calendarEvents,
    ] = await Promise.all([
      prisma.project.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.phase.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.task.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.note.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.transaction.findMany({ orderBy: { date: "asc" } }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.budget.findMany(),
      prisma.taxConfig.findFirst(),
      prisma.taxPayment.findMany({ orderBy: [{ year: "asc" }, { quarter: "asc" }] }),
      prisma.recurringExpense.findMany({ orderBy: { service: "asc" } }),
      prisma.distribution.findMany({ orderBy: { date: "asc" } }),
      prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.reminder.findMany({ orderBy: { remindAt: "asc" } }),
      prisma.projectTemplate.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
      prisma.calendarEvent.findMany({ orderBy: { date: "asc" } }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: "2.1",
      data: {
        projects,
        phases,
        tasks,
        notes,
        transactions,
        categories,
        budgets,
        taxConfig: taxConfig || null,
        taxPayments,
        recurringExpenses,
        distributions,
        notifications,
        reminders,
        projectTemplates,
        auditLogs,
        calendarEvents,
      },
      summary: {
        projects: projects.length,
        phases: phases.length,
        tasks: tasks.length,
        notes: notes.length,
        transactions: transactions.length,
        categories: categories.length,
        budgets: budgets.length,
        taxPayments: taxPayments.length,
        recurringExpenses: recurringExpenses.length,
        distributions: distributions.length,
        notifications: notifications.length,
        reminders: reminders.length,
        projectTemplates: projectTemplates.length,
        auditLogs: auditLogs.length,
        calendarEvents: calendarEvents.length,
      },
    };

    const json = JSON.stringify(exportData, null, 2);
    const today = new Date().toISOString().split("T")[0];

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="the-forge-backup-${today}.json"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export-all error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
