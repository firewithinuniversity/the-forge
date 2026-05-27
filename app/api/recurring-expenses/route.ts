import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") !== "false";

  const expenses = await prisma.recurringExpense.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { service: "asc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  const body = await request.json();
  const expense = await prisma.recurringExpense.create({
    data: {
      service: body.service,
      category: body.category,
      monthlyCost: parseFloat(body.monthlyCost) || 0,
      annualCost: body.annualCost ? parseFloat(body.annualCost) : null,
      billingCycle: body.billingCycle || "monthly",
      nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(expense, { status: 201 });
}
