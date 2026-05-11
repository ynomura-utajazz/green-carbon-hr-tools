"use client";

import { DoorOpen, Users2, ClipboardList, Calendar, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const offboardings = [
  { id: "ob-1", employee_id: "e15", last_day: "2026-06-30", reason: "キャリアアップ転職", handover_pct: 65, exit_done: false, alumni_consent: true },
  { id: "ob-2", employee_id: "e6",  last_day: "2026-07-15", reason: "起業", handover_pct: 30, exit_done: false, alumni_consent: true },
];

const completedExits = [
  { id: "obc-1", employee_id_name: "John Wilson",   last_day: "2025-09-30", reason: "プロジェクト終了", alumni_active: true },
  { id: "obc-2", employee_id_name: "Carlos Mendez", last_day: "2025-12-15", reason: "他社オファー",    alumni_active: false },
];

const handoverItems = [
  { id: "h1", title: "進行中プロジェクトの引き継ぎ", owner: "本人", status: "in_progress" },
  { id: "h2", title: "クライアント関係者へのご挨拶", owner: "本人 + 上長", status: "in_progress" },
  { id: "h3", title: "ドキュメント整備", owner: "本人", status: "pending" },
  { id: "h4", title: "PC・社員証・物品返却", owner: "総務", status: "pending" },
  { id: "h5", title: "アカウント無効化（IT）", owner: "IT", status: "pending" },
  { id: "h6", title: "退職面談（Exit Interview）", owner: "HR", status: "pending" },
  { id: "h7", title: "アルムナイ加入確認", owner: "HR", status: "pending" },
  { id: "h8", title: "源泉徴収票・離職票の発行", owner: "経理", status: "pending" },
];

const empMap = new Map(DEMO_EMPLOYEES.map((e) => [e.id, e]));

export default function OffboardingPage() {
  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <DoorOpen className="size-6 text-gc-700" />
            オフボーディング
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            退職手続き・引き継ぎ・退職面談・アルムナイ移行までを一元管理。
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          退職プロセス開始
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="進行中" value={offboardings.length} unit="名" icon={Users2} tone="warning" />
        <KpiTile label="今月の最終日" value={1} unit="名" icon={Calendar} tone="primary" />
        <KpiTile label="平均引継率" value="48%" unit="" icon={ClipboardList} tone="muted" />
        <KpiTile label="今期 退職完了" value={2} unit="名" icon={DoorOpen} tone="muted" />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">進行中の退職プロセス</h3>
          <ul className="space-y-2">
            {offboardings.map((o) => {
              const e = empMap.get(o.employee_id);
              if (!e) return null;
              return (
                <li key={o.id} className="rounded-md border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9"><AvatarFallback>{initials(e.full_name)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{e.full_name}</span>
                        <Badge variant="warning">退職予定</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        最終出社日: {formatDate(o.last_day)} · 理由: {o.reason}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">引継</div>
                      <div className="text-lg font-bold tabular-nums">{o.handover_pct}%</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${o.handover_pct}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {o.alumni_consent && <Badge variant="success" className="text-[10px]">アルムナイ加入予定</Badge>}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">標準引き継ぎチェックリスト</h3>
          <ul className="space-y-1.5">
            {handoverItems.map((h) => (
              <li key={h.id} className="flex items-center gap-3 rounded-md border bg-card p-2.5">
                <input type="checkbox" defaultChecked={h.status === "in_progress"} className="size-4" />
                <span className="flex-1 text-sm">{h.title}</span>
                <Badge variant="outline" className="text-[10px]">担当: {h.owner}</Badge>
                <Badge variant={h.status === "in_progress" ? "warning" : "outline"} className="text-[10px]">
                  {h.status === "in_progress" ? "進行中" : "未着手"}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">完了済み退職</h3>
          <ul className="space-y-1.5">
            {completedExits.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-md border bg-card/50 p-2.5 opacity-80">
                <span className="flex-1 text-sm">{c.employee_id_name}</span>
                <span className="text-xs text-muted-foreground">{formatDate(c.last_day)}</span>
                {c.alumni_active && <Badge variant="success" className="text-[10px]">アルムナイ参加中</Badge>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({
  icon: Icon, label, value, unit, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; unit: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
}) {
  const cls = {
    primary: "text-gc-700 bg-gc-50 border-gc-200",
    success: "text-emerald-700 bg-emerald-50 border-emerald-200",
    warning: "text-amber-800 bg-amber-50 border-amber-200",
    danger: "text-red-800 bg-red-50 border-red-200",
    muted: "text-muted-foreground bg-muted/50 border-border",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
