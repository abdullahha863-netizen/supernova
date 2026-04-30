import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { buildAppUrl } from "@/lib/appUrl";
import { buildResetPasswordEmail } from "@/lib/emailTemplates";

export async function POST(req: Request) {
  const rl = rateLimit(getClientIp(req), { windowMs: 10 * 60_000, max: 5 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  const normalizedEmail = String(email).trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  if (!emailOk) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return NextResponse.json({ ok: true });

  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.verificationToken.deleteMany({ where: { userId: user.id, type: "password_reset" } });

  await prisma.verificationToken.create({ data: { token, userId: user.id, type: "password_reset", expiresAt: expires } });

  const link = buildAppUrl(req, "/reset-password", { token });
  const emailContent = buildResetPasswordEmail(link);
  await sendEmail(user.email, "Reset your Supernova password", emailContent.html, emailContent.text);

  return NextResponse.json({ ok: true });
}
