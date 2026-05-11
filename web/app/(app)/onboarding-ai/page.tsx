"use client";

/**
 * /onboarding-ai
 *
 * オンボーディング AI：
 *  - 入社予定者を選択
 *  - 90 日プラン自動生成（30/60/90 day milestones）
 *  - バディ自動マッチ（部門・スキル・カルチャーフィット）
 */

import { useEffect, useState } from "react";
import {
  Rocket, UserPlus, Sparkles, ArrowRight, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AiGeneratePanel } from "@/components/ai-generate-panel";
import { initials, cn } from "@/lib/utils";
import { DEMO_CANDIDATES, DEMO_POSITIONS } from "@/lib/demo/recruiting";
import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS } from "@/lib/demo/employees";
import type { BuddyMatch } from "@/lib/recruiting/buddy-match";

export const dynamic = "force-dynamic";

// 採用予定の候補者（hired もしくは offer ステージ）+ 直近入社の社員
const eligibleCandidates = DEMO_CANDIDATES.filter(
  (c) => c.stage === "hired" || c.stage === "offer",
);

export default function OnboardingAiPage() {
  // 候補者ベースまたは社員ベースを選べる
  const [candidateId, setCandidateId] = useState<string>(eligibleCandidates[0]?.id ?? "cand-1");
  const candidate = DEMO_CANDIDATES.find((c) => c.id === candidateId);
  const position = candidate ? DEMO_POSITIONS.find((p) => p.id === candidate.position_id) : undefined;
  const department = position?.department ?? "プロダクト";
  const departmentObj = DEMO_DEPARTMENTS.find((d) => d.name === department);

  const [managerId, setManagerId] = useState<string>("e8");
  const manager = DEMO_EMPLOYEES.find((e) => e.id === managerId);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
  );

  const [buddies, setBuddies] = useState<BuddyMatch[]>([]);
  const [buddiesLoading, setBuddiesLoading] = useState(false);

  // バディマッチ取得
  useEffect(() => {
    if (!candidate || !position || !departmentObj) return;
    setBuddiesLoading(true);
    fetch("/api/recruiting/buddy-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        new_hire_role: position.title,
        new_hire_department_id: departmentObj.id,
        new_hire_skills: position.required_skills,
        new_hire_country_code: "JP", // demo: 簡略化
      }),
    })
      .then((r) => r.json())
      .then((j: { ok: boolean; matches?: BuddyMatch[] }) => {
        if (j.ok && j.matches) setBuddies(j.matches);
      })
      .finally(() => setBuddiesLoading(false));
  }, [candidate, position, departmentObj]);

  if (!candidate || !position) {
    return <div className="text-sm text-muted-foreground">入社予定者がいません</div>;
  }

  return (
    <div className="space-y-5">
      {/* ヘッダ */}
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Rocket className="size-6 text-gc-700" />
          オンボーディング AI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          入社者プロフィールから 30/60/90 日プランを AI 自動生成 + バディも自動マッチ
        </p>
      </div>

      {/* 入社者セットアップ */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <UserPlus className="size-4 text-gc-700" />
            入社者情報
          </h3>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="入社者">
              <Select value={candidateId} onValueChange={setCandidateId}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {eligibleCandidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}（{DEMO_POSITIONS.find((p) => p.id === c.position_id)?.title}）
                    </SelectItem>
                  ))}
                  {DEMO_CANDIDATES.filter((c) => !["hired", "offer"].includes(c.stage)).slice(0, 5).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}（{DEMO_POSITIONS.find((p) => p.id === c.position_id)?.title}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="マネージャー">
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEMO_EMPLOYEES.filter((e) => e.status === "active" && /(manager|lead|chief|vp|head|cpo|coo|cto|chro|ceo)/i.test(e.job_title))
                    .slice(0, 12)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}（{e.job_title}）</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="入社予定日">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm" />
            </Field>
          </div>

          {/* 候補者プレビュー */}
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
            <Avatar className="size-10">
              <AvatarFallback>{initials(candidate.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{candidate.full_name}</div>
              <div className="text-xs text-muted-foreground">
                {candidate.current_role} @ {candidate.current_company} · {candidate.years_of_experience}年
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{candidate.notes}</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground shrink-0" />
            <div className="text-right">
              <div className="text-xs font-semibold">{position.title}</div>
              <div className="text-[11px] text-muted-foreground">{department}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* バディマッチ */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4 text-gc-700" />
            バディ自動マッチ
            <span className="font-normal text-[11px] text-muted-foreground">
              — 部門・スキル・在籍年数・特性で 5 シグナル合成スコア
            </span>
          </h3>
          {buddiesLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              マッチング中...
            </div>
          ) : buddies.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              該当するバディ候補が見つかりません
            </div>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-3">
              {buddies.map((b, i) => (
                <li key={b.employee.id} className={cn(
                  "rounded-md border p-3 transition-shadow hover:shadow-sm",
                  i === 0 && "border-emerald-300 bg-emerald-50/40",
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      #{i + 1} 候補
                    </span>
                    <span className="font-mono text-base font-bold tabular-nums">
                      {Math.round(b.score * 100)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs">{initials(b.employee.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium text-sm leading-tight">{b.employee.full_name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{b.employee.job_title}</div>
                      {b.profile.is_high_performer && (
                        <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] font-bold text-amber-700">★ 活躍人材</span>
                      )}
                    </div>
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {b.reasons.slice(0, 4).map((r, j) => (
                      <li key={j} className="flex items-start gap-1 text-[11px] text-muted-foreground">
                        <span className="font-mono tabular-nums shrink-0">+{Math.round(r.weight * 100)}</span>
                        <span>{r.label}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 w-full gap-1 px-2 text-[11px]"
                    onClick={() => alert(`${b.employee.full_name} さんにバディ依頼を Slack で送信（実装時）`)}
                  >
                    バディ依頼を送る
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* AI 90 日プラン */}
      <AiGeneratePanel
        title="AI 90 日プラン生成"
        endpoint="/api/ai/onboarding-plan"
        hint="ロール・経歴・部門コンテキストから、30/60/90 日のマイルストーンを Markdown で生成"
        buttonLabel="90 日プランを生成"
        payload={() => ({
          new_hire_name: candidate.full_name,
          role_title: position.title,
          department,
          manager_name: manager?.full_name ?? "—",
          start_date: startDate,
          background_summary: `${candidate.current_role ?? ""} @ ${candidate.current_company ?? ""}（${candidate.years_of_experience ?? "?"}年）。${candidate.notes ?? ""}`,
          required_skills: position.required_skills,
          team_context: `部門: ${department}。グローバルチーム（日本・インドネシア・ベトナム拠点あり）。Carbon 計算プロダクトを中核に、ICVCM 認証準備中。`,
        })}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
