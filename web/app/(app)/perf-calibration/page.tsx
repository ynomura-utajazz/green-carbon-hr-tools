"use client";

/**
 * /perf-calibration
 *
 * 評価キャリブレーション（OKR 達成度 × 360° 評価）。
 *
 *  - X軸：OKR 達成度（0-1.5）
 *  - Y軸：360° 他者評価平均（1-5）
 *  - 散布図で社員をプロット → 4 象限分析
 *    - 高 OKR + 高 360°: スター（昇進候補）
 *    - 高 OKR + 低 360°: 単独成果型（マネジメント要鍛錬）
 *    - 低 OKR + 高 360°: チーム貢献型（個人成果サポート）
 *    - 低 OKR + 低 360°: 改善必要
 */

import { useMemo } from "react";
import { Scale, Target, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DEMO_360_RESPONSES, aggregateByRole } from "@/lib/demo/three-sixty";
import { DEMO_TALENT_REVIEW } from "@/lib/demo/talent-review";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CalibrationPoint = {
  employee_id: string;
  full_name: string;
  job_title: string;
  /** OKR 達成度（0-1.5） */
  okr_score: number;
  /** 360° 他者平均（1-5） */
  threesixty_score: number;
  flight_risk: number;
};

const QUADRANT_META = {
  star:        { label: "⭐ Stars",      cls: "border-emerald-300 bg-emerald-50",  desc: "昇進候補。OKR と協働力の両軸で高評価" },
  ic_high:     { label: "🎯 単独成果型",  cls: "border-amber-300 bg-amber-50",       desc: "OKR は達成。協働 / コミュニケーション要鍛錬" },
  collab_high: { label: "🤝 チーム貢献型", cls: "border-blue-300 bg-blue-50",        desc: "他者評価高。個人成果のサポートが必要" },
  needs_help:  { label: "🔄 改善必要",    cls: "border-red-300 bg-red-50",            desc: "両軸で低い。マネージャーと根本要因を探る" },
} as const;

// OKR 達成度のデモデータ（事前生成）
const DEMO_OKR_SCORE: Record<string, number> = {
  e1: 0.95, e2: 0.85, e3: 1.10, e4: 1.05, e5: 0.75,
  e6: 0.70, e7: 0.78, e8: 1.20, e9: 1.05, e10: 0.95,
  e11: 0.85, e12: 1.00, e13: 0.65, e14: 1.15, e15: 0.90,
};

const X_THRESHOLD = 0.9;  // OKR の 4 象限境界
const Y_THRESHOLD = 3.7;  // 360° の 4 象限境界

function quadrantOf(p: CalibrationPoint): keyof typeof QUADRANT_META {
  if (p.okr_score >= X_THRESHOLD && p.threesixty_score >= Y_THRESHOLD) return "star";
  if (p.okr_score >= X_THRESHOLD && p.threesixty_score <  Y_THRESHOLD) return "ic_high";
  if (p.okr_score <  X_THRESHOLD && p.threesixty_score >= Y_THRESHOLD) return "collab_high";
  return "needs_help";
}

export default function PerfCalibrationPage() {
  const points: CalibrationPoint[] = useMemo(() => {
    const result: CalibrationPoint[] = [];
    for (const tr of DEMO_TALENT_REVIEW) {
      const e = DEMO_EMPLOYEES.find((x) => x.id === tr.employee_id);
      if (!e) continue;

      // 360° は対象が e8 のみだが、demo として全員に擬似的に与える
      const responses = DEMO_360_RESPONSES.filter((r) => r.subject_id === tr.employee_id);
      let threesixty: number;
      if (responses.length > 0) {
        const agg = aggregateByRole(responses);
        const others = [agg.manager, agg.peer, agg.report]
          .flatMap((rec) => Object.values(rec))
          .filter((v): v is number => typeof v === "number");
        threesixty = others.length > 0 ? others.reduce((a, b) => a + b, 0) / others.length : 0;
      } else {
        // 9-box から擬似算出（perf high → 4.2、med → 3.5、low → 2.8）
        threesixty = tr.performance === "high" ? 4.2 :
                     tr.performance === "med"  ? 3.5 : 2.8;
      }

      result.push({
        employee_id: tr.employee_id,
        full_name: e.full_name,
        job_title: e.job_title,
        okr_score: DEMO_OKR_SCORE[tr.employee_id] ?? 0.85,
        threesixty_score: Number(threesixty.toFixed(2)),
        flight_risk: tr.flight_risk,
      });
    }
    return result;
  }, []);

  // 4 象限カウント
  const quadCounts = useMemo(() => {
    const c = { star: 0, ic_high: 0, collab_high: 0, needs_help: 0 } as Record<string, number>;
    for (const p of points) c[quadrantOf(p)]++;
    return c;
  }, [points]);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Scale className="size-6 text-gc-700" />
          評価キャリブレーション
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          OKR 達成度 × 360° 他者評価で社員を 4 象限に分類。昇進判定・育成プランの根拠に
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(QUADRANT_META) as Array<keyof typeof QUADRANT_META>).map((q) => (
          <Card key={q} className={cn("border", QUADRANT_META[q].cls)}>
            <CardContent className="p-3">
              <div className="text-xs">{QUADRANT_META[q].label}</div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">{quadCounts[q] ?? 0}</span>
                <span className="text-xs text-muted-foreground">名</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{QUADRANT_META[q].desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 散布図 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <Target className="size-4 text-gc-700" />
            OKR × 360° 散布図
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            X軸：OKR 達成度（0-1.5、目安 1.0）／ Y軸：360° 他者平均（1-5、目安 3.7）
          </p>
          <Scatter points={points} />
        </CardContent>
      </Card>

      {/* 象限別社員リスト */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(Object.keys(QUADRANT_META) as Array<keyof typeof QUADRANT_META>).map((q) => {
          const members = points.filter((p) => quadrantOf(p) === q);
          if (members.length === 0) return null;
          return (
            <Card key={q} className={cn("border", QUADRANT_META[q].cls)}>
              <CardContent className="p-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  {QUADRANT_META[q].label}
                  <span className="font-normal text-[11px] text-muted-foreground">
                    ({members.length} 名)
                  </span>
                </h3>
                <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{QUADRANT_META[q].desc}</p>
                <ul className="space-y-1.5">
                  {members.sort((a, b) => (b.okr_score + b.threesixty_score) - (a.okr_score + a.threesixty_score)).map((p) => (
                    <li key={p.employee_id} className="flex items-center gap-2 rounded-md bg-white p-2 text-xs">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[10px]">{initials(p.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{p.full_name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.job_title}</div>
                      </div>
                      <div className="flex gap-1.5 text-[11px] tabular-nums">
                        <span className="rounded bg-gc-50 px-1.5 py-0.5">OKR {p.okr_score.toFixed(2)}</span>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5">360° {p.threesixty_score.toFixed(1)}</span>
                        {p.flight_risk >= 4 && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800" title="Flight risk 高">
                            ⚠️
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 推奨アクション */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <TrendingUp className="size-4 text-gc-700" />
            キャリブレーション後の推奨アクション
          </h3>
          <ul className="space-y-1.5 text-xs leading-relaxed">
            <li className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2">
              <span>⭐</span>
              <span><strong>Stars:</strong> 昇進候補としてサクセション計画と連動。次ロールの準備度を /talent-review で確認</span>
            </li>
            <li className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
              <span>🎯</span>
              <span><strong>単独成果型:</strong> 360° の弱い軸（コミュニケーション/協働など）を 1on1 で具体的にフィードバック。コーチング推奨</span>
            </li>
            <li className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-2">
              <span>🤝</span>
              <span><strong>チーム貢献型:</strong> OKR の目標設定が低めの可能性。次期は背伸びした KR を一緒に設計</span>
            </li>
            <li className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2">
              <span>🔄</span>
              <span><strong>改善必要:</strong> マネージャーと PIP（Performance Improvement Plan）相談。3 ヶ月で再評価</span>
            </li>
          </ul>
          <p className="text-[11px] text-muted-foreground">
            💡 評価会議では「数字（OKR）」と「他者の声（360°）」を <strong>並列に</strong> 見ることで偏りを抑制できます。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Scatter({ points }: { points: CalibrationPoint[] }) {
  const W = 600, H = 320;
  const padX = 40, padY = 30;
  const xMin = 0, xMax = 1.5;
  const yMin = 1, yMax = 5;
  const sx = (v: number) => padX + ((v - xMin) / (xMax - xMin)) * (W - padX * 2);
  const sy = (v: number) => H - padY - ((v - yMin) / (yMax - yMin)) * (H - padY * 2);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 500 }}>
        {/* 4 象限の背景 */}
        <rect x={sx(X_THRESHOLD)} y={padY} width={W - padX - sx(X_THRESHOLD)} height={sy(Y_THRESHOLD) - padY}
              fill="#10b98115" />
        <rect x={padX} y={padY} width={sx(X_THRESHOLD) - padX} height={sy(Y_THRESHOLD) - padY}
              fill="#3b82f615" />
        <rect x={sx(X_THRESHOLD)} y={sy(Y_THRESHOLD)} width={W - padX - sx(X_THRESHOLD)} height={H - padY - sy(Y_THRESHOLD)}
              fill="#f59e0b15" />
        <rect x={padX} y={sy(Y_THRESHOLD)} width={sx(X_THRESHOLD) - padX} height={H - padY - sy(Y_THRESHOLD)}
              fill="#ef444415" />

        {/* 軸線 */}
        <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="#94a3b8" />
        <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke="#94a3b8" />
        {/* 閾値線 */}
        <line x1={sx(X_THRESHOLD)} y1={padY} x2={sx(X_THRESHOLD)} y2={H - padY} stroke="#cbd5e1" strokeDasharray="4 4" />
        <line x1={padX} y1={sy(Y_THRESHOLD)} x2={W - padX} y2={sy(Y_THRESHOLD)} stroke="#cbd5e1" strokeDasharray="4 4" />

        {/* X 軸ラベル */}
        {[0, 0.5, 1.0, 1.5].map((v) => (
          <g key={`x${v}`}>
            <text x={sx(v)} y={H - padY + 14} fontSize="10" fill="#64748b" textAnchor="middle">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        <text x={W / 2} y={H - 4} fontSize="11" fill="#475569" textAnchor="middle" fontWeight="600">
          OKR 達成度 →
        </text>

        {/* Y 軸ラベル */}
        {[1, 2, 3, 4, 5].map((v) => (
          <text key={`y${v}`} x={padX - 6} y={sy(v) + 3} fontSize="10" fill="#64748b" textAnchor="end">
            {v}
          </text>
        ))}
        <text x={12} y={H / 2} fontSize="11" fill="#475569" textAnchor="middle" fontWeight="600"
              transform={`rotate(-90 12 ${H / 2})`}>
          360° 他者平均 →
        </text>

        {/* 象限ラベル */}
        <text x={sx(1.25)} y={sy(4.5)} fontSize="11" fill="#10b981" fontWeight="700" textAnchor="middle">⭐ Stars</text>
        <text x={sx(0.4)}  y={sy(4.5)} fontSize="11" fill="#3b82f6" fontWeight="700" textAnchor="middle">🤝 チーム貢献</text>
        <text x={sx(1.25)} y={sy(2.0)} fontSize="11" fill="#f59e0b" fontWeight="700" textAnchor="middle">🎯 単独成果</text>
        <text x={sx(0.4)}  y={sy(2.0)} fontSize="11" fill="#ef4444" fontWeight="700" textAnchor="middle">🔄 改善必要</text>

        {/* ポイント */}
        {points.map((p) => {
          const cx = sx(p.okr_score);
          const cy = sy(p.threesixty_score);
          const q = quadrantOf(p);
          const color =
            q === "star"        ? "#10b981" :
            q === "ic_high"     ? "#f59e0b" :
            q === "collab_high" ? "#3b82f6" : "#ef4444";
          return (
            <g key={p.employee_id}>
              <circle cx={cx} cy={cy} r={p.flight_risk >= 4 ? 8 : 6}
                      fill={color}
                      stroke={p.flight_risk >= 4 ? "#fbbf24" : "white"}
                      strokeWidth={p.flight_risk >= 4 ? 2 : 1.5}>
                <title>{p.full_name} — OKR {p.okr_score} / 360° {p.threesixty_score} / Risk {p.flight_risk}</title>
              </circle>
              <text x={cx + 9} y={cy + 3} fontSize="9" fill="#1e293b" pointerEvents="none">
                {p.full_name.length > 6 ? p.full_name.slice(0, 6) + "…" : p.full_name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
