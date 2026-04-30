type Key = string;

type RateLimitOptions = {
  windowMs?: number;
  max?: number;
};

type RateLimitMetricsEvent = {
  ts: number;
  routeKey: string;
  ip: string;
  blocked: boolean;
};

type ProgressiveRateLimitState = {
  failures: number;
  blockedUntil: number;
};

const DEFAULT_LIMITS = {
  WINDOW_MS: 60_000,
  MAX: 10,
};

const map = new Map<Key, { count: number; reset: number }>();
const progressiveMap = new Map<Key, ProgressiveRateLimitState>();
const requestCounters = new Map<string, number>();
const blockedCounters = new Map<string, number>();
const ipCounters = new Map<string, number>();
const recentEvents: RateLimitMetricsEvent[] = [];
const RECENT_WINDOW_MS = 10 * 60 * 1000;
const MAX_RECENT_EVENTS = 2000;

function parseRateLimitKey(key: string) {
  const parts = key.split(":");
  if (parts[0] !== "ratelimit" || parts.length < 3) {
    return { routeKey: key, ip: "unknown" };
  }
  const ip = parts.pop() ?? "unknown";
  const routeKey = parts.slice(1).join(":");
  return { routeKey, ip };
}

function pruneOldEvents(now: number) {
  const threshold = now - RECENT_WINDOW_MS;
  let removeCount = 0;
  while (removeCount < recentEvents.length && recentEvents[removeCount].ts < threshold) {
    removeCount += 1;
  }
  if (removeCount > 0) {
    recentEvents.splice(0, removeCount);
  }
}

function recordMetrics(key: Key, blocked: boolean) {
  const { routeKey, ip } = parseRateLimitKey(key);
  requestCounters.set(routeKey, (requestCounters.get(routeKey) ?? 0) + 1);
  ipCounters.set(ip, (ipCounters.get(ip) ?? 0) + 1);
  if (blocked) {
    blockedCounters.set(routeKey, (blockedCounters.get(routeKey) ?? 0) + 1);
  }

  const now = Date.now();
  recentEvents.push({ ts: now, routeKey, ip, blocked });
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.splice(0, recentEvents.length - MAX_RECENT_EVENTS);
  }
  pruneOldEvents(now);
}

export function rateLimit(key: Key, options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? DEFAULT_LIMITS.WINDOW_MS;
  const max = options.max ?? DEFAULT_LIMITS.MAX;
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.reset) {
    map.set(key, { count: 1, reset: now + windowMs });
    recordMetrics(key, false);
    return { ok: true, remaining: max - 1 };
  }

  if (entry.count >= max) {
    recordMetrics(key, true);
    return { ok: false, retryAfter: entry.reset - now };
  }

  entry.count += 1;
  recordMetrics(key, false);
  return { ok: true, remaining: max - entry.count };
}

function getProgressiveBlockWindowMs(failures: number) {
  if (failures >= 9) return 15 * 60_000;
  if (failures >= 6) return 6 * 60_000;
  if (failures >= 3) return 3 * 60_000;
  return 0;
}

export function progressiveRateLimit(key: Key) {
  const now = Date.now();
  const entry = progressiveMap.get(key);

  if (!entry) {
    return { ok: true as const, failures: 0 };
  }

  if (entry.blockedUntil > now) {
    return {
      ok: false as const,
      failures: entry.failures,
      retryAfter: entry.blockedUntil - now,
    };
  }

  if (entry.blockedUntil > 0 && entry.blockedUntil <= now) {
    progressiveMap.set(key, { failures: entry.failures, blockedUntil: 0 });
    return { ok: true as const, failures: entry.failures };
  }

  return { ok: true as const, failures: entry.failures };
}

export function registerProgressiveRateLimitFailure(key: Key) {
  const now = Date.now();
  const current = progressiveMap.get(key) ?? { failures: 0, blockedUntil: 0 };
  const failures = current.failures + 1;
  const blockWindowMs = getProgressiveBlockWindowMs(failures);
  const blockedUntil = blockWindowMs > 0 ? now + blockWindowMs : 0;

  progressiveMap.set(key, { failures, blockedUntil });

  return {
    failures,
    blocked: blockWindowMs > 0,
    retryAfter: blockWindowMs,
  };
}

export function resetProgressiveRateLimit(key: Key) {
  progressiveMap.delete(key);
}

export function getRateLimitMetrics() {
  const now = Date.now();
  pruneOldEvents(now);

  const topIps = Array.from(ipCounters.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  const spikeMap = new Map<string, { current: number; previous: number }>();
  const currentWindowStart = now - 5 * 60 * 1000;
  const previousWindowStart = now - 10 * 60 * 1000;

  for (const event of recentEvents) {
    const bucket = spikeMap.get(event.routeKey) ?? { current: 0, previous: 0 };
    if (event.ts >= currentWindowStart) {
      bucket.current += 1;
    } else if (event.ts >= previousWindowStart) {
      bucket.previous += 1;
    }
    spikeMap.set(event.routeKey, bucket);
  }

  const spikes = Array.from(spikeMap.entries())
    .map(([routeKey, stats]) => {
      if (stats.previous === 0 && stats.current >= 20) {
        return `High recent traffic for ${routeKey}: ${stats.current} requests in the last 5 minutes.`;
      }
      if (stats.previous > 0 && stats.current >= stats.previous * 2 && stats.current >= 10) {
        const ratio = (stats.current / stats.previous).toFixed(1);
        return `${routeKey} traffic spike: ${stats.current} requests last 5m (×${ratio} vs prior 5m).`;
      }
      return null;
    })
    .filter(Boolean) as string[];

  return {
    metricsAt: new Date(now).toISOString(),
    requestCounts: Object.fromEntries(
      Array.from(requestCounters.entries()).sort((a, b) => b[1] - a[1])
    ),
    blockedCounts: Object.fromEntries(
      Array.from(blockedCounters.entries()).sort((a, b) => b[1] - a[1])
    ),
    topIps,
    spikeNotes: spikes.length > 0 ? spikes : ["No spikes detected in the last 10 minutes."],
  };
}
