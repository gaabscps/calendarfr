import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Load .env from the monorepo root (one level up from web/). Vite's default
// cwd is the workspace dir, which doesn't see the root .env. Manual __dirname
// equivalent because this config runs as an ES module.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT_ENV_DIR = path.resolve(HERE, '..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ROOT_ENV_DIR, '');
  return {
    plugins: [react(), tsconfigPaths()],
    server: {
      port: 3000,
      strictPort: true,
      host: '127.0.0.1',
    },
    // Substitute literal `process.env.VITE_*` accesses at build time so the
    // supabase client works in the browser (where `process` is undefined) AND
    // in Jest (where `process.env` is real). Requires literal access patterns
    // in source — `process.env[key]` with a dynamic key won't be rewritten.
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env['VITE_SUPABASE_URL'] ?? ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env['VITE_SUPABASE_ANON_KEY'] ?? ''),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/@tiptap')) {
              return 'tiptap';
            }
            if (id.includes('node_modules/framer-motion')) {
              return 'framer-motion';
            }
            if (id.includes('node_modules/@fontsource')) {
              return 'fonts';
            }
            if (
              id.includes('node_modules/isomorphic-dompurify') ||
              id.includes('node_modules/dompurify')
            ) {
              return 'sanitize';
            }
            if (id.includes('/features/daily-page/')) {
              return 'daily-page';
            }
            if (id.includes('/features/')) {
              return 'features-leaves';
            }
            return null;
          },
        },
      },
    },
  };
});
