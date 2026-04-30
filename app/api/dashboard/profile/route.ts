import { NextResponse } from "next/server";
import { getDashboardUserIdFromRequest, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email";
import { buildAppUrl } from "@/lib/appUrl";
import { buildConfirmNewEmailEmail } from "@/lib/emailTemplates";
import { getClientIp } from "@/lib/getClientIp";
import type { Prisma } from "@prisma/client";
import {
  getShippingProfile,
  normalizeShippingProfile,
  upsertShippingProfile,
  validateShippingProfile,
} from "@/lib/userProfiles";

async function verifyTwoFactorCode(userId: string, code: string) {
  const twoFactor = await prisma.twoFactor.findUnique({
    where: { userId },
    select: { enabled: true, type: true, secret: true },
  });

  if (!twoFactor?.enabled) return { ok: true as const };

  if (!code) {
    return { ok: false as const, status: 400, error: "2FA code is required." };
  }

  if (twoFactor.type === "totp") {
    if (!twoFactor.secret || !verifyTotp(code, twoFactor.secret)) {
      return { ok: false as const, status: 401, error: "Invalid 2FA code." };
    }
    return { ok: true as const };
  }

  const token = await prisma.verificationToken.findFirst({
    where: { userId, token: code, type: "email_otp" },
    orderBy: { createdAt: "desc" },
  });

  if (!token || token.expiresAt < new Date()) {
    return { ok: false as const, status: 401, error: "Invalid or expired 2FA code." };
  }

  await prisma.verificationToken.deleteMany({ where: { id: token.id } });
  return { ok: true as const };
}

type DashboardProfileSelect = Prisma.UserGetPayload<{
  select: { name: true; email: true; twoFactorEnabled: true; referralCode: true };
}>;

export async function GET(req: Request) {
  try {
    const userId = await getDashboardUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rl = rateLimit(`${ip}:${userId}:dashboard-profile-get`, {
      windowMs: 30_000,
      max: 40,
    });
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

    const user = (await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, twoFactorEnabled: true, referralCode: true },
    })) as DashboardProfileSelect | null;
    const shippingProfile = await getShippingProfile(userId);

    if (!user) {
      return NextResponse.json(
        {
          ok: true,
          profile: {
            name: "",
            email: "",
            twoFactorEnabled: false,
            referralCode: "",
          },
        },
        { status: 200 }
      );
    }


    return NextResponse.json({
      ok: true,
      profile: {
        name: user.name,
        email: user.email,
        twoFactorEnabled: Boolean(user.twoFactorEnabled),
        referralCode: user.referralCode || "",
        shipping: shippingProfile,
      },
    });
  } catch (error) {
    console.error("[dashboard/profile][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await getDashboardUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rl = rateLimit(`${ip}:${userId}:dashboard-profile-update`, {
      windowMs: 60_000,
      max: 10,
    });
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const currentPassword = String(body?.currentPassword || "");
    const twoFactorCode = String(body?.twoFactorCode || "").trim();
    const shippingProfile = normalizeShippingProfile(body?.shipping);

    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json({ ok: false, error: "Display name must be 2-60 characters." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email address." }, { status: 400 });
    }

    const shippingValidation = validateShippingProfile(shippingProfile);
    if (!shippingValidation.ok) {
      return NextResponse.json({ ok: false, error: shippingValidation.error }, { status: 400 });
    }


    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, password: true, twoFactorEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Profile account is not available." }, { status: 400 });
    }

    const isEmailChanged = user.email.toLowerCase() !== email;

    if (isEmailChanged) {
      if (!currentPassword.trim()) {
        return NextResponse.json({ ok: false, error: "Current password is required to change email." }, { status: 400 });
      }

      const passwordOk = await verifyPassword(currentPassword, user.password);
      if (!passwordOk) {
        return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 403 });
      }

      const twoFactorResult = await verifyTwoFactorCode(userId, twoFactorCode);
      if (!twoFactorResult.ok) {
        return NextResponse.json({ ok: false, error: twoFactorResult.error }, { status: twoFactorResult.status });
      }

      const existingEmail = await prisma.user.findFirst({
        where: { email },
        select: { id: true },
      });
      if (existingEmail && existingEmail.id !== userId) {
        return NextResponse.json({ ok: false, error: "Email is already in use." }, { status: 409 });
      }

      const token = randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

      await prisma.pendingEmailChange.deleteMany({
        where: { userId },
      });

      await prisma.pendingEmailChange.create({
        data: {
          token,
          userId,
          newEmail: email,
          expiresAt,
        },
      });

      const link = buildAppUrl(req, "/verify-email", { token });
      const emailContent = buildConfirmNewEmailEmail(link);
      await sendEmail(email, "Confirm your new Supernova email", emailContent.html, emailContent.text);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        ...(isEmailChanged ? {} : { email }),
      },
    });

    await upsertShippingProfile(userId, shippingProfile);


    await prisma.securityEvent.create({
      data: {
        userId,
        eventType: "profile_update",
        success: true,
        reason: isEmailChanged ? "email_changed" : "profile_changed",
        ip,
      },
    });

    return NextResponse.json({
      ok: true,
      message: isEmailChanged
        ? "Profile saved. We sent a verification link to your new email."
        : "Profile settings saved.",
      pendingEmailVerification: isEmailChanged,
    });
  } catch (error) {
    console.error("[dashboard/profile][PUT]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}


