import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireNumber,
  requireDate,
  validateEnum,
  optionalString,
  optionalBoolean,
  optionalDate,
} from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();

    const payments = await prisma.taxPayment.findMany({
      where: { year },
      orderBy: [{ quarter: "asc" }, { type: "asc" }],
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error("GET /api/tax-payments error:", error);
    return NextResponse.json({ error: "Failed to fetch tax payments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const year = requireNumber(body.year, "year", { min: 2000, max: 2100 });
    const quarter = requireNumber(body.quarter, "quarter", { min: 1, max: 4 });
    const type = validateEnum(body.type, ["federal", "state", "self_employment"], "type");
    const amount = requireNumber(body.amount, "amount", { allowZero: true });
    const dueDate = requireDate(body.dueDate, "dueDate");
    const paidDate = optionalDate(body.paidDate, "paidDate") ?? null;
    const paid = optionalBoolean(body.paid, "paid") ?? false;
    const notes = optionalString(body.notes, "notes") ?? null;
    // ── End validation ──────────────────────────────────────────────────

    const payment = await prisma.taxPayment.create({
      data: {
        year: Math.round(year),
        quarter: Math.round(quarter),
        type,
        amount,
        dueDate,
        paidDate,
        paid,
        notes,
      },
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/tax-payments error:", error);
    return NextResponse.json({ error: "Failed to create tax payment" }, { status: 500 });
  }
}
