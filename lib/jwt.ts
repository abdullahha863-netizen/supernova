import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production.");
}

const ACTIVE_JWT_SECRET = JWT_SECRET || "dev-insecure-secret-change-me";
const COOKIE_NAME = "sn_auth";

function sessionCookieAttributes(maxAge: number) {
  const secure = process.env.NODE_ENV === "production";
  return `HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax;${secure ? " Secure;" : ""}`;
}

export function signSession(payload: object, expiresIn: string = "7d") {
  return jwt.sign(payload, ACTIVE_JWT_SECRET, { expiresIn });
}

export function verifySession(token: string): Record<string, unknown> | null {
  try {
    const decoded = jwt.verify(token, ACTIVE_JWT_SECRET);
    if (typeof decoded === "object" && decoded !== null) return decoded as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

export function getSessionSubject(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  if (typeof payload.sub === "string") return payload.sub;
  if (typeof payload.userId === "string") return payload.userId;
  return null;
}

export function sessionCookie(token: string, maxAge = 60 * 60 * 24 * 7) {
  return `${COOKIE_NAME}=${token}; ${sessionCookieAttributes(maxAge)}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; ${sessionCookieAttributes(0)}`;
}
