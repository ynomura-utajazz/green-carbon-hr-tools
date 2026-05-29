/**
 * GET  /api/admin/transfers           → 異動辞令一覧
 * POST /api/admin/transfers           → 異動辞令を発行
 *
 * POST 時、effective_date が今日以前なら即座に apply（employees 反映）。
 * 未来日付の場合は予約状態（is_applied=false）で保持。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, getWriter } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT =
  "id, organization_id, employee_id, transfer_type, effective_date, is_applied, from_department_id, from_manager_id, from_job_title, from_job_grade, to_department_id, to_manager_id, to_job_title, to_job_grade, reason, created_by, created_at";

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  const { data, error } = await sb
    .from("transfers")
    .select(SELECT)
    .order("effective_date", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, transfers: data ?? [] });
}

type CreateBody = {
  employee_id?: string;
  transfer_type?: "promotion" | "demotion" | "lateral" | "role_change" | "manager_change" | "grade_change";
  effective_date?: string;             // YYYY-MM-DD
  to_department_id?: string | null;
  to_manager_id?: string | null;
  to_job_title?: string;
  to_job_grade?: string;
  reason?: string;
};

export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  let body: CreateBody;
  try { body = (await req.json()) as CreateBody; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!body.employee_id) return NextResponse.json({ ok: false, error: "missing-employee_id" }, { status: 400 });
  if (!body.transfer_type) return NextResponse.json({ ok: false, error: "missing-transfer_type" }, { status: 400 });
  if (!body.effective_date) return NextResponse.json({ ok: false, error: "missing-effective_date" }, { status: 400 });

  // 対象社員の現在の状態 + 起案者を並列取得
  const admin = createServiceClient();
  const reader = admin ?? sb;
  const [{ data: emp }, { data: meEmp }] = await Promise.all([
    reader
      .from("employees")
      .select("organization_id, department_id, manager_id, job_title, job_grade")
      .eq("id", body.employee_id)
      .maybeSingle(),
    reader
      .from("employees")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
  ]);
  if (!emp) return NextResponse.json({ ok: false, error: "employee-not-found" }, { status: 400 });

  const writer = admin ?? sb;
  const { data, error } = await writer
    .from("transfers")
    .insert({
      organization_id: emp.organization_id as string,
      employee_id: body.employee_id,
      transfer_type: body.transfer_type,
      effective_date: body.effective_date,
      from_department_id: (emp.department_id as string | null) ?? null,
      from_manager_id: (emp.manager_id as string | null) ?? null,
      from_job_title: (emp.job_title as string | null) ?? null,
      from_job_grade: (emp.job_grade as string | null) ?? null,
      to_department_id: body.to_department_id ?? null,
      to_manager_id: body.to_manager_id ?? null,
      to_job_title: body.to_job_title ?? null,
      to_job_grade: body.to_job_grade ?? null,
      reason: body.reason ?? null,
      created_by: meEmp?.id ?? null,
    })
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // 発令日が今日以前なら即適用
  const today = new Date().toISOString().slice(0, 10);
  if (body.effective_date <= today) {
    const { error: applyErr } = await writer.rpc("apply_transfer", { transfer_id: data.id });
    if (applyErr) {
      // 適用失敗してもレコードは作成済み。エラー情報を返す
      return NextResponse.json({
        ok: true,
        transfer: data,
        warning: `辞令は記録されましたが、適用に失敗しました: ${applyErr.message}`,
      });
    }
  }

  return NextResponse.json({ ok: true, transfer: data });
}
