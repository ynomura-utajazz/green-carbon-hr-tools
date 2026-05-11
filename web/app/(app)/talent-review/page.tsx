"use client";

/**
 * /talent-review
 *
 * タレントレビュー & サクセション計画。
 *  - 9-box matrix（performance × potential）
 *  - 各セルに該当社員アバターを並べる
 *  - キーポジション × 後継候補テーブル
 *  - 空席リスク高 / flight risk 高をハイライト
 */

import { useMemo, useState } from "react";
import { Crown, Target, AlertTriangle, Users2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_TALENT_REVIEW, DEMO_KEY_POSITIONS, NINE_BOX_LABEL, READINESS_LABEL,
  nineBoxCell, type Performance, type Potential, type NineBoxCell, type TalentReviewEntry,
} from "@/lib/demo/talent-review";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PERF: Performance[] = ["high", "med", "low"];
const POT: Potential[]  = ["low", "med", "high"]; // 横軸：左→右で potential が上がる

export default function TalentReviewPage() {
  const [selected, setSelected] = useState<TalentReviewEntry | null>(null);

  const cells = useMemo(() => {
    const map = new Map<NineBoxCell, TalentReviewEntry[]>();
    for (const t of DEMO_TALENT_REVIEW) {
      const k = nineBoxCell(t.performance, t.potential);
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    }
    return map;
  }, []);

  const flightRisks = DEMO_TALENT_REVIEW
    .filter((t) => t.flight_risk >= 4)
    .sort((a, b) => b.flight_risk - a.flight_risk);
  const noSuccessor = DEMO_KEY_POSITIONS.filter((k) => k.successors.length === 0);
  const totalReviewed = DEMO_TALENT_REVIEW.length;
  const stars = DEMO_TALENT_REVIEW.filter(
    (t) => t.performance === "high" && t.potential === "high"
  ).length;

  const empById = (id: string) => DEMO_EMPLOYEES.find((e) => e.id === id);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Crown className="size-6 text-gc-700" />
          タレントレビュー & サクセション
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          9-box でパフォーマンス × ポテンシャルを可視化、キーポジションごとの後継候補を一元管理
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="レビュー対象者" value={totalReviewed} unit="名" />
        <Kpi label="⭐ Stars" value={stars} unit="名" tone="success" />
        <Kpi label="Flight Risk 高" value={flightRisks.length} unit="名" tone={flightRisks.length > 0 ? "warn" : "muted"} />
        <Kpi label="後継不在ポジション" value={noSuccessor.length} unit="件" tone={noSuccessor.length > 0 ? "danger" : "success"} />
      </div>

      {/* Flight Risk 警告 */}
      {flightRisks.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="size-5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm">Flight Risk が高いキープレイヤー</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {flightRisks.map((t) => {
                  const e = empById(t.employee_id);
                  if (!e) return null;
                  return (
                    <li key={t.employee_id} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-2 py-1 text-xs">
                      <Avatar className="size-5">
                        <AvatarFallback className="text-[8px]">{initials(e.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{e.full_name}</span>
                      <span className="font-mono text-[10px] text-amber-700">risk {t.flight_risk}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 9-box matrix */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Target className="size-4 text-gc-700" />
            9-box マトリクス
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            縦軸：パフォーマンス（実績）／ 横軸：ポテンシャル（成長余地・将来期待）
          </p>
          <div className="overflow-x-auto">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="w-32 p-2 text-[10px] uppercase tracking-wider text-muted-foreground"></th>
                  {POT.map((p) => (
                    <th key={p} className="p-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
                      Potential {p === "high" ? "高" : p === "med" ? "中" : "低"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERF.map((perf) => (
                  <tr key={perf}>
                    <td className="p-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground -rotate-90 sm:rotate-0 sm:text-left whitespace-nowrap">
                      Performance {perf === "high" ? "高" : perf === "med" ? "中" : "低"}
                    </td>
                    {POT.map((pot) => {
                      const cellKey = nineBoxCell(perf, pot);
                      const meta = NINE_BOX_LABEL[cellKey];
                      const entries = cells.get(cellKey) ?? [];
                      return (
                        <td key={pot} className="border p-2 align-top" style={{ minWidth: 200 }}>
                          <div className={cn(
                            "rounded-md border p-2",
                            meta.cls,
                          )}>
                            <div className="text-[10px] font-bold uppercase tracking-wider">
                              {meta.emoji} {meta.label}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {entries.map((t) => {
                                const e = empById(t.employee_id);
                                if (!e) return null;
                                return (
                                  <button
                                    key={t.employee_id}
                                    onClick={() => setSelected(t)}
                                    className="group inline-flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] hover:bg-white"
                                    title={`${e.full_name}（${e.job_title}）`}
                                  >
                                    <Avatar className="size-4">
                                      <AvatarFallback className="text-[7px]">{initials(e.full_name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="truncate max-w-[80px]">{e.full_name}</span>
                                    {t.flight_risk >= 4 && <span title="Flight risk 高" className="text-amber-700">⚠</span>}
                                  </button>
                                );
                              })}
                              {entries.length === 0 && (
                                <span className="text-[11px] text-muted-foreground/60">—</span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 選択時の詳細 */}
      {selected && empById(selected.employee_id) && (
        <Card className="border-gc-300 bg-gc-50/40">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start gap-3">
              <Avatar className="size-12">
                <AvatarFallback>{initials(empById(selected.employee_id)!.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold">{empById(selected.employee_id)!.full_name}</div>
                <div className="text-xs text-muted-foreground">{empById(selected.employee_id)!.job_title}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                閉じる
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Mini label="9-box" value={`${NINE_BOX_LABEL[nineBoxCell(selected.performance, selected.potential)].emoji} ${NINE_BOX_LABEL[nineBoxCell(selected.performance, selected.potential)].label}`} />
              <Mini label="次のロール準備" value={
                selected.ready_for_next === "now" ? "今すぐ" :
                selected.ready_for_next === "1y"  ? "1 年以内" :
                selected.ready_for_next === "2y"  ? "2 年" : "3 年+"
              } />
              <Mini label="Flight Risk" value={`${selected.flight_risk} / 5`} tone={selected.flight_risk >= 4 ? "warn" : undefined} />
              <Mini label="Retirement Risk" value={selected.retirement_risk ? "あり" : "—"} />
            </div>
            {selected.notes && (
              <p className="rounded-md border bg-white p-2 text-xs leading-relaxed">
                💬 {selected.notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* キーポジション × 後継候補 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Users2 className="size-4 text-gc-700" />
            キーポジション × 後継候補
          </h2>
          <ul className="space-y-3">
            {DEMO_KEY_POSITIONS.map((kp) => {
              const incumbent = empById(kp.incumbent_id);
              return (
                <li key={kp.id} className={cn(
                  "rounded-md border p-3",
                  kp.successors.length === 0 ? "border-red-300 bg-red-50/30" :
                  kp.vacancy_risk === "high"  ? "border-amber-300 bg-amber-50/30" :
                                                "",
                )}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono">{Array.from({ length: kp.criticality }).map(() => "★").join("")}</span>
                    <span className="font-semibold">{kp.title}</span>
                    <Badge variant={
                      kp.vacancy_risk === "high" ? "danger" :
                      kp.vacancy_risk === "med"  ? "warning" : "outline"
                    } className="text-[10px]">
                      空席リスク {kp.vacancy_risk === "high" ? "高" : kp.vacancy_risk === "med" ? "中" : "低"}
                    </Badge>
                    {incumbent && (
                      <span className="ml-auto inline-flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">現任:</span>
                        <Avatar className="size-5">
                          <AvatarFallback className="text-[8px]">{initials(incumbent.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{incumbent.full_name}</span>
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">後継候補：</span>
                    {kp.successors.length === 0 ? (
                      <span className="text-xs text-red-700">⚠️ 後継者不在 — 早急に育成・採用計画を</span>
                    ) : (
                      <ul className="flex flex-wrap gap-1.5">
                        {kp.successors.map((s) => {
                          const e = empById(s.employee_id);
                          if (!e) return null;
                          return (
                            <li key={s.employee_id} className="inline-flex items-center gap-1 rounded-md border bg-white px-1.5 py-0.5 text-[11px]"
                              title={s.note}>
                              <Avatar className="size-4">
                                <AvatarFallback className="text-[7px]">{initials(e.full_name)}</AvatarFallback>
                              </Avatar>
                              <span>{e.full_name}</span>
                              <ArrowRight className="size-2.5 text-muted-foreground" />
                              <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", READINESS_LABEL[s.readiness].cls)}>
                                {READINESS_LABEL[s.readiness].label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  {kp.successors.some((s) => s.note) && (
                    <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                      {kp.successors.filter((s) => s.note).map((s) => {
                        const e = empById(s.employee_id);
                        return (
                          <li key={`note-${s.employee_id}`}>
                            <strong>{e?.full_name}</strong>: {s.note}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, unit, tone }: {
  label: string; value: string | number; unit: string;
  tone?: "primary" | "success" | "warn" | "danger" | "muted";
}) {
  const cls = {
    primary: "border-gc-200 bg-gc-50/40",
    success: "border-emerald-200 bg-emerald-50/40",
    warn:    "border-amber-200 bg-amber-50/40",
    danger:  "border-red-200 bg-red-50/40",
    muted:   "",
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

function Mini({ label, value, tone }: {
  label: string; value: string;
  tone?: "warn";
}) {
  return (
    <div className={cn(
      "rounded-md border bg-white p-2",
      tone === "warn" && "border-amber-300 bg-amber-50/40",
    )}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-xs font-medium", tone === "warn" && "text-amber-800")}>{value}</div>
    </div>
  );
}
