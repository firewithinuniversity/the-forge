import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const projectId = searchParams.get("projectId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (type && (type === "income" || type === "expense")) where.type = type;
    if (category) where.category = category;
    if (projectId) where.projectId = projectId;
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from);
      if (to) (where.date as Record<string, unknown>).lte = new Date(to);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, amount, description, category, date, projectId, recurring, notes, receiptSaved, taxDeductible } = body;

    if (!type || (type !== "income" && type !== "expense")) {
      return NextResponse.json({ error: "Type must be 'income' or 'expense'" }, { status: 400 });
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount,
        description: description.trim(),
        category,
        date: date ? new Date(date) : new Date(),
        projectId: projectId || null,
        recurring: recurring || false,
        notes: notes?.trim() || null,
        receiptSaved: receiptSaved || false,
        taxDeductible: taxDeductible || "unknown",
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
