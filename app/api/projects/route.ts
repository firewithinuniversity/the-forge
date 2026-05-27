import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/projects — list all projects with task counts
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: { archived: false },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { tasks: true, phases: true },
        },
        tasks: {
          select: { status: true },
        },
      },
    });

    const result = projects.map((p) => {
      const statusCounts = { todo: 0, in_progress: 0, review: 0, done: 0 };
      for (const t of p.tasks) {
        const s = t.status as keyof typeof statusCounts;
        if (s in statusCounts) statusCounts[s]++;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tasks, ...rest } = p;
      return { ...rest, statusCounts };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects — create a new project
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#f59e0b",
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
