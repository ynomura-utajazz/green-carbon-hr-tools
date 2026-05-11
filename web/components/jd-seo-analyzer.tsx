"use client";

/**
 * JD SEO アナライザ：JD テキストとターゲットスキルを入力 → チャネル別 visibility スコア + キーワード分析。
 *
 * デザイン：
 *  - 上段：チャネルごとの円形メーター（Wantedly / LinkedIn / Indeed）
 *  - 中段：必須キーワードのヒット状況テーブル
 *  - 下段：チャネル別チェックリスト（タブ切替）
 *
 * 純関数なので、JD を編集すると即座にスコア更新。
 */

import { useState, useMemo } from "react";
import {
  TrendingUp, CheckCircle2, AlertTriangle, XCircle, Eye, BadgeAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  analyzeJd, CHANNEL_LABELS, type Channel, type JdSeoAnalysis,
} from "@/lib/recruiting/jd-seo";

type Props = {
  jdText: string;
  requiredSkills: string[];
};

export function JdSeoAnalyzer({ jdText, requiredSkills }: Props) {
  const [activeChannel, setActiveChannel] = useState<Channel>("wantedly");

  const analysis: JdSeoAnalysis = useMemo(
    () => analyzeJd(jdText, requiredSkills),
    [jdText, requiredSkills],
  );

  const activeChannelData = analysis.channels.find((c) => c.channel === activeChannel);

  if (!jdText.trim()) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        JD を生成または貼り付けると、各チャネルでの可視性スコアが自動計算されます
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 上段：3 チャネルメーター */}
      <div className="grid gap-3 sm:grid-cols-3">
        {analysis.channels.map((ch) => (
          <button
            key={ch.channel}
            onClick={() => setActiveChannel(ch.channel)}
            className={cn(
              "rounded-md border p-3 text-left transition-all",
              activeChannel === ch.channel
                ? "border-gc-500 bg-gc-50/50 shadow-sm"
                : "bg-background hover:border-gc-300 hover:bg-muted/30",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{CHANNEL_LABELS[ch.channel]}</span>
              <ScoreIcon score={ch.score} />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={cn(
                "font-mono text-3xl font-bold tabular-nums leading-none",
                ch.score >= 75 ? "text-emerald-600"
                  : ch.score >= 50 ? "text-amber-600" : "text-red-600",
              )}>
                {ch.score}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all",
                  ch.score >= 75 ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                    : ch.score >= 50 ? "bg-gradient-to-r from-amber-400 to-amber-600"
                    : "bg-gradient-to-r from-red-400 to-red-600",
                )}
                style={{ width: `${ch.score}%` }}
              />
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {ch.summary}
            </p>
          </button>
        ))}
      </div>

      {/* 全体ストック */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
          <Stat label="文字数" value={`${analysis.total_chars}`} unit="字" />
          <Stat label="読了時間（目安）" value={`${Math.round(analysis.reading_time_sec / 60 * 10) / 10}`} unit="分" />
          <Stat label="招くフレーズ" value={`${analysis.invitational_phrases}`} unit="個" tone={analysis.invitational_phrases >= 3 ? "ok" : "warn"} />
          <Stat label="NG 表現" value={`${analysis.ng_phrases.length}`} unit="件" tone={analysis.ng_phrases.length === 0 ? "ok" : "danger"} />
        </CardContent>
      </Card>

      {/* NG 警告 */}
      {analysis.ng_phrases.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <BadgeAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-semibold">バイアスを生む可能性のある表現を検出</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {analysis.ng_phrases.map((p) => (
                <span key={p.phrase} className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[11px]">
                  「{p.phrase}」 × {p.count}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-red-700">
              年齢・性別を匂わせる表現は法的にも採用機会の損失にもなります
            </p>
          </div>
        </div>
      )}

      {/* キーワード分析 */}
      {analysis.required_keywords.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <Eye className="size-3.5 text-gc-700" />
              必須スキル × 本文ヒット状況
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {analysis.required_keywords.map((kw) => (
                <span
                  key={kw.keyword}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                    kw.ok
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-amber-300 bg-amber-50 text-amber-800",
                  )}
                >
                  {kw.ok
                    ? <CheckCircle2 className="size-3" />
                    : <AlertTriangle className="size-3" />}
                  {kw.keyword}
                  <span className="font-mono text-[10px] tabular-nums">
                    × {kw.count}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              本文に 1 回以上出現していれば検索インデックスに乗りやすくなります
            </p>
          </CardContent>
        </Card>
      )}

      {/* チャネル別チェックリスト */}
      {activeChannelData && (
        <Card>
          <CardContent className="p-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <TrendingUp className="size-3.5 text-gc-700" />
              {CHANNEL_LABELS[activeChannel]} の改善ポイント
            </h3>
            <ul className="space-y-1.5">
              {activeChannelData.checks.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-start gap-2 rounded-md p-2 text-xs",
                    c.ok ? "bg-emerald-50/40" : "bg-amber-50/40",
                  )}
                >
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={c.ok ? "" : "font-medium"}>{c.label}</span>
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                        重み {Math.round(c.weight * 100)}%
                      </span>
                    </div>
                    {c.hint && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        💡 {c.hint}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScoreIcon({ score }: { score: number }) {
  if (score >= 75) return <CheckCircle2 className="size-4 text-emerald-600" />;
  if (score >= 50) return <AlertTriangle className="size-4 text-amber-600" />;
  return <XCircle className="size-4 text-red-600" />;
}

function Stat({ label, value, unit, tone }: {
  label: string; value: string; unit: string; tone?: "ok" | "warn" | "danger";
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-0.5">
        <span className={cn(
          "text-lg font-bold tabular-nums",
          tone === "ok" && "text-emerald-700",
          tone === "warn" && "text-amber-700",
          tone === "danger" && "text-red-700",
        )}>{value}</span>
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
