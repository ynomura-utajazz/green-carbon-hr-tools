/**
 * クライアントサイドの CSV ダウンロードヘルパ。
 * 文字コードは UTF-8 BOM 付き（Excel での文字化け対策）。
 */

export type CsvCell = string | number | boolean | null | undefined;

function escape(v: CsvCell): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(escape).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, rows: CsvCell[][]): void {
  const csv = toCsv(rows);
  const bom = "﻿"; // Excel が日本語を正しく表示するため
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
