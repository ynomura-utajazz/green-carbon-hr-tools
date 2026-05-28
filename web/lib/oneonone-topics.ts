/**
 * 1on1 標準トピックタグ。
 *
 * 自由記述だと「OKR / 目標 / Q2OKR / オーケーアール」のように表記揺れが起きて
 * 集計が困難になるため、標準タグを定義。RecordDialog の multi-select の選択肢
 * として使う。
 *
 * AI 抽出機能 (/api/ai/extract-1on1) では、自由記述メモから AI が
 * このタグセットの中から最大 5 個を選んで返す。
 */

export const ONEONONE_TOPIC_TAGS = [
  "OKR/目標",
  "キャリア相談",
  "成長/育成",
  "パフォーマンス",
  "評価/フィードバック",
  "チーム課題",
  "業務量/負荷",
  "メンタル/ウェルビーイング",
  "人間関係",
  "報酬/待遇",
  "技術/スキル",
  "プロジェクト",
  "1on1進め方",
  "プライベート",
  "その他",
] as const;

export type OneOnOneTopicTag = (typeof ONEONONE_TOPIC_TAGS)[number];

export function isStandardTopic(t: string): t is OneOnOneTopicTag {
  return (ONEONONE_TOPIC_TAGS as readonly string[]).includes(t);
}

/** 表記揺れの正規化（例: "OKR" → "OKR/目標", "Q2 OKR" → "OKR/目標"） */
const SYNONYM_MAP: Record<string, OneOnOneTopicTag> = {
  "okr": "OKR/目標",
  "目標": "OKR/目標",
  "目標設定": "OKR/目標",
  "キャリア": "キャリア相談",
  "career": "キャリア相談",
  "成長": "成長/育成",
  "育成": "成長/育成",
  "growth": "成長/育成",
  "パフォ": "パフォーマンス",
  "performance": "パフォーマンス",
  "評価": "評価/フィードバック",
  "feedback": "評価/フィードバック",
  "フィードバック": "評価/フィードバック",
  "チーム": "チーム課題",
  "team": "チーム課題",
  "業務量": "業務量/負荷",
  "負荷": "業務量/負荷",
  "残業": "業務量/負荷",
  "ワークライフ": "業務量/負荷",
  "メンタル": "メンタル/ウェルビーイング",
  "ウェルビーイング": "メンタル/ウェルビーイング",
  "wellbeing": "メンタル/ウェルビーイング",
  "ストレス": "メンタル/ウェルビーイング",
  "人間関係": "人間関係",
  "コミュニケーション": "人間関係",
  "報酬": "報酬/待遇",
  "給与": "報酬/待遇",
  "salary": "報酬/待遇",
  "技術": "技術/スキル",
  "スキル": "技術/スキル",
  "skill": "技術/スキル",
  "プロジェクト": "プロジェクト",
  "プロジェクト進捗": "プロジェクト",
  "雑談": "プライベート",
  "プライベート": "プライベート",
};

export function normalizeTopic(raw: string): string {
  const lower = raw.trim().toLowerCase();
  for (const [key, val] of Object.entries(SYNONYM_MAP)) {
    if (lower.includes(key)) return val;
  }
  // 標準タグそのままならそれを使う
  if (isStandardTopic(raw)) return raw;
  // どれにも当てはまらなければ「その他」扱いせず原文保持（フリータグとして残す）
  return raw;
}
