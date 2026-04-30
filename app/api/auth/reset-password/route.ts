export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const [{ prisma }, { hashPassword }, { rateLimit }, { getClientIp }] = await Promise.all([
      import("@/lib/prisma"),
      import("@/lib/auth"),
      import("@/lib/rateLimit"),
      import("@/lib/getClientIp"),
    ]);

    const rl = rateLimit(getClientIp(req), { windowMs: 10 * 60_000, max: 8 });
    if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const passwordValue = String(password);
    if (passwordValue.length < 8 || passwordValue.length > 128) {
      return NextResponse.json({ error: "Password must be between 8 and 128 characters" }, { status: 400 });
    }

    const vt = await prisma.verificationToken.findUnique({ where: { token } });
    if (!vt || vt.type !== "password_reset" || vt.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const hashed = await hashPassword(passwordValue);
    await prisma.$transaction([
      prisma.user.update({ where: { id: vt.userId }, data: { password: hashed } }),
      prisma.verificationToken.deleteMany({ where: { userId: vt.userId, type: "password_reset" } }),
      prisma.session.deleteMany({ where: { userId: vt.userId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth][reset-password]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
