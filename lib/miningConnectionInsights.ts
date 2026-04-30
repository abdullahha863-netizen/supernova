import { getRedis } from "@/lib/redis";

const IP_COUNTS_KEY = "mining:obs:connections:ip_counts";
const COUNTRY_COUNTS_KEY = "mining:obs:connections:country_counts";
const RECENT_KEY = "mining:obs:connections:recent";
const KEY_TTL_SECONDS = 60 * 60 * 24 * 2;
const RECENT_MAX = 500;

export type ConnectionObservationInput = {
  source?: string;
  sourceIp?: string;
  country?: string;
  userId?: string;
  workerName?: string;
  eventType?: string;
  at?: number;
};

type RecentEvent = {
  source: string;
  sourceIp: string;
  country: string;
  userId: string;
  workerName: string;
  eventType: string;
  at: number;
};

function normalizeIp(input: string | undefined) {
  const raw = String(input || "").trim();
  if (!raw) return "unknown";
  const ip = raw.split(",")[0]?.trim() || "unknown";
  return ip.replace(/^::ffff:/, "") || "unknown";
}

function normalizeCountry(input: string | undefined) {
  const value = String(input || "").trim().toUpperCase();
  if (!value) return "UNKNOWN";
  if (!/^[A-Z]{2}$/.test(value)) return "UNKNOWN";
  return value;
}

function normalizeSource(input: string | undefined) {
  const value = String(input || "").trim().toLowerCase();
  return value || "unknown";
}

function buildField(source: string, value: string) {
  return `${source}|${value}`;
}

function parseField(field: string) {
  const idx = field.indexOf("|");
  if (idx < 0) {
    return { source: "unknown", value: field };
  }
  return {
    source: field.slice(0, idx) || "unknown",
    value: field.slice(idx + 1) || "unknown",
  };
}

export async function recordConnectionObservation(input: ConnectionObservationInput): Promise<void> {
  try {
    const redis = getRedis();
    const source = normalizeSource(input.source);
    const sourceIp = normalizeIp(input.sourceIp);
    const country = normalizeCountry(input.country);
    const event: RecentEvent = {
      source,
      sourceIp,
      country,
      userId: String(input.userId || ""),
      workerName: String(input.workerName || ""),
      eventType: String(input.eventType || "activity"),
      at: Number(input.at || Date.now()),
    };

    await redis.hincrby(IP_COUNTS_KEY, buildField(source, sourceIp), 1);
    await redis.hincrby(COUNTRY_COUNTS_KEY, buildField(source, country), 1);
    await redis.lpush(RECENT_KEY, JSON.stringify(event));
    await redis.ltrim(RECENT_KEY, 0, RECENT_MAX - 1);
    await redis.expire(IP_COUNTS_KEY, KEY_TTL_SECONDS);
    await redis.expire(COUNTRY_COUNTS_KEY, KEY_TTL_SECONDS);
    await redis.expire(RECENT_KEY, KEY_TTL_SECONDS);
  } catch {
    // Non-critical telemetry path.
  }
}

export async function getConnectionInsights(source: string, topLimit = 12, recentLimit = 30) {
  const redis = getRedis();
  const normalizedSource = normalizeSource(source);

  const [rawIpCounts, rawCountryCounts, recentRaw] = await Promise.all([
    redis.hgetall(IP_COUNTS_KEY),
    redis.hgetall(COUNTRY_COUNTS_KEY),
    redis.lrange(RECENT_KEY, 0, Math.max(0, recentLimit - 1)),
  ]);

  const topIps = Object.entries(rawIpCounts || {})
    .map(([field, value]) => {
      const parsed = parseField(field);
      return {
        source: parsed.source,
        ip: parsed.value,
        count: Number(value || 0),
      };
    })
    .filter((row) => (normalizedSource === "all" ? true : row.source === normalizedSource))
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(1, topLimit));

  const topCountries = Object.entries(rawCountryCounts || {})
    .map(([field, value]) => {
      const parsed = parseField(field);
      return {
        source: parsed.source,
        country: parsed.value,
        count: Number(value || 0),
      };
    })
    .filter((row) => (normalizedSource === "all" ? true : row.source === normalizedSource))
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(1, topLimit));

  const recent = recentRaw
    .map((row) => {
      try {
        return JSON.parse(row) as RecentEvent;
      } catch {
        return null;
      }
    })
    .filter((row): row is RecentEvent => Boolean(row))
    .filter((row) => (normalizedSource === "all" ? true : row.source === normalizedSource));

  return {
    source: normalizedSource,
    topIps,
    topCountries,
    recent,
  };
}
