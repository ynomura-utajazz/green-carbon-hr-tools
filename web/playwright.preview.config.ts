import { defineConfig, devices } from "@playwright/test";

/**
 * Vercel Preview に対する E2E 設定。
 * webServer は起動せず、PLAYWRIGHT_BASE_URL に直接接続する。
 *
 * CI ではホームと主要ルート、モバイル表示を確認。
 * 本番に影響しうるテスト（POST 等）はスキップする想定。
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /(home|routes)\.spec\.ts/, // visual は preview では実行しない
  fullyParallel: true,
  retries: 2,
  workers: 1,
  reporter: "github",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile",   use: { ...devices["iPhone 14"] } },
  ],
});
