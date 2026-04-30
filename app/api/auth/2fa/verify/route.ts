import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";
import { createSession } from "@/lib/auth";
import { sessionCookie, verifySession } from "@/lib/jwt";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

export async function POST(req: Request) {
  const { challengeToken, code, type } = await req.json();
  if (!challengeToken || !code || !type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (type !== "totp" && type !== "email") return NextResponse.json({ error: "Unknown 2FA type" }, { status: 400 });

  const challenge = verifySession(challengeToken);
  if (!challenge || challenge.purpose !== "2fa_login" || typeof challenge.sub !== "string") {
    return NextResponse.json({ error: "Invalid or expired challenge" }, { status: 401 });
  }

  const userId = challenge.sub;

  const rl = rateLimit(`${getClientIp(req)}:${userId}:2fa-verify`, {
    windowMs: 10 * 60_000,
    max: 8,
  });
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const two = await prisma.twoFactor.findUnique({ where: { userId } });
  if (!two) return NextResponse.json({ error: "2FA not configured" }, { status: 400 });

  if (type === "totp") {
    if (!two.secret) return NextResponse.json({ error: "TOTP not enabled" }, { status: 400 });
    const ok = verifyTotp(code, two.secret);
    if (!ok) return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    const token = await createSession(userId);
    const res = NextResponse.json({ ok: true });
    res.headers.append("Set-Cookie", sessionCookie(token));
    return res;
  }

  if (type === "email") {
    // find verification token matching code
    const vt = await prisma.verificationToken.findFirst({ where: { userId, token: code, type: "email_otp" } });
    if (!vt || vt.expiresAt < new Date()) return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    await prisma.verificationToken.deleteMany({ where: { id: vt.id } });
    const token = await createSession(userId);
    const res = NextResponse.json({ ok: true });
    res.headers.append("Set-Cookie", sessionCookie(token));
    return res;
  }

  return NextResponse.json({ error: "Unknown 2FA type" }, { status: 400 });
}
