import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  requireString,
  optionalString,
  validateEnum,
  maxLength,
} from "@/lib/validate";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = maxLength(requireString(body.name, "name"), 100, "name");
    const type = validateEnum(body.type, ["income", "expense"], "type");
    const icon = optionalString(body.icon, "icon");
    if (icon !== undefined) maxLength(icon, 50, "icon");

    let color = optionalString(body.color, "color") ?? "#A1A1AA";
    if (color !== "#A1A1AA" && !HEX_COLOR_RE.test(color)) {
      throw new ValidationError("color must be a valid hex color (e.g. #FF00AA)");
    }

    const category = await prisma.category.create({
      data: { name, type, color, icon: icon || null },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/categories error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
