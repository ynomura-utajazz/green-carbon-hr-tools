/**
 * Activity Stream の純粋関数（フィルタ・集計・CSV 化）。
 *
 * UI から切り離すことで単体テスト可能に。
 * Page コンポーネント側はここを呼ぶだけ。
 */

import type { ActivityEvent, ActivityCategory, ActivitySeverity } from "@/lib/demo/activity-stream";

export type ActivityFilter = {
  category?: ActivityCategory | "all";
  severity?: ActivitySeverity | "all";
  /** 部分一致（actor / target / action / summary を対象に大文字小文字無視） */
  query?: string;
  /** ISO 文字列。これより新しいイベントだけ */
  since?: string;
};

export function filterActivity(events: ActivityEvent[], f: ActivityFilter = {}): ActivityEvent[] {
  const q = (f.query ?? "").trim().toLowerCase();
  const sinceTs = f.since ? Date.parse(f.since) : null;
  return events.filter((e) => {
    if (f.category && f.category !== "all" && e.category !== f.category) return false;
    if (f.severity && f.severity !== "all" && e.severity !== f.severity) return false;
    if (sinceTs !== null && Date.parse(e.occurred_at) < sinceTs) return false;
    if (q) {
      const haystack = [e.action, e.target, e.actor, e.summary].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export type ActivitySummary = {
  total: number;
  byCategory: Record<ActivityCategory, number>;
  bySeverity: Record<ActivitySeverity, number>;
  destructiveCount: number;
  /** 直近 1 時間以内のイベント数 */
  recentCount: number;
  uniqueActors: number;
};

export function summarizeActivity(events: ActivityEvent[], now: number = Date.now()): ActivitySummary {
  const byCategory: Record<ActivityCategory, number> = { audit: 0, ai: 0, user: 0 };
  const bySeverity: Record<ActivitySeverity, number> = { info: 0, notice: 0, warn: 0, destructive: 0 };
  const actors = new Set<string>();
  const oneHourAgo = now - 3_600_000;
  let recentCount = 0;
  for (const e of events) {
    byCategory[e.category]++;
    bySeverity[e.severity]++;
    actors.add(e.actor);
    if (Date.parse(e.occurred_at) >= oneHourAgo) recentCount++;
  }
  return {
    total: events.length,
    byCategory,
    bySeverity,
    destructiveCount: bySeverity.destructive,
    recentCount,
    uniqueActors: actors.size,
  };
}

/** RFC4180 風の最小 CSV 化（アクティビティイベント用、専用カラム順固定） */
export function activityToCsv(events: ActivityEvent[]): string {
  const header = ["occurred_at", "category", "severity", "actor", "action", "target", "summary"];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = events.map((e) =>
    [e.occurred_at, e.category, e.severity, e.actor, e.action, e.target, e.summary]
      .map(escape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
