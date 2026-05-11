/**
 * バディ自動マッチングのロジック。
 *
 * シグナル：
 *  - same_dept    : 同じ部門
 *  - cross_dept   : 部門は違うが、関連性のある分野
 *  - skill_overlap: スキル重複（メンタリング能力の指標）
 *  - tenure       : 在籍 1 年以上で、文化を語れる
 *  - load         : 既にバディとして抱えている人数（少ないほど可）
 *  - culture      : 9-box の high_perf_*（活躍社員）
 *
 * 出力：上位 3 名 + 各々のフィット理由
 */

import type { DemoEmployee } from "@/lib/demo/employees";
import type { TalentProfile } from "@/lib/demo/talent-profiles";

export type BuddyMatchInput = {
  new_hire_role: string;
  new_hire_department_id: string;
  new_hire_skills: string[];
  /** 海外拠点なら time-zone 対応に重み */
  new_hire_country_code: string;
};

export type BuddyMatch = {
  employee: DemoEmployee;
  profile: TalentProfile;
  score: number;
  reasons: { label: string; weight: number }[];
};

const MS_PER_YEAR = 365 * 86_400_000;

function tenureYears(emp: DemoEmployee): number {
  const hire = new Date(emp.hire_date);
  if (Number.isNaN(hire.getTime())) return 0;
  return (Date.now() - hire.getTime()) / MS_PER_YEAR;
}

function jaccardCount(a: string[], b: string[]): number {
  const sa = new Set(a.map((x) => x.toLowerCase()));
  let inter = 0;
  for (const x of b) if (sa.has(x.toLowerCase())) inter += 1;
  return inter;
}

export function findBuddies(
  input: BuddyMatchInput,
  employees: DemoEmployee[],
  profiles: TalentProfile[],
): BuddyMatch[] {
  const profileMap = new Map(profiles.map((p) => [p.employee_id, p]));
  const candidates: BuddyMatch[] = [];

  for (const emp of employees) {
    if (emp.status !== "active") continue;
    const profile = profileMap.get(emp.id);
    if (!profile) continue;
    if (tenureYears(emp) < 1) continue; // 入社 1 年未満は除外

    const reasons: { label: string; weight: number }[] = [];
    let score = 0;

    // 1. 部門マッチ
    if (emp.department_id === input.new_hire_department_id) {
      reasons.push({ label: "同じ部門所属", weight: 0.30 });
      score += 0.30;
    } else if (
      // 関連部門：技術 ↔ デザイン ↔ プロダクト 等
      ["d-eng", "d-design", "d-product"].includes(emp.department_id) &&
      ["d-eng", "d-design", "d-product"].includes(input.new_hire_department_id)
    ) {
      reasons.push({ label: "プロダクト系の関連部門", weight: 0.15 });
      score += 0.15;
    }

    // 2. スキルオーバーラップ
    const overlap = jaccardCount(profile.skills, input.new_hire_skills);
    if (overlap > 0) {
      const w = Math.min(0.25, overlap * 0.08);
      reasons.push({
        label: `共通スキル ${overlap} 個（メンタリング可能）`,
        weight: w,
      });
      score += w;
    }

    // 3. 同じ国
    const empCountry = emp.office_location.split("-")[0];
    if (empCountry === input.new_hire_country_code) {
      reasons.push({ label: `同じ国（${empCountry}）— 時差なし`, weight: 0.15 });
      score += 0.15;
    }

    // 4. テナー（在籍年数）— 2-5 年が「自分も最近通ったから語れる」ゾーン
    const t = tenureYears(emp);
    if (t >= 1.5 && t <= 5) {
      reasons.push({
        label: `在籍 ${t.toFixed(1)} 年（カルチャーを語れる）`,
        weight: 0.15,
      });
      score += 0.15;
    } else if (t > 5) {
      reasons.push({
        label: `ベテラン ${Math.floor(t)} 年（深い知見）`,
        weight: 0.10,
      });
      score += 0.10;
    }

    // 5. 活躍社員（9-box high_perf_*）
    if (profile.is_high_performer) {
      reasons.push({ label: "高評価メンバー（学べる）", weight: 0.10 });
      score += 0.10;
    }

    // 6. 対人感受性 / 巻き込み力 がある人を優先（バディに重要）
    if (profile.signature_traits.includes("対人感受性") ||
        profile.signature_traits.includes("巻き込み力")) {
      reasons.push({ label: "対人感受性が強み（特性タグ）", weight: 0.10 });
      score += 0.10;
    }

    if (score < 0.3) continue; // 弱すぎは除外

    candidates.push({
      employee: emp,
      profile,
      score: Number(score.toFixed(3)),
      reasons: reasons.sort((a, b) => b.weight - a.weight),
    });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 3);
}
