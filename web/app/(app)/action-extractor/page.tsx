"use client";

/**
 * /action-extractor
 *
 * 議事録 → アクション抽出 → ツール分配。
 *
 *  - 議事録 textarea + 参加者 chip（カンマ区切りパース）
 *  - 「抽出」ボタン → AI が JSON で返す
 *  - 抽出結果テーブル：assignee / title / due / カテゴリ / 推奨 destination
 *  - 各行に「このツールに送る」ボタン（demo はトーストのみ）
 */

import { useState } from "react";
import {
  ListChecks, Loader2, ArrowRight, Calendar, Sparkles, Send, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ActionExtractionOutput, ExtractedAction } from "@/lib/ai/prompts";
import { VoiceRecorder } from "@/components/voice-recorder";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SAMPLE = `日付: 2026-05-12
参加者: 藤本（マネージャー）、川崎（VPoE）

藤本：来期は技術深耕で行きたい。OKR は CO2 計算エンジンのリファクタリングを KR に据えたい。
川崎：いいね、ドラフトを来週金曜までに作っておいてください。

藤本：マネジメントは現状で十分。新人 2 名のメンタリングは続けたい。
川崎：テックリードロールの定義を僕が明文化します。次回 1on1 までに。

藤本：Rust 勉強会を社内で開きたい。
川崎：ぜひ。塚本さんに告知のサポートをお願いしておきます。2 週間以内に動きましょう。

藤本：副業について、別途相談したい点があるので次回 1on1 まで考えておきます。`;

const CATEGORY_META: Record<ExtractedAction["category"], { label: string; cls: string }> = {
  follow_up:   { label: "フォロー", cls: "bg-blue-100 text-blue-800 border-blue-300" },
  decision:    { label: "意思決定", cls: "bg-purple-100 text-purple-800 border-purple-300" },
  research:    { label: "調査",     cls: "bg-amber-100 text-amber-800 border-amber-300" },
  deliverable: { label: "成果物",   cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  intro:       { label: "紹介",     cls: "bg-pink-100 text-pink-800 border-pink-300" },
  other:       { label: "その他",   cls: "bg-muted text-muted-foreground" },
};

const DEST_META: Record<ExtractedAction["suggested_destination"], { label: string; href: string }> = {
  oneonone:      { label: "1on1",     href: "/oneonone" },
  okr:           { label: "OKR",      href: "/mbo-okr" },
  hr_helpdesk:   { label: "ヘルプデスク", href: "/helpdesk" },
  recruiting:    { label: "採用",     href: "/recruiting" },
  general_task:  { label: "タスク",   href: "#" },
};

export default function ActionExtractorPage() {
  const [notes, setNotes] = useState(SAMPLE);
  const [participantsRaw, setParticipantsRaw] = useState("藤本 渉, 川崎 健太, 塚本 真純");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<ActionExtractionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dispatched, setDispatched] = useState<Set<number>>(new Set());

  const extract = async () => {
    setLoading(true);
    setError(null);
    setOutput(null);
    setDispatched(new Set());
    try {
      const res = await fetch("/api/ai/extract-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          participants: participantsRaw.split(/[,、]/).map((s) => s.trim()).filter(Boolean),
          meeting_date: meetingDate,
        }),
      });
      const json = (await res.json()) as
        | { ok: true; output: ActionExtractionOutput }
        | { ok: false; error: string };
      if (json.ok) setOutput(json.output);
      else setError(json.error);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const dispatch = (i: number, action: ExtractedAction) => {
    const dest = DEST_META[action.suggested_destination];
    setDispatched(new Set(dispatched).add(i));
    toast.success(`「${action.title}」を ${dest.label} に送信しました（demo）`, {
      description: `担当: ${action.assignee}${action.due_date ? ` · 期限: ${action.due_date}` : ""}`,
    });
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ListChecks className="size-6 text-gc-700" />
          AI 議事録 → アクション抽出
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          議事録から「誰が」「何を」「いつまでに」を構造化抽出 → 1on1 / OKR / ヘルプデスク等に自動分配
        </p>
      </div>

      {/* 入力 */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="参加者（カンマ区切り）">
              <Input value={participantsRaw} onChange={(e) => setParticipantsRaw(e.target.value)} />
            </Field>
            <Field label="会議日">
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </Field>
          </div>
          <Field label="議事録（音声入力 or 直接入力）">
            <VoiceRecorder
              language="ja"
              onTranscript={(text) => setNotes((cur) => cur ? `${cur}\n\n${text}` : text)}
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={12}
              placeholder="マイクで話すか、ここに直接ペーストしてください"
              className="mt-2 w-full resize-none rounded-md border bg-background px-3 py-2 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gc-400"
            />
          </Field>
          <div className="flex justify-end">
            <Button onClick={() => void extract()} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              アクション抽出
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex items-start gap-2 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* 結果 */}
      {output && (
        <>
          <Card className="border-gc-300 bg-gc-50/40">
            <CardContent className="flex items-start gap-2 p-3">
              <Sparkles className="mt-0.5 size-4 text-gc-700" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">会議の要旨</div>
                <p className="text-sm font-medium">{output.summary_oneliner}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="border-b p-3">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <ListChecks className="size-4 text-gc-700" />
                  抽出されたアクション（{output.actions.length} 件）
                </h2>
              </div>
              <ul className="divide-y">
                {output.actions.map((a, i) => {
                  const isSent = dispatched.has(i);
                  return (
                    <li key={i} className={cn(
                      "flex flex-wrap items-start gap-3 p-3",
                      isSent && "opacity-60",
                    )}>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={cn("border text-[10px]", CATEGORY_META[a.category].cls)}>
                            {CATEGORY_META[a.category].label}
                          </Badge>
                          <span className="rounded-full bg-gc-50 px-1.5 py-0.5 text-[10px] text-gc-800">
                            👤 {a.assignee}
                          </span>
                          {a.due_date && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800">
                              <Calendar className="size-2.5" />
                              {a.due_date}
                            </span>
                          )}
                          <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                            信頼 {Math.round(a.confidence * 100)}%
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium">{a.title}</p>
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          推奨: {DEST_META[a.suggested_destination].label}
                          <ArrowRight className="size-3" />
                        </div>
                      </div>
                      <Button
                        onClick={() => dispatch(i, a)}
                        size="sm"
                        variant={isSent ? "outline" : "default"}
                        disabled={isSent}
                        className="h-7 gap-1 px-2 text-xs"
                      >
                        <Send className="size-3" />
                        {isSent ? "送信済" : `${DEST_META[a.suggested_destination].label} に送る`}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
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
