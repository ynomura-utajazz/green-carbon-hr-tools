"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Download, Mail, LayoutGrid, List, Globe2, MapPin } from "lucide-react";
import { officeByCode, type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import { slackDmUrl, slackDmWebUrl } from "@/lib/slack";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { initials, formatDate } from "@/lib/utils";

// Slack 公式ロゴ（モノクロSVG、白黒切り替え可）
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

const EMP_TYPE_LABEL: Record<string, string> = {
  full_time: "正社員",
  part_time: "パート",
  contract: "契約社員",
  intern: "インターン",
  business_partner: "業務委託",
};

const EMP_TYPE_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  full_time: "success",
  part_time: "secondary",
  contract: "secondary",
  intern: "warning",
  business_partner: "outline",
};

export function DirectoryClient({
  employees, departments,
}: {
  employees: DemoEmployee[];
  departments: DemoDept[];
}) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams?.get("q") ?? "");
  const [deptId, setDeptId] = useState<string>("all");
  const [empType, setEmpType] = useState<string>("all");
  const [foreignOnly, setForeignOnly] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  // Sync query state when ?q= changes via deep link
  useEffect(() => {
    const q = searchParams?.get("q") ?? "";
    setQuery(q);
  }, [searchParams]);

  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (deptId !== "all" && e.department_id !== deptId) return false;
      if (empType !== "all" && e.employment_type !== empType) return false;
      if (foreignOnly && !e.is_foreign_national) return false;
      if (!q) return true;
      const haystack = [
        e.full_name, e.full_name_kana ?? "", e.display_name_en ?? "",
        e.email, e.job_title, deptMap.get(e.department_id)?.name ?? "",
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, query, deptId, empType, foreignOnly, deptMap]);

  const exportCsv = () => {
    const header = ["社員番号", "氏名", "英語名", "メール", "部署", "役職", "雇用形態", "入社日", "国籍", "拠点", "Slack ID"];
    const rows = filtered.map((e) => [
      e.employee_code, e.full_name, e.display_name_en ?? "", e.email,
      deptMap.get(e.department_id)?.name ?? "", e.job_title,
      EMP_TYPE_LABEL[e.employment_type] ?? e.employment_type,
      e.hire_date, e.nationality,
      officeByCode(e.office_location)?.city ?? "", e.slack_user_id ?? "",
    ]);
    const csv = [header, ...rows].map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `directory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">社員名簿</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            全 <strong className="text-foreground">{employees.length}</strong> 名 ・
            検索結果 <strong className="text-foreground">{filtered.length}</strong> 名
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border bg-background">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("grid")}
              className="rounded-r-none"
              aria-label="グリッド表示"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              className="rounded-l-none"
              aria-label="リスト表示"
            >
              <List className="size-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="氏名・部署・役職・メールで検索..."
              className="pl-9"
            />
          </div>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="部署" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての部署</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={empType} onValueChange={setEmpType}>
            <SelectTrigger className="w-40"><SelectValue placeholder="雇用形態" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {Object.entries(EMP_TYPE_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={foreignOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setForeignOnly((v) => !v)}
          >
            <Globe2 className="size-4" /> 外国籍のみ
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            該当する社員が見つかりませんでした。
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((e) => (
            <EmployeeCard
              key={e.id}
              employee={e}
              departmentName={deptMap.get(e.department_id)?.name ?? "—"}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">氏名</th>
                  <th className="px-4 py-3 font-medium">部署</th>
                  <th className="px-4 py-3 font-medium">役職</th>
                  <th className="px-4 py-3 font-medium">雇用形態</th>
                  <th className="px-4 py-3 font-medium">拠点</th>
                  <th className="px-4 py-3 font-medium">入社日</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((e) => {
                  const office = officeByCode(e.office_location);
                  return (
                    <tr key={e.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                          <div>
                            <div className="font-medium">{e.full_name}</div>
                            {e.display_name_en && (
                              <div className="text-xs text-muted-foreground">{e.display_name_en}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{deptMap.get(e.department_id)?.name ?? "—"}</td>
                      <td className="px-4 py-2.5">{e.job_title}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={EMP_TYPE_VARIANT[e.employment_type]}>
                          {EMP_TYPE_LABEL[e.employment_type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {office ? `${office.countryEmoji} ${office.city}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{formatDate(e.hire_date)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {e.slack_user_id && (
                            <a
                              href={slackDmUrl(e.slack_user_id)}
                              onClick={() => {
                                setTimeout(() => {
                                  if (document.hasFocus()) {
                                    window.open(slackDmWebUrl(e.slack_user_id!), "_blank", "noopener,noreferrer");
                                  }
                                }, 600);
                              }}
                              className="inline-flex items-center gap-1 text-xs text-[#4A154B] hover:opacity-80"
                              title="SlackでDM"
                            >
                              <SlackIcon className="size-3" />
                            </a>
                          )}
                          <a
                            href={`mailto:${e.email}`}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            title="メール"
                          >
                            <Mail className="size-3" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function EmployeeCard({
  employee, departmentName,
}: {
  employee: DemoEmployee;
  departmentName: string;
}) {
  const office = officeByCode(employee.office_location);
  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-12">
            <AvatarFallback>{initials(employee.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{employee.full_name}</div>
                {employee.display_name_en && (
                  <div className="truncate text-xs text-muted-foreground">{employee.display_name_en}</div>
                )}
              </div>
              <Badge variant={EMP_TYPE_VARIANT[employee.employment_type]} className="shrink-0">
                {EMP_TYPE_LABEL[employee.employment_type]}
              </Badge>
            </div>
            <div className="mt-1.5 truncate text-sm">{employee.job_title}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{departmentName}</div>
            {office && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {office.countryEmoji} {office.city}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {employee.slack_user_id && (
                <a
                  href={slackDmUrl(employee.slack_user_id)}
                  onClick={(_e) => {
                    // Web フォールバック：500ms 後にアプリで開けていなければ Web を開く
                    setTimeout(() => {
                      if (document.hasFocus()) {
                        window.open(slackDmWebUrl(employee.slack_user_id!), "_blank", "noopener,noreferrer");
                      }
                    }, 600);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-[#4A154B]/20 bg-[#4A154B]/5 px-2 py-0.5 text-xs text-[#4A154B] transition-colors hover:bg-[#4A154B]/10"
                  title={`SlackでDM送信 (${employee.slack_user_id})`}
                >
                  <SlackIcon className="size-3" /> Slack
                </a>
              )}
              <a
                href={`mailto:${employee.email}`}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Mail className="size-3" /> メール
              </a>
              {employee.is_foreign_national && (
                <span className="rounded-md bg-gc-50 px-2 py-0.5 text-xs text-gc-800">
                  {employee.nationality}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
