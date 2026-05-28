import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  optionalString,
  optionalEnum,
  optionalDate,
  maxLength,
} from "@/lib/validate";

const VALID_STATUSES = ["todo", "in_progress", "review", "done"];
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

// GET /api/tasks — list tasks with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const assignee = searchParams.get("assignee");

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (status && VALID_STATUSES.includes(status)) where.status = status;
    if (assignee) where.assignee = assignee;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: { project: { select: { name: true, color: true } } },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

// POST /api/tasks — create a new task
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = maxLength(requireString(body.title, "title"), 200, "title");
    const projectId = requireString(body.projectId, "projectId");
    const status = optionalEnum(body.status, VALID_STATUSES, "status") ?? "todo";
    const priority = optionalEnum(body.priority, VALID_PRIORITIES, "priority") ?? "medium";

    let description = optionalString(body.description, "description") ?? null;
    if (description) description = maxLength(description, 5000, "description");

    const assignee = optionalString(body.assignee, "assignee");
    if (assignee) maxLength(assignee, 100, "assignee");

    const dueDate = optionalDate(body.dueDate, "dueDate") ?? null;
    const startDate = optionalDate(body.startDate, "startDate") ?? null;
    const endDate = optionalDate(body.endDate, "endDate") ?? null;
    const phaseId = optionalString(body.phaseId, "phaseId") ?? null;

    // Get the max order for the status column in this project
    const maxOrderTask = await prisma.task.findFirst({
      where: { projectId, status },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (maxOrderTask?.order ?? -1) + 1;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        order: nextOrder,
        projectId,
        phaseId,
        assignee: assignee || null,
        dueDate,
        startDate,
        endDate,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
