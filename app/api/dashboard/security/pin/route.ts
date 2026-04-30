import { NextResponse } from "next/server";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { setEmergencyPin } from "@/lib/dashboardDb";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

export async function POST(req: Request) {
  const userId = await getDashboardUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`${getClientIp(req)}:${userId}:dashboard-pin-set`, {
    windowMs: 10 * 60_000,
    max: 5,
  });
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json();
  const newPin = String(body?.newPin ?? body?.pin ?? "");
  const currentPin = body?.currentPin != null ? String(body.currentPin) : undefined;
  const ip = getClientIp(req);

  const result = await setEmergencyPin(userId, newPin, currentPin, { ip });
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        failedAttempts: "failedAttempts" in result ? result.failedAttempts : undefined,
        lockoutUntil: "lockoutUntil" in result ? result.lockoutUntil : undefined,
      },
      { status: "status" in result ? result.status : 400 }
    );
  }

  return NextResponse.json({ ok: true });
}


