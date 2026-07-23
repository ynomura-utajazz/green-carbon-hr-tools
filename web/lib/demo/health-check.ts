/**
 * 健康診断管理のデモデータ。労安法に基づく定期健診管理。
 */

export type HealthResult = "A" | "B" | "C" | "D" | null;

export const RESULT_LABEL: Record<NonNullable<HealthResult>, string> = {
  A: "異常なし",
  B: "軽度異常（経過観察）",
  C: "要再検査",
  D: "要精密検査・治療",
};

export const RESULT_TONE: Record<NonNullable<HealthResult>, string> = {
  A: "border-emerald-200 bg-emerald-50 text-emerald-800",
  B: "border-blue-200 bg-blue-50 text-blue-800",
  C: "border-amber-200 bg-amber-50 text-amber-800",
  D: "border-red-300 bg-red-50 text-red-900",
};

export type HealthRecord = {
  employee_id: string;
  checked_at: string | null;          // null = 未受診
  result: HealthResult;
  followup_required: boolean;
  followup_status: "none" | "scheduled" | "in_progress" | "completed";
  scheduled_at: string | null;        // 予約日（未受診者）
  clinic: string | null;
  notes?: string;
};

export type LawComplianceItem = {
  id: string;
  title: string;
  reference: string;                  // 法令条文
  status: "ok" | "warning" | "violation";
  note: string;
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

// 全社員に対して受診状況を生成（実装時は employees から動的生成可）
export const DEMO_HEALTH_RECORDS: HealthRecord[] = [
  // 受診済（A判定）
  { employee_id: "e1", checked_at: day(-45), result: "A", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック" },
  { employee_id: "e2", checked_at: day(-50), result: "A", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック" },
  { employee_id: "e3", checked_at: day(-30), result: "A", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック" },
  { employee_id: "e4", checked_at: day(-60), result: "A", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "渋谷メディカルセンター" },
  { employee_id: "e5", checked_at: day(-40), result: "A", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック" },
  { employee_id: "e6", checked_at: day(-25), result: "A", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック" },
  { employee_id: "e10", checked_at: day(-65), result: "A", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "渋谷メディカルセンター" },
  { employee_id: "e15", checked_at: day(-20), result: "A", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック" },
  { employee_id: "e16", checked_at: day(-55), result: "A", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック" },
  { employee_id: "e26", checked_at: day(-35), result: "A", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック" },

  // B判定（経過観察）
  { employee_id: "e7", checked_at: day(-40), result: "B", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック", notes: "血圧やや高め。次回経過観察。" },
  { employee_id: "e8", checked_at: day(-50), result: "B", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック", notes: "コレステロール値経過観察" },
  { employee_id: "e14", checked_at: day(-30), result: "B", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック" },
  { employee_id: "e17", checked_at: day(-45), result: "B", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "渋谷メディカルセンター" },
  { employee_id: "e19", checked_at: day(-35), result: "B", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック" },
  { employee_id: "e23", checked_at: day(-25), result: "B", followup_required: false, followup_status: "none", scheduled_at: null, clinic: "東京中央クリニック" },

  // C判定（要再検査）
  { employee_id: "e9", checked_at: day(-50), result: "C", followup_required: true, followup_status: "in_progress", scheduled_at: day(7), clinic: "東京中央クリニック", notes: "肝機能 要再検査。来週受診予定。" },
  { employee_id: "e18", checked_at: day(-40), result: "C", followup_required: true, followup_status: "scheduled", scheduled_at: day(14), clinic: "新宿健診プラザ", notes: "血糖値高め。再検査予約済。" },

  // D判定（要精密検査）
  { employee_id: "e13", checked_at: day(-60), result: "D", followup_required: true, followup_status: "in_progress", scheduled_at: day(3), clinic: "東京中央クリニック", notes: "心電図異常。専門医紹介。受診予定。" },

  // 未受診（予約済）
  { employee_id: "e11", checked_at: null, result: null, followup_required: false, followup_status: "none", scheduled_at: day(10), clinic: "東京中央クリニック", notes: "5月予約済" },
  { employee_id: "e12", checked_at: null, result: null, followup_required: false, followup_status: "none", scheduled_at: day(15), clinic: "渋谷メディカルセンター", notes: "海外勤務との調整中" },
  { employee_id: "e22", checked_at: null, result: null, followup_required: false, followup_status: "none", scheduled_at: day(20), clinic: "東京中央クリニック" },
  { employee_id: "e24", checked_at: null, result: null, followup_required: false, followup_status: "none", scheduled_at: day(18), clinic: "東京中央クリニック" },

  // 未受診（未予約）
  { employee_id: "e20", checked_at: null, result: null, followup_required: false, followup_status: "none", scheduled_at: null, clinic: null, notes: "海外駐在のため日程調整中" },
  { employee_id: "e21", checked_at: null, result: null, followup_required: false, followup_status: "none", scheduled_at: null, clinic: null },
  { employee_id: "e25", checked_at: null, result: null, followup_required: false, followup_status: "none", scheduled_at: null, clinic: null },
  { employee_id: "e27", checked_at: null, result: null, followup_required: false, followup_status: "none", scheduled_at: null, clinic: null },
  { employee_id: "e28", checked_at: null, result: null, followup_required: false, followup_status: "none", scheduled_at: null, clinic: null, notes: "インターン期間中、対象外検討中" },
  { employee_id: "e29", checked_at: null, result: null, followup_required: false, followup_status: "none", scheduled_at: null, clinic: null },
];

export const DEMO_LAW_COMPLIANCE: LawComplianceItem[] = [
  {
    id: "law-1",
    title: "年1回の定期健康診断の実施",
    reference: "労働安全衛生法 第66条第1項",
    status: "ok",
    note: "2026年5月までに全社員対象の定期健診を実施中。受診率 67%（24/30）。残り 6 名は 5月中の受診予定。",
  },
  {
    id: "law-2",
    title: "深夜業従事者の6ヶ月毎健診",
    reference: "労働安全衛生法 第66条第1項",
    status: "ok",
    note: "深夜業従事者なし（コアタイム制度のため）。",
  },
  {
    id: "law-3",
    title: "有害業務従事者の特殊健康診断",
    reference: "労働安全衛生法 第66条第2項",
    status: "ok",
    note: "該当する有害業務従事者なし。",
  },
  {
    id: "law-4",
    title: "健診結果の記録・5年間保存",
    reference: "労働安全衛生法 第66条の3",
    status: "ok",
    note: "クラウド健診管理システムで自動記録・暗号化保存。",
  },
  {
    id: "law-5",
    title: "異常所見者への医師意見聴取",
    reference: "労働安全衛生法 第66条の4",
    status: "warning",
    note: "C・D判定 3 名のうち 1 名（e13）の産業医意見聴取が未完了。本月中に対応予定。",
  },
  {
    id: "law-6",
    title: "就業上の措置の実施",
    reference: "労働安全衛生法 第66条の5",
    status: "ok",
    note: "産業医意見に基づく措置を該当者に対して実施済み。",
  },
  {
    id: "law-7",
    title: "健診結果の本人通知",
    reference: "労働安全衛生法 第66条の6",
    status: "ok",
    note: "全受診者に結果通知書を送付済み。本人ポータルでも閲覧可能。",
  },
  {
    id: "law-8",
    title: "ストレスチェックの実施（50人以上事業場）",
    reference: "労働安全衛生法 第66条の10",
    status: "ok",
    note: "別ツール「ストレスチェック」で年1回実施。",
  },
];

// ─── ヘルパ ─────────────────────────
export function recordsByResult(records: HealthRecord[] = DEMO_HEALTH_RECORDS): Map<NonNullable<HealthResult> | "未受診", HealthRecord[]> {
  const map = new Map<NonNullable<HealthResult> | "未受診", HealthRecord[]>();
  for (const k of ["A", "B", "C", "D", "未受診"] as const) map.set(k, []);
  for (const r of records) {
    const k = r.result ?? "未受診";
    map.get(k)!.push(r);
  }
  return map;
}

export function followupNeeded(records: HealthRecord[] = DEMO_HEALTH_RECORDS): HealthRecord[] {
  return records.filter((r) => r.followup_required);
}

export function unscheduled(records: HealthRecord[] = DEMO_HEALTH_RECORDS): HealthRecord[] {
  return records.filter((r) => !r.checked_at && !r.scheduled_at);
}

export function recordForEmployee(employeeId: string, records: HealthRecord[] = DEMO_HEALTH_RECORDS): HealthRecord | undefined {
  return records.find((r) => r.employee_id === employeeId);
}

export function completionRate(records: HealthRecord[] = DEMO_HEALTH_RECORDS): number {
  if (records.length === 0) return 0; // 実データ0件のとき NaN% を避ける
  const completed = records.filter((r) => r.checked_at).length;
  return Math.round((completed / records.length) * 100);
}

export function recordsByDept(
  employees: { id: string; department_id: string }[],
  records: HealthRecord[] = DEMO_HEALTH_RECORDS,
): Map<string, { total: number; done: number }> {
  const map = new Map<string, { total: number; done: number }>();
  for (const r of records) {
    const e = employees.find((x) => x.id === r.employee_id);
    if (!e) continue;
    if (!map.has(e.department_id)) map.set(e.department_id, { total: 0, done: 0 });
    const entry = map.get(e.department_id)!;
    entry.total += 1;
    if (r.checked_at) entry.done += 1;
  }
  return map;
}
