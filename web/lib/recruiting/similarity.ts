/**
 * 候補者と社員の類似度計算（活躍人材マッチング用）。
 *
 * 計算アプローチ：
 *  1. 候補者からスキル・前職カテゴリ・経験年数を抽出
 *  2. 各社員と Jaccard（スキル）+ カテゴリ完全一致 + 経験年数差で重み付き合成
 *  3. 上位 N 名を返す
 *
 * 本番では：
 *  - スキル抽出を AI/NLP で resume + interview notes から
 *  - Embedding ベース（Voyage-3 等）で意味類似度
 *  に置き換える。
 */

import type { Candidate } from "@/lib/demo/recruiting";
import type { TalentProfile } from "@/lib/demo/talent-profiles";

export type SimilarityBreakdown = {
  /** 0..1 */
  total: number;
  skill: number;
  background: number;
  experience: number;
  /** マッチしたスキル */
  matched_skills: string[];
};

export type SimilarEmployee = {
  employee_id: string;
  full_name: string;
  job_title: string;
  is_high_performer: boolean;
  one_liner?: string;
  similarity: SimilarityBreakdown;
};

// ── ヘルパ ───────────────────────────────────────────────────

/** 候補者ノートからスキルキーワードを抽出（簡易：正規表現で既知タグを拾う） */
const KNOWN_SKILLS = [
  "TypeScript", "JavaScript", "Python", "Rust", "Go", "Java", "Kotlin",
  "Node.js", "Next.js", "React", "Vue",
  "PostgreSQL", "MySQL", "Redis", "Elasticsearch",
  "AWS", "GCP", "Azure", "Kubernetes", "Docker",
  "Figma", "Sketch", "UXリサーチ", "Webデザイン", "プロトタイピング", "ブランドデザイン",
  "事業開発", "BD/Sales", "事業計画", "プロジェクトマネジメント",
  "プロダクトマネジメント", "UX", "データ分析",
  "ASEAN市場知識", "英語ビジネスレベル", "韓国市場",
  "コンテンツマーケ", "SEO", "ESG/気候変動の知識", "ライティング",
  "月次決算", "連結決算", "IPO 経験", "freee 経験", "監査対応",
  "気候政策", "国際枠組（パリ協定/JCM）", "規制翻訳",
  "ML", "PyTorch", "TensorFlow", "MLOps", "時系列データ",
  "システム設計", "チームビルディング", "技術文書",
  "リクルーティング", "母集団形成", "L&D", "研修設計", "1on1 設計",
  "カーボン計算", "B2B SaaS",
];

export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  const lower = text.toLowerCase();
  for (const s of KNOWN_SKILLS) {
    if (lower.includes(s.toLowerCase())) found.add(s);
  }
  return [...found];
}

function jaccard(a: string[], b: string[]): { score: number; matched: string[] } {
  if (a.length === 0 || b.length === 0) return { score: 0, matched: [] };
  const sa = new Set(a.map((x) => x.toLowerCase()));
  const sb = new Set(b.map((x) => x.toLowerCase()));
  const matched: string[] = [];
  let inter = 0;
  for (const x of sa) {
    if (sb.has(x)) {
      inter += 1;
      matched.push(x);
    }
  }
  const union = sa.size + sb.size - inter;
  return { score: inter / union, matched };
}

// ── メイン関数 ─────────────────────────────────────────────────

export function computeCandidateSimilarity(
  candidate: Pick<Candidate, "current_role" | "years_of_experience" | "notes" | "current_company">,
  profiles: { profile: TalentProfile; emp: { id: string; full_name: string; job_title: string } }[],
): SimilarEmployee[] {
  // 候補者特徴量
  const candText = [candidate.current_role, candidate.notes, candidate.current_company]
    .filter(Boolean).join(" ");
  const candSkills = extractSkillsFromText(candText);
  const candYears = candidate.years_of_experience ?? 0;
  const candBgIndustry = inferBackgroundIndustry(candidate.current_company ?? "", candText);

  return profiles
    .map(({ profile, emp }) => {
      const { score: skillScore, matched } = jaccard(candSkills, profile.skills);
      const bgScore = candBgIndustry && candBgIndustry === profile.background_industry ? 1 : 0;
      // 経験年数の近さ（差 0 で 1.0、差 5 で 0、差 10 で 0）
      const expDiff = Math.abs(candYears - guessTenureYears(profile));
      const expScore = Math.max(0, 1 - expDiff / 8);

      // 重み付き合成。スキル 0.6、背景 0.2、経験 0.2
      const total = skillScore * 0.6 + bgScore * 0.2 + expScore * 0.2;

      return {
        employee_id: profile.employee_id,
        full_name: emp.full_name,
        job_title: emp.job_title,
        is_high_performer: profile.is_high_performer,
        one_liner: profile.one_liner,
        similarity: {
          total: Number(total.toFixed(3)),
          skill: Number(skillScore.toFixed(3)),
          background: bgScore,
          experience: Number(expScore.toFixed(3)),
          matched_skills: matched,
        },
      };
    })
    .sort((a, b) => b.similarity.total - a.similarity.total);
}

function guessTenureYears(profile: TalentProfile): number {
  // demo: signature traits / nine_box から大雑把な経験年数
  if (profile.competencies.leadership >= 4) return 10;
  if (profile.competencies.technical >= 5) return 7;
  return 5;
}

function inferBackgroundIndustry(company: string, text: string): TalentProfile["background_industry"] | null {
  const t = (company + " " + text).toLowerCase();
  if (/\b(consult|deloitte|accenture|mckinsey|bcg)\b/.test(t)) return "consulting";
  if (/\bsier|sb\b|nec|fujitsu|hitachi/.test(t)) return "tech_bigco";
  if (/\b(google|amazon|meta|microsoft|apple|line|yahoo|rakuten|mercari)\b/.test(t)) return "tech_bigco";
  if (/startup|スタートアップ|seed|series/.test(t)) return "tech_startup";
  if (/research|研究|university|university|ph\.?d/.test(t)) return "research";
  if (/ngo|非営利/.test(t)) return "ngo";
  if (/energy|電力|エネルギー|原子力/.test(t)) return "energy";
  if (/bank|証券|投資|finance/.test(t)) return "finance";
  if (/agency|広告|広報|事務所/.test(t)) return "agency";
  return null;
}
