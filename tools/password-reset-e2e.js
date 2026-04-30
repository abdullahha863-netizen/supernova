const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text}`);
  }
}

async function main() {
  loadEnvFile();

  const { PrismaClient } = require("@prisma/client");

  const base = process.env.BASE_URL || "http://localhost:3000";
  const prisma = new PrismaClient();
  const email = `password-reset-e2e+${Date.now()}@example.com`;
  const initialPassword = "Passw0rd!123";
  const newPassword = "UltraPassw0rd!456";

  let userId = null;

  try {
    const registerRes = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Password Reset E2E",
        email,
        password: initialPassword,
      }),
    });
    const registerBody = await readJson(registerRes);
    if (!registerRes.ok || !registerBody.ok) {
      throw new Error(`Registration failed: ${JSON.stringify(registerBody)}`);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      throw new Error("Registered user was not found in the database.");
    }
    userId = user.id;

    const forgotRes = await fetch(`${base}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const forgotBody = await readJson(forgotRes);
    if (!forgotRes.ok || !forgotBody.ok) {
      throw new Error(`Forgot password failed: ${JSON.stringify(forgotBody)}`);
    }

    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        userId,
        type: "password_reset",
      },
      orderBy: { createdAt: "desc" },
      select: { token: true, expiresAt: true },
    });
    if (!tokenRecord) {
      throw new Error("Forgot password did not create a password reset token.");
    }

    const resetRes = await fetch(`${base}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenRecord.token, password: newPassword }),
    });
    const resetBody = await readJson(resetRes);
    if (!resetRes.ok || !resetBody.ok) {
      throw new Error(`Reset password failed: ${JSON.stringify(resetBody)}`);
    }

    const remainingTokens = await prisma.verificationToken.count({
      where: {
        userId,
        type: "password_reset",
      },
    });
    if (remainingTokens !== 0) {
      throw new Error(`Expected password reset tokens to be cleared, found ${remainingTokens}.`);
    }

    const oldLoginRes = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: initialPassword }),
    });
    const oldLoginBody = await readJson(oldLoginRes);
    if (oldLoginRes.status !== 401 || oldLoginBody.error !== "Invalid credentials") {
      throw new Error(`Old password should fail after reset: ${JSON.stringify(oldLoginBody)}`);
    }

    const newLoginRes = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: newPassword }),
    });
    const newLoginBody = await readJson(newLoginRes);
    if (!newLoginRes.ok || !newLoginBody.ok) {
      throw new Error(`New password login failed: ${JSON.stringify(newLoginBody)}`);
    }

    const sessionCookie = newLoginRes.headers.get("set-cookie") || "";
    if (!sessionCookie.includes("sn_auth=")) {
      throw new Error("Expected login with the new password to return an auth cookie.");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          email,
          resetTokenExpiresAt: tokenRecord.expiresAt,
          oldPasswordRejected: true,
          newPasswordAccepted: true,
        },
        null,
        2
      )
    );
  } finally {
    if (userId) {
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.verificationToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});