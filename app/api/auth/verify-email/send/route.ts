import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { buildAppUrl } from "@/lib/appUrl";
import { buildVerifyEmailEmail } from "@/lib/emailTemplates";

export async function POST(req: Request) {
  const userId = await getUserIdFromRequestSession(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`${getClientIp(req)}:${userId}:verify-email-send`, {
    windowMs: 10 * 60_000,
    max: 5,
  });
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await prisma.verificationToken.deleteMany({ where: { userId, type: "email_verification" } });

  await prisma.verificationToken.create({ data: { token, userId, type: "email_verification", expiresAt: expires } });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    const link = buildAppUrl(req, "/verify-email", { token });
    const emailContent = buildVerifyEmailEmail(link);
    await sendEmail(user.email, "Verify your Supernova email", emailContent.html, emailContent.text);
  }

  return NextResponse.json({ ok: true });
}
