"use client";

import { useMemo, useState } from "react";
import { Shield, Search, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { initials, cn } from "@/lib/utils";

export type Role = "hr_admin" | "manager" | "employee" | "executive" | "readonly";

export type EmployeeWithRoles = {
  id: string;
  full_name: string;
  job_title: string;
  department_name: string;
  roles: Role[];
};

const ALL_ROLES: Role[] = ["hr_admin", "manager", "executive", "employee", "readonly"];

const ROLE_META: Record<Role, { label: string; cls: string; description: string }> = {
  hr_admin: {
    label: "HR 管理者",
    cls: "border-red-300 bg-red-50 text-red-800",
    description: "全社員のデータを参照・編集可。給与・監査ログにもアクセス。",
  },
  executive: {
    label: "経営層",
    cls: "border-purple-300 bg-purple-50 text-purple-800",
    description: "経営ダッシュボード・全社レベル KPI へのアクセス。",
  },
  manager: {
    label: "マネージャー",
    cls: "border-blue-300 bg-blue-50 text-blue-800",
    description: "自チームの社員データ・1on1・評価を参照可。",
  },
  employee: {
    label: "一般社員",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-800",
    description: "自分自身のデータと公開情報のみ。",
  },
  readonly: {
    label: "閲覧専用",
    cls: "border-gray-300 bg-gray-50 text-gray-700",
    description: "監査・派遣スタッフ等。書き込み一切不可。",
  },
};

export function RolesClient({
  employees: initialEmployees, demo,
}: {
  employees: EmployeeWithRoles[];
  demo: boolean;
}) {
  const [employees, setEmployees] = useState<EmployeeWithRoles[]>(initialEmployees);
  const [q, setQ] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<Record<string, Role>>({});

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return employees;
    return employees.filter((e) =>
      e.full_name.toLowerCase().includes(qq) ||
      e.job_title.toLowerCase().includes(qq) ||
      e.department_name.toLowerCase().includes(qq),
    );
  }, [employees, q]);

  const stats = useMemo(() => {
    const m = new Map<Role, number>();
    for (const r of ALL_ROLES) m.set(r, 0);
    for (const e of employees) for (const r of e.roles) m.set(r, (m.get(r) ?? 0) + 1);
    return m;
  }, [employees]);

  // hr_admin の最後の 1 人を守る
  const hrAdminCount = stats.get("hr_admin") ?? 0;

  const grant = async (employeeId: string, role: Role) => {
    setPendingId(`${employeeId}:${role}:add`);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, role }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        toast.error("付与に失敗", { description: json.error });
        return;
      }
      // ローカル状態を楽観更新
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId && !e.roles.includes(role)
            ? { ...e, roles: [...e.roles, role] }
            : e,
        ),
      );
      toast.success(`${ROLE_META[role].label} を付与しました`);
    } finally {
      setPendingId(null);
    }
  };

  const revoke = async (employeeId: string, role: Role) => {
    if (role === "hr_admin" && hrAdminCount <= 1) {
      toast.error("最後の HR 管理者は剥奪できません");
      return;
    }
    if (!confirm(`${ROLE_META[role].label} を剥奪しますか？`)) return;
    setPendingId(`${employeeId}:${role}:del`);
    try {
      const res = await fetch(
        `/api/admin/roles?employeeId=${encodeURIComponent(employeeId)}&role=${encodeURIComponent(role)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        toast.error("剥奪に失敗", { description: json.error });
        return;
      }
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId
            ? { ...e, roles: e.roles.filter((r) => r !== role) }
            : e,
        ),
      );
      toast.success(`${ROLE_META[role].label} を剥奪しました`);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Shield className="size-6 text-gc-700" />
          権限管理
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ロール（HR 管理者・マネージャー・経営層・一般・閲覧専用）の付与と剥奪
        </p>
      </div>

      {demo && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          🟡 デモモード：操作は実 DB に反映されません（楽観的に UI のみ更新）
        </div>
      )}

      {/* ロール統計 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {ALL_ROLES.map((r) => (
          <Card key={r}>
            <CardContent className="p-3">
              <div className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", ROLE_META[r].cls)}>
                {ROLE_META[r].label}
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {stats.get(r) ?? 0}
                <span className="ml-1 text-xs text-muted-foreground">名</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {ROLE_META[r].description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 検索 */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="社員名・役職・部署で検索..."
          className="pl-9"
        />
      </div>

      {/* 一覧 */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
              該当する社員がいません
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((e) => {
                const available = ALL_ROLES.filter((r) => !e.roles.includes(r));
                const next = addRole[e.id] ?? available[0];
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs">{initials(e.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium">{e.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.job_title} · {e.department_name}
                      </div>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                      {e.roles.map((r) => {
                        const isLastHrAdmin = r === "hr_admin" && hrAdminCount <= 1;
                        const isPending = pendingId === `${e.id}:${r}:del`;
                        return (
                          <span
                            key={r}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              ROLE_META[r].cls,
                            )}
                          >
                            {ROLE_META[r].label}
                            {!isLastHrAdmin && (
                              <button
                                onClick={() => void revoke(e.id, r)}
                                disabled={isPending}
                                aria-label={`${ROLE_META[r].label} を剥奪`}
                                className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 disabled:opacity-40"
                              >
                                {isPending ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                              </button>
                            )}
                          </span>
                        );
                      })}

                      {available.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Select
                            value={next}
                            onValueChange={(v) => setAddRole({ ...addRole, [e.id]: v as Role })}
                          >
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {available.map((r) => (
                                <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-xs"
                            disabled={pendingId === `${e.id}:${next}:add`}
                            onClick={() => void grant(e.id, next)}
                          >
                            {pendingId === `${e.id}:${next}:add`
                              ? <Loader2 className="size-3 animate-spin" />
                              : <Plus className="size-3" />}
                            付与
                          </Button>
                        </div>
                      )}
                    </div>
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
