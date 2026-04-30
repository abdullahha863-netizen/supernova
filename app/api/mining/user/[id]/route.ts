import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, safeResponseError, validateId } from "@/lib/apiHardening";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { resolveCountryCodeFromIp } from "@/lib/geoip";

type VpnAssessment = {
  status: "Yes" | "No" | "Suspected" | "Unknown";
  reasons: string[];
  currentCountry: string;
};

function normalizeIp(input: string | null | undefined) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return (raw.split(",")[0]?.trim() || "").replace(/^::ffff:/, "");
}

function isPrivateOrLocalIp(ip: string) {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  return false;
}

function deriveVpnAssessment(uniqueIpCount24h: number, countryChangeCount: number, currentIp: string | null): VpnAssessment {
  const normalizedIp = normalizeIp(currentIp);
  const currentCountry = resolveCountryCodeFromIp(normalizedIp);
  const reasons: string[] = [];

  if (!normalizedIp || isPrivateOrLocalIp(normalizedIp)) {
    reasons.push("Current IP is private, local, or unavailable, so VPN verification is limited.");
    return { status: "Unknown", reasons, currentCountry };
  }

  if (uniqueIpCount24h >= 8) {
    reasons.push(`${uniqueIpCount24h} unique IPs were observed in the last 24 hours.`);
  }

  if (countryChangeCount >= 2) {
    reasons.push(`${countryChangeCount} country changes were detected in the last 24 hours.`);
  }

  if (currentCountry === "UNKNOWN") {
    reasons.push("Current IP country could not be resolved reliably.");
  }

  if (uniqueIpCount24h >= 8 || (uniqueIpCount24h >= 5 && countryChangeCount >= 2)) {
    return { status: "Yes", reasons, currentCountry };
  }

  if (uniqueIpCount24h >= 4 || countryChangeCount >= 1 || currentCountry === "UNKNOWN") {
    return { status: "Suspected", reasons, currentCountry };
  }

  return {
    status: "No",
    reasons: reasons.length ? reasons : ["No strong VPN or proxy signal was detected from recent IP history."],
    currentCountry,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = enforceRateLimit(req, "mining:user-detail", { windowMs: 60_000, max: 20 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id: userIdParam } = await params;

  let userId: string;
  try {
    userId = validateId(userIdParam, "userId");
  } catch (err) {
    return safeResponseError((err as Error).message);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const profileRecord = await prisma.minerProfile.findUnique({
      where: { userId },
      select: {
        plan: true,
        payoutAddress: true,
        pendingBalance: true,
        totalHashrate: true,
        rewardFlow: true,
        updatedAt: true,
      },
    });

    const profile = profileRecord
      ? {
          plan: profileRecord.plan,
          payout_address: profileRecord.payoutAddress,
          pending_balance: Number(profileRecord.pendingBalance),
          total_hashrate: Number(profileRecord.totalHashrate),
          reward_flow: Number(profileRecord.rewardFlow),
          updated_at: profileRecord.updatedAt,
        }
      : null;

    // Last session for IP and login time
    const lastSession = await prisma.session.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const ipRows = (
      await prisma.securityEvent.findMany({
        where: {
          userId,
          ip: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          ip: true,
          createdAt: true,
        },
      })
    ).map((event) => ({
      ip: event.ip || "",
      created_at: event.createdAt,
    }));

    const lastIp = ipRows[0]?.ip ?? null;
    const recentIpHistory = ipRows.map((row) => ({
      ip: normalizeIp(row.ip),
      createdAt: row.created_at,
      country: resolveCountryCodeFromIp(row.ip),
    }));
    const recent24hHistory = recentIpHistory.filter(
      (row) => Date.now() - new Date(row.createdAt).getTime() < 24 * 60 * 60 * 1000,
    );
    const uniqueIps24h = new Set(recent24hHistory.map((row) => row.ip).filter(Boolean));
    const uniqueCountries24h = new Set(recent24hHistory.map((row) => row.country).filter((country) => country && country !== "UNKNOWN"));
    const ipChanges24h = Math.max(0, uniqueIps24h.size - 1);
    const countryChanges24h = Math.max(0, uniqueCountries24h.size - 1);
    const vpnAssessment = deriveVpnAssessment(uniqueIps24h.size, countryChanges24h, lastIp);

    const workerRows = (
      await prisma.minerWorker.findMany({
        where: { userId },
        orderBy: { lastShare: "desc" },
        select: {
          id: true,
          name: true,
          hashrate: true,
          status: true,
          lastShare: true,
          rejectRate: true,
        },
      })
    ).map((worker) => ({
      id: worker.id,
      name: worker.name,
      hashrate: Number(worker.hashrate),
      status: worker.status,
      last_share: worker.lastShare,
      reject_rate: Number(worker.rejectRate),
    }));

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: lastSession?.createdAt ?? null,
        lastIp,
        currentCountry: vpnAssessment.currentCountry,
        vpnStatus: vpnAssessment.status,
        vpnReasons: vpnAssessment.reasons,
        ipChanges24h,
        countryChanges24h,
        recentIpHistory,
        tier: profile?.plan ?? "Starter",
        payoutAddress: profile?.payout_address ?? "",
        pendingBalance: profile?.pending_balance ?? 0,
        totalHashrate: profile?.total_hashrate ?? 0,
        rewardFlow: profile?.reward_flow ?? 0,
        workers: workerRows,
      },
    });
  } catch (err) {
    console.error("[mining/user/[id]][GET]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
