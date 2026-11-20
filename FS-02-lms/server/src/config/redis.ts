import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
  // Logged, not fatal: boot fails only if connectRedis() cannot reach it.
  console.error('Redis error:', err.message);
});

export async function connectRedis(): Promise<void> {
  if (redis.status === 'wait') {
    await redis.connect();
  }
  await redis.ping();
}

export async function disconnectRedis(): Promise<void> {
  if (redis.status !== 'end') {
    await redis.quit();
  }
}

export function isRedisReady(): boolean {
  return redis.status === 'ready';
}
