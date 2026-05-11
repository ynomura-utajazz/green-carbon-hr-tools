"use client";

import { GraduationCap, Users2, BookOpen, Award, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const trainings = [
  { id: "tr-1", name: "新任マネージャー研修", category: "leadership", attendees: 12, completion: 75, scheduled: "2026-06-01", duration: "2日間" },
  { id: "tr-2", name: "情報セキュリティ基礎", category: "compliance", attendees: 297, completion: 92, scheduled: "2026-04-15", duration: "1時間" },
  { id: "tr-3", name: "ハラスメント防止研修", category: "compliance", attendees: 297, completion: 88, scheduled: "2026-04-20", duration: "1時間" },
  { id: "tr-4", name: "AWS Solutions Architect 入門", category: "tech", attendees: 18, completion: 45, scheduled: "2026-05-01", duration: "オンライン" },
  { id: "tr-5", name: "ASEAN ビジネス文化", category: "global", attendees: 35, completion: 60, scheduled: "2026-05-15", duration: "半日" },
  { id: "tr-6", name: "Carbon Accounting 基礎", category: "domain", attendees: 50, completion: 70, scheduled: "2026-06-10", duration: "1日" },
];

const skillMatrix = [
  { skill: "TypeScript / React", levels: [8, 12, 15, 6, 2], avg: 3.4 },
  { skill: "AWS / Cloud Infrastructure", levels: [12, 10, 8, 5, 1], avg: 2.8 },
  { skill: "Carbon Credit 知識", levels: [5, 12, 18, 10, 5], avg: 3.5 },
  { skill: "英語ビジネスレベル", levels: [3, 15, 18, 10, 4], avg: 3.4 },
  { skill: "プロジェクトマネジメント", levels: [10, 12, 14, 8, 6], avg: 3.2 },
];

export default function TrainingPage() {
  const [tab, setTab] = useState<"trainings" | "skills">("trainings");
  const totalAttendees = trainings.reduce((s, t) => s + t.attendees, 0);
  const avgCompletion = Math.round(trainings.reduce((s, t) => s + t.completion, 0) / trainings.length);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <GraduationCap className="size-6 text-gc-700" />
            研修・スキル管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            社内研修運営・スキルマトリクス・ギャップ分析。
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          研修を作成
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="開催中研修" value={trainings.length} unit="件" icon={BookOpen} tone="primary" />
        <KpiTile label="参加者延べ" value={totalAttendees} unit="名" icon={Users2} tone="primary" />
        <KpiTile label="平均完了率" value={`${avgCompletion}%`} unit="" icon={Award} tone={avgCompletion >= 70 ? "success" : "warning"} />
        <KpiTile label="認定取得" value={42} unit="件" icon={Award} tone="muted" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="trainings">研修プログラム</TabsTrigger>
          <TabsTrigger value="skills">スキルマトリクス</TabsTrigger>
        </TabsList>

        <TabsContent value="trainings">
          <ul className="space-y-2">
            {trainings.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-gc-50 text-gc-700">
                      <BookOpen className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.scheduled} · {t.duration} · 対象 {t.attendees} 名
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">完了率</span>
                          <span className="font-bold tabular-nums">{t.completion}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full",
                              t.completion >= 80 ? "bg-emerald-500"
                                : t.completion >= 60 ? "bg-amber-500"
                                : "bg-red-500",
                            )}
                            style={{ width: `${t.completion}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">主要スキル分布（5段階）</h3>
              <ul className="space-y-3">
                {skillMatrix.map((s) => (
                  <li key={s.skill} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.skill}</span>
                      <span className="font-bold tabular-nums">平均 {s.avg}</span>
                    </div>
                    <div className="flex gap-1">
                      {s.levels.map((count, i) => (
                        <div key={i} className="flex-1 text-center">
                          <div className="text-[10px] text-muted-foreground">Lv {i + 1}</div>
                          <div
                            className={cn(
                              "mt-0.5 rounded p-1 font-mono text-xs tabular-nums",
                              i < 2 ? "bg-red-100 text-red-800"
                                : i < 4 ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800",
                            )}
                          >
                            {count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiTile({
  icon: Icon, label, value, unit, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; unit: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
}) {
  const cls = {
    primary: "text-gc-700 bg-gc-50 border-gc-200",
    success: "text-emerald-700 bg-emerald-50 border-emerald-200",
    warning: "text-amber-800 bg-amber-50 border-amber-200",
    danger: "text-red-800 bg-red-50 border-red-200",
    muted: "text-muted-foreground bg-muted/50 border-border",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
