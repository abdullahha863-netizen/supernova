import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, safeJsonBody, safeResponseError, validateId, validateNonEmptyString } from "@/lib/apiHardening";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

type FraudFlag = {
  id: string;
  label: string;
  severity: "high" | "medium" | "low";
  detail: string;
};

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = enforceRateLimit(req, "mining:fraud-check-get", { windowMs: 60_000, max: 15 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(req.url);
  let userId: string;
  try {
    userId = validateId(searchParams.get("userId"), "userId");
  } catch (error) {
    return safeResponseError((error as Error).message);
  }

  const flags: FraudFlag[] = [];
  const now = Date.now();

  try {
    // ── 1. Frequent IP changes ───────────────────────────────────────────────
    const ipRows = (await prisma.securityEvent.findMany({
      where: {
        userId,
        ip: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { ip: true, createdAt: true },
    })).map((row) => ({
      ip: row.ip || "",
      created_at: row.createdAt,
    }));

    const recentIps = ipRows.filter(
      (r) => now - new Date(r.created_at).getTime() < 24 * 3600 * 1000
    );
    const uniqueIps = new Set(recentIps.map((r) => r.ip)).size;
    if (uniqueIps >= 5) {
      flags.push({
        id: "frequent_ip_changes",
        label: "Frequent IP Changes",
        severity: uniqueIps >= 8 ? "high" : "medium",
        detail: `${uniqueIps} different IPs detected in the last 24 hours.`,
      });
    }

    // ── 2. Workers flapping (started and stopped in seconds) ────────────────
    const workers = (await prisma.minerWorker.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        status: true,
        lastShare: true,
        rejectRate: true,
        hashrate: true,
      },
    })).map((worker) => ({
      id: worker.id,
      name: worker.name,
      status: worker.status,
      last_share: worker.lastShare,
      reject_rate: Number(worker.rejectRate),
      hashrate: Number(worker.hashrate),
    }));

    const FLAP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
    const flappingWorkers = workers.filter(
      (w) =>
        w.status === "offline" &&
        now - new Date(w.last_share).getTime() < FLAP_THRESHOLD_MS
    );
    if (flappingWorkers.length > 0) {
      flags.push({
        id: "worker_flapping",
        label: "Workers Flapping",
        severity: flappingWorkers.length >= 3 ? "high" : "medium",
        detail: `${flappingWorkers.length} worker(s) went offline within the last 5 minutes.`,
      });
    }

    // ── 3. Hashrate spike / drop ─────────────────────────────────────────────
    const onlineWorkers = workers.filter((w) => w.status === "online");
    const totalHashrate = onlineWorkers.reduce((s, w) => s + w.hashrate, 0);
    const avgHashrate =
      workers.length > 0 ? workers.reduce((s, w) => s + w.hashrate, 0) / workers.length : 0;

    if (avgHashrate > 0) {
      const ratio = totalHashrate / avgHashrate;
      if (ratio > 3) {
        flags.push({
          id: "hashrate_spike",
          label: "Sudden Hashrate Spike",
          severity: "high",
          detail: `Current hashrate is ${ratio.toFixed(1)}× above average — possible farm manipulation.`,
        });
      } else if (totalHashrate > 0 && ratio < 0.2) {
        flags.push({
          id: "hashrate_drop",
          label: "Sudden Hashrate Drop",
          severity: "medium",
          detail: `Current hashrate dropped to ${(ratio * 100).toFixed(0)}% of average.`,
        });
      }
    }

    // ── 4. High reject rate ──────────────────────────────────────────────────
    const avgRejectRate =
      workers.length > 0 ? workers.reduce((s, w) => s + w.reject_rate, 0) / workers.length : 0;
    if (avgRejectRate > 0.2) {
      flags.push({
        id: "high_reject_rate",
        label: "High Share Reject Rate",
        severity: avgRejectRate > 0.5 ? "high" : "medium",
        detail: `Average reject rate across workers: ${(avgRejectRate * 100).toFixed(1)}%.`,
      });
    }

    // ── 5. Payout abuse: many payouts in short time ──────────────────────────
    const recentPayouts = (await prisma.minerPayout.findMany({
      where: {
        userId,
        payoutDate: { gt: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
      orderBy: { payoutDate: "desc" },
      select: { payoutDate: true, amount: true },
    })).map((payout) => ({
      payout_date: payout.payoutDate,
      amount: Number(payout.amount),
    }));

    if (recentPayouts.length >= 5) {
      flags.push({
        id: "rapid_cashouts",
        label: "Rapid Cashout Requests",
        severity: "high",
        detail: `${recentPayouts.length} cashout requests in the last 7 days.`,
      });
    }

    // ── 6. Large cashout without mining history ──────────────────────────────
    const profileRecord = await prisma.minerProfile.findUnique({
      where: { userId },
      select: {
        pendingBalance: true,
        totalHashrate: true,
      },
    });

    const profile = profileRecord
      ? {
          pending_balance: Number(profileRecord.pendingBalance),
          total_hashrate: Number(profileRecord.totalHashrate),
        }
      : null;
    if (profile) {
      const { pending_balance, total_hashrate } = profile;
      // Flag if pending balance > 100 and no live hashrate
      if (pending_balance > 100 && total_hashrate === 0) {
        flags.push({
          id: "cashout_no_mining",
          label: "Large Balance Without Active Mining",
          severity: "high",
          detail: `Pending balance: ${pending_balance.toFixed(2)} KAS — but no active hashrate detected.`,
        });
      }
    }

    // ── 7. Invalid / impossible shares ──────────────────────────────────────
    let invalidShares = 0;
    try {
      invalidShares = await prisma.share.count({
        where: {
          userId,
          accepted: false,
        },
      });
    } catch {
      // Share model may not be available during partial migrations.
    }

    if (invalidShares > 100) {
      flags.push({
        id: "invalid_shares",
        label: "High Invalid Share Count",
        severity: invalidShares > 500 ? "high" : "medium",
        detail: `${invalidShares.toLocaleString()} invalid shares recorded — possible stale or forged submissions.`,
      });
    }

    // ── 8. Account very new with high balance ───────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (user && profile) {
      const accountAgeMs = now - new Date(user.createdAt).getTime();
      const accountAgeDays = accountAgeMs / (86400 * 1000);
      if (accountAgeDays < 3 && profile.pending_balance > 50) {
        flags.push({
          id: "new_account_high_balance",
          label: "New Account With High Balance",
          severity: "high",
          detail: `Account is ${accountAgeDays.toFixed(1)} days old with ${profile.pending_balance.toFixed(2)} KAS pending.`,
        });
      }
    }

    const overallRisk: "clean" | "suspicious" | "high_risk" =
      flags.some((f) => f.severity === "high")
        ? "high_risk"
        : flags.length > 0
          ? "suspicious"
          : "clean";

    const score = Math.min(
      100,
      flags.reduce((total, flag) => {
        if (flag.severity === "high") return total + 35;
        if (flag.severity === "medium") return total + 20;
        return total + 10;
      }, 0),
    );

    if (score >= 70) {
      const recentNotification = await prisma.notification.findFirst({
        where: {
          type: "high_fraud",
          link: `/admin/dashboard/cashout-review/${userId}`,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });

      if (!recentNotification) {
        await prisma.notification.create({
          data: {
            type: "high_fraud",
            title: "High Fraud Risk Detected",
            message: `Miner ${userId} has a fraud score of ${score}/100.`,
            severity: "critical",
            link: `/admin/dashboard/cashout-review/${userId}`,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      overallRisk,
      score,
      flagCount: flags.length,
      flags,
    });
  } catch (err) {
    console.error("[mining/fraud-check][GET]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rateLimitResponse = enforceRateLimit(req, "mining:fraud-check-post", { windowMs: 60_000, max: 15 });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = safeJsonBody(await req.json().catch(() => null));
    const userId = validateId(body.userId, "userId");
    const reason = validateNonEmptyString(body.reason || "Manually flagged as suspicious by admin", "reason");
    const eventType = validateNonEmptyString(body.eventType || "admin_flagged_suspicious", "eventType");

    // Log a "suspicious" security event against this user
    await prisma.securityEvent.create({
      data: {
        userId,
        eventType,
        success: false,
        reason,
        ip: String(body?.sourceIp || "admin"),
      },
    });

    try {
      const link = `/admin/dashboard/cashout-review/${encodeURIComponent(userId)}`;
      const recentNotification = await prisma.notification.findFirst({
        where: {
          type: "suspicious_cashout",
          link,
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
        },
      });

      if (!recentNotification) {
        await prisma.notification.create({
          data: {
            type: "suspicious_cashout",
            title: "Cashout Manually Flagged",
            message: `Miner ${userId} was manually flagged for cashout review. Reason: ${reason}`,
            severity: "high",
            link,
          },
        });
      }
    } catch (notificationError) {
      console.error("[mining/fraud-check][manual-flag-notification]", notificationError);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mining/fraud-check][POST]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
