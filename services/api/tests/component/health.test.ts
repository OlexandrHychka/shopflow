import { describe, expect, it } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function buildApp() {
  const { buildApp: builder } = await import('../../src/app.js');
  return builder();
}

describe('NFR-008 GET /health', () => {
  it('returns 200 when PostgreSQL answers', async () => {
    const container = await new PostgreSqlContainer('postgres:18.7').start();
    process.env.DATABASE_URL = container.getConnectionUri();

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok' });

    await container.stop();
  });

  it('returns 503 when PostgreSQL does not answer', async () => {
    process.env.DATABASE_URL = 'postgres://shopflow:x@127.0.0.1:1/shopflow';

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.payload)).toEqual({ status: 'error' });
  });

  it('NFR-007 echoes the correlation ID in the response header', async () => {
    process.env.DATABASE_URL = 'postgres://shopflow:x@127.0.0.1:1/shopflow';

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-correlation-id': 'phase-0-check' },
    });

    expect(res.headers['x-correlation-id']).toBe('phase-0-check');
  });

  it('NFR-007 generates a correlation ID when the header is absent', async () => {
    process.env.DATABASE_URL = 'postgres://shopflow:x@127.0.0.1:1/shopflow';

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.headers['x-correlation-id']).toMatch(uuidPattern);
  });
});
