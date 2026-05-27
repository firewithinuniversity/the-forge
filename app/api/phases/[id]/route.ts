import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, status, order, startDate, endDate } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (status !== undefined) data.status = status;
    if (order !== undefined) data.order = order;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;

    const phase = await prisma.phase.update({ where: { id }, data });
    return NextResponse.json(phase);
  } catch (error) {
    console.error("PATCH /api/phases/[id] error:", error);
    return NextResponse.json({ error: "Failed to update phase" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.phase.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/phases/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete phase" }, { status: 500 });
  }
}
