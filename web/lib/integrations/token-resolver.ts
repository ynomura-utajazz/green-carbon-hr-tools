/**
 * 連携サービスのアクセストークンを解決するヘルパ。
 *
 * 優先順位：
 *   1. Supabase の integration_tokens テーブル（OAuth で取得して保存済み）
 *   2. env (SLACK_BOT_TOKEN など、シングルテナント運用時の手動設定)
 *
 * Google / freee は user スコープなので user_id が必須。
 * Slack は workspace スコープ（チームに 1 つ）。
 *
 * 期限切れ判定：
 *   - expires_at が過去 OR 残り 60 秒未満なら refresh を試みる
 *   - refresh 失敗時は null（呼び出し側で再認可導線へ）
 */

import { getFirstToken, getToken, upsertToken } from "./token-store";

/** 残り 60 秒未満 = 期限切れ扱い（クロックスキュー対策） */
const REFRESH_BUFFER_MS = 60_000;

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false; // expires_at 無記入はトークン無期限扱い（Slack Bot 等）
  return new Date(expiresAt).getTime() - Date.now() < REFRESH_BUFFER_MS;
}

/** Slack Bot トークン（workspace 単位）。Slack Bot トークンは無期限なので refresh 不要。 */
export async function resolveSlackBotToken(): Promise<string | null> {
  const stored = await getFirstToken("slack", "workspace");
  if (stored?.access_token) return stored.access_token;
  return process.env.SLACK_BOT_TOKEN ?? null;
}

/** Google ユーザートークン。期限切れなら refresh_token で更新してから返す。 */
export async function resolveGoogleUserToken(userId: string): Promise<string | null> {
  const stored = await getToken("google_calendar", "user", userId);
  if (!stored?.access_token) return null;
  if (!isExpired(stored.expires_at)) return stored.access_token;

  if (!stored.refresh_token) return null;
  const refreshed = await refreshGoogleToken(stored.refresh_token);
  if (!refreshed) return null;

  await upsertToken({
    service: "google_calendar",
    scope: "user",
    owner_id: userId,
    access_token: refreshed.access_token,
    // Google は refresh の応答で新しい refresh_token を返さないことが多いので維持
    refresh_token: refreshed.refresh_token ?? stored.refresh_token,
    expires_at: refreshed.expires_at,
    metadata: stored.metadata,
  });
  return refreshed.access_token;
}

/** freee ユーザートークン。期限切れなら refresh。 */
export async function resolveFreeeUserToken(userId: string): Promise<string | null> {
  const stored = await getToken("freee", "user", userId);
  if (!stored?.access_token) return null;
  if (!isExpired(stored.expires_at)) return stored.access_token;

  if (!stored.refresh_token) return null;
  const refreshed = await refreshFreeeToken(stored.refresh_token);
  if (!refreshed) return null;

  await upsertToken({
    service: "freee",
    scope: "user",
    owner_id: userId,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token, // freee は新しい refresh_token を毎回返す
    expires_at: refreshed.expires_at,
    metadata: stored.metadata,
  });
  return refreshed.access_token;
}

// ── refresh ヘルパ（HTTP 呼び出し） ────────────────────────────

type RefreshResult = {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
};

async function refreshGoogleToken(refreshToken: string): Promise<RefreshResult | null> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) return null;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
  };
}

async function refreshFreeeToken(refreshToken: string): Promise<RefreshResult | null> {
  const clientId = process.env.FREEE_CLIENT_ID;
  const clientSecret = process.env.FREEE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://accounts.secure.freee.co.jp/public_api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }).toString(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) return null;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
  };
}
