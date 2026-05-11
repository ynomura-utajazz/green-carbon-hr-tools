"use client";

import { Globe2, Users2, RefreshCw, Plus, Mail, Linkedin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const alumni = [
  { id: "a1", name: "John Wilson",   ex_role: "気候政策アドバイザー", current: "Climate Policy Institute - Director", left_at: "2025-09",  referral_score: 5, alumni_event: true,  contacts: 8, country: "🇺🇸" },
  { id: "a2", name: "Carlos Mendez", ex_role: "BD Latin America",     current: "GreenTech LatAm - VP",                left_at: "2025-12",  referral_score: 4, alumni_event: false, contacts: 3, country: "🇲🇽" },
  { id: "a3", name: "鈴木 良一",      ex_role: "テックリード",        current: "他社 CTO",                            left_at: "2024-06",  referral_score: 5, alumni_event: true,  contacts: 12, country: "🇯🇵" },
  { id: "a4", name: "Park Hyejin",   ex_role: "プロダクトマーケ",     current: "韓国スタートアップ - PM",              left_at: "2024-09",  referral_score: 4, alumni_event: false, contacts: 5, country: "🇰🇷" },
  { id: "a5", name: "山田 健太郎",    ex_role: "事業開発",            current: "VC アナリスト",                        left_at: "2025-03",  referral_score: 4, alumni_event: true,  contacts: 6, country: "🇯🇵" },
  { id: "a6", name: "Amelia Rodriguez", ex_role: "ASEAN BD",          current: "Sustainability Consultancy - Partner", left_at: "2024-11",  referral_score: 5, alumni_event: true,  contacts: 9, country: "🇸🇬" },
];

const referrals = [
  { id: "r1", from: "鈴木 良一", to: "シニアエンジニア候補",  status: "面接中" },
  { id: "r2", from: "Amelia Rodriguez", to: "ASEAN BD候補", status: "書類選考" },
  { id: "r3", from: "山田 健太郎", to: "事業開発候補",      status: "応募" },
];

export default function AlumniPage() {
  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Globe2 className="size-6 text-gc-700" />
            アルムナイ管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            退職者ネットワーク・リファラル候補・カムバック採用を一元管理。
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          アルムナイ追加
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="登録アルムナイ" value={alumni.length} unit="名" icon={Users2} tone="primary" />
        <KpiTile label="進行中リファラル" value={referrals.length} unit="件" icon={RefreshCw} tone="success" />
        <KpiTile label="イベント参加" value={4} unit="名" icon={Globe2} tone="muted" />
        <KpiTile label="カムバック採用" value={1} unit="名" icon={RefreshCw} tone="success" />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">アルムナイ ネットワーク</h3>
          <ul className="space-y-2">
            {alumni.map((a) => (
              <li key={a.id} className="rounded-md border bg-card p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9"><AvatarFallback>{initials(a.name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-sm">{a.country}</span>
                      {a.alumni_event && <Badge variant="success" className="text-[10px]">イベント参加</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-muted-foreground/70">前職:</span> {a.ex_role}（{a.left_at}まで）
                    </div>
                    <div className="mt-0.5 text-xs">
                      <span className="text-muted-foreground/70">現職:</span> {a.current}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <span className="font-mono">⭐ {a.referral_score}/5</span>
                    <span className="text-muted-foreground">紹介 {a.contacts} 件</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="size-8 p-0"><Mail className="size-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="size-8 p-0"><Linkedin className="size-3.5" /></Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">アルムナイ経由のリファラル</h3>
          <ul className="space-y-2">
            {referrals.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-md border bg-card p-2.5">
                <span className="font-medium">{r.from}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <span className="flex-1">{r.to}</span>
                <Badge variant="outline">{r.status}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-muted-foreground">
            アルムナイ・リファラルの採用決定で報奨金（10万円）。
          </p>
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
