"use client";

/**
 * 「よく使うツール」パネル（個人別ピン留め）。
 *
 * - 状態は localStorage（"gc.pinnedTools" = string[]、tool.id を保存）
 * - 既定では未ピン → 全ツールから「人気」を初期表示（人事の Top 4）
 * - 各ツールカードにピン外しボタン
 * - 末尾の「+」で全ツールから追加（軽量モーダル風 popover）
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pin, PinOff, Plus, X } from "lucide-react";
import { TOOLS, type ToolDef } from "@/lib/tools";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "gc.pinnedTools";
const DEFAULT_PINS = ["directory", "oneonone", "pulse-survey", "recruiting"];

function readPins(): string[] {
  if (typeof window === "undefined") return DEFAULT_PINS;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (!v) return DEFAULT_PINS;
    const arr = JSON.parse(v) as unknown;
    return Array.isArray(arr) ? (arr as string[]).filter((s) => typeof s === "string") : DEFAULT_PINS;
  } catch {
    return DEFAULT_PINS;
  }
}

function writePins(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* quota / privacy mode → 無視 */
  }
}

export function PinnedTools() {
  const [pins, setPins] = useState<string[]>([]);
  const [adderOpen, setAdderOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPins(readPins());
    setMounted(true);
  }, []);

  const update = (next: string[]) => {
    setPins(next);
    writePins(next);
  };

  const unpin = (id: string) => update(pins.filter((p) => p !== id));
  const pin = (id: string) => {
    if (pins.includes(id)) return;
    update([...pins, id].slice(0, 12));
  };

  const tools: ToolDef[] = pins
    .map((id) => TOOLS.find((t) => t.id === id))
    .filter((t): t is ToolDef => Boolean(t));

  const addable = TOOLS.filter((t) => !pins.includes(t.id) && t.status !== "planned");

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-gc-500/10 via-background to-background px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-gc-700 text-white">
            <Pin className="size-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">よく使うツール</h3>
            <p className="text-[11px] text-muted-foreground">
              {mounted ? `${tools.length} 件ピン留め中` : "—"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setAdderOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Plus className="size-3" />
          追加
        </button>
      </div>

      {adderOpen && (
        <div className="border-b bg-muted/20 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">追加するツールを選択</span>
            <button
              onClick={() => setAdderOpen(false)}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent"
              aria-label="閉じる"
            >
              <X className="size-3" />
            </button>
          </div>
          <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
            {addable.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  pin(t.id);
                  if (addable.length <= 1) setAdderOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] hover:border-gc-400 hover:bg-gc-50"
              >
                <t.icon className="size-3" />
                {t.name}
              </button>
            ))}
            {addable.length === 0 && (
              <span className="text-[11px] text-muted-foreground">追加可能なツールがありません</span>
            )}
          </div>
        </div>
      )}

      {!mounted ? (
        <div className="h-32 animate-pulse bg-muted/30" />
      ) : tools.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          ピン留めツールがありません。「追加」ボタンから登録できます。
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3">
          {tools.map((t) => (
            <li key={t.id} className="group relative">
              <Link
                href={t.href}
                className={cn(
                  "flex h-full flex-col items-start gap-1 rounded-md border bg-card p-2.5 transition-colors hover:border-gc-400 hover:bg-gc-50/40",
                )}
              >
                <div className="flex size-7 items-center justify-center rounded-md bg-gc-100 text-gc-700">
                  <t.icon className="size-3.5" />
                </div>
                <span className="line-clamp-1 text-xs font-medium">{t.name}</span>
              </Link>
              <button
                onClick={() => unpin(t.id)}
                className="absolute right-1 top-1 rounded-full bg-background p-0.5 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-red-600 group-hover:opacity-100"
                aria-label={`${t.name} のピンを外す`}
                title="ピンを外す"
              >
                <PinOff className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
