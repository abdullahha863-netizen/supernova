import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HASHRATE_WRITER_STATUS_ENABLED = process.env.ENABLE_HASHRATE_WRITER_STATUS === "true";

const SNAPSHOT_INTERVAL_MS = Number(process.env.MINING_HASHRATE_SNAPSHOT_INTERVAL_MS || "300000");
const HEALTHY_THRESHOLD_MS = SNAPSHOT_INTERVAL_MS * 2 + 60000;

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!HASHRATE_WRITER_STATUS_ENABLED) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      status: "disabled",
      latestSnapshotAt: null,
      snapshotAgeMs: null,
      snapshotsLastHour: 0,
      activeUsersLastHour: 0,
      totalRows: 0,
      intervalMs: SNAPSHOT_INTERVAL_MS,
      at: new Date().toISOString(),
      message: "Hashrate writer status is disabled during build stage.",
    });
  }

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [latestSnapshot, totalRows, snapshotsLastHour, activeUsersLastHourRows] = await Promise.all([
      prisma.minerHashrateHistory.findFirst({
        orderBy: { recordedAt: "desc" },
        select: { recordedAt: true },
      }),
      prisma.minerHashrateHistory.count(),
      prisma.minerHashrateHistory.count({
        where: { recordedAt: { gte: oneHourAgo } },
      }),
      prisma.minerHashrateHistory.findMany({
        where: { recordedAt: { gte: oneHourAgo } },
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);

    const latestSnapshotAt = latestSnapshot?.recordedAt ?? null;
    const snapshotAgeMs = latestSnapshotAt ? Date.now() - new Date(latestSnapshotAt).getTime() : null;
    const activeUsersLastHour = activeUsersLastHourRows.length;

    const status = !latestSnapshotAt
      ? "empty"
      : snapshotAgeMs !== null && snapshotAgeMs <= HEALTHY_THRESHOLD_MS
        ? "healthy"
        : "stale";

    return NextResponse.json({
      ok: true,
      enabled: true,
      status,
      latestSnapshotAt,
      snapshotAgeMs,
      snapshotsLastHour,
      activeUsersLastHour,
      totalRows,
      intervalMs: SNAPSHOT_INTERVAL_MS,
      healthyThresholdMs: HEALTHY_THRESHOLD_MS,
      at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[mining/hashrate-writer][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
