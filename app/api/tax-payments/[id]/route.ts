import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.paid !== undefined) data.paid = body.paid;
  if (body.paidDate !== undefined) data.paidDate = body.paidDate ? new Date(body.paidDate) : null;
  if (body.amount !== undefined) data.amount = parseFloat(body.amount);
  if (body.notes !== undefined) data.notes = body.notes;

  const payment = await prisma.taxPayment.update({ where: { id }, data });
  return NextResponse.json(payment);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.taxPayment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
