import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  optionalString,
  maxLength,
} from "@/lib/validate";

// GET /api/project-templates — list all templates
export async function GET() {
  try {
    const templates = await prisma.projectTemplate.findMany({
      orderBy: { updatedAt: "desc" },
    });

    const result = templates.map((t) => {
      const phases = JSON.parse(t.phases) as unknown[];
      const tasks = JSON.parse(t.tasks) as unknown[];
      return {
        ...t,
        phaseCount: phases.length,
        taskCount: tasks.length,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/project-templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST /api/project-templates — create a template
// Body: { name, description?, color?, phases?, tasks? }
// OR:   { fromProjectId, name?, description?, color? } to create from existing project
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromProjectId } = body;

    if (fromProjectId) {
      // ── Validate fromProjectId ──────────────────────────────────────
      if (typeof fromProjectId !== "string" || fromProjectId.trim().length === 0) {
        return NextResponse.json(
          { error: "fromProjectId must be a non-empty string" },
          { status: 400 }
        );
      }

      // Create template from existing project
      const project = await prisma.project.findUnique({
        where: { id: fromProjectId },
        include: {
          phases: { orderBy: { order: "asc" } },
          tasks: {
            orderBy: [{ order: "asc" }, { createdAt: "desc" }],
            include: { phase: { select: { name: true } } },
          },
        },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      const templateName = optionalString(body.name, "name") || project.name;
      const description = body.description !== undefined
        ? (optionalString(body.description, "description") ?? null)
        : (project.description ?? null);
      const color = optionalString(body.color, "color") || project.color;

      if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
        return NextResponse.json(
          { error: "color must be a valid hex color (e.g. #E8501A)" },
          { status: 400 }
        );
      }

      const phasesJson = project.phases.map((p) => ({
        name: p.name,
        order: p.order,
      }));

      const tasksJson = project.tasks.map((t) => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        order: t.order,
        phaseName: t.phase?.name || null,
      }));

      const template = await prisma.projectTemplate.create({
        data: {
          name: maxLength(templateName.trim(), 200, "name"),
          description,
          color,
          phases: JSON.stringify(phasesJson),
          tasks: JSON.stringify(tasksJson),
        },
      });

      return NextResponse.json(template, { status: 201 });
    }

    // Create template from scratch
    // ── Input validation ────────────────────────────────────────────────
    const name = maxLength(requireString(body.name, "name"), 200, "name");
    const description = optionalString(body.description, "description") ?? null;
    const color = optionalString(body.color, "color") ?? "#E8501A";

    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return NextResponse.json(
        { error: "color must be a valid hex color (e.g. #E8501A)" },
        { status: 400 }
      );
    }

    // Validate phases and tasks are arrays if provided
    if (body.phases !== undefined && !Array.isArray(body.phases)) {
      return NextResponse.json(
        { error: "phases must be an array" },
        { status: 400 }
      );
    }
    if (body.tasks !== undefined && !Array.isArray(body.tasks)) {
      return NextResponse.json(
        { error: "tasks must be an array" },
        { status: 400 }
      );
    }
    // ── End validation ──────────────────────────────────────────────────

    const template = await prisma.projectTemplate.create({
      data: {
        name,
        description,
        color,
        phases: JSON.stringify(body.phases || []),
        tasks: JSON.stringify(body.tasks || []),
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/project-templates error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
