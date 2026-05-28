import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit, diffChanges } from "@/lib/audit";
import {
  ValidationError,
  optionalString,
  optionalNumber,
  optionalBoolean,
  optionalDate,
  optionalEnum,
} from "@/lib/validate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const data: Record<string, unknown> = {};

    if (body.type !== undefined) {
      data.type = optionalEnum(body.type, ["income", "expense"], "type");
    }
    if (body.amount !== undefined) {
      data.amount = optionalNumber(body.amount, "amount", { min: 0.01 });
    }
    if (body.description !== undefined) {
      const desc = optionalString(body.description, "description");
      if (desc !== undefined && desc.length === 0) {
        return NextResponse.json({ error: "description cannot be empty" }, { status: 400 });
      }
      data.description = desc;
    }
    if (body.category !== undefined) {
      const cat = optionalString(body.category, "category");
      if (cat !== undefined && cat.length === 0) {
        return NextResponse.json({ error: "category cannot be empty" }, { status: 400 });
      }
      data.category = cat;
    }
    if (body.date !== undefined) {
      data.date = optionalDate(body.date, "date");
    }
    if (body.projectId !== undefined) {
      data.projectId = optionalString(body.projectId, "projectId") || null;
    }
    if (body.recurring !== undefined) {
      data.recurring = optionalBoolean(body.recurring, "recurring");
    }
    if (body.notes !== undefined) {
      data.notes = optionalString(body.notes, "notes") ?? null;
    }
    if (body.receiptSaved !== undefined) {
      data.receiptSaved = optionalBoolean(body.receiptSaved, "receiptSaved");
    }
    if (body.taxDeductible !== undefined) {
      data.taxDeductible = optionalEnum(
        body.taxDeductible,
        ["yes", "no", "partial", "unknown"],
        "taxDeductible"
      );
    }
    // ── End validation ──────────────────────────────────────────────────

    const oldRecord = await prisma.transaction.findUnique({ where: { id } });
    const transaction = await prisma.transaction.update({ where: { id }, data });

    if (oldRecord) {
      const changes = diffChanges(
        oldRecord as unknown as Record<string, unknown>,
        transaction as unknown as Record<string, unknown>,
        ["type", "amount", "description", "category", "date", "projectId", "recurring", "notes", "receiptSaved", "taxDeductible"]
      );
      if (Object.keys(changes).length > 0) {
        logAudit("transaction", id, "update", changes);
      }
    }

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
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
    const oldRecord = await prisma.transaction.findUnique({ where: { id } });
    await prisma.transaction.delete({ where: { id } });

    if (oldRecord) {
      logAudit("transaction", id, "delete", {
        type: oldRecord.type,
        amount: oldRecord.amount,
        description: oldRecord.description,
        category: oldRecord.category,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
