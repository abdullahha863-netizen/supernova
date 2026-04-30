import { getRedis } from "./redis.mjs";

const COUNTERS_KEY = "mining:metrics:counters";
const LATENCY_WINDOW = 500;
const LATENCY_TTL = 60 * 60 * 24;

function labeledKey(name, labels = {}) {
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(",");
  return labelStr ? `${name}{${labelStr}}` : name;
}

export async function incCounter(name, labels = {}, value = 1) {
  try {
    const redis = getRedis();
    await redis.hincrby(COUNTERS_KEY, labeledKey(name, labels), value);
  } catch {
    // Non-critical telemetry path.
  }
}

export async function recordLatency(name, latencyMs) {
  try {
    const redis = getRedis();
    const key = `mining:metrics:latency:${name}`;
    await redis.lpush(key, Number(latencyMs));
    await redis.ltrim(key, 0, LATENCY_WINDOW - 1);
    await redis.expire(key, LATENCY_TTL);
  } catch {
    // Non-critical telemetry path.
  }
}
