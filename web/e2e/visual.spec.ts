import { test, expect } from "@playwright/test";

/**
 * Visual regression — 主要画面のスクリーンショット差分テスト。
 *
 * ── 運用 ─────────────────────────────────────────────
 *  初回 / UI 大改修時：
 *      npm run test:e2e -- --update-snapshots
 *    → e2e/visual.spec.ts-snapshots/ にベースラインが書き込まれる。
 *    git で commit → 以後の PR は差分があれば失敗するようになる。
 *
 *  CI で失敗した時はアーティファクトの diff PNG を確認 → 意図的なら
 *  --update-snapshots で再生成 → コミット。
 *
 * ── 注意点 ───────────────────────────────────────────
 *  動的データ（時刻表示・アニメーション・ID 表示）は差分の主因。
 *  対策：
 *    - mask: にセレクタを並べる（領域を黒塗りする）
 *    - animations: "disabled"
 *    - 必要なら CSS injection で transition を切る
 */

const PAGES = [
  { path: "/",                title: "home" },
  { path: "/directory",       title: "directory" },
  { path: "/recruiting",      title: "recruiting" },
  { path: "/hr-dashboard",    title: "hr-dashboard" },
  { path: "/oneonone",        title: "oneonone" },
  { path: "/admin/integrations", title: "admin-integrations" },
];

for (const p of PAGES) {
  test(`visual: ${p.title}`, async ({ page }) => {
    await page.goto(p.path);
    // フォント読み込みとアニメーションの落ち着きを待つ
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot(`${p.title}.png`, {
      fullPage: true,
      animations: "disabled",
      mask: [
        // 動的に変わる領域はマスク（時刻・ランダムグラフ）
        page.locator("[data-mask='time']"),
        page.locator("time"),
      ],
      maxDiffPixelRatio: 0.02, // 2% までの差分は許容（フォントレンダ揺れ対策）
    });
  });
}
