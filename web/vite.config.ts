import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 3000,
    strictPort: true,
    host: '127.0.0.1',
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
});
