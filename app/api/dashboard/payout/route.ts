import { NextResponse } from "next/server";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { updatePayoutSettings } from "@/lib/dashboardDb";
import { rateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { verifyTotp } from "@/lib/totp";
import { getClientIp } from "@/lib/getClientIp";
import { buildPayoutUpdatedEmail } from "@/lib/emailTemplates";

async function logPayoutSecurityEvent(userId: string, success: boolean, reason: string, ip: string) {
  await prisma.securityEvent.create({
    data: {
      userId,
      eventType: "payout_address_update",
      success,
      reason,
      ip,
    },
  });
}

export async function PUT(req: Request) {
  try {
    const ip = getClientIp(req);
    const userId = await getDashboardUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`${ip}:${userId}:dashboard-payout-update`, {
      windowMs: 60_000,
      max: 10,
    });
    if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

    const body = await req.json();
    const payoutAddress = String(body?.payoutAddress || "").trim();
    const minPayout = Number(body?.minPayout);
    const currentPassword = String(body?.currentPassword || "");
    const twoFactorCode = String(body?.twoFactorCode || "").trim();

    if (!/^kaspa:[a-z0-9]{20,}$/i.test(payoutAddress)) {
      await logPayoutSecurityEvent(userId, false, "invalid_kaspa_address", ip);
      return NextResponse.json({ error: "Invalid Kaspa wallet address." }, { status: 400 });
    }

    if (!currentPassword.trim()) {
      await logPayoutSecurityEvent(userId, false, "missing_current_password", ip);
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, password: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      await logPayoutSecurityEvent(userId, false, "invalid_current_password", ip);
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    }

    const twoFactor = await prisma.twoFactor.findUnique({ where: { userId }, select: { enabled: true, type: true, secret: true } });
    if (twoFactor?.enabled) {
      if (!twoFactorCode) {
        await logPayoutSecurityEvent(userId, false, "missing_2fa_code", ip);
        return NextResponse.json({ error: "2FA code is required." }, { status: 400 });
      }

      if (twoFactor.type === "totp") {
        if (!twoFactor.secret || !verifyTotp(twoFactorCode, twoFactor.secret)) {
          await logPayoutSecurityEvent(userId, false, "invalid_2fa_code", ip);
          return NextResponse.json({ error: "Invalid 2FA code." }, { status: 401 });
        }
      } else if (twoFactor.type === "email") {
        const vt = await prisma.verificationToken.findFirst({
          where: { userId, token: twoFactorCode, type: "email_otp" },
          orderBy: { createdAt: "desc" },
        });
        if (!vt || vt.expiresAt < new Date()) {
          await logPayoutSecurityEvent(userId, false, "invalid_email_otp", ip);
          return NextResponse.json({ error: "Invalid or expired 2FA code." }, { status: 401 });
        }
        await prisma.verificationToken.deleteMany({ where: { id: vt.id } });
      }
    }

    const result = await updatePayoutSettings(userId, payoutAddress, minPayout);
    if (!result.ok) {
      await logPayoutSecurityEvent(userId, false, String(result.error || "validation_failed"), ip);
      return NextResponse.json({ error: result.error }, { status: "status" in result ? result.status : 400 });
    }

    await logPayoutSecurityEvent(userId, true, "updated", ip);
    try {
      const emailContent = buildPayoutUpdatedEmail({ payoutAddress, minPayout, ip });
      await sendEmail(user.email, "Payout Address Updated", emailContent.html, emailContent.text);
    } catch (mailError) {
      console.error("[dashboard/payout][email]", mailError);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dashboard/payout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
