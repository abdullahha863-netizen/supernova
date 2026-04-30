type EmailContent = {
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmail({
  eyebrow,
  title,
  intro,
  ctaLabel,
  ctaUrl,
  details,
  closing,
  textLines,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  ctaLabel?: string;
  ctaUrl?: string;
  details?: string[];
  closing: string;
  textLines: string[];
}): EmailContent {
  const htmlDetails = (details || [])
    .map((detail) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.64);">${detail}</p>`)
    .join("");

  const html = `
    <div style="background:#050505;padding:32px 20px;font-family:Arial,sans-serif;color:#f5f5f5;">
      <div style="max-width:560px;margin:0 auto;border:1px solid rgba(201,235,85,0.22);border-radius:20px;background:#0d0d0d;padding:32px;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#c9eb55;">${escapeHtml(eyebrow)}</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#ffffff;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.74);">${intro}</p>
        ${
          ctaLabel && ctaUrl
            ? `<p style="margin:24px 0;"><a href="${ctaUrl}" style="display:inline-block;background:#c9eb55;color:#050505;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:700;">${escapeHtml(ctaLabel)}</a></p>`
            : ""
        }
        ${htmlDetails}
        <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.52);">${closing}</p>
      </div>
    </div>
  `;

  return {
    html,
    text: textLines.join("\n"),
  };
}

export function buildResetPasswordEmail(link: string): EmailContent {
  return renderEmail({
    eyebrow: "Supernova Security",
    title: "Reset your password",
    intro: "We received a request to reset your Supernova password. This link stays valid for 1 hour.",
    ctaLabel: "Reset password",
    ctaUrl: link,
    details: [
      "If the button does not open, copy and paste this URL into your browser:",
      `<a href="${link}" style="color:#c9eb55;word-break:break-word;">${escapeHtml(link)}</a>`,
    ],
    closing: "If you did not request this change, you can ignore this email. Your current password will keep working until you use the reset link.",
    textLines: [
      "Reset your Supernova password",
      "",
      "We received a request to reset your password.",
      "This link stays valid for 1 hour:",
      link,
      "",
      "If you did not request this, you can ignore this email.",
    ],
  });
}

export function buildVerifyEmailEmail(link: string): EmailContent {
  return renderEmail({
    eyebrow: "Supernova Verification",
    title: "Verify your email",
    intro: "Confirm your email address to finish securing your Supernova account.",
    ctaLabel: "Verify email",
    ctaUrl: link,
    details: [
      "This verification link stays valid for 24 hours.",
      `<a href="${link}" style="color:#c9eb55;word-break:break-word;">${escapeHtml(link)}</a>`,
    ],
    closing: "If you did not create or update this account, you can ignore this email.",
    textLines: [
      "Verify your Supernova email",
      "",
      "Use this link within 24 hours:",
      link,
      "",
      "If you did not request this, you can ignore this email.",
    ],
  });
}

export function buildConfirmNewEmailEmail(link: string): EmailContent {
  return renderEmail({
    eyebrow: "Supernova Profile",
    title: "Confirm your new email",
    intro: "You requested to change the email on your Supernova account. Confirm the new address to complete the change.",
    ctaLabel: "Confirm new email",
    ctaUrl: link,
    details: [
      "This confirmation link stays valid for 30 minutes.",
      `<a href="${link}" style="color:#c9eb55;word-break:break-word;">${escapeHtml(link)}</a>`,
    ],
    closing: "If you did not request this update, secure your account immediately and ignore this email.",
    textLines: [
      "Confirm your new Supernova email",
      "",
      "You requested to change your account email.",
      "This link stays valid for 30 minutes:",
      link,
      "",
      "If this was not you, secure your account immediately.",
    ],
  });
}

export function buildTwoFactorCodeEmail(code: string): EmailContent {
  return renderEmail({
    eyebrow: "Supernova 2FA",
    title: "Your sign-in code",
    intro: `Use this verification code to finish signing in: <strong style="color:#c9eb55;font-size:28px;letter-spacing:0.18em;">${escapeHtml(code)}</strong>`,
    details: ["This code expires in 10 minutes.", "Never share this code with anyone."],
    closing: "If you did not try to sign in, change your password and review your account security settings.",
    textLines: [
      "Your Supernova sign-in code",
      "",
      `Code: ${code}`,
      "Expires in 10 minutes.",
      "Never share this code with anyone.",
    ],
  });
}

export function buildPinRecoveryEmail(code: string): EmailContent {
  return renderEmail({
    eyebrow: "Supernova Security",
    title: "PIN recovery code",
    intro: `Use this recovery code to reset your dashboard PIN: <strong style="color:#c9eb55;font-size:28px;letter-spacing:0.18em;">${escapeHtml(code)}</strong>`,
    details: ["This code expires in 10 minutes.", "Only enter it on the official Supernova security page."],
    closing: "If you did not request PIN recovery, secure your account immediately.",
    textLines: [
      "Supernova PIN recovery code",
      "",
      `Code: ${code}`,
      "Expires in 10 minutes.",
      "If you did not request this, secure your account immediately.",
    ],
  });
}

export function buildPayoutUpdatedEmail({
  payoutAddress,
  minPayout,
  ip,
}: {
  payoutAddress: string;
  minPayout: number;
  ip: string;
}): EmailContent {
  return renderEmail({
    eyebrow: "Supernova Finance",
    title: "Payout settings updated",
    intro: "Your Supernova payout settings were changed successfully.",
    details: [
      `<strong>Address:</strong> ${escapeHtml(payoutAddress)}`,
      `<strong>Minimum payout:</strong> ${escapeHtml(String(minPayout))} KAS`,
      `<strong>IP:</strong> ${escapeHtml(ip)}`,
    ],
    closing: "If you did not make this change, secure your account immediately and rotate your credentials.",
    textLines: [
      "Payout settings updated",
      "",
      `Address: ${payoutAddress}`,
      `Minimum payout: ${minPayout} KAS`,
      `IP: ${ip}`,
      "",
      "If you did not make this change, secure your account immediately.",
    ],
  });
}