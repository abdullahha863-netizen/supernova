import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { getUnreadNotificationCount } from "@/lib/adminNotifications";

export async function PATCH(req: NextRequest) {
  const rl = rateLimit(`${getClientIp(req)}:admin-notifications-read-all-patch`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    const unreadCount = await getUnreadNotificationCount();

    return NextResponse.json({ ok: true, updatedCount: result.count, unreadCount });
  } catch (error) {
    console.error("[admin/notifications/read-all][PATCH]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
