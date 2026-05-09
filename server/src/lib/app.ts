import Fastify, { type FastifyInstance } from 'fastify';

import healthRoutes from '../routes/health.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
      },
    },
  });

  await app.register(import('@fastify/cors'), { origin: 'http://localhost:3000' });
  await app.register(healthRoutes, { prefix: '/api' });

  return app;
}
