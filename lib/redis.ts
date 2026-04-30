import Redis from 'ioredis';

let redis: Redis | null = null;
let lastRedisErrorSignature = '';
let lastRedisErrorLoggedAt = 0;

const REDIS_ERROR_LOG_THROTTLE_MS = 60_000;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: false,
      enableOfflineQueue: false,
    });

    redis.on('error', (err) => {
      const code = typeof err === 'object' && err && 'code' in err ? String(err.code || '') : '';
      const message = err instanceof Error ? err.message : String(err || 'Unknown Redis error');
      const signature = `${code}:${message}`;
      const now = Date.now();
      const shouldLog = signature !== lastRedisErrorSignature || now - lastRedisErrorLoggedAt >= REDIS_ERROR_LOG_THROTTLE_MS;

      if (shouldLog) {
        console.warn('Redis unavailable. Repeated connection errors will be suppressed for 60s.', { code: code || 'UNKNOWN', message });
        lastRedisErrorSignature = signature;
        lastRedisErrorLoggedAt = now;
      }
    });

    redis.on('connect', () => {
      lastRedisErrorSignature = '';
      lastRedisErrorLoggedAt = 0;
      console.log('Redis connected');
    });
  }

  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
