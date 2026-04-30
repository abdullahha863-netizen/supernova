import { NextRequest } from "next/server";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { getSessionSubject, verifySession } from "@/lib/jwt";

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const sessionUserId = await getUserIdFromRequestSession(request);
  if (sessionUserId) return sessionUserId;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    const decoded = verifySession(token);
    return getSessionSubject(decoded);
  }

  return null;
}
