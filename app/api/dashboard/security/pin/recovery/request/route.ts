import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";
import { getClientIp } from "@/lib/getClientIp";
import { buildPinRecoveryEmail } from "@/lib/emailTemplates";

export async function POST(req: Request) {
  const userId = await getDashboardUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const rl = rateLimit(`${ip}:${userId}:dashboard-pin-recovery-request`, {
    windowMs: 10 * 60_000,
    max: 3,
  });
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) {
    return NextResponse.json({ error: "No account email found for recovery." }, { status: 400 });
  }

  await prisma.verificationToken.deleteMany({ where: { userId, type: "pin_reset_recovery" } });

  const code = randomBytes(8).toString("hex").slice(0, 8).toUpperCase();
  const expires = new Date(Date.now() + 10 * 60_000);

  await prisma.verificationToken.create({
    data: {
      token: code,
      userId,
      type: "pin_reset_recovery",
      expiresAt: expires,
    },
  });

  const emailContent = buildPinRecoveryEmail(code);
  await sendEmail(user.email, "Supernova PIN recovery code", emailContent.html, emailContent.text);

  await prisma.securityEvent.create({
    data: {
      userId,
      eventType: "pin_recovery_requested",
      success: true,
      reason: "recovery_code_sent",
      ip,
    },
  });

  return NextResponse.json({ ok: true, message: "Recovery code sent to your account email." });
}
