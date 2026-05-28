import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const recent = searchParams.get("recent");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50;

    if (entityType && entityId) {
      const logs = await prisma.auditLog.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(logs);
    }

    if (recent === "true") {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json(logs);
    }

    return NextResponse.json(
      { error: "Provide entityType+entityId or recent=true" },
      { status: 400 }
    );
  } catch (error) {
    console.error("GET /api/audit-log error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
