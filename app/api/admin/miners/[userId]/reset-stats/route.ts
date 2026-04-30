import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { validateId } from "@/lib/apiHardening";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  let userIdValue: string;
  try {
    userIdValue = validateId(userId, "userId");
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO "miner_profiles" (
        "user_id",
        "total_shares",
        "accepted_shares",
        "rejected_shares",
        "reject_rate",
        "shares_per_minute",
        "share_window_count",
        "share_window_started_at",
        "updated_at"
      )
      VALUES (${userIdValue}, 0, 0, 0, 0, 0, 0, NOW(), NOW())
      ON CONFLICT ("user_id") DO UPDATE SET
        "total_shares" = 0,
        "accepted_shares" = 0,
        "rejected_shares" = 0,
        "reject_rate" = 0,
        "shares_per_minute" = 0,
        "share_window_count" = 0,
        "share_window_started_at" = NOW(),
        "updated_at" = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/miners/[userId]/reset-stats][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
