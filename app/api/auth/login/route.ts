import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";

function makeToken(password: string): string {
  return createHmac("sha256", "forge-auth-secret")
    .update(password)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const expected = process.env.FORGE_PASSWORD ?? "forge2024";

    if (password !== expected) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    const token = makeToken(password);

    const response = NextResponse.json({ success: true });
    response.cookies.set("forge-auth", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
