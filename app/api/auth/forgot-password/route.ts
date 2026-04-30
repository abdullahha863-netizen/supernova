export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const [{ prisma }, { randomBytes }, { sendEmail }, { rateLimit }, { getClientIp }, { buildAppUrl }, { buildResetPasswordEmail }] =
      await Promise.all([
        import("@/lib/prisma"),
        import("crypto"),
        import("@/lib/email"),
        import("@/lib/rateLimit"),
        import("@/lib/getClientIp"),
        import("@/lib/appUrl"),
        import("@/lib/emailTemplates"),
      ]);

    const rl = rateLimit(getClientIp(req), { windowMs: 10 * 60_000, max: 5 });
    if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
    const normalizedEmail = String(email).trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!emailOk) return NextResponse.json({ ok: true });

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return NextResponse.json({ ok: true });

    const token = randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60);

    await prisma.verificationToken.deleteMany({ where: { userId: user.id, type: "password_reset" } });

    await prisma.verificationToken.create({ data: { token, userId: user.id, type: "password_reset", expiresAt: expires } });

    const link = buildAppUrl(req, "/reset-password", { token });
    const emailContent = buildResetPasswordEmail(link);
    await sendEmail(user.email, "Reset your Supernova password", emailContent.html, emailContent.text);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth][forgot-password]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
