import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac } from "node:crypto";

function makeToken(password: string): string {
  return createHmac("sha256", "forge-auth-secret")
    .update(password)
    .digest("hex");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for login page, static assets, and auth API routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth/")
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

  return NextResponse.next();
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
