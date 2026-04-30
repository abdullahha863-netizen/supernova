import { NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/jwt";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { ADMIN_COOKIE_NAME } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const rl = rateLimit(`${getClientIp(req)}:auth-logout`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  // read cookie
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/sn_auth=([^;]+)/);
  const token = match?.[1];
  if (token) await revokeSession(token);

  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", clearSessionCookie());
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
