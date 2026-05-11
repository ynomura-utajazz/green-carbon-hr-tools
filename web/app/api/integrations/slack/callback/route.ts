/**
 * GET /api/integrations/slack/callback
 *
 * Slack 認可画面からのリダイレクト先。
 * `?code=...&state=...` を受け取り、Bot トークンに交換して保存。
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyState, clearStateCookie,
} from "@/lib/integrations/oauth-state";
import { upsertToken } from "@/lib/integrations/token-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SlackOAuthAccess = {
  ok: boolean;
  access_token?: string;     // bot token (xoxb-...)
  bot_user_id?: string;
  scope?: string;
  team?: { id: string; name: string };
  authed_user?: { id: string };
  error?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateQ = url.searchParams.get("state");
  const errorQ = url.searchParams.get("error");

  if (errorQ) {
    return NextResponse.redirect(
      `${url.origin}/?integration=slack&result=error&reason=${encodeURIComponent(errorQ)}`,
    );
  }

  const cookieStore = await cookies();
  if (!verifyState(cookieStore, "slack", stateQ)) {
    return NextResponse.json(
      { error: "invalid state (CSRF check failed)" },
      { status: 400 },
    );
  }

  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  const clientId = process.env.SLACK_CLIENT_ID ?? process.env.SLACK_APP_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "SLACK_CLIENT_ID / SLACK_CLIENT_SECRET not configured" },
      { status: 500 },
    );
  }

  // 認可コードを Bot トークンに交換
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${url.origin}/api/integrations/slack/callback`,
    }).toString(),
    cache: "no-store",
  });

  const data = (await tokenRes.json()) as SlackOAuthAccess;
  if (!data.ok || !data.access_token || !data.team) {
    return NextResponse.json(
      { error: data.error ?? "slack-token-exchange-failed" },
      { status: 502 },
    );
  }

  // ワークスペーススコープで永続化
  const stored = await upsertToken({
    service: "slack",
    scope: "workspace",
    owner_id: data.team.id,
    access_token: data.access_token,
    metadata: {
      team_name: data.team.name,
      bot_user_id: data.bot_user_id,
      authed_user_id: data.authed_user?.id,
      scope: data.scope,
    },
  });

  const redir = NextResponse.redirect(
    `${url.origin}/?integration=slack&result=${stored.ok ? "ok" : "error"}&team=${encodeURIComponent(data.team.name)}`,
  );
  clearStateCookie(redir, "slack");
  return redir;
}
