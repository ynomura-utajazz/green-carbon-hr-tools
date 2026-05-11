"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell, AtSign, Clock, FileCheck2, AlertTriangle, PartyPopper, Settings2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { relativeTime, cn } from "@/lib/utils";
import {
  DEMO_NOTIFICATIONS, KIND_META,
  type DemoNotification, type NotificationKind,
} from "@/lib/demo/notifications";

const ICONS: Record<NotificationKind, typeof Bell> = {
  mention: AtSign,
  reminder: Clock,
  approval: FileCheck2,
  alert: AlertTriangle,
  celebration: PartyPopper,
  system: Settings2,
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DemoNotification[]>(DEMO_NOTIFICATIONS);
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((xs) => xs.map((x) => ({ ...x, read: true })));
  const markRead = (id: string) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read: true } : x)));

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`通知 ${unread} 件`}
        onClick={() => setOpen(true)}
        className="relative"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md" showClose={false}>
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 p-4 backdrop-blur">
            <Bell className="size-4 text-gc-700" />
            <SheetTitle className="flex-1 text-base font-semibold">通知</SheetTitle>
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="gap-1 text-xs">
                <Check className="size-3" />
                全て既読
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="閉じる">
              <span className="sr-only">閉じる</span>
              ×
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Bell className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">通知はありません</p>
                <p className="text-xs text-muted-foreground">新しいアクションがあるとここに表示されます</p>
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => {
                  const Icon = ICONS[n.kind];
                  const meta = KIND_META[n.kind];
                  const Wrapper: React.ElementType = n.href ? Link : "div";
                  const wrapperProps = n.href ? { href: n.href } : {};
                  return (
                    <li key={n.id} className={cn("relative", !n.read && "bg-gc-50/40")}>
                      {!n.read && (
                        <span className="absolute left-2 top-5 size-1.5 rounded-full bg-gc-600" aria-label="未読" />
                      )}
                      <Wrapper
                        {...wrapperProps}
                        onClick={() => {
                          markRead(n.id);
                          if (n.href) setOpen(false);
                        }}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                      >
                        <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", meta.bg, meta.color)}>
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", meta.color)}>
                              {meta.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground">
                              {relativeTime(n.created_at)}
                            </span>
                          </div>
                          <p className={cn("mt-0.5 text-sm", !n.read && "font-medium")}>{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                        </div>
                      </Wrapper>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t bg-muted/30 p-3 text-center text-xs text-muted-foreground">
            通知設定はプロフィールから変更できます
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
