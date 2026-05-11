"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Handshake, Receipt, FileText, Upload, Plus, Send, ChevronRight, CheckCircle2,
  AlertCircle, Trash2,
} from "lucide-react";
import {
  type DemoContractor, type WorkRecord, type InvoiceSubmission, type WorkRecordEntry,
  CONTRACTOR_STATUS_LABEL, PAYMENT_MODEL_LABEL, STATUS_LABEL, STATUS_CLS, workRecordsFor,
  invoiceSubmissionsFor,
} from "@/lib/demo/contractors";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BrandMark } from "@/components/brand-mark";
import { initials, formatDate, cn } from "@/lib/utils";

const fmtCurrency = (amount: number, currency: string) => {
  if (currency === "JPY") return `¥${amount.toLocaleString()}`;
  const sym = { USD: "$", EUR: "€", SGD: "S$", GBP: "£" }[currency] ?? `${currency} `;
  return `${sym}${amount.toLocaleString()}`;
};

export function ContractorPortalClient({
  contractor: initialContractor,
  allContractors,
}: {
  contractor: DemoContractor | null;
  allContractors: DemoContractor[];
}) {
  const router = useRouter();
  const _params = useSearchParams();
  const [contractor, setContractor] = useState<DemoContractor | null>(initialContractor);
  const [openDialog, setOpenDialog] = useState<"work-record" | "invoice" | null>(null);

  // デモ用：契約先未指定なら、選択画面表示
  if (!contractor) {
    return (
      <ContractorSelector
        contractors={allContractors}
        onSelect={(c) => {
          const url = new URL(window.location.href);
          url.searchParams.set("cid", c.id);
          router.push(url.pathname + url.search);
          setContractor(c);
        }}
      />
    );
  }

  const workRecords = workRecordsFor(contractor.id);
  const invoices = invoiceSubmissionsFor(contractor.id);

  const submitted = workRecords.filter((w) => w.status === "submitted").length
    + invoices.filter((i) => i.status === "submitted").length;
  const ytdPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount_jpy, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gc-50/50 via-background to-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <BrandMark variant="wordmark" size="sm" />
          <div className="ml-2 hidden items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:flex">
            <Handshake className="size-3" />
            委託先ポータル
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">ログイン中:</span>
            <span className="font-medium">{contractor.display_name}</span>
            <Avatar className="size-7">
              <AvatarFallback className="text-[10px]">{initials(contractor.display_name)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            こんにちは、{contractor.display_name.split(" ")[0]} さん
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            稼働レコードと請求書をここから提出できます。承認状況もリアルタイムで確認可能です。
          </p>
        </div>

        {/* 契約サマリー */}
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">契約状態</div>
              <div className="mt-1">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                  contractor.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : contractor.status === "expiring_soon" ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-gray-200 bg-gray-50 text-gray-700",
                )}>
                  {CONTRACTOR_STATUS_LABEL[contractor.status]}
                </span>
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {contractor.role}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">報酬</div>
              <div className="mt-1 font-bold tabular-nums">
                {fmtCurrency(contractor.rate_amount, contractor.currency)}
              </div>
              <div className="text-xs text-muted-foreground">
                {PAYMENT_MODEL_LABEL[contractor.payment_model]}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">契約期間</div>
              <div className="mt-1 text-sm font-medium">
                {formatDate(contractor.contract_end)} まで
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.ceil((new Date(contractor.contract_end).getTime() - Date.now()) / 86_400_000)} 日後
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">YTD 支払受領</div>
              <div className="mt-1 font-bold tabular-nums">
                ¥{ytdPaid.toLocaleString()}
              </div>
              {submitted > 0 && (
                <div className="text-xs text-blue-700">
                  承認待ち {submitted} 件
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 提出CTA */}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setOpenDialog("work-record")}
            className="group flex items-center gap-4 rounded-xl border-2 border-dashed border-gc-300 bg-gc-50/40 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-gc-500 hover:bg-gc-50 hover:shadow-md"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-gc-600 text-white">
              <Receipt className="size-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gc-900">稼働レコードを提出</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                今月の稼働日数・時間・タスク内容と成果物リンクを記録
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => setOpenDialog("invoice")}
            className="group flex items-center gap-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/40 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <FileText className="size-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">請求書をアップロード</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF をドラッグ&ドロップ。インボイス番号と金額を記入して提出
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* 過去の提出履歴 */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight">
            <Receipt className="size-4 text-gc-700" />
            稼働レコードの履歴
          </h2>
          {workRecords.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                まだ稼働レコードはありません
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {workRecords.map((w) => <PublicWorkRecordRow key={w.id} record={w} />)}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight">
            <FileText className="size-4 text-blue-700" />
            請求書の履歴
          </h2>
          {invoices.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                まだ請求書はありません
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {invoices.map((i) => <PublicInvoiceRow key={i.id} invoice={i} />)}
            </ul>
          )}
        </section>

        {/* フッター */}
        <footer className="border-t pt-6 text-xs text-muted-foreground">
          <p>
            ご質問・トラブルは HR (y.nomura@green-carbon.inc) までお問い合わせください。
            このポータルは Green Carbon が運営しています。
          </p>
        </footer>
      </main>

      {/* ダイアログ */}
      <WorkRecordDialog
        open={openDialog === "work-record"}
        onOpenChange={(o) => !o && setOpenDialog(null)}
        contractor={contractor}
      />
      <InvoiceDialog
        open={openDialog === "invoice"}
        onOpenChange={(o) => !o && setOpenDialog(null)}
        contractor={contractor}
      />
    </div>
  );
}

// ─── 公開行（読み取り専用） ────────────
function PublicWorkRecordRow({ record }: { record: WorkRecord }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
          <Receipt className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{record.period} 稼働</span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_CLS[record.status])}>
              {STATUS_LABEL[record.status]}
            </span>
            {record.hours_total > 0 && (
              <span className="text-xs text-muted-foreground">
                {record.hours_total}h / {record.days_worked}日
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{record.task_summary}</p>
          {record.reviewer_comment && (
            <div className={cn(
              "mt-2 rounded-md p-2 text-xs",
              record.status === "rejected" ? "bg-red-50 text-red-900" : "bg-muted/50",
            )}>
              <span className="font-medium">HR コメント:</span> {record.reviewer_comment}
            </div>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground">
            提出: {record.submitted_at}
            {record.reviewed_at && ` · ${STATUS_LABEL[record.status]}: ${record.reviewed_at}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PublicInvoiceRow({ invoice }: { invoice: InvoiceSubmission }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
          <FileText className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{invoice.invoice_number}</span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_CLS[invoice.status])}>
              {STATUS_LABEL[invoice.status]}
            </span>
            <span className="font-bold tabular-nums">
              {invoice.currency === "JPY"
                ? `¥${invoice.amount.toLocaleString()}`
                : `${invoice.currency} ${invoice.amount.toLocaleString()}`}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{invoice.file_name}</div>
          {invoice.reviewer_comment && (
            <div className={cn(
              "mt-2 rounded-md p-2 text-xs",
              invoice.status === "rejected" ? "bg-red-50 text-red-900" : "bg-muted/50",
            )}>
              <span className="font-medium">HR コメント:</span> {invoice.reviewer_comment}
            </div>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground">
            提出: {invoice.submitted_at}
            {invoice.paid_at && ` · 支払完了: ${invoice.paid_at}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 委託先選択（デモ用） ───────────────
function ContractorSelector({
  contractors, onSelect,
}: {
  contractors: DemoContractor[];
  onSelect: (c: DemoContractor) => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gc-100 via-background to-blue-50 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <BrandMark variant="wordmark" size="sm" />
            <span className="rounded-full border bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              委託先ポータル
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">どの委託先としてログイン？</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              本番ではメールに送られたマジックリンクで認証されます。デモではここで選択してください。
            </p>
          </div>
          <ul className="max-h-96 space-y-1.5 overflow-y-auto">
            {contractors.filter((c) => c.status !== "ended").map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:border-gc-300 hover:bg-accent/40"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-[10px]">{initials(c.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {c.display_name} {c.country_emoji}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{c.role}</div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 稼働レコード提出ダイアログ ─────────
function WorkRecordDialog({
  open, onOpenChange, contractor,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contractor: DemoContractor;
}) {
  const isHourly = contractor.payment_model === "hourly";
  const [period, setPeriod] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [taskSummary, setTaskSummary] = useState("");
  const [days, setDays] = useState("22");
  const [hoursTotal, setHoursTotal] = useState("160");
  const [deliverables, setDeliverables] = useState("");
  const [entries, setEntries] = useState<WorkRecordEntry[]>([]);
  const [entryDate, setEntryDate] = useState("");
  const [entryHours, setEntryHours] = useState("");
  const [entryDesc, setEntryDesc] = useState("");

  const addEntry = () => {
    if (!entryDate || !entryHours || !entryDesc) {
      toast.error("日付・時間・内容をすべて入力してください");
      return;
    }
    setEntries([...entries, { date: entryDate, hours: Number(entryHours), description: entryDesc }]);
    setEntryDate(""); setEntryHours(""); setEntryDesc("");
  };
  const removeEntry = (i: number) => setEntries(entries.filter((_, idx) => idx !== i));
  const totalHoursFromEntries = entries.reduce((s, e) => s + e.hours, 0);

  const submit = () => {
    if (!taskSummary) {
      toast.error("業務概要を入力してください");
      return;
    }
    toast.success("稼働レコードを提出しました", {
      description: `${period} の稼働。HR の承認をお待ちください。`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>稼働レコードを提出</DialogTitle>
          <DialogDescription>
            {isHourly
              ? "時給契約のため、日次の稼働明細を入力してください。"
              : "月額契約のため、月次サマリーで結構です。詳細稼働は任意。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">対象月</label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">稼働日数</label>
              <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">合計時間</label>
              <Input
                type="number"
                value={isHourly ? String(totalHoursFromEntries || 0) : hoursTotal}
                onChange={(e) => setHoursTotal(e.target.value)}
                disabled={isHourly}
                className={cn(isHourly && "bg-muted")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">業務概要</label>
            <Input
              value={taskSummary}
              onChange={(e) => setTaskSummary(e.target.value)}
              placeholder="例: UI ワイヤーフレーム作成、ユーザビリティテスト準備"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">成果物リンク（カンマ区切り）</label>
            <Input
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              placeholder="https://figma.com/... , https://docs.google.com/..."
            />
          </div>

          {isHourly && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                稼働明細 ({entries.length} 件・合計 {totalHoursFromEntries}h)
              </h4>
              <div className="grid grid-cols-[120px_80px_1fr_auto] gap-2">
                <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                <Input type="number" placeholder="時間" value={entryHours} onChange={(e) => setEntryHours(e.target.value)} />
                <Input placeholder="内容" value={entryDesc} onChange={(e) => setEntryDesc(e.target.value)} />
                <Button size="sm" onClick={addEntry} className="gap-1"><Plus className="size-3.5" />追加</Button>
              </div>
              {entries.length > 0 && (
                <ul className="space-y-1">
                  {entries.map((e, i) => (
                    <li key={i} className="flex items-center gap-2 rounded bg-background px-2 py-1 text-xs">
                      <span className="w-24 font-mono">{e.date}</span>
                      <span className="w-12 text-right font-medium tabular-nums">{e.hours}h</span>
                      <span className="flex-1 truncate">{e.description}</span>
                      <button onClick={() => removeEntry(i)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={submit} className="gap-1.5">
            <Send className="size-4" />
            提出して HR に承認依頼
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── 請求書アップロードダイアログ ───────
function InvoiceDialog({
  open, onOpenChange, contractor,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contractor: DemoContractor;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(String(contractor.rate_amount));
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const submit = () => {
    if (!invoiceNumber || !amount || !fileName) {
      toast.error("インボイス番号・金額・ファイルをすべて指定してください");
      return;
    }
    toast.success("請求書を提出しました", {
      description: `${invoiceNumber} を HR が承認次第、freee で支払処理されます。`,
    });
    onOpenChange(false);
    setInvoiceNumber(""); setFileName(null); setAmount(String(contractor.rate_amount));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>請求書をアップロード</DialogTitle>
          <DialogDescription>
            PDF または画像ファイル（最大 10MB）をドロップしてください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ドロップゾーン */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) setFileName(file.name);
            }}
            onClick={() => {
              // デモではダミーファイル名を設定
              const sample = `invoice_${contractor.id}_${new Date().toISOString().slice(0, 7)}.pdf`;
              setFileName(sample);
              toast.success(`${sample} を選択しました（デモ）`);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed py-8 transition-colors",
              dragOver ? "border-blue-500 bg-blue-50"
                : fileName ? "border-emerald-300 bg-emerald-50/40"
                : "border-muted-foreground/30 bg-muted/20 hover:border-blue-400 hover:bg-blue-50/40",
            )}
          >
            {fileName ? (
              <>
                <CheckCircle2 className="size-7 text-emerald-600" />
                <div className="font-medium">{fileName}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFileName(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  別のファイルを選ぶ
                </button>
              </>
            ) : (
              <>
                <Upload className="size-6 text-muted-foreground" />
                <div className="text-sm font-medium">クリックして選択 or ドラッグ&ドロップ</div>
                <div className="text-xs text-muted-foreground">PDF / JPEG / PNG（最大 10MB）</div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">インボイス番号</label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="例: INV-2026-04"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">請求日</label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              金額 ({contractor.currency})
            </label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          {contractor.country_code === "JP" && contractor.type === "individual" && !contractor.has_invoice_number && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertCircle className="mb-1 inline size-3.5" />{" "}
              インボイス制度未登録のため、源泉徴収後の金額が振込予定です。インボイス登録をご検討ください。
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={submit} className="gap-1.5">
            <Send className="size-4" />
            HR に提出
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
