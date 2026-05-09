/**
 * Fastify application factory.
 *
 * buildApp() is the testable entry point:
 *   - Logger: pino-pretty in dev, JSON in production (D10 / NFR-006)
 *   - errorHandler registered BEFORE routes (D7 / AC-024)
 *   - healthRoutes at /api
 *   - daysRoutes at /api  (new — T-012 / AC-001, AC-005)
 */
import Fastify, { type FastifyInstance } from 'fastify';

import daysRoutes from '../routes/days.js';
import healthRoutes from '../routes/health.js';

import { errorHandler } from './errorHandler.js';

const isDev = process.env.NODE_ENV !== 'production';

export async function buildApp(): Promise<FastifyInstance> {
  // Logger: pino-pretty in dev; plain JSON in production.
  // The `true` branch (production logger) is never exercised in Jest.
  /* istanbul ignore next */
  const loggerConfig = isDev ? { transport: { target: 'pino-pretty' } } : true;
  const app = Fastify({ logger: loggerConfig });

  // Global error handler — must be registered before routes
  app.setErrorHandler(errorHandler);

  await app.register(import('@fastify/cors'), {
    origin: 'http://localhost:3000',
  });

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(daysRoutes, { prefix: '/api' });

  return app;
}
