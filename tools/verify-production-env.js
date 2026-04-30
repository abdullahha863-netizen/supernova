const fs = require("fs");
const path = require("path");

function normalizeEnv(value) {
  const trimmed = String(value || "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isPlaceholderValue(value) {
  const normalized = normalizeEnv(value).toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    "replace-with-",
    "replace_with_",
    "replace_me",
    "your-production-domain.example",
    "your-domain.com",
    "your-kaspa-rpc.example",
    "your_pool_address",
    "your-provider.example",
    "username:password@host",
    "smtp.your-provider.com",
    "smtp.your-provider.example",
    "smtp-user",
    "smtp-password",
    "pk_live_replace_me",
    "sk_live_replace_me",
    "whsec_replace_me",
  ].some((marker) => normalized.includes(marker));
}

function resolveEnvPath() {
  const explicit = normalizeEnv(process.env.ENV_FILE || "");
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.join(process.cwd(), explicit);
  }

  const productionPath = path.join(process.cwd(), ".env.production");
  if (fs.existsSync(productionPath)) {
    return productionPath;
  }

  return path.join(process.cwd(), ".env");
}

function loadEnvFile() {
  const envPath = resolveEnvPath();
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
    process.env[key] = value;
  }
}

function boolEnv(key) {
  return normalizeEnv(process.env[key]).toLowerCase() === "true";
}

function requireKeys(label, keys, errors) {
  const invalid = keys.filter((key) => isPlaceholderValue(process.env[key]));
  if (invalid.length > 0) {
    errors.push(`${label}: missing or placeholder ${invalid.join(", ")}`);
  }
}

function requireOneOf(label, keys, errors) {
  if (keys.some((key) => !isPlaceholderValue(process.env[key]))) {
    return;
  }
  errors.push(`${label}: missing or placeholder one of ${keys.join(", ")}`);
}

function main() {
  loadEnvFile();

  const errors = [];
  requireKeys(
    "Core",
    [
      "DATABASE_URL",
      "JWT_SECRET",
      "ADMIN_KEY",
      "CHECKOUT_INTENT_SIGNING_KEY",
      "NEXT_PUBLIC_URL",
      "BASE_URL",
      "SUPERNOVA_BACKEND_URL",
    ],
    errors
  );

  const databaseUrl = normalizeEnv(process.env.DATABASE_URL);
  if (databaseUrl && !databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    errors.push("Core: DATABASE_URL must start with postgresql:// or postgres://");
  }
  if (databaseUrl) {
    try {
      const parsedDatabaseUrl = new URL(databaseUrl);
      if (["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(parsedDatabaseUrl.hostname)) {
        errors.push("Core: DATABASE_URL must not point to localhost in production");
      }
    } catch {
      errors.push("Core: DATABASE_URL must be a valid URL");
    }
  }

  const publicUrl = normalizeEnv(process.env.NEXT_PUBLIC_URL);
  if (publicUrl && publicUrl.includes("localhost")) {
    errors.push("Core: NEXT_PUBLIC_URL still points to localhost");
  }

  const emailTransport = normalizeEnv(process.env.EMAIL_TRANSPORT || "smtp").toLowerCase();
  requireOneOf("Email", ["SMTP_FROM", "EMAIL_FROM"], errors);
  if (emailTransport === "smtp") {
    requireKeys("Email", ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"], errors);
  }

  requireKeys("Redis", ["REDIS_HOST", "REDIS_PORT"], errors);
  requireKeys("RabbitMQ", ["RABBITMQ_URL", "MINING_SHARE_QUEUE"], errors);
  requireKeys("Stratum", ["STRATUM_V1_PORT", "STRATUM_V2_PORT"], errors);
  requireKeys("Kaspa", ["KASPA_RPC_URL", "KASPA_NETWORK", "KASPA_POOL_ADDRESS"], errors);

  if (boolEnv("ENABLE_STRIPE_CHECKOUT")) {
    requireKeys(
      "Stripe",
      ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      errors
    );
  }

  if (boolEnv("ENABLE_NOWPAYMENTS_CHECKOUT")) {
    requireKeys(
      "NOWPayments",
      ["NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET"],
      errors
    );
  }

  if (errors.length > 0) {
    console.error("Production environment check failed:\n");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Production environment check passed.");
}

main();
