"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Download, Send, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const recentLetters = [
  { id: "ol-1", candidate: "田中 浩二",       position: "シニア・エンジニア",  salary: "¥12,000,000", lang: "ja", status: "sent",     issued_at: "2026-05-02" },
  { id: "ol-2", candidate: "Raj Patel",       position: "シニア・エンジニア",  salary: "¥11,000,000", lang: "en", status: "draft",    issued_at: "2026-05-08" },
  { id: "ol-3", candidate: "鈴木 美咲",       position: "シニアデザイナー",   salary: "¥10,000,000", lang: "ja", status: "sent",     issued_at: "2026-04-28" },
  { id: "ol-4", candidate: "Lim Wei Jie",     position: "ASEAN BD",            salary: "¥15,000,000", lang: "en", status: "accepted", issued_at: "2026-04-20" },
];

export default function OfferLetterPage() {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FileText className="size-6 text-gc-700" />
          オファーレター生成
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          候補者情報と条件を入れるだけで日本語/英語の内定通知書を PDF 生成。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-4">
            <h3 className="text-sm font-semibold">新規オファー作成</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">氏名</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 山田 太郎" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">役職</label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="例: シニア・エンジニア" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">想定年収</label>
                <Input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="例: 9,000,000" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">入社予定日</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => toast.success("PDF をプレビュー（デモ）")} className="gap-1.5">
                <Eye className="size-4" />
                プレビュー (日本語)
              </Button>
              <Button variant="outline" onClick={() => toast.success("English PDF generated (demo)")} className="gap-1.5">
                <Eye className="size-4" />
                Preview (English)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">最近のオファー</h3>
            <ul className="space-y-2">
              {recentLetters.map((l) => (
                <li key={l.id} className="rounded-md border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{l.candidate}</span>
                    <Badge variant="outline" className="text-[10px]">{l.lang.toUpperCase()}</Badge>
                    <Badge variant={l.status === "accepted" ? "success" : l.status === "sent" ? "beta" : "outline"}>
                      {l.status === "accepted" ? "受諾" : l.status === "sent" ? "送付済" : "下書き"}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {l.position} · {l.salary} · {l.issued_at}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                      <Download className="size-3" /> DL
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                      <Send className="size-3" /> 再送
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">テンプレート機能</h3>
          <ul className="space-y-1.5 text-sm">
            <li className="rounded-md border bg-card p-2.5">日本語標準（正社員）</li>
            <li className="rounded-md border bg-card p-2.5">英語標準（Full-time）</li>
            <li className="rounded-md border bg-card p-2.5">業務委託 → 正社員転換</li>
            <li className="rounded-md border bg-card p-2.5">海外赴任前提</li>
            <li className="rounded-md border bg-card p-2.5">インターン → 新卒</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
