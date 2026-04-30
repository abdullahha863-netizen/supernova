import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { miningPrisma } from "@/lib/miningPrisma";

const CACHE_TTL = 60;
const ADMIN_MINING_STATS_ENABLED = process.env.ENABLE_ADMIN_MINING_STATS === "true";

type AdminStatsPayload = {
  totalMiners: number;
  activeMinerCount: number;
  totalShares: number;
  totalDifficulty: number;
  totalReward: number;
  generatedAt: Date;
};

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_MINING_STATS_ENABLED) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      totalMiners: 0,
      activeMinerCount: 0,
      totalShares: 0,
      totalDifficulty: 0,
      totalReward: 0,
      generatedAt: new Date().toISOString(),
      message: "Admin mining stats are disabled during build stage.",
    });
  }

  try {
    const stats = await buildAdminStats();

    return NextResponse.json({ ok: true, ...stats }, {
      headers: {
        "Cache-Control": `private, no-store, max-age=${CACHE_TTL}`,
      },
    });
  } catch (error) {
    console.error("[admin/mining/stats]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

async function buildAdminStats(): Promise<AdminStatsPayload> {
  const [totalMiners, activeMinerCount, shareStats] = await Promise.all([
    miningPrisma.miner.count(),
    miningPrisma.miner.count({ where: { isActive: true } }),
    miningPrisma.share.aggregate({
      _count: true,
      _sum: {
        difficulty: true,
        reward: true,
      },
    }),
  ]);

  return {
    totalMiners,
    activeMinerCount,
    totalShares: shareStats._count,
    totalDifficulty: shareStats._sum.difficulty || 0,
    totalReward: shareStats._sum.reward || 0,
    generatedAt: new Date(),
  };
}