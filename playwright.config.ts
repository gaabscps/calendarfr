import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : 2,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'real',
      testDir: './e2e/real',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'smoke',
      testDir: './e2e/smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3003',
      },
    },
  ],
});
