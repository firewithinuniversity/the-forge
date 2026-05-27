import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.service !== undefined) data.service = body.service;
  if (body.category !== undefined) data.category = body.category;
  if (body.monthlyCost !== undefined) data.monthlyCost = parseFloat(body.monthlyCost);
  if (body.annualCost !== undefined) data.annualCost = body.annualCost ? parseFloat(body.annualCost) : null;
  if (body.billingCycle !== undefined) data.billingCycle = body.billingCycle;
  if (body.nextDueDate !== undefined) data.nextDueDate = body.nextDueDate ? new Date(body.nextDueDate) : null;
  if (body.active !== undefined) data.active = body.active;
  if (body.notes !== undefined) data.notes = body.notes;

  const expense = await prisma.recurringExpense.update({ where: { id }, data });
  return NextResponse.json(expense);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.recurringExpense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
