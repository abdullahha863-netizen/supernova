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
        "is_flagged",
        "flag_reason",
        "flagged_at",
        "updated_at"
      )
      VALUES (${userIdValue}, false, NULL, NULL, NOW())
      ON CONFLICT ("user_id") DO UPDATE SET
        "is_flagged" = false,
        "flag_reason" = NULL,
        "flagged_at" = NULL,
        "updated_at" = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/miners/[userId]/unflag][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
