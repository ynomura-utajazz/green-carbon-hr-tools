"use client";

import Link from "next/link";
import {
  MessageSquare, AlertCircle, FileCheck2, Activity, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Stat = {
  id: string;
  label: string;
  value: string | number;
  unit: string;
  hint: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "success" | "warning" | "danger";
};

const STATS: Stat[] = [
  {
    id: "today-1on1",
    label: "今日の1on1",
    value: 1,
    unit: "件",
    hint: "高橋 真由 さん 14:00",
    href: "/oneonone",
    icon: MessageSquare,
    tone: "primary",
  },
  {
    id: "open-actions",
    label: "未完了アクション",
    value: 19,
    unit: "件",
    hint: "うち期限超過 4 件",
    href: "/oneonone",
    icon: FileCheck2,
    tone: "warning",
  },
  {
    id: "stale-1on1",
    label: "2週間超え",
    value: 2,
    unit: "名",
    hint: "佐藤 太郎・串田 和也",
    href: "/oneonone",
    icon: AlertCircle,
    tone: "warning",
  },
  {
    id: "team-mood",
    label: "チーム気分",
    value: "3.9",
    unit: "/ 5.0",
    hint: "前週比 +0.2 ↑",
    href: "/oneonone",
    icon: Activity,
    tone: "success",
  },
];

export function QuickStats() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STATS.map((s, i) => {
        const Icon = s.icon;
        const tone = {
          primary: "text-gc-700 bg-gc-50 border-gc-200",
          success: "text-emerald-700 bg-emerald-50 border-emerald-200",
          warning: "text-amber-800 bg-amber-50 border-amber-200",
          danger: "text-red-800 bg-red-50 border-red-200",
        }[s.tone];
        return (
          <Link
            key={s.id}
            href={s.href as never}
            className="animate-fade-up group relative flex items-start gap-3 overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gc-300 hover:shadow-md"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border", tone)}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums tracking-tight">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.unit}</span>
              </div>
              <div className="mt-1 truncate text-[11px] text-muted-foreground/90">
                {s.hint}
              </div>
            </div>
            <ArrowRight className="size-4 shrink-0 -translate-x-1 text-muted-foreground/40 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-gc-700" />
          </Link>
        );
      })}
    </div>
  );
}
