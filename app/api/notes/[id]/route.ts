import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, projectId, transactionId, pinned, category } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (content !== undefined) data.content = content.trim();
    if (projectId !== undefined) data.projectId = projectId || null;
    if (transactionId !== undefined) data.transactionId = transactionId || null;
    if (pinned !== undefined) data.pinned = pinned;
    if (category !== undefined) data.category = category;

    const note = await prisma.note.update({ where: { id }, data });
    return NextResponse.json(note);
  } catch (error) {
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
