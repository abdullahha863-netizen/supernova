import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "sn_admin";

export function isValidAdminKey(value: string | null | undefined) {
  return Boolean(process.env.ADMIN_KEY) && String(value || "") === process.env.ADMIN_KEY;
}

export function getAdminCookieValue(request: Request | NextRequest) {
  const cookieHeader = "cookies" in request ? request.cookies.get(ADMIN_COOKIE_NAME)?.value : null;
  if (cookieHeader) return cookieHeader;

  const raw = request.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`${ADMIN_COOKIE_NAME}=([^;]+)`));
  return match?.[1] || null;
}

export function isAdminRequest(request: Request | NextRequest) {
  const headerKey = request.headers.get("x-admin-key");
  if (isValidAdminKey(headerKey)) return true;
  return isValidAdminKey(getAdminCookieValue(request));
}
