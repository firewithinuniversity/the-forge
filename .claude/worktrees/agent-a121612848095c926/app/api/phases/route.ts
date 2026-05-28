import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/phases — create a new phase
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, projectId } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Phase name is required" },
        { status: 400 }
      );
    }

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Get max order for this project's phases
    const maxOrderPhase = await prisma.phase.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (maxOrderPhase?.order ?? -1) + 1;

    const phase = await prisma.phase.create({
      data: {
        name: name.trim(),
        projectId,
        order: nextOrder,
      },
    });

    return NextResponse.json(phase, { status: 201 });
  } catch (error) {
    console.error("POST /api/phases error:", error);
    return NextResponse.json(
      { error: "Failed to create phase" },
      { status: 500 }
    );
  }
}
