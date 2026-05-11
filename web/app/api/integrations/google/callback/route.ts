/**
 * GET /api/integrations/google/callback
 *
 * Google 認可からのリダイレクト。code → access_token + refresh_token に交換。
 * ログイン中ユーザーの user スコープでトークン保存。
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  verifyState, clearStateCookie,
} from "@/lib/integrations/oauth-state";
import { upsertToken } from "@/lib/integrations/token-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateQ = url.searchParams.get("state");
  const errorQ = url.searchParams.get("error");

  if (errorQ) {
    return NextResponse.redirect(
      `${url.origin}/?integration=google&result=error&reason=${encodeURIComponent(errorQ)}`,
    );
  }

  const cookieStore = await cookies();
  if (!verifyState(cookieStore, "google", stateQ)) {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "GOOGLE_OAUTH credentials not configured" },
      { status: 500 },
    );
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${url.origin}/login`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${url.origin}/api/integrations/google/callback`,
      grant_type: "authorization_code",
    }).toString(),
    cache: "no-store",
  });

  const data = (await tokenRes.json()) as GoogleTokenResponse;
  if (!data.access_token) {
    return NextResponse.json(
      { error: data.error_description ?? data.error ?? "google-token-exchange-failed" },
      { status: 502 },
    );
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  const stored = await upsertToken({
    service: "google_calendar",
    scope: "user",
    owner_id: user.id,
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expires_at: expiresAt,
    metadata: {
      scope: data.scope,
      email: user.email,
    },
  });

  const redir = NextResponse.redirect(
    `${url.origin}/?integration=google_calendar&result=${stored.ok ? "ok" : "error"}`,
  );
  clearStateCookie(redir, "google");
  return redir;
}
