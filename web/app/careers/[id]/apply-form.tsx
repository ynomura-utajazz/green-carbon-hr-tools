"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = { positionId: string; positionTitle: string };

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok"; applicationId: string }
  | { kind: "error"; error: string };

export function ApplyForm({ positionId, positionTitle }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [casualOnly, setCasualOnly] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const submit = async () => {
    if (!agreed) {
      setState({ kind: "error", error: "プライバシーポリシーへの同意が必要です" });
      return;
    }
    if (!name || !email) {
      setState({ kind: "error", error: "氏名とメールは必須です" });
      return;
    }
    setState({ kind: "submitting" });

    try {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_id: positionId,
          full_name: name,
          email,
          linkedin_url: linkedin,
          years_of_experience: yearsExp ? Number(yearsExp) : undefined,
          cover_letter: coverLetter,
          casual_only: casualOnly,
        }),
      });
      const json = (await res.json()) as
        | { ok: true; application_id: string }
        | { ok: false; error: string };
      if (json.ok) setState({ kind: "ok", applicationId: json.application_id });
      else setState({ kind: "error", error: json.error });
    } catch (e) {
      setState({ kind: "error", error: (e as Error).message });
    }
  };

  if (state.kind === "ok") {
    return (
      <div className="rounded-md border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <h3 className="mt-3 text-lg font-bold text-emerald-900">ご応募ありがとうございます</h3>
        <p className="mt-1 text-sm text-emerald-800">
          {positionTitle} へのご応募を受け付けました。
        </p>
        <p className="mt-2 font-mono text-xs text-emerald-700">
          応募 ID: {state.applicationId}
        </p>
        <p className="mt-3 text-xs text-emerald-800">
          確認メールを {email} にお送りしました。3 営業日以内にご連絡いたします。
        </p>
        <a
          href={`/careers/track?id=${encodeURIComponent(state.applicationId)}&email=${encodeURIComponent(email)}`}
          className="mt-4 inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
        >
          選考状況を確認する →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="お名前" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" required />
        </Field>
        <Field label="メールアドレス" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="LinkedIn URL（任意）">
          <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
        </Field>
        <Field label="経験年数（任意）">
          <Input type="number" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} min={0} max={50} placeholder="5" />
        </Field>
      </div>

      <Field label="自己紹介・志望動機（任意）">
        <textarea
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          rows={5}
          placeholder="どんな仕事をしてきて、なぜ Green Carbon に興味を持ったか、簡単に教えてください。"
          className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gc-400"
        />
      </Field>

      <Field label="履歴書（任意 / 後日アップロード可）">
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          <Upload className="size-4 shrink-0" />
          <span>後日メールで送付いただくか、面談時にお持ちいただけます</span>
        </div>
      </Field>

      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={casualOnly}
          onChange={(e) => setCasualOnly(e.target.checked)}
          className="mt-0.5"
        />
        <span>まずはカジュアルに話を聞きたい（応募ではなく面談希望）</span>
      </label>

      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5"
          required
        />
        <span>
          プライバシーポリシーに同意し、選考目的でのデータ利用を許可します
          <a href="https://green-carbon.inc/privacy" className="ml-1 text-gc-700 hover:underline" target="_blank" rel="noopener noreferrer">
            （ポリシーを読む）
          </a>
        </span>
      </label>

      {state.kind === "error" && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Button
        onClick={() => void submit()}
        disabled={state.kind === "submitting"}
        className="w-full gap-1.5"
        size="lg"
      >
        {state.kind === "submitting" ? (
          <><Loader2 className="size-4 animate-spin" />送信中...</>
        ) : (
          <><Send className="size-4" />{casualOnly ? "カジュアル面談を申し込む" : "応募する"}</>
        )}
      </Button>
    </div>
  );
}

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
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
