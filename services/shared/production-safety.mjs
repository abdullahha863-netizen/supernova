import { logger } from "./logger.mjs";

export const PRODUCTION_MINING_ERROR = "Production mining requires real Kaspa RPC configuration";

function normalizeEnv(value) {
  return String(value || "").trim();
}

function isLocalhostHost(hostname) {
  return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname);
}

export function getKaspaRpcConfig() {
  return {
    rpcUrl: normalizeEnv(process.env.KASPA_RPC_URL),
    rpcUsername: normalizeEnv(process.env.KASPA_RPC_USERNAME),
    rpcPassword: normalizeEnv(process.env.KASPA_RPC_PASSWORD),
    network: normalizeEnv(process.env.KASPA_NETWORK || "mainnet"),
    poolAddress: normalizeEnv(process.env.KASPA_POOL_ADDRESS),
  };
}

export function assertProductionMiningSafety(serviceName) {
  if (process.env.NODE_ENV !== "production") {
    return getKaspaRpcConfig();
  }

  const config = getKaspaRpcConfig();
  if (!config.rpcUrl || !config.poolAddress) {
    logger.error(PRODUCTION_MINING_ERROR, { service: serviceName });
    throw new Error(PRODUCTION_MINING_ERROR);
  }

  return config;
}

export function assertNoProductionLocalDatabase(serviceName) {
  if (process.env.NODE_ENV !== "production") return;

  const databaseUrl = normalizeEnv(process.env.DATABASE_URL);
  if (!databaseUrl) {
    throw new Error("Production DATABASE_URL is required");
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Production DATABASE_URL must be a valid URL");
  }

  if (!["postgresql:", "postgres:"].includes(parsed.protocol)) {
    throw new Error("Production DATABASE_URL must use PostgreSQL");
  }

  if (isLocalhostHost(parsed.hostname)) {
    const message = "Production DATABASE_URL must not point to localhost";
    logger.error(message, { service: serviceName, host: parsed.hostname });
    throw new Error(message);
  }
}
