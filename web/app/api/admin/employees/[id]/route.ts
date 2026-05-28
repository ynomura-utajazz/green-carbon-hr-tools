/**
 * PATCH  /api/admin/employees/[id]  → 社員情報更新（部署変更・職務タイトル等）
 * DELETE /api/admin/employees/[id]  → 社員ソフト削除（deleted_at セット）
 *
 * 削除は物理削除ではなく soft delete（履歴保持のため）。
 * 退職処理は status='resigned' + resign_date 設定で行う想定。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const EMP_SELECT =
  "id, organization_id, employee_code, email, full_name, full_name_kana, preferred_name, display_name_en, avatar_url, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, resign_date, nationality, phone, created_at, updated_at";

type PatchBody = {
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
  hire_date?: string | null;
  resign_date?: string | null;
  nationality?: string;
  phone?: string;
};

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  let body: PatchBody;
  try { body = (await req.json()) as PatchBody; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  // 自分自身を manager にできない
  if (body.manager_id === id) {
    return NextResponse.json({ ok: false, error: "self-manager-not-allowed" }, { status: 400 });
  }

  // 退職ステータスに変更する場合は resign_date を必ず付ける
  if (body.status === "resigned" && !body.resign_date) {
    body.resign_date = new Date().toISOString().slice(0, 10);
  }

  const updates: Record<string, unknown> = {};
  const setIf = (key: keyof PatchBody, transform?: (v: unknown) => unknown) => {
    if (body[key] === undefined) return;
    const v = body[key];
    updates[key] = transform ? transform(v) : (typeof v === "string" ? v.trim() || null : v);
  };
  setIf("email");
  setIf("full_name");
  setIf("full_name_kana");
  setIf("preferred_name");
  setIf("display_name_en");
  if (body.department_id !== undefined) updates.department_id = body.department_id;
  if (body.manager_id !== undefined) updates.manager_id = body.manager_id;
  setIf("job_title");
  setIf("job_grade");
  if (body.employment_type !== undefined) updates.employment_type = body.employment_type;
  if (body.status !== undefined) updates.status = body.status;
  if (body.hire_date !== undefined) updates.hire_date = body.hire_date;
  if (body.resign_date !== undefined) updates.resign_date = body.resign_date;
  setIf("nationality");
  setIf("phone");
  updates.updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from("employees")
    .update(updates)
    .eq("id", id)
    .is("deleted_at", null)
    .select(EMP_SELECT)
    .single();

  if (error) {
    const code = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ ok: false, error: error.message }, { status: code });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, employee: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  // 部下がいる社員は削除前に manager_id を解除する必要があるかチェック
  const { count } = await sb
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("manager_id", id)
    .is("deleted_at", null);
  if ((count ?? 0) > 0) {
    return NextResponse.json({
      ok: false,
      error: "has-subordinates",
      message: `${count} 名の部下がいるため削除できません。先に異動辞令で manager を変更してください。`,
    }, { status: 400 });
  }

  // ソフト削除（履歴保持のため）
  const { error } = await sb
    .from("employees")
    .update({ deleted_at: new Date().toISOString(), status: "resigned" })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
