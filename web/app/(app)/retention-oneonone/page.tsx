"use client";

import { HeartHandshake, AlertTriangle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_RETENTION, LEVEL_LABEL, LEVEL_TONE } from "@/lib/demo/retention";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const empMap = new Map(DEMO_EMPLOYEES.map((e) => [e.id, e]));
// 高リスクから優先表示
const prioritized = DEMO_RETENTION.filter((r) => r.level === "high" || r.level === "critical")
  .sort((a, b) => b.score - a.score);

export default function RetentionOneOnOnePage() {
  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <HeartHandshake className="size-6 text-gc-700" />
          リスク連動 1on1
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          離職リスクスコアと 1on1 管理を統合。高リスク社員を優先表示し、緊急対応を計画。
        </p>
      </div>

      <Card className="border-red-200 bg-red-50/40">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="size-5 shrink-0 text-red-700 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-red-900">高リスク社員 {prioritized.length} 名 — 緊急対応</p>
            <p className="mt-1 text-xs text-muted-foreground">
              下記メンバーへの 1on1 を 1 週間以内に設定することを強く推奨します。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">優先対応リスト（リスクスコア順）</h3>
          <ul className="space-y-2">
            {prioritized.map((r) => {
              const e = empMap.get(r.employee_id);
              if (!e) return null;
              return (
                <li key={r.employee_id} className="rounded-md border-l-4 border-l-red-400 bg-card p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9"><AvatarFallback>{initials(e.full_name)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{e.full_name}</span>
                        <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", LEVEL_TONE[r.level])}>
                          リスク {LEVEL_LABEL[r.level]}
                        </span>
                        <span className="text-xs font-mono">スコア {r.score}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{e.job_title}</div>
                      {r.signals[0] && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          ⚠️ {r.signals[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" asChild>
                        <Link href="/oneonone">緊急 1on1 セット</Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/retention">詳細</Link>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="rounded-md border border-blue-200 bg-blue-50/40 p-4 text-sm">
        <MessageSquare className="mb-1 inline size-4 text-blue-700" />
        <p className="text-xs text-muted-foreground">
          このツールは <Link href="/retention" className="text-blue-700 hover:underline">離職リスクモニター</Link> と
          <Link href="/oneonone" className="ml-1 text-blue-700 hover:underline">1on1 マネージャー</Link>
          を統合した「次にやるべき 1on1」のキューイング画面です。
        </p>
      </div>
    </div>
  );
}
