import { isDemoMode } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { SalaryBandClient, type BandRow } from "./salary-band-client";

export const dynamic = "force-dynamic";

// デモデータ（従来 page.tsx にハードコードされていた bands。デモ表示を不変に保つため保持）
const DEMO_BANDS: BandRow[] = [
  { grade: "EX", role: "Executive",  min: 15_000_000, mid: 20_000_000, max: 30_000_000, count: 6 },
  { grade: "M4", role: "Director",   min: 12_000_000, mid: 14_500_000, max: 18_000_000, count: 1 },
  { grade: "M3", role: "Manager",    min:  9_000_000, mid: 11_000_000, max: 14_000_000, count: 5 },
  { grade: "S5", role: "Staff",      min:  9_000_000, mid: 11_500_000, max: 14_500_000, count: 3 },
  { grade: "S4", role: "Senior",     min:  7_500_000, mid:  9_000_000, max: 11_500_000, count: 4 },
  { grade: "S3", role: "Mid",        min:  6_000_000, mid:  7_500_000, max:  9_000_000, count: 5 },
  { grade: "S2", role: "Junior",     min:  4_500_000, mid:  5_500_000, max:  7_000_000, count: 3 },
  { grade: "I1", role: "Intern",     min:  2_400_000, mid:  2_800_000, max:  3_200_000, count: 2 },
  { grade: "C4", role: "Contractor", min:  9_000_000, mid: 11_000_000, max: 14_000_000, count: 1 },
];

// 次回昇給サイクルは表マスタに列が無い運用上の計画ラベル。demo/本番で同一表示。
const NEXT_CYCLE_LABEL = "Q3 2026";

// salary_bands には役割名の列が無いため、job_grade の接頭辞から粗いカテゴリを導出する。
// 未知グレードは grade 文字列そのものにフォールバック（throw しない）。
function gradeToRole(grade: string): string {
  const u = grade.toUpperCase();
  if (u.startsWith("EX")) return "Executive";
  if (u.startsWith("M")) return "Management";
  if (u.startsWith("S")) return "Staff";
  if (u.startsWith("I")) return "Intern";
  if (u.startsWith("C")) return "Contractor";
  return grade;
}

export default async function SalaryBandPage() {
  if (isDemoMode()) {
    return (
      <SalaryBandClient
        bands={DEMO_BANDS}
        avgAnnualLabel="¥9.8M"
        nextCycleLabel={NEXT_CYCLE_LABEL}
      />
    );
  }

  // 本番: 実テーブルから取得（ユーザー RLS）。
  const supabase = await createClient();
  const [bandsRes, empsRes] = await Promise.all([
    supabase
      .from("salary_bands")
      .select("job_grade, min_amount, mid_amount, max_amount, currency, effective_from")
      .order("effective_from", { ascending: false }),
    supabase
      .from("employees")
      .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national, slack_user_id, office_location")
      .eq("status", "active")
      .is("deleted_at", null),
  ]);
  if (bandsRes.error) console.error("[salary-band] salary_bands query failed:", bandsRes.error.message);
  if (empsRes.error) console.error("[salary-band] employees query failed:", empsRes.error.message);

  // job_grade 別の在籍数（active 社員から集計）。
  const gradeCounts = new Map<string, number>();
  for (const e of empsRes.data ?? []) {
    const g = (e.job_grade as string | null) ?? "";
    if (!g) continue;
    gradeCounts.set(g, (gradeCounts.get(g) ?? 0) + 1);
  }

  // effective_from 降順で取得済み。job_grade ごとに最新 1 件のみ採用（履歴を除外）。
  const latestByGrade = new Map<string, { min: number; mid: number; max: number }>();
  for (const row of bandsRes.data ?? []) {
    const grade = row.job_grade as string;
    if (!grade || latestByGrade.has(grade)) continue;
    latestByGrade.set(grade, {
      min: Number(row.min_amount) || 0,
      mid: Number(row.mid_amount) || 0,
      max: Number(row.max_amount) || 0,
    });
  }

  const bands: BandRow[] = [...latestByGrade.entries()]
    .map(([grade, amt]) => ({
      grade,
      role: gradeToRole(grade),
      min: amt.min,
      mid: amt.mid,
      max: amt.max,
      count: gradeCounts.get(grade) ?? 0,
    }))
    .sort((a, b) => b.mid - a.mid);

  // 平均年収: バンド中央値を在籍数で加重平均。在籍0なら単純平均、バンド無しなら "—"。
  let weightedSum = 0;
  let weightCount = 0;
  for (const b of bands) {
    weightedSum += b.mid * b.count;
    weightCount += b.count;
  }
  let avgAnnual = 0;
  if (weightCount > 0) {
    avgAnnual = weightedSum / weightCount;
  } else if (bands.length > 0) {
    avgAnnual = bands.reduce((s, b) => s + b.mid, 0) / bands.length;
  }
  const avgAnnualLabel = avgAnnual > 0 ? `¥${(avgAnnual / 1_000_000).toFixed(1)}M` : "—";

  return (
    <SalaryBandClient
      bands={bands}
      avgAnnualLabel={avgAnnualLabel}
      nextCycleLabel={NEXT_CYCLE_LABEL}
    />
  );
}
