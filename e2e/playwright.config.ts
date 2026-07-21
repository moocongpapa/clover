import { defineConfig, devices } from '@playwright/test';

process.env.API_URL = process.env.API_URL ?? 'http://localhost:3001';
process.env.BASE_URL = process.env.BASE_URL ?? 'http://localhost:5175';

const API_URL = process.env.API_URL;
const BASE_URL = process.env.BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  globalSetup: './global-setup.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node scripts/e2e-reset.js && npx prisma db push --skip-generate && npx nest start',
      cwd: '../backend',
      url: `${API_URL}/auth/kakao/url`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        ...process.env,
        DATABASE_URL: 'file:./e2e.db?connection_limit=1',
        PORT: '3001',
        DEV_LOGIN_ENABLED: 'true',
        FRONTEND_URL: BASE_URL,
      },
    },
    {
      command: 'npx vite --port 5175',
      cwd: '../frontend',
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...process.env,
        VITE_API_URL: API_URL,
      },
    },
  ],
});
