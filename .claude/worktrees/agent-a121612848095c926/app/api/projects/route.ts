import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  optionalString,
  maxLength,
} from "@/lib/validate";

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

    // ── Input validation ────────────────────────────────────────────────
    const name = maxLength(requireString(body.name, "name"), 200, "name");
    const description = optionalString(body.description, "description") ?? null;
    const color = optionalString(body.color, "color") ?? "#f59e0b";

    // Basic hex color validation
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return NextResponse.json(
        { error: "color must be a valid hex color (e.g. #f59e0b)" },
        { status: 400 }
      );
    }
    // ── End validation ──────────────────────────────────────────────────

    const project = await prisma.project.create({
      data: {
        name,
        description,
        color,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
