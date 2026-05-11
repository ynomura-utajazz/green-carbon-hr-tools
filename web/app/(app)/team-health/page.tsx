"use client";

/**
 * /team-health
 *
 * チーム健康度ダッシュボード（マネージャー視点）。
 *
 *  マネージャー選択 → 直属メンバー全員の健康度を 1 画面に集約：
 *   - retention risk
 *   - engagement (mood)
 *   - OKR 達成度
 *   - 1on1 頻度
 *   - 360° 他者評価
 *   - wellbeing alerts
 *   - learning 進捗
 *
 *  メンバー横断の総合スコア + 個別カードで状態を一覧。
 */

import { useMemo, useState } from "react";
import {
  HeartPulse, AlertTriangle, MessageSquare, Activity,
  TrendingUp, GraduationCap, Moon, Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_TALENT_REVIEW } from "@/lib/demo/talent-review";
import { DEMO_SKILL_TRACKING } from "@/lib/demo/learning";
import { DEMO_WELLBEING, aggregate as aggWellbeing, alerts as wellbeingAlerts } from "@/lib/demo/wellbeing";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// マネージャー候補 = 部下が 1 名以上いる人
const MANAGER_OPTIONS = DEMO_EMPLOYEES.filter((e) =>
  e.status === "active" &&
  DEMO_EMPLOYEES.some((x) => x.manager_id === e.id)
);

type MemberHealth = {
  employee_id: string;
  full_name: string;
  job_title: string;
  retention_score: number;     // 0-100, 高いほど良い
  okr_score: number;           // 0-1.5
  flight_risk: number;         // 1-5
  mood_avg: number;            // 1-5
  oneonone_freshness_days: number; // 最後の 1on1 から何日
  skill_count: number;
  wellbeing_alerts: number;
  /** 総合健康度 0-100 */
  health_score: number;
};

// OKR ダミースコアマップ
const OKR_SCORES: Record<string, number> = {
  e8: 1.20, e9: 1.05, e10: 0.95, e11: 0.85, e12: 1.00, e13: 0.65,
  e14: 1.15, e15: 0.90, e3: 1.10, e4: 1.05, e5: 0.75, e6: 0.70, e7: 0.78,
};

function buildMemberHealth(employeeId: string): MemberHealth | null {
  const e = DEMO_EMPLOYEES.find((x) => x.id === employeeId);
  if (!e) return null;
  const tr = DEMO_TALENT_REVIEW.find((t) => t.employee_id === employeeId);
  const skill = DEMO_SKILL_TRACKING.find((s) => s.employee_id === employeeId);
  const wbEntries = DEMO_WELLBEING.filter((w) => w.employee_id === employeeId);
  const wbAgg = aggWellbeing(wbEntries);
  const wbAlerts = wellbeingAlerts(wbAgg).length;

  const flightRisk = tr?.flight_risk ?? 2;
  const okr = OKR_SCORES[employeeId] ?? 0.85;
  const mood = wbAgg.avg_mood || 3.5;
  const oneononeFreshness = (employeeId.charCodeAt(2) % 14) + 5; // 擬似 5-19 日

  // 総合健康度の合成
  // - retention (1 - flight_risk/5) × 30%
  // - okr min(1.0, okr/1.0) × 25%
  // - mood (mood/5) × 20%
  // - oneonone freshness (max(0, 1 - days/30)) × 15%
  // - wellbeing (1 - alerts/4) × 10%
  const retention = (1 - flightRisk / 5);
  const okrNorm = Math.min(1, okr / 1.0);
  const moodNorm = mood / 5;
  const ononeNorm = Math.max(0, 1 - oneononeFreshness / 30);
  const wbNorm = Math.max(0, 1 - wbAlerts / 4);
  const score = Math.round(
    (retention * 0.30 + okrNorm * 0.25 + moodNorm * 0.20 + ononeNorm * 0.15 + wbNorm * 0.10) * 100
  );

  return {
    employee_id: employeeId,
    full_name: e.full_name,
    job_title: e.job_title,
    retention_score: Math.round(retention * 100),
    okr_score: okr,
    flight_risk: flightRisk,
    mood_avg: Number(mood.toFixed(1)),
    oneonone_freshness_days: oneononeFreshness,
    skill_count: skill ? Object.keys(skill.skills).length : 0,
    wellbeing_alerts: wbAlerts,
    health_score: score,
  };
}

export default function TeamHealthPage() {
  const [managerId, setManagerId] = useState<string>(MANAGER_OPTIONS[0]?.id ?? "e8");
  const manager = DEMO_EMPLOYEES.find((e) => e.id === managerId);

  const reports = useMemo(
    () => DEMO_EMPLOYEES.filter((e) => e.status === "active" && e.manager_id === managerId),
    [managerId],
  );

  const memberHealth = useMemo(
    () => reports.map((r) => buildMemberHealth(r.id)).filter((x): x is MemberHealth => x !== null),
    [reports],
  );

  // チーム集約
  const teamAvg = useMemo(() => {
    if (memberHealth.length === 0) return null;
    const sum = memberHealth.reduce((acc, m) => ({
      health: acc.health + m.health_score,
      okr: acc.okr + m.okr_score,
      mood: acc.mood + m.mood_avg,
      flight: acc.flight + m.flight_risk,
      onone: acc.onone + m.oneonone_freshness_days,
    }), { health: 0, okr: 0, mood: 0, flight: 0, onone: 0 });
    return {
      health: Math.round(sum.health / memberHealth.length),
      okr: Number((sum.okr / memberHealth.length).toFixed(2)),
      mood: Number((sum.mood / memberHealth.length).toFixed(1)),
      flight: Number((sum.flight / memberHealth.length).toFixed(1)),
      onone: Math.round(sum.onone / memberHealth.length),
    };
  }, [memberHealth]);

  // アラート抽出
  const memberAlerts = memberHealth.flatMap((m) => {
    const alerts: { member: MemberHealth; type: string; severity: "med" | "high" }[] = [];
    if (m.flight_risk >= 4) alerts.push({ member: m, type: `Flight risk ${m.flight_risk}`, severity: "high" });
    if (m.okr_score < 0.7) alerts.push({ member: m, type: `OKR 達成度 ${m.okr_score} と低調`, severity: "high" });
    if (m.oneonone_freshness_days >= 14) alerts.push({ member: m, type: `1on1 が ${m.oneonone_freshness_days} 日空いている`, severity: "med" });
    if (m.wellbeing_alerts >= 2) alerts.push({ member: m, type: `Wellbeing 警告 ${m.wellbeing_alerts} 件`, severity: "med" });
    if (m.mood_avg < 3) alerts.push({ member: m, type: `ムード ${m.mood_avg} と低い`, severity: "med" });
    return alerts;
  });

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <HeartPulse className="size-6 text-gc-700" />
            チーム健康度ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            マネージャーが自チームの全指標（離職リスク・OKR・1on1・ムード・wellbeing・学習）を 1 画面で確認
          </p>
        </div>
        <Select value={managerId} onValueChange={setManagerId}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MANAGER_OPTIONS.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.full_name}（{m.job_title}）</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {manager && reports.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            このマネージャーには直属メンバーがいません
          </CardContent>
        </Card>
      )}

      {teamAvg && (
        <>
          {/* マネージャー + 集約 */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <Avatar className="size-12">
                <AvatarFallback>{initials(manager?.full_name ?? "")}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{manager?.full_name}</div>
                <div className="text-xs text-muted-foreground">{manager?.job_title}・{reports.length} 名のチーム</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">チーム健康度</div>
                <div className={cn(
                  "font-mono text-4xl font-bold tabular-nums leading-none",
                  teamAvg.health >= 75 ? "text-emerald-600" :
                  teamAvg.health >= 55 ? "text-amber-600"   : "text-red-600",
                )}>
                  {teamAvg.health}
                </div>
                <div className="text-[10px] text-muted-foreground">/ 100</div>
              </div>
            </CardContent>
          </Card>

          {/* チーム平均 KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Mini Icon={TrendingUp} label="平均 OKR" value={teamAvg.okr.toFixed(2)} unit="" tone={teamAvg.okr >= 0.9 ? "ok" : "warn"} />
            <Mini Icon={Activity} label="平均ムード" value={teamAvg.mood.toFixed(1)} unit="/ 5" tone={teamAvg.mood >= 3.5 ? "ok" : "warn"} />
            <Mini Icon={AlertTriangle} label="平均 Flight Risk" value={teamAvg.flight.toFixed(1)} unit="/ 5" tone={teamAvg.flight <= 2.5 ? "ok" : "warn"} />
            <Mini Icon={MessageSquare} label="1on1 平均間隔" value={teamAvg.onone} unit="日" tone={teamAvg.onone <= 14 ? "ok" : "warn"} />
            <Mini Icon={AlertTriangle} label="アラート" value={memberAlerts.length} unit="件" tone={memberAlerts.length === 0 ? "ok" : "warn"} />
          </div>

          {/* アラート */}
          {memberAlerts.length > 0 && (
            <Card className="border-amber-300 bg-amber-50/30">
              <CardContent className="space-y-2 p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                  <AlertTriangle className="size-4" />
                  注目すべきメンバー（{memberAlerts.length} 件）
                </h3>
                <ul className="space-y-1">
                  {memberAlerts.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-md bg-white p-2 text-xs">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[9px]">{initials(a.member.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{a.member.full_name}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px]",
                        a.severity === "high" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800",
                      )}>
                        {a.type}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* メンバー個別 */}
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">メンバー別 健康度</h3>
              <ul className="grid gap-3 lg:grid-cols-2">
                {memberHealth.sort((a, b) => a.health_score - b.health_score).map((m) => (
                  <li key={m.employee_id} className={cn(
                    "rounded-md border p-3",
                    m.health_score >= 75 ? "border-emerald-200" :
                    m.health_score >= 55 ? "border-amber-200"   : "border-red-300 bg-red-50/30",
                  )}>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback>{initials(m.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{m.full_name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{m.job_title}</div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "font-mono text-2xl font-bold tabular-nums",
                          m.health_score >= 75 ? "text-emerald-600" :
                          m.health_score >= 55 ? "text-amber-600"   : "text-red-600",
                        )}>
                          {m.health_score}
                        </div>
                        <div className="text-[9px] text-muted-foreground">健康度</div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
                      <Pill Icon={TrendingUp} label="OKR" value={m.okr_score.toFixed(2)} tone={m.okr_score >= 0.9 ? "ok" : "warn"} />
                      <Pill Icon={Star} label="Mood" value={m.mood_avg.toFixed(1)} tone={m.mood_avg >= 3.5 ? "ok" : "warn"} />
                      <Pill Icon={AlertTriangle} label="Risk" value={`${m.flight_risk}/5`} tone={m.flight_risk <= 2 ? "ok" : "warn"} />
                      <Pill Icon={MessageSquare} label="1on1" value={`${m.oneonone_freshness_days}d`} tone={m.oneonone_freshness_days <= 14 ? "ok" : "warn"} />
                      <Pill Icon={Moon} label="WB" value={`${m.wellbeing_alerts}⚠`} tone={m.wellbeing_alerts === 0 ? "ok" : "warn"} />
                      <Pill Icon={GraduationCap} label="Skills" value={`${m.skill_count}`} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 健康度スコア = retention 30% + OKR 25% + mood 20% + 1on1 鮮度 15% + wellbeing 10%。
        50 未満のメンバーには重点的なフォローを推奨します。
      </div>
    </div>
  );
}

function Mini({ Icon, label, value, unit, tone }: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; unit: string;
  tone: "ok" | "warn";
}) {
  return (
    <Card className={cn(
      tone === "ok" ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"
    )}>
      <CardContent className="flex items-start gap-2 p-3">
        <Icon className={cn("size-4 shrink-0", tone === "ok" ? "text-emerald-700" : "text-amber-700")} />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-mono text-lg font-bold tabular-nums">
            {value}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Pill({ Icon, label, value, tone }: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className={cn(
      "rounded border p-1.5 text-center",
      tone === "ok" ? "bg-emerald-50/50 border-emerald-200" :
      tone === "warn" ? "bg-amber-50/50 border-amber-200" : "bg-muted/30",
    )}>
      <Icon className="mx-auto size-3 text-muted-foreground" />
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="font-mono font-bold">{value}</div>
    </div>
  );
}
