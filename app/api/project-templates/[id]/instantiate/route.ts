import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface TemplatePhase {
  name: string;
  order: number;
}

interface TemplateTask {
  title: string;
  description?: string | null;
  priority?: string;
  order?: number;
  phaseName?: string | null;
}

// POST /api/project-templates/[id]/instantiate — create a project from a template
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await prisma.projectTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Allow overriding name/description/color from request body
    let overrides: { name?: string; description?: string; color?: string } = {};
    try {
      overrides = await request.json();
    } catch {
      // No body provided, use template defaults
    }

    const projectName = overrides.name?.trim() || template.name;
    const projectDescription =
      overrides.description !== undefined
        ? overrides.description?.trim() || null
        : template.description;
    const projectColor = overrides.color || template.color;

    // Create the project
    const project = await prisma.project.create({
      data: {
        name: projectName,
        description: projectDescription,
        color: projectColor,
      },
    });

    // Parse template data
    const templatePhases = JSON.parse(template.phases) as TemplatePhase[];
    const templateTasks = JSON.parse(template.tasks) as TemplateTask[];

    // Create phases and build a name->id map
    const phaseNameToId: Record<string, string> = {};

    for (const tp of templatePhases) {
      const phase = await prisma.phase.create({
        data: {
          name: tp.name,
          order: tp.order,
          projectId: project.id,
        },
      });
      phaseNameToId[tp.name] = phase.id;
    }

    // Create tasks, matching phaseName to actual phase IDs
    for (const tt of templateTasks) {
      const phaseId = tt.phaseName ? phaseNameToId[tt.phaseName] || null : null;

      await prisma.task.create({
        data: {
          title: tt.title,
          description: tt.description || null,
          priority: tt.priority || "medium",
          order: tt.order ?? 0,
          status: "todo",
          projectId: project.id,
          phaseId,
        },
      });
    }

    // Fetch the complete project to return
    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        phases: { orderBy: { order: "asc" } },
        tasks: { orderBy: [{ order: "asc" }, { createdAt: "desc" }] },
      },
    });

    return NextResponse.json(fullProject, { status: 201 });
  } catch (error) {
    console.error("POST /api/project-templates/[id]/instantiate error:", error);
    return NextResponse.json(
      { error: "Failed to create project from template" },
      { status: 500 }
    );
  }
}
