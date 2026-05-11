"use client";

import { useMemo, useState } from "react";
import { ScrollText, Filter, Eye, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, relativeTime } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

export type AuditRow = {
  id: number;
  action: string;
  resource_type: string;
  resource_id: string | null;
  actor_name: string;
  created_at: string;
  diff?: Record<string, unknown> | null;
};

const ACTION_VARIANT: Record<string, "success" | "warning" | "danger" | "outline"> = {
  create: "success",
  update: "warning",
  delete: "danger",
  view:   "outline",
};

export function AuditLogClient({ rows, demo }: { rows: AuditRow[]; demo: boolean }) {
  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("all");
  const [resource, setResource] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const resourceTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.resource_type))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (action !== "all" && r.action !== action) return false;
      if (resource !== "all" && r.resource_type !== resource) return false;
      if (!qq) return true;
      return (
        r.actor_name.toLowerCase().includes(qq) ||
        r.resource_type.toLowerCase().includes(qq) ||
        (r.resource_id ?? "").toLowerCase().includes(qq)
      );
    });
  }, [rows, q, action, resource]);

  const exportCsv = () => {
    const data: (string | number)[][] = [
      ["時刻", "操作者", "アクション", "リソース", "ID", "差分(JSON)"],
      ...filtered.map((r) => [
        new Date(r.created_at).toISOString(),
        r.actor_name,
        r.action,
        r.resource_type,
        r.resource_id ?? "",
        r.diff ? JSON.stringify(r.diff) : "",
      ]),
    ];
    downloadCsv(`audit-log-${new Date().toISOString().slice(0, 10)}`, data);
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ScrollText className="size-6 text-gc-700" />
            監査ログ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            HR 管理者向け：操作履歴の閲覧と差分確認（直近 200 件）
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-1.5" disabled={filtered.length === 0}>
          <Download className="size-4" />
          CSV エクスポート
        </Button>
      </div>

      {demo && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          🟡 デモモード：モックの監査ログを表示しています
        </div>
      )}

      {/* 絞り込み */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Filter className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="操作者・リソース・ID で検索..."
            className="h-8 w-64 pl-8 text-sm"
          />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全アクション</SelectItem>
            <SelectItem value="create">create</SelectItem>
            <SelectItem value="update">update</SelectItem>
            <SelectItem value="delete">delete</SelectItem>
            <SelectItem value="view">view</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resource} onValueChange={setResource}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全リソース</SelectItem>
            {resourceTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} 件 / 全 {rows.length}
        </span>
      </div>

      {/* テーブル */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
              該当する監査ログはありません
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <li key={r.id} className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[10px]">
                          {initials(r.actor_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                          <span className="font-medium">{r.actor_name}</span>
                          <Badge variant={ACTION_VARIANT[r.action] ?? "outline"} className="text-[10px]">
                            {r.action}
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.resource_type}
                            {r.resource_id && ` · ${r.resource_id}`}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {relativeTime(r.created_at)} · {new Date(r.created_at).toLocaleString("ja-JP")}
                        </div>
                      </div>
                      {r.diff && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-1.5 text-[11px]"
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                        >
                          <Eye className="size-3" />
                          {isOpen ? "閉じる" : "差分"}
                        </Button>
                      )}
                    </div>
                    {isOpen && r.diff && (
                      <pre className={cn(
                        "mt-2 overflow-x-auto rounded-md border bg-muted/40 p-2 font-mono text-[11px] leading-5",
                      )}>
                        {JSON.stringify(r.diff, null, 2)}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
