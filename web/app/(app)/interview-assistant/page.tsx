"use client";

/**
 * /interview-assistant
 *
 * 面接官のための AI コンパニオン。
 *
 *  ┌─ 上段：候補者・ポジション・ラウンド・面接官選択 ────────────┐
 *  │                                                              │
 *  ├─ 中段：tabs                                                  │
 *  │     [事前ブリーフィング] [ライブモード]                        │
 *  └──────────────────────────────────────────────────────────┘
 *
 * 事前ブリーフィング：AI で Markdown のブリーフィング生成
 * ライブモード：
 *   - タイマー（カウントダウン）
 *   - コンピテンシーチェックリスト（カバー済をチェック）
 *   - 会話メモ textarea
 *   - 「次の質問サジェスト」ボタン → JSON で 3-5 個の質問
 *   - 質問カードを「使った」マークで会話メモへ自動追記
 */

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mic, Clock, Loader2, Sparkles, CheckCircle2,
  PlayCircle, PauseCircle, RotateCcw, ArrowRight, Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AiGeneratePanel } from "@/components/ai-generate-panel";
import { initials, cn } from "@/lib/utils";
import { DEMO_CANDIDATES, DEMO_POSITIONS } from "@/lib/demo/recruiting";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import type { LiveQuestionOutput, LiveQuestionSuggestion } from "@/lib/ai/prompts";

export const dynamic = "force-dynamic";

const COMPETENCIES = [
  "技術力", "実行力", "コミュニケーション",
  "リーダーシップ", "戦略・抽象化", "カルチャーフィット",
] as const;
type Competency = (typeof COMPETENCIES)[number];

const TYPE_TONE: Record<LiveQuestionSuggestion["type"], { label: string; cls: string }> = {
  open:       { label: "オープン",   cls: "bg-blue-100 text-blue-800 border-blue-300" },
  behavioral: { label: "行動",       cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  technical:  { label: "技術",       cls: "bg-purple-100 text-purple-800 border-purple-300" },
  scenario:   { label: "仮説",       cls: "bg-amber-100 text-amber-800 border-amber-300" },
};

function Inner() {
  const sp = useSearchParams();

  // ── 入力状態 ─────────────────────────────
  const [candidateId, setCandidateId] = useState<string>(
    sp?.get("candidateId") ?? DEMO_CANDIDATES[0]?.id ?? "",
  );
  const [round, setRound] = useState<string>("1次面接");
  const [interviewerId, setInterviewerId] = useState<string>("e8");
  const [tab, setTab] = useState<"briefing" | "live">("briefing");

  const candidate = DEMO_CANDIDATES.find((c) => c.id === candidateId);
  const position = candidate ? DEMO_POSITIONS.find((p) => p.id === candidate.position_id) : undefined;
  const interviewer = DEMO_EMPLOYEES.find((e) => e.id === interviewerId);

  // ── ライブモード状態 ────────────────────
  const [durationMin, setDurationMin] = useState<number>(45);
  const [secondsLeft, setSecondsLeft] = useState<number>(45 * 60);
  const [running, setRunning] = useState<boolean>(false);
  const [coveredComps, setCoveredComps] = useState<Set<Competency>>(new Set());
  const [conversationNotes, setConversationNotes] = useState<string>("");
  const [suggestions, setSuggestions] = useState<LiveQuestionOutput | null>(null);
  const [suggLoading, setSuggLoading] = useState(false);
  const [usedQuestions, setUsedQuestions] = useState<Set<number>>(new Set());

  // タイマー
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  // タイマーリセット on duration change
  useEffect(() => {
    setSecondsLeft(durationMin * 60);
  }, [durationMin]);

  const minutesRemaining = Math.ceil(secondsLeft / 60);
  const timerLow = secondsLeft <= 5 * 60;

  // ── サジェスト取得 ───────────────────────
  const requestSuggestions = async () => {
    if (!candidate || !position) return;
    setSuggLoading(true);
    setUsedQuestions(new Set());
    try {
      const res = await fetch("/api/ai/interview-question-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: candidate.full_name,
          position_title: position.title,
          required_skills: position.required_skills,
          conversation_so_far: conversationNotes,
          covered_competencies: [...coveredComps],
          minutes_remaining: minutesRemaining,
        }),
      });
      const json = (await res.json()) as { ok: boolean; output?: LiveQuestionOutput; error?: string };
      if (json.ok && json.output) setSuggestions(json.output);
      else setSuggestions(null);
    } finally {
      setSuggLoading(false);
    }
  };

  const applySuggestion = (idx: number, q: LiveQuestionSuggestion) => {
    setUsedQuestions(new Set(usedQuestions).add(idx));
    setConversationNotes((prev) => {
      const ts = formatTimestamp(durationMin * 60 - secondsLeft);
      const line = `\n[${ts}] Q（${q.competency}）: ${q.question}\n  A: `;
      return (prev + line).trim() === "" ? line.trim() : prev + line;
    });
    // カバー済としてマーク
    const matched = COMPETENCIES.find((c) => q.competency.includes(c));
    if (matched) {
      const next = new Set(coveredComps);
      next.add(matched);
      setCoveredComps(next);
    }
  };

  // ── ブリーフィング payload ──────────────────
  const briefingPayload = useMemo(() => {
    if (!candidate || !position || !interviewer) return null;
    return {
      candidate_name: candidate.full_name,
      candidate_role: candidate.current_role ?? "—",
      position_title: position.title,
      required_skills: position.required_skills,
      resume_summary: candidate.current_role
        ? `${candidate.current_role} @ ${candidate.current_company}（${candidate.years_of_experience}年）`
        : undefined,
      candidate_notes: candidate.notes ?? undefined,
      interviewer_name: interviewer.full_name,
      interviewer_role: interviewer.job_title,
      round_label: round,
    };
  }, [candidate, position, interviewer, round]);

  if (!candidate || !position) {
    return (
      <div className="text-sm text-muted-foreground">候補者を選択してください</div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── ヘッダ ─────────────────────── */}
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Mic className="size-6 text-gc-700" />
          AI 面接官アシスタント
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          面接前のブリーフィングと、面接中のリアルタイム質問サジェスト
        </p>
      </div>

      {/* ── セットアップ ─────────────────── */}
      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-4">
          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">候補者</span>
            <Select value={candidateId} onValueChange={setCandidateId}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEMO_CANDIDATES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}（{DEMO_POSITIONS.find((p) => p.id === c.position_id)?.title ?? "—"}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">面接ラウンド</span>
            <Select value={round} onValueChange={setRound}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="カジュアル面談">カジュアル面談</SelectItem>
                <SelectItem value="1次面接">1次面接</SelectItem>
                <SelectItem value="2次面接">2次面接</SelectItem>
                <SelectItem value="3次面接">3次面接</SelectItem>
                <SelectItem value="最終面接">最終面接</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">面接官（あなた）</span>
            <Select value={interviewerId} onValueChange={setInterviewerId}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEMO_EMPLOYEES.filter((e) => e.status === "active").slice(0, 15).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name}（{e.job_title}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">予定時間（分）</span>
            <Input
              type="number"
              value={durationMin}
              onChange={(e) => setDurationMin(Math.max(15, Math.min(120, Number(e.target.value) || 45)))}
              className="text-sm"
              min={15} max={120}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── タブ ───────────────────────── */}
      <div className="flex gap-1 border-b">
        {([
          { id: "briefing" as const, label: "事前ブリーフィング", icon: Sparkles },
          { id: "live"     as const, label: "ライブモード",        icon: Clock },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              tab === t.id
                ? "border-gc-600 font-semibold text-gc-700"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 事前ブリーフィング ───────────── */}
      {tab === "briefing" && briefingPayload && (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{initials(candidate.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-sm">{candidate.full_name}</div>
                <div className="text-muted-foreground">{candidate.current_role} @ {candidate.current_company}</div>
              </div>
              <ArrowRight className="size-3 text-muted-foreground" />
              <div>
                <div className="font-semibold text-sm">{position.title}</div>
                <div className="text-muted-foreground">{round} · 担当: {interviewer?.full_name}</div>
              </div>
            </div>
          </div>

          <AiGeneratePanel
            title="面接前ブリーフィング"
            endpoint="/api/ai/interview-briefing"
            hint="候補者・前回までのメモから、推奨質問・注意点・引き出しフックを 5 分で読める形に"
            buttonLabel="ブリーフィングを生成"
            payload={() => briefingPayload}
          />
        </div>
      )}

      {/* ── ライブモード ───────────────── */}
      {tab === "live" && (
        <div className="space-y-4">
          {/* タイマー */}
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">残り時間</div>
                <div className={cn(
                  "font-mono text-3xl font-bold tabular-nums leading-none",
                  timerLow ? "text-red-600 animate-pulse" : "text-foreground",
                )}>
                  {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
                  {String(secondsLeft % 60).padStart(2, "0")}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={running ? "outline" : "default"}
                  onClick={() => setRunning(!running)}
                  className="gap-1.5"
                >
                  {running ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4" />}
                  {running ? "一時停止" : "開始"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setRunning(false); setSecondsLeft(durationMin * 60); }}
                  className="gap-1.5"
                >
                  <RotateCcw className="size-4" />
                  リセット
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* コンピテンシーチェック */}
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <CheckCircle2 className="size-3.5 text-gc-700" />
                評価軸カバレッジ
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {COMPETENCIES.map((c) => {
                  const checked = coveredComps.has(c);
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        const next = new Set(coveredComps);
                        if (checked) next.delete(c); else next.add(c);
                        setCoveredComps(next);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        checked
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-border bg-background text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {checked ? <CheckCircle2 className="size-3" /> : <Plus className="size-3" />}
                      {c}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {coveredComps.size} / {COMPETENCIES.length} 軸カバー済 — サジェストは未カバーを優先します
              </div>
            </CardContent>
          </Card>

          {/* 質問サジェスト */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="size-3.5 text-gc-700" />
                  次の質問サジェスト
                </h3>
                <Button
                  onClick={() => void requestSuggestions()}
                  disabled={suggLoading}
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                >
                  {suggLoading
                    ? <><Loader2 className="size-3 animate-spin" />生成中</>
                    : <><Sparkles className="size-3" />サジェスト</>
                  }
                </Button>
              </div>

              {suggestions && (
                <>
                  <ul className="mt-3 space-y-2">
                    {suggestions.suggestions.map((q, i) => (
                      <li
                        key={i}
                        className={cn(
                          "rounded-md border p-3 transition-opacity",
                          usedQuestions.has(i) && "opacity-50",
                        )}
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={cn("border text-[10px]", TYPE_TONE[q.type].cls)}>
                            {TYPE_TONE[q.type].label}
                          </Badge>
                          <span className="rounded-full bg-gc-50 px-1.5 py-0.5 text-[10px] font-medium text-gc-800">
                            {q.competency}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed">{q.question}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          💡 {q.rationale}
                        </p>
                        {!usedQuestions.has(i) && (
                          <Button
                            onClick={() => applySuggestion(i, q)}
                            variant="outline"
                            size="sm"
                            className="mt-2 h-6 gap-1 px-2 text-[11px]"
                          >
                            <ArrowRight className="size-3" />
                            この質問を使う
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 rounded-md bg-amber-50/60 p-2 text-[11px] leading-relaxed text-amber-900">
                    ⏱ {suggestions.time_advice}
                  </div>
                </>
              )}

              {!suggestions && !suggLoading && (
                <p className="mt-3 text-xs text-muted-foreground">
                  会話を進めながらメモを取り、「サジェスト」ボタンで次の質問を AI に提案させましょう。
                </p>
              )}
            </CardContent>
          </Card>

          {/* 会話メモ */}
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-2 text-sm font-semibold">会話メモ</h3>
              <textarea
                value={conversationNotes}
                onChange={(e) => setConversationNotes(e.target.value)}
                rows={10}
                placeholder="面接の進行に合わせて要点をメモ。「この質問を使う」を押すと自動で追記されます。"
                className="w-full resize-none rounded-md border bg-background px-3 py-2 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gc-400"
              />
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>{conversationNotes.length} 文字</span>
                <span>面接後はこのメモを 1on1 議事録 AI に渡せます</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(secondsElapsed: number): string {
  const m = Math.floor(secondsElapsed / 60);
  const s = secondsElapsed % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
