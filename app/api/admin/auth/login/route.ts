import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isValidAdminKey } from "@/lib/adminAuth";
import {
  progressiveRateLimit,
  registerProgressiveRateLimitFailure,
  resetProgressiveRateLimit,
} from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limitKey = `progressive:admin-auth-login:${ip}`;
  const progressive = progressiveRateLimit(limitKey);
  if (!progressive.ok) {
    const response = NextResponse.json({ ok: false, error: "Too many failed attempts" }, { status: 429 });
    response.headers.set("Retry-After", String(Math.ceil((progressive.retryAfter ?? 0) / 1000)));
    return response;
  }

  const body = await request.json().catch(() => null);
  const adminKey = String(body?.adminKey || "").trim();

  if (!isValidAdminKey(adminKey)) {
    const failure = registerProgressiveRateLimitFailure(limitKey);
    if (failure.blocked) {
      const response = NextResponse.json({ ok: false, error: "Too many failed attempts" }, { status: 429 });
      response.headers.set("Retry-After", String(Math.ceil(failure.retryAfter / 1000)));
      return response;
    }
    return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
  }

  resetProgressiveRateLimit(limitKey);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: adminKey,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
