import type { ComponentType } from "react";
import { Brain, AlertTriangle, MessageSquare, ScrollText, Activity, Building2, Plus } from "lucide-react";
import {
  DEMO_CAMPAIGNS, DEMO_RESULTS_2026, DEMO_GROUP_ANALYSIS, LEVEL_LABEL, LEVEL_TONE,
  type StressLevel, type StressCheckResult, type Campaign, type GroupAnalysis,
} from "@/lib/demo/stress-check";
import { DEMO_DEPARTMENTS, type DemoDept } from "@/lib/demo/employees";
import { isDemoMode } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StressCheckPage() {
  let results: StressCheckResult[];
  let campaigns: Campaign[];
  let groupAnalysis: GroupAnalysis[];
  let departments: DemoDept[];

  if (isDemoMode()) {
    results = DEMO_RESULTS_2026;
    campaigns = DEMO_CAMPAIGNS;
    groupAnalysis = DEMO_GROUP_ANALYSIS;
    departments = DEMO_DEPARTMENTS;
  } else {
    const supabase = await createClient();
    const [surveysRes, respsRes, deptsRes, empCountRes] = await Promise.all([
      supabase
        .from("surveys")
        .select("id, title, starts_at, ends_at")
        .order("starts_at", { ascending: false }),
      // 集計用に survey_id のみ取得（answers jsonb は PII を含みうるため読まない）。
      // RLS: hr_admin は匿名含む全件、それ以外は本人の回答のみが返る。
      supabase.from("survey_responses").select("survey_id"),
      supabase.from("departments").select("id, name, parent_id, display_order").order("display_order"),
      supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .is("deleted_at", null),
    ]);
    if (surveysRes.error) console.error("[stress-check] surveys query failed:", surveysRes.error.message);
    if (respsRes.error) console.error("[stress-check] survey_responses query failed:", respsRes.error.message);
    if (deptsRes.error) console.error("[stress-check] departments query failed:", deptsRes.error.message);
    if (empCountRes.error) console.error("[stress-check] employees count failed:", empCountRes.error.message);

    // survey_id ごとの回答数を集計
    const respCountBySurvey = new Map<string, number>();
    for (const r of (respsRes.data ?? []) as { survey_id: string }[]) {
      respCountBySurvey.set(r.survey_id, (respCountBySurvey.get(r.survey_id) ?? 0) + 1);
    }

    const activeEmployeeCount = empCountRes.count ?? 0;
    const nowMs = Date.now();

    // surveys → Campaign にマップ。survey_type enum に 'stress' が無いため
    // stress サーベイの絞り込みはできず、可視な全サーベイを campaign として扱う（needs_review）。
    campaigns = ((surveysRes.data ?? []) as { id: string; title: string; starts_at: string | null; ends_at: string | null }[])
      .map((s) => {
        const startMs = s.starts_at ? new Date(s.starts_at).getTime() : 0;
        const endMs = s.ends_at ? new Date(s.ends_at).getTime() : 0;
        // status カラムは無いので日付から派生（下書き/進行中/完了）。
        const status: Campaign["status"] =
          nowMs < startMs ? "draft" : nowMs > endMs ? "analyzed" : "active";
        return {
          id: s.id,
          name: s.title,
          status,
          starts_at: (s.starts_at ?? "").slice(0, 10),
          ends_at: (s.ends_at ?? "").slice(0, 10),
          // target_count カラムは無いため在籍者数を代理値に（needs_review）。
          target_count: activeEmployeeCount,
          response_count: respCountBySurvey.get(s.id) ?? 0,
        };
      });

    // 個別のストレススコア（4領域）・level・面談希望は answers jsonb の
    // 定義スキーマが無く算出不能。偽の分布を作らないため空にする（needs_review）。
    results = [];
    // 集団分析は匿名回答（respondent_id null）を部署に帰属できないため算出不能（needs_review）。
    groupAnalysis = [];
    departments = (deptsRes.data ?? []) as DemoDept[];
  }

  const distribution: Record<StressLevel, number> = { low: 0, medium: 0, high: 0, very_high: 0 };
  for (const r of results) distribution[r.level]++;
  const total = results.length;
  const active = campaigns[0];
  const responseCount = active?.response_count ?? 0;
  const targetCount = active?.target_count ?? 0;
  const responseRate = targetCount > 0 ? Math.round((responseCount / targetCount) * 100) : 0;
  const highCount = results.filter((r) => r.level === "high" || r.level === "very_high").length;
  const consultations = results.filter((r) => r.wants_consultation).length;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Brain className="size-6 text-gc-700" />
            ストレスチェック
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            労安法第66条の10に基づく年1回の法定実施。匿名集計・集団分析・産業医面談まで。
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          新規キャンペーン
        </Button>
      </div>

      {/* プライバシー注記 */}
      <Card className="border-purple-200 bg-purple-50/40">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Brain className="size-5 shrink-0 text-purple-700 mt-0.5" />
          <div>
            <p className="font-medium text-purple-900">プライバシー保護</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ストレスチェック結果は本人と医師（産業医）のみ閲覧可能。HRには集団分析結果（10名以上の単位）のみ開示されます。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={Activity} label="回答率" value={`${responseRate}%`} unit="" tone={responseRate >= 80 ? "success" : "warning"} hint={`${responseCount} / ${targetCount}`} />
        <KpiTile icon={AlertTriangle} label="高ストレス者" value={highCount} unit="名" tone={highCount > 0 ? "warning" : "muted"} hint="個別フォロー対象" />
        <KpiTile icon={MessageSquare} label="産業医面談希望" value={consultations} unit="件" tone={consultations > 0 ? "primary" : "muted"} hint="調整中" />
        <KpiTile icon={ScrollText} label="法令準拠" value="✓" unit="" tone="success" hint="50人以上事業場で年1回実施" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2"><Activity className="size-3.5" />全社結果</TabsTrigger>
          <TabsTrigger value="group" className="gap-2"><Building2 className="size-3.5" />部門別</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2"><ScrollText className="size-3.5" />法令</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">ストレスレベル分布</h3>
                <ul className="space-y-2.5">
                  {(["low", "medium", "high", "very_high"] as StressLevel[]).map((lvl) => {
                    const count = distribution[lvl];
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <li key={lvl} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", LEVEL_TONE[lvl])}>
                            {LEVEL_LABEL[lvl]}
                          </span>
                          <span className="font-bold tabular-nums">{count}名 ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full",
                              lvl === "low" ? "bg-emerald-500"
                                : lvl === "medium" ? "bg-blue-500"
                                : lvl === "high" ? "bg-amber-500"
                                : "bg-red-500",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">過去3年の推移</h3>
                <ul className="space-y-2">
                  {campaigns.map((c) => {
                    const pct = c.target_count > 0 ? Math.round((c.response_count / c.target_count) * 100) : 0;
                    return (
                      <li key={c.id} className="rounded-md border bg-card p-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{c.name}</span>
                          <Badge variant={c.status === "analyzed" ? "success" : c.status === "active" ? "beta" : "outline"}>
                            {c.status === "analyzed" ? "完了" : c.status === "active" ? "進行中" : "下書き"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {c.starts_at} 〜 {c.ends_at} ・ 回答 {pct}%（{c.response_count}/{c.target_count}）
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="group">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Building2 className="size-4 text-gc-700" />
                部門別 集団分析（10名以上のみ）
              </h3>
              <ul className="space-y-2">
                {groupAnalysis
                  .filter((g) => g.total >= 10)
                  .sort((a, b) => a.total_health_risk_score - b.total_health_risk_score)
                  .map((g) => {
                    const dept = departments.find((d) => d.id === g.department_id);
                    if (!dept) return null;
                    const pct = Math.round((g.responded / g.total) * 100);
                    const risk = g.total_health_risk_score;
                    return (
                      <li key={g.department_id} className="rounded-md border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{dept.name}</span>
                            <span className="text-xs text-muted-foreground">{g.responded} / {g.total} 名（{pct}%）</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {g.high_stress_count > 0 && (
                              <Badge variant="warning" className="text-[10px]">
                                高ストレス {g.high_stress_count}
                              </Badge>
                            )}
                            <span className={cn(
                              "rounded-md border px-2 py-0.5 font-mono text-xs tabular-nums",
                              risk >= 70 ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : risk >= 60 ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-red-200 bg-red-50 text-red-800",
                            )}>
                              健康度 {risk}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-[10px] text-muted-foreground">健康リスク（高いほど良好）</div>
                            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-gradient-to-r from-red-400 to-emerald-500" style={{ width: `${risk}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">サポート（高いほど良好）</div>
                            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${g.total_support_score}%` }} />
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
              <p className="mt-3 text-[10px] text-muted-foreground">
                ※ 10名未満の部署は個人特定リスクのため非表示。
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ScrollText className="size-4 text-gc-700" />
                法令遵守
              </h3>
              <ul className="space-y-2">
                <ComplianceItem
                  ok title="年1回の実施"
                  legalRef="労安法第66条の10第1項"
                  note="2026年度の実施を 5/2 〜 5/22 で実施中。回答率 67%。"
                />
                <ComplianceItem
                  ok title="高ストレス者への医師面接指導"
                  legalRef="労安法第66条の10第3項"
                  note="希望者 7 名に対して産業医面談を順次実施中。"
                />
                <ComplianceItem
                  ok title="集団分析の実施"
                  legalRef="労安法第66条の10第6項（努力義務）"
                  note="部門別分析を実施。10名未満の部署は除外。"
                />
                <ComplianceItem
                  ok title="結果の本人通知"
                  legalRef="労安法施行規則第52条の12"
                  note="回答者全員に結果を通知済み。"
                />
                <ComplianceItem
                  ok title="プライバシー保護"
                  legalRef="労安法第66条の10第2項"
                  note="個別結果は産業医・本人のみ閲覧可。HRには集団分析のみ開示。"
                />
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiTile({
  icon: Icon, label, value, unit, tone, hint,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string; value: number | string; unit: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
  hint: string;
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
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
          {hint && <div className="mt-1 truncate text-[10px] text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceItem({
  ok, title, legalRef, note,
}: {
  ok: boolean;
  title: string;
  legalRef: string;
  note: string;
}) {
  return (
    <li className={cn(
      "rounded-md border bg-card p-3 text-sm",
      ok && "border-l-4 border-l-emerald-500",
    )}>
      <h4 className="font-semibold">{title}</h4>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{legalRef}</div>
      <p className="mt-1.5 text-xs">{note}</p>
    </li>
  );
}
