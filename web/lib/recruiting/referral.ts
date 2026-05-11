/**
 * 社員ごとの「あなたが知ってそうな候補者」サジェスト。
 *
 * シグナル：
 *  - same_industry  : 社員の前職カテゴリ × 候補者の業界カテゴリ
 *  - skill_overlap  : スキル一致数
 *  - same_country   : 同じ国コード
 *  - gap_fit        : 候補者スキルが組織のギャップを埋めるか
 *  - high_signal    : 候補者の応募意欲（open_to_work > passive > not_looking）
 *
 * 重み付け合成スコアでランキング。
 */

import type { TalentProfile, StrategicGap } from "@/lib/demo/talent-profiles";
import type { ExternalProfile } from "@/lib/demo/external-pool";
import type { DemoEmployee } from "@/lib/demo/employees";

export type ReferralReason = {
  signal: "same_industry" | "skill_overlap" | "same_country" | "gap_fit" | "high_signal";
  /** UI 表示用 1 行 */
  label: string;
  weight: number; // 0..1
};

export type ReferralSuggestion = {
  profile: ExternalProfile;
  /** 0..1 */
  score: number;
  reasons: ReferralReason[];
  /** 充足する戦略ギャップ（あれば） */
  fills_gap?: { area: string; severity: StrategicGap["severity"] };
};

const SIGNAL_OPEN: Record<ExternalProfile["signal"], number> = {
  open_to_work: 1.0,
  passive:      0.6,
  not_looking:  0.2,
};

function jaccardCount(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a.map((x) => x.toLowerCase()));
  let inter = 0;
  for (const x of b) if (sa.has(x.toLowerCase())) inter += 1;
  return inter;
}

function sharedSkills(a: string[], b: string[]): string[] {
  const sa = new Set(a.map((x) => x.toLowerCase()));
  return b.filter((x) => sa.has(x.toLowerCase()));
}

/**
 * 1 社員に対する候補者サジェスト。スコア降順で上位 N 件。
 */
export function suggestForEmployee(
  employee: DemoEmployee,
  profile: TalentProfile,
  pool: ExternalProfile[],
  gaps: StrategicGap[],
  limit = 5,
): ReferralSuggestion[] {
  const empCountry = employee.office_location.split("-")[0]; // "JP-TYO" → "JP"

  return pool
    .map<ReferralSuggestion>((cand) => {
      const reasons: ReferralReason[] = [];
      let score = 0;

      // 1. 業界カテゴリ一致（同窓・元同僚的な含み）
      if (cand.industry === profile.background_industry) {
        reasons.push({
          signal: "same_industry",
          label: `同じ業界出身（${cand.industry}）→ 業界の知人がいる可能性が高い`,
          weight: 0.30,
        });
        score += 0.30;
      }

      // 2. 同じ国コード
      if (cand.country_code === empCountry) {
        reasons.push({
          signal: "same_country",
          label: `同じ国（${cand.country_code}）— 物理的距離が近い`,
          weight: 0.15,
        });
        score += 0.15;
      } else if (
        // ASEAN メンバー同士のクロスリージョン
        ["ID", "VN", "PH", "MY", "SG", "TH"].includes(empCountry) &&
        ["ID", "VN", "PH", "MY", "SG", "TH"].includes(cand.country_code)
      ) {
        reasons.push({
          signal: "same_country",
          label: `同じ ASEAN リージョン`,
          weight: 0.08,
        });
        score += 0.08;
      }

      // 3. スキルオーバーラップ
      const overlap = jaccardCount(profile.skills, cand.skills);
      if (overlap > 0) {
        const shared = sharedSkills(profile.skills, cand.skills);
        const skillScore = Math.min(0.30, overlap * 0.08);
        reasons.push({
          signal: "skill_overlap",
          label: `共通スキル ${overlap} 個（${shared.slice(0, 3).join("・")}）`,
          weight: skillScore,
        });
        score += skillScore;
      }

      // 4. ギャップ充足
      const fillsGap = gaps.find(
        (g) => jaccardCount(g.required_skills, cand.skills) >= 2,
      );
      if (fillsGap) {
        const w = fillsGap.severity === "high" ? 0.25 : fillsGap.severity === "med" ? 0.15 : 0.08;
        reasons.push({
          signal: "gap_fit",
          label: `組織ギャップ「${fillsGap.area}」を埋められる`,
          weight: w,
        });
        score += w;
      }

      // 5. シグナル（応募意欲）
      const sigW = (SIGNAL_OPEN[cand.signal] ?? 0.2) * 0.10;
      reasons.push({
        signal: "high_signal",
        label: cand.signal === "open_to_work"
          ? "🔥 Open to Work — 動きやすい"
          : cand.signal === "passive"
            ? "Passive — 良いオファーなら検討"
            : "現職に満足 — リファラル経由なら可能性",
        weight: sigW,
      });
      score += sigW;

      return {
        profile: cand,
        score: Math.min(1, Number(score.toFixed(3))),
        reasons: reasons.sort((a, b) => b.weight - a.weight),
        fills_gap: fillsGap
          ? { area: fillsGap.area, severity: fillsGap.severity }
          : undefined,
      };
    })
    .filter((s) => s.score >= 0.15) // 弱すぎるシグナルは隠す
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * 全社員 × 全候補者でマトリクスを作り、トップ N サジェストを返す（HR 管理者向け）。
 */
export function topReferralChances(
  employees: { employee: DemoEmployee; profile: TalentProfile }[],
  pool: ExternalProfile[],
  gaps: StrategicGap[],
  topN = 10,
): { referrer: DemoEmployee; suggestion: ReferralSuggestion }[] {
  const all: { referrer: DemoEmployee; suggestion: ReferralSuggestion }[] = [];
  for (const { employee, profile } of employees) {
    const sugs = suggestForEmployee(employee, profile, pool, gaps, 3);
    for (const s of sugs) {
      all.push({ referrer: employee, suggestion: s });
    }
  }
  return all.sort((a, b) => b.suggestion.score - a.suggestion.score).slice(0, topN);
}

/** Slack DM のドラフト本文を生成（リファラル依頼） */
export function buildReferralRequestMessage(
  employeeName: string,
  candidate: ExternalProfile,
  reasons: ReferralReason[],
): string {
  const reasonLines = reasons.slice(0, 2).map((r) => `・${r.label}`).join("\n");
  return `${employeeName} さん、お疲れさまです 🙏

採用 Intelligence で「もしかすると ${employeeName} さんと近い方かも」という候補者が出てきました：

📋 ${candidate.full_name}（${candidate.current_role} @ ${candidate.current_company}）
${candidate.linkedin_url ?? "（LinkedIn なし）"}

シグナル：
${reasonLines}

もしご存知だったら、リファラル経由で繋いでいただけますか？
ご縁がなくても全く問題ないので、コーヒー代わりにご一報いただけたら 🙌`;
}
