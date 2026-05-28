import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  ValidationError,
  requireNumber,
  requireDate,
  optionalString,
  optionalEnum,
} from "@/lib/validate";

export async function GET() {
  try {
    const distributions = await prisma.distribution.findMany({
      orderBy: { date: "desc" },
    });
    return NextResponse.json(distributions);
  } catch (error) {
    console.error("GET /api/distributions error:", error);
    return NextResponse.json({ error: "Failed to fetch distributions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const date = requireDate(body.date, "date");
    const type = optionalEnum(
      body.type,
      ["quarterly", "annual", "special"],
      "type"
    ) ?? "quarterly";
    const llcNetProfit = requireNumber(body.llcNetProfit, "llcNetProfit", { allowZero: true });
    const partner1Share = requireNumber(body.partner1Share, "partner1Share", { allowZero: true });
    const partner2Share = requireNumber(body.partner2Share, "partner2Share", { allowZero: true });
    const method = optionalEnum(
      body.method,
      ["bank_transfer", "check"],
      "method"
    ) ?? null;
    const approvedBy = optionalString(body.approvedBy, "approvedBy") ?? null;
    const notes = optionalString(body.notes, "notes") ?? null;
    // ── End validation ──────────────────────────────────────────────────

    const dist = await prisma.distribution.create({
      data: {
        date,
        type,
        llcNetProfit,
        partner1Share,
        partner2Share,
        method,
        approvedBy,
        notes,
      },
    });

    logAudit("distribution", dist.id, "create", {
      type: dist.type,
      llcNetProfit: dist.llcNetProfit,
      partner1Share: dist.partner1Share,
      partner2Share: dist.partner2Share,
    });

    return NextResponse.json(dist, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/distributions error:", error);
    return NextResponse.json({ error: "Failed to create distribution" }, { status: 500 });
  }
}
