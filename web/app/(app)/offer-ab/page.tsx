"use client";

/**
 * /offer-ab
 *
 * オファーレター A/B テスト管理 + 結果分析。
 *  - バリアント一覧（hook/pitch/cta + 受諾率）
 *  - 統計的有意性（z-test）
 *  - 勝者推奨
 *  - AI で次バリアント案を生成（既存 /api/ai/jd-generator を流用）
 */

import { useMemo, useState } from "react";
import { FlaskConical, Trophy, AlertCircle, Sparkles, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEMO_OFFER_VARIANTS, computeVariantStats, isSignificant, type OfferVariant } from "@/lib/demo/offer-ab";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function OfferAbPage() {
  const [variants, setVariants] = useState<OfferVariant[]>(DEMO_OFFER_VARIANTS);

  const stats = useMemo(() => variants.map(computeVariantStats), [variants]);
  const active = stats.filter((s) => s.variant.active);

  // 勝者判定（最高 hire_rate のアクティブバリアント）
  const winner = active.length >= 2
    ? [...active].sort((a, b) => b.hire_rate - a.hire_rate)[0]
    : null;
  const runnerUp = active.length >= 2
    ? [...active].sort((a, b) => b.hire_rate - a.hire_rate)[1]
    : null;
  const significance = winner && runnerUp
    ? isSignificant(winner.variant, runnerUp.variant)
    : null;

  const totalSent = stats.reduce((s, v) => s + v.variant.sent_count, 0);
  const totalAccepted = stats.reduce((s, v) => s + v.variant.accepted_count, 0);
  const overallRate = totalSent > 0 ? totalAccepted / totalSent : 0;

  const toggleActive = (id: string) => {
    setVariants(variants.map((v) => v.id === id ? { ...v, active: !v.active } : v));
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FlaskConical className="size-6 text-gc-700" />
          オファーレター A/B テスト
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          複数バリアントを並行配信して受諾率（accept rate）を改善。統計的有意性つきで勝者判定
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="アクティブ" value={active.length} unit="本" tone="primary" />
        <Kpi label="累計送付" value={totalSent} unit="件" />
        <Kpi label="累計受諾" value={totalAccepted} unit="件" tone="success" />
        <Kpi
          label="全体 受諾率"
          value={`${(overallRate * 100).toFixed(0)}%`}
          unit=""
          tone={overallRate >= 0.7 ? "success" : overallRate >= 0.5 ? "warn" : "danger"}
        />
      </div>

      {/* 勝者バナー */}
      {winner && runnerUp && significance && (
        <Card className={cn(
          "border-2",
          significance.significant ? "border-emerald-300 bg-emerald-50/50" : "border-amber-300 bg-amber-50/50",
        )}>
          <CardContent className="flex items-start gap-3 p-4">
            <Trophy className={cn(
              "size-8 shrink-0",
              significance.significant ? "text-emerald-600" : "text-amber-600",
            )} />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold">
                現時点の勝者：{winner.variant.name}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                受諾率 <strong className="font-mono">{(winner.hire_rate * 100).toFixed(0)}%</strong>
                （次点 {runnerUp.variant.name}: {(runnerUp.hire_rate * 100).toFixed(0)}%）
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <Badge variant={significance.significant ? "success" : "warning"} className="text-[10px]">
                  z = {significance.z}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  有意性: {significance.p_value_estimate}
                </Badge>
                {significance.significant ? (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    ✅ 統計的に有意
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    ⚠️ 有意水準に未到達 — もう少し送付サンプルが必要
                  </span>
                )}
              </div>
              {significance.significant && (
                <p className="mt-2 text-xs">
                  💡 <strong>推奨アクション：</strong>
                  劣位バリアントを停止し、勝者を全件配信。次の改善案として
                  「{winner.variant.key_angle}」をベースに新バリアントを派生させる。
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* バリアント一覧 */}
      <div className="grid gap-3 lg:grid-cols-2">
        {stats.map((s) => (
          <VariantCard
            key={s.variant.id}
            stats={s}
            isWinner={winner?.variant.id === s.variant.id && significance?.significant}
            onToggle={() => toggleActive(s.variant.id)}
          />
        ))}
      </div>

      {/* 推奨アクション */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-3.5 text-gc-700" />
            次のテスト案
          </h3>
          <ul className="space-y-1.5 text-xs leading-relaxed">
            <li className="flex items-start gap-2 rounded-md border bg-muted/30 p-2">
              <span className="text-base">🎯</span>
              <span>
                <strong>Variant E（仮）：</strong>「物語型」と「スピード強調」のハイブリッド。
                勝者 Variant B の hook + 速さの CTA を組み合わせる。
              </span>
            </li>
            <li className="flex items-start gap-2 rounded-md border bg-muted/30 p-2">
              <span className="text-base">📅</span>
              <span>
                <strong>送付タイミング A/B：</strong>金曜午後 vs 月曜朝。週末で考えてもらう vs 即決を狙う。
              </span>
            </li>
            <li className="flex items-start gap-2 rounded-md border bg-muted/30 p-2">
              <span className="text-base">🌐</span>
              <span>
                <strong>ロール別 A/B：</strong>シニア層と若手で異なる訴求軸が効くか検証
                （シニア = ストックオプション・裁量、若手 = 学習機会・メンター）。
              </span>
            </li>
          </ul>
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-2 text-[11px] text-blue-900">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              バリアント追加時は <strong>JD 生成 AI</strong>（/recruiting-branding）の system prompt を流用すれば、
              トーン違いの草案を素早く作成できます。
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VariantCard({
  stats: s, isWinner, onToggle,
}: {
  stats: ReturnType<typeof computeVariantStats>;
  isWinner: boolean | undefined;
  onToggle: () => void;
}) {
  const v = s.variant;
  return (
    <Card className={cn(
      isWinner && "border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200",
      !v.active && "opacity-60",
    )}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold">{v.name}</h3>
              {isWinner && <Trophy className="size-3.5 text-emerald-600" />}
              {!v.active && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">停止中</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{v.key_angle}</p>
          </div>
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
            aria-label={v.active ? "停止" : "再開"}
          >
            {v.active ? <ToggleRight className="size-6 text-emerald-600" /> : <ToggleLeft className="size-6" />}
          </button>
        </div>

        {/* メトリクス */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="送付" value={v.sent_count} unit="件" />
          <Stat label="受諾率" value={`${(s.hire_rate * 100).toFixed(0)}%`} unit="" tone={
            s.hire_rate >= 0.75 ? "success" : s.hire_rate >= 0.55 ? "warn" : "danger"
          } />
          <Stat label="平均応答" value={v.avg_response_days.toFixed(1)} unit="日" />
        </div>

        {/* バー */}
        <div className="space-y-1">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-emerald-500" style={{ width: `${(v.accepted_count / Math.max(1, v.sent_count)) * 100}%` }} />
            <div className="bg-red-400" style={{ width: `${(v.declined_count / Math.max(1, v.sent_count)) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>受諾 {v.accepted_count}</span>
            <span>辞退 {v.declined_count}</span>
            <span>未回答 {v.sent_count - v.accepted_count - v.declined_count}</span>
          </div>
        </div>

        {/* プレビュー */}
        <details className="rounded-md border bg-card text-xs">
          <summary className="cursor-pointer p-2 font-medium hover:bg-muted/30">
            メッセージプレビュー
          </summary>
          <div className="space-y-2 border-t p-2 leading-relaxed">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hook</div>
              <p>{v.hook}</p>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pitch</div>
              <p>{v.pitch}</p>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">CTA</div>
              <p>{v.cta}</p>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value, unit, tone }: {
  label: string; value: string | number; unit: string;
  tone?: "primary" | "success" | "warn" | "danger";
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
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, unit, tone }: {
  label: string; value: string | number; unit: string;
  tone?: "success" | "warn" | "danger";
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn(
        "font-mono text-base font-bold tabular-nums",
        tone === "success" && "text-emerald-700",
        tone === "warn" && "text-amber-700",
        tone === "danger" && "text-red-700",
      )}>
        {value}<span className="text-[10px] font-normal text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
