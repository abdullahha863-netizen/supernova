import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, safeResponseError, validateId } from "@/lib/apiHardening";
import { isAdminRequest } from "@/lib/adminAuth";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { getMiningAlertCandidates, type MiningAlertCandidate } from "@/lib/miningAlertSignals";
import { prisma } from "@/lib/prisma";

type HashratePoint = { ts: Date; hashrate: number };

const WINDOW_CONFIG = {
  "1h": { hours: 1, points: 30 },
  "24h": { hours: 24, points: 24 },
  "7d": { hours: 168, points: 42 },
} satisfies Record<string, { hours: number; points: number }>;

type HistoryRow = {
  recorded_at: Date;
  hashrate: number;
};

type WorkerRow = {
  id: number;
  name: string;
  hashrate: number;
  status: string;
  reject_rate: number;
};

function buildSeries(rows: HistoryRow[], hours: number, points: number, fallbackHashrate: number) {
  const now = Date.now();
  const windowMs = hours * 60 * 60 * 1000;
  const since = now - windowMs;
  const relevant = rows.filter((row) => new Date(row.recorded_at).getTime() >= since);

  if (relevant.length === 0) {
    return fallbackHashrate > 0 ? [{ ts: new Date(now), hashrate: fallbackHashrate }] : [];
  }

  const bucketMs = Math.max(1, Math.floor(windowMs / points));
  const buckets = new Map<number, { sum: number; count: number; lastTs: number }>();

  for (const row of relevant) {
    const ts = new Date(row.recorded_at).getTime();
    const bucketIndex = Math.min(points - 1, Math.max(0, Math.floor((ts - since) / bucketMs)));
    const current = buckets.get(bucketIndex) ?? { sum: 0, count: 0, lastTs: ts };
    current.sum += Number(row.hashrate || 0);
    current.count += 1;
    current.lastTs = Math.max(current.lastTs, ts);
    buckets.set(bucketIndex, current);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, bucket]) => ({
      ts: new Date(bucket.lastTs),
      hashrate: Number((bucket.sum / Math.max(1, bucket.count)).toFixed(4)),
    }));
}

function getWindowKey(value: string | null) {
  return value && value in WINDOW_CONFIG ? value as keyof typeof WINDOW_CONFIG : "24h";
}

async function createAlerts(userId: string, alerts: MiningAlertCandidate[]) {
  await Promise.all(alerts.map(async (alert) => {
    const duplicate = await prisma.alert.findFirst({
      where: {
        userId,
        type: alert.type,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000),
        },
      },
      select: { id: true },
    });

    if (duplicate) return;

    await prisma.alert.create({
      data: {
        userId,
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
      },
    });
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isAdmin = isAdminRequest(req);
  const requestedWindow = getWindowKey(searchParams.get("window"));
  let userId: string;

  if (isAdmin && searchParams.get("userId")) {
    try {
      userId = validateId(searchParams.get("userId"), "userId");
    } catch (error) {
      return safeResponseError((error as Error).message);
    }
  } else {
    const sessionUserId = await getDashboardUserIdFromRequest(req);
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    userId = sessionUserId;
  }

  const rateLimitResponse = enforceRateLimit(req, `mining:hashrate-history:${userId}`, { windowMs: 60_000, max: 20 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const historySince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [historyRows, workerRows] = await Promise.all([
      prisma.minerHashrateHistory.findMany({
        where: {
          userId,
          recordedAt: { gte: historySince },
        },
        orderBy: { recordedAt: "asc" },
        select: {
          recordedAt: true,
          hashrate: true,
        },
      }),
      prisma.minerWorker.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          hashrate: true,
          status: true,
          rejectRate: true,
        },
      }),
    ]);
    const normalizedHistoryRows: HistoryRow[] = historyRows.map((row) => ({
      recorded_at: row.recordedAt,
      hashrate: Number(row.hashrate),
    }));
    const normalizedWorkerRows: WorkerRow[] = workerRows.map((worker) => ({
      id: worker.id,
      name: worker.name,
      hashrate: Number(worker.hashrate),
      status: worker.status,
      reject_rate: Number(worker.rejectRate),
    }));

    const alertCandidates = getMiningAlertCandidates({
      userId,
      workers: normalizedWorkerRows,
      hashrateHistory: normalizedHistoryRows.map((row) => ({
        ts: row.recorded_at,
        hashrate: row.hashrate,
      })),
    });
    await createAlerts(userId, alertCandidates);

    const fallbackHashrate = normalizedWorkerRows.reduce(
      (sum, w) => sum + (w.status === "online" ? w.hashrate : 0),
      0
    );
    const fallbackHashrateForSeries = isAdmin ? fallbackHashrate : 0;

    const windows = Object.fromEntries(
      Object.entries(WINDOW_CONFIG).map(([key, config]) => [
        key,
        buildSeries(normalizedHistoryRows, config.hours, config.points, fallbackHashrateForSeries),
      ])
    ) as Record<string, HashratePoint[]>;

    const comparison = Object.fromEntries(
      Object.entries(windows).map(([k, series]) => [k, series[0]?.hashrate ?? 0])
    );

    const selectedPoints = windows[requestedWindow] ?? [];
    const currentHashrate = selectedPoints[selectedPoints.length - 1]?.hashrate ?? (isAdmin ? fallbackHashrate : 0);
    const selectedAverage = selectedPoints.length
      ? selectedPoints.reduce((sum, point) => sum + point.hashrate, 0) / selectedPoints.length
      : 0;
    const selectedPeak = selectedPoints.length ? Math.max(...selectedPoints.map((point) => point.hashrate)) : 0;

    return NextResponse.json({
      ok: true,
      userId,
      currentHashrate,
      window: requestedWindow,
      points: selectedPoints,
      stats: {
        current: currentHashrate,
        average: Number(selectedAverage.toFixed(4)),
        peak: Number(selectedPeak.toFixed(4)),
        lastUpdated: selectedPoints[selectedPoints.length - 1]?.ts ?? null,
      },
      windows,
      comparison,
    });
  } catch (err) {
    console.error("[mining/hashrate/history][GET]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
