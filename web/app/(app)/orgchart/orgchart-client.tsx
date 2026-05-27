"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight, ChevronDown, Building2, Users2, MapPin, Sparkles,
} from "lucide-react";
import {
  officeByCode, OFFICES, type DemoEmployee, type DemoDept, type OfficeLocation,
} from "@/lib/demo/employees";
import { slackDmUrl, slackDmWebUrl } from "@/lib/slack";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { initials, cn } from "@/lib/utils";

export function OrgChartClient({
  employees, departments,
}: {
  employees: DemoEmployee[];
  departments: DemoDept[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">組織図</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {employees.length}名・{departments.length}部門。レポーティング・部門・拠点国別の3軸で組織を可視化。
        </p>
      </div>

      <Tabs defaultValue="reporting">
        <TabsList>
          <TabsTrigger value="reporting" className="gap-2">
            <Users2 className="size-3.5" /> レポーティング
          </TabsTrigger>
          <TabsTrigger value="department" className="gap-2">
            <Building2 className="size-3.5" /> 部門
          </TabsTrigger>
          <TabsTrigger value="location" className="gap-2">
            <MapPin className="size-3.5" /> 拠点・国別
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reporting">
          <ReportingTree employees={employees} departments={departments} />
        </TabsContent>
        <TabsContent value="department">
          <DepartmentView employees={employees} departments={departments} />
        </TabsContent>
        <TabsContent value="location">
          <LocationView employees={employees} departments={departments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── レポーティングラインビュー ──────────────────
function ReportingTree({
  employees, departments,
}: {
  employees: DemoEmployee[];
  departments: DemoDept[];
}) {
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const reportsByManager = useMemo(() => {
    const map = new Map<string | null, DemoEmployee[]>();
    for (const e of employees) {
      const k = e.manager_id;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [employees]);

  const roots = reportsByManager.get(null) ?? [];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-1.5">
          {roots.map((e) => (
            <TreeNode
              key={e.id}
              employee={e}
              reportsByManager={reportsByManager}
              deptMap={deptMap}
              depth={0}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TreeNode({
  employee, reportsByManager, deptMap, depth,
}: {
  employee: DemoEmployee;
  reportsByManager: Map<string | null, DemoEmployee[]>;
  deptMap: Map<string, DemoDept>;
  depth: number;
}) {
  const reports = reportsByManager.get(employee.id) ?? [];
  const [open, setOpen] = useState(depth < 2);
  const hasReports = reports.length > 0;
  const office = officeByCode(employee.office_location);

  return (
    <div>
      <button
        onClick={() => hasReports && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
          hasReports ? "hover:bg-accent" : "cursor-default",
        )}
        style={{ paddingLeft: `${depth * 22 + 8}px` }}
        aria-expanded={hasReports ? open : undefined}
      >
        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
          {hasReports ? (open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />) : ""}
        </span>
        <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(employee.full_name)}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{employee.full_name}</span>
            {office && office.code !== "JP-TYO" && (
              <span className="text-xs">{office.countryEmoji}</span>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {employee.job_title} · {deptMap.get(employee.department_id)?.name ?? "—"}
          </div>
        </div>
        {hasReports && (
          <Badge variant="outline" className="shrink-0">{reports.length}名</Badge>
        )}
      </button>
      {open && hasReports && (
        <div className="space-y-1 border-l border-dashed ml-3" style={{ marginLeft: `${depth * 22 + 13}px` }}>
          {reports.map((r) => (
            <TreeNode
              key={r.id}
              employee={r}
              reportsByManager={reportsByManager}
              deptMap={deptMap}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 部門ビュー ─────────────────────────────────
function DepartmentView({
  employees, departments,
}: {
  employees: DemoEmployee[];
  departments: DemoDept[];
}) {
  const byDept = useMemo(() => {
    const map = new Map<string, DemoEmployee[]>();
    for (const d of departments) map.set(d.id, []);
    for (const e of employees) {
      const arr = map.get(e.department_id);
      if (arr) arr.push(e);
    }
    return map;
  }, [employees, departments]);

  const roots = departments.filter((d) => !d.parent_id);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, DemoDept[]>();
    for (const d of departments) {
      if (!d.parent_id) continue;
      if (!map.has(d.parent_id)) map.set(d.parent_id, []);
      map.get(d.parent_id)!.push(d);
    }
    return map;
  }, [departments]);

  return (
    <div className="space-y-4">
      {roots.map((root) => (
        <DeptCard
          key={root.id}
          dept={root}
          members={byDept.get(root.id) ?? []}
          childDepts={childrenByParent.get(root.id) ?? []}
          byDept={byDept}
          childrenByParent={childrenByParent}
          depth={0}
        />
      ))}
    </div>
  );
}

function DeptCard({
  dept, members, childDepts, byDept, childrenByParent, depth,
}: {
  dept: DemoDept;
  members: DemoEmployee[];
  childDepts: DemoDept[];
  byDept: Map<string, DemoEmployee[]>;
  childrenByParent: Map<string, DemoDept[]>;
  depth: number;
}) {
  return (
    <Card className={cn(depth > 0 && "border-dashed")}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Building2 className={cn("size-4", depth === 0 ? "text-gc-700" : "text-muted-foreground")} />
          <h3 className="font-semibold">{dept.name}</h3>
          <Badge variant="outline">{members.length}名</Badge>
        </div>
        {members.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {members.map((e) => {
              const office = officeByCode(e.office_location);
              return (
                <div key={e.id} className="flex items-center gap-2 rounded-md border bg-background p-2">
                  <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 truncate text-xs font-medium">
                      <span className="truncate">{e.full_name}</span>
                      {office && office.code !== "JP-TYO" && (
                        <span className="shrink-0 text-[10px]">{office.countryEmoji}</span>
                      )}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">{e.job_title}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {childDepts.length > 0 && (
          <div className={cn("mt-4 space-y-3", depth === 0 && "border-t pt-4")}>
            {childDepts.map((c) => (
              <DeptCard
                key={c.id}
                dept={c}
                members={byDept.get(c.id) ?? []}
                childDepts={childrenByParent.get(c.id) ?? []}
                byDept={byDept}
                childrenByParent={childrenByParent}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 拠点・国別ビュー ─────────────────────────
function LocationView({
  employees, departments,
}: {
  employees: DemoEmployee[];
  departments: DemoDept[];
}) {
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  // 拠点ごとに社員を集約
  const byOffice = useMemo(() => {
    const map = new Map<string, DemoEmployee[]>();
    for (const e of employees) {
      const loc = e.office_location;
      if (!loc) continue; // 拠点未設定の社員はスキップ
      if (!map.has(loc)) map.set(loc, []);
      map.get(loc)!.push(e);
    }
    return map;
  }, [employees]);

  // 国別エキスパート（その国に詳しい人）
  const expertsByCountry = useMemo(() => {
    const map = new Map<string, { country: string; emoji: string; experts: DemoEmployee[] }>();
    for (const e of employees) {
      const countries = new Set([
        e.nationality,
        ...(e.expertise_countries ?? []),
        // 拠点の国コードも加える（未設定なら空文字でフィルタされる）
        e.office_location ? e.office_location.split("-")[0] : "",
      ]);
      for (const c of countries) {
        if (!c) continue;
        const office = OFFICES.find((o) => o.code.startsWith(c + "-"));
        const country = office?.country ?? c;
        const emoji = office?.countryEmoji ?? "🌐";
        if (!map.has(c)) map.set(c, { country, emoji, experts: [] });
        const entry = map.get(c)!;
        if (!entry.experts.find((x) => x.id === e.id)) {
          // 国籍 or expertise_countries 一致を優先、出社拠点だけは弱い一致として後ろに
          const isStrong = e.nationality === c || e.expertise_countries?.includes(c);
          if (isStrong) entry.experts.unshift(e);
          else entry.experts.push(e);
        }
      }
    }
    return map;
  }, [employees]);

  return (
    <div className="space-y-6">
      {/* 拠点別 */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="size-4 text-gc-700" />
          <h2 className="font-semibold">拠点別ロケーション</h2>
          <Badge variant="outline">{byOffice.size}拠点</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OFFICES.filter((o) => byOffice.has(o.code)).map((office) => {
            const members = byOffice.get(office.code) ?? [];
            return (
              <OfficeCard key={office.code} office={office} members={members} deptMap={deptMap} />
            );
          })}
        </div>
      </section>

      {/* 国別エキスパート */}
      <section>
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="size-4 text-gc-700" />
          <h2 className="font-semibold">国別エキスパート</h2>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          「この国のことはこの人に聞け」— 国籍／専門領域／拠点に基づいた専門家リスト
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from(expertsByCountry.entries())
            .filter(([, v]) => v.experts.length > 0)
            .sort((a, b) => b[1].experts.length - a[1].experts.length)
            .map(([code, v]) => (
              <CountryExpertsCard key={code} code={code} country={v.country} emoji={v.emoji} experts={v.experts} deptMap={deptMap} />
            ))}
        </div>
      </section>
    </div>
  );
}

function OfficeCard({
  office, members, deptMap,
}: {
  office: OfficeLocation;
  members: DemoEmployee[];
  deptMap: Map<string, DemoDept>;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold">
              <span className="text-2xl leading-none">{office.countryEmoji}</span>
              <span>{office.city}</span>
            </div>
            <div className="text-xs text-muted-foreground">{office.country}</div>
          </div>
          <Badge variant="outline">{members.length}名</Badge>
        </div>
        <ul className="space-y-1.5">
          {members.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              <Avatar className="size-6"><AvatarFallback className="text-[9px]">{initials(e.full_name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium leading-tight">{e.full_name}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {e.job_title} · {deptMap.get(e.department_id)?.name ?? "—"}
                </div>
              </div>
            </li>
          ))}
          {members.length > 5 && (
            <li className="pt-1 text-xs text-muted-foreground">+ あと {members.length - 5} 名</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function CountryExpertsCard({
  code, country, emoji, experts, deptMap,
}: {
  code: string;
  country: string;
  emoji: string;
  experts: DemoEmployee[];
  deptMap: Map<string, DemoDept>;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xl leading-none">{emoji}</span>
          <div className="flex-1">
            <div className="text-sm font-semibold">{country}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{code}</div>
          </div>
          <Badge variant="success">{experts.length}人</Badge>
        </div>
        <ul className="space-y-2">
          {experts.slice(0, 4).map((e) => {
            const isExpert = e.expertise_countries?.includes(code);
            return (
              <li key={e.id} className="flex items-center gap-2">
                <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 truncate text-xs font-medium">
                    {e.full_name}
                    {isExpert && (
                      <span className="rounded bg-gc-100 px-1 text-[9px] font-bold uppercase tracking-wider text-gc-800">expert</span>
                    )}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {deptMap.get(e.department_id)?.name ?? "—"}
                  </div>
                </div>
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
                    className="rounded p-1 text-[#4A154B] hover:bg-[#4A154B]/10"
                    title="SlackでDM"
                  >
                    <svg viewBox="0 0 24 24" className="size-3.5">
                      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                    </svg>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
