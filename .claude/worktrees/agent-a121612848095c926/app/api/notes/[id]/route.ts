import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  optionalString,
  optionalBoolean,
  optionalEnum,
} from "@/lib/validate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      data.title = optionalString(body.title, "title") ?? "";
    }
    if (body.content !== undefined) {
      const content = optionalString(body.content, "content");
      if (content !== undefined && content.length === 0) {
        return NextResponse.json({ error: "content cannot be empty" }, { status: 400 });
      }
      data.content = content;
    }
    if (body.projectId !== undefined) {
      data.projectId = optionalString(body.projectId, "projectId") || null;
    }
    if (body.transactionId !== undefined) {
      data.transactionId = optionalString(body.transactionId, "transactionId") || null;
    }
    if (body.pinned !== undefined) {
      data.pinned = optionalBoolean(body.pinned, "pinned");
    }
    if (body.category !== undefined) {
      data.category = optionalEnum(
        body.category,
        ["General", "Meeting Notes", "Tax Notes", "Legal", "Ideas", "Ministry"],
        "category"
      );
    }
    // ── End validation ──────────────────────────────────────────────────

    const note = await prisma.note.update({ where: { id }, data });
    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/notes/[id] error:", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notes/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
