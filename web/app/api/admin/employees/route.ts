/**
 * GET  /api/admin/employees       → 全社員リスト（社員管理 UI 向け）
 * POST /api/admin/employees       → 社員作成
 *
 * 認可：認証済み + employees mapping 未連携テスター対応のため service role 経由。
 * Phase B で employee_roles 自動付与実装後は hr_admin RLS を有効化予定。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMP_SELECT =
  "id, organization_id, employee_code, email, full_name, full_name_kana, preferred_name, display_name_en, avatar_url, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, resign_date, nationality, phone, created_at, updated_at";

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  const { data, error } = await sb
    .from("employees")
    .select(EMP_SELECT)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, employees: data ?? [] });
}

type CreateBody = {
  email?: string;
  full_name?: string;
  full_name_kana?: string;
  preferred_name?: string;
  display_name_en?: string;
  department_id?: string | null;
  manager_id?: string | null;
  job_title?: string;
  job_grade?: string;
  employment_type?: "full_time" | "part_time" | "contract" | "intern" | "business_partner";
  status?: "active" | "on_leave" | "resigned";
  hire_date?: string;
  nationality?: string;
  phone?: string;
  employee_code?: string;
};

export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  let body: CreateBody;
  try { body = (await req.json()) as CreateBody; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  // 必須項目チェック
  if (!body.email || !body.email.trim()) {
    return NextResponse.json({ ok: false, error: "missing-email" }, { status: 400 });
  }
  if (!body.full_name || !body.full_name.trim()) {
    return NextResponse.json({ ok: false, error: "missing-full_name" }, { status: 400 });
  }

  // organization_id を取得
  const { data: meEmp } = await sb
    .from("employees")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const orgId = meEmp?.organization_id as string | undefined;
  if (!orgId) {
    return NextResponse.json({ ok: false, error: "no-organization" }, { status: 403 });
  }

  // employee_code は省略時に自動採番（既存最大値 + 1）
  let employeeCode = body.employee_code?.trim();
  if (!employeeCode) {
    const { data: maxRow } = await sb
      .from("employees")
      .select("employee_code")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);
    const nums = (maxRow ?? [])
      .map((r) => parseInt(String(r.employee_code).replace(/\D/g, ""), 10))
      .filter((n) => !Number.isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    employeeCode = `E${String(next).padStart(5, "0")}`;
  }

  const { data, error } = await sb
    .from("employees")
    .insert({
      organization_id: orgId,
      employee_code: employeeCode,
      email: body.email.trim(),
      full_name: body.full_name.trim(),
      full_name_kana: body.full_name_kana?.trim() || null,
      preferred_name: body.preferred_name?.trim() || null,
      display_name_en: body.display_name_en?.trim() || null,
      department_id: body.department_id ?? null,
      manager_id: body.manager_id ?? null,
      job_title: body.job_title?.trim() || null,
      job_grade: body.job_grade?.trim() || null,
      employment_type: body.employment_type ?? "full_time",
      status: body.status ?? "active",
      hire_date: body.hire_date || null,
      nationality: body.nationality?.trim() || null,
      phone: body.phone?.trim() || null,
    })
    .select(EMP_SELECT)
    .single();

  if (error) {
    // unique violation 等
    const code = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ ok: false, error: error.message }, { status: code });
  }

  return NextResponse.json({ ok: true, employee: data });
}
