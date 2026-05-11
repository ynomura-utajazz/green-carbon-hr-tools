"use client";

/**
 * /learning
 *
 * 学習プラットフォーム：
 *  - 自分のスキルマトリクス（レベル可視化）
 *  - 推奨ラーニングパス（キャリア目標 × 現在地）
 *  - 学習リソースライブラリ（提供元・難易度・推奨数フィルタ）
 *  - 社内勉強会（参加可能なもの一覧）
 */

import { useMemo, useState } from "react";
import {
  GraduationCap, BookOpen, Target, Users2, Star, ExternalLink,
  Sparkles, Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DEMO_SKILL_TRACKING, DEMO_RESOURCES, DEMO_PATHS, DEMO_STUDY_GROUPS,
  SKILL_LEVEL_LABEL, PROVIDER_LABEL, PROVIDER_COLOR,
  type SkillLevel, type LearningResource,
} from "@/lib/demo/learning";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LEVEL_COLOR: Record<SkillLevel, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-amber-100 text-amber-800",
  2: "bg-blue-100 text-blue-800",
  3: "bg-emerald-100 text-emerald-800",
  4: "bg-gc-200 text-gc-900 ring-2 ring-gc-400",
};

export default function LearningPage() {
  // 自分（demo: e9 藤本）の選択
  const [meId, setMeId] = useState("e9");
  const me = DEMO_EMPLOYEES.find((e) => e.id === meId);
  const myTracking = DEMO_SKILL_TRACKING.find((t) => t.employee_id === meId);

  const [providerFilter, setProviderFilter] = useState<string>("all");
  const filteredResources = useMemo(() =>
    DEMO_RESOURCES.filter((r) => providerFilter === "all" || r.provider === providerFilter)
      .sort((a, b) => b.recommended_by - a.recommended_by),
  [providerFilter]);

  // 推奨パス：自分のスキルレベルが低い分野でカバー率が高いものを上位に
  const recommendedPaths = useMemo(() => {
    if (!myTracking) return DEMO_PATHS;
    const mySkills = myTracking.skills;
    return [...DEMO_PATHS].sort((a, b) => {
      // スキル獲得数の多さ × スキル不足の補完度
      const scoreA = a.skills_gained.filter((s) => (mySkills[s] ?? 0) < 3).length;
      const scoreB = b.skills_gained.filter((s) => (mySkills[s] ?? 0) < 3).length;
      return scoreB - scoreA;
    });
  }, [myTracking]);

  const totalSkills = myTracking ? Object.keys(myTracking.skills).length : 0;
  const expertSkills = myTracking
    ? Object.values(myTracking.skills).filter((v) => v === 4).length : 0;
  const inProgress = myTracking
    ? Object.values(myTracking.skills).filter((v) => v === 1).length : 0;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <GraduationCap className="size-6 text-gc-700" />
            学習プラットフォーム
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            スキルマトリクス × ラーニングパス × 社内勉強会で、社員の成長を継続トラッキング
          </p>
        </div>
        <Select value={meId} onValueChange={setMeId}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEMO_SKILL_TRACKING.map((t) => {
              const e = DEMO_EMPLOYEES.find((x) => x.id === t.employee_id);
              return e ? (
                <SelectItem key={t.employee_id} value={t.employee_id}>
                  {e.full_name}（{e.job_title}）
                </SelectItem>
              ) : null;
            })}
          </SelectContent>
        </Select>
      </div>

      {/* 自分のサマリ */}
      {me && myTracking && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <Avatar className="size-12">
              <AvatarFallback>{initials(me.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold">{me.full_name}</div>
              <div className="text-xs text-muted-foreground">{me.job_title}</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="登録スキル" value={totalSkills} unit="件" />
              <Stat label="エキスパート" value={expertSkills} unit="件" tone="success" />
              <Stat label="学習中" value={inProgress} unit="件" tone="warn" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* スキルマトリクス */}
      {myTracking && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Target className="size-4 text-gc-700" />
              スキルマトリクス
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(myTracking.skills)
                .sort((a, b) => b[1] - a[1])
                .map(([skill, level]) => (
                  <span
                    key={skill}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]",
                      LEVEL_COLOR[level as SkillLevel],
                    )}
                    title={SKILL_LEVEL_LABEL[level as SkillLevel]}
                  >
                    {skill}
                    <span className="ml-0.5 font-mono text-[9px]">L{level}</span>
                  </span>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
              <span className="text-muted-foreground">レベル：</span>
              {([0, 1, 2, 3, 4] as SkillLevel[]).map((l) => (
                <span key={l} className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5", LEVEL_COLOR[l])}>
                  L{l} {SKILL_LEVEL_LABEL[l]}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 推奨ラーニングパス */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4 text-gc-700" />
            あなたへの推奨ラーニングパス
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            現在のスキルマトリクスから、不足分野を最も補えるパスを上位に
          </p>
          <ul className="space-y-2">
            {recommendedPaths.map((p) => {
              const stepResources = p.steps
                .map((sid) => DEMO_RESOURCES.find((r) => r.id === sid))
                .filter((x): x is LearningResource => Boolean(x));
              return (
                <li key={p.id} className="rounded-md border bg-card p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">🎯 {p.target}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-base font-bold tabular-nums">{p.total_hours}h</div>
                      <div className="text-[10px] text-muted-foreground">想定総時間</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.skills_gained.map((s) => {
                      const cur = myTracking?.skills[s] ?? 0;
                      return (
                        <span key={s} className="inline-flex items-center gap-0.5 rounded-full border bg-muted px-1.5 py-0.5 text-[10px]">
                          {s}
                          <span className="font-mono text-[9px] text-muted-foreground">
                            L{cur}→4
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  <ol className="mt-2 space-y-1">
                    {stepResources.map((r, i) => (
                      <li key={r.id} className="flex items-center gap-2 text-xs">
                        <span className="size-5 shrink-0 rounded-full bg-gc-100 text-center font-mono text-[10px] leading-5 text-gc-800">
                          {i + 1}
                        </span>
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", PROVIDER_COLOR[r.provider])}>
                          {PROVIDER_LABEL[r.provider]}
                        </span>
                        <span className="flex-1 truncate">{r.title}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{r.duration_hours}h</span>
                      </li>
                    ))}
                  </ol>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* リソースライブラリ */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <BookOpen className="size-4 text-gc-700" />
              リソースライブラリ
            </h2>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="h-8 w-44 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全プロバイダ</SelectItem>
                {(Object.keys(PROVIDER_LABEL) as LearningResource["provider"][]).map((p) => (
                  <SelectItem key={p} value={p}>{PROVIDER_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ul className="grid gap-2 lg:grid-cols-2">
            {filteredResources.map((r) => (
              <li key={r.id} className="rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", PROVIDER_COLOR[r.provider])}>
                        {PROVIDER_LABEL[r.provider]}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{r.level}</Badge>
                    </div>
                    <div className="mt-0.5 truncate font-semibold">{r.title}</div>
                  </div>
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-gc-700">
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.primary_skills.map((s) => (
                    <span key={s} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{s}</span>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  {r.rating && (
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="size-3 fill-amber-500 text-amber-500" />
                      <span className="font-mono tabular-nums">{r.rating}</span>
                    </span>
                  )}
                  <span className="font-mono tabular-nums">{r.duration_hours}h</span>
                  <span>👍 {r.recommended_by} 名推薦</span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 社内勉強会 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Users2 className="size-4 text-gc-700" />
            社内勉強会
          </h2>
          <ul className="grid gap-2 lg:grid-cols-2">
            {DEMO_STUDY_GROUPS.map((sg) => {
              const organizer = DEMO_EMPLOYEES.find((e) => e.id === sg.organizer_id);
              return (
                <li key={sg.id} className="rounded-md border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{sg.name}</div>
                      <div className="text-[11px] text-muted-foreground">{sg.topic}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {sg.cadence === "weekly" ? "週次" :
                       sg.cadence === "biweekly" ? "隔週" :
                       sg.cadence === "monthly" ? "月次" : sg.cadence}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <Avatar className="size-5">
                      <AvatarFallback className="text-[8px]">{initials(organizer?.full_name ?? "")}</AvatarFallback>
                    </Avatar>
                    <span>主催: {organizer?.full_name ?? "—"}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>👥 {sg.member_count} 名</span>
                    {sg.next_session_at && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Calendar className="size-3" />
                          次回 {new Date(sg.next_session_at).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" })}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {sg.skills.map((s) => (
                      <span key={s} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{s}</span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, unit, tone }: {
  label: string; value: number; unit: string;
  tone?: "success" | "warn";
}) {
  return (
    <div className={cn(
      "rounded-md border bg-muted/30 p-2 text-center",
      tone === "success" && "border-emerald-200 bg-emerald-50/40",
      tone === "warn"    && "border-amber-200 bg-amber-50/40",
    )}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn(
        "font-mono text-xl font-bold tabular-nums",
        tone === "success" && "text-emerald-700",
        tone === "warn" && "text-amber-700",
      )}>
        {value}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
