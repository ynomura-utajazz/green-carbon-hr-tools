/**
 * 1on1 のデモデータ。各メンバーに対して直近2-3ヶ月分のセッションを生成。
 * mood は 5段階（great/good/ok/down/bad）。
 */

import { DEMO_EMPLOYEES, type DemoEmployee } from "./employees";
import { fakeGoogleMeetUrl } from "../google-calendar";

export type OneOnOneMood = "great" | "good" | "ok" | "down" | "bad";

export type OneOnOneSession = {
  id: string;
  manager_id: string;
  member_id: string;
  scheduled_at: string;        // ISO
  completed_at: string | null;
  duration_minutes: number;
  mood: OneOnOneMood | null;
  agenda: string;
  notes: string;
  topics: string[];
  /** Google Calendar 連携 */
  calendar_event_id: string | null;
  meet_url: string | null;
};

export type ActionItem = {
  id: string;
  one_on_one_id: string;
  member_id: string;
  assignee_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
};

export const MOOD_EMOJI: Record<OneOnOneMood, string> = {
  great: "😄",
  good:  "🙂",
  ok:    "😐",
  down:  "😟",
  bad:   "😞",
};

export const MOOD_COLOR: Record<OneOnOneMood, string> = {
  great: "var(--lime-500)",
  good:  "var(--gc-500)",
  ok:    "oklch(0.7 0.05 90)",
  down:  "oklch(0.7 0.15 50)",
  bad:   "oklch(0.55 0.22 27)",
};

export const MOOD_RANK: Record<OneOnOneMood, number> = {
  great: 5, good: 4, ok: 3, down: 2, bad: 1,
};

const NOTES_BANK = [
  "Q2 OKR の進捗確認。新規パートナー獲得の進み具合とブロッカーをディスカッション。",
  "メンバーマネジメントで悩みあり。具体的な状況を聞き、来週フォロー予定。",
  "新しい顧客プロジェクトに高いモチベーション。週次でステータス共有することに合意。",
  "業務量が高止まり。優先順位の見直しと業務委譲先を検討。",
  "キャリアパスについて中期的な希望をヒアリング。L&D予算の活用案を共有。",
  "技術的負債の解消プランを共有。エンジニアリングロードマップに反映予定。",
  "クライアントとの関係構築が順調。次のフェーズ提案を準備中。",
  "リモートワークでの孤立感に課題。チームビルディング施策を企画。",
  "海外チームとの連携で時差調整がストレス。ミーティング時間の見直しを実施。",
  "新しいスキル習得への意欲が高い。社内研修と外部カンファレンスを推奨。",
];

const TOPICS_BANK = [
  ["パフォーマンス", "目標進捗"],
  ["メンバーマネジメント"],
  ["キャリア開発", "スキル"],
  ["業務量", "優先順位"],
  ["メンタルヘルス"],
  ["プロジェクト課題"],
  ["チームコラボレーション"],
  ["プロセス改善"],
];

const ACTION_BANK = [
  "Q2 OKR の進捗を週次で更新する",
  "新メンバー候補3名と面談セットアップ",
  "技術ブログ執筆（テーマは要相談）",
  "1on1 アジェンダを事前共有するよう習慣化",
  "外部カンファレンス参加申請を提出",
  "プロジェクト振り返りをドキュメント化",
  "クロスファンクショナルなランチをセット",
];

const MOOD_SEQUENCE: OneOnOneMood[] = ["good", "great", "ok", "good", "great", "down", "good", "great", "good", "ok"];

function buildSessionsForReport(manager: DemoEmployee, member: DemoEmployee, baseDate: Date): OneOnOneSession[] {
  // 過去5回分（隔週）
  const sessions: OneOnOneSession[] = [];
  const seed = member.id.charCodeAt(member.id.length - 1) % MOOD_SEQUENCE.length;
  for (let i = 0; i < 5; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i * 14 - 7);
    const completed = new Date(d);
    completed.setHours(15, 0, 0, 0);
    const moodIdx = (seed + i) % MOOD_SEQUENCE.length;
    const sid = `oo-${member.id}-${i}`;
    sessions.push({
      id: sid,
      manager_id: manager.id,
      member_id: member.id,
      scheduled_at: d.toISOString(),
      completed_at: completed.toISOString(),
      duration_minutes: 30,
      mood: MOOD_SEQUENCE[moodIdx],
      agenda: TOPICS_BANK[(seed + i) % TOPICS_BANK.length].join(" / "),
      notes: NOTES_BANK[(seed + i + member.id.length) % NOTES_BANK.length],
      topics: TOPICS_BANK[(seed + i) % TOPICS_BANK.length],
      calendar_event_id: `cal_${sid}`,
      meet_url: fakeGoogleMeetUrl(sid),
    });
  }
  // 次回予定（1週間後の枠）— 未完了 + Meet リンク付き
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + 7);
  // 火曜or木曜 14:00 JST にスナップ
  const dayShift = (2 - nextDate.getDay() + 7) % 7;
  nextDate.setDate(nextDate.getDate() + dayShift);
  nextDate.setHours(14, 0, 0, 0);
  const nextSid = `oo-${member.id}-next`;
  sessions.unshift({
    id: nextSid,
    manager_id: manager.id,
    member_id: member.id,
    scheduled_at: nextDate.toISOString(),
    completed_at: null,
    duration_minutes: 30,
    mood: null,
    agenda: "次回アジェンダ：Q2 OKR キックオフ振り返り",
    notes: "",
    topics: [],
    calendar_event_id: `cal_${nextSid}`,
    meet_url: fakeGoogleMeetUrl(nextSid),
  });
  return sessions;
}

const TODAY = new Date(2026, 4, 8);  // 2026-05-08（context の今日）

export const DEMO_ONEONONES: OneOnOneSession[] = (() => {
  const result: OneOnOneSession[] = [];
  for (const manager of DEMO_EMPLOYEES) {
    const reports = DEMO_EMPLOYEES.filter((e) => e.manager_id === manager.id);
    for (const member of reports) {
      result.push(...buildSessionsForReport(manager, member, TODAY));
    }
  }
  return result;
})();

export const DEMO_ACTION_ITEMS: ActionItem[] = (() => {
  const items: ActionItem[] = [];
  let counter = 0;
  for (const session of DEMO_ONEONONES.filter((s) => s.completed_at)) {
    const seed = (session.member_id.charCodeAt(session.member_id.length - 1) + counter) % 7;
    const numActions = seed % 3;  // 0-2 個
    for (let i = 0; i < numActions; i++) {
      counter += 1;
      const dueOffset = ((seed + i) % 14) - 3;
      const due = new Date(session.completed_at!);
      due.setDate(due.getDate() + dueOffset);
      const completedRandom = (seed + i) % 4 === 0;
      items.push({
        id: `ai-${counter}`,
        one_on_one_id: session.id,
        member_id: session.member_id,
        assignee_id: session.member_id,
        title: ACTION_BANK[(seed + i) % ACTION_BANK.length],
        due_date: due.toISOString().slice(0, 10),
        completed_at: completedRandom ? new Date(due.getTime() + 86400000).toISOString() : null,
      });
    }
  }
  return items;
})();

/** 直近完了済み1on1 と 次回予定を取得 */
export function lastSessionFor(memberId: string, managerId: string): OneOnOneSession | null {
  return DEMO_ONEONONES
    .filter((s) => s.member_id === memberId && s.manager_id === managerId && s.completed_at)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))[0] ?? null;
}

export function nextSessionFor(memberId: string, managerId: string): OneOnOneSession | null {
  return DEMO_ONEONONES
    .filter((s) => s.member_id === memberId && s.manager_id === managerId && !s.completed_at)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0] ?? null;
}

export function moodTrendFor(memberId: string, managerId: string, count = 5): (OneOnOneMood | null)[] {
  return DEMO_ONEONONES
    .filter((s) => s.member_id === memberId && s.manager_id === managerId && s.completed_at)
    .sort((a, b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? ""))
    .slice(-count)
    .map((s) => s.mood);
}

export function openActionsFor(memberId: string): ActionItem[] {
  return DEMO_ACTION_ITEMS.filter((a) => a.member_id === memberId && !a.completed_at);
}

export function sessionsBetween(memberId: string, managerId: string): OneOnOneSession[] {
  return DEMO_ONEONONES
    .filter((s) => s.member_id === memberId && s.manager_id === managerId)
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
}

export function actionItemsForSession(sessionId: string): ActionItem[] {
  return DEMO_ACTION_ITEMS.filter((a) => a.one_on_one_id === sessionId);
}
