"use client";

/**
 * /careers/feedback
 *
 * 候補者向け：選考体験フィードバック（NPS）。
 * 応募 ID をクエリで受け取れるが、匿名でも回答可能。
 */

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Inner() {
  const sp = useSearchParams();
  const [appId, setAppId] = useState(sp?.get("id") ?? "");
  const [stage, setStage] = useState<string>(sp?.get("stage") ?? "");
  const [nps, setNps] = useState<number | null>(null);
  const [positive, setPositive] = useState("");
  const [negative, setNegative] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (nps === null) {
      setError("0-10 のスコアを選択してください");
      return;
    }
    setState("submitting"); setError(null);
    try {
      const res = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: appId || undefined,
          nps,
          positive: positive || undefined,
          negative: negative || undefined,
          stage_at_feedback: stage || undefined,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) setState("ok");
      else { setState("error"); setError(json.error ?? "送信に失敗しました"); }
    } catch (e) {
      setState("error");
      setError((e as Error).message);
    }
  };

  if (state === "ok") {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
          <h2 className="text-lg font-bold">ご回答ありがとうございました 🙏</h2>
          <p className="text-sm text-muted-foreground">
            いただいたフィードバックは、選考体験の改善に活用させていただきます。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">選考体験フィードバック</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          結果に関わらずお聞かせください。今後の選考品質の向上に直接活用させていただきます。
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 p-5">
          {/* NPS */}
          <div>
            <div className="mb-2 text-sm font-semibold">
              友人・知人に Green Carbon の選考を勧めたいと思いますか？
            </div>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setNps(i)}
                  aria-pressed={nps === i}
                  className={cn(
                    "aspect-square rounded-md border text-sm font-bold tabular-nums transition-colors",
                    nps === i
                      ? i >= 9 ? "border-emerald-500 bg-emerald-500 text-white"
                        : i >= 7 ? "border-amber-500 bg-amber-500 text-white"
                                 : "border-red-500 bg-red-500 text-white"
                      : i >= 9 ? "border-emerald-200 hover:bg-emerald-50"
                        : i >= 7 ? "border-amber-200 hover:bg-amber-50"
                                 : "border-red-200 hover:bg-red-50",
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>0: 全く勧めない</span>
              <span>10: 強く勧める</span>
            </div>
          </div>

          {/* 自由記述 */}
          <Field label="良かった点（任意）">
            <textarea
              value={positive}
              onChange={(e) => setPositive(e.target.value)}
              placeholder="例：面接官が候補者の話を丁寧に聞いてくれた、レスポンスが早かった..."
              rows={3}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gc-400"
            />
          </Field>

          <Field label="改善が望ましい点（任意）">
            <textarea
              value={negative}
              onChange={(e) => setNegative(e.target.value)}
              placeholder="例：書類選考の結果連絡が遅かった、給与レンジの説明が曖昧だった..."
              rows={3}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gc-400"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="応募 ID（あれば、なしでも OK）">
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="cand-xxx"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="どの段階での回答ですか？">
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">選択（任意）</option>
                <option value="applied">応募完了直後</option>
                <option value="screening">書類選考結果後</option>
                <option value="interview_1">1 次面接後</option>
                <option value="interview_2">2 次面接後</option>
                <option value="final">最終面接後</option>
                <option value="offer">オファー受領後</option>
                <option value="hired">入社後</option>
              </select>
            </Field>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button onClick={() => void submit()} disabled={state === "submitting"} className="w-full gap-1.5" size="lg">
            {state === "submitting" ? (
              <><Loader2 className="size-4 animate-spin" />送信中...</>
            ) : (
              <><Send className="size-4" />フィードバックを送る</>
            )}
          </Button>

          <p className="text-[11px] text-muted-foreground">
            匿名でお送りいただけます。応募 ID を入れていただくと、担当者が個別にお返事できる場合があります。
          </p>
        </CardContent>
      </Card>
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

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
