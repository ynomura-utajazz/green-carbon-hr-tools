"use client";

/**
 * /recruiting-branding
 *
 * 採用広報ハブ。
 *
 * - JD ジェネレータ（ロール情報入力 → AI で求人票生成）
 * - 各チャネル（Wantedly / LinkedIn / X / Indeed / Facebook）向け投稿テンプレ生成
 * - URL ?role= / ?skills= で初期値供給可能（戦略採用ページから遷移時）
 */

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Megaphone, FileText, Plus, X, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AiGeneratePanel } from "@/components/ai-generate-panel";
import { JdSeoAnalyzer } from "@/components/jd-seo-analyzer";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Channel = "wantedly" | "linkedin" | "twitter" | "indeed" | "facebook";

const CHANNEL_META: Record<Channel, { label: string; emoji: string; brand: string; cls: string }> = {
  wantedly: { label: "Wantedly", emoji: "💚", brand: "「想い」を前面に",                cls: "border-emerald-300 bg-emerald-50/40" },
  linkedin: { label: "LinkedIn", emoji: "💼", brand: "プロフェッショナル",              cls: "border-blue-300 bg-blue-50/40" },
  twitter:  { label: "X",        emoji: "✴️", brand: "140 字でフックを作る",            cls: "border-gray-300 bg-gray-50/60" },
  indeed:   { label: "Indeed",   emoji: "🔍", brand: "実務的・端的に",                  cls: "border-indigo-300 bg-indigo-50/40" },
  facebook: { label: "Facebook", emoji: "👥", brand: "カジュアル / ストーリー調",       cls: "border-sky-300 bg-sky-50/40" },
};

function Inner() {
  const sp = useSearchParams();
  const initialRole = sp?.get("role") ?? "シニア ML エンジニア（Carbon 計算チーム）";
  const initialSkills = sp?.get("skills")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [
    "Python", "PyTorch", "MLOps", "時系列データ", "PostgreSQL",
  ];

  // JD 入力
  const [roleTitle, setRoleTitle] = useState(initialRole);
  const [team, setTeam] = useState("技術 / Carbon 計算");
  const [requiredSkills, setRequiredSkills] = useState<string[]>(initialSkills);
  const [niceToHave, setNiceToHave] = useState<string[]>(["カーボンクレジット計算経験", "衛星データ処理経験"]);
  const [compRange, setCompRange] = useState("900-1,400 万円");
  const [location, setLocation] = useState("東京（恵比寿）またはフルリモート");
  const [brandKeywords, setBrandKeywords] = useState("気候テック × グローバル × 技術深耕");
  const [skillInput, setSkillInput] = useState("");
  const [niceInput, setNiceInput] = useState("");

  // 生成された JD を保持してチャネル投稿に渡す
  const [generatedJd, setGeneratedJd] = useState<string>("");
  const [activeChannel, setActiveChannel] = useState<Channel>("wantedly");

  // URL クエリの変化で初期化（クライアント側ナビゲーション）
  useEffect(() => {
    if (sp?.get("role")) setRoleTitle(sp.get("role")!);
    const sk = sp?.get("skills");
    if (sk) setRequiredSkills(sk.split(",").map((s) => s.trim()).filter(Boolean));
  }, [sp]);

  const addSkill = (target: "required" | "nice", value: string) => {
    if (!value.trim()) return;
    if (target === "required") setRequiredSkills([...requiredSkills, value.trim()]);
    else setNiceToHave([...niceToHave, value.trim()]);
  };

  return (
    <div className="space-y-5">
      {/* ヘッダ */}
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Megaphone className="size-6 text-gc-700" />
          採用広報
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          JD（求人票）の生成と、各チャネル向け投稿テキストのリライトを 1 画面で
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* ── JD 入力 ─────────────────── */}
        <Card className="lg:col-span-2">
          <CardContent className="space-y-3 p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <FileText className="size-3.5 text-gc-700" />
              JD インプット
            </h3>

            <Field label="ロール名">
              <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
            </Field>
            <Field label="チーム">
              <Input value={team} onChange={(e) => setTeam(e.target.value)} />
            </Field>

            <ChipField
              label="必須スキル"
              chips={requiredSkills}
              onRemove={(s) => setRequiredSkills(requiredSkills.filter((x) => x !== s))}
              input={skillInput}
              setInput={setSkillInput}
              onAdd={() => { addSkill("required", skillInput); setSkillInput(""); }}
            />
            <ChipField
              label="歓迎条件"
              chips={niceToHave}
              onRemove={(s) => setNiceToHave(niceToHave.filter((x) => x !== s))}
              input={niceInput}
              setInput={setNiceInput}
              onAdd={() => { addSkill("nice", niceInput); setNiceInput(""); }}
            />

            <Field label="想定報酬レンジ">
              <Input value={compRange} onChange={(e) => setCompRange(e.target.value)} />
            </Field>
            <Field label="勤務地・働き方">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </Field>
            <Field label="ブランドキーワード">
              <Input value={brandKeywords} onChange={(e) => setBrandKeywords(e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        {/* ── JD 出力 ─────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <AiGeneratePanel
            title="AI JD 生成"
            endpoint="/api/ai/jd-generator"
            hint="入力情報から、Markdown の求人票を生成します。生成後、下のチャネル投稿生成にも自動で流れます。"
            buttonLabel="JD を生成"
            onResult={(text) => setGeneratedJd(text)}
            payload={() => ({
              role_title: roleTitle,
              team,
              required_skills: requiredSkills,
              nice_to_have: niceToHave,
              comp_range: compRange,
              location,
              brand_keywords: brandKeywords,
            })}
          />

          {/* SEO 分析（生成後に自動表示） */}
          {generatedJd && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    🔍 採用広報 SEO 分析
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    JD を編集すると即座にスコア更新
                  </span>
                </div>
                <JdSeoAnalyzer jdText={generatedJd} requiredSkills={requiredSkills} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── チャネル投稿生成 ───────────── */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Send className="size-3.5 text-gc-700" />
              チャネル別 投稿テキスト生成
            </h3>
            <span className="text-[11px] text-muted-foreground">
              JD を先に生成してから使うと、JD の内容を引き継げます
            </span>
          </div>

          {/* チャネルタブ */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CHANNEL_META) as Channel[]).map((c) => (
              <button
                key={c}
                onClick={() => setActiveChannel(c)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  activeChannel === c
                    ? CHANNEL_META[c].cls + " font-semibold"
                    : "bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {CHANNEL_META[c].emoji} {CHANNEL_META[c].label}
              </button>
            ))}
          </div>

          <div className="rounded-md border bg-muted/20 p-2 text-[11px] text-muted-foreground">
            <strong>{CHANNEL_META[activeChannel].label}</strong> の作法： {CHANNEL_META[activeChannel].brand}
          </div>

          <AiGeneratePanel
            key={activeChannel} // チャネル切替で state リセット
            title={`${CHANNEL_META[activeChannel].label} 向け投稿`}
            endpoint="/api/ai/channel-post"
            buttonLabel={`${CHANNEL_META[activeChannel].label} 用に生成`}
            hint={generatedJd ? undefined : "上で JD を生成すると、それをベースに各チャネル向けへリライトします"}
            payload={() => ({
              channel: activeChannel,
              jd_text: generatedJd || `ロール: ${roleTitle}\n必須: ${requiredSkills.join(", ")}\n${niceToHave.length ? `歓迎: ${niceToHave.join(", ")}\n` : ""}${compRange ? `報酬: ${compRange}\n` : ""}${location ? `勤務地: ${location}` : ""}`,
              apply_url: `https://green-carbon.inc/careers/${roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`,
            })}
          />
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

function ChipField({
  label, chips, onRemove, input, setInput, onAdd,
}: {
  label: string;
  chips: string[];
  onRemove: (s: string) => void;
  input: string;
  setInput: (s: string) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="rounded-md border bg-background p-2">
        <div className="mb-1.5 flex flex-wrap gap-1">
          {chips.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-[11px]"
            >
              {s}
              <button
                onClick={() => onRemove(s)}
                aria-label={`${s} を削除`}
                className="rounded-full p-0.5 hover:bg-black/10"
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
            placeholder="追加して Enter"
            className="h-7 text-xs"
          />
          <Button onClick={onAdd} variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
            <Plus className="size-3" />
            追加
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
