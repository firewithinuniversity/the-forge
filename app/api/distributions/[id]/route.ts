import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit, diffChanges } from "@/lib/audit";
import {
  ValidationError,
  optionalNumber,
  optionalString,
  optionalDate,
  optionalEnum,
} from "@/lib/validate";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // ── Input validation ────────────────────────────────────────────────
    const data: Record<string, unknown> = {};

    if (body.date !== undefined) {
      data.date = optionalDate(body.date, "date");
    }
    if (body.type !== undefined) {
      data.type = optionalEnum(body.type, ["quarterly", "annual", "special"], "type");
    }
    if (body.llcNetProfit !== undefined) {
      data.llcNetProfit = optionalNumber(body.llcNetProfit, "llcNetProfit");
    }
    if (body.partner1Share !== undefined) {
      data.partner1Share = optionalNumber(body.partner1Share, "partner1Share");
    }
    if (body.partner2Share !== undefined) {
      data.partner2Share = optionalNumber(body.partner2Share, "partner2Share");
    }
    if (body.method !== undefined) {
      data.method = body.method === null
        ? null
        : optionalEnum(body.method, ["bank_transfer", "check"], "method") ?? null;
    }
    if (body.notes !== undefined) {
      data.notes = body.notes === null ? null : optionalString(body.notes, "notes") ?? null;
    }
    // ── End validation ──────────────────────────────────────────────────

    const oldRecord = await prisma.distribution.findUnique({ where: { id } });
    const updated = await prisma.distribution.update({
      where: { id },
      data,
    });

    if (oldRecord) {
      const changes = diffChanges(
        oldRecord as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>,
        ["date", "type", "llcNetProfit", "partner1Share", "partner2Share", "method", "notes"]
      );
      if (Object.keys(changes).length > 0) {
        logAudit("distribution", id, "update", changes);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/distributions/[id] error:", error);
    return NextResponse.json({ error: "Failed to update distribution" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const oldRecord = await prisma.distribution.findUnique({ where: { id } });
    await prisma.distribution.delete({ where: { id } });

    if (oldRecord) {
      logAudit("distribution", id, "delete", {
        type: oldRecord.type,
        llcNetProfit: oldRecord.llcNetProfit,
        partner1Share: oldRecord.partner1Share,
        partner2Share: oldRecord.partner2Share,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/distributions/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete distribution" }, { status: 500 });
  }
}
