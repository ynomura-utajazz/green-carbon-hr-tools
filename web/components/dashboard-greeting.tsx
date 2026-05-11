"use client";

import { useEffect, useState } from "react";
import { Sparkles, Calendar } from "lucide-react";

type Props = { name: string };

export function DashboardGreeting({ name }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    // SSR/初期描画では時刻なしで挨拶（ハイドレーション差異を避ける）
    return (
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
            こんにちは、{firstName(name)} さん
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-3.5" />
            ようこそ Green Carbon HR Tools へ
          </p>
        </div>
      </div>
    );
  }

  const h = now.getHours();
  const greeting = h < 5 ? "夜遅くお疲れさまです"
    : h < 11 ? "おはようございます"
    : h < 17 ? "こんにちは"
    : h < 22 ? "こんばんは"
    : "夜分にお疲れさまです";

  const dateLabel = now.toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const week = getISOWeek(now);

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
          {greeting}、{firstName(name)} さん
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" /> {dateLabel}
          </span>
          <span className="text-xs">·</span>
          <span className="text-xs">第 {week} 週</span>
          <span className="text-xs">·</span>
          <span className="inline-flex items-center gap-1 text-xs text-gc-700">
            <Sparkles className="size-3" />
            今週も最高の1週間にしましょう
          </span>
        </p>
      </div>
    </div>
  );
}

function firstName(full: string): string {
  // "野村 裕太" → "野村", "Maria Lopez" → "Maria"
  const parts = full.trim().split(/\s+/);
  return parts[0] || full;
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
