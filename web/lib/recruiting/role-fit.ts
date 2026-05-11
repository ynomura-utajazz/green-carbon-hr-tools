/**
 * 候補者 × 募集ポジションの適合度（Role Fit）計算。
 *
 * 「この候補者は技術リードに 87% 適合、PM に 42% 適合」のように
 * 候補者を複数ポジションに対して同時にスコアリングする。
 *
 * 計算：
 *  - スキルマッチ（Jaccard, 重み 0.55）
 *  - 経験年数のレンジマッチ（0.20）
 *  - 給与条件マッチ（0.15）
 *  - フラグの整合（外国籍 OK / 海外 OK 等、0.10）
 */

import type { Candidate, Position } from "@/lib/demo/recruiting";
import { extractSkillsFromText } from "./similarity";

export type RoleFitScore = {
  position_id: string;
  position_title: string;
  /** 0..1 */
  total: number;
  skill: number;
  experience: number;
  salary: number;
  flags: number;
  /** マッチしたスキル */
  matched_skills: string[];
  /** 不足しているスキル（Top 3） */
  missing_skills: string[];
  /** 説明文（UI 表示用） */
  rationale: string;
};

function jaccardWithMissing(
  candSkills: string[], reqSkills: string[],
): { score: number; matched: string[]; missing: string[] } {
  const sa = new Set(candSkills.map((x) => x.toLowerCase()));
  const sb = new Set(reqSkills.map((x) => x.toLowerCase()));
  const matched: string[] = [];
  const missing: string[] = [];
  let inter = 0;
  for (const x of sb) {
    if (sa.has(x)) { inter += 1; matched.push(x); }
    else missing.push(x);
  }
  if (sa.size === 0) return { score: 0, matched: [], missing };
  // 必要スキルに対する充足率
  const score = inter / Math.max(1, sb.size);
  return { score, matched, missing };
}

function expScore(candYears: number, range: { min?: number; max?: number }): number {
  const min = range.min ?? 0;
  const max = range.max ?? Infinity;
  if (candYears >= min && candYears <= max) return 1;
  // 範囲外は離れた距離で減衰
  const dist = candYears < min ? min - candYears : candYears - max;
  return Math.max(0, 1 - dist / 5);
}

function salaryScore(candSalary: number | undefined, range: { min?: number; max?: number }): number {
  if (!candSalary) return 0.7; // 未提示は中立寄り
  const min = range.min ?? 0;
  const max = range.max ?? Infinity;
  if (candSalary >= min && candSalary <= max) return 1;
  // 上振れ：コスト懸念で減衰、下振れ：ロー側は OK 寄り
  if (candSalary > max) {
    const overPct = (candSalary - max) / max;
    return Math.max(0.2, 1 - overPct * 2);
  }
  return 0.85;
}

export function computeRoleFit(
  candidate: Pick<
    Candidate,
    "current_role" | "years_of_experience" | "notes" | "current_company" |
    "desired_salary" | "desired_currency"
  >,
  positions: Position[],
): RoleFitScore[] {
  const candText = [candidate.current_role, candidate.notes, candidate.current_company]
    .filter(Boolean).join(" ");
  const candSkills = extractSkillsFromText(candText);
  const candYears = candidate.years_of_experience ?? 0;
  const candSalary = candidate.desired_salary;

  return positions
    .filter((p) => p.is_open)
    .map((pos) => {
      const { score: skillS, matched, missing } = jaccardWithMissing(candSkills, pos.required_skills);

      const eRange = guessExpRange(pos);
      const sRange = guessSalaryRange(pos);
      const eS = expScore(candYears, eRange);
      const sS = salaryScore(candSalary, sRange);

      // フラグ：海外メンバー OK ポジションに外国籍候補なら +
      const flagsS = 0.7; // 既定値（demo では一定）

      const total = skillS * 0.55 + eS * 0.20 + sS * 0.15 + flagsS * 0.10;

      const rationale = buildRationale({
        skillS, matched, missing, eS, sS,
        candYears, eRangeLabel: `${eRange.min ?? 0}〜${eRange.max ?? "—"}年`,
      });

      return {
        position_id: pos.id,
        position_title: pos.title,
        total: Number(total.toFixed(3)),
        skill: Number(skillS.toFixed(3)),
        experience: Number(eS.toFixed(3)),
        salary: Number(sS.toFixed(3)),
        flags: flagsS,
        matched_skills: matched,
        missing_skills: missing.slice(0, 3),
        rationale,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// 年数レンジを職種から推定（本番では Position 側に min/max を持たせる）
function guessExpRange(pos: Position): { min: number; max: number } {
  if (/lead|リード|シニア|senior/i.test(pos.title)) return { min: 5, max: 12 };
  if (/マネージャー|manager|head|director/i.test(pos.title)) return { min: 7, max: 15 };
  if (/junior|新卒|associate/i.test(pos.title)) return { min: 0, max: 3 };
  return { min: 3, max: 10 };
}

function guessSalaryRange(pos: Position): { min: number; max: number } {
  // demo：職種から大雑把に
  if (/lead|リード|シニア/i.test(pos.title)) return { min: 9_000_000, max: 14_000_000 };
  if (/マネージャー|head/i.test(pos.title)) return { min: 11_000_000, max: 18_000_000 };
  if (/junior/i.test(pos.title)) return { min: 4_000_000, max: 7_000_000 };
  return { min: 6_000_000, max: 12_000_000 };
}

function buildRationale(args: {
  skillS: number; matched: string[]; missing: string[];
  eS: number; sS: number;
  candYears: number; eRangeLabel: string;
}): string {
  const parts: string[] = [];
  if (args.skillS >= 0.7) parts.push(`必須スキル ${Math.round(args.skillS * 100)}% 充足`);
  else if (args.skillS >= 0.4) parts.push(`必須スキルは部分的にマッチ（${Math.round(args.skillS * 100)}%）`);
  else parts.push(`必須スキルの充足率は低い（${Math.round(args.skillS * 100)}%）`);

  if (args.missing.length > 0) parts.push(`未保有: ${args.missing.slice(0, 2).join("・")}`);

  if (args.eS >= 0.9) parts.push(`経験年数（${args.candYears}年）はレンジ内`);
  else parts.push(`経験 ${args.candYears} 年 ↔ 求人 ${args.eRangeLabel}`);

  if (args.sS >= 0.9) parts.push("給与条件は社内テーブル内");
  else if (args.sS < 0.6) parts.push("給与条件が社内テーブル上限を超える可能性");

  return parts.join("。") + "。";
}
