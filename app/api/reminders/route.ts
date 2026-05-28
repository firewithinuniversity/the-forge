import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  requireDate,
  optionalString,
  maxLength,
} from "@/lib/validate";

// GET — list reminders (upcoming by default, or ?all=true for all)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const reminders = await prisma.reminder.findMany({
      where: all ? {} : { fired: false },
      orderBy: { remindAt: "asc" },
      take: 100,
    });

    return NextResponse.json(
      reminders.map((r) => ({
        ...r,
        remindAt: r.remindAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("GET /api/reminders error:", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

// POST — create a reminder
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = maxLength(requireString(body.title, "title"), 200, "title");
    const remindAt = requireDate(body.remindAt, "remindAt");

    let message = optionalString(body.message, "message");
    if (message) message = maxLength(message, 1000, "message");

    let entityType = optionalString(body.entityType, "entityType") ?? null;
    if (entityType) entityType = maxLength(entityType, 50, "entityType");

    let entityId = optionalString(body.entityId, "entityId") ?? null;
    if (entityId) entityId = maxLength(entityId, 100, "entityId");

    let link = optionalString(body.link, "link") ?? null;
    if (link) link = maxLength(link, 500, "link");

    const reminder = await prisma.reminder.create({
      data: {
        title,
        message: message ?? "",
        remindAt,
        entityType,
        entityId,
        link,
      },
    });

    return NextResponse.json(
      { ...reminder, remindAt: reminder.remindAt.toISOString(), createdAt: reminder.createdAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/reminders error:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}

// DELETE — delete a reminder by id (passed in body)
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Reminder ID is required" }, { status: 400 });
    }

    await prisma.reminder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/reminders error:", error);
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 });
  }
}
