export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const [{ prisma }, { verifyPassword, createSession }, { sessionCookie, signSession }, { rateLimit }, { getClientIp }] =
      await Promise.all([
        import("@/lib/prisma"),
        import("@/lib/auth"),
        import("@/lib/jwt"),
        import("@/lib/rateLimit"),
        import("@/lib/getClientIp"),
      ]);

    const isDev = process.env.NODE_ENV !== "production";
    const rl = rateLimit(getClientIp(req), { windowMs: 60_000, max: 8 });
    if (!rl.ok) {
      if (isDev) console.log("[auth/login] API error returned:", "Rate limit");
      return NextResponse.json({ error: "Rate limit" }, { status: 429 });
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      if (isDev) console.log("[auth/login] API error returned:", "Missing fields");
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (isDev) console.log("[auth/login] submitted email:", normalizedEmail);

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (isDev) console.log("[auth/login] user found:", Boolean(user));
    if (!user) {
      if (isDev) console.log("[auth/login] password matched:", false);
      if (isDev) console.log("[auth/login] API error returned:", "Invalid credentials");
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const userPassword = String(user.password || "");
    const looksLikeBcrypt = /^\$2[aby]\$\d{2}\$/.test(userPassword);
    const ok = looksLikeBcrypt ? await verifyPassword(password, userPassword) : String(password) === userPassword;
    if (isDev) console.log("[auth/login] password matched:", ok);
    if (!ok) {
      if (isDev) console.log("[auth/login] API error returned:", "Invalid credentials");
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.twoFactorEnabled) {
      const twoFactor = await prisma.twoFactor.findUnique({
        where: { userId: user.id },
        select: { type: true, enabled: true },
      });
      if (!twoFactor?.enabled || (twoFactor.type !== "totp" && twoFactor.type !== "email")) {
        if (isDev) console.log("[auth/login] API error returned:", "2FA not configured");
        return NextResponse.json({ error: "2FA not configured" }, { status: 400 });
      }

      // challengeToken currently travels via JSON for the second step of login.
      // A future hardening pass could move this challenge into an HttpOnly cookie or server-side nonce flow.
      const challengeToken = signSession({ sub: user.id, purpose: "2fa_login" }, "10m");
      return NextResponse.json({ ok: true, twoFactor: true, challengeToken, twoFactorType: twoFactor.type });
    }

    const token = await createSession(user.id);
    const res = NextResponse.json({ ok: true });
    res.headers.append("Set-Cookie", sessionCookie(token));
    return res;
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
