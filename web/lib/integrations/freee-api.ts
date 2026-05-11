/**
 * freee 人事労務 API クライアント（fetch ベース）
 *
 * https://developer.freee.co.jp/reference/hr/reference
 *
 * 認証: OAuth 2.0 (authorization_code grant)
 *   1. ユーザーを `accounts.secure.freee.co.jp/public_api/authorize?...` にリダイレクト
 *   2. callback で code を受け取り、`/oauth/token` で access_token に交換
 *   3. access_token を Supabase の `integrations.freee_tokens` に保存
 *   4. 期限切れ時は refresh_token で更新
 *
 * 本ファイルは API 呼び出し層のみ。OAuth フローは Phase 4 で route handler に実装。
 */

// サーバ専用：OAuth クライアントシークレットを扱うので Client Component から呼ばないこと。
import { getFreeeConfig } from "./config";
import { resolveFreeeUserToken } from "./token-resolver";
import type { ServiceStatus } from "./types";

const FREEE_HR_API = "https://api.freee.co.jp/hr/api/v1";

type FreeeError = { status_code?: number; errors?: { messages?: string[] }[] };

async function freeeFetch<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T | { _error: string }> {
  const res = await fetch(`${FREEE_HR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Api-Version": "2022-02-01",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as FreeeError;
    const msg =
      j.errors?.[0]?.messages?.[0] ??
      `HTTP ${res.status}`;
    return { _error: msg };
  }
  return (await res.json()) as T;
}

/**
 * 接続テスト：自分の事業所一覧取得
 *
 * userId 指定で DB から自動 refresh 込みでトークン取得、
 * 未指定なら env の FREEE_ACCESS_TOKEN を fallback で使う（シングルテナント運用想定）。
 */
export async function checkFreee(userId?: string): Promise<ServiceStatus> {
  const cfg = getFreeeConfig();
  const base: Pick<ServiceStatus, "id" | "name" | "checkedAt"> = {
    id: "freee",
    name: "freee 人事労務",
    checkedAt: new Date().toISOString(),
  };
  if (!cfg) return { ...base, status: "disconnected" };

  const token = userId
    ? await resolveFreeeUserToken(userId)
    : cfg.accessToken;
  if (!token) {
    return { ...base, status: "disconnected", error: "no-access-token" };
  }

  const t0 = Date.now();
  const r = await freeeFetch<{ companies: { id: number; name: string }[] }>(
    "/companies",
    token,
  );
  const latencyMs = Date.now() - t0;
  if ("_error" in r) return { ...base, status: "error", error: r._error, latencyMs };
  return {
    ...base,
    status: "connected",
    connectedAs: r.companies?.[0]?.name ?? "freee 事業所",
    latencyMs,
  };
}

/**
 * 社員マスタ同期（freee → 自社 DB）
 *
 * 将来的に Supabase の `employees` テーブルに upsert するスクリプトの土台。
 * いまは API 取得のみ実装。
 */
export type FreeeEmployee = {
  id: number;
  num: string;          // 社員番号
  display_name: string;
  entry_date: string;   // 入社日
  retire_date: string | null;
  email: string | null;
};

export async function listFreeeEmployees(
  companyId: number,
  userId?: string,
): Promise<FreeeEmployee[] | { _error: string }> {
  const cfg = getFreeeConfig();
  const token = userId
    ? await resolveFreeeUserToken(userId)
    : cfg?.accessToken;
  if (!token) return { _error: "no-access-token" };
  const r = await freeeFetch<{ employees: FreeeEmployee[] }>(
    `/employees?company_id=${companyId}&limit=100`,
    token,
  );
  if ("_error" in r) return r;
  return r.employees;
}

/**
 * OAuth 認可 URL を組み立てる。
 * リダイレクト後、`?code=xxx` を `/api/integrations/freee/callback` で受ける想定。
 */
export function freeeAuthUrl(state: string): string | null {
  const cfg = getFreeeConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    state,
  });
  return `https://accounts.secure.freee.co.jp/public_api/authorize?${params.toString()}`;
}

/** 認可コードをアクセストークンに交換 */
export async function exchangeFreeeCode(
  code: string,
): Promise<
  | { access_token: string; refresh_token: string; expires_in: number }
  | { _error: string }
> {
  const cfg = getFreeeConfig();
  if (!cfg) return { _error: "freee-not-configured" };
  const res = await fetch("https://accounts.secure.freee.co.jp/public_api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: cfg.redirectUri,
    }).toString(),
    cache: "no-store",
  });
  if (!res.ok) return { _error: `HTTP ${res.status}` };
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}
