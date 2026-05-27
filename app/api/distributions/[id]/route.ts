import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = await prisma.distribution.update({
    where: { id },
    data: {
      date: body.date ? new Date(body.date) : undefined,
      type: body.type,
      llcNetProfit: body.llcNetProfit,
      partner1Share: body.partner1Share,
      partner2Share: body.partner2Share,
      method: body.method,
      notes: body.notes,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.distribution.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
