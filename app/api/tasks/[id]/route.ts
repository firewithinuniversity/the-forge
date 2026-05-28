import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  optionalString,
  optionalDate,
  optionalNumber,
  validateEnum,
  maxLength,
} from "@/lib/validate";

const VALID_STATUSES = ["todo", "in_progress", "review", "done"];
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

// PATCH /api/tasks/[id] — update a task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      data.title = maxLength(requireString(body.title, "title"), 200, "title");
    }
    if (body.description !== undefined) {
      const desc = optionalString(body.description, "description");
      data.description = desc ? maxLength(desc, 5000, "description") : null;
    }
    if (body.status !== undefined) {
      data.status = validateEnum(body.status, VALID_STATUSES, "status");
    }
    if (body.priority !== undefined) {
      data.priority = validateEnum(body.priority, VALID_PRIORITIES, "priority");
    }
    if (body.order !== undefined) {
      data.order = optionalNumber(body.order, "order", { min: 0, allowZero: true });
    }
    if (body.phaseId !== undefined) {
      data.phaseId = optionalString(body.phaseId, "phaseId") || null;
    }
    if (body.assignee !== undefined) {
      const assignee = optionalString(body.assignee, "assignee");
      data.assignee = assignee ? maxLength(assignee, 100, "assignee") : null;
    }
    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate === null ? null : optionalDate(body.dueDate, "dueDate") ?? null;
    }
    if (body.startDate !== undefined) {
      data.startDate = body.startDate === null ? null : optionalDate(body.startDate, "startDate") ?? null;
    }
    if (body.endDate !== undefined) {
      data.endDate = body.endDate === null ? null : optionalDate(body.endDate, "endDate") ?? null;
    }

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] — delete a task
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
