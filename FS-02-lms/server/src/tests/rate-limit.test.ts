import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../middleware/error.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';

function buildApp(max: number, windowSec = 60) {
  const app = express();
  app.get('/limited', rateLimit({ windowSec, max }), (_req, res) => {
    res.json({ data: { ok: true } });
  });
  app.use(errorHandler);
  return app;
}

describe('rateLimit middleware', () => {
  it('allows requests under the limit and 429s after it', async () => {
    const app = buildApp(3);

    const first = await request(app).get('/limited');
    expect(first.status).toBe(200);
    expect(first.headers['retry-after']).toBeTruthy();

    for (let i = 0; i < 2; i++) {
      expect((await request(app).get('/limited')).status).toBe(200);
    }

    const blocked = await request(app).get('/limited');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });

  it('resets after the window passes', async () => {
    const app = buildApp(1, 1);

    expect((await request(app).get('/limited')).status).toBe(200);
    expect((await request(app).get('/limited')).status).toBe(429);

    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect((await request(app).get('/limited')).status).toBe(200);
  });
});
