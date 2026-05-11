/**
 * GET /api/integrations/freee/callback
 *
 * freee 認可からのリダイレクト。code → access_token + refresh_token。
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  verifyState, clearStateCookie,
} from "@/lib/integrations/oauth-state";
import { exchangeFreeeCode } from "@/lib/integrations/freee-api";
import { upsertToken } from "@/lib/integrations/token-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateQ = url.searchParams.get("state");
  const errorQ = url.searchParams.get("error");

  if (errorQ) {
    return NextResponse.redirect(
      `${url.origin}/?integration=freee&result=error&reason=${encodeURIComponent(errorQ)}`,
    );
  }

  const cookieStore = await cookies();
  if (!verifyState(cookieStore, "freee", stateQ)) {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(`${url.origin}/login`);

  const tokens = await exchangeFreeeCode(code);
  if ("_error" in tokens) {
    return NextResponse.json({ error: tokens._error }, { status: 502 });
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const stored = await upsertToken({
    service: "freee",
    scope: "user",
    owner_id: user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    metadata: { connected_email: user.email },
  });

  const redir = NextResponse.redirect(
    `${url.origin}/?integration=freee&result=${stored.ok ? "ok" : "error"}`,
  );
  clearStateCookie(redir, "freee");
  return redir;
}
