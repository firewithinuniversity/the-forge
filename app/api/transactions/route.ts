import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  ValidationError,
  requireString,
  requireNumber,
  validateEnum,
  optionalString,
  optionalBoolean,
  optionalEnum,
  maxLength,
} from "@/lib/validate";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const projectId = searchParams.get("projectId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (type && (type === "income" || type === "expense")) where.type = type;
    if (category) where.category = category;
    if (projectId) where.projectId = projectId;
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from);
      if (to) (where.date as Record<string, unknown>).lte = new Date(to);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const type = validateEnum(body.type, ["income", "expense"], "type");
    const amount = requireNumber(body.amount, "amount");
    const description = maxLength(requireString(body.description, "description"), 500, "description");
    const category = requireString(body.category, "category");

    const date = body.date ? new Date(body.date) : new Date();
    if (body.date && isNaN(date.getTime())) {
      return NextResponse.json({ error: "date is not a valid date" }, { status: 400 });
    }

    const projectId = optionalString(body.projectId, "projectId") || null;
    const recurring = optionalBoolean(body.recurring, "recurring") ?? false;
    const notes = optionalString(body.notes, "notes") ?? null;
    const receiptSaved = optionalBoolean(body.receiptSaved, "receiptSaved") ?? false;
    const taxDeductible = optionalEnum(
      body.taxDeductible,
      ["yes", "no", "partial", "unknown"],
      "taxDeductible"
    ) ?? "unknown";
    // ── End validation ──────────────────────────────────────────────────

    // ── Duplicate detection ────────────────────────────────────────────
    const skipDuplicateCheck = optionalBoolean(body.skipDuplicateCheck, "skipDuplicateCheck") ?? false;

    if (!skipDuplicateCheck) {
      const dupCheckStart = new Date(date);
      dupCheckStart.setDate(dupCheckStart.getDate() - 1);
      const dupCheckEnd = new Date(date);
      dupCheckEnd.setDate(dupCheckEnd.getDate() + 1);

      const possibleDupes = await prisma.transaction.findMany({
        where: {
          type,
          amount,
          category,
          date: { gte: dupCheckStart, lte: dupCheckEnd },
        },
        select: { id: true, description: true, date: true },
        take: 3,
      });

      if (possibleDupes.length > 0) {
        return NextResponse.json(
          {
            error: "duplicate_warning",
            message: "A similar transaction already exists",
            duplicates: possibleDupes,
          },
          { status: 409 }
        );
      }
    }
    // ── End duplicate detection ────────────────────────────────────────

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount,
        description,
        category,
        date,
        projectId,
        recurring,
        notes,
        receiptSaved,
        taxDeductible,
      },
    });

    logAudit("transaction", transaction.id, "create", {
      type, amount, description, category,
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/transactions error:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
