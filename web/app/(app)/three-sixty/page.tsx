"use client";

/**
 * /three-sixty
 *
 * 360° 評価ダッシュボード。
 *  - サイクル選択
 *  - 対象者選択
 *  - 4 視点（本人 / マネージャー / 同僚 / 部下）の集約レーダー
 *  - Self vs Others のギャップ分析（blind spot 検出）
 *  - コンピテンシー別の 4 視点比較
 */

import { useMemo, useState } from "react";
import {
  Compass, AlertTriangle, ArrowDown, ArrowUp, Sparkles, Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DEMO_360_CYCLES, DEMO_360_RESPONSES, COMPETENCY_LABELS, RATER_ROLE_META,
  aggregateByRole, selfVsOthers,
  type Competency, type RaterRole,
} from "@/lib/demo/three-sixty";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SIGNAL_META = {
  blind_spot: { label: "ブラインドスポット", emoji: "👁️", cls: "border-red-300 bg-red-50 text-red-800",
                desc: "自己評価が他者評価より大幅に高い。気づいていない弱点の可能性" },
  aligned:    { label: "整合",              emoji: "✅", cls: "border-emerald-300 bg-emerald-50 text-emerald-800",
                desc: "自己評価と他者評価が一致。健全な自己認識" },
  humble:     { label: "謙虚（過小評価）",   emoji: "🌱", cls: "border-blue-300 bg-blue-50 text-blue-800",
                desc: "他者評価が自己評価より高い。自信を持って良い領域" },
} as const;

export default function ThreeSixtyPage() {
  const [cycleId, setCycleId] = useState(DEMO_360_CYCLES[0]?.id ?? "");
  const cycle = DEMO_360_CYCLES.find((c) => c.id === cycleId);
  const subjects = cycle?.subject_ids ?? [];
  const [subjectId, setSubjectId] = useState(subjects[0] ?? "");
  const subject = DEMO_EMPLOYEES.find((e) => e.id === subjectId);

  const responses = useMemo(
    () => DEMO_360_RESPONSES.filter((r) => r.cycle_id === cycleId && r.subject_id === subjectId),
    [cycleId, subjectId],
  );
  const aggregated = useMemo(() => aggregateByRole(responses), [responses]);
  const gaps = useMemo(() => selfVsOthers(aggregated), [aggregated]);

  const responseCounts = useMemo(() => {
    const counts: Record<RaterRole, number> = { self: 0, manager: 0, peer: 0, report: 0 };
    for (const r of responses) counts[r.rater_role] += 1;
    return counts;
  }, [responses]);

  // 強み・改善点コメント（匿名フィードバックは集約せず、本人・マネージャーの顕名コメントのみ）
  const namedComments = responses.filter((r) => !r.anonymized && (r.strengths || r.improvements));

  // 競合視点ごとの平均（competency 全体 → 円形メーター用）
  const overallByRole: Record<RaterRole, number> = useMemo(() => {
    const result: Record<RaterRole, number> = { self: 0, manager: 0, peer: 0, report: 0 };
    for (const role of ["self", "manager", "peer", "report"] as RaterRole[]) {
      const vals = Object.values(aggregated[role]).filter((v): v is number => typeof v === "number");
      result[role] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    }
    return result;
  }, [aggregated]);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Compass className="size-6 text-gc-700" />
          360° 評価
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          本人・マネージャー・同僚・部下の 4 視点で多面的に強み弱みを可視化。Self vs Others ギャップで気づきを促す
        </p>
      </div>

      {/* サイクル + 対象者選択 */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              評価サイクル
            </span>
            <Select value={cycleId} onValueChange={(v) => { setCycleId(v); const c = DEMO_360_CYCLES.find(x => x.id === v); if (c) setSubjectId(c.subject_ids[0] ?? ""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEMO_360_CYCLES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}（{c.status === "open" ? "実施中" : c.status === "calibrated" ? "完了" : c.status}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              評価対象者
            </span>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {subjects.map((sid) => {
                  const e = DEMO_EMPLOYEES.find((x) => x.id === sid);
                  return e ? (
                    <SelectItem key={sid} value={sid}>{e.full_name}（{e.job_title}）</SelectItem>
                  ) : null;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border bg-muted/30 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">回収状況</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm font-mono tabular-nums">
              {(["self", "manager", "peer", "report"] as RaterRole[]).map((r) => (
                <span key={r} className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  RATER_ROLE_META[r].cls,
                )}>
                  {RATER_ROLE_META[r].icon} {responseCounts[r]}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {subject && (
        <>
          {/* 対象者ヘッダ */}
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Avatar className="size-12">
                <AvatarFallback>{initials(subject.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold">{subject.full_name}</div>
                <div className="text-xs text-muted-foreground">{subject.job_title}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">総合スコア（他者平均）</div>
                <div className="font-mono text-3xl font-bold tabular-nums">
                  {((overallByRole.manager + overallByRole.peer + overallByRole.report) / 3).toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground">/ 5</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4 視点別 オーバーオール */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["self", "manager", "peer", "report"] as RaterRole[]).map((r) => {
              const v = overallByRole[r];
              return (
                <Card key={r}>
                  <CardContent className="p-3">
                    <div className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      RATER_ROLE_META[r].cls,
                    )}>
                      {RATER_ROLE_META[r].icon} {RATER_ROLE_META[r].label}
                    </div>
                    <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
                      {v > 0 ? v.toFixed(1) : "—"}
                      <span className="ml-0.5 text-xs font-normal text-muted-foreground">/ 5</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-gradient-to-r from-gc-400 to-gc-600" style={{ width: `${(v / 5) * 100}%` }} />
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{responseCounts[r]} 件回答</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* コンピテンシー別 4 視点比較 */}
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Eye className="size-4 text-gc-700" />
                コンピテンシー別 4 視点比較
              </h2>
              <ul className="space-y-3">
                {(Object.keys(COMPETENCY_LABELS) as Competency[]).map((c) => (
                  <li key={c} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{COMPETENCY_LABELS[c]}</span>
                      <div className="flex gap-1.5 text-[11px] tabular-nums">
                        {(["self", "manager", "peer", "report"] as RaterRole[]).map((r) => {
                          const v = aggregated[r][c];
                          if (v === undefined) return (
                            <span key={r} className="text-muted-foreground/40">—</span>
                          );
                          return (
                            <span key={r} className={cn(
                              "rounded px-1.5 py-0.5 font-mono",
                              RATER_ROLE_META[r].cls,
                            )} title={RATER_ROLE_META[r].label}>
                              {RATER_ROLE_META[r].icon} {v.toFixed(1)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    {/* 4 本のミニバー */}
                    <div className="grid grid-cols-4 gap-1">
                      {(["self", "manager", "peer", "report"] as RaterRole[]).map((r) => {
                        const v = aggregated[r][c] ?? 0;
                        return (
                          <div key={r} className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-gradient-to-r from-gc-400 to-gc-600" style={{ width: `${(v / 5) * 100}%` }} />
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Self vs Others ギャップ */}
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                <AlertTriangle className="size-4 text-gc-700" />
                Self vs Others ギャップ分析
              </h2>
              <p className="mb-3 text-[11px] text-muted-foreground">
                ブラインドスポット（気づいていない弱点）と謙虚（過小評価）を検出
              </p>
              <ul className="space-y-2">
                {gaps.filter((g) => g.self > 0).map((g) => {
                  const meta = SIGNAL_META[g.signal];
                  return (
                    <li key={g.competency} className={cn(
                      "rounded-md border p-2.5 text-sm",
                      g.signal === "blind_spot" ? "border-red-200 bg-red-50/40" :
                      g.signal === "humble"     ? "border-blue-200 bg-blue-50/40" :
                                                  "border-border",
                    )}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{COMPETENCY_LABELS[g.competency]}</span>
                        <div className="flex items-center gap-2 text-xs tabular-nums">
                          <span>本人 {g.self.toFixed(1)}</span>
                          <span className="text-muted-foreground">vs</span>
                          <span>他者 {g.others_avg.toFixed(1)}</span>
                          <Badge variant="outline" className={cn("border text-[10px]", meta.cls)}>
                            {meta.emoji} {meta.label}
                          </Badge>
                          <span className={cn(
                            "inline-flex items-center font-bold",
                            g.gap > 0 ? "text-red-700" : g.gap < 0 ? "text-blue-700" : "text-muted-foreground",
                          )}>
                            {g.gap > 0 ? <ArrowUp className="size-3" /> : g.gap < 0 ? <ArrowDown className="size-3" /> : null}
                            {g.gap > 0 ? "+" : ""}{g.gap.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{meta.desc}</p>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* 顕名コメント */}
          {namedComments.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="size-4 text-gc-700" />
                  自己 + マネージャーのコメント
                </h2>
                <ul className="space-y-3">
                  {namedComments.map((r) => {
                    const rater = DEMO_EMPLOYEES.find((e) => e.id === r.rater_id);
                    return (
                      <li key={r.id} className="rounded-md border p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(rater?.full_name ?? "")}</AvatarFallback></Avatar>
                          <div className="text-sm">
                            <span className="font-medium">{rater?.full_name ?? r.rater_id}</span>
                            <Badge variant="outline" className={cn("ml-2 border text-[10px]", RATER_ROLE_META[r.rater_role].cls)}>
                              {RATER_ROLE_META[r.rater_role].icon} {RATER_ROLE_META[r.rater_role].label}
                            </Badge>
                          </div>
                        </div>
                        {r.strengths && (
                          <div className="mt-1 rounded-md bg-emerald-50/50 p-2 text-xs">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">強み</div>
                            <p className="mt-0.5 leading-relaxed">{r.strengths}</p>
                          </div>
                        )}
                        {r.improvements && (
                          <div className="mt-1 rounded-md bg-amber-50/50 p-2 text-xs">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">改善余地</div>
                            <p className="mt-0.5 leading-relaxed">{r.improvements}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            🔒 同僚・部下のフィードバックは <strong>匿名化</strong> で集約スコアのみ表示。
            個別コメントは「本人」「マネージャー」のみ顕名で表示します。
          </div>
        </>
      )}
    </div>
  );
}
