import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { takeRateLimit } from "@/lib/rate-limit";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const mutating = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    const origin = request.headers.get("origin");
    const crossSite = request.headers.get("sec-fetch-site") === "cross-site";
    if (mutating && (crossSite || (origin && origin !== request.nextUrl.origin))) {
      return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
    }
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const client = forwarded || request.headers.get("x-real-ip") || "unknown";
    const login = request.nextUrl.pathname === "/api/auth/login";
    const rate = takeRateLimit(`${login ? "login" : "api"}:${client}`, login ? 10 : 300, 60_000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))), "RateLimit-Limit": String(rate.limit), "RateLimit-Remaining": "0", "RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)) } });
    const response = NextResponse.next();
    response.headers.set("RateLimit-Limit", String(rate.limit));
    response.headers.set("RateLimit-Remaining", String(rate.remaining));
    response.headers.set("RateLimit-Reset", String(Math.ceil(rate.resetAt / 1000)));
    return response;
  }
  if (!request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*", "/dashboard/:path*", "/livestock/:path*", "/health/:path*", "/breeding/:path*", "/pregnancy/:path*", "/alerts/:path*", "/activity/:path*", "/reports/:path*", "/settings/:path*", "/manage-users/:path*"] };