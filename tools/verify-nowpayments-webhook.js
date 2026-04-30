const crypto = require("crypto");
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

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sortObject(entry));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = sortObject(value[key]);
        return result;
      }, {});
  }

  return value;
}

function signPayload(payload, secret) {
  return crypto.createHmac("sha512", secret).update(JSON.stringify(sortObject(payload))).digest("hex");
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

  const baseUrl = String(process.env.BASE_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000").replace(/\/+$/, "");
  const secret = String(process.env.NOWPAYMENTS_IPN_SECRET || "").trim();

  if (!secret) {
    throw new Error("NOWPAYMENTS_IPN_SECRET is required to verify the webhook signature flow.");
  }

  const payload = {
    payment_id: 123456789,
    invoice_id: 987654321,
    order_id: `np-webhook-test-${Date.now()}`,
    payment_status: "finished",
    price_amount: 112.99,
    price_currency: "usd",
    pay_amount: 115,
    pay_currency: "trx",
    outcome_amount: 112.99,
    outcome_currency: "usd",
  };

  const signature = signPayload(payload, secret);
  const url = `${baseUrl}/api/nowpayments/webhook`;

  const validRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-nowpayments-sig": signature,
    },
    body: JSON.stringify(payload),
  });
  const validBody = await readJson(validRes);
  if (!validRes.ok || validBody.received !== true) {
    throw new Error(`Valid NOWPayments webhook failed: ${JSON.stringify(validBody)}`);
  }

  const invalidRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-nowpayments-sig": "invalid-signature",
    },
    body: JSON.stringify(payload),
  });
  const invalidBody = await readJson(invalidRes);
  if (invalidRes.status !== 400 || invalidBody.error !== "Invalid webhook signature") {
    throw new Error(`Invalid-signature protection failed: ${JSON.stringify(invalidBody)}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        endpoint: url,
        validSignatureAccepted: true,
        invalidSignatureRejected: true,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});