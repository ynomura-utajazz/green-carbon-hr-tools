"use client";

/**
 * /careers/track
 *
 * 候補者本人が選考状況を確認するマイページ。
 *
 *  応募 ID + メールアドレスで照会 → 自分のステージ・次のステップ・担当者を表示。
 *  本番では magic-link / OTP メール推奨だが、デモは email 直接突合。
 */

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2, AlertCircle, CheckCircle2, Mail, Search, Clock, ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrackResponse } from "@/app/api/public/track/route";

function Inner() {
  const sp = useSearchParams();
  const [appId, setAppId] = useState(sp?.get("id") ?? "");
  const [email, setEmail] = useState(sp?.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrackResponse["candidate"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!appId || !email) {
      setError("応募 ID とメールアドレスを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: appId, email }),
      });
      const json = (await res.json()) as TrackResponse | { ok: false; error: string };
      if (json.ok) {
        setData(json.candidate);
      } else {
        setError(json.error);
        setData(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">選考状況の確認</h1>
        <p className="text-sm text-muted-foreground">
          応募完了時のメールに記載されている <strong>応募 ID</strong> と、ご登録の <strong>メールアドレス</strong> をご入力ください。
        </p>
      </header>

      {!data && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <Field label="応募 ID" required>
              <Input
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="cand-1 / demo-xxxxx 等"
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </Field>
            <Field label="メールアドレス" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button onClick={() => void submit()} disabled={loading} className="w-full gap-1.5">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              選考状況を確認する
            </Button>

            <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
              💡 <strong>デモモード：</strong> 応募 ID に
              <code className="mx-1 font-mono text-[10px]">cand-1</code>、メールに
              <code className="mx-1 font-mono text-[10px]">k.tanaka@example.com</code> でテスト可能です。
            </div>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-4">
          {/* サマリ */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{data.full_name} 様</h2>
                  <p className="text-sm text-muted-foreground">
                    {data.position_title} へのご応募
                  </p>
                </div>
                <button
                  onClick={() => { setData(null); setAppId(""); setEmail(""); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  別の応募を確認
                </button>
              </div>

              <div className="rounded-md border-2 border-gc-300 bg-gc-50/50 p-4">
                <div className="text-[11px] uppercase tracking-wider text-gc-700">現在のステージ</div>
                <div className="mt-0.5 text-2xl font-bold">{data.stage_label}</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-gc-400 to-gc-700 transition-all duration-500"
                    style={{ width: `${data.progress * 100}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-[11px] text-muted-foreground">
                  進捗 {Math.round(data.progress * 100)}%
                </div>
              </div>
            </CardContent>
          </Card>

          {/* タイムライン */}
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 text-sm font-semibold">選考フロー</h3>
              <ol className="space-y-2">
                {data.timeline.map((t) => (
                  <li key={t.stage} className="flex items-center gap-3">
                    <div className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                      t.current
                        ? "border-gc-600 bg-gc-600 text-white animate-pulse"
                        : t.reached
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-muted bg-background text-muted-foreground",
                    )}>
                      {t.reached && !t.current ? <CheckCircle2 className="size-3" /> : ""}
                    </div>
                    <span className={cn(
                      "text-sm",
                      t.current ? "font-bold" : t.reached ? "text-foreground" : "text-muted-foreground",
                    )}>
                      {t.stage === "applied" ? "応募完了" :
                       t.stage === "screening" ? "書類選考" :
                       t.stage === "interview_1" ? "1 次面接" :
                       t.stage === "interview_2" ? "2 次面接" :
                       t.stage === "final" ? "最終面接" :
                       t.stage === "offer" ? "オファー" :
                       t.stage === "hired" ? "採用決定" : t.stage}
                    </span>
                    {t.current && (
                      <span className="ml-auto rounded-full bg-gc-100 px-2 py-0.5 text-[10px] font-bold text-gc-800">
                        現在
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* 次のステップ */}
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <ArrowRight className="size-3.5 text-gc-700" />
                次のステップ
              </h3>
              <p className="text-sm leading-relaxed">{data.next_step}</p>

              {data.contact_email && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3 text-xs">
                  <Mail className="size-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">担当者:</span>
                  <span className="font-medium">{data.contact_name}</span>
                  <a href={`mailto:${data.contact_email}`} className="text-gc-700 hover:underline">
                    {data.contact_email}
                  </a>
                </div>
              )}

              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                最終更新: {new Date(data.last_update).toLocaleString("ja-JP")}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            ご質問があれば、上記の担当者までお気軽にメールください。
            応募状況に大きな進展があった際は、メールでもご連絡いたします。
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
