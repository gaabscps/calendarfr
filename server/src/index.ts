import { buildApp } from './lib/app.js';

const app = await buildApp();

try {
  await app.listen({ port: 3003, host: '127.0.0.1' });
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
    console.error('Port 3003 in use. Run lsof -i :3003 to identify and kill.');
    process.exit(1);
  }
  throw err;
}
