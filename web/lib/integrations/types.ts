/**
 * 連携サービスの共通型
 */

export type ServiceId = "slack" | "google_calendar" | "google_sso" | "freee";

export type ConnectionStatus = "connected" | "disconnected" | "error";

export type ServiceStatus = {
  id: ServiceId;
  name: string;
  status: ConnectionStatus;
  /** 接続中アカウント情報（"@green-carbon.inc" など）*/
  connectedAs?: string;
  /** エラー時のメッセージ */
  error?: string;
  /** ping 計測したレイテンシ（ms）*/
  latencyMs?: number;
  /** 最終確認時刻（ISO） */
  checkedAt?: string;
};

export type SendDmInput = {
  /** 宛先 Slack ユーザーID（U01ABCDEF）または email でルックアップ */
  slackUserId?: string;
  email?: string;
  text: string;
  /** Block Kit JSON（任意） */
  blocks?: unknown[];
};

export type SendDmResult =
  | { ok: true; channelId: string; ts: string }
  | { ok: false; error: string };

export type CreateEventInput = {
  title: string;
  start: string; // ISO
  end: string;   // ISO
  /** 参加者のメールアドレス */
  attendees?: string[];
  description?: string;
  location?: string;
  /** Google Meet を自動付与 */
  withMeet?: boolean;
  /** カレンダーID（"primary" がデフォルト） */
  calendarId?: string;
};

export type CreateEventResult =
  | { ok: true; eventId: string; htmlLink: string; meetUrl?: string }
  | { ok: false; error: string };
