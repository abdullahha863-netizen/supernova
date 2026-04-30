function normalizeEnv(value: string | undefined) {
  return String(value || "").trim();
}

function isLocalhostHost(hostname: string) {
  return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname);
}

export function assertProductionDatabaseUrl() {
  if (process.env.NODE_ENV !== "production") return;

  const databaseUrl = normalizeEnv(process.env.DATABASE_URL);
  if (!databaseUrl) {
    throw new Error("Production DATABASE_URL is required");
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Production DATABASE_URL must be a valid URL");
  }

  if (!["postgresql:", "postgres:"].includes(parsed.protocol)) {
    throw new Error("Production DATABASE_URL must use PostgreSQL");
  }

  if (isLocalhostHost(parsed.hostname)) {
    throw new Error("Production DATABASE_URL must not point to localhost");
  }
}
