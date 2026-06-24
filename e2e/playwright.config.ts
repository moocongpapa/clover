import { defineConfig, devices } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

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
      command: 'npm run start:e2e',
      cwd: '../backend',
      url: `${API_URL}/auth/kakao/url`,
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        ...process.env,
        DATABASE_URL: 'file:./e2e.db',
        PORT: '3000',
        DEV_LOGIN_ENABLED: 'true',
        FRONTEND_URL: BASE_URL,
      },
    },
    {
      command: 'npm run dev',
      cwd: '../frontend',
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
