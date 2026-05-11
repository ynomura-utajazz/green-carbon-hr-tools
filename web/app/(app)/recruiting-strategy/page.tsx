"use client";

/**
 * /recruiting-strategy
 *
 * 戦略採用：未来の組織に必要な人材をリコメンド。
 *
 * 構成：
 *  1. 戦略ギャップ一覧（DEMO_STRATEGIC_GAPS）
 *  2. 「事業優先順位」入力 → AI による 12 ヶ月の採用戦略生成
 *  3. 各ギャップに対する詳細プラン（クリックで JD 生成導線）
 */

import { useState } from "react";
import Link from "next/link";
import {
  Target, AlertTriangle, Calendar, ArrowRight, Sparkles, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiGeneratePanel } from "@/components/ai-generate-panel";
import { DEMO_STRATEGIC_GAPS } from "@/lib/demo/talent-profiles";
import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS } from "@/lib/demo/employees";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SEVERITY_META = {
  high: { tone: "danger" as const,  label: "高",   color: "border-red-300 bg-red-50/50" },
  med:  { tone: "warning" as const, label: "中",   color: "border-amber-300 bg-amber-50/50" },
  low:  { tone: "outline" as const, label: "低",   color: "border-border bg-muted/30" },
};

export default function RecruitingStrategyPage() {
  const [priorities, setPriorities] = useState(
    "2026年度の 3 軸：(1) ASEAN 事業の自律化（インドネシア・ベトナム拠点の単独運営）、(2) AI/ML での Carbon 計算精度強化、(3) IPO 準備フェーズへの移行",
  );

  const totalCount = DEMO_EMPLOYEES.filter((e) => e.status === "active").length;
  const orgSummary = `総ヘッドカウント ${totalCount} 名、正社員比率 87%、外国籍 28%。技術 ${
    DEMO_EMPLOYEES.filter((e) => e.department_id === "d-eng").length
  } 名（うち海外 ${DEMO_EMPLOYEES.filter((e) => e.department_id === "d-eng" && e.is_foreign_national).length} 名）。
最大の単一障害点は技術部門の VPoE 1 名依存。ML 経験者ゼロ、ASEAN 営業も COO 1 名依存。`;

  const gapsSummary = DEMO_STRATEGIC_GAPS
    .map((g) => `[${g.severity.toUpperCase()}] ${g.area}: ${g.recommended_role}（${g.needed_count}名、〜${g.target_by}）— ${g.rationale}`)
    .join("\n");

  return (
    <div className="space-y-5">
      {/* ヘッダ */}
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Target className="size-6 text-gc-700" />
          戦略採用
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          事業計画 × 現組織のスキル分布から、未来の組織に必要な人材を可視化・リコメンド
        </p>
      </div>

      {/* AI 採用戦略立案 */}
      <AiGeneratePanel
        title="AI 採用戦略立案"
        endpoint="/api/ai/hiring-strategy"
        hint="事業優先順位を入力して、向こう 12 ヶ月の採用戦略を生成します"
        buttonLabel="採用戦略を生成"
        payload={() => ({
          business_priorities: priorities,
          current_org_summary: orgSummary,
          known_gaps: gapsSummary,
        })}
      />

      {/* 事業優先度入力 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold">事業優先順位（AI へのインプット）</h3>
          <textarea
            value={priorities}
            onChange={(e) => setPriorities(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gc-400"
            placeholder="例: 2026年度の重点投資領域、組織サイズ目標、IPO 計画など"
          />
        </CardContent>
      </Card>

      {/* 戦略ギャップ */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="size-4 text-amber-700" />
          検出された戦略ギャップ
          <span className="font-normal text-xs text-muted-foreground">
            — 事業計画から逆算した必要人材
          </span>
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {DEMO_STRATEGIC_GAPS.map((g) => (
            <Card key={g.area} className={cn("border-l-4", SEVERITY_META[g.severity].color)}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold">{g.area}</h3>
                      <Badge variant={SEVERITY_META[g.severity].tone} className="text-[10px]">
                        {SEVERITY_META[g.severity].label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {g.rationale}
                    </p>
                  </div>
                </div>

                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    推奨ロール
                  </div>
                  <div className="mt-0.5 font-medium text-sm">
                    {g.recommended_role}
                    <span className="ml-2 text-xs text-muted-foreground">× {g.needed_count} 名</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {g.required_skills.map((s) => (
                      <span key={s} className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="size-3" />
                    必要時期: {g.target_by}
                  </span>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                  >
                    <Link
                      href={`/recruiting-branding?role=${encodeURIComponent(g.recommended_role)}&skills=${encodeURIComponent(g.required_skills.join(","))}`}
                    >
                      <FileText className="size-3" />
                      JD を作る
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 現組織サマリ */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-3.5 text-gc-700" />
            現組織サマリ（AI へのインプット用）
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="総ヘッドカウント" value={`${totalCount}名`} />
            <Stat label="部門数" value={`${DEMO_DEPARTMENTS.length}`} />
            <Stat label="最大部門" value="技術" />
            <Stat label="単一障害点" value="VPoE / COO" tone="warning" />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-line">
            {orgSummary}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className={cn("rounded-md border bg-card p-2", tone === "warning" && "border-amber-300 bg-amber-50/40")}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-lg font-bold tabular-nums", tone === "warning" && "text-amber-800")}>
        {value}
      </div>
    </div>
  );
}
