import Redis from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT || "6379");
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redisClient;
let redisSubClient;

function buildClient() {
  return new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 100, 2000),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
}

export function getRedis() {
  if (!redisClient) redisClient = buildClient();
  return redisClient;
}

export function getRedisSubscriber() {
  if (!redisSubClient) redisSubClient = buildClient();
  return redisSubClient;
}

export async function publishRedis(channel, payload) {
  const redis = getRedis();
  return redis.publish(channel, JSON.stringify(payload));
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (redisSubClient) {
    await redisSubClient.quit();
    redisSubClient = null;
  }
}
