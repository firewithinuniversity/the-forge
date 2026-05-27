import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let config = await prisma.taxConfig.findFirst();
  if (!config) {
    config = await prisma.taxConfig.create({ data: {} });
  }
  return NextResponse.json(config);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  let config = await prisma.taxConfig.findFirst();
  if (!config) {
    config = await prisma.taxConfig.create({ data: body });
  } else {
    config = await prisma.taxConfig.update({ where: { id: config.id }, data: body });
  }
  return NextResponse.json(config);
}
