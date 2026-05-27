"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users, UserPlus, Building2, Cake, AlertTriangle, Calendar, Megaphone, Award,
  ChevronRight, Clock, X, Send, Stamp, Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { initials, formatDate, relativeTime, cn } from "@/lib/utils";
import { createGoogleCalendarEventUrl } from "@/lib/google-calendar";
import { sendSlackReminder } from "@/lib/slack";

function SlackIconSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

export type PortalData = {
  activeCount: number;
  hiresThisMonth: number;
  departmentsCount: number;
  visaWarnings: number;
  birthdays: { id: string; full_name: string; department: string; monthDay: string }[];
  awards: { id: string; value_tag: string; message: string; awarded_at: string; recipient: string; nominator: string }[];
  announcements: { id: string; title: string; body: string | null; link: string | null; created_at: string }[];
  newHires: { id: string; full_name: string; job_title: string; department: string; hire_date: string; email: string; slack_user_id?: string }[];
  visaWarningList: { id: string; full_name: string; visa_status: string; expires_at: string; days_left: number; email: string; slack_user_id?: string }[];
};

type DetailKind = null | "hires" | "visa";

export function PortalClient({ data }: { data: PortalData }) {
  const [detail, setDetail] = useState<DetailKind>(null);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight">HRポータル</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          会社のスナップショット・お知らせ・直近のイベントをまとめて確認できます。
        </p>
      </div>

      {/* KPI（クリック可能） */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTileLink
          icon={Users}
          label="在籍社員"
          value={data.activeCount}
          unit="名"
          tone="primary"
          href="/directory"
          hint="社員名簿を開く"
        />
        <KpiTileButton
          icon={UserPlus}
          label="今月の入社"
          value={data.hiresThisMonth}
          unit="名"
          tone="success"
          onClick={() => setDetail("hires")}
          hint="新入社員を確認"
        />
        <KpiTileLink
          icon={Building2}
          label="部門数"
          value={data.departmentsCount}
          unit="部門"
          tone="muted"
          href="/orgchart"
          hint="組織図を開く"
        />
        <KpiTileButton
          icon={AlertTriangle}
          label="ビザ期限警告 (30日以内)"
          value={data.visaWarnings}
          unit="件"
          tone={data.visaWarnings > 0 ? "warning" : "muted"}
          onClick={() => setDetail("visa")}
          hint="該当社員を確認"
          disabled={data.visaWarnings === 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* お知らせ */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="size-4 text-gc-700" />
                <CardTitle className="text-base">お知らせ</CardTitle>
              </div>
              {/* announcements 一覧ページ実装後に有効化 */}
            </CardHeader>
            <CardContent className="pt-0">
              {!data.announcements.length ? (
                <EmptyHint text="現在お知らせはありません" />
              ) : (
                <ul className="divide-y">
                  {data.announcements.map((a) => (
                    <li key={a.id} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="mt-1.5 size-2 shrink-0 rounded-full bg-gc-500" />
                      <div className="flex-1">
                        <Link href={a.link ?? "#"} className="block font-medium hover:underline">
                          {a.title}
                        </Link>
                        {a.body && <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{a.body}</p>}
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {relativeTime(a.created_at)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 self-start opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(`📢 *${a.title}*\n${a.body ?? ""}\n${a.link ? `\n${window.location.origin}${a.link}` : ""}`);
                            } catch {/* ignore */}
                            toast.success("Slack 用文面をコピーしました", {
                              description: "#all-hands に貼り付けて投稿してください",
                            });
                            window.open(`https://app.slack.com/client/${process.env.NEXT_PUBLIC_SLACK_TEAM_ID ?? "T01GREENCARBON"}`, "_blank");
                          }}
                          className="rounded p-1 text-[#4A154B] hover:bg-[#4A154B]/10"
                          title="Slack #all-hands に投稿"
                        >
                          <SlackIconSmall className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* バリューアワード */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="size-4 text-gc-700" />
                <CardTitle className="text-base">最近のバリューアワード</CardTitle>
              </div>
              <Link href="/value-award" className="text-xs text-muted-foreground hover:text-foreground">
                ノミネートする <ChevronRight className="inline size-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {!data.awards.length ? (
                <EmptyHint text="まだアワードはありません。仲間を最初にノミネートしましょう" />
              ) : (
                <ul className="space-y-3">
                  {data.awards.map((a) => (
                    <li key={a.id} className="group flex items-start gap-3 rounded-lg border bg-card p-3">
                      <Avatar className="size-9">
                        <AvatarFallback>{initials(a.recipient)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.recipient}</span>
                          <Badge variant="success">{a.value_tag}</Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{a.message}</p>
                        <div className="mt-1 text-xs text-muted-foreground">
                          from {a.nominator} · {relativeTime(a.awarded_at)}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const text = `🏆 *${a.recipient}* が *${a.value_tag}* を体現！\n> ${a.message}\nfrom ${a.nominator}`;
                          try { await navigator.clipboard.writeText(text); } catch {/* ignore */}
                          toast.success("Slack #praise に投稿する文面をコピーしました");
                          window.open(`https://app.slack.com/client/${process.env.NEXT_PUBLIC_SLACK_TEAM_ID ?? "T01GREENCARBON"}`, "_blank");
                        }}
                        className="shrink-0 self-start rounded p-1 text-[#4A154B] opacity-0 transition-opacity hover:bg-[#4A154B]/10 group-hover:opacity-100"
                        title="Slack #praise に投稿"
                      >
                        <SlackIconSmall className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* 誕生日 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cake className="size-4 text-gc-700" />
                <CardTitle className="text-base">直近の誕生日</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {!data.birthdays.length ? (
                <EmptyHint text="今後30日以内に誕生日のメンバーはいません" />
              ) : (
                <ul className="space-y-2.5">
                  {data.birthdays.map((e) => (
                    <li key={e.id} className="group flex items-center gap-3">
                      <Avatar className="size-8"><AvatarFallback>{initials(e.full_name)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{e.full_name}</div>
                        <div className="truncate text-xs text-muted-foreground">{e.department}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">{e.monthDay}</span>
                      <button
                        onClick={async () => {
                          const text = `🎂 ${e.full_name} さん、お誕生日おめでとうございます！素敵な一年になりますように 🌟`;
                          try { await navigator.clipboard.writeText(text); } catch {/* ignore */}
                          toast.success("お祝い文面をコピーしました", {
                            description: "Slack DM 入力欄に貼り付けて送信してください",
                          });
                        }}
                        className="rounded p-1 text-[#4A154B]/60 opacity-0 transition-opacity hover:bg-[#4A154B]/10 hover:text-[#4A154B] group-hover:opacity-100"
                        title="Slack でお祝いメッセージ"
                      >
                        <SlackIconSmall className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* HRカレンダー */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-gc-700" />
                <CardTitle className="text-base">HRカレンダー</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 text-sm">
              <CalendarItem label="月次パルスサーベイ" date="毎月第1月曜" />
              <Separator />
              <CalendarItem label="OKR 期初設定" date="四半期初日" />
              <Separator />
              <CalendarItem label="評価キャリブレーション" date="四半期末" />
              <Separator />
              <CalendarItem label="定期健康診断" date="毎年5月" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 今月の入社シート */}
      <Sheet open={detail === "hires"} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg" showClose={false}>
          <NewHiresSheet data={data} onClose={() => setDetail(null)} />
        </SheetContent>
      </Sheet>

      {/* ビザ警告シート */}
      <Sheet open={detail === "visa"} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg" showClose={false}>
          <VisaWarningsSheet data={data} onClose={() => setDetail(null)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── KPI（リンク版／ボタン版） ───────────
function KpiTileLink({
  icon: Icon, label, value, unit, tone, href, hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; unit: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
  href: string; hint: string;
}) {
  return (
    <Link href={href} className="block">
      <KpiTileShell icon={Icon} label={label} value={value} unit={unit} tone={tone} hint={hint} interactive />
    </Link>
  );
}

function KpiTileButton({
  icon: Icon, label, value, unit, tone, onClick, hint, disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; unit: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
  onClick: () => void; hint: string; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="block w-full text-left disabled:cursor-default disabled:opacity-90">
      <KpiTileShell icon={Icon} label={label} value={value} unit={unit} tone={tone} hint={hint} interactive={!disabled} />
    </button>
  );
}

function KpiTileShell({
  icon: Icon, label, value, unit, tone, hint, interactive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; unit: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
  hint: string; interactive: boolean;
}) {
  const cls = {
    primary: "text-gc-700 bg-gc-50 border-gc-200",
    success: "text-emerald-700 bg-emerald-50 border-emerald-200",
    warning: "text-amber-800 bg-amber-50 border-amber-200",
    danger: "text-red-800 bg-red-50 border-red-200",
    muted: "text-muted-foreground bg-muted/50 border-border",
  }[tone];
  return (
    <div className={cn(
      "group flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all",
      interactive && "hover:-translate-y-0.5 hover:border-gc-300 hover:shadow-md",
    )}>
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {label}
          {interactive && <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight">{value.toLocaleString?.() ?? value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        {interactive && (
          <div className="mt-1 truncate text-[10px] text-muted-foreground/80 group-hover:text-gc-700">
            {hint} →
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarItem({ label, date }: { label: string; date: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{date}</span>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

// ─── 新入社員 Sheet ───────────────────────
function NewHiresSheet({ data, onClose }: { data: PortalData; onClose: () => void }) {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background/95 p-5 backdrop-blur">
        <div>
          <SheetTitle className="text-lg font-bold">今月の入社者</SheetTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {data.hiresThisMonth} 名のメンバーがチームに加わりました。
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
          <X className="size-4" />
        </Button>
      </div>
      <ul className="divide-y">
        {data.newHires.map((h) => {
          const welcomeMsg = `${h.full_name} さん、Green Carbon へようこそ！🌿\n何か困ったことがあればいつでも声をかけてください。`;
          return (
            <li key={h.id} className="flex items-start gap-3 p-4">
              <Avatar className="size-10"><AvatarFallback>{initials(h.full_name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{h.full_name}</div>
                <div className="text-xs text-muted-foreground">{h.job_title} · {h.department}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">入社日: {formatDate(h.hire_date)} ({relativeTime(h.hire_date)})</div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {h.slack_user_id && (
                  <button
                    onClick={async () => {
                      await sendSlackReminder(h.slack_user_id!, welcomeMsg);
                      toast.success("ウェルカムメッセージをコピーし Slack を開きました");
                    }}
                    className="rounded p-1.5 text-[#4A154B] hover:bg-[#4A154B]/10"
                    title="ウェルカムDM"
                  >
                    <SlackIconSmall className="size-4" />
                  </button>
                )}
                <a
                  href={`mailto:${h.email}`}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                  title="メール"
                >
                  <Mail className="size-4" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t bg-muted/30 p-4 text-xs text-muted-foreground">
        💡 オンボーディングチェックリストは
        <Link href="/onboarding" className="underline">こちら</Link>
        から起動できます。
      </div>
    </>
  );
}

// ─── ビザ警告 Sheet ───────────────────────
function VisaWarningsSheet({ data, onClose }: { data: PortalData; onClose: () => void }) {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-amber-50/80 p-5 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <Stamp className="size-4 text-amber-700" />
            <SheetTitle className="text-lg font-bold">ビザ期限警告</SheetTitle>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            30日以内に在留期限を迎える社員 {data.visaWarnings} 名。早急に更新手続きを進めてください。
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
          <X className="size-4" />
        </Button>
      </div>
      <ul className="divide-y">
        {data.visaWarningList.map((v) => {
          const urgent = v.days_left <= 14;
          const reminderMsg = `${v.full_name} さん、在留資格「${v.visa_status}」の期限が ${v.expires_at} です（あと ${v.days_left} 日）。更新手続きの状況を共有いただけますか？必要書類のサポートが必要であれば HR まで。`;
          return (
            <li key={v.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="size-10"><AvatarFallback>{initials(v.full_name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{v.full_name}</span>
                    <Badge variant={urgent ? "danger" : "warning"}>あと {v.days_left} 日</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{v.visa_status}</div>
                  <div className="mt-0.5 text-xs">期限: <span className={cn("font-medium", urgent && "text-red-700")}>{v.expires_at}</span></div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {v.slack_user_id && (
                    <button
                      onClick={async () => {
                        await sendSlackReminder(v.slack_user_id!, reminderMsg);
                        toast.success("リマインドDMをコピーし Slack を開きました");
                      }}
                      className="rounded p-1.5 text-[#4A154B] hover:bg-[#4A154B]/10"
                      title="Slack で確認"
                    >
                      <Send className="size-4" />
                    </button>
                  )}
                </div>
              </div>
              <a
                href={createGoogleCalendarEventUrl({
                  title: `🛂 ${v.full_name} 在留資格更新リマインド`,
                  description: `在留資格: ${v.visa_status}\n期限: ${v.expires_at}\n\n更新手続き: 入管申請書類の準備、雇用契約書の発行確認、在職証明書の発行`,
                  start: new Date(new Date(v.expires_at).getTime() - 14 * 86400000),
                  attendees: [v.email],
                  timezone: "Asia/Tokyo",
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900 transition-colors hover:bg-blue-100"
              >
                <Calendar className="size-3" /> 期限14日前にリマインド予定をカレンダー追加
              </a>
            </li>
          );
        })}
      </ul>
      <div className="border-t bg-muted/30 p-4 text-xs text-muted-foreground">
        💡 詳細管理は <Link href="/visa" className="underline">在留資格・ビザ管理</Link> ツール（準備中）から行えます。
      </div>
    </>
  );
}
