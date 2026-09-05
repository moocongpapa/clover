import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "crypto";

process.env.API_URL = process.env.API_URL ?? "http://localhost:3001";
process.env.BASE_URL = process.env.BASE_URL ?? "http://localhost:5175";

const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL;
if (!E2E_DATABASE_URL) {
  throw new Error(
    "E2E_DATABASE_URL is required. Refusing to run tests against DATABASE_URL.",
  );
}

const e2eDatabaseName = new URL(E2E_DATABASE_URL).pathname.replace(/^\//, "");
if (!/(^|[_-])(e2e|test)([_-]|$)/i.test(e2eDatabaseName)) {
  throw new Error(
    "E2E_DATABASE_URL must target a database whose name contains e2e or test.",
  );
}

process.env.E2E_TEST_SECRET =
  process.env.E2E_TEST_SECRET ?? randomBytes(32).toString("hex");

const API_URL = process.env.API_URL;
const BASE_URL = process.env.BASE_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  globalSetup: "./global-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command:
        "npx prisma db push --force-reset --skip-generate && npx nest start",
      cwd: "../backend",
      url: `${API_URL}/auth/kakao/url`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        ...process.env,
        DATABASE_URL: E2E_DATABASE_URL,
        DIRECT_URL: E2E_DATABASE_URL,
        PORT: "3001",
        NODE_ENV: "test",
        DEV_LOGIN_ENABLED: "true",
        FRONTEND_URL: BASE_URL,
      },
    },
    {
      command: "npx vite --port 5175",
      cwd: "../frontend",
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
