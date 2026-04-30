import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

export async function GET(req: NextRequest) {
  const rl = rateLimit(`${getClientIp(req)}:admin-miners-get`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  const authorized = isAdminRequest(req);
  console.error("[admin/miners][auth]", { authorized });

  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.error("[admin/miners][db] querying users with miners");

    // All users that have at least one miner.
    const users = await prisma.user.findMany({
      where: { miners: { some: {} } },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        twoFactorEnabled: true,
        miners: {
          select: {
            id: true,
            minerName: true,
            isActive: true,
            lastSeen: true,
          },
          orderBy: { lastSeen: "desc" },
        },
        _count: { select: { shares: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    console.error("[admin/miners][db] users query complete", { count: users.length });

    const userIds = users.map((user) => user.id);
    let profileRows: Array<{
      user_id: string;
      total_shares: number;
      accepted_shares: number;
      rejected_shares: number;
      reject_rate: Prisma.Decimal | number;
      shares_per_minute: Prisma.Decimal | number;
      is_flagged: boolean;
      flag_reason: string | null;
      flagged_at: Date | null;
    }> = [];

    if (userIds.length > 0) {
      try {
        console.error("[admin/miners][db] querying miner_profiles", { userCount: userIds.length });

        profileRows = await prisma.$queryRaw<typeof profileRows>`
          SELECT
            "user_id",
            COALESCE("total_shares", 0) AS "total_shares",
            COALESCE("accepted_shares", 0) AS "accepted_shares",
            COALESCE("rejected_shares", 0) AS "rejected_shares",
            COALESCE("reject_rate", 0) AS "reject_rate",
            COALESCE("shares_per_minute", 0) AS "shares_per_minute",
            COALESCE("is_flagged", false) AS "is_flagged",
            "flag_reason",
            "flagged_at"
          FROM "miner_profiles"
          WHERE "user_id" IN (${Prisma.join(userIds)})
        `;

        console.error("[admin/miners][db] miner_profiles query complete", { count: profileRows.length });
      } catch (profileError) {
        console.error("[admin/miners][db] miner_profiles query failed; continuing with share-count fallback", profileError);
        profileRows = [];
      }
    }

    const profilesByUserId = new Map(profileRows.map((profile) => [profile.user_id, profile]));

    console.error("[admin/miners][response] building rows", { userCount: users.length, profileCount: profileRows.length });

    const rows = users.map((u) => {
      const profile = profilesByUserId.get(u.id);
      const totalShares = Number(profile?.total_shares ?? u._count.shares);
      const acceptedShares = Number(profile?.accepted_shares ?? totalShares);
      const rejectedShares = Number(profile?.rejected_shares ?? 0);

      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        registeredAt: u.createdAt,
        twoFactorEnabled: u.twoFactorEnabled,
        totalMiners: u.miners.length,
        activeMiners: u.miners.filter((m) => m.isActive).length,
        lastSeen: u.miners[0]?.lastSeen ?? null,
        totalShares,
        acceptedShares,
        rejectedShares,
        rejectRate: Number(profile?.reject_rate ?? 0),
        sharesPerMinute: Number(profile?.shares_per_minute ?? 0),
        isFlagged: Boolean(profile?.is_flagged ?? false),
        flagReason: profile?.flag_reason ?? null,
        flaggedAt: profile?.flagged_at ?? null,
      };
    });

    console.error("[admin/miners][response] returning rows", { count: rows.length });

    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    console.error("[admin/miners][db] users query or response build failed; returning safe fallback", error);
    return NextResponse.json({ ok: true, rows: [] });
  }
}
