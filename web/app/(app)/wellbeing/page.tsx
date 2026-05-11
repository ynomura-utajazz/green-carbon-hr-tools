"use client";

/**
 * /wellbeing
 *
 * ウェルビーイング自己申告ダッシュボード。
 *
 * モード切替：
 *  - 個人ビュー：自分の 30 日間の推移
 *  - 集約ビュー（HR 管理者）：全体平均、警告トリガ
 *
 * プライバシー：
 *  - 個別データは本人のみ閲覧
 *  - 集約は N>=5 のみ表示
 */

import { useMemo, useState } from "react";
import {
  Heart, Moon, Zap, Footprints, Smile, AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DEMO_WELLBEING, aggregate, alerts, type WellbeingEntry,
} from "@/lib/demo/wellbeing";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ANONYMIZE_THRESHOLD = 5;

export default function WellbeingPage() {
  const [view, setView] = useState<"self" | "aggregate">("self");
  const [meId, setMeId] = useState("e9");
  const me = DEMO_EMPLOYEES.find((e) => e.id === meId);

  const myEntries = useMemo(() =>
    DEMO_WELLBEING
      .filter((e) => e.employee_id === meId)
      .sort((a, b) => a.date.localeCompare(b.date)),
  [meId]);

  const myAgg = useMemo(() => aggregate(myEntries), [myEntries]);
  const myAlerts = useMemo(() => alerts(myAgg), [myAgg]);

  // 全体集約（N>=5 のみ）
  const allAgg = useMemo(() => aggregate(DEMO_WELLBEING), []);
  const uniqueEmployees = new Set(DEMO_WELLBEING.map((e) => e.employee_id)).size;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Heart className="size-6 text-gc-700" />
            ウェルビーイング
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            睡眠・ストレス・運動・ムードの自己申告ダッシュボード（直近 30 日）
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setView("self")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              view === "self"
                ? "border-gc-600 bg-gc-600 text-white"
                : "bg-background text-muted-foreground hover:bg-accent",
            )}
          >
            👤 個人
          </button>
          <button
            onClick={() => setView("aggregate")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              view === "aggregate"
                ? "border-gc-600 bg-gc-600 text-white"
                : "bg-background text-muted-foreground hover:bg-accent",
            )}
          >
            🏢 全体集約
          </button>
        </div>
      </div>

      {view === "self" && me && (
        <>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Avatar className="size-10">
                <AvatarFallback>{initials(me.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{me.full_name}</div>
                <div className="text-xs text-muted-foreground">{me.job_title}</div>
              </div>
              <Select value={meId} onValueChange={setMeId}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...new Set(DEMO_WELLBEING.map((e) => e.employee_id))].map((id) => {
                    const e = DEMO_EMPLOYEES.find((x) => x.id === id);
                    return e ? <SelectItem key={id} value={id}>{e.full_name}</SelectItem> : null;
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* 自分の集約 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric Icon={Moon} label="平均睡眠" value={`${myAgg.avg_sleep}h`}
              tone={myAgg.avg_sleep >= 7 ? "success" : myAgg.avg_sleep >= 6.5 ? "warn" : "danger"}
              hint="推奨 7-8 時間" />
            <Metric Icon={Zap} label="平均ストレス" value={`${myAgg.avg_stress} / 5`}
              tone={myAgg.avg_stress < 3 ? "success" : myAgg.avg_stress < 3.5 ? "warn" : "danger"}
              hint="3 以下が健全" />
            <Metric Icon={Footprints} label="平均運動" value={`${myAgg.avg_exercise} 分`}
              tone={myAgg.avg_exercise >= 30 ? "success" : myAgg.avg_exercise >= 15 ? "warn" : "danger"}
              hint="WHO 推奨 30 分/日" />
            <Metric Icon={Smile} label="平均ムード" value={`${myAgg.avg_mood} / 5`}
              tone={myAgg.avg_mood >= 3.5 ? "success" : myAgg.avg_mood >= 3 ? "warn" : "danger"}
              hint="3.5 以上が健全" />
          </div>

          {/* 警告 */}
          {myAlerts.length > 0 && (
            <Card className="border-amber-300 bg-amber-50/30">
              <CardContent className="space-y-2 p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                  <AlertTriangle className="size-4" />
                  注意したい指標
                </h3>
                <ul className="space-y-1 text-xs">
                  {myAlerts.map((a) => (
                    <li key={a.type} className="rounded-md bg-white p-2">
                      ⚠️ {a.message}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-amber-800">
                  💡 改善のヒント：マネージャーとの 1on1 で話してみる / ストレスチェックを受ける / 産業医面談を申し込む
                </p>
              </CardContent>
            </Card>
          )}

          {/* 30 日トレンドチャート */}
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">30 日トレンド</h3>
              <TrendCharts entries={myEntries} />
            </CardContent>
          </Card>

          <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            🔒 個人データは本人とマネージャー（許可制）のみアクセス可能。HR 管理者は集約値のみ確認できます。
            このデータは健康状態の絶対的指標ではなく、自身の状態を内省する補助ツールとしてご活用ください。
          </div>
        </>
      )}

      {view === "aggregate" && (
        <>
          {uniqueEmployees < ANONYMIZE_THRESHOLD ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                データ提供者が {ANONYMIZE_THRESHOLD} 名未満のため、集約は表示しません（プライバシー保護）
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric Icon={Moon} label="全社平均睡眠" value={`${allAgg.avg_sleep}h`}
                  tone={allAgg.avg_sleep >= 7 ? "success" : "warn"}
                  hint={`${uniqueEmployees} 名のデータ`} />
                <Metric Icon={Zap} label="全社平均ストレス" value={`${allAgg.avg_stress} / 5`}
                  tone={allAgg.avg_stress < 3.2 ? "success" : "warn"} />
                <Metric Icon={Footprints} label="全社平均運動" value={`${allAgg.avg_exercise} 分`}
                  tone={allAgg.avg_exercise >= 25 ? "success" : "warn"} />
                <Metric Icon={Smile} label="全社平均ムード" value={`${allAgg.avg_mood} / 5`}
                  tone={allAgg.avg_mood >= 3.3 ? "success" : "warn"} />
              </div>

              {/* メンバー別（匿名化済の表示） */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">メンバー別の集約（匿名化）</h3>
                  <ul className="space-y-1.5">
                    {[...new Set(DEMO_WELLBEING.map((e) => e.employee_id))].map((id, i) => {
                      const entries = DEMO_WELLBEING.filter((e) => e.employee_id === id);
                      const agg = aggregate(entries);
                      const aFlags = alerts(agg);
                      return (
                        <li key={id} className="flex items-center gap-3 rounded-md border p-2 text-xs">
                          <span className="font-mono text-muted-foreground">M-{(i + 1).toString().padStart(2, "0")}</span>
                          <div className="grid flex-1 grid-cols-4 gap-2">
                            <span>😴 {agg.avg_sleep}h</span>
                            <span>⚡ {agg.avg_stress}</span>
                            <span>🏃 {agg.avg_exercise}m</span>
                            <span>🙂 {agg.avg_mood}</span>
                          </div>
                          {aFlags.length > 0 && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                              ⚠ {aFlags.length}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    実名は表示しません。⚠ がついているメンバーには産業医・HRBP からのアウトリーチを推奨。
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ Icon, label, value, tone, hint }: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; value: string;
  tone: "success" | "warn" | "danger";
  hint?: string;
}) {
  const cls = {
    success: "border-emerald-200 bg-emerald-50/40 text-emerald-900",
    warn:    "border-amber-200 bg-amber-50/40 text-amber-900",
    danger:  "border-red-200 bg-red-50/40 text-red-900",
  }[tone];
  return (
    <Card className={cn(cls)}>
      <CardContent className="flex items-start gap-3 p-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-white">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
          <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
          {hint && <div className="text-[10px] opacity-70">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendCharts({ entries }: { entries: WellbeingEntry[] }) {
  const W = 600, H = 220;
  const padX = 40, padY = 25;
  const days = entries.length;
  if (days === 0) return <div className="text-sm text-muted-foreground">データなし</div>;
  const sx = (i: number) => padX + (i / Math.max(1, days - 1)) * (W - padX * 2);

  // 睡眠ライン（4-10 → 上端〜下端）
  const sleepY = (v: number) => H - padY - ((v - 4) / 6) * (H - padY * 2);
  const stressY = (v: number) => H - padY - ((v - 1) / 4) * (H - padY * 2);
  const exerciseY = (v: number) => H - padY - (Math.min(v, 90) / 90) * (H - padY * 2);

  const sleepPath = entries.map((e, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sleepY(e.sleep_hours)}`).join(" ");
  const stressPath = entries.map((e, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${stressY(e.stress)}`).join(" ");
  const exercisePath = entries.map((e, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${exerciseY(e.exercise_min)}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 500 }}>
        <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="#cbd5e1" />
        <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke="#cbd5e1" />

        {/* 睡眠ライン（青） */}
        <path d={sleepPath} fill="none" stroke="#3b82f6" strokeWidth="2" />
        {/* ストレスライン（オレンジ・破線） */}
        <path d={stressPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
        {/* 運動ライン（緑・点線） */}
        <path d={exercisePath} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="2 3" />

        {/* ラベル */}
        <text x={W - padX} y={padY - 5} fontSize="10" fill="#3b82f6" textAnchor="end">睡眠（h）</text>
        <text x={W - padX} y={padY + 8} fontSize="10" fill="#f59e0b" textAnchor="end">ストレス</text>
        <text x={W - padX} y={padY + 21} fontSize="10" fill="#10b981" textAnchor="end">運動（分）</text>

        <text x={padX} y={H - 4} fontSize="10" fill="#64748b">{entries[0]?.date.slice(5)}</text>
        <text x={W - padX} y={H - 4} fontSize="10" fill="#64748b" textAnchor="end">
          {entries[entries.length - 1]?.date.slice(5)}
        </text>
      </svg>
    </div>
  );
}
