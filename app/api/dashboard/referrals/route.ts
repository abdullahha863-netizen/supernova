import { NextResponse } from "next/server";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { autoUpdateReferralEligibility } from "@/lib/referralEngine";
import { getClientIp } from "@/lib/getClientIp";
import type { Prisma } from "@prisma/client";

type ReferralItem = {
  id: string;
  referred: {
    id: string;
    name: string;
    email: string;
    emailVerified?: Date | null;
    createdAt?: Date;
  };
  status: string;
  rewardStatus: string;
  rewardType: string | null;
  rewardAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET(req: Request) {
  try {
    const userId = await getDashboardUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rl = rateLimit(`${ip}:${userId}:dashboard-referrals-get`, {
      windowMs: 30_000,
      max: 40,
    });
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

    await autoUpdateReferralEligibility(userId);

    const { searchParams } = new URL(req.url);
    const statusFilter = String(searchParams.get("status") || "all").toLowerCase();
    const search = String(searchParams.get("search") || "").trim();

    const whereClause: Prisma.ReferralWhereInput = {
      referrerId: userId,
    };
    if (statusFilter !== "all") {
      whereClause.status = statusFilter;
    }
    if (search) {
      whereClause.OR = [
        { referred: { name: { contains: search, mode: "insensitive" } } },
        { referred: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const referrals: ReferralItem[] = await prisma.referral.findMany({
      where: whereClause,
      select: {
        id: true,
        referred: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            createdAt: true,
          },
        },
        status: true,
        rewardStatus: true,
        rewardType: true,
        rewardAmount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      totalReferrals: referrals.length,
      pending: referrals.filter((r) => r.status === "pending").length,
      qualified: referrals.filter((r) => r.status === "qualified").length,
      approved: referrals.filter((r) => r.status === "approved").length,
      rejected: referrals.filter((r) => r.status === "rejected").length,
      pendingRewards: referrals.filter((r) => r.rewardStatus === "pending").length,
      approvedRewards: referrals.filter((r) => r.rewardStatus === "approved").length,
      paidRewards: referrals.filter((r) => r.rewardStatus === "paid").length,
      totalRewardAmount: referrals.reduce((sum, r) => sum + Number(r.rewardAmount || 0), 0),
    };

    return NextResponse.json({
      ok: true,
      referrals,
      stats,
      filters: {
        status: statusFilter,
        search,
      },
    });
  } catch (error) {
    console.error("[dashboard/referrals][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
