export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const [{ rateLimit }, { getClientIp }] = await Promise.all([
      import("@/lib/rateLimit"),
      import("@/lib/getClientIp"),
    ]);

    const rl = rateLimit(`${getClientIp(req)}:auth-logout`, { windowMs: 60_000, max: 30 });
    if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

    // read cookie
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/sn_auth=([^;]+)/);
    const token = match?.[1];
    if (token) {
      try {
        const { revokeSession } = await import("@/lib/auth");
        await revokeSession(token);
      } catch (error) {
        console.error("[auth][logout][revokeSession]", error);
      }
    }
  } catch (error) {
    console.error("[auth][logout]", error);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "sn_auth",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
