import bcrypt from "bcryptjs";
import type { MemberCardStatus, MemberCardTier, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getClientIp } from "@/lib/getClientIp";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

const VALID_STATUSES = new Set(["issued", "shipped", "activated", "revoked"]);

function normalizeText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 100) : 50;
}

function normalizeMetalCardId(value: unknown) {
  return normalizeText(value, 80).toUpperCase();
}

function toMemberCardTier(value: unknown): MemberCardTier | null {
  const normalized = normalizeText(value, 40);
  if (normalized === "Silver") return "Silver";
  if (normalized === "Hash Pro") return "Hash_Pro";
  if (normalized === "Titan Elite") return "Titan_Elite";
  return null;
}

function toMemberCardStatus(value: unknown): MemberCardStatus | null {
  const normalized = normalizeText(value, 40);
  if (normalized === "issued" || normalized === "shipped" || normalized === "activated" || normalized === "revoked") {
    return normalized;
  }
  return null;
}

function fromMemberCardTier(value: string) {
  if (value === "Hash_Pro") return "Hash Pro";
  if (value === "Titan_Elite") return "Titan Elite";
  return value;
}

function toSafeCard(card: {
  id: string;
  metalCardId: string;
  tier: string;
  userId: string | null;
  assignedEmail: string;
  fulfillmentId: number | null;
  status: string;
  activatedAt: Date | null;
  revokedAt: Date | null;
  failedVerificationCount: number;
  verificationLockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...card,
    tier: fromMemberCardTier(card.tier),
  };
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(`${getClientIp(req)}:admin-metal-cards-get`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const search = normalizeText(req.nextUrl.searchParams.get("search"), 120);
    const searchTier = toMemberCardTier(search);
    const searchStatus = VALID_STATUSES.has(search) ? search as MemberCardStatus : null;
    const limit = normalizeLimit(req.nextUrl.searchParams.get("limit"));
    const searchFilters: Prisma.MemberCardWhereInput[] = search
      ? [
          { metalCardId: { contains: search, mode: "insensitive" } },
          { assignedEmail: { contains: search, mode: "insensitive" } },
          { userId: { contains: search, mode: "insensitive" } },
          ...(searchTier ? [{ tier: searchTier }] : []),
          ...(searchStatus ? [{ status: searchStatus }] : []),
        ]
      : [];

    const cards = await prisma.memberCard.findMany({
      where: search ? { OR: searchFilters } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        metalCardId: true,
        tier: true,
        userId: true,
        assignedEmail: true,
        fulfillmentId: true,
        status: true,
        activatedAt: true,
        revokedAt: true,
        failedVerificationCount: true,
        verificationLockedUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, cards: cards.map(toSafeCard) });
  } catch (error) {
    console.error("[admin/metal-cards][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const rl = rateLimit(`${getClientIp(req)}:admin-metal-cards-patch`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const id = normalizeText(body?.id, 100);
    const metalCardId = normalizeMetalCardId(body?.metalCardId);
    const status = toMemberCardStatus(body?.status);

    if (!id && !metalCardId) {
      return NextResponse.json({ ok: false, error: "id or metalCardId is required." }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ ok: false, error: "status must be issued, shipped, activated, or revoked." }, { status: 400 });
    }

    const card = await prisma.memberCard.update({
      where: id ? { id } : { metalCardId },
      data: {
        status,
        ...(status === "revoked" ? { revokedAt: new Date() } : {}),
      },
      select: {
        id: true,
        metalCardId: true,
        tier: true,
        userId: true,
        assignedEmail: true,
        fulfillmentId: true,
        status: true,
        activatedAt: true,
        revokedAt: true,
        failedVerificationCount: true,
        verificationLockedUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, card: toSafeCard(card) });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Metal Card not found." }, { status: 404 });
    }

    console.error("[admin/metal-cards][PATCH]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`${getClientIp(req)}:admin-metal-cards-post`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const metalCardId = normalizeMetalCardId(body?.metalCardId);
    const tier = toMemberCardTier(body?.tier);
    const assignedEmail = normalizeText(body?.assignedEmail, 254).toLowerCase();
    const userId = normalizeText(body?.userId, 100);
    const fulfillmentIdValue = body?.fulfillmentId === undefined || body?.fulfillmentId === null || body?.fulfillmentId === ""
      ? null
      : Number(body.fulfillmentId);
    const verificationCode = String(body?.verificationCode || "").trim();

    if (!metalCardId) {
      return NextResponse.json({ ok: false, error: "metalCardId is required." }, { status: 400 });
    }

    if (!assignedEmail) {
      return NextResponse.json({ ok: false, error: "assignedEmail is required." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assignedEmail)) {
      return NextResponse.json({ ok: false, error: "assignedEmail must be a valid email." }, { status: 400 });
    }

    if (!tier) {
      return NextResponse.json({ ok: false, error: "tier must be Silver, Hash Pro, or Titan Elite." }, { status: 400 });
    }

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json({ ok: false, error: "User not found" }, { status: 400 });
      }
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      return NextResponse.json({ ok: false, error: "verificationCode must be exactly 6 digits." }, { status: 400 });
    }

    if (fulfillmentIdValue !== null && (!Number.isInteger(fulfillmentIdValue) || fulfillmentIdValue <= 0)) {
      return NextResponse.json({ ok: false, error: "fulfillmentId must be a positive integer." }, { status: 400 });
    }

    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
    const card = await prisma.memberCard.create({
      data: {
        metalCardId,
        tier,
        assignedEmail,
        userId: userId || null,
        fulfillmentId: fulfillmentIdValue,
        verificationCodeHash,
      },
      select: {
        id: true,
        metalCardId: true,
        tier: true,
        userId: true,
        assignedEmail: true,
        fulfillmentId: true,
        status: true,
        activatedAt: true,
        revokedAt: true,
        failedVerificationCount: true,
        verificationLockedUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, card: toSafeCard(card) }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Metal Card ID already exists." }, { status: 409 });
    }

    console.error("[admin/metal-cards][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
