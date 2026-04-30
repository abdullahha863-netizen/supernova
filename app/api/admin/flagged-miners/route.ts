import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getClientIp } from "@/lib/getClientIp";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const rl = rateLimit(`${getClientIp(req)}:admin-flagged-miners-get`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.$queryRaw<Array<{
    userId: string;
    rejectRate: number;
    totalShares: number;
    acceptedShares: number;
    rejectedShares: number;
    sharesPerMinute: number;
    flagReason: string | null;
    flaggedAt: Date | null;
  }>>`
    SELECT
      "user_id" AS "userId",
      "reject_rate" AS "rejectRate",
      "total_shares" AS "totalShares",
      "accepted_shares" AS "acceptedShares",
      "rejected_shares" AS "rejectedShares",
      "shares_per_minute" AS "sharesPerMinute",
      "flag_reason" AS "flagReason",
      "flagged_at" AS "flaggedAt"
    FROM "miner_profiles"
    WHERE "is_flagged" = true
    ORDER BY "flagged_at" DESC NULLS LAST
  `;

  return NextResponse.json({
    ok: true,
    rows: rows.map((row) => ({
      userId: row.userId,
      rejectRate: Number(row.rejectRate ?? 0),
      totalShares: Number(row.totalShares ?? 0),
      acceptedShares: Number(row.acceptedShares ?? 0),
      rejectedShares: Number(row.rejectedShares ?? 0),
      sharesPerMinute: Number(row.sharesPerMinute ?? 0),
      flagReason: row.flagReason,
      flaggedAt: row.flaggedAt,
    })),
  });
}
