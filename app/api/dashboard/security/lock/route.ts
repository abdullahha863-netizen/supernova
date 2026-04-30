import { NextResponse } from "next/server";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { triggerEmergencyLock, unlockEmergencyLock } from "@/lib/dashboardDb";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

export async function POST(req: Request) {
  const userId = await getDashboardUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`${getClientIp(req)}:${userId}:dashboard-emergency-lock`, {
    windowMs: 10 * 60_000,
    max: 8,
  });
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json();
  const pin = String(body?.pin || "");
  const action = String(body?.action || "lock");
  const result = action === "unlock"
    ? await unlockEmergencyLock(userId, pin)
    : await triggerEmergencyLock(userId, pin);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        failedAttempts: "failedAttempts" in result ? result.failedAttempts : undefined,
        lockoutUntil: "lockoutUntil" in result ? result.lockoutUntil : undefined,
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    locked: "locked" in result ? result.locked : false,
    unlocked: "unlocked" in result ? result.unlocked : false,
    alreadyLocked: "alreadyLocked" in result ? result.alreadyLocked : false,
  });
}

