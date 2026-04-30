import { NextResponse } from "next/server";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

export async function POST(req: Request) {
  const userId = await getDashboardUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const rl = rateLimit(`${ip}:${userId}:dashboard-pin-recovery-verify`, {
    windowMs: 10 * 60_000,
    max: 8,
  });
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json();
  const code = String(body?.code || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Recovery code is required." }, { status: 400 });

  const record = await prisma.verificationToken.findFirst({
    where: {
      userId,
      token: code,
      type: "pin_reset_recovery",
    },
  });

  if (!record || record.expiresAt < new Date()) {
    await prisma.securityEvent.create({
      data: {
        userId,
        eventType: "pin_recovery_verify_failed",
        success: false,
        reason: "invalid_or_expired_code",
        ip,
      },
    });
    return NextResponse.json({ error: "Invalid or expired recovery code." }, { status: 400 });
  }

  await prisma.verificationToken.deleteMany({ where: { id: record.id } });

  const recoveryUntil = new Date(Date.now() + 10 * 60_000);
  await prisma.emergencySecurity.updateMany({
    where: { userId },
    data: {
      pinResetFailedAttempts: 0,
      pinResetLockoutUntil: null,
      pinResetRecoveryUntil: recoveryUntil,
      updatedAt: new Date(),
    },
  });

  await prisma.securityEvent.create({
    data: {
      userId,
      eventType: "pin_recovery_verified",
      success: true,
      reason: "recovery_window_opened",
      ip,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Recovery verified. You can now reset your PIN for the next 10 minutes.",
    recoveryUntil: recoveryUntil.toISOString(),
  });
}
