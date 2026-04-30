import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { assessIPReputation, extractIPFromRequest, IPReputationData } from "@/lib/ipReputation";
import { getUserIdFromRequest } from "@/lib/requestUser";

// Mock user history - in production, this would come from database
const userIPHistory: Record<string, { ips: string[]; countries: string[]; lastSession: Date }> = {};

function buildAnonymousIpKey(req: NextRequest, ip: string) {
  const userAgent = req.headers.get("user-agent") || "unknown";
  const language = req.headers.get("accept-language")?.split(",")[0] || "unknown";
  const hash = createHash("sha256")
    .update([ip, userAgent, language].join("|"))
    .digest("hex")
    .slice(0, 32);

  return `anon:${hash}`;
}

export async function POST(req: NextRequest) {
  try {
    const authenticatedUserId = await getUserIdFromRequest(req);

    // Extract IP from request
    const ip = extractIPFromRequest(req);
    const userId = authenticatedUserId || buildAnonymousIpKey(req, ip);

    // Get user history
    const history = userIPHistory[userId] || { ips: [], countries: [], lastSession: new Date() };

    // Prepare data for assessment
    const reputationData: IPReputationData = {
      ip,
      userId,
      previousIPs: history.ips,
      previousCountries: history.countries,
      sessionStartTime: history.lastSession
    };

    // Assess IP reputation
    const result = assessIPReputation(reputationData);

    // Update user history (simplified - in production use database)
    if (!history.ips.includes(ip)) {
      history.ips.push(ip);
      history.countries.push(result.country);
    }
    history.lastSession = new Date();
    userIPHistory[userId] = history;

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ip-reputation]', error);
    return NextResponse.json(
      { error: 'Failed to assess IP reputation' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(req: NextRequest) {
  const ip = extractIPFromRequest(req);
  const result = assessIPReputation({ ip });

  return NextResponse.json(result);
}
