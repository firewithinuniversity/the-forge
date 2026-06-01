import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  validateEnum,
  optionalString,
  requireStringArray,
  maxLength,
} from "@/lib/validate";

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      where: { dismissed: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const type = validateEnum(
      body.type,
      ["deadline", "overdue", "burn_rate", "milestone", "auto_transaction", "reminder"],
      "type"
    );
    const title = maxLength(requireString(body.title, "title"), 200, "title");
    const message = maxLength(requireString(body.message, "message"), 2000, "message");
    const link = optionalString(body.link, "link") ?? null;
    // ── End validation ──────────────────────────────────────────────────

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        link,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const ids = requireStringArray(body.ids, "ids");
    const action = validateEnum(body.action, ["read", "dismiss"], "action");
    // ── End validation ──────────────────────────────────────────────────

    const data = action === "read" ? { read: true } : { dismissed: true };

    for (const id of ids) {
      await prisma.notification.update({
        where: { id },
        data,
      });
    }

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
