import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getSessionSubject, signSession, verifySession } from "./jwt";

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = signSession({ sub: userId });
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await prisma.session.create({ data: { userId, token, expiresAt: expires } });
  return token;
}

export async function revokeSession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function getUserIdFromSessionToken(token: string | null | undefined) {
  const sessionToken = typeof token === "string" ? token.trim() : "";
  if (!sessionToken) return null;

  const payload = verifySession(sessionToken);
  const subject = getSessionSubject(payload);
  if (!subject) return null;

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    select: { userId: true, expiresAt: true },
  });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { token: sessionToken } });
    return null;
  }

  if (session.userId !== subject) return null;

  return session.userId;
}

export async function getUserIdFromRequestSession(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/sn_auth=([^;]+)/);
  const token = match?.[1];
  return getUserIdFromSessionToken(token);
}

export async function getDashboardUserIdFromRequest(req: Request) {
  const sessionUserId = await getUserIdFromRequestSession(req);
  if (sessionUserId) return sessionUserId;

  if (process.env.NODE_ENV !== "production") {
    // Development fallback is convenient for local work, but it can hide real authentication issues during testing.
    const devUserId = process.env.DEV_DASHBOARD_USER_ID?.trim();
    return devUserId || "dev-dashboard-engineer";
  }

  return null;
}
