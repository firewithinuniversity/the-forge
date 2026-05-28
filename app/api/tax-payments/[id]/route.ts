import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  optionalNumber,
  optionalString,
  optionalBoolean,
  optionalDate,
} from "@/lib/validate";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const data: Record<string, unknown> = {};

    if (body.paid !== undefined) {
      data.paid = optionalBoolean(body.paid, "paid");
    }
    if (body.paidDate !== undefined) {
      data.paidDate = body.paidDate === null ? null : optionalDate(body.paidDate, "paidDate") ?? null;
    }
    if (body.amount !== undefined) {
      data.amount = optionalNumber(body.amount, "amount", { allowZero: true });
    }
    if (body.notes !== undefined) {
      data.notes = body.notes === null ? null : optionalString(body.notes, "notes") ?? null;
    }
    // ── End validation ──────────────────────────────────────────────────

    const payment = await prisma.taxPayment.update({ where: { id }, data });
    return NextResponse.json(payment);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/tax-payments/[id] error:", error);
    return NextResponse.json({ error: "Failed to update tax payment" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.taxPayment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
