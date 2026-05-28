import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  optionalString,
  optionalBoolean,
  optionalEnum,
  maxLength,
} from "@/lib/validate";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    const notes = await prisma.note.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        project: { select: { id: true, name: true, color: true } },
        transaction: { select: { id: true, description: true, amount: true, type: true, date: true } },
      },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("GET /api/notes error:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const content = maxLength(requireString(body.content, "content"), 10000, "content");
    const title = optionalString(body.title, "title") ?? "";
    const projectId = optionalString(body.projectId, "projectId") || null;
    const transactionId = optionalString(body.transactionId, "transactionId") || null;
    const pinned = optionalBoolean(body.pinned, "pinned") ?? false;
    const category = optionalEnum(
      body.category,
      ["General", "Meeting Notes", "Tax Notes", "Legal", "Ideas", "Ministry"],
      "category"
    ) ?? "General";
    // ── End validation ──────────────────────────────────────────────────

    const note = await prisma.note.create({
      data: {
        title,
        content,
        projectId,
        transactionId,
        pinned,
        category,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/notes error:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
