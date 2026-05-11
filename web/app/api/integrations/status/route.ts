/**
 * GET /api/integrations/status
 *
 * 全連携サービスの状態を返す。env 未設定なら disconnected、
 * 設定ありなら実際に ping を打って connected/error を判定。
 *
 * クライアントサイドの `<IntegrationStatusButton>` がこれを叩く。
 *
 * デモモード時はモックを返す（既存の固定 4 件）。
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { checkSlack } from "@/lib/integrations/slack-api";
import { checkGoogleCalendar } from "@/lib/integrations/google-api";
import { checkFreee } from "@/lib/integrations/freee-api";
import { createClient } from "@/lib/supabase/server";
import type { ServiceStatus } from "@/lib/integrations/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json<{ services: ServiceStatus[]; demo: true }>({
      demo: true,
      services: [
        {
          id: "slack",
          name: "Slack",
          status: "connected",
          connectedAs: "Green Carbon Workspace",
          latencyMs: 142,
          checkedAt: new Date().toISOString(),
        },
        {
          id: "google_calendar",
          name: "Google Calendar",
          status: "connected",
          connectedAs: "y.nomura@green-carbon.inc",
          latencyMs: 198,
          checkedAt: new Date().toISOString(),
        },
        {
          id: "google_sso",
          name: "Google Workspace SSO",
          status: "connected",
          connectedAs: "@green-carbon.inc",
          checkedAt: new Date().toISOString(),
        },
        {
          id: "freee",
          name: "freee 人事労務",
          status: "disconnected",
          checkedAt: new Date().toISOString(),
        },
      ],
    });
  }

  // ログイン中ユーザーの ID を取得して、Google / freee の user スコープトークンを解決
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const userId = user?.id;

  const [slack, gcal, freee] = await Promise.allSettled([
    checkSlack(),
    checkGoogleCalendar(userId ? { userId } : undefined),
    checkFreee(userId),
  ]);

  const settle = <T extends ServiceStatus>(
    r: PromiseSettledResult<T>,
    fallback: T,
  ): T =>
    r.status === "fulfilled"
      ? r.value
      : { ...fallback, status: "error", error: String(r.reason) };

  const services: ServiceStatus[] = [
    settle(slack, {
      id: "slack",
      name: "Slack",
      status: "disconnected",
      checkedAt: new Date().toISOString(),
    }),
    settle(gcal, {
      id: "google_calendar",
      name: "Google Calendar",
      status: "disconnected",
      checkedAt: new Date().toISOString(),
    }),
    settle(freee, {
      id: "freee",
      name: "freee 人事労務",
      status: "disconnected",
      checkedAt: new Date().toISOString(),
    }),
  ];

  return NextResponse.json({ services, demo: false });
}
