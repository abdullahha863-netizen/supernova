import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function normalizeEnv(value: string | undefined) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const transportMode = normalizeEnv(process.env.EMAIL_TRANSPORT || "smtp").toLowerCase();
  if (transportMode === "json") {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  const host = normalizeEnv(process.env.SMTP_HOST) || "smtp.example.com";
  const user = normalizeEnv(process.env.SMTP_USER);
  const pass = normalizeEnv(process.env.SMTP_PASS);
  const port = Number(normalizeEnv(process.env.SMTP_PORT) || 587);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string, text?: string) {
  const info = await getTransporter().sendMail({
    from: normalizeEnv(process.env.EMAIL_FROM) || "no-reply@snovapool.io",
    to,
    subject,
    html,
    text,
  });

  if (normalizeEnv(process.env.EMAIL_TRANSPORT) === "json" && typeof info.message === "string") {
    console.info(`Email captured via JSON transport for ${to}: ${subject}`);
  }

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.info(`Email preview for ${to}: ${previewUrl}`);
  }
}
