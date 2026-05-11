"use client";

/**
 * クイック DM ダイアログ：社員を選んで Slack DM を即送信。
 *
 * トリガー：
 *   - コマンドパレットの「Slack で DM」項目から `gc:open-quick-dm` イベント発行
 *   - 直接：window.dispatchEvent(new CustomEvent("gc:open-quick-dm", { detail: { employeeId } }))
 *
 * 送信フロー（lib/slack.ts と同じ）：
 *   1. /api/integrations/slack/dm を叩く
 *   2. 失敗 or fallback="url" → slack:// URL へフォールバック
 */

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Search, AtSign } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_EMPLOYEES, type DemoEmployee } from "@/lib/demo/employees";
import { openSlackDm } from "@/lib/slack";
import { initials, cn } from "@/lib/utils";

const QUICK_TEMPLATES: { label: string; body: string }[] = [
  {
    label: "1on1 リマインダー",
    body: "明日の 1on1 ですが、何か事前に話しておきたい議題はありますか？",
  },
  {
    label: "面談調整",
    body: "ちょっと相談したいことがあるのですが、今週で 30 分時間取れそうな日ありますか？",
  },
  {
    label: "サンクス",
    body: "先日の件、本当にありがとうございました！ 助かりました 🙏",
  },
];

type OpenDetail = { employeeId?: string };

export function QuickDmDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DemoEmployee | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // event 経由で外から開く
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail>).detail ?? {};
      if (detail.employeeId) {
        const emp = DEMO_EMPLOYEES.find((x) => x.id === detail.employeeId);
        if (emp) setSelected(emp);
      }
      setOpen(true);
    };
    window.addEventListener("gc:open-quick-dm", handler);
    return () => window.removeEventListener("gc:open-quick-dm", handler);
  }, []);

  // ダイアログを閉じたら状態リセット
  useEffect(() => {
    if (!open) {
      setQuery("");
      setMessage("");
      setSelected(null);
      setSending(false);
    } else if (selected) {
      // 開いた時に textarea にフォーカス（受信者が決まっていれば）
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open, selected]);

  const candidates = DEMO_EMPLOYEES
    .filter((e) => e.status === "active" && e.slack_user_id)
    .filter((e) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return [e.full_name, e.full_name_kana, e.display_name_en, e.email, e.job_title]
        .filter((s): s is string => Boolean(s))
        .some((s) => s.toLowerCase().includes(q));
    })
    .slice(0, 8);

  const handleSend = async () => {
    if (!selected || !message.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/integrations/slack/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slackUserId: selected.slack_user_id,
          email: selected.email,
          text: message,
        }),
      });
      const json = (await res.json()) as
        | { ok: true; channelId: string }
        | { ok: false; fallback?: "url"; error?: string };

      if (json.ok) {
        toast.success(`${selected.full_name} さんに DM を送信しました`);
        setOpen(false);
        return;
      }

      // フォールバック：URL ハック
      try {
        await navigator.clipboard.writeText(message);
      } catch {
        /* ignore */
      }
      if (selected.slack_user_id) {
        openSlackDm(selected.slack_user_id);
      }
      toast.message("Slack 未接続のため URL で開きました", {
        description: "本文はクリップボードにコピー済み（Cmd+V で貼り付け）",
      });
      setOpen(false);
    } catch (e) {
      toast.error("送信に失敗しました", { description: (e as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AtSign className="size-4 text-gc-700" />
            クイック DM
          </DialogTitle>
          <DialogDescription>
            Slack で社員にメッセージを送ります。未接続時はクリップボード + Slack 起動にフォールバック。
          </DialogDescription>
        </DialogHeader>

        {/* 受信者選択 */}
        {!selected ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="社員を検索..."
                className="pl-9"
                autoFocus
              />
            </div>
            <ul className="max-h-60 divide-y overflow-y-auto rounded-md border">
              {candidates.map((emp) => (
                <li key={emp.id}>
                  <button
                    onClick={() => setSelected(emp)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[10px]">{initials(emp.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{emp.full_name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {emp.job_title} · {emp.email}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {candidates.length === 0 && (
                <li className="p-4 text-center text-xs text-muted-foreground">該当する社員がいません</li>
              )}
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 rounded-md border bg-muted/30 px-3 py-2">
              <Avatar className="size-8">
                <AvatarFallback className="text-[10px]">{initials(selected.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{selected.full_name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{selected.job_title}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                変更
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setMessage(t.body)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                    message === t.body
                      ? "border-gc-600 bg-gc-50 text-gc-800"
                      : "bg-background text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="メッセージを入力（⌘+Enter で送信）"
              rows={5}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gc-400"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {message.length} 文字
              </span>
              <Button
                onClick={() => void handleSend()}
                disabled={!message.trim() || sending}
                className="gap-1.5"
              >
                {sending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    送信
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
