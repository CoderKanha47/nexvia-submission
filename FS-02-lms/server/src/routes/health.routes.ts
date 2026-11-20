import { Router } from 'express';
import { isMongoReady } from '../config/mongo';
import { isRedisReady } from '../config/redis';

const startedAt = Date.now();

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      env: process.env.NODE_ENV ?? 'development',
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      mongo: isMongoReady() ? 'up' : 'down',
      redis: isRedisReady() ? 'up' : 'down',
    },
  });
});
