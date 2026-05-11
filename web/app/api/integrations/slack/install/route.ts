/**
 * GET /api/integrations/slack/install
 *
 * Slack ワークスペースに Bot をインストールするフローのエントリポイント。
 * client_id を読み込んで、Slack の認可画面にリダイレクトする。
 *
 * Bot に必要な scope:
 *   chat:write, im:write, users:read, users:read.email, team:read
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { generateState, setStateCookie } from "@/lib/integrations/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPES = [
  "chat:write",
  "im:write",
  "users:read",
  "users:read.email",
  "team:read",
].join(",");

export async function GET(req: Request) {
  if (isDemoMode()) {
    return NextResponse.redirect(
      `${new URL(req.url).origin}/?integration=slack&result=demo-mode`,
    );
  }

  const clientId = process.env.SLACK_CLIENT_ID ?? process.env.SLACK_APP_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "missing SLACK_CLIENT_ID env" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/integrations/slack/callback`;
  const state = generateState();

  const authUrl = new URL("https://slack.com/oauth/v2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl);
  setStateCookie(res, "slack", state);
  return res;
}
