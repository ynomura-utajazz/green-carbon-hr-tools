/**
 * 連携サービスのトークン保管／取得ヘルパ。
 *
 * 永続化先：Supabase の `integration_tokens` テーブル（service_role 経由で書き込み）。
 *           Supabase 未設定（デモモード）時は何もしないが、エラーにはしない。
 *
 * 設計上の理由：
 *   - access_token は env 直書きでもいいが、refresh_token と expires_at の
 *     ローテーション管理を考えると DB が必須。
 *   - service_role を使うので、ユーザーセッションが無いコールバックでも書ける。
 */

import { createServiceClient } from "@/lib/supabase/admin";

export type TokenScope = "workspace" | "user";
export type TokenService = "slack" | "google_calendar" | "freee";

export type TokenRecord = {
  service: TokenService;
  scope: TokenScope;
  owner_id: string;
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null; // ISO
  metadata?: Record<string, unknown>;
};

const TABLE = "integration_tokens";

/** トークン保存（同じ (service, scope, owner_id) があれば上書き） */
export async function upsertToken(rec: TokenRecord): Promise<{ ok: boolean; error?: string }> {
  const sb = createServiceClient();
  if (!sb) {
    // デモ／未設定。実害なく続行できるよう success を返す（ログだけ）。
    console.info("[token-store] supabase not configured, skip upsert", {
      service: rec.service,
      scope: rec.scope,
      owner_id: rec.owner_id,
    });
    return { ok: true };
  }

  const { error } = await sb.from(TABLE).upsert(
    {
      service: rec.service,
      scope: rec.scope,
      owner_id: rec.owner_id,
      access_token: rec.access_token,
      refresh_token: rec.refresh_token ?? null,
      expires_at: rec.expires_at ?? null,
      metadata: rec.metadata ?? {},
    },
    { onConflict: "service,scope,owner_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** 単一トークン取得 */
export async function getToken(
  service: TokenService,
  scope: TokenScope,
  ownerId: string,
): Promise<TokenRecord | null> {
  const sb = createServiceClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .eq("service", service)
    .eq("scope", scope)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error || !data) return null;
  return data as TokenRecord;
}

/** ワークスペース／ユーザー単位の最初のトークンを返す（管理者ツールで便利） */
export async function getFirstToken(
  service: TokenService,
  scope: TokenScope,
): Promise<TokenRecord | null> {
  const sb = createServiceClient();
  if (!sb) return null;

  const { data } = await sb
    .from(TABLE)
    .select("*")
    .eq("service", service)
    .eq("scope", scope)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as TokenRecord | null) ?? null;
}

/** トークン削除（連携解除用） */
export async function deleteToken(
  service: TokenService,
  scope: TokenScope,
  ownerId: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = createServiceClient();
  if (!sb) return { ok: true };

  const { error } = await sb
    .from(TABLE)
    .delete()
    .eq("service", service)
    .eq("scope", scope)
    .eq("owner_id", ownerId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
