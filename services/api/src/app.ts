import { randomUUID } from 'node:crypto';
import fastify, { LogController } from 'fastify';
import { config } from './config.js';
import { resolveCorrelationId } from './correlation-id.js';
import { registerHealthRoute } from './routes/health.js';

const bootCorrelationId = randomUUID();

export function buildApp() {
  const app = fastify({
    logger: {
      level: config.logLevel,
      base: { correlationId: bootCorrelationId },
    },
    requestIdHeader: 'x-correlation-id',
    genReqId(req) {
      return resolveCorrelationId(req.headers['x-correlation-id']);
    },
    logController: new LogController({ requestIdLogLabel: 'correlationId' }),
  });

  app.addHook('onRequest', async (req, reply) => {
    reply.header('x-correlation-id', req.id);
  });

  registerHealthRoute(app);

  return app;
}
