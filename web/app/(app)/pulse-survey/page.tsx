import { isDemoMode } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS, type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import {
  DEMO_CAMPAIGNS, DEMO_ACTION_PLANS, PULSE_TREND,
  type Campaign, type ActionPlan, type Question, type CampaignStatus, type SurveyKind,
} from "@/lib/demo/surveys";
import { PulseSurveyClient } from "./pulse-survey-client";

export const dynamic = "force-dynamic";

type TrendPoint = { month: string; engagement: number; manager: number; work_life: number };

export default async function PulseSurveyPage() {
  let campaigns: Campaign[];
  let actionPlans: ActionPlan[];
  let employees: DemoEmployee[];
  let departments: DemoDept[];
  let trend: TrendPoint[];

  if (isDemoMode()) {
    campaigns = DEMO_CAMPAIGNS;
    actionPlans = DEMO_ACTION_PLANS;
    employees = DEMO_EMPLOYEES;
    departments = DEMO_DEPARTMENTS;
    trend = PULSE_TREND;
  } else {
    const supabase = await createClient();
    const [surveysRes, responsesRes, empsRes, deptsRes] = await Promise.all([
      supabase
        .from("surveys")
        .select("id, type, title, description, starts_at, ends_at, questions, is_anonymous")
        .order("starts_at", { ascending: false }),
      // respondent_id は取得しない（匿名性・PII 保護）。回答数の集計のみに使う。
      supabase.from("survey_responses").select("survey_id"),
      supabase
        .from("employees")
        .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("employee_code"),
      supabase.from("departments").select("id, name, parent_id, display_order").order("display_order"),
    ]);

    if (surveysRes.error) console.error("[pulse-survey] surveys query failed:", surveysRes.error.message);
    if (responsesRes.error) console.error("[pulse-survey] survey_responses query failed:", responsesRes.error.message);
    if (empsRes.error) console.error("[pulse-survey] employees query failed:", empsRes.error.message);
    if (deptsRes.error) console.error("[pulse-survey] departments query failed:", deptsRes.error.message);

    employees = (empsRes.data ?? []) as DemoEmployee[];
    departments = (deptsRes.data ?? []) as DemoDept[];

    // survey_id -> 回答数
    const responseCounts = new Map<string, number>();
    for (const r of responsesRes.data ?? []) {
      const sid = (r as { survey_id: string }).survey_id;
      responseCounts.set(sid, (responseCounts.get(sid) ?? 0) + 1);
    }

    // surveys には配信対象数の列が無いため、アクティブ社員数を回答率の分母として代用する（needs_review）。
    const targetCount = employees.length;
    const now = Date.now();

    // surveys には status 列が無いため、starts_at / ends_at から派生させる。
    // DB からは draft / analyzed は判別できない（scheduled / active / closed のみ）。
    const deriveStatus = (startsAt: string | null, endsAt: string | null): CampaignStatus => {
      const s = startsAt ? new Date(startsAt).getTime() : NaN;
      const e = endsAt ? new Date(endsAt).getTime() : NaN;
      if (!Number.isNaN(s) && now < s) return "scheduled";
      if (!Number.isNaN(e) && now > e) return "closed";
      return "active";
    };

    campaigns = (surveysRes.data ?? []).map((row): Campaign => {
      const r = row as {
        id: string;
        type: SurveyKind;
        title: string | null;
        description: string | null;
        starts_at: string | null;
        ends_at: string | null;
        questions: unknown;
        is_anonymous: boolean;
      };

      // questions jsonb は [{id, text, kind:'scale'|'text'|'select', options?}] 形式。
      // demo の Question 型に best-effort でマップ（表示にのみ使用。未知の kind はそのまま表示される）。
      const rawQs = Array.isArray(r.questions) ? (r.questions as Array<Record<string, unknown>>) : [];
      const questions: Question[] = rawQs.map((q, i) => ({
        id: String(q.id ?? `q${i + 1}`),
        text: String(q.text ?? ""),
        kind: (q.kind ?? "text") as Question["kind"],
        dimension: String(q.dimension ?? "engagement"),
        options: Array.isArray(q.options) ? (q.options as unknown[]).map(String) : undefined,
        required: Boolean(q.required ?? false),
      }));

      return {
        id: r.id,
        kind: (r.type ?? "pulse") as SurveyKind,
        title: r.title ?? "",
        description: r.description ?? "",
        status: deriveStatus(r.starts_at, r.ends_at),
        is_anonymous: Boolean(r.is_anonymous),
        // timestamptz を "YYYY-MM-DD" に切り詰め（demo の日付文字列表示に合わせる）。
        starts_at: (r.starts_at ?? "").slice(0, 10),
        ends_at: (r.ends_at ?? "").slice(0, 10),
        target_count: targetCount,
        response_count: responseCounts.get(r.id) ?? 0,
        questions,
        // results（ディメンション別スコア / eNPS / 部門別ヒートマップ / センチメント）は
        // answers jsonb のスキーマが非公開で、実データから信頼できる集計ができない。
        // 偽の集計値を作らないため results は付与しない（undefined）。
      };
    });

    // アクションプラン専用テーブルはスキーマに存在しないため、実データは空にする（needs_review）。
    actionPlans = [];

    // トレンド系列も answers 集計に依存し実データから算出不能。空配列にすると
    // クライアントの TrendChart が data[last].y を参照してクラッシュするため、
    // 既定系列（PULSE_TREND）をフォールバックとして供給する（needs_review）。
    trend = PULSE_TREND;
  }

  return (
    <PulseSurveyClient
      campaigns={campaigns}
      actionPlans={actionPlans}
      employees={employees}
      departments={departments}
      trend={trend}
    />
  );
}
