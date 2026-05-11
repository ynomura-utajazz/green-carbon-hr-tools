"use client";

import { useEffect, useState, useCallback } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

type Shortcut = {
  keys: string[];
  description: string;
};

type Group = {
  title: string;
  items: Shortcut[];
};

const GROUPS: Group[] = [
  {
    title: "ナビゲーション",
    items: [
      { keys: ["⌘", "K"], description: "コマンドパレットを開く（ツール・社員・ドキュメントを横断検索）" },
      { keys: ["?"], description: "このキーボードショートカット一覧を表示" },
      { keys: ["Esc"], description: "ダイアログ・サイドシートを閉じる" },
    ],
  },
  {
    title: "メッセージ",
    items: [
      { keys: ["⌘", "K"], description: "→「Slack で DM を送る」でクイック DM ダイアログを開く" },
      { keys: ["⌘", "Enter"], description: "DM 入力中にメッセージを送信" },
    ],
  },
  {
    title: "テーマ",
    items: [
      { keys: ["ヘッダ右上"], description: "ライト ↔ ダーク ↔ システムを切り替え" },
    ],
  },
];

// Detect input/editable focus to avoid hijacking typing
function isTypingInForm(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  const handleKey = useCallback((e: KeyboardEvent) => {
    // ⌘K already wired by command palette; we listen only for "?"
    if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingInForm(e.target)) return;
    e.preventDefault();
    setOpen((v) => !v);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4 text-gc-700" />
            キーボードショートカット
          </DialogTitle>
          <DialogDescription>
            画面上のどこからでも <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">?</kbd> を押すとこの一覧が開きます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.title}
              </h3>
              <ul className="divide-y rounded-md border">
                {g.items.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm">{s.description}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-foreground"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
