import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { getUnreadNotificationCount } from "@/lib/adminNotifications";

function normalizeId(value: string) {
  return String(value || "").trim().slice(0, 100);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const rl = rateLimit(`${getClientIp(req)}:admin-notifications-read-patch`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: rawId } = await context.params;
    const id = normalizeId(rawId);

    if (!id) {
      return NextResponse.json({ ok: false, error: "Notification id is required." }, { status: 400 });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    const unreadCount = await getUnreadNotificationCount();
    return NextResponse.json({ ok: true, unreadCount });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Notification not found." }, { status: 404 });
    }

    console.error("[admin/notifications/:id/read][PATCH]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
