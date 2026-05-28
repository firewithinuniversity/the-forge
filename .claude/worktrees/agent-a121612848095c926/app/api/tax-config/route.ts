import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ValidationError, optionalNumber, optionalString } from "@/lib/validate";

export async function GET() {
  let config = await prisma.taxConfig.findFirst();
  if (!config) {
    config = await prisma.taxConfig.create({ data: {} });
  }
  return NextResponse.json(config);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    // ── Input validation ────────────────────────────────────────────────
    const data: Record<string, unknown> = {};

    if (body.federalTaxRate !== undefined) {
      data.federalTaxRate = optionalNumber(body.federalTaxRate, "federalTaxRate", { min: 0, max: 1 });
    }
    if (body.selfEmploymentRate !== undefined) {
      data.selfEmploymentRate = optionalNumber(body.selfEmploymentRate, "selfEmploymentRate", { min: 0, max: 1 });
    }
    if (body.seDeduction !== undefined) {
      data.seDeduction = optionalNumber(body.seDeduction, "seDeduction", { min: 0, max: 1 });
    }
    if (body.stateTaxRate !== undefined) {
      data.stateTaxRate = optionalNumber(body.stateTaxRate, "stateTaxRate", { min: 0, max: 1 });
    }
    if (body.ownershipSplit !== undefined) {
      data.ownershipSplit = optionalNumber(body.ownershipSplit, "ownershipSplit", { min: 0, max: 1 });
    }
    if (body.qbiDeductionRate !== undefined) {
      data.qbiDeductionRate = optionalNumber(body.qbiDeductionRate, "qbiDeductionRate", { min: 0, max: 1 });
    }
    if (body.taxReserveRate !== undefined) {
      data.taxReserveRate = optionalNumber(body.taxReserveRate, "taxReserveRate", { min: 0, max: 1 });
    }
    if (body.burnRateThreshold !== undefined) {
      data.burnRateThreshold = optionalNumber(body.burnRateThreshold, "burnRateThreshold", { min: 0 });
    }
    if (body.partner1Name !== undefined) {
      data.partner1Name = optionalString(body.partner1Name, "partner1Name");
    }
    if (body.partner2Name !== undefined) {
      data.partner2Name = optionalString(body.partner2Name, "partner2Name");
    }
    if (body.stateName !== undefined) {
      data.stateName = optionalString(body.stateName, "stateName");
    }
    // ── End validation ──────────────────────────────────────────────────

    let config = await prisma.taxConfig.findFirst();
    if (!config) {
      config = await prisma.taxConfig.create({ data });
    } else {
      config = await prisma.taxConfig.update({ where: { id: config.id }, data });
    }
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/tax-config error:", error);
    return NextResponse.json({ error: "Failed to update tax config" }, { status: 500 });
  }
}
