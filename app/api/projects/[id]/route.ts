import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  optionalString,
  optionalBoolean,
} from "@/lib/validate";

// GET /api/projects/[id] — single project with phases and tasks
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        phases: { orderBy: { order: "asc" } },
        tasks: {
          orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        },
        notes: { orderBy: { updatedAt: "desc" } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] — update a project
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = optionalString(body.name, "name");
      if (name !== undefined && name.length === 0) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      data.name = name;
    }
    if (body.description !== undefined) {
      data.description = optionalString(body.description, "description") ?? null;
    }
    if (body.color !== undefined) {
      const color = optionalString(body.color, "color");
      if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
        return NextResponse.json(
          { error: "color must be a valid hex color (e.g. #f59e0b)" },
          { status: 400 }
        );
      }
      data.color = color;
    }
    if (body.archived !== undefined) {
      data.archived = optionalBoolean(body.archived, "archived");
    }
    // ── End validation ──────────────────────────────────────────────────

    const project = await prisma.project.update({
      where: { id },
      data,
    });

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] — archive a project (soft delete)
// To permanently delete, pass ?permanent=true (only allowed for already-archived projects)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const permanent = url.searchParams.get("permanent") === "true";

    if (permanent) {
      // Only allow permanent delete on already-archived projects
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      if (!project.archived) {
        return NextResponse.json(
          { error: "Project must be archived before it can be permanently deleted" },
          { status: 400 }
        );
      }
      await prisma.project.delete({ where: { id } });
      return NextResponse.json({ success: true, action: "deleted" });
    }

    // Soft delete: set archived = true
    await prisma.project.update({
      where: { id },
      data: { archived: true },
    });

    return NextResponse.json({ success: true, action: "archived" });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to archive project" },
      { status: 500 }
    );
  }
}
