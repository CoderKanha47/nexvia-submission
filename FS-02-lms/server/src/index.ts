import { createApp } from './app';
import { env } from './config/env';
import { connectMongo, disconnectMongo } from './config/mongo';
import { connectRedis, disconnectRedis } from './config/redis';

async function main(): Promise<void> {
  await Promise.all([connectMongo(), connectRedis()]);

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`${signal} received, shutting down`);
    server.close();
    await Promise.allSettled([disconnectMongo(), disconnectRedis()]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
