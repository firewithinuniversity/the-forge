import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// HMAC-SHA256 via Web Crypto API (works on both Edge and Node.js)
async function makeToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode("forge-auth-secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(password));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Known bot User-Agent patterns
const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /scrape/i, /scan/i,
  /curl/i, /wget/i, /python-requests/i, /httpx/i,
  /go-http-client/i, /java\//i, /libwww/i, /headless/i,
];

function isBot(ua: string | null): boolean {
  if (!ua) return true;
  return BOT_PATTERNS.some((p) => p.test(ua));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static/public files through (no auth, no bot check)
  if (pathname === "/robots.txt" || pathname === "/manifest.json" || pathname === "/icon.svg") {
    return NextResponse.next();
  }

  // Block bots on all non-public paths
  const userAgent = request.headers.get("user-agent");
  if (isBot(userAgent) && pathname !== "/login" && !pathname.startsWith("/_next")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Skip auth for login page, static assets, auth API, live feed, PWA files, and cron
  if (
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/icon.svg" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/finance/live-feed" ||
    pathname === "/api/cron/daily"
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("forge-auth");
  const password = process.env.FORGE_PASSWORD ?? "forge2024";
  const expectedToken = await makeToken(password);

  const isAuthenticated = cookie?.value === expectedToken;

  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Security headers on all authenticated responses
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
