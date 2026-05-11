import { describe, it, expect } from "vitest";
import { filterActivity, summarizeActivity, activityToCsv } from "@/lib/activity";
import type { ActivityEvent } from "@/lib/demo/activity-stream";

const NOW = Date.parse("2026-05-10T12:00:00Z");

const SAMPLE: ActivityEvent[] = [
  // 5 分前 — AI / info / 高橋
  { id: "a1", category: "ai",    action: "generate", target: "ai_usage_log/recruiting-summary",
    actor: "高橋 真由", occurred_at: new Date(NOW - 5 * 60_000).toISOString(),
    severity: "info", summary: "候補者サマリ生成" },
  // 30 分前 — audit / destructive / 鎌田
  { id: "a2", category: "audit", action: "update", target: "compensation_history/comp_e6",
    actor: "鎌田 彩", occurred_at: new Date(NOW - 30 * 60_000).toISOString(),
    severity: "destructive", summary: "報酬改定" },
  // 2 時間前 — user / notice / 高橋
  { id: "a3", category: "user",  action: "export_csv", target: "/recruiting?export=funnel",
    actor: "高橋 真由", occurred_at: new Date(NOW - 2 * 3_600_000).toISOString(),
    severity: "notice", summary: "ファネル CSV エクスポート" },
  // 4 時間前 — ai / warn / 塚本
  { id: "a4", category: "ai",    action: "agent_run", target: "ai_usage_log/agent.schedule_interview",
    actor: "塚本 真純", occurred_at: new Date(NOW - 4 * 3_600_000).toISOString(),
    severity: "warn", summary: "エージェント承認待ちで停止" },
  // 1 日前 — audit / destructive / system
  { id: "a5", category: "audit", action: "delete", target: "wiki_pages/wp-deprecated",
    actor: "system", occurred_at: new Date(NOW - 86_400_000).toISOString(),
    severity: "destructive", summary: "古い Wiki をアーカイブ" },
];

describe("filterActivity", () => {
  it("フィルタなしで全件", () => {
    expect(filterActivity(SAMPLE)).toHaveLength(5);
  });

  it("category=ai で 2 件", () => {
    expect(filterActivity(SAMPLE, { category: "ai" }).map((e) => e.id)).toEqual(["a1", "a4"]);
  });

  it("category=all は全件素通し", () => {
    expect(filterActivity(SAMPLE, { category: "all" })).toHaveLength(5);
  });

  it("severity=destructive で 2 件", () => {
    expect(filterActivity(SAMPLE, { severity: "destructive" }).map((e) => e.id)).toEqual(["a2", "a5"]);
  });

  it("category × severity の AND", () => {
    expect(filterActivity(SAMPLE, { category: "audit", severity: "destructive" })).toHaveLength(2);
    expect(filterActivity(SAMPLE, { category: "ai", severity: "destructive" })).toHaveLength(0);
  });

  it("query は actor / summary / target を大文字小文字無視で部分一致", () => {
    expect(filterActivity(SAMPLE, { query: "高橋" }).map((e) => e.id)).toEqual(["a1", "a3"]);
    expect(filterActivity(SAMPLE, { query: "RECRUITING" }).map((e) => e.id)).toEqual(["a1", "a3"]);
    expect(filterActivity(SAMPLE, { query: "wiki" })).toHaveLength(1);
  });

  it("since で時刻フィルタ（1 時間前以降）", () => {
    const since = new Date(NOW - 60 * 60_000).toISOString();
    const r = filterActivity(SAMPLE, { since }).map((e) => e.id);
    expect(r).toEqual(["a1", "a2"]);
  });

  it("空クエリ・空白クエリは無視", () => {
    expect(filterActivity(SAMPLE, { query: "" })).toHaveLength(5);
    expect(filterActivity(SAMPLE, { query: "   " })).toHaveLength(5);
  });
});

describe("summarizeActivity", () => {
  it("総数・カテゴリ別・重大度別・破壊的件数", () => {
    const s = summarizeActivity(SAMPLE, NOW);
    expect(s.total).toBe(5);
    expect(s.byCategory).toEqual({ audit: 2, ai: 2, user: 1 });
    expect(s.bySeverity).toEqual({ info: 1, notice: 1, warn: 1, destructive: 2 });
    expect(s.destructiveCount).toBe(2);
  });

  it("recentCount は now から 1 時間以内", () => {
    const s = summarizeActivity(SAMPLE, NOW);
    // 5 分前 (a1) と 30 分前 (a2) のみ
    expect(s.recentCount).toBe(2);
  });

  it("uniqueActors は重複を除いた actor 数", () => {
    // 高橋 真由 (×2) / 鎌田 彩 / 塚本 真純 / system
    expect(summarizeActivity(SAMPLE).uniqueActors).toBe(4);
  });

  it("空配列でも壊れない（全カウントが 0）", () => {
    const s = summarizeActivity([], NOW);
    expect(s.total).toBe(0);
    expect(s.byCategory).toEqual({ audit: 0, ai: 0, user: 0 });
    expect(s.bySeverity).toEqual({ info: 0, notice: 0, warn: 0, destructive: 0 });
    expect(s.uniqueActors).toBe(0);
    expect(s.recentCount).toBe(0);
  });
});

describe("activityToCsv", () => {
  it("ヘッダ + イベント数 行を返す", () => {
    const csv = activityToCsv(SAMPLE.slice(0, 2));
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);                                  // header + 2
    expect(lines[0]).toBe("occurred_at,category,severity,actor,action,target,summary");
  });

  it("カンマ・改行・ダブルクォートを含むセルは引用符でエスケープ", () => {
    const tricky: ActivityEvent[] = [{
      id: "x1", category: "audit", action: "update", target: "employees/e1",
      actor: "Smith, John", occurred_at: "2026-01-01T00:00:00Z",
      severity: "info", summary: 'コメント "改定" あり',
    }];
    const row = activityToCsv(tricky).split("\n")[1];
    expect(row).toContain('"Smith, John"');
    expect(row).toContain('"コメント ""改定"" あり"');
  });

  it("空配列でもヘッダ行のみは返す", () => {
    const csv = activityToCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
    expect(csv).toBe("occurred_at,category,severity,actor,action,target,summary");
  });
});
