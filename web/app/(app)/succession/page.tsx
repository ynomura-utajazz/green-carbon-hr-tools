"use client";

import { LayoutGrid, Crown, Users2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 9-box: x = performance (low/mid/high), y = potential (low/mid/high)
type Box = { x: 0 | 1 | 2; y: 0 | 1 | 2 };

const employees9box: { id: string; box: Box }[] = [
  { id: "e1",  box: { x: 2, y: 2 } },  // CEO 野村 — top right (Star)
  { id: "e2",  box: { x: 2, y: 2 } },  // CHRO 高橋 — Star
  { id: "e3",  box: { x: 2, y: 1 } },  // COO 佐藤 — High Performer
  { id: "e4",  box: { x: 2, y: 2 } },  // CPO 山田 — Star
  { id: "e5",  box: { x: 1, y: 2 } },  // 鎌田 — Future Star
  { id: "e8",  box: { x: 2, y: 1 } },  // 川崎 — High Performer
  { id: "e9",  box: { x: 1, y: 2 } },  // 藤本 — Future Star
  { id: "e10", box: { x: 1, y: 1 } },  // 藤原 — Core
  { id: "e14", box: { x: 2, y: 1 } },  // 原田 — High Performer
  { id: "e16", box: { x: 1, y: 0 } },  // 土井 — Plateau
  { id: "e17", box: { x: 1, y: 1 } },  // 古山
  { id: "e23", box: { x: 0, y: 1 } },  // 南部 — Underperformer (危機)
  { id: "e26", box: { x: 2, y: 1 } },  // 串田 CFO
  { id: "e19", box: { x: 1, y: 2 } },  // 石川
];

const boxLabels: Record<string, string> = {
  "0,0": "Action", "0,1": "Watch", "0,2": "Enigma",
  "1,0": "Worker", "1,1": "Core", "1,2": "Future Star",
  "2,0": "Specialist", "2,1": "High Performer", "2,2": "Star",
};

const boxTones: Record<string, string> = {
  "0,0": "bg-red-50 border-red-200", "0,1": "bg-amber-50 border-amber-200", "0,2": "bg-blue-50 border-blue-200",
  "1,0": "bg-amber-50 border-amber-200", "1,1": "bg-emerald-50 border-emerald-200", "1,2": "bg-emerald-100 border-emerald-300",
  "2,0": "bg-blue-50 border-blue-200", "2,1": "bg-emerald-100 border-emerald-300", "2,2": "bg-purple-100 border-purple-300",
};

const empMap = new Map(DEMO_EMPLOYEES.map((e) => [e.id, e]));

const keyPositions = [
  { role: "CEO", incumbent: "野村 裕太",   successors: ["佐藤 太郎 (3-5年)", "高橋 真由 (5-7年)"] },
  { role: "CTO", incumbent: "(空席)",     successors: ["川崎 健太 (1-2年)"] },
  { role: "CFO", incumbent: "串田 和也",   successors: ["(計画中)"] },
  { role: "COO", incumbent: "佐藤 太郎",   successors: ["山田 花子 (2-3年)"] },
];

export default function SuccessionPage() {
  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LayoutGrid className="size-6 text-gc-700" />
            サクセションプランニング
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            9-box マトリクス・キーポジション後継者計画・タレントレビュー。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="ハイポテンシャル" value={5} unit="名" icon={Crown} tone="primary" />
        <KpiTile label="キーポジション" value={keyPositions.length} unit="件" icon={Users2} tone="primary" />
        <KpiTile label="後継者ギャップ" value={1} unit="件" icon={AlertTriangle} tone="danger" />
        <KpiTile label="次回レビュー" value="Q3" unit="" icon={LayoutGrid} tone="muted" />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-1 text-sm font-semibold">9-box タレントマトリクス</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            横軸: パフォーマンス（左→右で高い）／縦軸: ポテンシャル（下→上で高い）
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[2, 1, 0].flatMap((y) =>
              [0, 1, 2].map((x) => {
                const key = `${x},${y}`;
                const emps = employees9box.filter((e) => e.box.x === x && e.box.y === y);
                return (
                  <div
                    key={key}
                    className={cn("min-h-32 rounded-md border-2 p-2", boxTones[key])}
                  >
                    <div className="text-[10px] font-bold">{boxLabels[key]}</div>
                    <ul className="mt-1 space-y-0.5">
                      {emps.map((e) => {
                        const emp = empMap.get(e.id);
                        if (!emp) return null;
                        return (
                          <li key={e.id} className="flex items-center gap-1 text-[11px]">
                            <Avatar className="size-4"><AvatarFallback className="text-[8px]">{initials(emp.full_name)}</AvatarFallback></Avatar>
                            <span className="truncate">{emp.full_name}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>← 低 パフォーマンス</span>
            <span>高 →</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">キーポジション 後継者計画</h3>
          <ul className="space-y-2">
            {keyPositions.map((p) => (
              <li key={p.role} className="rounded-md border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{p.role}</div>
                    <div className="text-xs text-muted-foreground">現職: {p.incumbent}</div>
                  </div>
                  {p.successors.includes("(計画中)") && (
                    <Badge variant="warning">後継者計画中</Badge>
                  )}
                </div>
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">後継者:</span>
                  <ul className="mt-0.5 space-y-0.5">
                    {p.successors.map((s, i) => (
                      <li key={i} className="ml-3">{s}</li>
                    ))}
                  </ul>
                </div>
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
