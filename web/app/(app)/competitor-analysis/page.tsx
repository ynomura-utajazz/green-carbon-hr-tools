"use client";

/**
 * /competitor-analysis
 *
 * 競合他社 JD と自社の差分分析。
 *  - ロールカテゴリを選択 → 競合 JD 一覧（給与レンジ・スキル・福利厚生）
 *  - 自社の必須スキル × 競合保有率
 *  - 給与レンジ比較
 *  - 福利厚生（リモート/SO/関連支援/英語要件）の充足度
 *
 * デモは固定データ。本番では LinkedIn / Wantedly スクレイピング → 構造化保存。
 */

import { useMemo, useState } from "react";
import {
  Swords, Search, TrendingUp, AlertTriangle, CheckCircle2,
  XCircle, Globe2, Briefcase, ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_COMPETITOR_JDS, ROLE_CATEGORY_LABEL,
  type CompetitorJd,
} from "@/lib/demo/competitor-jds";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 自社のロール × 競合カテゴリのマッピング（簡易）
const _OWN_ROLE_TO_CATEGORY: Record<string, CompetitorJd["role_category"]> = {
  "pos-1": "engineer",
  "pos-2": "design",
  "pos-3": "bd",
  "pos-4": "engineer", // マーケコンテンツ → engineer fallback
  "pos-5": "finance",
};

// 自社が想定する各ロールの必須スキル（手入力 demo）— 実装では position.required_skills を使う
function ownRequiredSkillsFor(category: CompetitorJd["role_category"]): string[] {
  switch (category) {
    case "ml_engineer": return ["Python", "PyTorch", "MLOps", "時系列データ", "PostgreSQL"];
    case "bd":          return ["BD/Sales", "ASEAN市場知識", "英語ビジネスレベル", "PJM"];
    case "policy":      return ["気候政策", "国際枠組（パリ協定/JCM）", "規制翻訳", "英語"];
    case "pdm":         return ["プロダクトマネジメント", "B2B SaaS", "データ分析", "UX"];
    case "finance":     return ["連結決算", "IPO 準備", "監査対応", "freee 経験"];
    case "engineer":    return ["TypeScript", "Node.js", "PostgreSQL", "AWS", "システム設計"];
    case "design":      return ["Figma", "UXリサーチ", "Webデザイン", "プロトタイピング"];
  }
}

function ownSalaryRangeFor(category: CompetitorJd["role_category"]): { min: number; max: number } {
  switch (category) {
    case "ml_engineer": return { min:  9_000_000, max: 14_000_000 };
    case "bd":          return { min:  9_000_000, max: 14_000_000 };
    case "policy":      return { min:  8_000_000, max: 12_000_000 };
    case "pdm":         return { min: 10_000_000, max: 14_000_000 };
    case "finance":     return { min:  8_000_000, max: 12_000_000 };
    case "engineer":    return { min:  8_000_000, max: 12_000_000 };
    case "design":      return { min:  8_000_000, max: 11_000_000 };
  }
}

const fmtJpy = (n: number) =>
  n >= 10_000_000 ? `¥${(n / 10_000_000).toFixed(1)}千万`
  : n >= 10_000   ? `¥${(n / 10_000).toFixed(0)}万`
  : `¥${n.toLocaleString()}`;

const ROLES: CompetitorJd["role_category"][] = [
  "ml_engineer", "bd", "policy", "pdm", "finance",
];

export default function CompetitorAnalysisPage() {
  const [category, setCategory] = useState<CompetitorJd["role_category"]>("ml_engineer");

  const competitors = useMemo(
    () => DEMO_COMPETITOR_JDS.filter((c) => c.role_category === category),
    [category],
  );

  const ownSkills = ownRequiredSkillsFor(category);
  const ownSalary = ownSalaryRangeFor(category);

  // スキル × 競合の保有マトリクス
  const skillMatrix = useMemo(() => {
    return ownSkills.map((skill) => {
      const presence = competitors.map((c) => {
        const inMust = c.required_skills.some((s) => s.toLowerCase() === skill.toLowerCase());
        const inNice = c.nice_to_have.some((s) => s.toLowerCase() === skill.toLowerCase());
        return { competitor: c, status: inMust ? "must" : inNice ? "nice" : "absent" } as const;
      });
      const mustCount = presence.filter((p) => p.status === "must").length;
      return {
        skill,
        presence,
        coverage: competitors.length > 0 ? mustCount / competitors.length : 0,
      };
    });
  }, [ownSkills, competitors]);

  // 給与競争力
  const salaryStats = useMemo(() => {
    const valid = competitors.filter((c) => c.comp_min_jpy && c.comp_max_jpy);
    if (valid.length === 0) return null;
    const minAvg = valid.reduce((s, c) => s + (c.comp_min_jpy ?? 0), 0) / valid.length;
    const maxAvg = valid.reduce((s, c) => s + (c.comp_max_jpy ?? 0), 0) / valid.length;
    const ourMid = (ownSalary.min + ownSalary.max) / 2;
    const compMid = (minAvg + maxAvg) / 2;
    const gap_pct = ((ourMid - compMid) / compMid) * 100;
    return { minAvg, maxAvg, ourMid, compMid, gap_pct };
  }, [competitors, ownSalary]);

  // 福利厚生スコア
  const benefits = useMemo(() => {
    const total = competitors.length;
    if (total === 0) return null;
    return {
      remote:  competitors.filter((c) => c.remote_ok).length / total,
      so:      competitors.filter((c) => c.has_stock_option).length / total,
      reloc:   competitors.filter((c) => c.has_relocation_support).length / total,
      english: competitors.filter((c) => c.english_required).length / total,
    };
  }, [competitors]);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Swords className="size-6 text-gc-700" />
            競合分析
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            他社 JD・採用条件と自社 JD の差分を可視化。給与競争力・スキル要件・福利厚生をベンチマーク
          </p>
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as CompetitorJd["role_category"])}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_CATEGORY_LABEL[r]}
                <span className="ml-2 text-[10px] text-muted-foreground">
                  ({DEMO_COMPETITOR_JDS.filter((c) => c.role_category === r).length} 社)
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {competitors.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          このカテゴリでは競合 JD データがまだ収集されていません
        </div>
      ) : (
        <>
          {/* 給与競争力 */}
          {salaryStats && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <TrendingUp className="size-4 text-gc-700" />
                  給与競争力
                  <span className="font-normal text-[11px] text-muted-foreground">
                    — 競合 {competitors.length} 社平均 vs 自社
                  </span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <CompPill
                    label="自社レンジ"
                    value={`${fmtJpy(ownSalary.min)} 〜 ${fmtJpy(ownSalary.max)}`}
                    sub={`中央値 ${fmtJpy(salaryStats.ourMid)}`}
                    tone="primary"
                  />
                  <CompPill
                    label="競合平均レンジ"
                    value={`${fmtJpy(salaryStats.minAvg)} 〜 ${fmtJpy(salaryStats.maxAvg)}`}
                    sub={`中央値 ${fmtJpy(salaryStats.compMid)}`}
                  />
                  <CompPill
                    label="差分"
                    value={`${salaryStats.gap_pct >= 0 ? "+" : ""}${salaryStats.gap_pct.toFixed(1)}%`}
                    sub={salaryStats.gap_pct >= 0 ? "競合より高い" : "競合より低い"}
                    tone={salaryStats.gap_pct >= 0 ? "success" : "warn"}
                  />
                </div>
                {salaryStats.gap_pct < -10 && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      <strong>給与競争力が弱い：</strong>
                      自社中央値が競合平均より <strong>{Math.abs(salaryStats.gap_pct).toFixed(1)}%</strong> 低い。
                      候補者の流出リスクが高いため、レンジ見直しを推奨。
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* スキル要件比較 */}
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                <Search className="size-4 text-gc-700" />
                必須スキル × 競合保有マトリクス
              </h2>
              <p className="mb-3 text-[11px] text-muted-foreground">
                自社が必須としているスキルを、各競合がどう扱っているか（必須 / 歓迎 / なし）
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-1.5 text-left font-semibold">スキル</th>
                      {competitors.map((c) => (
                        <th key={c.id} className="px-2 py-1.5 text-center font-semibold whitespace-nowrap">
                          {c.company.length > 16 ? c.company.slice(0, 14) + "…" : c.company}
                        </th>
                      ))}
                      <th className="px-2 py-1.5 text-right font-semibold bg-muted/30">必須率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skillMatrix.map((row) => (
                      <tr key={row.skill} className="border-b last:border-b-0">
                        <td className="px-2 py-1.5 font-medium">{row.skill}</td>
                        {row.presence.map((p) => (
                          <td key={p.competitor.id} className="px-2 py-1 text-center">
                            <PresenceCell status={p.status} />
                          </td>
                        ))}
                        <td className={cn(
                          "bg-muted/20 px-2 py-1.5 text-right font-mono font-bold tabular-nums",
                          row.coverage >= 0.7 ? "text-emerald-700" :
                          row.coverage >= 0.4 ? "text-amber-700"  : "text-red-700",
                        )}>
                          {Math.round(row.coverage * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 rounded-md border bg-muted/30 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                💡 <strong>必須率 70% 以上</strong> = 業界共通の最重要スキル。
                <strong>40% 未満</strong> = 自社独自要求の可能性。本当に必須か再検討を。
              </div>
            </CardContent>
          </Card>

          {/* 福利厚生比較 */}
          {benefits && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                  <Briefcase className="size-4 text-gc-700" />
                  福利厚生・働き方の競合保有率
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <BenefitBar label="リモート可" value={benefits.remote} />
                  <BenefitBar label="ストックオプション" value={benefits.so} />
                  <BenefitBar label="リロケーション支援" value={benefits.reloc} />
                  <BenefitBar label="英語必須" value={benefits.english} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 競合 JD 一覧 */}
          <Card>
            <CardContent className="p-0">
              <div className="border-b p-3">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Globe2 className="size-4 text-gc-700" />
                  競合 JD 詳細（{competitors.length} 社）
                </h2>
              </div>
              <ul className="divide-y">
                {competitors.map((c) => (
                  <li key={c.id} className="space-y-2 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold">{c.company}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {c.industry}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {c.company_size} 名 · {c.funding_stage}
                          </span>
                        </div>
                        <div className="text-sm">{c.position_title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.location}
                          {c.remote_ok && " · リモート可"}
                          {c.has_stock_option && " · SO 付与"}
                          {c.english_required && " · 英語必須"}
                        </div>
                      </div>
                      <div className="text-right">
                        {c.comp_min_jpy && c.comp_max_jpy && (
                          <div className="text-sm font-mono font-bold tabular-nums">
                            {fmtJpy(c.comp_min_jpy)}〜{fmtJpy(c.comp_max_jpy)}
                          </div>
                        )}
                        <a href={c.source_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[11px] text-gc-700 hover:underline">
                          公開元 <ExternalLink className="size-2.5" />
                        </a>
                      </div>
                    </div>
                    <p className="text-[11px] italic text-muted-foreground">
                      🔍 {c.differentiator}
                    </p>
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">必須:</span>{" "}
                      {c.required_skills.map((s) => (
                        <span key={s} className="ml-1 inline-block rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{s}</span>
                      ))}
                    </div>
                    {c.nice_to_have.length > 0 && (
                      <div>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">歓迎:</span>{" "}
                        {c.nice_to_have.map((s) => (
                          <span key={s} className="ml-1 inline-block rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] text-amber-800">{s}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function CompPill({ label, value, sub, tone }: {
  label: string; value: string; sub?: string;
  tone?: "primary" | "success" | "warn";
}) {
  const cls =
    tone === "primary" ? "border-gc-300 bg-gc-50 text-gc-900" :
    tone === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" :
    tone === "warn"    ? "border-amber-300 bg-amber-50 text-amber-900" : "";
  return (
    <div className={cn("rounded-md border p-3", cls)}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-1 text-base font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] opacity-70">{sub}</div>}
    </div>
  );
}

function BenefitBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-mono font-bold tabular-nums">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn(
          "h-full",
          pct >= 70 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" :
          pct >= 40 ? "bg-gradient-to-r from-amber-400 to-amber-600" :
                      "bg-gradient-to-r from-gc-400 to-gc-600",
        )} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PresenceCell({ status }: { status: "must" | "nice" | "absent" }) {
  if (status === "must") return (
    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
      <CheckCircle2 className="size-2.5" /> 必須
    </span>
  );
  if (status === "nice") return (
    <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
      △ 歓迎
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
      <XCircle className="size-2.5" /> なし
    </span>
  );
}
