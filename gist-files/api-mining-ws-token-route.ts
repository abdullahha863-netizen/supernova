import { NextRequest, NextResponse } from "next/server";
import { signSession } from "@/lib/jwt";
import { getUserIdFromRequest } from "@/lib/requestUser";

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = signSession({ userId }, "30m");
  return NextResponse.json({ ok: true, token });
}