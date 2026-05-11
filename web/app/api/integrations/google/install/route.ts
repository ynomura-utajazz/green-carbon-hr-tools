/**
 * GET /api/integrations/google/install
 *
 * ログイン中ユーザーの Google OAuth 認可（Calendar 用）開始エンドポイント。
 * Supabase Auth でログインしている前提。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import {
  generateState, setStateCookie,
} from "@/lib/integrations/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
  "profile",
].join(" ");

export async function GET(req: Request) {
  if (isDemoMode()) {
    return NextResponse.redirect(
      `${new URL(req.url).origin}/?integration=google&result=demo-mode`,
    );
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_OAUTH_CLIENT_ID not configured" },
      { status: 500 },
    );
  }

  // ログイン中ユーザー必須（state にユーザーIDを忍ばせる）
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${new URL(req.url).origin}/login?next=/api/integrations/google/install`);
  }

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/integrations/google/callback`;
  const state = generateState();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");          // refresh_token を確実にもらう
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);
  if (process.env.GOOGLE_WORKSPACE_DOMAIN) {
    authUrl.searchParams.set("hd", process.env.GOOGLE_WORKSPACE_DOMAIN);
  }

  const res = NextResponse.redirect(authUrl);
  setStateCookie(res, "google", state);
  return res;
}
