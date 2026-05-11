"use client";

/**
 * /advocacy
 *
 * 社員アドボカシー：外部発信トラッキング。
 *  - 全体 KPI（投稿数 / リーチ / 報奨ポイント）
 *  - リーダーボード（社員別の累積リーチ・ポイント）
 *  - 種別別タイムライン
 *  - トピック別の盛り上がり
 */

import { useMemo, useState } from "react";
import {
  Megaphone, ExternalLink, Trophy, TrendingUp, Filter, ThumbsUp, Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DEMO_ADVOCACY, KIND_META, reachScore, type AdvocacyKind,
} from "@/lib/demo/advocacy";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const fmtNumber = (n: number) =>
  n >= 10_000 ? `${(n / 10_000).toFixed(1)}万`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k`
  : n.toString();

export default function AdvocacyPage() {
  const [kindFilter, setKindFilter] = useState<AdvocacyKind | "all">("all");

  const filtered = useMemo(() =>
    DEMO_ADVOCACY
      .filter((a) => kindFilter === "all" || a.kind === kindFilter)
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()),
  [kindFilter]);

  // 全体 KPI
  const totalPosts = DEMO_ADVOCACY.length;
  const totalReach = DEMO_ADVOCACY.reduce((s, a) => s + reachScore(a), 0);
  const totalRewards = DEMO_ADVOCACY.reduce((s, a) => s + a.reward_points, 0);
  const totalViews = DEMO_ADVOCACY.reduce((s, a) => s + (a.views ?? 0), 0);

  // 社員別ランキング
  const leaderboard = useMemo(() => {
    const map = new Map<string, { posts: number; reach: number; rewards: number; views: number }>();
    for (const a of DEMO_ADVOCACY) {
      const cur = map.get(a.employee_id) ?? { posts: 0, reach: 0, rewards: 0, views: 0 };
      cur.posts += 1;
      cur.reach += reachScore(a);
      cur.rewards += a.reward_points;
      cur.views += a.views ?? 0;
      map.set(a.employee_id, cur);
    }
    return [...map.entries()]
      .map(([eid, v]) => ({ employee_id: eid, ...v }))
      .sort((a, b) => b.reach - a.reach);
  }, []);

  // 種別別カウント
  const kindCounts = useMemo(() => {
    const c = {} as Record<AdvocacyKind, number>;
    for (const k of Object.keys(KIND_META) as AdvocacyKind[]) c[k] = 0;
    for (const a of DEMO_ADVOCACY) c[a.kind] = (c[a.kind] ?? 0) + 1;
    return c;
  }, []);

  // トピック集計
  const topicCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of DEMO_ADVOCACY) {
      for (const t of a.topics) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, []);

  const empById = (id: string) => DEMO_EMPLOYEES.find((e) => e.id === id);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Megaphone className="size-6 text-gc-700" />
          社員アドボカシー
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          社員の外部発信（記事・登壇・ポッドキャスト・OSS）を一元化。リーチと報奨を可視化
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="累計投稿" value={totalPosts} unit="件" />
        <Kpi label="累計閲覧" value={fmtNumber(totalViews)} unit="" tone="primary" />
        <Kpi label="リーチスコア" value={fmtNumber(totalReach)} unit="pt" tone="success" />
        <Kpi label="累計報奨" value={`${totalRewards}`} unit="pt" tone="muted" />
      </div>

      {/* 種別別バー */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">種別別 投稿数</h3>
          <ul className="space-y-1.5">
            {(Object.keys(KIND_META) as AdvocacyKind[]).map((k) => {
              const count = kindCounts[k] ?? 0;
              const max = Math.max(...Object.values(kindCounts));
              const pct = max > 0 ? (count / max) * 100 : 0;
              return (
                <li key={k} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", KIND_META[k].cls)}>
                        {KIND_META[k].emoji} {KIND_META[k].label}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-gc-400 to-gc-600" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* リーダーボード */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Trophy className="size-4 text-gc-700" />
            社員別 リーダーボード（リーチスコア降順）
          </h2>
          <ul className="space-y-2">
            {leaderboard.slice(0, 10).map((row, i) => {
              const e = empById(row.employee_id);
              if (!e) return null;
              return (
                <li key={row.employee_id} className={cn(
                  "flex items-center gap-3 rounded-md border p-2.5",
                  i === 0 && "border-amber-300 bg-amber-50/40",
                  i === 1 && "border-gray-300 bg-gray-50/40",
                  i === 2 && "border-orange-300 bg-orange-50/40",
                )}>
                  <span className="w-7 text-center font-mono text-base font-bold tabular-nums">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">{initials(e.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{e.full_name}</div>
                    <div className="text-[11px] text-muted-foreground">{e.job_title}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-right text-[11px]">
                    <div>
                      <div className="text-muted-foreground">投稿</div>
                      <div className="font-mono font-bold">{row.posts}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">リーチ</div>
                      <div className="font-mono font-bold">{fmtNumber(row.reach)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">ポイント</div>
                      <div className="font-mono font-bold text-amber-700">{row.rewards}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* トピック */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <TrendingUp className="size-4 text-gc-700" />
            人気トピック
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {topicCounts.map(([topic, count]) => (
              <span key={topic} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-1 text-xs">
                {topic}
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">×{count}</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* タイムライン */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b p-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Filter className="size-4 text-gc-700" />
              タイムライン
            </h2>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as AdvocacyKind | "all")}>
              <SelectTrigger className="h-8 w-44 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全種別</SelectItem>
                {(Object.keys(KIND_META) as AdvocacyKind[]).map((k) => (
                  <SelectItem key={k} value={k}>{KIND_META[k].emoji} {KIND_META[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ul className="divide-y">
            {filtered.map((a) => {
              const e = empById(a.employee_id);
              if (!e) return null;
              return (
                <li key={a.id} className="px-3 py-2.5">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-sm">{e.full_name}</span>
                        <Badge variant="outline" className={cn("border text-[10px]", KIND_META[a.kind].cls)}>
                          {KIND_META[a.kind].emoji} {KIND_META[a.kind].label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(a.published_at).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                      <a href={a.url} target="_blank" rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium hover:text-gc-700 hover:underline">
                        {a.title}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        {a.views !== undefined && (
                          <span className="inline-flex items-center gap-0.5">
                            <Eye className="size-3" />
                            <span className="font-mono tabular-nums">{fmtNumber(a.views)}</span>
                          </span>
                        )}
                        {a.reactions !== undefined && (
                          <span className="inline-flex items-center gap-0.5">
                            <ThumbsUp className="size-3" />
                            <span className="font-mono tabular-nums">{a.reactions}</span>
                          </span>
                        )}
                        {a.estimated_audience && (
                          <span>👥 {fmtNumber(a.estimated_audience)} 名</span>
                        )}
                        <span className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 font-mono font-bold text-amber-800">
                          +{a.reward_points} pt
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {a.topics.map((t) => (
                          <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 報奨制度（demo）：1pt = ¥500 の社内ポイント、書籍購入・カンファレンス参加費に充当。
        記事 30-50pt / 登壇 60-100pt / メディア掲載 80-120pt / OSS マージ 30-50pt を基準に。
      </div>
    </div>
  );
}

function Kpi({ label, value, unit, tone }: {
  label: string; value: string | number; unit: string;
  tone?: "primary" | "success" | "muted";
}) {
  const cls = {
    primary: "border-gc-200 bg-gc-50/40",
    success: "border-emerald-200 bg-emerald-50/40",
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
