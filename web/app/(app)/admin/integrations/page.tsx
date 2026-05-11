/**
 * /admin/integrations
 *
 * HR / IT 管理者向け：連携サービスのセットアップ状態を一覧表示。
 *
 *  - env チェックリスト（DB / Slack / Google / freee の必要環境変数）
 *  - 接続状態カード（latency, connectedAs, 最終確認時刻）
 *  - OAuth インストールリンク
 *  - 連携解除ボタン
 *  - Slack Events API の Request URL コピー導線
 *
 * RLS：HR 管理者のみ閲覧可（demo モードは全員 OK）
 */

import { isDemoMode } from "@/lib/demo/mock-data";
import { checkAllEnv } from "@/lib/integrations/env-check";
import { AdminIntegrationsClient } from "./admin-integrations-client";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const env = checkAllEnv();
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "your-domain.example";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

  return (
    <AdminIntegrationsClient
      envChecks={env}
      baseUrl={baseUrl}
      demo={isDemoMode()}
    />
  );
}
