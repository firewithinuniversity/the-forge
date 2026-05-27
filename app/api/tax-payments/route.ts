import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();

  const payments = await prisma.taxPayment.findMany({
    where: { year },
    orderBy: [{ quarter: "asc" }, { type: "asc" }],
  });
  return NextResponse.json(payments);
}

export async function POST(request: Request) {
  const body = await request.json();
  const payment = await prisma.taxPayment.create({
    data: {
      year: parseInt(body.year),
      quarter: parseInt(body.quarter),
      type: body.type,
      amount: parseFloat(body.amount),
      dueDate: new Date(body.dueDate),
      paidDate: body.paidDate ? new Date(body.paidDate) : null,
      paid: body.paid || false,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(payment, { status: 201 });
}
