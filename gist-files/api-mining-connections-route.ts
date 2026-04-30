import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, safeJsonBody, safeResponseError, validateNonEmptyString, validateNonNegativeInt, validateOptionalId, validateQueryInt, validateSource } from "@/lib/apiHardening";
import { isAdminRequest } from "@/lib/adminAuth";
import { getConnectionInsights, recordConnectionObservation } from "@/lib/miningConnectionInsights";
import { resolveCountryCodeFromIp } from "@/lib/geoip";

export const dynamic = "force-dynamic";
const MINING_RUNTIME_METRICS_ENABLED = process.env.ENABLE_MINING_RUNTIME_METRICS === "true";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = enforceRateLimit(req, "mining:connections-get", { windowMs: 60_000, max: 20 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (!MINING_RUNTIME_METRICS_ENABLED) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      source: "all",
      topIps: [],
      topCountries: [],
      recent: [],
      message: "Connection insights are disabled during build stage.",
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    let source: string;
    let top: number;
    let recent: number;

    try {
      source = validateSource(searchParams.get("source") || "all", "source");
      top = validateQueryInt(searchParams.get("top") || "12", "top", 1, 100);
      recent = validateQueryInt(searchParams.get("recent") || "30", "recent", 1, 180);
    } catch (error) {
      return safeResponseError((error as Error).message);
    }

    const data = await getConnectionInsights(source, top, recent);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error("[mining/connections][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!MINING_RUNTIME_METRICS_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false, skipped: true });
  }

  try {
    const rateLimitResponse = enforceRateLimit(req, "mining:connections-post", { windowMs: 60_000, max: 20 });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = safeJsonBody(await req.json().catch(() => null));
    const sourceIp = validateNonEmptyString(String(body.sourceIp || "unknown"), "sourceIp");
    const rawCountry = String(body.country || body.countryCode || "UNKNOWN");
    const country = rawCountry && rawCountry !== "UNKNOWN"
      ? rawCountry
      : resolveCountryCodeFromIp(sourceIp);

    try {
      await recordConnectionObservation({
        source: validateSource(String(body.source || body.protocol || "unknown"), "source"),
        sourceIp,
        country,
        userId: validateOptionalId(body.userId, "userId"),
        workerName: String(body.workerName || ""),
        eventType: validateNonEmptyString(String(body.eventType || body.event || "activity"), "eventType"),
        at: validateNonNegativeInt(body.at ?? Date.now(), "at"),
      });
    } catch (error) {
      return safeResponseError((error as Error).message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[mining/connections][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}