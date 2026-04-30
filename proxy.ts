import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/jwt";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ADMIN_COOKIE_NAME = "sn_admin";
const SESSION_COOKIE_NAME = "sn_auth";

function isAdminAuthenticated(request: NextRequest) {
  const adminCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value || "";
  return Boolean(process.env.ADMIN_KEY) && adminCookie === process.env.ADMIN_KEY;
}

function isDashboardAuthenticated(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value || "";
  if (!sessionToken) return false;

  const payload = verifySession(sessionToken);
  return Boolean(payload && typeof payload.sub === "string");
}

function isCrossSite(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host !== host;
    } catch {
      return true;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host !== host;
    } catch {
      return true;
    }
  }

  return false;
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/admin/login")) {
    if (!isAdminAuthenticated(request)) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!isDashboardAuthenticated(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (UNSAFE_METHODS.has(request.method) && request.nextUrl.pathname.startsWith("/api/")) {
    if (isCrossSite(request)) {
      return NextResponse.json({ error: "CSRF blocked" }, { status: 403 });
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "connect-src 'self' https: ws: wss: https://api.stripe.com https://r.stripe.com https://m.stripe.network https://js.stripe.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
