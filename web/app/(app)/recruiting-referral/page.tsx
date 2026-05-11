"use client";

/**
 * /recruiting-referral
 *
 * リファラル強化ハブ。
 *
 * 構成：
 *  1. 全社最強マッチ Top 10（誰経由でどの候補者を引けそうか）
 *  2. 社員選択 → その人にだけサジェスト 5 件
 *  3. 各サジェストカードで「Slack で依頼」ボタン → DM 下書きを生成 + 開く
 */

import { useEffect, useMemo, useState } from "react";
import {
  HeartHandshake, Search, Sparkles, ExternalLink, Send, Loader2,
  ArrowUpRight, Globe2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_TALENT_PROFILES } from "@/lib/demo/talent-profiles";
import { initials, cn } from "@/lib/utils";
import { sendSlackReminder } from "@/lib/slack";
import { buildReferralRequestMessage, type ReferralSuggestion } from "@/lib/recruiting/referral";

export const dynamic = "force-dynamic";

type TopRow = { referrer: typeof DEMO_EMPLOYEES[number]; suggestion: ReferralSuggestion };

const SIGNAL_BADGE: Record<string, { label: string; cls: string }> = {
  open_to_work: { label: "🔥 Open to Work", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  passive:      { label: "Passive",          cls: "bg-amber-100 text-amber-800 border-amber-300" },
  not_looking:  { label: "Not looking",      cls: "bg-gray-100 text-gray-700 border-gray-300" },
};

const PROFILED_EMPLOYEE_IDS = new Set(DEMO_TALENT_PROFILES.map((p) => p.employee_id));

export default function RecruitingReferralPage() {
  const [topAll, setTopAll] = useState<TopRow[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>("e8"); // デフォルト VPoE
  const [empSuggestions, setEmpSuggestions] = useState<ReferralSuggestion[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [empQuery, setEmpQuery] = useState("");

  // 全体 Top の取得
  useEffect(() => {
    setLoadingTop(true);
    fetch("/api/recruiting/referral-suggestions")
      .then((r) => r.json())
      .then((j: { ok: boolean; top?: TopRow[] }) => {
        if (j.ok && j.top) setTopAll(j.top);
      })
      .finally(() => setLoadingTop(false));
  }, []);

  // 社員選択時のサジェスト取得
  useEffect(() => {
    setLoadingEmp(true);
    fetch(`/api/recruiting/referral-suggestions?employeeId=${selectedEmpId}`)
      .then((r) => r.json())
      .then((j: { ok: boolean; suggestions?: ReferralSuggestion[] }) => {
        if (j.ok && j.suggestions) setEmpSuggestions(j.suggestions);
        else setEmpSuggestions([]);
      })
      .finally(() => setLoadingEmp(false));
  }, [selectedEmpId]);

  const profiledEmployees = useMemo(
    () =>
      DEMO_EMPLOYEES
        .filter((e) => e.status === "active" && PROFILED_EMPLOYEE_IDS.has(e.id))
        .filter((e) => {
          if (!empQuery) return true;
          const q = empQuery.toLowerCase();
          return [e.full_name, e.full_name_kana, e.display_name_en, e.job_title]
            .filter(Boolean).some((s) => s!.toLowerCase().includes(q));
        }),
    [empQuery],
  );

  const selectedEmp = DEMO_EMPLOYEES.find((e) => e.id === selectedEmpId);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <HeartHandshake className="size-6 text-gc-700" />
          リファラル強化
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          社員のスキル × 出身業界 × 組織ギャップから、社員ごとに「知ってそうな候補者」を AI でサジェスト
        </p>
      </div>

      {/* ── 全社 Top 10 ─────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-gc-700" />
              今、最も繋ぎやすい候補者 × 経由社員 Top 10
            </h2>
            <span className="text-[11px] text-muted-foreground">合成スコア降順</span>
          </div>

          {loadingTop ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              全社員 × 候補者プールを照合中...
            </div>
          ) : topAll.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              該当する高シグナル候補者がいません
            </div>
          ) : (
            <ul className="divide-y">
              {topAll.slice(0, 10).map((row, i) => (
                <li key={`${row.referrer.id}-${row.suggestion.profile.id}`} className="py-2.5">
                  <TopRowItem rank={i + 1} row={row} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── 社員別ドリルダウン ───────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* 社員リスト */}
        <Card className="lg:col-span-2">
          <CardContent className="space-y-2 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={empQuery}
                onChange={(e) => setEmpQuery(e.target.value)}
                placeholder="社員を検索..."
                className="h-8 pl-8 text-sm"
              />
            </div>
            <ul className="max-h-96 divide-y overflow-y-auto rounded-md border">
              {profiledEmployees.map((e) => {
                const profile = DEMO_TALENT_PROFILES.find((p) => p.employee_id === e.id);
                const isActive = e.id === selectedEmpId;
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => setSelectedEmpId(e.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                        isActive ? "bg-gc-50" : "hover:bg-accent",
                      )}
                    >
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{e.full_name}</span>
                          {profile?.is_high_performer && (
                            <span className="text-[10px]" title="活躍人材">★</span>
                          )}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">{e.job_title}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* サジェスト */}
        <Card className="lg:col-span-3">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="size-3.5 text-gc-700" />
                {selectedEmp?.full_name} さんが知ってそうな候補者
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {empSuggestions.length} 件
              </span>
            </div>

            {loadingEmp ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                マッチング中...
              </div>
            ) : empSuggestions.length === 0 ? (
              <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                強いシグナルの候補者はいません
              </div>
            ) : (
              <ul className="space-y-2">
                {empSuggestions.map((s) => (
                  <li key={s.profile.id}>
                    <SuggestionCard
                      suggestion={s}
                      employeeName={selectedEmp?.full_name ?? ""}
                      employeeSlackId={selectedEmp?.slack_user_id}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] text-muted-foreground">
        💡 マッチングは <strong>業界カテゴリ・スキル重複・国・戦略ギャップ・候補者の応募意欲</strong> の
        重み付き合成スコア。本番では LinkedIn の元同僚 / 共著者ネットワークを加味してさらに精度向上できます。
      </div>
    </div>
  );
}

// ── 部品 ─────────────────────────────────────

function TopRowItem({ rank, row }: { rank: number; row: TopRow }) {
  const { referrer, suggestion } = row;
  const cand = suggestion.profile;
  return (
    <div className="flex flex-wrap items-start gap-3">
      <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground">
        {rank.toString().padStart(2, "0")}
      </span>
      <div className="flex flex-1 min-w-0 items-center gap-2">
        <Avatar className="size-7">
          <AvatarFallback className="text-[10px]">{initials(referrer.full_name)}</AvatarFallback>
        </Avatar>
        <div className="text-xs">
          <div className="font-medium leading-tight">{referrer.full_name}</div>
          <div className="text-muted-foreground">{referrer.job_title}</div>
        </div>
      </div>
      <ArrowUpRight className="size-3.5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{cand.full_name}</span>
          <Badge
            variant="outline"
            className={cn("border text-[9px]", SIGNAL_BADGE[cand.signal].cls)}
          >
            {SIGNAL_BADGE[cand.signal].label}
          </Badge>
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {cand.current_role} @ {cand.current_company}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-base font-bold tabular-nums">
          {Math.round(suggestion.score * 100)}
        </div>
        <div className="text-[9px] text-muted-foreground">match</div>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion: s, employeeName, employeeSlackId,
}: {
  suggestion: ReferralSuggestion;
  employeeName: string;
  employeeSlackId?: string;
}) {
  const [sending, setSending] = useState(false);
  const cand = s.profile;

  const requestReferral = async () => {
    if (!employeeSlackId) {
      toast.error("Slack ID が未設定の社員です");
      return;
    }
    setSending(true);
    try {
      const message = buildReferralRequestMessage(employeeName, cand, s.reasons);
      const r = await sendSlackReminder(employeeSlackId, message);
      if (r.delivered) {
        toast.success(`${employeeName} さんに DM を送信しました`);
      } else {
        toast.message("Slack 未接続のため URL で開きました", {
          description: "本文はクリップボードにコピー済み",
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border bg-card p-3 transition-shadow hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{cand.full_name}</span>
            <Badge variant="outline" className={cn("border text-[10px]", SIGNAL_BADGE[cand.signal].cls)}>
              {SIGNAL_BADGE[cand.signal].label}
            </Badge>
            {s.fills_gap && (
              <Badge variant={s.fills_gap.severity === "high" ? "danger" : "warning"} className="text-[10px]">
                ギャップ充足: {s.fills_gap.area}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {cand.current_role} @ {cand.current_company}
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Globe2 className="size-3" />
            {cand.location} · {cand.years_of_experience}年
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xl font-bold tabular-nums leading-none">
            {Math.round(s.score * 100)}
          </div>
          <div className="text-[10px] text-muted-foreground">match</div>
        </div>
      </div>

      <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
        {cand.bio}
      </p>

      {/* シグナル */}
      <ul className="space-y-0.5">
        {s.reasons.slice(0, 3).map((r, i) => (
          <li key={i} className="flex items-start gap-1 text-[11px] text-muted-foreground">
            <span className="font-mono tabular-nums">+{Math.round(r.weight * 100)}</span>
            <span>{r.label}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {cand.linkedin_url && (
          <Button asChild variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]">
            <a href={cand.linkedin_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3" />
              LinkedIn
            </a>
          </Button>
        )}
        <Button
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={() => void requestReferral()}
          disabled={sending}
        >
          {sending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
          リファラル依頼を Slack で送る
        </Button>
      </div>
    </div>
  );
}
