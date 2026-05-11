"use client";

/**
 * /coaching
 *
 * AI コーチング：個人ごとに月次のセッション。
 *  - 関心テーマ入力
 *  - 過去履歴の参照
 *  - GROW モデルベースの問いを生成
 *  - 履歴は localStorage（demo）
 */

import { useEffect, useState } from "react";
import { Brain, Calendar, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AiGeneratePanel } from "@/components/ai-generate-panel";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STORAGE_KEY = "gc.coaching.sessions";

type Session = {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  focus_topic: string;
  text: string;
};

const SAMPLE_FOCI = [
  "次のキャリアステップ",
  "マネージャーとの関係",
  "業務とプライベートのバランス",
  "新しい役割へのストレッチ",
  "チームでの存在感の発揮",
  "学習リソースの優先順位",
];

export default function CoachingPage() {
  const [employeeId, setEmployeeId] = useState<string>("e9");
  const employee = DEMO_EMPLOYEES.find((e) => e.id === employeeId);

  const [focusTopic, setFocusTopic] = useState("マネジメント志向と技術深耕の整理");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSessions(JSON.parse(raw) as Session[]);
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const saveSessions = (list: Session[]) => {
    setSessions(list);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  };

  const mySessions = sessions
    .filter((s) => s.employee_id === employeeId)
    .sort((a, b) => b.date.localeCompare(a.date));

  // 過去履歴を AI 入力として要約
  const priorSummary = mySessions.slice(0, 3).map((s) =>
    `[${s.date}] ${s.focus_topic}`
  ).join("\n");

  const recentContext = `直近 1 年で OKR 1.05 達成、テックリードとして 5 名のチームを率いる。マネージャーから「マネジメント志向の育成」を期待されているが、本人は IC 寄りと自己認識。`;

  const onResult = (text: string) => {
    if (!employee) return;
    const newSession: Session = {
      id: `s-${Date.now()}`,
      employee_id: employeeId,
      date: new Date().toISOString().slice(0, 10),
      focus_topic: focusTopic,
      text,
    };
    saveSessions([newSession, ...sessions].slice(0, 50)); // 50 件まで保持
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Brain className="size-6 text-gc-700" />
          AI コーチング
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GROW モデルベースの月次コーチング会話を AI で生成。アドバイスではなく「問い」を中心に
        </p>
      </div>

      {/* セッション設定 */}
      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-2">
          <div>
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              対象社員
            </span>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEMO_EMPLOYEES.filter((e) => e.status === "active").slice(0, 15).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}（{e.job_title}）</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              今月の関心テーマ
            </span>
            <Input
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              placeholder="例: マネジメント vs 技術深耕、来期キャリア..."
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {SAMPLE_FOCI.map((f) => (
                <button
                  key={f}
                  onClick={() => setFocusTopic(f)}
                  className="rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {employee && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Avatar className="size-10">
              <AvatarFallback>{initials(employee.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{employee.full_name}</div>
              <div className="text-xs text-muted-foreground">{employee.job_title}</div>
            </div>
            <div className="text-right text-xs">
              <div className="text-muted-foreground">過去セッション</div>
              <div className="font-mono text-base font-bold tabular-nums">
                {hydrated ? mySessions.length : 0} 回
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI コーチング生成 */}
      <AiGeneratePanel
        title="今月のコーチングセッション"
        endpoint="/api/ai/coaching"
        hint={`関心テーマ「${focusTopic}」と過去 ${mySessions.length} 回の履歴をもとに、GROW モデルの問いを生成します`}
        buttonLabel="セッションを生成"
        onResult={onResult}
        payload={() => ({
          employee_name: employee?.full_name ?? "",
          role: employee?.job_title ?? "",
          recent_context: recentContext,
          focus_topic: focusTopic,
          prior_sessions: priorSummary || undefined,
        })}
      />

      {/* 履歴 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <History className="size-4 text-gc-700" />
            セッション履歴
          </h2>
          {!hydrated ? (
            <div className="text-sm text-muted-foreground">読み込み中...</div>
          ) : mySessions.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              まだセッションがありません。上の「セッションを生成」を押すと履歴に保存されます
            </div>
          ) : (
            <ul className="space-y-2">
              {mySessions.map((s) => (
                <li key={s.id} className="rounded-md border bg-card p-3">
                  <details>
                    <summary className="cursor-pointer">
                      <div className="inline-flex items-center gap-2 text-sm">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        <span className="font-mono tabular-nums">{s.date}</span>
                        <span className="font-medium">{s.focus_topic}</span>
                      </div>
                    </summary>
                    <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-[11px] leading-relaxed">
                      {s.text}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
          {mySessions.length > 0 && (
            <button
              onClick={() => saveSessions(sessions.filter((s) => s.employee_id !== employeeId))}
              className="mt-3 text-[11px] text-muted-foreground hover:text-red-700"
            >
              この社員の履歴をクリア
            </button>
          )}
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        🔒 履歴は <strong>localStorage</strong> に保存（demo 用）。
        本番では Supabase の <code className="font-mono">coaching_sessions</code> テーブルに RLS（本人 + コーチ + HR 管理者のみ）で保管。
      </div>
    </div>
  );
}
