const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

function normalizeEnv(value) {
  const trimmed = String(value || "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

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

async function main() {
  loadEnvFile();

  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter((key) => !normalizeEnv(process.env[key]));
  if (missing.length > 0) {
    console.error(`Missing SMTP configuration: ${missing.join(", ")}`);
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: normalizeEnv(process.env.SMTP_HOST),
    port: Number(normalizeEnv(process.env.SMTP_PORT)),
    secure: Number(normalizeEnv(process.env.SMTP_PORT)) === 465,
    auth: {
      user: normalizeEnv(process.env.SMTP_USER),
      pass: normalizeEnv(process.env.SMTP_PASS),
    },
  });

  await transporter.verify();
  console.log("SMTP verification succeeded.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});