/**
 * /talent-pool（server）
 *
 * タレントプール CRM のデータ取得層。
 *  - デモ: DEMO_TALENT_POOL / DEMO_EMPLOYEES を渡す（表示は分割前と不変）。
 *  - 本番: talent_pool（migration 20260723000003）と employees を SELECT。
 *
 * 本番で talent_pool 未適用でも、error → console.error → 空配列（空状態）で安全。
 */

import { isDemoMode } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { DEMO_EMPLOYEES, type DemoEmployee } from "@/lib/demo/employees";
import { DEMO_TALENT_POOL, type TalentPoolEntry } from "@/lib/demo/talent-pool";
import { TalentPoolClient } from "./talent-pool-client";

export const dynamic = "force-dynamic";

export default async function TalentPoolPage() {
  if (isDemoMode()) {
    return <TalentPoolClient talent={DEMO_TALENT_POOL} employees={DEMO_EMPLOYEES} />;
  }

  // 本番: 実テーブルから取得（ユーザー RLS クライアント。service_role は使わない）。
  const supabase = await createClient();
  const [tpRes, empsRes] = await Promise.all([
    supabase
      .from("talent_pool")
      .select(
        "id, full_name, display_name_en, email, kind, status, original_source, last_position_id, last_stage, current_role, current_company, years_of_experience, skills, location, country_code, last_event_at, last_event_summary, last_contacted_at, owner_employee_id, notes, open_signal, tags",
      )
      .order("last_event_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("employees")
      .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national, slack_user_id, office_location")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("employee_code"),
  ]);
  if (tpRes.error) console.error("[talent-pool] talent_pool query failed:", tpRes.error.message);
  if (empsRes.error) console.error("[talent-pool] employees query failed:", empsRes.error.message);

  // talent_pool 行 → TalentPoolEntry。カラム名はほぼ同名。
  // 配列カラム（skills/tags）は null を [] に、UI 必須の文字列は null を "" に正規化。
  const talent: TalentPoolEntry[] = (tpRes.data ?? []).map((r) => ({
    id: r.id as string,
    full_name: (r.full_name as string | null) ?? "",
    display_name_en: (r.display_name_en as string | null) ?? undefined,
    email: (r.email as string | null) ?? "",
    kind: r.kind as TalentPoolEntry["kind"],
    status: r.status as TalentPoolEntry["status"],
    original_source: (r.original_source as TalentPoolEntry["original_source"] | null) ?? "direct",
    last_position_id: (r.last_position_id as string | null) ?? undefined,
    last_stage: (r.last_stage as string | null) ?? undefined,
    current_role: (r.current_role as string | null) ?? undefined,
    current_company: (r.current_company as string | null) ?? undefined,
    years_of_experience: (r.years_of_experience as number | null) ?? undefined,
    skills: (r.skills as string[] | null) ?? [],
    location: (r.location as string | null) ?? "",
    country_code: (r.country_code as string | null) ?? "",
    last_event_at: (r.last_event_at as string | null) ?? "",
    last_event_summary: (r.last_event_summary as string | null) ?? "",
    last_contacted_at: (r.last_contacted_at as string | null) ?? undefined,
    owner_employee_id: (r.owner_employee_id as string | null) ?? undefined,
    notes: (r.notes as string | null) ?? undefined,
    open_signal: r.open_signal as TalentPoolEntry["open_signal"],
    tags: (r.tags as string[] | null) ?? [],
  }));

  const employees = (empsRes.data ?? []) as DemoEmployee[];

  return <TalentPoolClient talent={talent} employees={employees} />;
}
