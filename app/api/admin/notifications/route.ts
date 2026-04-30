import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { cleanupOldReadNotifications, getUnreadNotificationCount } from "@/lib/adminNotifications";

function normalizeText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(`${getClientIp(req)}:admin-notifications-get`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";
    const limitParam = Number(req.nextUrl.searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 100) : undefined;

    await cleanupOldReadNotifications();

    const notifications = await prisma.notification.findMany({
      where: unreadOnly ? { read: false } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const unreadCount = await getUnreadNotificationCount();

    return NextResponse.json({ ok: true, notifications, unreadCount });
  } catch (error) {
    console.error("[admin/notifications][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`${getClientIp(req)}:admin-notifications-post`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const type = normalizeText(body?.type, 80);
    const title = normalizeText(body?.title, 160);
    const message = normalizeText(body?.message, 2000);
    const severity = normalizeText(body?.severity, 20).toLowerCase();
    const link = normalizeText(body?.link, 500);

    if (!type || !title || !message || !severity) {
      return NextResponse.json(
        { ok: false, error: "type, title, message, and severity are required." },
        { status: 400 },
      );
    }

    if (!["low", "medium", "high", "critical"].includes(severity)) {
      return NextResponse.json({ ok: false, error: "Invalid severity." }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        severity,
        link: link || null,
      },
    });

    return NextResponse.json({ ok: true, notification }, { status: 201 });
  } catch (error) {
    console.error("[admin/notifications][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
