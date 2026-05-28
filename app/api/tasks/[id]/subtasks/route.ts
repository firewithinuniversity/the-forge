import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  maxLength,
} from "@/lib/validate";

// GET /api/tasks/[id]/subtasks — list subtasks for a task
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const subtasks = await prisma.subtask.findMany({
      where: { taskId: id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error("GET /api/tasks/[id]/subtasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subtasks" },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/subtasks — create a subtask
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const title = maxLength(requireString(body.title, "title"), 200, "title");

    // Get the max order for subtasks in this task
    const maxOrderSubtask = await prisma.subtask.findFirst({
      where: { taskId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (maxOrderSubtask?.order ?? -1) + 1;

    const subtask = await prisma.subtask.create({
      data: {
        title,
        taskId: id,
        order: nextOrder,
      },
    });

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/tasks/[id]/subtasks error:", error);
    return NextResponse.json(
      { error: "Failed to create subtask" },
      { status: 500 }
    );
  }
}
