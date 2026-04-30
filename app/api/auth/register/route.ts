export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const [{ prisma }, { hashPassword, createSession }, { sessionCookie }, { rateLimit }, { recordReferralAudit }, { getClientIp }] =
      await Promise.all([
        import("@/lib/prisma"),
        import("@/lib/auth"),
        import("@/lib/jwt"),
        import("@/lib/rateLimit"),
        import("@/lib/referralEngine"),
        import("@/lib/getClientIp"),
      ]);

    const clientIp = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "";
    const rl = rateLimit(getClientIp(req), {
      windowMs: 60_000,
      max: 6,
    });
    if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

    const body = await req.json();
    const { name, email, password } = body;
    const referralCode = String(body?.referralCode || "").trim();

    if (!name || !email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const normalizedEmail = String(email).trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!emailOk) return NextResponse.json({ error: "Invalid email format" }, { status: 400 });

    const trimmedName = String(name).trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      return NextResponse.json({ error: "Invalid name length" }, { status: 400 });
    }

    const passwordValue = String(password);
    if (passwordValue.length < 8 || passwordValue.length > 128) {
      return NextResponse.json({ error: "Password must be between 8 and 128 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await prisma.user.findFirst({
        where: { referralCode },
        select: { id: true },
      });

      if (!referrer) {
        return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
      }
      referrerId = referrer.id;
    }

    const hashed = await hashPassword(passwordValue);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { name: trimmedName, email: normalizedEmail, password: hashed },
      });

      if (referrerId) {
        await tx.referral.create({
          data: {
            referrerId,
            referredUserId: createdUser.id,
            status: "pending",
            rewardStatus: "pending",
          },
        });
      }

      return createdUser;
    });

    if (referrerId) {
      try {
        await recordReferralAudit({
          referrerId,
          referredUserId: user.id,
          ip: clientIp,
          userAgent,
        });
      } catch (auditError) {
        console.error("Referral audit record failed:", auditError);
      }
    }

    const token = await createSession(user.id);

    const res = NextResponse.json({ ok: true });
    res.headers.append("Set-Cookie", sessionCookie(token));
    return res;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
