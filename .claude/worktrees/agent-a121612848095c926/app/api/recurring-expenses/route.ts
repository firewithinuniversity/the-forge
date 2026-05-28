import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  requireNumber,
  optionalString,
  optionalNumber,
  optionalDate,
  optionalEnum,
  maxLength,
} from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") !== "false";

    const expenses = await prisma.recurringExpense.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { service: "asc" },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("GET /api/recurring-expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch recurring expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const service = maxLength(requireString(body.service, "service"), 200, "service");
    const category = requireString(body.category, "category");
    const monthlyCost = requireNumber(body.monthlyCost, "monthlyCost", { allowZero: true });
    const annualCost = optionalNumber(body.annualCost, "annualCost", { allowZero: true }) ?? null;
    const billingCycle = optionalEnum(
      body.billingCycle,
      ["monthly", "annual", "per_transaction"],
      "billingCycle"
    ) ?? "monthly";
    const nextDueDate = optionalDate(body.nextDueDate, "nextDueDate") ?? null;
    const notes = optionalString(body.notes, "notes") ?? null;
    // ── End validation ──────────────────────────────────────────────────

    const expense = await prisma.recurringExpense.create({
      data: {
        service,
        category,
        monthlyCost,
        annualCost,
        billingCycle,
        nextDueDate,
        notes,
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/recurring-expenses error:", error);
    return NextResponse.json({ error: "Failed to create recurring expense" }, { status: 500 });
  }
}
