import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E 設定。
 *
 * - デモモードで dev サーバを起動して全ルートを叩く
 * - CI では retries を 1 に
 */

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Mobile も気になれば足す：
    // { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    // E2E は prod ビルド済みの Next.js を `next start` で起動。
    // dev (turbopack) はコンパイルが遅く / 環境によっては固まるため避ける。
    command: `NEXT_PUBLIC_DEMO_MODE=true PORT=${PORT} npx next start`,
    port: PORT,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
