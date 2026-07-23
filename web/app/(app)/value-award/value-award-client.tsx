"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Trophy, Plus, Send, Sparkles, Crown, Heart, Filter,
} from "lucide-react";
import {
  type Award, type ValueTag,
  VALUE_LABEL, VALUE_DESCRIPTION, VALUE_EMOJI, VALUE_COLOR, VALUE_BG,
  awardsByValue, topRecipients, topNominators, thisMonthMVP,
} from "@/lib/demo/awards";
import { type DemoEmployee } from "@/lib/demo/employees";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { initials, relativeTime, cn } from "@/lib/utils";

function SlackIconSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

export function ValueAwardClient({
  awards, employees,
}: {
  awards: Award[];
  employees: DemoEmployee[];
}) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const [tab, setTab] = useState<"feed" | "values" | "ranking">("feed");
  const [valueFilter, setValueFilter] = useState<ValueTag | "all">("all");
  const [showNominate, setShowNominate] = useState(false);

  const mvp = thisMonthMVP(awards);
  const mvpEmp = mvp ? empMap.get(mvp.id) : null;

  const filtered = valueFilter === "all" ? awards : awards.filter((a) => a.value === valueFilter);
  const byValue = awardsByValue(awards);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Trophy className="size-6 text-amber-600" />
            バリューアワード
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            6 つの会社バリューを体現したメンバーを称え合うピアツーピア表彰。
          </p>
        </div>
        <Button onClick={() => setShowNominate(true)} className="gap-1.5">
          <Plus className="size-4" />
          ノミネート
        </Button>
      </div>

      {/* MVP ヒーロー */}
      {mvp && mvpEmp && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-400 via-orange-400 to-amber-600 text-white shadow-lg">
          <CardContent className="flex items-center gap-4 p-6">
            <Crown className="size-12 shrink-0 drop-shadow-md" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider opacity-80">今月の MVP</div>
              <div className="mt-1 text-2xl font-extrabold">{mvpEmp.full_name}</div>
              <div className="text-sm opacity-90">{mvpEmp.job_title}</div>
              <div className="mt-1 text-xs opacity-80">
                {mvp.count} 件のアワードを受賞
              </div>
            </div>
            <Avatar className="size-16 ring-4 ring-white/40">
              <AvatarFallback className="bg-white/30 text-white">
                {initials(mvpEmp.full_name)}
              </AvatarFallback>
            </Avatar>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="feed" className="gap-2"><Heart className="size-3.5" />フィード</TabsTrigger>
          <TabsTrigger value="values" className="gap-2"><Sparkles className="size-3.5" />バリュー別</TabsTrigger>
          <TabsTrigger value="ranking" className="gap-2"><Crown className="size-3.5" />ランキング</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <Select value={valueFilter} onValueChange={(v) => setValueFilter(v as typeof valueFilter)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全バリュー ({awards.length})</SelectItem>
                {(Object.keys(VALUE_LABEL) as ValueTag[]).map((v) => (
                  <SelectItem key={v} value={v}>
                    {VALUE_EMOJI[v]} {VALUE_LABEL[v]} ({byValue.get(v)?.length ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ul className="space-y-3">
            {filtered.map((a) => <AwardCard key={a.id} award={a} empMap={empMap} />)}
          </ul>
        </TabsContent>

        <TabsContent value="values">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(VALUE_LABEL) as ValueTag[]).map((v) => (
              <ValueCard
                key={v}
                value={v}
                count={byValue.get(v)?.length ?? 0}
                onClick={() => { setValueFilter(v); setTab("feed"); }}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ranking">
          <RankingView awards={awards} empMap={empMap} />
        </TabsContent>
      </Tabs>

      <NominateDialog
        open={showNominate}
        onOpenChange={setShowNominate}
        employees={employees}
      />
    </div>
  );
}

function AwardCard({ award, empMap }: { award: Award; empMap: Map<string, DemoEmployee> }) {
  const recipient = empMap.get(award.recipient_id);
  const nominator = empMap.get(award.nominator_id);
  if (!recipient || !nominator) return null;

  return (
    <li>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-11 shrink-0 ring-2 ring-amber-200">
              <AvatarFallback>{initials(recipient.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{recipient.full_name}</span>
                <span className="text-xs text-muted-foreground">{recipient.job_title}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", VALUE_COLOR[award.value])}>
                  <span>{VALUE_EMOJI[award.value]}</span>
                  {award.value}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                from <span className="font-medium">{nominator.full_name}</span> · {relativeTime(award.awarded_at)}
              </div>
              <p className="mt-2 text-sm leading-relaxed">{award.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {award.reactions.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => toast.success(`${r.emoji} +1`)}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs transition-colors hover:bg-muted"
                  >
                    <span>{r.emoji}</span>
                    <span className="tabular-nums">{r.count}</span>
                  </button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-xs text-[#4A154B]"
                  onClick={async () => {
                    const text = `🏆 *${recipient.full_name}* が *${award.value}* で表彰されました\n> ${award.message}\nfrom ${nominator.full_name}`;
                    try { await navigator.clipboard.writeText(text); } catch {/* ignore */}
                    toast.success("Slack #praise 用の文面をコピーしました");
                  }}
                >
                  <SlackIconSmall className="size-3" />
                  #praise に投稿
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

function ValueCard({ value, count, onClick }: { value: ValueTag; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group block w-full overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={cn("h-2 bg-gradient-to-r", VALUE_BG[value])} />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{VALUE_EMOJI[value]}</span>
          <div>
            <div className="text-lg font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{count} 件のアワード</div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{VALUE_DESCRIPTION[value]}</p>
      </div>
    </button>
  );
}

function RankingView({ awards, empMap }: { awards: Award[]; empMap: Map<string, DemoEmployee> }) {
  const recipients = topRecipients(awards).slice(0, 10);
  const nominators = topNominators(awards).slice(0, 10);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Crown className="size-4 text-amber-600" />
            受賞ランキング Top 10
          </h3>
          <ol className="space-y-2">
            {recipients.map((r, i) => {
              const e = empMap.get(r.id);
              if (!e) return null;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-md border bg-card p-2.5">
                  <div className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                      : i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
                      : i === 2 ? "bg-gradient-to-br from-orange-300 to-orange-500 text-white"
                      : "bg-muted text-muted-foreground",
                  )}>
                    {i + 1}
                  </div>
                  <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.full_name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{e.job_title}</div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 tabular-nums">
                    {r.count}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Heart className="size-4 text-red-500" />
            ノミネートランキング Top 10
          </h3>
          <ol className="space-y-2">
            {nominators.map((n, i) => {
              const e = empMap.get(n.id);
              if (!e) return null;
              return (
                <li key={n.id} className="flex items-center gap-3 rounded-md border bg-card p-2.5">
                  <div className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    i === 0 ? "bg-gradient-to-br from-pink-400 to-rose-500 text-white"
                      : "bg-muted text-muted-foreground",
                  )}>
                    {i + 1}
                  </div>
                  <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.full_name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{e.job_title}</div>
                  </div>
                  <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-bold text-pink-800 tabular-nums">
                    {n.count}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function NominateDialog({
  open, onOpenChange, employees,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: DemoEmployee[];
}) {
  const [recipientId, setRecipientId] = useState<string>("");
  const [value, setValue] = useState<ValueTag | "">("");
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!recipientId || !value || message.length < 30) {
      toast.error("受賞者・バリュー・メッセージ（30文字以上）をすべて入力してください");
      return;
    }
    const recipient = employees.find((e) => e.id === recipientId);
    toast.success(`${recipient?.full_name} さんを ${value} でノミネートしました 🎉`, {
      description: "Slack #praise に投稿用文面をコピー済み。貼り付けてシェアしてください。",
    });
    const recName = recipient?.full_name ?? "";
    const text = `🏆 *${recName}* が *${value}* で表彰されました\n> ${message}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setRecipientId(""); setValue(""); setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-600" />
            仲間をノミネート
          </DialogTitle>
          <DialogDescription>
            会社バリューを体現した素晴らしい行動を、感謝と共にチームへ広めましょう。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">受賞者</label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger><SelectValue placeholder="メンバーを選択" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name} — {e.job_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">体現したバリュー</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(VALUE_LABEL) as ValueTag[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValue(v)}
                  className={cn(
                    "rounded-md border-2 p-2 text-left text-xs transition-all",
                    value === v ? VALUE_COLOR[v] + " ring-2 ring-offset-1" : "border-border hover:border-gc-300",
                  )}
                >
                  <div className="text-lg">{VALUE_EMOJI[v]}</div>
                  <div className="font-semibold">{v}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">メッセージ（30文字以上推奨）</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="どんな行動が素晴らしかったか、具体的に書いてください"
              className="w-full rounded-md border bg-transparent p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="text-right text-[10px] text-muted-foreground">{message.length} / 30 文字以上推奨</div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={submit} className="gap-1.5">
            <Send className="size-4" />
            送信
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
