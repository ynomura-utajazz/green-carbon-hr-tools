/**
 * service_role クライアント（RLS バイパス）。
 * OAuth コールバックでトークンを書き込む等、ユーザーコンテキスト不要な
 * サーバ側オペレーション専用。
 *
 * 使う前に `SUPABASE_SERVICE_ROLE_KEY` が env にあることを確認してください。
 */

import { createClient as createSbClient } from "@supabase/supabase-js";

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
