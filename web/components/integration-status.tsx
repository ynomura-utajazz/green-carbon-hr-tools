"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plug, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Loader2, Unplug, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { ServiceStatus } from "@/lib/integrations/types";

type Integration = {
  id: "slack" | "google_calendar" | "freee" | "google_sso";
  name: string;
  description: string;
  status: "connected" | "disconnected" | "error";
  connectedAs?: string;
  error?: string;
  latencyMs?: number;
  setupUrl?: string;
  brandColor: string;
  Icon: () => React.JSX.Element;
};

const SlackIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4">
    <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
);
const GCalIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4">
    <rect x="3" y="4" width="18" height="17" rx="2" fill="currentColor" opacity="0.15" />
    <rect x="3" y="4" width="18" height="4" rx="2" fill="currentColor" />
    <text x="12" y="17" fontSize="9" fontWeight="700" textAnchor="middle" fill="currentColor">31</text>
  </svg>
);
const FreeeIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4">
    <text x="12" y="16" fontSize="11" fontWeight="800" textAnchor="middle" fill="currentColor">f</text>
  </svg>
);
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const META: Record<Integration["id"], Pick<Integration, "description" | "brandColor" | "Icon" | "setupUrl">> = {
  slack: {
    description: "DM 送信・リマインダー・通知配信",
    brandColor: "#4A154B",
    Icon: SlackIcon,
    setupUrl: "/api/integrations/slack/install",
  },
  google_calendar: {
    description: "1on1・面接・健診のスケジューリング",
    brandColor: "#1A73E8",
    Icon: GCalIcon,
    setupUrl: "/api/integrations/google/install",
  },
  google_sso: {
    description: "シングルサインオン・ディレクトリ同期",
    brandColor: "#4285F4",
    Icon: GoogleIcon,
    setupUrl: "https://admin.google.com/", // Workspace 管理者操作なので外部
  },
  freee: {
    description: "社員マスタ・在留資格・給与の双方向同期",
    brandColor: "#1F8B4C",
    Icon: FreeeIcon,
    setupUrl: "/api/integrations/freee/install",
  },
};

const FALLBACK_LIST: Integration[] = (Object.keys(META) as Integration["id"][]).map((id) => ({
  id,
  name:
    id === "slack" ? "Slack" :
    id === "google_calendar" ? "Google Calendar" :
    id === "google_sso" ? "Google Workspace SSO" : "freee 人事労務",
  status: "disconnected",
  ...META[id],
}));

export function IntegrationStatusButton() {
  const [open, setOpen] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>(FALLBACK_LIST);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState<boolean | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      const json = (await res.json()) as { services: ServiceStatus[]; demo: boolean };
      setDemo(json.demo);
      const merged: Integration[] = (json.services ?? []).map((s) => {
        const id = s.id as Integration["id"];
        const meta = META[id] ?? META.slack;
        return {
          id,
          name: s.name,
          status: s.status,
          connectedAs: s.connectedAs,
          error: s.error,
          latencyMs: s.latencyMs,
          ...meta,
        };
      });
      // Ensure all 4 always present
      const byId = new Map(merged.map((m) => [m.id, m]));
      setIntegrations(FALLBACK_LIST.map((f) => byId.get(f.id) ?? f));
    } catch {
      // keep current state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  // 連携解除アクション。 google_sso は対象外（外部管理）
  const disconnect = async (id: Integration["id"]) => {
    if (id === "google_sso") return;
    if (!confirm(`${id} の連携を解除しますか？`)) return;
    try {
      const res = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: id }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        toast.success("連携を解除しました");
        void refresh();
      } else {
        toast.error("解除に失敗しました", { description: json.error });
      }
    } catch (e) {
      toast.error("解除に失敗しました", { description: (e as Error).message });
    }
  };

  const connected = integrations.filter((i) => i.status === "connected").length;
  const total = integrations.length;
  const allOk = connected === total;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden h-9 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
        title="連携サービスの状態"
      >
        <Plug className="size-3.5" />
        <span>連携</span>
        <span
          className={
            allOk
              ? "rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
              : "rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
          }
        >
          {connected}/{total}
        </span>
      </button>

      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) void refresh(); }}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md" showClose={false}>
          <div className="border-b p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="text-lg font-bold">連携サービス</SheetTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {connected} / {total} 接続済み
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => void refresh()}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-50"
                  aria-label="再確認"
                  title="接続状態を再確認"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                  aria-label="閉じる"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
          <ul className="divide-y">
            {integrations.map((i) => (
              <li key={i.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border"
                    style={{ color: i.brandColor, background: `${i.brandColor}10`, borderColor: `${i.brandColor}30` }}
                  >
                    <i.Icon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{i.name}</span>
                      {i.status === "connected" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700">
                          <CheckCircle2 className="size-3" />
                          接続中
                        </span>
                      )}
                      {i.status === "disconnected" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                          未接続
                        </span>
                      )}
                      {i.status === "error" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-700">
                          <AlertCircle className="size-3" />
                          エラー
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{i.description}</p>
                    {i.connectedAs && (
                      <p className="mt-1 truncate text-xs text-foreground/80">{i.connectedAs}</p>
                    )}
                    {typeof i.latencyMs === "number" && i.status === "connected" && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        遅延 {i.latencyMs}ms
                      </p>
                    )}
                    {i.error && i.status === "error" && (
                      <p className="mt-1 truncate text-xs text-red-700" title={i.error}>
                        {i.error}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {i.status !== "connected" && (() => {
                        const url = i.setupUrl ?? "#";
                        const external = /^https?:\/\//.test(url);
                        return (
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                            <a
                              href={url}
                              {...(external
                                ? { target: "_blank", rel: "noopener noreferrer" }
                                : {})}
                            >
                              {i.status === "error" ? "再設定" : "接続する"}
                              {external && <ExternalLink className="size-3" />}
                            </a>
                          </Button>
                        );
                      })()}
                      {i.status === "connected" && i.id !== "google_sso" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs text-muted-foreground hover:text-red-600"
                          onClick={() => void disconnect(i.id)}
                        >
                          <Unplug className="size-3" />
                          連携解除
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t bg-muted/30 p-4 text-xs text-muted-foreground">
            {demo ? (
              <p>🟡 デモモード中：実際の OAuth 接続状態ではなく、固定値を表示しています。</p>
            ) : (
              <p>
                env の <code className="font-mono text-[11px]">SLACK_BOT_TOKEN</code> /{" "}
                <code className="font-mono text-[11px]">GOOGLE_OAUTH_*</code> /{" "}
                <code className="font-mono text-[11px]">FREEE_*</code> を設定し、
                右上の更新ボタンで再確認してください。
              </p>
            )}
            <Link
              href="/admin/integrations"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 font-medium text-gc-700 hover:underline"
            >
              <Settings2 className="size-3" />
              詳細管理ページを開く
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
