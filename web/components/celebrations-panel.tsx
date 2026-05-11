"use client";

/**
 * 「お祝い」パネル：今後 30 日以内の誕生日と入社記念日。
 * 一目で「誰におめでとうを言うべきか」が分かるよう、日付昇順 + 残日数表示。
 *
 * データソース：
 *   - 誕生日：DEMO_BIRTHDAYS（month/day のみ。年は今期で補完）
 *   - 入社記念日：DEMO_EMPLOYEES.hire_date から N 周年を計算
 */

import Link from "next/link";
import { Cake, PartyPopper, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";
import { DEMO_BIRTHDAYS } from "@/lib/demo/mock-data";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";

type Celebration = {
  kind: "birthday" | "anniversary";
  full_name: string;
  department?: string;
  date: Date;          // この期の発生日（年補完済）
  /** 入社記念日のときは N 周年 */
  years?: number;
  /** 残日数（負＝過ぎた、0＝今日） */
  daysUntil: number;
};

const MS_PER_DAY = 86_400_000;

/** 今日基準で次に来る (month, day) の Date を返す */
function nextOccurrence(month: number, day: number, today = new Date()): Date {
  const y = today.getFullYear();
  const candidate = new Date(y, month - 1, day);
  if (candidate.getTime() < startOfDay(today).getTime()) {
    candidate.setFullYear(y + 1);
  }
  return candidate;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysUntil(d: Date, today = new Date()): number {
  return Math.round((startOfDay(d).getTime() - startOfDay(today).getTime()) / MS_PER_DAY);
}

const deptOf = (id: string) =>
  ({
    "d-corp": "経営企画", "d-bizdev": "事業開発", "d-product": "プロダクト",
    "d-eng": "技術",     "d-design": "デザイン",  "d-mkt": "マーケティング",
    "d-hr": "人事",       "d-fin": "経理・財務",
  }[id] ?? "—");

function buildCelebrations(daysWindow = 30): Celebration[] {
  const today = new Date();
  const items: Celebration[] = [];

  // 誕生日
  for (const b of DEMO_BIRTHDAYS) {
    const [m, d] = b.monthDay.split("/").map(Number);
    if (!m || !d) continue;
    const date = nextOccurrence(m, d, today);
    const dn = daysUntil(date, today);
    if (dn >= 0 && dn <= daysWindow) {
      items.push({
        kind: "birthday",
        full_name: b.full_name,
        department: b.department,
        date,
        daysUntil: dn,
      });
    }
  }

  // 入社記念日（今期に N 周年を迎える人。1 年未満は除外。）
  for (const emp of DEMO_EMPLOYEES) {
    if (emp.status !== "active") continue;
    const hire = new Date(emp.hire_date);
    if (Number.isNaN(hire.getTime())) continue;
    const date = nextOccurrence(hire.getMonth() + 1, hire.getDate(), today);
    const years = date.getFullYear() - hire.getFullYear();
    if (years < 1) continue;
    const dn = daysUntil(date, today);
    if (dn >= 0 && dn <= daysWindow) {
      items.push({
        kind: "anniversary",
        full_name: emp.full_name,
        department: deptOf(emp.department_id),
        date,
        years,
        daysUntil: dn,
      });
    }
  }

  return items.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 8);
}

const fmtMonthDay = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;

const dayLabel = (n: number) =>
  n === 0 ? "今日" : n === 1 ? "明日" : `${n}日後`;

export function CelebrationsPanel() {
  const items = buildCelebrations();

  if (items.length === 0) {
    return (
      <Card className="overflow-hidden">
        <Header />
        <div className="p-6 text-center text-sm text-muted-foreground">
          今月のお祝いはありません 🎈
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Header count={items.length} />
      <ul className="divide-y">
        {items.map((c, i) => {
          const Icon = c.kind === "birthday" ? Cake : PartyPopper;
          const tone = c.kind === "birthday"
            ? "border-l-pink-400 bg-pink-50/30"
            : "border-l-amber-400 bg-amber-50/30";
          const isImminent = c.daysUntil <= 3;
          return (
            <li
              key={`${c.kind}-${c.full_name}-${i}`}
              className={cn(
                "border-l-2 px-4 py-2.5 transition-colors hover:bg-accent/40",
                tone,
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="text-[10px]">{initials(c.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn(
                      "size-3.5",
                      c.kind === "birthday" ? "text-pink-500" : "text-amber-600",
                    )} />
                    <span className="truncate text-sm font-medium">{c.full_name}</span>
                    {isImminent && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-gc-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        <Sparkles className="size-2.5" />
                        soon
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {c.kind === "birthday" ? "誕生日" : `入社 ${c.years} 周年`}
                    {c.department && ` · ${c.department}`}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-semibold tabular-nums">{dayLabel(c.daysUntil)}</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">{fmtMonthDay(c.date)}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
        Slack で「おめでとう」を送りましょう ·{" "}
        <Link href="/directory" className="text-gc-700 hover:underline">名簿を開く</Link>
      </div>
    </Card>
  );
}

function Header({ count }: { count?: number }) {
  return (
    <div className="flex items-center justify-between border-b bg-gradient-to-r from-pink-500/10 via-background to-background px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-pink-600 text-white">
          <Cake className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">お祝い</h3>
          <p className="text-[11px] text-muted-foreground">
            {typeof count === "number" ? `${count} 件 · 30日以内` : "30日以内"}
          </p>
        </div>
      </div>
    </div>
  );
}
