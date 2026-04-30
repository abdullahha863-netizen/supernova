import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { getClientIp } from "@/lib/getClientIp";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

const LOCK_ATTEMPT_LIMIT = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function normalizeMetalCardId(value: unknown) {
  return String(value || "").trim().slice(0, 80).toUpperCase();
}

function publicTier(value: string) {
  if (value === "Hash_Pro") return "Hash Pro";
  if (value === "Titan_Elite") return "Titan Elite";
  return value;
}

function safeCard(card: {
  metalCardId: string;
  tier: string;
  status: string;
  activatedAt: Date | null;
}) {
  return {
    metalCardId: card.metalCardId,
    tier: publicTier(card.tier),
    status: card.status,
    activatedAt: card.activatedAt ? card.activatedAt.toISOString() : null,
  };
}

function invalidCardResponse() {
  return NextResponse.json(
    { ok: false, error: "Invalid Metal Card ID or verification code." },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequestSession(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`${getClientIp(req)}:${userId}:member-metal-card-activate`, {
    windowMs: 15 * 60_000,
    max: 10,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => null);
    const metalCardId = normalizeMetalCardId(body?.metalCardId);
    const verificationCode = String(body?.verificationCode || "").trim();

    if (!metalCardId || !/^\d{6}$/.test(verificationCode)) {
      return invalidCardResponse();
    }

    const card = await prisma.memberCard.findUnique({
      where: { metalCardId },
      select: {
        id: true,
        metalCardId: true,
        tier: true,
        userId: true,
        assignedEmail: true,
        verificationCodeHash: true,
        status: true,
        activatedAt: true,
        failedVerificationCount: true,
        verificationLockedUntil: true,
      },
    });

    if (!card) {
      return invalidCardResponse();
    }

    if (card.status === "revoked") {
      return NextResponse.json({ ok: false, error: "This Metal Card has been revoked." }, { status: 403 });
    }

    if (card.status === "activated") {
      if (card.userId === userId) {
        return NextResponse.json({ ok: true, card: safeCard(card) });
      }

      return NextResponse.json({ ok: false, error: "This Metal Card is already activated." }, { status: 409 });
    }

    if (card.status === "issued") {
      return NextResponse.json(
        { ok: false, error: "This Metal Card has not been marked as shipped yet." },
        { status: 409 },
      );
    }

    if (card.status !== "shipped") {
      return NextResponse.json({ ok: false, error: "This Metal Card cannot be activated." }, { status: 409 });
    }

    if (card.verificationLockedUntil && card.verificationLockedUntil.getTime() > Date.now()) {
      return NextResponse.json(
        { ok: false, error: "Too many verification attempts. Try again later." },
        { status: 429 },
      );
    }

    const codeMatches = await bcrypt.compare(verificationCode, card.verificationCodeHash);
    if (!codeMatches) {
      const nextFailedCount = card.failedVerificationCount + 1;
      const lockUntil = nextFailedCount >= LOCK_ATTEMPT_LIMIT
        ? new Date(Date.now() + LOCK_DURATION_MS)
        : null;

      await prisma.memberCard.update({
        where: { id: card.id },
        data: {
          failedVerificationCount: nextFailedCount,
          verificationLockedUntil: lockUntil,
        },
      });

      return invalidCardResponse();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const activatedAt = new Date();
    const activationResult = await prisma.memberCard.updateMany({
      where: {
        id: card.id,
        status: "shipped",
      },
      data: {
        userId,
        assignedEmail: user?.email || card.assignedEmail,
        status: "activated",
        activatedAt,
        failedVerificationCount: 0,
        verificationLockedUntil: null,
      },
    });

    const activatedCard = await prisma.memberCard.findUnique({
      where: { id: card.id },
      select: {
        userId: true,
        metalCardId: true,
        tier: true,
        status: true,
        activatedAt: true,
      },
    });

    if (!activatedCard) {
      return invalidCardResponse();
    }

    if (activationResult.count === 0) {
      if (activatedCard.status === "activated" && activatedCard.userId === userId) {
        return NextResponse.json({ ok: true, card: safeCard(activatedCard) });
      }

      if (activatedCard.status === "activated") {
        return NextResponse.json({ ok: false, error: "This Metal Card is already activated." }, { status: 409 });
      }

      if (activatedCard.status === "issued") {
        return NextResponse.json(
          { ok: false, error: "This Metal Card has not been marked as shipped yet." },
          { status: 409 },
        );
      }

      if (activatedCard.status === "revoked") {
        return NextResponse.json({ ok: false, error: "This Metal Card has been revoked." }, { status: 403 });
      }

      return NextResponse.json({ ok: false, error: "This Metal Card cannot be activated." }, { status: 409 });
    }

    return NextResponse.json({ ok: true, card: safeCard(activatedCard) });
  } catch (error) {
    console.error("[member/metal-card/activate][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
