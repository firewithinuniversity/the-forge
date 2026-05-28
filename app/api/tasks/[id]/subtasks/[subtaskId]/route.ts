import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  optionalString,
  optionalBoolean,
  optionalNumber,
  maxLength,
} from "@/lib/validate";

// PATCH /api/tasks/[id]/subtasks/[subtaskId] — update a subtask
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { subtaskId } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = optionalString(body.title, "title");
      if (title) data.title = maxLength(title, 200, "title");
    }
    if (body.completed !== undefined) {
      data.completed = optionalBoolean(body.completed, "completed") ?? false;
    }
    if (body.order !== undefined) {
      data.order = optionalNumber(body.order, "order", { min: 0, allowZero: true });
    }

    const subtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data,
    });

    return NextResponse.json(subtask);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/tasks/[id]/subtasks/[subtaskId] error:", error);
    return NextResponse.json(
      { error: "Failed to update subtask" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id]/subtasks/[subtaskId] — delete a subtask
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { subtaskId } = await params;

    await prisma.subtask.delete({ where: { id: subtaskId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id]/subtasks/[subtaskId] error:", error);
    return NextResponse.json(
      { error: "Failed to delete subtask" },
      { status: 500 }
    );
  }
}
