export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/adminAuth";

function clearSessionCookie(response: NextResponse, name: string) {
  response.cookies.set({
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const escapedCookieName = ADMIN_COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${escapedCookieName}=([^;]+)`));
  const token = match?.[1];
  if (token) {
    try {
      const { revokeSession } = await import("@/lib/auth");
      await revokeSession(token);
    } catch (e) {
      console.error("revokeSession error:", e);
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response, ADMIN_COOKIE_NAME);
  return response;
}
