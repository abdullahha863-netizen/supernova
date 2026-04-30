/**
 * Redis-backed counters and latency histograms for the mining platform.
 * All operations fail silently — metrics are non-critical.
 */

import { getRedis } from "./redis";

const COUNTERS_KEY = "mining:metrics:counters";
const LATENCY_WINDOW = 500; // Keep the last 500 samples per metric
const LATENCY_TTL = 60 * 60 * 24; // 24 h

// ── Counters ──────────────────────────────────────────────────────────────────

/**
 * Atomically increment a named counter.
 * `labels` are embedded in the field name (e.g. method="POST").
 */
export async function incCounter(
  name: string,
  labels: Record<string, string> = {},
  value = 1,
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.hincrby(COUNTERS_KEY, labeledKey(name, labels), value);
  } catch {
    // non-critical — ignore
  }
}

// ── Latency histograms ────────────────────────────────────────────────────────

/**
 * Record a latency observation (in milliseconds).
 * Stores the last `LATENCY_WINDOW` values in a Redis list.
 */
export async function recordLatency(name: string, latencyMs: number): Promise<void> {
  try {
    const redis = getRedis();
    const key = `mining:metrics:latency:${name}`;
    await redis.lpush(key, latencyMs);
    await redis.ltrim(key, 0, LATENCY_WINDOW - 1);
    await redis.expire(key, LATENCY_TTL);
  } catch {
    // non-critical — ignore
  }
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

export interface LatencyStat {
  count: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface MetricsSnapshot {
  counters: Record<string, number>;
  latency: Record<string, LatencyStat>;
}

export async function getMetricsSnapshot(): Promise<MetricsSnapshot> {
  const redis = getRedis();

  // 1. Counters
  const rawCounters = await redis.hgetall(COUNTERS_KEY);
  const counters: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawCounters ?? {})) {
    counters[k] = Number(v);
  }

  // 2. Latency sets
  const latencyKeys = await redis.keys("mining:metrics:latency:*");
  const latency: Record<string, LatencyStat> = {};

  await Promise.all(
    latencyKeys.map(async (key) => {
      const metricName = key.replace("mining:metrics:latency:", "");
      const raw = await redis.lrange(key, 0, -1);
      if (raw.length === 0) return;

      const values = raw.map(Number);
      const sorted = [...values].sort((a, b) => a - b);
      const count = sorted.length;
      const sum = values.reduce((a, b) => a + b, 0);

      latency[metricName] = {
        count,
        avg: Math.round(sum / count),
        p50: sorted[Math.floor(count * 0.5)] ?? 0,
        p95: sorted[Math.floor(count * 0.95)] ?? 0,
        p99: sorted[Math.floor(count * 0.99)] ?? 0,
      };
    }),
  );

  return { counters, latency };
}

// ── Prometheus text format ────────────────────────────────────────────────────

export function toPrometheusText(snapshot: MetricsSnapshot): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(snapshot.counters)) {
    const metric = `mining_${sanitize(key)}`;
    lines.push(`# TYPE ${metric} counter`);
    lines.push(`${metric} ${value}`);
  }

  for (const [name, stats] of Object.entries(snapshot.latency)) {
    const base = `mining_${sanitize(name)}_latency_ms`;
    lines.push(`# TYPE ${base} summary`);
    lines.push(`${base}_count ${stats.count}`);
    lines.push(`${base}_avg ${stats.avg}`);
    lines.push(`${base}{quantile="0.5"} ${stats.p50}`);
    lines.push(`${base}{quantile="0.95"} ${stats.p95}`);
    lines.push(`${base}{quantile="0.99"} ${stats.p99}`);
  }

  return lines.join("\n") + "\n";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function labeledKey(name: string, labels: Record<string, string>): string {
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(",");
  return labelStr ? `${name}{${labelStr}}` : name;
}

function sanitize(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, "_");
}
