import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac } from "node:crypto";

function makeToken(password: string): string {
  return createHmac("sha256", "forge-auth-secret")
    .update(password)
    .digest("hex");
}

/* ── Known bot User-Agent patterns ── */
const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /scrape/i, /scan/i,
  /curl/i, /wget/i, /python-requests/i, /httpx/i,
  /go-http-client/i, /java\//i, /libwww/i, /headless/i,
];

function isBot(ua: string | null): boolean {
  if (!ua) return true; // No user-agent = suspicious
  return BOT_PATTERNS.some((p) => p.test(ua));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow robots.txt through (so bots read the "Disallow: /" rule)
  if (pathname === "/robots.txt") {
    return NextResponse.next();
  }

  // Block bots on all non-public paths
  const userAgent = request.headers.get("user-agent");
  if (isBot(userAgent) && pathname !== "/login" && !pathname.startsWith("/_next")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Skip auth for login page, static assets, and auth API routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/finance/live-feed"
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("forge-auth");
  const password = process.env.FORGE_PASSWORD ?? "forge2024";
  const expectedToken = makeToken(password);

  const isAuthenticated = cookie?.value === expectedToken;

  if (!isAuthenticated) {
    // API routes get a 401 JSON response
    if (pathname.startsWith("/api/")) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    // Page routes get redirected to /login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Add security headers to all authenticated responses
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Content-Security-Policy",
    "frame-ancestors 'none'"
  );
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
