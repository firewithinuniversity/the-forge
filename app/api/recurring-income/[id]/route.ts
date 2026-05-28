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

    if (body.source !== undefined) {
      const src = optionalString(body.source, "source");
      if (src !== undefined && src.length === 0) {
        return NextResponse.json({ error: "source cannot be empty" }, { status: 400 });
      }
      data.source = src;
    }
    if (body.category !== undefined) {
      const cat = optionalString(body.category, "category");
      if (cat !== undefined && cat.length === 0) {
        return NextResponse.json({ error: "category cannot be empty" }, { status: 400 });
      }
      data.category = cat;
    }
    if (body.amount !== undefined) {
      data.amount = optionalNumber(body.amount, "amount");
    }
    if (body.frequency !== undefined) {
      data.frequency = optionalEnum(
        body.frequency,
        ["weekly", "monthly", "annual"],
        "frequency"
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

    const income = await prisma.recurringIncome.update({ where: { id }, data });
    return NextResponse.json(income);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/recurring-income/[id] error:", error);
    return NextResponse.json({ error: "Failed to update recurring income" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.recurringIncome.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/recurring-income/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete recurring income" }, { status: 500 });
  }
}
