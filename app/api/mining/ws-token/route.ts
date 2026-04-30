import { NextRequest, NextResponse } from "next/server";
import { signSession } from "@/lib/jwt";
import { getUserIdFromRequest } from "@/lib/requestUser";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

export async function GET(request: NextRequest) {
  const rl = rateLimit(`${getClientIp(request)}:mining-ws-token`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const token = signSession({ sub: userId }, "30m");
  return NextResponse.json({ ok: true, token });
}
