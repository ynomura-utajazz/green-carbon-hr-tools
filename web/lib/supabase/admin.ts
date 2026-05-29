/**
 * service_role クライアント（RLS バイパス）。
 * OAuth コールバックでトークンを書き込む等、ユーザーコンテキスト不要な
 * サーバ側オペレーション専用。
 *
 * 使う前に `SUPABASE_SERVICE_ROLE_KEY` が env にあることを確認してください。
 */

import { createClient as createSbClient, type SupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSbClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isServiceClientAvailable(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * RLS テスター対応のための共通フォールバック。
 * SUPABASE_SERVICE_ROLE_KEY が設定されていれば admin client を返し、
 * 無ければ渡された anon client (with user cookie) をそのまま返す。
 *
 * Phase B のクリーンアップ後、employee_roles が全テスターに付与され
 * RLS の has_role が安定動作するまでの過渡期で使用。
 */
export function getWriter(authClient: SupabaseClient): SupabaseClient {
  const admin = createServiceClient();
  return admin ?? authClient;
}
