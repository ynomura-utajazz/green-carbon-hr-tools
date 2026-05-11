"use client";

/**
 * /career-path
 *
 * 社員のキャリアパス可視化：
 *  - 過去ロール（タイムライン）
 *  - 現職（ハイライト）
 *  - 将来オプション（horizon × likelihood で配置）
 */

import { useState } from "react";
import { Map, Briefcase, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEMO_CAREER_PATHS, HORIZON_LABEL } from "@/lib/demo/career-path";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PATH_IDS = Object.keys(DEMO_CAREER_PATHS);

export default function CareerPathPage() {
  const [employeeId, setEmployeeId] = useState(PATH_IDS[0] ?? "e8");
  const path = DEMO_CAREER_PATHS[employeeId];
  const employee = DEMO_EMPLOYEES.find((e) => e.id === employeeId);

  const allYears = path.history.flatMap((h) => [h.start_year, h.end_year ?? new Date().getFullYear()]);
  const minYear = Math.min(...allYears);
  const currentYear = new Date().getFullYear();
  const yearSpan = currentYear - minYear;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Map className="size-6 text-gc-700" />
            キャリアパス
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            過去ロール × 現職 × 将来オプションを 1 画面で可視化。タレントレビューと連動
          </p>
        </div>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PATH_IDS.map((id) => {
              const e = DEMO_EMPLOYEES.find((x) => x.id === id);
              return e ? <SelectItem key={id} value={id}>{e.full_name}（{e.job_title}）</SelectItem> : null;
            })}
          </SelectContent>
        </Select>
      </div>

      {employee && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Avatar className="size-12">
              <AvatarFallback>{initials(employee.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold">{employee.full_name}</div>
              <div className="text-xs text-muted-foreground">{employee.job_title}</div>
            </div>
            <div className="text-right text-xs">
              <div className="text-muted-foreground">キャリア年数</div>
              <div className="font-mono text-base font-bold tabular-nums">{yearSpan}+ 年</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 過去 → 現在 タイムライン */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Briefcase className="size-4 text-gc-700" />
            これまでのキャリア
          </h2>
          <div className="relative">
            <div className="absolute left-4 top-0 h-full w-px bg-border" />
            <ul className="space-y-3">
              {path.history.map((h, i) => {
                const isCurrent = !h.end_year;
                return (
                  <li key={i} className="relative pl-10">
                    <div className={cn(
                      "absolute left-2 top-1.5 size-4 rounded-full border-2 bg-background",
                      isCurrent ? "border-gc-600 bg-gc-600" : "border-muted-foreground",
                    )} />
                    <div className={cn(
                      "rounded-md border p-3",
                      isCurrent && "border-gc-300 bg-gc-50/30",
                    )}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs text-muted-foreground">
                          {h.start_year} - {h.end_year ?? "現在"}
                        </span>
                        {isCurrent && (
                          <Badge variant="success" className="text-[10px]">現職</Badge>
                        )}
                      </div>
                      <div className="mt-1 font-semibold">{h.role}</div>
                      <div className="text-xs text-muted-foreground">{h.company}</div>
                      {h.achievements && h.achievements.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 text-[11px]">
                          {h.achievements.map((a, j) => (
                            <li key={j} className="text-muted-foreground">・{a}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 将来オプション */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <Target className="size-4 text-gc-700" />
            将来オプション
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            各パスの likelihood は、9-box ポジション・本人志向・市場機会から AI で推定
          </p>

          {/* オプション散布（horizon × likelihood の擬似グラフ） */}
          <FuturePlot options={path.future_options} />

          {/* オプションリスト */}
          <ul className="mt-4 space-y-2">
            {[...path.future_options].sort((a, b) => b.likelihood - a.likelihood).map((opt, i) => (
              <li key={i} className={cn(
                "rounded-md border p-3",
                opt.likelihood >= 0.7 ? "border-emerald-300 bg-emerald-50/30" :
                opt.likelihood >= 0.4 ? "border-amber-300 bg-amber-50/30" :
                                        "border-border",
              )}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{opt.label}</span>
                    <Badge variant="outline" className="text-[10px]">{HORIZON_LABEL[opt.horizon]}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">likelihood</span>
                    <span className={cn(
                      "font-mono text-base font-bold tabular-nums",
                      opt.likelihood >= 0.7 ? "text-emerald-700" :
                      opt.likelihood >= 0.4 ? "text-amber-700" : "text-muted-foreground",
                    )}>
                      {Math.round(opt.likelihood * 100)}%
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{opt.description}</p>
                {opt.required_skills.length > 0 && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">必要スキル: </span>
                    {opt.required_skills.map((s) => (
                      <span key={s} className="ml-1 inline-block rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 このページの内容は <strong>本人と直属マネージャー、HR 管理者のみ</strong>閲覧可能。
        将来オプションは決定事項ではなく <strong>対話のきっかけ</strong> として活用してください。1on1 で「3 つの選択肢のうちどれが今の本心に近い？」と問うとキャリア対話が深まります。
      </div>
    </div>
  );
}

function FuturePlot({ options }: { options: { label: string; horizon: "1y" | "2y_3y" | "5y+"; likelihood: number }[] }) {
  const W = 600, H = 200;
  const padX = 60, padY = 20;
  const xPos: Record<string, number> = { "1y": 0.2, "2y_3y": 0.5, "5y+": 0.85 };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 500 }}>
        {/* 軸 */}
        <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="#cbd5e1" />
        <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke="#cbd5e1" />

        {/* X 軸ラベル（horizon） */}
        {[
          { h: "1y", label: "1y" },
          { h: "2y_3y", label: "2-3y" },
          { h: "5y+", label: "5y+" },
        ].map((x) => (
          <text key={x.h} x={padX + xPos[x.h] * (W - padX * 2)} y={H - 4}
                fontSize="10" fill="#64748b" textAnchor="middle">
            {x.label}
          </text>
        ))}
        <text x={W / 2} y={H - 4} fontSize="9" fill="#475569" textAnchor="middle">時間軸 →</text>

        {/* Y 軸ラベル */}
        {[0, 50, 100].map((v) => {
          const y = (H - padY) - (v / 100) * (H - padY * 2);
          return (
            <text key={v} x={padX - 6} y={y + 3} fontSize="10" fill="#64748b" textAnchor="end">
              {v}%
            </text>
          );
        })}
        <text x={20} y={H / 2} fontSize="10" fill="#475569" textAnchor="middle"
              transform={`rotate(-90 20 ${H / 2})`}>likelihood</text>

        {/* 点 */}
        {options.map((o, i) => {
          const cx = padX + xPos[o.horizon] * (W - padX * 2);
          const cy = (H - padY) - o.likelihood * (H - padY * 2);
          const color =
            o.likelihood >= 0.7 ? "#10b981" :
            o.likelihood >= 0.4 ? "#f59e0b" : "#64748b";
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={10} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={2}>
                <title>{o.label} — {Math.round(o.likelihood * 100)}%</title>
              </circle>
              <text x={cx} y={cy - 14} fontSize="10" fill={color} textAnchor="middle" fontWeight="600">
                {o.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
