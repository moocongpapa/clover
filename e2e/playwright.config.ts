import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load backend/.env if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(__dirname, '../backend/.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...rest] = trimmed.split('=');
          const val = rest.join('=').replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {}
}

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
