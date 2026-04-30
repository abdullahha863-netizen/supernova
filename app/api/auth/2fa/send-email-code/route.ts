export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const [
      { prisma },
      { sendEmail },
      { getUserIdFromRequestSession },
      { rateLimit },
      { getClientIp },
      { buildTwoFactorCodeEmail },
      { verifySession },
    ] = await Promise.all([
      import("@/lib/prisma"),
      import("@/lib/email"),
      import("@/lib/auth"),
      import("@/lib/rateLimit"),
      import("@/lib/getClientIp"),
      import("@/lib/emailTemplates"),
      import("@/lib/jwt"),
    ]);

    async function resolveUserId(challengeToken?: string) {
      const sessionUserId = await getUserIdFromRequestSession(req);
      if (sessionUserId) {
        return sessionUserId;
      }

      if (!challengeToken) {
        return null;
      }

      const challenge = verifySession(challengeToken);
      if (!challenge || challenge.purpose !== "2fa_login" || typeof challenge.sub !== "string") {
        return null;
      }

      return challenge.sub;
    }

    const body = await req.json().catch(() => ({}));
    const challengeToken = typeof body?.challengeToken === "string" ? body.challengeToken : undefined;
    const userId = await resolveUserId(challengeToken);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const twoFactor = await prisma.twoFactor.findUnique({
      where: { userId },
      select: { enabled: true, type: true },
    });
    if (!twoFactor?.enabled || twoFactor.type !== "email") {
      return NextResponse.json({ error: "Email 2FA not enabled" }, { status: 400 });
    }

    const rl = rateLimit(`${getClientIp(req)}:${userId}:2fa-email-code`, {
      windowMs: 10 * 60_000,
      max: 5,
    });
    if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 1000 * 60 * 10);

    await prisma.verificationToken.deleteMany({ where: { userId, type: "email_otp" } });

    await prisma.verificationToken.create({
      data: { token: code, userId, type: "email_otp", expiresAt: expires },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const emailContent = buildTwoFactorCodeEmail(code);
      await sendEmail(user.email, "Your Supernova sign-in code", emailContent.html, emailContent.text);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[2fa][send-email-code]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
