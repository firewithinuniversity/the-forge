import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";

function makeToken(password: string): string {
  return createHmac("sha256", "forge-auth-secret")
    .update(password)
    .digest("hex");
}

/* ── Rate limiter: 5 attempts per IP per 60-second window ── */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_ATTEMPTS = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of attempts) {
    if (now > entry.resetAt) attempts.delete(ip);
  }
}, 5 * 60_000);

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in 1 minute." },
        { status: 429 }
      );
    }

    const { password } = await request.json();
    const expected = process.env.FORGE_PASSWORD ?? "forge2024";

    if (password !== expected) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    const token = makeToken(password);

    const response = NextResponse.json({ success: true });
    response.cookies.set("forge-auth", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
