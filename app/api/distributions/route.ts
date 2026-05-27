import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const distributions = await prisma.distribution.findMany({
    orderBy: { date: "desc" },
  });
  return NextResponse.json(distributions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const dist = await prisma.distribution.create({
    data: {
      date: new Date(body.date),
      type: body.type || "quarterly",
      llcNetProfit: parseFloat(body.llcNetProfit),
      partner1Share: parseFloat(body.partner1Share),
      partner2Share: parseFloat(body.partner2Share),
      method: body.method || null,
      approvedBy: body.approvedBy || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(dist, { status: 201 });
}
