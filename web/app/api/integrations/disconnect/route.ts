/**
 * POST /api/integrations/disconnect
 *
 * Body: { service: "slack" | "google_calendar" | "freee" }
 *
 * - Slack: workspace スコープなので、保存済みの全 Slack トークンを 1 件削除（社内 1 ワークスペース想定）
 * - Google / freee: ログイン中ユーザーの user スコープトークンを削除
 *
 * デモモード時は { ok: true } を返すだけ（実害なし）。
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { deleteToken, getFirstToken } from "@/lib/integrations/token-store";
import { userHasAdminRole } from "@/lib/auth/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { service: "slack" | "google_calendar" | "freee" };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  if (!body.service || !["slack", "google_calendar", "freee"].includes(body.service)) {
    return NextResponse.json({ ok: false, error: "invalid-service" }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  // すべての解除操作で認証必須（以前は slack 分岐が認証前にあり、未認証でも
  // 組織全体の Slack トークンを削除できる DoS になっていた）。
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  if (body.service === "slack") {
    // Slack は workspace スコープ = 組織全体への破壊操作。管理者限定にする。
    if (!(await userHasAdminRole(user.id))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const t = await getFirstToken("slack", "workspace");
    if (!t) return NextResponse.json({ ok: true, message: "already-disconnected" });
    const r = await deleteToken("slack", "workspace", t.owner_id);
    return NextResponse.json(r);
  }

  // user スコープ（google_calendar / freee）
  const r = await deleteToken(body.service, "user", user.id);
  return NextResponse.json(r);
}
