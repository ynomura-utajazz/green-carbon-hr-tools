/**
 * GET /api/integrations/freee/install
 *
 * freee 人事労務 OAuth 開始。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import {
  generateState, setStateCookie,
} from "@/lib/integrations/oauth-state";
import { freeeAuthUrl } from "@/lib/integrations/freee-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (isDemoMode()) {
    return NextResponse.redirect(
      `${new URL(req.url).origin}/?integration=freee&result=demo-mode`,
    );
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${new URL(req.url).origin}/login?next=/api/integrations/freee/install`,
    );
  }

  const state = generateState();
  const authUrl = freeeAuthUrl(state);
  if (!authUrl) {
    return NextResponse.json(
      { error: "FREEE env vars not configured" },
      { status: 500 },
    );
  }

  const res = NextResponse.redirect(authUrl);
  setStateCookie(res, "freee", state);
  return res;
}
