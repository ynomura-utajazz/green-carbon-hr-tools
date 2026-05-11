"use client";

import { useEffect, useState } from "react";
import {
  Plug, CheckCircle2, AlertCircle, XCircle, RefreshCw, Loader2,
  ExternalLink, Copy, Check, Unplug, Webhook, Settings2, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/lib/integrations/types";
import type { ServiceEnvCheck, EnvCheckItem } from "@/lib/integrations/env-check";

const SERVICE_LABEL: Record<string, { name: string; install?: string }> = {
  slack: { name: "Slack", install: "/api/integrations/slack/install" },
  google_calendar: { name: "Google Calendar", install: "/api/integrations/google/install" },
  google_sso: { name: "Google Workspace SSO" },
  freee: { name: "freee 人事労務", install: "/api/integrations/freee/install" },
};

export function AdminIntegrationsClient({
  envChecks, baseUrl, demo,
}: {
  envChecks: ServiceEnvCheck[];
  baseUrl: string;
  demo: boolean;
}) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      const json = (await res.json()) as { services: ServiceStatus[] };
      setServices(json.services ?? []);
    } catch {
      // keep
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const disconnect = async (id: ServiceStatus["id"]) => {
    if (id === "google_sso") return;
    if (!confirm(`${SERVICE_LABEL[id]?.name ?? id} の連携を解除しますか？`)) return;
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
        toast.error("解除に失敗", { description: json.error });
      }
    } catch (e) {
      toast.error("解除に失敗", { description: (e as Error).message });
    }
  };

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
      toast.success("コピーしました");
    } catch {
      toast.error("コピーできませんでした");
    }
  };

  const eventsUrl = `${baseUrl}/api/integrations/slack/events`;

  return (
    <div className="space-y-6">
      {/* ── ヘッダ ──────────────────────── */}
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Plug className="size-6 text-gc-700" />
            連携サービス管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Slack / Google Workspace / freee の OAuth 接続・環境変数・Webhook 設定
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          再確認
        </Button>
      </div>

      {demo && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          🟡 デモモード中：表示は固定値です。本番運用時は{" "}
          <code className="font-mono text-xs">.env.local</code> を設定し、
          <code className="font-mono text-xs">NEXT_PUBLIC_DEMO_MODE=false</code> で再起動してください。
        </div>
      )}

      {/* ── 接続状態カード ─────────────── */}
      <section className="space-y-3">
        <SectionHeader icon={ShieldCheck} title="接続状態" hint="ライブ ping" />
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((s) => (
            <ConnectionCard key={s.id} status={s} onDisconnect={() => disconnect(s.id)} />
          ))}
          {services.length === 0 && loading && (
            <div className="col-span-full rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
              状態を取得中...
            </div>
          )}
        </div>
      </section>

      {/* ── env チェックリスト ─────────── */}
      <section className="space-y-3">
        <SectionHeader icon={Settings2} title="環境変数チェック" hint=".env.local の設定状況" />
        <div className="grid gap-3 md:grid-cols-2">
          {envChecks.map((c) => (
            <EnvCard key={c.service} check={c} />
          ))}
        </div>
      </section>

      {/* ── Webhook URL ──────────────── */}
      <section className="space-y-3">
        <SectionHeader icon={Webhook} title="Webhook URL" hint="Slack App / freee に登録する公開エンドポイント" />
        <Card>
          <CardContent className="space-y-3 p-4">
            <UrlRow
              label="Slack Event Subscriptions Request URL"
              url={eventsUrl}
              copied={copied === "slack-events"}
              onCopy={() => copy("slack-events", eventsUrl)}
              hint="Slack App 設定の Event Subscriptions に貼り付け。Slack が url_verification を打ってきます。"
            />
            <UrlRow
              label="Slack OAuth Redirect URL"
              url={`${baseUrl}/api/integrations/slack/callback`}
              copied={copied === "slack-callback"}
              onCopy={() => copy("slack-callback", `${baseUrl}/api/integrations/slack/callback`)}
              hint="Slack App > OAuth & Permissions > Redirect URLs"
            />
            <UrlRow
              label="Google OAuth Redirect URL"
              url={`${baseUrl}/api/integrations/google/callback`}
              copied={copied === "google-callback"}
              onCopy={() => copy("google-callback", `${baseUrl}/api/integrations/google/callback`)}
              hint="Google Cloud Console > Credentials > 承認済みリダイレクトURI"
            />
            <UrlRow
              label="freee OAuth Redirect URL"
              url={`${baseUrl}/api/integrations/freee/callback`}
              copied={copied === "freee-callback"}
              onCopy={() => copy("freee-callback", `${baseUrl}/api/integrations/freee/callback`)}
              hint="freee 開発者ダッシュボード > アプリの設定 > コールバックURL"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ── 部品 ───────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <span className="text-xs text-muted-foreground">— {hint}</span>}
    </div>
  );
}

function ConnectionCard({
  status, onDisconnect,
}: {
  status: ServiceStatus;
  onDisconnect: () => void;
}) {
  const meta = SERVICE_LABEL[status.id] ?? { name: status.id };
  const tone = {
    connected: "border-emerald-200 bg-emerald-50/30",
    disconnected: "border-border bg-background",
    error: "border-red-200 bg-red-50/30",
  }[status.status];

  return (
    <Card className={cn("transition-colors", tone)}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{status.name}</span>
              <StatusBadge status={status.status} />
            </div>
            {status.connectedAs && (
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {status.connectedAs}
              </div>
            )}
          </div>
          {status.status === "connected" && typeof status.latencyMs === "number" && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {status.latencyMs}ms
            </span>
          )}
        </div>

        {status.error && (
          <div className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
            {status.error}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            最終確認:{" "}
            {status.checkedAt
              ? new Date(status.checkedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              : "—"}
          </span>
          <div className="flex gap-1">
            {status.status !== "connected" && meta.install && (
              <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-[11px]" asChild>
                <a href={meta.install}>
                  接続
                </a>
              </Button>
            )}
            {status.status === "connected" && status.id !== "google_sso" && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-red-700"
                onClick={onDisconnect}
              >
                <Unplug className="size-3" />
                解除
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "connected" | "disconnected" | "error" }) {
  if (status === "connected") {
    return (
      <Badge variant="success" className="gap-0.5 text-[10px]">
        <CheckCircle2 className="size-2.5" />
        接続中
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="danger" className="gap-0.5 text-[10px]">
        <XCircle className="size-2.5" />
        エラー
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-0.5 text-[10px] text-muted-foreground">
      未接続
    </Badge>
  );
}

function EnvCard({ check }: { check: ServiceEnvCheck }) {
  const allRequiredOk = check.items.filter((i) => i.required).every((i) => i.ok);
  const tone = allRequiredOk
    ? "border-emerald-200 bg-emerald-50/30"
    : "border-amber-200 bg-amber-50/30";

  return (
    <Card className={cn(tone)}>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">{check.name}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
              allRequiredOk
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800",
            )}
          >
            {check.readiness}%
          </span>
        </div>
        <ul className="space-y-1">
          {check.items.map((it) => (
            <EnvLine key={it.key} item={it} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function EnvLine({ item }: { item: EnvCheckItem }) {
  const Icon = item.ok
    ? CheckCircle2
    : item.required
      ? AlertCircle
      : XCircle;
  const colorCls = item.ok
    ? "text-emerald-700"
    : item.required
      ? "text-amber-700"
      : "text-muted-foreground";
  return (
    <li className="flex items-start gap-2 text-xs">
      <Icon className={cn("mt-0.5 size-3.5 shrink-0", colorCls)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn(item.ok ? "" : "text-muted-foreground")}>{item.label}</span>
          {!item.required && !item.ok && (
            <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">任意</span>
          )}
        </div>
        <code className="font-mono text-[10px] text-muted-foreground">{item.key}</code>
      </div>
    </li>
  );
}

function UrlRow({
  label, url, hint, copied, onCopy,
}: {
  label: string;
  url: string;
  hint?: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs font-semibold">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted/60 px-2 py-1 font-mono text-[11px]">{url}</code>
        <Button
          variant="outline"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2 text-[11px]"
          onClick={onCopy}
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-600" />
              コピー済
            </>
          ) : (
            <>
              <Copy className="size-3" />
              コピー
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" className="h-7 shrink-0 px-2" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="開く">
            <ExternalLink className="size-3" />
          </a>
        </Button>
      </div>
    </div>
  );
}
