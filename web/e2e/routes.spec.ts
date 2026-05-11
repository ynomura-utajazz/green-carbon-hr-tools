import { test, expect } from "@playwright/test";

/**
 * 全主要ルートが 200 で返ることだけを確認するスモークテスト。
 * 中身まで確認しない代わりに、新しいページが追加されてもこのリストに入れれば
 * 「壊れていないか」だけは継続的に守れる。
 */

const ROUTES = [
  "/",
  "/directory",
  "/recruiting",
  "/recruiting-strategy",
  "/recruiting-branding",
  "/recruiting-funnel",
  "/recruiting-referral",
  "/interview-assistant",
  "/talent-pool",
  "/interview-calibration",
  "/recruiting-kpi",
  "/onboarding-ai",
  "/recruiting-budget",
  "/competitor-analysis",
  "/recruiting-roi",
  "/offer-ab",
  "/diversity",
  "/three-sixty",
  "/engagement-deep",
  "/comp-bands",
  "/learning",
  "/talent-review",
  "/perf-calibration",
  "/advocacy",
  "/coaching",
  "/wellbeing",
  "/action-extractor",
  "/team-health",
  "/career-path",
  "/admin/hris-sync",
  "/admin/candidate-experience",
  "/admin/competitor-pipeline",
  "/careers",
  "/careers/track",
  "/careers/feedback",
  "/oneonone",
  "/retention",
  "/retention-oneonone",
  "/hr-dashboard",
  "/onboarding",
  "/offboarding",
  "/orgchart",
  "/team",
  "/contractors",
  "/portal",
  "/alumni",
  "/attendance",
  "/bonus",
  "/expat",
  "/health-check",
  "/helpdesk",
  "/mbo-okr",
  "/offer-letter",
  "/org-management",
  "/pulse-survey",
  "/qualifications",
  "/salary-band",
  "/stock-options",
  "/stress-check",
  "/succession",
  "/training",
  "/value-award",
  "/visa",
  "/voice-box",
  "/wiki",
  "/admin/integrations",
  "/admin/ai-usage",
  "/admin/audit-log",
  "/admin/roles",
  "/admin/data-lake",
  "/admin/ai-agents",
  "/admin/activity-stream",
];

for (const path of ROUTES) {
  test(`${path} が 200 で返る`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status(), `${path} のステータス`).toBeLessThan(400);
  });
}
