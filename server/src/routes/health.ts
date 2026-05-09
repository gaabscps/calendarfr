import type { FastifyInstance } from 'fastify';

export default function healthRoutes(app: FastifyInstance): void {
  app.get('/health', () => ({
    status: 'ok',
    version: /* istanbul ignore next */ process.env.npm_package_version ?? '0.0.0',
  }));
}
