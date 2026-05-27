import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { title, description, status, priority, projectId, phaseId, assignee, dueDate, startDate, endDate } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Get the max order for the status column in this project
    const maxOrderTask = await prisma.task.findFirst({
      where: { projectId, status: status || "todo" },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (maxOrderTask?.order ?? -1) + 1;

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: status || "todo",
        priority: priority || "medium",
        order: nextOrder,
        projectId,
        phaseId: phaseId || null,
        assignee: assignee || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
