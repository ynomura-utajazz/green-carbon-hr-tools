"use client";

import { Shuffle, ArrowRight, Calendar, Plus, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const transfers = [
  { id: "t-1", name: "中尾 幸一",  from: "事業開発",   to: "プロダクト",   reason: "本人希望", effective: "2026-06-01", status: "pending", type: "lateral" },
  { id: "t-2", name: "Park Jihye", from: "人事",      to: "人事 (シニアL&D)", reason: "昇格", effective: "2026-07-01", status: "approved", type: "promotion" },
  { id: "t-3", name: "藤本 渉",    from: "技術",      to: "プロダクト",   reason: "クロスファンクション拡大", effective: "2026-08-01", status: "draft", type: "lateral" },
];

const orgChanges = [
  { id: "oc-1", name: "ASEAN 統括部 新設", effective: "2026-04-01", description: "事業開発内のグローバル課を昇格", status: "completed" },
  { id: "oc-2", name: "プロダクトデザイン課 新設", effective: "2026-08-01", description: "プロダクトとデザインを分離", status: "planning" },
];

export default function OrgManagementPage() {
  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Shuffle className="size-6 text-gc-700" />
            組織管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            異動・配置・降格昇格の辞令発行と組織変更シミュレーション。
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          辞令を発行
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="進行中の異動" value={transfers.length} unit="件" icon={Shuffle} tone="primary" />
        <KpiTile label="今年の異動" value={8} unit="件" icon={Calendar} tone="muted" />
        <KpiTile label="昇格" value={1} unit="名" icon={ArrowRight} tone="success" />
        <KpiTile label="組織変更" value={2} unit="件" icon={FileText} tone="primary" />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">進行中の人事異動</h3>
          <ul className="space-y-2">
            {transfers.map((t) => (
              <li key={t.id} className="rounded-md border bg-card p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9"><AvatarFallback>{initials(t.name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.name}</span>
                      <Badge variant={
                        t.status === "approved" ? "success"
                          : t.status === "pending" ? "warning"
                          : "outline"
                      }>
                        {t.status === "approved" ? "承認済"
                          : t.status === "pending" ? "承認待ち"
                          : "下書き"}
                      </Badge>
                      {t.type === "promotion" && <Badge variant="success">昇格</Badge>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5">{t.from}</span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="rounded-full bg-gc-50 px-2 py-0.5 text-gc-800">{t.to}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      理由: {t.reason} · 発令日: {t.effective}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">組織変更</h3>
          <ul className="space-y-2">
            {orgChanges.map((c) => (
              <li key={c.id} className="rounded-md border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Badge variant={c.status === "completed" ? "success" : "outline"}>
                    {c.status === "completed" ? "完了" : "計画中"}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  発効: {c.effective}
                </div>
                <p className="mt-1 text-xs">{c.description}</p>
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
