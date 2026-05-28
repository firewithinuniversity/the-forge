import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  requireNumber,
  optionalString,
  optionalDate,
  optionalEnum,
  maxLength,
} from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") !== "false";

    const incomes = await prisma.recurringIncome.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { source: "asc" },
    });
    return NextResponse.json(incomes);
  } catch (error) {
    console.error("GET /api/recurring-income error:", error);
    return NextResponse.json({ error: "Failed to fetch recurring income" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const source = maxLength(requireString(body.source, "source"), 200, "source");
    const category = requireString(body.category, "category");
    const amount = requireNumber(body.amount, "amount");
    const frequency = optionalEnum(
      body.frequency,
      ["weekly", "monthly", "annual"],
      "frequency"
    ) ?? "monthly";
    const nextDueDate = optionalDate(body.nextDueDate, "nextDueDate") ?? null;
    const notes = optionalString(body.notes, "notes") ?? null;
    // ── End validation ──────────────────────────────────────────────────

    const income = await prisma.recurringIncome.create({
      data: {
        source,
        category,
        amount,
        frequency,
        nextDueDate,
        notes,
      },
    });
    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/recurring-income error:", error);
    return NextResponse.json({ error: "Failed to create recurring income" }, { status: 500 });
  }
}
