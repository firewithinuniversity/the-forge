import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  optionalString,
  optionalNumber,
  optionalBoolean,
  optionalDate,
  optionalEnum,
} from "@/lib/validate";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const data: Record<string, unknown> = {};

    if (body.service !== undefined) {
      const svc = optionalString(body.service, "service");
      if (svc !== undefined && svc.length === 0) {
        return NextResponse.json({ error: "service cannot be empty" }, { status: 400 });
      }
      data.service = svc;
    }
    if (body.category !== undefined) {
      const cat = optionalString(body.category, "category");
      if (cat !== undefined && cat.length === 0) {
        return NextResponse.json({ error: "category cannot be empty" }, { status: 400 });
      }
      data.category = cat;
    }
    if (body.monthlyCost !== undefined) {
      data.monthlyCost = optionalNumber(body.monthlyCost, "monthlyCost", { allowZero: true });
    }
    if (body.annualCost !== undefined) {
      data.annualCost = body.annualCost === null
        ? null
        : optionalNumber(body.annualCost, "annualCost", { allowZero: true }) ?? null;
    }
    if (body.billingCycle !== undefined) {
      data.billingCycle = optionalEnum(
        body.billingCycle,
        ["monthly", "annual", "per_transaction"],
        "billingCycle"
      );
    }
    if (body.nextDueDate !== undefined) {
      data.nextDueDate = body.nextDueDate === null
        ? null
        : optionalDate(body.nextDueDate, "nextDueDate") ?? null;
    }
    if (body.active !== undefined) {
      data.active = optionalBoolean(body.active, "active");
    }
    if (body.notes !== undefined) {
      data.notes = body.notes === null ? null : optionalString(body.notes, "notes") ?? null;
    }
    // ── End validation ──────────────────────────────────────────────────

    const expense = await prisma.recurringExpense.update({ where: { id }, data });
    return NextResponse.json(expense);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/recurring-expenses/[id] error:", error);
    return NextResponse.json({ error: "Failed to update recurring expense" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.recurringExpense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/recurring-expenses/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete recurring expense" }, { status: 500 });
  }
}
