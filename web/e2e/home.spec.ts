import { test, expect } from "@playwright/test";

test.describe("ホーム画面", () => {
  test("ロゴ・ナビ・主要ウィジェットが表示される", async ({ page }) => {
    await page.goto("/");

    // タイトル / ヘッダ
    await expect(page).toHaveTitle(/Green Carbon|HR/i);

    // 主要ウィジェット（heading で限定 — ToolGrid の説明文と区別）
    await expect(page.getByRole("heading", { name: "今日の予定" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "最近の動き" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "お祝い" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "よく使うツール" })).toBeVisible();
  });

  test("⌘K でコマンドパレットが開く", async ({ page }) => {
    await page.goto("/");
    // ハイドレーション完了まで待つ（key listener が登録されるまで）
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("ControlOrMeta+K");
    await expect(page.getByPlaceholder(/検索/)).toBeVisible();
  });

  test("? でショートカット一覧が開く", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("?");
    // dialog の heading で限定（command-palette の項目「キーボードショートカットを表示」と区別）
    await expect(page.getByRole("heading", { name: "キーボードショートカット" })).toBeVisible();
  });
});
