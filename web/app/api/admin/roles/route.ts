/**
 * POST /api/admin/roles  → ロール付与
 * DELETE /api/admin/roles?employeeId=...&role=...  → ロール剥奪
 *
 * Body (POST): { employeeId: string, role: "hr_admin" | "manager" | "employee" | "executive" | "readonly" }
 *
 * 認可：呼び出しユーザー自身が hr_admin であること（user セッション経由のクライアント、RLS で弾く）。
 *      service_role は使わない（昇格防止）。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = ["hr_admin", "manager", "employee", "executive", "readonly"] as const;
type Role = (typeof VALID_ROLES)[number];

function isRole(v: unknown): v is Role {
  return typeof v === "string" && (VALID_ROLES as readonly string[]).includes(v);
}

export async function POST(req: Request) {
  if (isDemoMode()) {
    return NextResponse.json({ ok: true, demo: true });
  }
  let body: { employeeId?: string; role?: string };
  try { body = await req.json() as { employeeId?: string; role?: string }; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!body.employeeId || !isRole(body.role)) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  // granted_by に自分の employee.id を入れる
  const { data: meEmp } = await sb
    .from("employees").select("id").eq("auth_user_id", user.id).maybeSingle();

  const { error } = await sb
    .from("employee_roles")
    .insert({
      employee_id: body.employeeId,
      role: body.role,
      granted_by: meEmp?.id ?? null,
    });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (isDemoMode()) {
    return NextResponse.json({ ok: true, demo: true });
  }
  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");
  const role = url.searchParams.get("role");
  if (!employeeId || !isRole(role)) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  const sb = await createClient();
  const { error } = await sb
    .from("employee_roles")
    .delete()
    .eq("employee_id", employeeId)
    .eq("role", role);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
