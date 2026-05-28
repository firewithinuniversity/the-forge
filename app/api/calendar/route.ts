import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface CalendarEvent {
  type: "task" | "phase_start" | "phase_end" | "tax" | "recurring" | "distribution";
  title: string;
  date: string;
  color?: string;
  projectId?: string;
  status?: string;
  paid?: boolean;
}

// GET /api/calendar?month=MM&year=YYYY
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);

    const events = await getCalendarEvents(month, year);
    return NextResponse.json(events);
  } catch (error) {
    console.error("GET /api/calendar error:", error);
    return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 });
  }
}

export async function getCalendarEvents(month: number, year: number): Promise<CalendarEvent[]> {
  // Build date range: first of month minus 1 week, last of month plus 1 week
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);

  const rangeStart = new Date(firstOfMonth);
  rangeStart.setDate(rangeStart.getDate() - 7);

  const rangeEnd = new Date(lastOfMonth);
  rangeEnd.setDate(rangeEnd.getDate() + 7);
  rangeEnd.setHours(23, 59, 59, 999);

  const events: CalendarEvent[] = [];

  // 1. Tasks with due dates
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: rangeStart, lte: rangeEnd },
    },
    include: { project: { select: { color: true } } },
  });

  for (const task of tasks) {
    if (task.dueDate) {
      events.push({
        type: "task",
        title: task.title,
        date: task.dueDate.toISOString(),
        color: task.project.color,
        projectId: task.projectId,
        status: task.status,
      });
    }
  }

  // 2. Phase start/end dates
  const phases = await prisma.phase.findMany({
    where: {
      OR: [
        { startDate: { gte: rangeStart, lte: rangeEnd } },
        { endDate: { gte: rangeStart, lte: rangeEnd } },
      ],
    },
    include: { project: { select: { color: true } } },
  });

  for (const phase of phases) {
    if (phase.startDate && phase.startDate >= rangeStart && phase.startDate <= rangeEnd) {
      events.push({
        type: "phase_start",
        title: phase.name,
        date: phase.startDate.toISOString(),
        color: phase.project.color,
        projectId: phase.projectId,
      });
    }
    if (phase.endDate && phase.endDate >= rangeStart && phase.endDate <= rangeEnd) {
      events.push({
        type: "phase_end",
        title: phase.name,
        date: phase.endDate.toISOString(),
        color: phase.project.color,
        projectId: phase.projectId,
      });
    }
  }

  // 3. Tax payment due dates
  const taxPayments = await prisma.taxPayment.findMany({
    where: {
      dueDate: { gte: rangeStart, lte: rangeEnd },
    },
  });

  for (const tp of taxPayments) {
    events.push({
      type: "tax",
      title: `Q${tp.quarter} ${tp.type} tax`,
      date: tp.dueDate.toISOString(),
      paid: tp.paid,
    });
  }

  // 4. Recurring expense due dates
  const recurring = await prisma.recurringExpense.findMany({
    where: {
      active: true,
      nextDueDate: { gte: rangeStart, lte: rangeEnd },
    },
  });

  for (const re of recurring) {
    if (re.nextDueDate) {
      events.push({
        type: "recurring",
        title: re.service,
        date: re.nextDueDate.toISOString(),
      });
    }
  }

  // 5. Distribution dates
  const distributions = await prisma.distribution.findMany({
    where: {
      date: { gte: rangeStart, lte: rangeEnd },
    },
  });

  for (const dist of distributions) {
    events.push({
      type: "distribution",
      title: `${dist.type} distribution`,
      date: dist.date.toISOString(),
    });
  }

  return events;
}
