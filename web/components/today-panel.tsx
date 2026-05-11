"use client";

import Link from "next/link";
import {
  CalendarDays, Video, Users, FileCheck2, Clock, ChevronRight,
  Briefcase, GraduationCap, Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";
import {
  DEMO_TODAY_EVENTS, DEMO_ACTIVITY,
  type TodayEvent,
} from "@/lib/demo/notifications";

const KIND_ICON: Record<TodayEvent["kind"], typeof Users> = {
  oneonone: Users,
  interview: Briefcase,
  meeting: CalendarDays,
  deadline: FileCheck2,
  training: GraduationCap,
};

const KIND_TONE: Record<TodayEvent["kind"], string> = {
  oneonone: "border-l-gc-500 bg-gc-50/40",
  interview: "border-l-blue-500 bg-blue-50/40",
  meeting: "border-l-purple-500 bg-purple-50/40",
  deadline: "border-l-red-500 bg-red-50/40",
  training: "border-l-amber-500 bg-amber-50/40",
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

export function TodayPanel() {
  const events = [...DEMO_TODAY_EVENTS].sort((a, b) => a.start.localeCompare(b.start));
  const now = Date.now();

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-gc-500/10 via-background to-background px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-gc-600 text-white">
            <CalendarDays className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">今日の予定</h3>
            <p className="text-[11px] text-muted-foreground">{events.length} 件のイベント</p>
          </div>
        </div>
        <Link
          href="/oneonone"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          すべて <ChevronRight className="inline size-3" />
        </Link>
      </div>

      <ul className="divide-y">
        {events.map((e, i) => {
          const Icon = KIND_ICON[e.kind];
          const startMs = new Date(e.start).getTime();
          const isUpcoming = startMs > now;
          const isImminent = isUpcoming && startMs - now < 30 * 60_000;
          const isPast = startMs + e.duration_minutes * 60_000 < now;

          return (
            <li
              key={e.id}
              className={cn(
                "border-l-2 px-4 py-3 transition-colors hover:bg-accent/40",
                KIND_TONE[e.kind],
                isPast && "opacity-50",
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="flex w-12 shrink-0 flex-col items-center text-center">
                  <span className="text-sm font-bold tabular-nums">{fmtTime(e.start)}</span>
                  {e.duration_minutes > 0 && (
                    <span className="text-[10px] text-muted-foreground">{e.duration_minutes}分</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{e.title}</span>
                    {isImminent && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-gc-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        <Sparkles className="size-2.5" />
                        soon
                      </span>
                    )}
                  </div>
                  {e.participants.length > 0 && (
                    <div className="mt-1 flex items-center gap-1">
                      <div className="flex -space-x-1.5">
                        {e.participants.slice(0, 3).map((p) => (
                          <Avatar key={p} className="size-5 border-2 border-background">
                            <AvatarFallback className="text-[8px]">{initials(p)}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {e.participants.length === 1 ? e.participants[0] : `${e.participants[0]} ほか ${e.participants.length - 1} 名`}
                      </span>
                    </div>
                  )}
                </div>
                {e.meet_url && isUpcoming && (
                  <a
                    href={e.meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 transition-colors hover:bg-emerald-100"
                  >
                    <Video className="inline size-3" /> 参加
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function ActivityFeed() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold tracking-tight">最近の動き</h3>
        </div>
      </div>
      <ul className="max-h-[360px] divide-y overflow-y-auto">
        {DEMO_ACTIVITY.map((a, i) => {
          const Wrapper: React.ElementType = a.href ? Link : "div";
          const wrapperProps = a.href ? { href: a.href } : {};
          return (
            <li key={a.id} style={{ animationDelay: `${i * 50}ms` }}>
              <Wrapper
                {...wrapperProps}
                className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40"
              >
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback className="text-[10px]">{initials(a.actor_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{a.actor_name}</span>
                    <span className="text-muted-foreground"> が {a.verb} </span>
                    <span>{a.target}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {relativeTimeMin(a.created_at)}
                  </p>
                </div>
              </Wrapper>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function relativeTimeMin(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const m = Math.abs(Math.round(diff / 60));
  if (m < 1) return "たった今";
  if (m < 60) return `${m} 分前`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} 時間前`;
  const d = Math.round(h / 24);
  return `${d} 日前`;
}
