import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface CalendarEvent {
  type: "task" | "phase_start" | "phase_end" | "tax" | "recurring" | "distribution" | "meeting" | "note" | "deadline" | "other";
  title: string;
  date: string;
  endDate?: string | null;
  allDay?: boolean;
  color?: string;
  projectId?: string;
  status?: string;
  paid?: boolean;
  calendarEventId?: string; // DB id for custom events (editable)
  description?: string | null;
  recurrence?: string | null; // "daily" | "weekly" | "biweekly" | "monthly" | "yearly"
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

  // 6. Custom calendar events (meetings, notes, deadlines, etc.)
  const calendarEvents = await prisma.calendarEvent.findMany({
    where: {
      date: { gte: rangeStart, lte: rangeEnd },
    },
    include: { project: { select: { color: true } } },
  });

  for (const ce of calendarEvents) {
    events.push({
      type: ce.type as CalendarEvent["type"],
      title: ce.title,
      date: ce.date.toISOString(),
      endDate: ce.endDate?.toISOString() ?? null,
      allDay: ce.allDay,
      color: ce.color || ce.project?.color || "#E8501A",
      projectId: ce.projectId ?? undefined,
      calendarEventId: ce.id,
      description: ce.description,
      recurrence: ce.recurrence ?? null,
    });
  }

  // 7. Generate recurring calendar event instances
  // Fetch all calendar events with recurrence (even outside range — the base may be before the window)
  const allCalendarEvents = await prisma.calendarEvent.findMany({
    include: { project: { select: { color: true } } },
  });
  const recurringCalendarEvents = allCalendarEvents.filter(e => e.recurrence !== null);

  for (const rce of recurringCalendarEvents) {
    if (!rce.recurrence) continue;
    const baseDate = new Date(rce.date);
    const duration = rce.endDate ? rce.endDate.getTime() - rce.date.getTime() : 0;

    // Generate instances within the visible range
    // Start from the base date and step forward
    let current = new Date(baseDate);

    // Safety: limit to 400 iterations to prevent infinite loops
    for (let i = 0; i < 400; i++) {
      // If we've gone past the visible range, stop
      if (current > rangeEnd) break;

      // If the instance is within range and is NOT the original base date (already added above),
      // add it as a recurring instance
      if (current >= rangeStart && current <= rangeEnd) {
        const isoDate = current.toISOString();
        // Skip the base event — it was already added in section 6
        if (isoDate !== rce.date.toISOString()) {
          const instanceEndDate = duration > 0 ? new Date(current.getTime() + duration) : null;
          events.push({
            type: rce.type as CalendarEvent["type"],
            title: rce.title,
            date: isoDate,
            endDate: instanceEndDate?.toISOString() ?? null,
            allDay: rce.allDay,
            color: rce.color || rce.project?.color || "#E8501A",
            projectId: rce.projectId ?? undefined,
            calendarEventId: rce.id,
            description: rce.description,
            recurrence: rce.recurrence,
          });
        }
      }

      // Advance to the next occurrence
      const next = new Date(current);
      switch (rce.recurrence) {
        case "daily":
          next.setDate(next.getDate() + 1);
          break;
        case "weekly":
          next.setDate(next.getDate() + 7);
          break;
        case "biweekly":
          next.setDate(next.getDate() + 14);
          break;
        case "monthly":
          next.setMonth(next.getMonth() + 1);
          break;
        case "yearly":
          next.setFullYear(next.getFullYear() + 1);
          break;
        default:
          // Unknown recurrence — stop
          i = 400;
          break;
      }
      current = next;
    }
  }

  return events;
}
