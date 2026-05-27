import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { name, description, color, archived } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (color !== undefined) data.color = color;
    if (archived !== undefined) data.archived = archived;

    const project = await prisma.project.update({
      where: { id },
      data,
    });

    return NextResponse.json(project);
  } catch (error) {
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
