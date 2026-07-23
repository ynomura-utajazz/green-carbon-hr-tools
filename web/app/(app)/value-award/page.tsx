import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { DEMO_EMPLOYEES, type DemoEmployee } from "@/lib/demo/employees";
import { DEMO_AWARDS, type Award, type ValueTag } from "@/lib/demo/awards";
import { ValueAwardClient } from "./value-award-client";

export const dynamic = "force-dynamic";

export default async function ValueAwardPage() {
  let awards: Award[];
  let employees: DemoEmployee[];

  if (isDemoMode()) {
    awards = DEMO_AWARDS;
    employees = DEMO_EMPLOYEES;
  } else {
    const supabase = await createClient();
    const [awardsRes, empsRes] = await Promise.all([
      supabase
        .from("value_awards")
        .select("id, recipient_id, nominator_id, value_tag, message, awarded_at")
        .order("awarded_at", { ascending: false }),
      supabase
        .from("employees")
        .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("employee_code"),
    ]);
    if (awardsRes.error) console.error("[value-award] awards query failed:", awardsRes.error.message);
    if (empsRes.error) console.error("[value-award] employees query failed:", empsRes.error.message);

    awards = (awardsRes.data ?? []).map((row): Award => ({
      id: row.id,
      recipient_id: row.recipient_id,
      nominator_id: row.nominator_id,
      value: row.value_tag as ValueTag, // DB は text 列。ValueTag リテラルへマップ
      message: row.message,
      awarded_at: row.awarded_at,
      reactions: [], // value_awards に該当列なし。空配列で供給（AwardCard の .map を安全に）
    }));
    employees = (empsRes.data ?? []) as DemoEmployee[];
  }

  return <ValueAwardClient awards={awards} employees={employees} />;
}
