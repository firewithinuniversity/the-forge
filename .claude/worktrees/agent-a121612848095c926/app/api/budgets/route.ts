import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  requireNumber,
} from "@/lib/validate";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    if (!monthParam || !yearParam) {
      return NextResponse.json(
        { error: "month and year query parameters are required" },
        { status: 400 }
      );
    }

    const month = parseInt(monthParam, 10);
    const year = parseInt(yearParam, 10);

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "month must be between 1 and 12" },
        { status: 400 }
      );
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "year must be between 2000 and 2100" },
        { status: 400 }
      );
    }

    // Fetch all budgets for the given month/year
    const budgets = await prisma.budget.findMany({
      where: { month, year },
    });

    // Fetch all categories so we can join name + color
    const categories = await prisma.category.findMany();
    const categoryMap = new Map(
      categories.map((c) => [c.id, { name: c.name, color: c.color }])
    );

    // Calculate actual spending per category for this month/year
    // Build date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1); // first day of next month

    const transactions = await prisma.transaction.findMany({
      where: {
        type: "expense",
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        category: true,
        amount: true,
      },
    });

    // Group transactions by category name, then map to categoryId
    // Since transactions store category by name, we need to reverse-map
    const categoryNameToId = new Map(
      categories.map((c) => [c.name, c.id])
    );

    const spendingByCategoryId = new Map<string, number>();
    for (const tx of transactions) {
      const catId = categoryNameToId.get(tx.category);
      if (catId) {
        spendingByCategoryId.set(
          catId,
          (spendingByCategoryId.get(catId) || 0) + tx.amount
        );
      }
    }

    // Build response
    const result = budgets.map((b) => {
      const cat = categoryMap.get(b.categoryId);
      const actualSpent = spendingByCategoryId.get(b.categoryId) || 0;
      const percentUsed =
        b.amount > 0 ? Math.round((actualSpent / b.amount) * 1000) / 10 : 0;

      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: cat?.name || "Unknown",
        categoryColor: cat?.color || "#9090A0",
        budgetAmount: b.amount,
        actualSpent: Math.round(actualSpent * 100) / 100,
        percentUsed,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/budgets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const categoryId = requireString(body.categoryId, "categoryId");
    const amount = requireNumber(body.amount, "amount");
    const month = requireNumber(body.month, "month", { min: 1, max: 12 });
    const year = requireNumber(body.year, "year", { min: 2000, max: 2100 });

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Upsert: update if same category+month+year exists, otherwise create
    const budget = await prisma.budget.upsert({
      where: {
        categoryId_month_year: { categoryId, month, year },
      },
      update: { amount },
      create: { categoryId, amount, month, year },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/budgets error:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}
