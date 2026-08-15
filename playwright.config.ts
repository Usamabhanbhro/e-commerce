import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4177";
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", video: process.env.PLAYWRIGHT_VIDEO === "on" ? "retain-on-failure" : "off", ...(executablePath ? { launchOptions: { executablePath } } : {}) },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : { command: "NODE_ENV=production APP_ENV=development PORT=4177 DATABASE_URL=postgresql://migration_verify:migration_verify_password@127.0.0.1:5432/migration_verify JWT_SECRET=local-test-secret-local-test-secret PAYMENT_WEBHOOK_SECRET=local-webhook-secret-local-webhook FRONTEND_ORIGIN=http://127.0.0.1:4177 ALLOWED_ORIGINS=http://127.0.0.1:4177 S3_ENDPOINT=http://127.0.0.1:9000 S3_REGION=us-east-1 S3_BUCKET=local-test S3_ACCESS_KEY_ID=local-access-key S3_SECRET_ACCESS_KEY=local-secret-key S3_FORCE_PATH_STYLE=true pnpm build && NODE_ENV=production APP_ENV=development PORT=4177 DATABASE_URL=postgresql://migration_verify:migration_verify_password@127.0.0.1:5432/migration_verify JWT_SECRET=local-test-secret-local-test-secret PAYMENT_WEBHOOK_SECRET=local-webhook-secret-local-webhook FRONTEND_ORIGIN=http://127.0.0.1:4177 ALLOWED_ORIGINS=http://127.0.0.1:4177 S3_ENDPOINT=http://127.0.0.1:9000 S3_REGION=us-east-1 S3_BUCKET=local-test S3_ACCESS_KEY_ID=local-access-key S3_SECRET_ACCESS_KEY=local-secret-key S3_FORCE_PATH_STYLE=true node dist/index.js", url: "http://127.0.0.1:4177/health", reuseExistingServer: true, timeout: 120_000 },
});
