import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { title, content, projectId, transactionId, pinned, category } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Note content is required" }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        title: title?.trim() || "",
        content: content.trim(),
        projectId: projectId || null,
        transactionId: transactionId || null,
        pinned: pinned || false,
        category: category || "General",
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("POST /api/notes error:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
