"use client";

/**
 * /comp-bands
 *
 * 報酬グレード × ロール × 拠点の市場ベンチマーク連動分析。
 *  - グレードレンジテーブル（自社 vs 市場 25/50/75 percentile）
 *  - 市場ポジション判定（Lead / Match / Lag / Deep Lag）
 *  - レンジバー（市場 25-75 percentile + 自社 min-mid-max を重ね描き）
 *  - 改善推奨（Deep Lag 解消の優先度）
 */

import { useMemo, useState } from "react";
import {
  Coins, AlertTriangle, TrendingUp, Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_COMP_BANDS, ROLE_LABEL, REGION_LABEL, POSITION_META, marketPosition,
  type RoleFamily, type Region, type Grade,
} from "@/lib/demo/comp-bands";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const fmtJpy = (n: number) =>
  n >= 100_000_000 ? `¥${(n / 100_000_000).toFixed(2)}億`
  : n >= 10_000   ? `¥${(n / 10_000).toFixed(0)}万`
  : `¥${n.toLocaleString()}`;

export default function CompBandsPage() {
  const [role, setRole] = useState<RoleFamily | "all">("engineering");
  const [region, setRegion] = useState<Region | "all">("JP");

  const filtered = useMemo(() => {
    return DEMO_COMP_BANDS.filter((b) =>
      (role === "all" || b.role === role) &&
      (region === "all" || b.region === region)
    ).sort((a, b) => {
      // グレード順
      const order: Grade[] = ["S2", "S3", "S4", "S5", "M3", "M4", "M5", "EX"];
      return order.indexOf(a.grade) - order.indexOf(b.grade);
    });
  }, [role, region]);

  // 全バンドの市場ポジション集計
  const positionStats = useMemo(() => {
    const stats = { lead: 0, match: 0, lag: 0, deep_lag: 0 };
    for (const b of filtered) {
      stats[marketPosition(b)]++;
    }
    return stats;
  }, [filtered]);

  const lagBands = filtered.filter((b) => {
    const p = marketPosition(b);
    return p === "lag" || p === "deep_lag";
  });

  // 全レンジの最大値（バー描画のスケール用）
  const globalMax = Math.max(
    ...filtered.flatMap((b) => [b.internal_max, b.market_p75])
  );

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Coins className="size-6 text-gc-700" />
          報酬グレード制度
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          自社レンジ × 市場ベンチマーク（25/50/75 percentile）でグレードの市場ポジションを判定
        </p>
      </div>

      {/* フィルタ */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              ロール
            </span>
            <Select value={role} onValueChange={(v) => setRole(v as RoleFamily | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ロール</SelectItem>
                {(Object.keys(ROLE_LABEL) as RoleFamily[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              拠点
            </span>
            <Select value={region} onValueChange={(v) => setRegion(v as Region | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全拠点</SelectItem>
                {(Object.keys(REGION_LABEL) as Region[]).map((r) => (
                  <SelectItem key={r} value={r}>{REGION_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ポジション集計 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PosKpi label="🚀 Lead" value={positionStats.lead} total={filtered.length} cls="bg-emerald-50/40 border-emerald-200" />
        <PosKpi label="⚖️ Match" value={positionStats.match} total={filtered.length} cls="bg-blue-50/40 border-blue-200" />
        <PosKpi label="⚠️ Lag" value={positionStats.lag} total={filtered.length} cls="bg-amber-50/40 border-amber-200" />
        <PosKpi label="🚨 Deep Lag" value={positionStats.deep_lag} total={filtered.length} cls="bg-red-50/40 border-red-200" />
      </div>

      {/* Lag 警告 */}
      {lagBands.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="size-5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm">市場より低いバンドを検出</h3>
              <p className="mt-1 text-xs leading-relaxed">
                {lagBands.length} 件のグレード × ロール × 拠点で市場 P50 比 95% 未満。
                該当グレードの離職率と相関を確認し、年内の見直し計画を推奨。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* グレードレンジ可視化 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <TrendingUp className="size-4 text-gc-700" />
            グレード別 自社 vs 市場ベンチマーク
          </h2>
          {filtered.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              該当するバンドがありません
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((b) => {
                const pos = marketPosition(b);
                const meta = POSITION_META[pos];
                return (
                  <li key={`${b.role}-${b.region}-${b.grade}`} className="space-y-1.5 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-base font-bold">{b.grade}</span>
                        <span className="text-xs text-muted-foreground">{ROLE_LABEL[b.role]}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{REGION_LABEL[b.region]}</span>
                      </div>
                      <Badge variant="outline" className={cn("border text-[10px]", meta.cls)}>
                        {meta.emoji} {meta.label}
                      </Badge>
                    </div>

                    {/* レンジバー：市場 25-75 percentile（薄）+ 自社 min-max（濃 gc）を重ね */}
                    <RangeBar band={b} globalMax={globalMax} />

                    <div className="grid grid-cols-2 gap-3 text-[11px] tabular-nums">
                      <div className="rounded-md bg-gc-50/50 p-1.5">
                        <div className="text-[9px] uppercase tracking-wider text-gc-700">自社</div>
                        <div className="font-mono">
                          {fmtJpy(b.internal_min)} 〜 <strong>{fmtJpy(b.internal_mid)}</strong> 〜 {fmtJpy(b.internal_max)}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/30 p-1.5">
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">市場（P25 / P50 / P75）</div>
                        <div className="font-mono text-muted-foreground">
                          {fmtJpy(b.market_p25)} 〜 <strong>{fmtJpy(b.market_p50)}</strong> 〜 {fmtJpy(b.market_p75)}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      自社 mid / 市場 P50 比：
                      <strong className={cn(
                        "ml-1 font-mono",
                        pos === "lead"     && "text-emerald-700",
                        pos === "match"    && "text-blue-700",
                        pos === "lag"      && "text-amber-700",
                        pos === "deep_lag" && "text-red-700",
                      )}>
                        {((b.internal_mid / b.market_p50) * 100).toFixed(0)}%
                      </strong>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 推奨アクション */}
      {lagBands.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Filter className="size-4 text-gc-700" />
              改善優先度（Lag バンド）
            </h2>
            <ul className="space-y-2">
              {[...lagBands].sort((a, b) => {
                // deep_lag を上位に
                const pa = marketPosition(a), pb = marketPosition(b);
                return (pa === "deep_lag" ? -1 : 0) - (pb === "deep_lag" ? -1 : 0);
              }).map((b) => {
                const pos = marketPosition(b);
                const gap = b.market_p50 - b.internal_mid;
                return (
                  <li key={`fix-${b.grade}-${b.role}-${b.region}`} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                    <Badge variant="outline" className={cn("border text-[10px]", POSITION_META[pos].cls)}>
                      {POSITION_META[pos].emoji} {POSITION_META[pos].label}
                    </Badge>
                    <span className="font-mono text-xs">{b.grade}</span>
                    <span className="text-xs">{ROLE_LABEL[b.role]} / {REGION_LABEL[b.region]}</span>
                    <span className="ml-auto text-xs">
                      mid を <strong className="font-mono text-amber-700">+{fmtJpy(gap)}</strong> 引き上げで Match 達成
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 市場ベンチマークは Robert Walters / Levels.fyi / OpenWork の集計を四半期更新で取り込む想定。
        Deep Lag → Lag → Match → Lead を段階的に。離職率（エンゲージメント深掘り）と連動させて優先順位を決めると効果的です。
      </div>
    </div>
  );
}

function RangeBar({ band: b, globalMax }: { band: typeof DEMO_COMP_BANDS[number]; globalMax: number }) {
  const scale = (n: number) => `${(n / globalMax) * 100}%`;

  return (
    <div className="relative h-7 rounded-md bg-muted/40">
      {/* 市場レンジ（P25-P75） */}
      <div
        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-200 to-blue-300"
        style={{
          left: scale(b.market_p25),
          width: scale(b.market_p75 - b.market_p25),
        }}
        title={`市場 P25-P75: ${b.market_p25.toLocaleString()} - ${b.market_p75.toLocaleString()}`}
      />
      {/* 市場 P50 マーク */}
      <div
        className="absolute top-0 h-full w-0.5 bg-blue-700"
        style={{ left: scale(b.market_p50) }}
        title={`市場 P50: ${b.market_p50.toLocaleString()}`}
      />
      {/* 自社レンジ（min-max） */}
      <div
        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-md border-2 border-gc-700 bg-gc-100/70"
        style={{
          left: scale(b.internal_min),
          width: scale(b.internal_max - b.internal_min),
        }}
        title={`自社 ${b.internal_min.toLocaleString()} - ${b.internal_max.toLocaleString()}`}
      />
      {/* 自社 mid マーク */}
      <div
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gc-800 bg-gc-600"
        style={{ left: scale(b.internal_mid) }}
        title={`自社 mid: ${b.internal_mid.toLocaleString()}`}
      />
    </div>
  );
}

function PosKpi({ label, value, total, cls }: {
  label: string; value: number; total: number; cls: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Card className={cn("border", cls)}>
      <CardContent className="p-3">
        <div className="text-xs">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">/ {total} ({pct}%)</span>
        </div>
      </CardContent>
    </Card>
  );
}
