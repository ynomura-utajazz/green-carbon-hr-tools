/**
 * Google Calendar のディープリンク URL ヘルパ。
 *
 * - 新規イベント作成: https://calendar.google.com/calendar/render?action=TEMPLATE&...
 *   （ユーザーの Google アカウントで開いてプリフィル済みのイベント作成画面が出る）
 * - 既存イベント表示: eid を指定して開く
 *
 * 本番では Google Calendar API（OAuth）でサーバ側からイベント作成・取得を行うが、
 * デモモード／簡易連携ではこの URL ベースのアプローチで十分実用的。
 */

type CreateEventOptions = {
  title: string;
  description?: string;
  /** ISO 8601 日時。省略時は1時間後 */
  start: Date | string;
  /** ISO 8601 日時。省略時は start + 30分 */
  end?: Date | string;
  /** 招待メールアドレス */
  attendees?: string[];
  /** 場所または会議URL */
  location?: string;
  /** タイムゾーン（IANA形式）*/
  timezone?: string;
};

const toCalendarFormat = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  // YYYYMMDDTHHMMSSZ 形式に変換（UTC）
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
};

export function createGoogleCalendarEventUrl(opts: CreateEventOptions): string {
  const start = typeof opts.start === "string" ? new Date(opts.start) : opts.start;
  const end = opts.end
    ? (typeof opts.end === "string" ? new Date(opts.end) : opts.end)
    : new Date(start.getTime() + 30 * 60 * 1000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${toCalendarFormat(start)}/${toCalendarFormat(end)}`,
  });
  if (opts.description) params.set("details", opts.description);
  if (opts.location) params.set("location", opts.location);
  if (opts.timezone) params.set("ctz", opts.timezone);
  if (opts.attendees?.length) {
    params.set("add", opts.attendees.join(","));
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** 既存イベントを開くURL（eid は base64url エンコード済みのID） */
export function openGoogleCalendarEventUrl(eid: string): string {
  return `https://calendar.google.com/calendar/event?eid=${eid}`;
}

/** Google Meet のリンクは通常イベント側で自動生成。デモ用にダミーを返す */
export function fakeGoogleMeetUrl(seed: string): string {
  // 実際のGoogle Meet URLは https://meet.google.com/<3-4-3 hex pattern>
  const hex = seed.replace(/[^a-z0-9]/gi, "").slice(0, 10).padEnd(10, "x").toLowerCase();
  return `https://meet.google.com/${hex.slice(0, 3)}-${hex.slice(3, 7)}-${hex.slice(7, 10)}`;
}
