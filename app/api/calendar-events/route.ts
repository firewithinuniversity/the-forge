import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  requireDate,
  optionalString,
  optionalDate,
  optionalBoolean,
  optionalEnum,
  validateEnum,
  maxLength,
} from "@/lib/validate";

const EVENT_TYPES = ["meeting", "note", "deadline", "other"] as const;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

// GET /api/calendar-events?month=MM&year=YYYY
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);

    const firstOfMonth = new Date(year, month - 1, 1);
    const lastOfMonth = new Date(year, month, 0);

    const rangeStart = new Date(firstOfMonth);
    rangeStart.setDate(rangeStart.getDate() - 7);

    const rangeEnd = new Date(lastOfMonth);
    rangeEnd.setDate(rangeEnd.getDate() + 7);
    rangeEnd.setHours(23, 59, 59, 999);

    const events = await prisma.calendarEvent.findMany({
      where: {
        date: { gte: rangeStart, lte: rangeEnd },
      },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("GET /api/calendar-events error:", error);
    return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 });
  }
}

// POST /api/calendar-events — create a new calendar event
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = maxLength(requireString(body.title, "title"), 200, "title");
    const description = optionalString(body.description, "description");
    const type = validateEnum(body.type, EVENT_TYPES, "type");
    const date = requireDate(body.date, "date");
    const endDate = optionalDate(body.endDate, "endDate");
    const allDay = optionalBoolean(body.allDay, "allDay") ?? false;
    const color = optionalString(body.color, "color") ?? "#E8501A";
    if (!HEX_COLOR_RE.test(color)) {
      throw new ValidationError("color must be a valid hex color (e.g. #FF00AA)");
    }
    const projectId = optionalString(body.projectId, "projectId") || null;
    const recurrence = optionalEnum(
      body.recurrence,
      ["daily", "weekly", "biweekly", "monthly", "yearly"],
      "recurrence"
    ) ?? null;

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: description ?? null,
        type,
        date,
        endDate: endDate ?? null,
        allDay,
        color,
        projectId,
        recurrence,
      },
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/calendar-events error:", error);
    return NextResponse.json({ error: "Failed to create calendar event" }, { status: 500 });
  }
}
