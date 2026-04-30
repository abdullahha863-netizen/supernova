import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import {
  progressiveRateLimit,
  registerProgressiveRateLimitFailure,
  resetProgressiveRateLimit,
} from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limitKey = `progressive:2fa-setup-verify:${ip}`;
  const progressive = progressiveRateLimit(limitKey);
  if (!progressive.ok) {
    const response = NextResponse.json({ error: "Too many failed attempts" }, { status: 429 });
    response.headers.set("Retry-After", String(Math.ceil((progressive.retryAfter ?? 0) / 1000)));
    return response;
  }

  const { code } = await req.json();
  const userId = await getUserIdFromRequestSession(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const two = await prisma.twoFactor.findUnique({ where: { userId } });
  if (!two || !two.secret) return NextResponse.json({ error: "2FA not configured" }, { status: 400 });

  const ok = verifyTotp(code, two.secret);
  if (!ok) {
    const failure = registerProgressiveRateLimitFailure(limitKey);
    if (failure.blocked) {
      const response = NextResponse.json({ error: "Too many failed attempts" }, { status: 429 });
      response.headers.set("Retry-After", String(Math.ceil(failure.retryAfter / 1000)));
      return response;
    }
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  await prisma.twoFactor.update({ where: { userId }, data: { enabled: true } });
  resetProgressiveRateLimit(limitKey);

  return NextResponse.json({ ok: true });
}
