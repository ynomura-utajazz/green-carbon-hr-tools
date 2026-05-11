/**
 * 通知のモックデータ。種別ごとに色とアイコンを切り替える。
 */

export type NotificationKind =
  | "mention"      // Slack/コメントでの言及
  | "reminder"    // 期限・スケジュール
  | "approval"    // 承認待ち
  | "alert"       // 警告（ビザ期限・36協定 等）
  | "celebration" // 入社・誕生日・アワード
  | "system";     // 制度変更・お知らせ

export type DemoNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  actor_name?: string;
  created_at: string;  // ISO
  read: boolean;
};

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600_000).toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "n1",
    kind: "alert",
    title: "ビザ期限警告",
    body: "Wibowo Agus さんの在留期限まで残り14日です。更新手続きの状況を確認してください。",
    href: "/visa",
    created_at: minutesAgo(15),
    read: false,
  },
  {
    id: "n2",
    kind: "mention",
    title: "鎌田 彩 さんがあなたをメンション",
    body: "「来週の経営会議で離職リスクスコアの最新値を共有したいので、レビューお願いします」",
    href: "/oneonone",
    actor_name: "鎌田 彩",
    created_at: minutesAgo(42),
    read: false,
  },
  {
    id: "n3",
    kind: "reminder",
    title: "1on1 が 30分後に開始",
    body: "高橋 真由 さんとの1on1（14:00 〜 14:30）。アジェンダはまだ未設定です。",
    href: "/oneonone",
    created_at: hoursAgo(2),
    read: false,
  },
  {
    id: "n4",
    kind: "approval",
    title: "休暇申請の承認待ち",
    body: "藤本 渉 さんから 5/22-5/24 の有給休暇申請が届いています。",
    href: "/attendance",
    actor_name: "藤本 渉",
    created_at: hoursAgo(4),
    read: false,
  },
  {
    id: "n5",
    kind: "celebration",
    title: "🎉 新入社員のお迎え準備",
    body: "5/15 に Tirza Grace さんが入社予定です。オンボーディングテンプレが自動適用されました。",
    href: "/onboarding",
    created_at: hoursAgo(7),
    read: true,
  },
  {
    id: "n6",
    kind: "celebration",
    title: "🏆 バリューアワード受賞",
    body: "鎌田 彩 さんが Co-Creation でアワードを受賞しました。チャンネルでお祝いしましょう。",
    href: "/value-award",
    created_at: daysAgo(1),
    read: true,
  },
  {
    id: "n7",
    kind: "system",
    title: "リモートワーク制度の改定",
    body: "2026年度よりガイドラインを一部改定しました。詳細は社内 Wiki をご確認ください。",
    href: "/wiki",
    created_at: daysAgo(2),
    read: true,
  },
];

export const KIND_META: Record<NotificationKind, { label: string; color: string; bg: string }> = {
  mention:     { label: "メンション",   color: "text-blue-700",    bg: "bg-blue-50" },
  reminder:    { label: "リマインド",   color: "text-purple-700",  bg: "bg-purple-50" },
  approval:    { label: "承認待ち",     color: "text-amber-800",   bg: "bg-amber-50" },
  alert:       { label: "警告",         color: "text-red-700",     bg: "bg-red-50" },
  celebration: { label: "おめでとう",   color: "text-emerald-700", bg: "bg-emerald-50" },
  system:      { label: "システム",     color: "text-gray-700",    bg: "bg-gray-50" },
};

// ─── 今日のイベント（KPI付近に出すパーソナルダッシュボード向け） ──
export type TodayEvent = {
  id: string;
  kind: "oneonone" | "interview" | "meeting" | "deadline" | "training";
  title: string;
  start: string;  // ISO
  duration_minutes: number;
  participants: string[];  // 名前
  meet_url?: string;
};

const today = new Date();
const at = (h: number, m: number) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0);
  return d.toISOString();
};

export const DEMO_TODAY_EVENTS: TodayEvent[] = [
  {
    id: "t1", kind: "oneonone",
    title: "1on1 — 高橋 真由",
    start: at(14, 0), duration_minutes: 30,
    participants: ["高橋 真由"],
    meet_url: "https://meet.google.com/abc-defg-hij",
  },
  {
    id: "t2", kind: "meeting",
    title: "Q2 OKR レビュー",
    start: at(15, 30), duration_minutes: 60,
    participants: ["佐藤 太郎", "山田 花子", "串田 和也"],
    meet_url: "https://meet.google.com/xyz-1234-pqr",
  },
  {
    id: "t3", kind: "interview",
    title: "最終面接 — Tanaka Hiroshi (Senior PM 候補)",
    start: at(17, 0), duration_minutes: 45,
    participants: ["山田 花子", "原田 梨沙"],
    meet_url: "https://meet.google.com/mno-5678-stu",
  },
  {
    id: "t4", kind: "deadline",
    title: "経営会議資料の提出期限",
    start: at(18, 0), duration_minutes: 0,
    participants: [],
  },
];

// ─── 最近の動き ────────────────────────────
export type ActivityItem = {
  id: string;
  actor_name: string;
  verb: string;
  target: string;
  href?: string;
  created_at: string;  // ISO
};

export const DEMO_ACTIVITY: ActivityItem[] = [
  { id: "a1", actor_name: "鎌田 彩",    verb: "ノミネート",       target: "塚本 真純 を Integrity で",  href: "/value-award", created_at: minutesAgo(8) },
  { id: "a2", actor_name: "藤本 渉",    verb: "コメント追加",     target: "Q2 個人 OKR に",            href: "/mbo-okr",     created_at: minutesAgo(35) },
  { id: "a3", actor_name: "南部 さくら", verb: "1on1 完了",       target: "Tirza Grace との 1on1",    href: "/oneonone",    created_at: hoursAgo(1) },
  { id: "a4", actor_name: "塚本 真純",  verb: "オンボーディング更新", target: "鈴木 健 の Day 7 完了",   href: "/onboarding",  created_at: hoursAgo(3) },
  { id: "a5", actor_name: "石川 拓哉",  verb: "ドキュメント編集", target: "ASEAN 進出戦略 v2",         href: "/wiki",        created_at: hoursAgo(5) },
  { id: "a6", actor_name: "高橋 真由",  verb: "アクション完了",   target: "「Q2 サーベイ準備」",        href: "/oneonone",    created_at: hoursAgo(8) },
];

export type PinnedTool = { id: string; href: string };
export const DEMO_PINNED_TOOLS: PinnedTool[] = [
  { id: "oneonone",  href: "/oneonone" },
  { id: "directory", href: "/directory" },
  { id: "orgchart",  href: "/orgchart" },
  { id: "portal",    href: "/portal" },
];
