import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, amount, description, category, date, projectId, recurring, notes, receiptSaved, taxDeductible } = body;

    const data: Record<string, unknown> = {};
    if (type !== undefined) data.type = type;
    if (amount !== undefined) data.amount = amount;
    if (description !== undefined) data.description = description.trim();
    if (category !== undefined) data.category = category;
    if (date !== undefined) data.date = new Date(date);
    if (projectId !== undefined) data.projectId = projectId || null;
    if (recurring !== undefined) data.recurring = recurring;
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (receiptSaved !== undefined) data.receiptSaved = receiptSaved;
    if (taxDeductible !== undefined) data.taxDeductible = taxDeductible;

    const transaction = await prisma.transaction.update({ where: { id }, data });
    return NextResponse.json(transaction);
  } catch (error) {
    console.error("PATCH /api/transactions/[id] error:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
