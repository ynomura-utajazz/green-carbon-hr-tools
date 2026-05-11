"use client";

/**
 * /diversity
 *
 * D&I（ダイバーシティ & インクルージョン）深掘り分析。
 *
 *  - 国籍 / 拠点 / 雇用形態 / グレード / 役職別の分布
 *  - 採用ファネルでのダイバーシティ流出（応募〜採用までの構成変化）
 *  - 役職別の外国籍比率・グレード分布（昇進機会の格差）
 *  - 報酬ペアリティ：ロール別・グレード別の年収レンジ重複度
 *
 * 注意：
 *  - デモデータには性別情報を持たない（採用バイアス除去のため）
 *  - 国籍・年齢・拠点でのみ可視化
 *  - 個人特定可能な少人数セグメントは「N <5」として匿名化
 */

import { useMemo } from "react";
import {
  Globe2, AlertTriangle, TrendingUp, Users2, Award, Heart,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DEMO_EMPLOYEES, OFFICES } from "@/lib/demo/employees";
import { DEMO_TALENT_PROFILES } from "@/lib/demo/talent-profiles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 個人特定回避のしきい値（5 名未満は匿名化）
const ANONYMIZE_THRESHOLD = 5;

type Distribution = { key: string; label: string; count: number; pct: number };

function distribute<T>(items: T[], keyOf: (i: T) => string, labelOf?: (k: string) => string): Distribution[] {
  const map = new Map<string, number>();
  for (const i of items) {
    const k = keyOf(i);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const total = items.length;
  return [...map.entries()]
    .map(([key, count]) => ({
      key,
      label: labelOf ? labelOf(key) : key,
      count,
      pct: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export default function DiversityPage() {
  const active = DEMO_EMPLOYEES.filter((e) => e.status === "active");
  const total = active.length;

  // 国籍分布
  const byNationality = useMemo(() =>
    distribute(active, (e) => e.nationality)
  , [active]);

  // 拠点分布
  const byLocation = useMemo(() =>
    distribute(active, (e) => e.office_location, (k) => {
      const o = OFFICES.find((x) => x.code === k);
      return o ? `${o.countryEmoji} ${o.country}・${o.city}` : k;
    })
  , [active]);

  // 雇用形態分布
  const byEmployment = useMemo(() =>
    distribute(active, (e) => e.employment_type, (k) => ({
      full_time: "正社員", part_time: "パート", contract: "契約",
      intern: "インターン", business_partner: "業務委託",
    }[k] ?? k))
  , [active]);

  // 役職別 外国籍比率（leadership ロール = manager / director / c-level）
  const leadershipMembers = useMemo(() =>
    active.filter((e) => /manager|head|director|chief|vp|cpo|coo|cto|chro|ceo|lead/i.test(e.job_title))
  , [active]);
  const leadershipForeignRatio = leadershipMembers.length > 0
    ? leadershipMembers.filter((e) => e.is_foreign_national).length / leadershipMembers.length
    : 0;
  const overallForeignRatio = active.filter((e) => e.is_foreign_national).length / total;

  // グレード別の外国籍比率（昇進機会の偏り検出）
  const byGradeForeignRatio = useMemo(() => {
    const grades = ["EX", "M4", "M3", "S5", "S4", "S3", "S2"]; // 高 → 低
    return grades.map((g) => {
      const at = active.filter((e) => e.job_grade === g);
      const foreign = at.filter((e) => e.is_foreign_national).length;
      return {
        grade: g,
        total: at.length,
        foreign,
        foreign_pct: at.length > 0 ? foreign / at.length : 0,
      };
    }).filter((r) => r.total > 0);
  }, [active]);

  // 採用ファネルでのダイバーシティ流出（demo: 簡易構築）
  // 応募 → 書類 → 面接 → 採用の各段で外国籍比率がどう変わるか
  // ここではダミーで段階的に減るように
  const funnelDiversity = [
    { stage: "応募",     total: 280, foreign: 96, foreign_pct: 0.343 },
    { stage: "書類通過", total: 140, foreign: 42, foreign_pct: 0.300 },
    { stage: "1次面接", total:  68, foreign: 22, foreign_pct: 0.324 },
    { stage: "最終面接", total:  32, foreign: 12, foreign_pct: 0.375 },
    { stage: "採用",     total:  14, foreign:  4, foreign_pct: 0.286 },
  ];

  // 9-box の外国籍 vs 日本籍比率（活躍機会の偏り）
  const profileMap = new Map(DEMO_TALENT_PROFILES.map((p) => [p.employee_id, p]));
  const highPerformers = active.filter((e) => profileMap.get(e.id)?.is_high_performer);
  const hpForeignRatio = highPerformers.length > 0
    ? highPerformers.filter((e) => e.is_foreign_national).length / highPerformers.length
    : 0;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Heart className="size-6 text-gc-700" />
          D&I 深掘り
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          国籍・拠点・グレード・採用ファネルで多様性を可視化。バイアスや昇進機会の格差を検出
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="総ヘッドカウント" value={total} unit="名" />
        <Kpi
          label="外国籍比率"
          value={`${(overallForeignRatio * 100).toFixed(0)}%`}
          unit=""
          tone="primary"
          hint={`${active.filter((e) => e.is_foreign_national).length} 名 / ${total} 名`}
        />
        <Kpi
          label="拠点数"
          value={byLocation.length}
          unit="ヶ国"
          tone="success"
        />
        <Kpi
          label="リーダー層 外国籍"
          value={`${(leadershipForeignRatio * 100).toFixed(0)}%`}
          unit=""
          tone={leadershipForeignRatio < overallForeignRatio - 0.1 ? "warn" : "success"}
          hint={`差: ${((leadershipForeignRatio - overallForeignRatio) * 100).toFixed(1)}pt`}
        />
      </div>

      {/* リーダー層の偏り警告 */}
      {leadershipForeignRatio < overallForeignRatio - 0.1 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="size-5 shrink-0 text-amber-700" />
            <div>
              <h3 className="font-semibold text-sm">リーダー層のダイバーシティ格差を検出</h3>
              <p className="mt-1 text-xs leading-relaxed">
                全体の外国籍比率は <strong>{(overallForeignRatio * 100).toFixed(0)}%</strong> ですが、
                リーダー層（マネージャー / Head / C-level）では <strong>{(leadershipForeignRatio * 100).toFixed(0)}%</strong> に留まっています。
                昇進機会の偏りや、海外メンバーへのキャリアパス提示の見直しを検討しましょう。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 国籍分布 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Globe2 className="size-4 text-gc-700" />
            国籍分布
          </h2>
          <DistributionList items={byNationality} />
        </CardContent>
      </Card>

      {/* 拠点分布 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Globe2 className="size-4 text-gc-700" />
            拠点分布
          </h2>
          <DistributionList items={byLocation} />
        </CardContent>
      </Card>

      {/* 雇用形態 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Users2 className="size-4 text-gc-700" />
            雇用形態分布
          </h2>
          <DistributionList items={byEmployment} />
        </CardContent>
      </Card>

      {/* グレード × 外国籍比率 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <Award className="size-4 text-gc-700" />
            グレード × 外国籍比率（高グレード → 低グレード）
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            高グレード（EX, M4, S5）で外国籍比率が低い場合、昇進機会の偏りの可能性
          </p>
          <ul className="space-y-2">
            {byGradeForeignRatio.map((r) => {
              const isAnon = r.total < ANONYMIZE_THRESHOLD;
              return (
                <li key={r.grade} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium font-mono">{r.grade}</span>
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <span className="text-muted-foreground">{r.total} 名</span>
                      {isAnon ? (
                        <span className="text-muted-foreground">N&lt;{ANONYMIZE_THRESHOLD}（匿名化）</span>
                      ) : (
                        <span className={cn(
                          "font-bold",
                          r.foreign_pct >= overallForeignRatio - 0.1
                            ? "text-emerald-700"
                            : "text-amber-700",
                        )}>
                          外国籍 {(r.foreign_pct * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {!isAnon && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full",
                          r.foreign_pct >= overallForeignRatio
                            ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                            : "bg-gradient-to-r from-amber-400 to-amber-600",
                        )}
                        style={{ width: `${r.foreign_pct * 100}%` }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* 採用ファネルでのダイバーシティ流出 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <TrendingUp className="size-4 text-gc-700" />
            採用ファネルにおけるダイバーシティ流出
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            応募〜採用の各段階で、外国籍比率がどう変化するか。下落するステージはバイアスのシグナル
          </p>
          <ul className="space-y-2">
            {funnelDiversity.map((s, i) => {
              const prev = i > 0 ? funnelDiversity[i - 1] : null;
              const delta = prev ? s.foreign_pct - prev.foreign_pct : 0;
              return (
                <li key={s.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{s.stage}</span>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="text-xs text-muted-foreground">{s.total} 名（外国籍 {s.foreign}）</span>
                      <span className="font-mono font-bold">
                        {(s.foreign_pct * 100).toFixed(1)}%
                      </span>
                      {prev && (
                        <span className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-mono tabular-nums",
                          delta >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
                        )}>
                          {delta > 0 ? "+" : ""}{(delta * 100).toFixed(1)}pt
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-purple-600"
                      style={{ width: `${s.foreign_pct * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 rounded-md border bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground">
            💡 <strong>書類通過</strong>段階で外国籍比率が大きく下がる場合 = 書類選考のバイアス。
            <strong>1 次面接</strong>段階の下落 = 言語要件・面接官のバイアス。
            <strong>採用</strong>での下落 = オファー条件のグローバル対応の弱さ。
          </div>
        </CardContent>
      </Card>

      {/* 活躍人材の構成 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Award className="size-4 text-gc-700" />
            活躍人材（9-box high_perf_*）の構成
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="活躍人材総数" value={highPerformers.length} unit="名" />
            <Stat label="うち外国籍" value={highPerformers.filter((e) => e.is_foreign_national).length} unit="名" />
            <Stat
              label="活躍人材 外国籍比率"
              value={`${(hpForeignRatio * 100).toFixed(0)}%`}
              unit=""
              tone={hpForeignRatio >= overallForeignRatio ? "success" : "warn"}
              hint={`全体比率 ${(overallForeignRatio * 100).toFixed(0)}% との差: ${((hpForeignRatio - overallForeignRatio) * 100).toFixed(1)}pt`}
            />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        🔒 <strong>プライバシー：</strong>
        本ダッシュボードでは性別情報は意図的に扱っていません（採用バイアス除去のため、自社では性別 / 年齢を選考プロセスに入れない方針）。
        国籍・拠点ベースの分析でも、N&lt;{ANONYMIZE_THRESHOLD} の少人数セグメントは個人特定回避のため匿名化しています。
      </div>
    </div>
  );
}

function DistributionList({ items }: { items: Distribution[] }) {
  return (
    <ul className="space-y-2">
      {items.map((d) => {
        const isAnon = d.count < ANONYMIZE_THRESHOLD;
        return (
          <li key={d.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{d.label}</span>
              <div className="flex items-center gap-3 tabular-nums">
                {isAnon ? (
                  <span className="text-xs text-muted-foreground">N&lt;{ANONYMIZE_THRESHOLD}</span>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">{d.count} 名</span>
                    <span className="font-mono font-bold">{(d.pct * 100).toFixed(1)}%</span>
                  </>
                )}
              </div>
            </div>
            {!isAnon && (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-gc-400 to-gc-600"
                  style={{ width: `${d.pct * 100}%` }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Kpi({ label, value, unit, tone, hint }: {
  label: string; value: string | number; unit: string;
  tone?: "primary" | "success" | "warn" | "danger";
  hint?: string;
}) {
  const cls = {
    primary: "border-gc-200 bg-gc-50/40",
    success: "border-emerald-200 bg-emerald-50/40",
    warn:    "border-amber-200 bg-amber-50/40",
    danger:  "border-red-200 bg-red-50/40",
  }[tone ?? "primary"];
  return (
    <Card className={cn(cls)}>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, unit, tone, hint }: {
  label: string; value: string | number; unit: string;
  tone?: "success" | "warn" | "danger";
  hint?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-0.5 font-mono text-xl font-bold tabular-nums",
        tone === "success" && "text-emerald-700",
        tone === "warn" && "text-amber-700",
        tone === "danger" && "text-red-700",
      )}>
        {value}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{unit}</span>
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
