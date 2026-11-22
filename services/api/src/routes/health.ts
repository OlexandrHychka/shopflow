import type { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { config } from '../config.js';

export function registerHealthRoute(app: FastifyInstance) {
  app.get('/health', async (req, reply) => {
    const pool = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 2000,
    });
    try {
      await pool.query('SELECT 1');
      return reply.status(200).send({ status: 'ok' });
    } catch (err) {
      req.log.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'database ping failed',
      );
      return reply.status(503).send({ status: 'error' });
    } finally {
      await pool.end();
    }
  });
}
