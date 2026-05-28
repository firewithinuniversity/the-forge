import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  optionalString,
  optionalDate,
  optionalBoolean,
  optionalEnum,
  maxLength,
} from "@/lib/validate";

const EVENT_TYPES = ["meeting", "note", "deadline", "other"] as const;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

// GET /api/calendar-events/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await prisma.calendarEvent.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("GET /api/calendar-events/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}

// PATCH /api/calendar-events/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = optionalString(body.title, "title");
      if (title) data.title = maxLength(title, 200, "title");
    }
    if (body.description !== undefined) {
      data.description = optionalString(body.description, "description") ?? null;
    }
    if (body.type !== undefined) {
      data.type = optionalEnum(body.type, EVENT_TYPES, "type");
    }
    if (body.date !== undefined) {
      data.date = optionalDate(body.date, "date");
    }
    if (body.endDate !== undefined) {
      data.endDate = body.endDate === null ? null : optionalDate(body.endDate, "endDate");
    }
    if (body.allDay !== undefined) {
      data.allDay = optionalBoolean(body.allDay, "allDay");
    }
    if (body.color !== undefined) {
      const color = optionalString(body.color, "color");
      if (color && !HEX_COLOR_RE.test(color)) {
        throw new ValidationError("color must be a valid hex color (e.g. #FF00AA)");
      }
      data.color = color;
    }
    if (body.projectId !== undefined) {
      data.projectId = body.projectId === null ? null : optionalString(body.projectId, "projectId");
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data,
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/calendar-events/[id] error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

// DELETE /api/calendar-events/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/calendar-events/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
