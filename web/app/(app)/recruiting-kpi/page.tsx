"use client";

/**
 * /recruiting-kpi
 *
 * 3 次元採用 KPI ダッシュボード（時間軸 × 経路 × ロール）。
 *
 * ピボット方式：行・列・指標 をユーザーが選び、ヒートマップ表示。
 * 軸候補：
 *  - dim1: 時間軸（月）
 *  - dim2: 経路（source）
 *  - dim3: ロール（簡易：position_id）
 * 指標：
 *  - applied      : 流入数
 *  - hired        : 採用決定数
 *  - hire_rate    : 採用率（hired / applied）
 *  - days_to_hire : 平均所要日数
 */

import { useMemo, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEMO_FUNNEL_EVENTS } from "@/lib/demo/funnel-events";
import { DEMO_POSITIONS, SOURCE_LABEL, type CandidateSource } from "@/lib/demo/recruiting";
import { downloadCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

type Dim = "month" | "source" | "position";
type Metric = "applied" | "hired" | "hire_rate" | "days_to_hire";

const DIM_LABEL: Record<Dim, string> = {
  month: "月",
  source: "経路",
  position: "ロール",
};

const METRIC_LABEL: Record<Metric, { label: string; unit: string; format: (v: number) => string }> = {
  applied:      { label: "流入数",       unit: "名",
                  format: (v) => v.toFixed(0) },
  hired:        { label: "採用数",       unit: "名",
                  format: (v) => v.toFixed(0) },
  hire_rate:    { label: "採用率",       unit: "%",
                  format: (v) => `${(v * 100).toFixed(1)}%` },
  days_to_hire: { label: "平均所要日数", unit: "日",
                  format: (v) => Math.round(v).toString() },
};

// ── 集計ロジック ──────────────────────────────────────────────

type CandidateState = {
  candidate_id: string;
  source: CandidateSource;
  /** position は funnel events からは取れないので、フェイクで割り当て（demo） */
  position_id: string;
  applied_at: Date;
  hired_at?: Date;
};

/** イベント群 → 候補者の状態を構築 */
function buildCandidates(): CandidateState[] {
  const map = new Map<string, CandidateState>();
  for (const ev of DEMO_FUNNEL_EVENTS) {
    const ts = new Date(ev.occurred_at);
    const cur = map.get(ev.candidate_id);
    if (!cur) {
      // candidate_id を一貫的に position_id にハッシュ
      const hash = ev.candidate_id
        .split("")
        .reduce((s, c) => s + c.charCodeAt(0), 0);
      const position_id = DEMO_POSITIONS[hash % DEMO_POSITIONS.length].id;
      map.set(ev.candidate_id, {
        candidate_id: ev.candidate_id,
        source: ev.source,
        position_id,
        applied_at: ts,
        hired_at: ev.to_stage === "hired" ? ts : undefined,
      });
    } else {
      if (ev.to_stage === "hired") cur.hired_at = ts;
      if (ts < cur.applied_at) cur.applied_at = ts;
    }
  }
  return [...map.values()];
}

function keyOf(dim: Dim, c: CandidateState): string {
  switch (dim) {
    case "month":    return c.applied_at.toISOString().slice(0, 7);
    case "source":   return c.source;
    case "position": return c.position_id;
  }
}

function labelOf(dim: Dim, key: string): string {
  if (dim === "source") return SOURCE_LABEL[key as CandidateSource] ?? key;
  if (dim === "position") return DEMO_POSITIONS.find((p) => p.id === key)?.title ?? key;
  return key;
}

type Cell = {
  applied: number;
  hired: number;
  total_days_to_hire: number;
  hired_with_days: number;
};

function emptyCell(): Cell {
  return { applied: 0, hired: 0, total_days_to_hire: 0, hired_with_days: 0 };
}

function pivot(
  candidates: CandidateState[],
  rowDim: Dim, colDim: Dim,
): { rows: string[]; cols: string[]; data: Map<string, Cell> } {
  const rows = new Set<string>();
  const cols = new Set<string>();
  const data = new Map<string, Cell>();

  for (const c of candidates) {
    const r = keyOf(rowDim, c);
    const co = keyOf(colDim, c);
    rows.add(r);
    cols.add(co);
    const k = `${r}|${co}`;
    const cell = data.get(k) ?? emptyCell();
    cell.applied += 1;
    if (c.hired_at) {
      cell.hired += 1;
      const days = (c.hired_at.getTime() - c.applied_at.getTime()) / 86_400_000;
      cell.total_days_to_hire += days;
      cell.hired_with_days += 1;
    }
    data.set(k, cell);
  }
  return { rows: [...rows].sort(), cols: [...cols].sort(), data };
}

function metricOf(cell: Cell | undefined, metric: Metric): number | null {
  if (!cell) return null;
  switch (metric) {
    case "applied":      return cell.applied;
    case "hired":        return cell.hired;
    case "hire_rate":    return cell.applied > 0 ? cell.hired / cell.applied : null;
    case "days_to_hire": return cell.hired_with_days > 0 ? cell.total_days_to_hire / cell.hired_with_days : null;
  }
}

// ── ページ ────────────────────────────────────────────────

export default function RecruitingKpiPage() {
  const [rowDim, setRowDim] = useState<Dim>("month");
  const [colDim, setColDim] = useState<Dim>("source");
  const [metric, setMetric] = useState<Metric>("applied");

  const candidates = useMemo(buildCandidates, []);
  const piv = useMemo(() => pivot(candidates, rowDim, colDim), [candidates, rowDim, colDim]);

  // 全セルの値の最大・最小（色スケール用）
  const values = useMemo(() => {
    const arr: number[] = [];
    for (const r of piv.rows) for (const c of piv.cols) {
      const v = metricOf(piv.data.get(`${r}|${c}`), metric);
      if (v !== null) arr.push(v);
    }
    return arr;
  }, [piv, metric]);
  const max = values.length > 0 ? Math.max(...values) : 1;

  // 軸合計（行末・列末）
  const rowTotals = piv.rows.map((r) => {
    const cells = piv.cols.map((c) => piv.data.get(`${r}|${c}`)).filter(Boolean) as Cell[];
    return cells.reduce<Cell>((acc, cell) => ({
      applied: acc.applied + cell.applied,
      hired: acc.hired + cell.hired,
      total_days_to_hire: acc.total_days_to_hire + cell.total_days_to_hire,
      hired_with_days: acc.hired_with_days + cell.hired_with_days,
    }), emptyCell());
  });
  const colTotals = piv.cols.map((c) => {
    const cells = piv.rows.map((r) => piv.data.get(`${r}|${c}`)).filter(Boolean) as Cell[];
    return cells.reduce<Cell>((acc, cell) => ({
      applied: acc.applied + cell.applied,
      hired: acc.hired + cell.hired,
      total_days_to_hire: acc.total_days_to_hire + cell.total_days_to_hire,
      hired_with_days: acc.hired_with_days + cell.hired_with_days,
    }), emptyCell());
  });

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      [DIM_LABEL[rowDim], ...piv.cols.map((c) => labelOf(colDim, c)), "合計"],
      ...piv.rows.map((r, i) => {
        const cells = piv.cols.map((c) => {
          const v = metricOf(piv.data.get(`${r}|${c}`), metric);
          return v !== null ? Number(v.toFixed(3)) : "";
        });
        const total = metricOf(rowTotals[i], metric);
        return [labelOf(rowDim, r), ...cells, total !== null ? Number(total.toFixed(3)) : ""];
      }),
    ];
    downloadCsv(`recruiting-kpi-${rowDim}-${colDim}-${metric}-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BarChart3 className="size-6 text-gc-700" />
            採用 KPI ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            時間軸 × 経路 × ロールの 3 次元ピボット分析。指標 4 種・軸の組合せで自由に切替
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-1.5">
          <Download className="size-4" />
          CSV
        </Button>
      </div>

      {/* 軸セレクタ */}
      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-4">
          <SelectField label="行" value={rowDim} onChange={(v) => setRowDim(v as Dim)} options={DIM_LABEL} disabledKey={colDim} />
          <SelectField label="列" value={colDim} onChange={(v) => setColDim(v as Dim)} options={DIM_LABEL} disabledKey={rowDim} />
          <SelectField label="指標" value={metric} onChange={(v) => setMetric(v as Metric)} options={Object.fromEntries(Object.entries(METRIC_LABEL).map(([k, v]) => [k, v.label])) as Record<string, string>} />
          <div className="rounded-md border bg-muted/30 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">現在の表示</div>
            <div className="mt-0.5 truncate text-sm font-medium">
              {DIM_LABEL[rowDim]} × {DIM_LABEL[colDim]} × {METRIC_LABEL[metric].label}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ピボットテーブル */}
      <Card>
        <CardContent className="p-3 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-background px-2 py-1.5 text-left font-semibold">
                  {DIM_LABEL[rowDim]} ＼ {DIM_LABEL[colDim]}
                </th>
                {piv.cols.map((c) => (
                  <th key={c} className="px-2 py-1.5 text-center font-semibold whitespace-nowrap">
                    {labelOf(colDim, c)}
                  </th>
                ))}
                <th className="px-2 py-1.5 text-right font-semibold bg-muted/30">合計</th>
              </tr>
            </thead>
            <tbody>
              {piv.rows.map((r, i) => (
                <tr key={r} className="border-b last:border-b-0">
                  <td className="sticky left-0 bg-background px-2 py-1.5 font-medium whitespace-nowrap">
                    {labelOf(rowDim, r)}
                  </td>
                  {piv.cols.map((c) => (
                    <td key={c} className="px-1 py-0.5 text-center">
                      <HeatCell value={metricOf(piv.data.get(`${r}|${c}`), metric)} max={max} metric={metric} />
                    </td>
                  ))}
                  <td className="bg-muted/20 px-2 py-1.5 text-right font-mono font-semibold tabular-nums">
                    {fmtMetric(metricOf(rowTotals[i], metric), metric)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 bg-muted/20">
                <td className="sticky left-0 bg-muted/20 px-2 py-1.5 font-semibold">列合計</td>
                {piv.cols.map((c, j) => (
                  <td key={c} className="px-2 py-1.5 text-center font-mono font-semibold tabular-nums">
                    {fmtMetric(metricOf(colTotals[j], metric), metric)}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right font-mono font-bold tabular-nums">
                  —
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] text-muted-foreground">
        🔥 ヒートマップは <strong>{METRIC_LABEL[metric].label}</strong> の値を 0 〜 最大値で正規化して色付け。
        セルが濃いほど数値が高い。「行 = 経路 / 列 = ロール / 指標 = 採用率」にすると、
        どの組合せが最も効率的かが一目で分かります。
      </div>
    </div>
  );
}

// ── 部品 ─────────────────────────────────────

function SelectField({ label, value, onChange, options, disabledKey }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
  disabledKey?: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(options).map(([k, v]) => (
            <SelectItem key={k} value={k} disabled={k === disabledKey}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function HeatCell({ value, max, metric }: {
  value: number | null;
  max: number;
  metric: Metric;
}) {
  if (value === null) return <span className="text-muted-foreground/40">—</span>;
  const norm = max > 0 ? value / max : 0;
  const bg = `hsl(155 65% ${95 - norm * 50}%)`;
  const fg = `hsl(155 70% 22%)`;
  return (
    <span
      className="inline-flex min-w-[3.5rem] justify-center rounded px-1.5 py-1 font-mono font-semibold tabular-nums"
      style={{ backgroundColor: bg, color: fg }}
    >
      {METRIC_LABEL[metric].format(value)}
    </span>
  );
}

function fmtMetric(value: number | null, metric: Metric): string {
  if (value === null) return "—";
  return METRIC_LABEL[metric].format(value);
}
