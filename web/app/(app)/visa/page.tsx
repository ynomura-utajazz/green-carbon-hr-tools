import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { DEMO_EMPLOYEES, type DemoEmployee } from "@/lib/demo/employees";
import { DEMO_VISA_RECORDS, type VisaRecord, type VisaStatus } from "@/lib/demo/visa";
import { VisaClient } from "./visa-client";

export const dynamic = "force-dynamic";

// visa_records の実カラムのみ（唯一の真実スキーマに準拠）。
type VisaRow = {
  employee_id: string;
  visa_status: string | null;
  card_number: string | null;
  issued_at: string | null;
  expires_at: string;
  notes: string | null;
};

export default async function VisaPage() {
  let records: VisaRecord[];
  let employees: DemoEmployee[];

  if (isDemoMode()) {
    records = DEMO_VISA_RECORDS;
    employees = DEMO_EMPLOYEES;
  } else {
    const supabase = await createClient();
    const [visaRes, empsRes] = await Promise.all([
      supabase
        .from("visa_records")
        .select("employee_id, visa_status, card_number, issued_at, expires_at, notes")
        .order("expires_at"),
      supabase
        .from("employees")
        .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national, slack_user_id, office_location")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("employee_code"),
    ]);
    if (visaRes.error) console.error("[visa] visa_records query failed:", visaRes.error.message);
    if (empsRes.error) console.error("[visa] employees query failed:", empsRes.error.message);

    records = ((visaRes.data ?? []) as VisaRow[]).map((row): VisaRecord => ({
      employee_id: row.employee_id,
      // visa_status は DB では自由テキスト。VisaStatus の 8 キーに一致する前提でそのまま渡す
      // （不一致なら STATUS_LABEL 参照が undefined になり空表示。偽値は作らない）。
      visa_status: (row.visa_status ?? "") as VisaStatus,
      card_number: row.card_number ?? "",
      issued_at: row.issued_at ?? "",
      expires_at: row.expires_at,
      // renewal_progress / required_documents は visa_records に列が存在しない。
      // 偽データを作らず安全な既定値にする（申請進行中 KPI は 0、必要書類セクションは非表示）。
      renewal_progress: "not_started",
      required_documents: [],
      notes: row.notes ?? undefined,
    }));
    employees = (empsRes.data ?? []) as DemoEmployee[];
  }

  return <VisaClient records={records} employees={employees} />;
}
