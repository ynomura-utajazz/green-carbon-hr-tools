/**
 * Google Calendar API クライアント（fetch ベース）
 *
 * https://developers.google.com/calendar/api/v3/reference
 *
 * 必要なスコープ:
 *   - https://www.googleapis.com/auth/calendar.events  （イベント作成・更新）
 *   - https://www.googleapis.com/auth/calendar.readonly（一覧取得のみ）
 *
 * 認証フロー:
 *   - サーバ：service account（domain-wide delegation 推奨）または OAuth 2.0 user token
 *   - 本実装ではユーザー OAuth トークンが渡されたら使う、なければ disconnected
 *
 * 永続化したアクセストークン管理は Phase 4 の Supabase 永続化に委ねる。
 * いまは引数として受け取る形にし、API 層を先に固める。
 */

// サーバ専用：OAuth クライアントシークレットを扱うので Client Component から呼ばないこと。
import { getGoogleConfig } from "./config";
import { resolveGoogleUserToken } from "./token-resolver";
import type {
  CreateEventInput,
  CreateEventResult,
  ServiceStatus,
} from "./types";

const CAL_API = "https://www.googleapis.com/calendar/v3";

type GoogleErrorResponse = {
  error?: {
    code: number;
    message: string;
    errors?: { reason: string; message: string }[];
  };
};

async function gFetch<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T | { _error: string }> {
  const res = await fetch(`${CAL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as GoogleErrorResponse;
    return { _error: j.error?.message ?? `HTTP ${res.status}` };
  }
  return (await res.json()) as T;
}

/**
 * 接続テスト。calendarList.list の最小ページを叩いてレイテンシ計測。
 *
 * userId 引数：DB から保存済みトークンを取り出す（自動 refresh あり）。
 * accessToken 引数：明示的に渡したい時のオーバーライド。
 */
export async function checkGoogleCalendar(opts?: {
  userId?: string;
  accessToken?: string;
}): Promise<ServiceStatus> {
  const cfg = getGoogleConfig();
  const base: Pick<ServiceStatus, "id" | "name" | "checkedAt"> = {
    id: "google_calendar",
    name: "Google Calendar",
    checkedAt: new Date().toISOString(),
  };
  if (!cfg) return { ...base, status: "disconnected" };

  const token =
    opts?.accessToken ??
    (opts?.userId ? await resolveGoogleUserToken(opts.userId) : null);
  if (!token) {
    return { ...base, status: "disconnected", error: "no-user-token" };
  }

  const t0 = Date.now();
  const r = await gFetch<{ items: { id: string; summary: string }[] }>(
    "/users/me/calendarList?maxResults=1",
    token,
  );
  const latencyMs = Date.now() - t0;
  if ("_error" in r) return { ...base, status: "error", error: r._error, latencyMs };
  return {
    ...base,
    status: "connected",
    connectedAs: r.items?.[0]?.summary ?? "primary calendar",
    latencyMs,
  };
}

/**
 * Google Calendar イベント作成。Google Meet 自動付与可。
 */
export async function createCalendarEvent(
  input: CreateEventInput,
  accessToken: string,
): Promise<CreateEventResult> {
  const cfg = getGoogleConfig();
  if (!cfg) return { ok: false, error: "google-not-configured" };

  const calendarId = input.calendarId ?? "primary";
  const body = {
    summary: input.title,
    description: input.description,
    location: input.location,
    start: { dateTime: input.start, timeZone: "Asia/Tokyo" },
    end: { dateTime: input.end, timeZone: "Asia/Tokyo" },
    attendees: input.attendees?.map((email) => ({ email })),
    ...(input.withMeet
      ? {
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };

  const qs = input.withMeet ? "?conferenceDataVersion=1&sendUpdates=all" : "?sendUpdates=all";
  const r = await gFetch<{
    id: string;
    htmlLink: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { uri: string; entryPointType: string }[] };
  }>(`/calendars/${encodeURIComponent(calendarId)}/events${qs}`, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if ("_error" in r) return { ok: false, error: r._error };

  const meetUrl =
    r.hangoutLink ??
    r.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;

  return {
    ok: true,
    eventId: r.id,
    htmlLink: r.htmlLink,
    meetUrl,
  };
}
