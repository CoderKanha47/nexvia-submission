import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

describe('GET /api/v1/health', () => {
  it('returns liveness payload', async () => {
    const res = await request(createApp()).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(['up', 'down']).toContain(res.body.data.mongo);
    expect(['up', 'down']).toContain(res.body.data.redis);
  });
});

describe('404 handling', () => {
  it('returns contract-shaped error for unknown routes', async () => {
    const res = await request(createApp()).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBeTruthy();
  });
});
