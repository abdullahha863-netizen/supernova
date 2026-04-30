export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const [
      { prisma },
      { randomBytes },
      { sendEmail },
      { getUserIdFromRequestSession },
      { rateLimit },
      { getClientIp },
      { buildAppUrl },
      { buildVerifyEmailEmail },
    ] = await Promise.all([
      import("@/lib/prisma"),
      import("crypto"),
      import("@/lib/email"),
      import("@/lib/auth"),
      import("@/lib/rateLimit"),
      import("@/lib/getClientIp"),
      import("@/lib/appUrl"),
      import("@/lib/emailTemplates"),
    ]);

    const userId = await getUserIdFromRequestSession(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`${getClientIp(req)}:${userId}:verify-email-send`, {
      windowMs: 10 * 60_000,
      max: 5,
    });
    if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

    const token = randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await prisma.verificationToken.deleteMany({ where: { userId, type: "email_verification" } });

    await prisma.verificationToken.create({ data: { token, userId, type: "email_verification", expiresAt: expires } });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const link = buildAppUrl(req, "/verify-email", { token });
      const emailContent = buildVerifyEmailEmail(link);
      await sendEmail(user.email, "Verify your Supernova email", emailContent.html, emailContent.text);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth][verify-email-send]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
