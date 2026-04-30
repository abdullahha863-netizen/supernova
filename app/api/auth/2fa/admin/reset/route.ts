import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/adminAuth";
import {
  progressiveRateLimit,
  registerProgressiveRateLimitFailure,
  resetProgressiveRateLimit,
} from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

// Admin reset endpoint — protected by ADMIN_KEY environment variable.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limitKey = `progressive:2fa-admin-reset:${ip}`;
  const progressive = progressiveRateLimit(limitKey);
  if (!progressive.ok) {
    const response = NextResponse.json({ error: "Too many failed attempts" }, { status: 429 });
    response.headers.set("Retry-After", String(Math.ceil((progressive.retryAfter ?? 0) / 1000)));
    return response;
  }

  if (!isAdminRequest(req)) {
    const failure = registerProgressiveRateLimitFailure(limitKey);
    if (failure.blocked) {
      const response = NextResponse.json({ error: "Too many failed attempts" }, { status: 429 });
      response.headers.set("Retry-After", String(Math.ceil(failure.retryAfter / 1000)));
      return response;
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await req.json();
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (normalizedUserId.length < 6) {
    return NextResponse.json({ error: "User ID looks too short" }, { status: 400 });
  }

  // Disable and remove secret
  const result = await prisma.twoFactor.deleteMany({ where: { userId: normalizedUserId } });
  resetProgressiveRateLimit(limitKey);

  return NextResponse.json({ ok: true, resetCount: result.count });
}
