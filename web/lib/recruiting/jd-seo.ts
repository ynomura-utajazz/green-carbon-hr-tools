/**
 * JD（求人票）の SEO / 可視性分析。
 *
 * 機能：
 *  1. キーワード分析（ターゲット必須スキルが本文中に何回出るか）
 *  2. 文字数・読みやすさ
 *  3. 「招くフレーズ」/ NG ワード検出
 *  4. チャネル別 visibility スコア
 *     - Wantedly：「想い」セクション・絵文字・600-900 字
 *     - LinkedIn：英語混在・数字・行動動詞
 *     - Indeed：必須要件の明確さ・給与明示・勤務地
 *
 * 純関数。AI 呼び出しなし（即時レスポンス + コスト 0）。
 */

export type Channel = "wantedly" | "linkedin" | "indeed";

export type CheckResult = {
  /** ID（重複ガード用） */
  id: string;
  ok: boolean;
  /** 0-1。重要度 × 達成度 */
  score: number;
  weight: number;
  label: string;
  hint?: string;
};

export type ChannelScore = {
  channel: Channel;
  /** 0-100 */
  score: number;
  checks: CheckResult[];
  /** 総合コメント */
  summary: string;
};

export type KeywordHit = {
  keyword: string;
  count: number;
  /** 期待回数（重要度に応じて 1〜3） */
  expected: number;
  /** ok: 期待回数を満たす */
  ok: boolean;
};

export type JdSeoAnalysis = {
  total_chars: number;
  total_words: number;
  reading_time_sec: number;
  /** 必須キーワード（required_skills）のヒット状況 */
  required_keywords: KeywordHit[];
  /** 招くフレーズ（行動動詞・歓迎表現 等）のヒット数 */
  invitational_phrases: number;
  /** NG / バイアスフレーズの検出 */
  ng_phrases: { phrase: string; count: number }[];
  channels: ChannelScore[];
  /** 全チャネル平均 */
  overall_score: number;
};

// ── 検出辞書 ─────────────────────────────────────────────

/** 招くフレーズ：応募の心理障壁を下げる表現 */
const INVITATIONAL = [
  "歓迎", "サポート", "学べる", "挑戦", "応援", "成長",
  "カジュアル", "気軽に", "相談", "一緒に", "共に",
  "フレックス", "リモート", "副業", "在宅",
];

/** NG / バイアスを生む可能性のある表現 */
const NG_PHRASES = [
  "若手", "若い", "若年", "ベテラン", "シニア層",
  "男性", "女性",
  "新卒生え抜き", "プロパー", "外国人不可",
  "即戦力で", "圧倒的成長", "ガッツ", "体育会",
  "明るい性格", "コミュ力高い人",
];

/** 行動動詞（〜できます/していただきます 等）→ Active Voice チェック */
const ACTIVE_VERB_PATTERNS = [
  /していただきます/g,
  /できます/g,
  /担当します/g,
  /参加します/g,
  /設計し/g,
  /構築し/g,
  /改善し/g,
  /推進し/g,
];

const NUMBER_PATTERN = /\d+/g;
/** 英単語（カタカナ語ではない）。LinkedIn 向けに英語混在度を見る */
const ENGLISH_WORD = /\b[a-zA-Z][a-zA-Z\-]+\b/g;
/** 絵文字（簡易検出。完璧ではないが代表的なものを拾う） */
const EMOJI_PATTERN = /\p{Extended_Pictographic}/gu;

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function countOccurrences(text: string, keyword: string): number {
  if (!keyword) return 0;
  const re = new RegExp(escapeRegex(keyword), "gi");
  return (text.match(re) ?? []).length;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── メイン解析 ────────────────────────────────────────────

export function analyzeJd(
  jdText: string,
  requiredSkills: string[],
): JdSeoAnalysis {
  const text = jdText ?? "";
  const total_chars = text.length;
  // 大雑把な単語数（日本語は文字数の半分、英単語はそのまま）
  const englishWordCount = countMatches(text, ENGLISH_WORD);
  const cjkChars = (text.match(/[぀-ヿ一-鿿]/g) ?? []).length;
  const total_words = englishWordCount + Math.round(cjkChars / 1.5);
  const reading_time_sec = Math.max(15, Math.round((total_words / 200) * 60)); // 200 wpm 想定

  const required_keywords: KeywordHit[] = requiredSkills.map((kw) => {
    const count = countOccurrences(text, kw);
    const expected = 1; // 最低 1 回は出ていてほしい
    return { keyword: kw, count, expected, ok: count >= expected };
  });

  // 招くフレーズ
  const invitational_phrases = INVITATIONAL.reduce(
    (sum, p) => sum + countOccurrences(text, p), 0,
  );

  // NG フレーズ
  const ng_phrases = NG_PHRASES
    .map((phrase) => ({ phrase, count: countOccurrences(text, phrase) }))
    .filter((x) => x.count > 0);

  // チャネル評価
  const channels = [
    scoreWantedly(text, total_chars, invitational_phrases, ng_phrases.length),
    scoreLinkedIn(text, total_chars, ng_phrases.length),
    scoreIndeed(text, requiredSkills, ng_phrases.length),
  ];

  const overall_score = Math.round(
    channels.reduce((s, c) => s + c.score, 0) / channels.length,
  );

  return {
    total_chars,
    total_words,
    reading_time_sec,
    required_keywords,
    invitational_phrases,
    ng_phrases,
    channels,
    overall_score,
  };
}

// ── チャネル別スコア ────────────────────────────────────────

function packScore(checks: CheckResult[]): number {
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return 0;
  const earned = checks.reduce((s, c) => s + c.score * c.weight, 0);
  return Math.round((earned / totalWeight) * 100);
}

function scoreWantedly(
  text: string, totalChars: number, invitationalCount: number, ngCount: number,
): ChannelScore {
  const emojiCount = countMatches(text, EMOJI_PATTERN);
  const hasWhySection = /なぜ|why|想い|ストーリー|背景/i.test(text);
  const hasPersona = /こんな方|向いて|お持ちの方|歓迎/.test(text);
  const lengthOk = totalChars >= 600 && totalChars <= 1500;

  const checks: CheckResult[] = [
    {
      id: "length", ok: lengthOk,
      score: lengthOk ? 1 : (totalChars < 600 ? totalChars / 600 : 1500 / Math.max(totalChars, 1)),
      weight: 0.20,
      label: `文字数 600-1500 推奨（現在 ${totalChars} 文字）`,
      hint: !lengthOk ? "Wantedly は読み物としての適量があります" : undefined,
    },
    {
      id: "why", ok: hasWhySection, score: hasWhySection ? 1 : 0, weight: 0.25,
      label: "「なぜこのロールがあるか」セクション",
      hint: !hasWhySection ? "想いや背景を 2-3 文で書くと反応率が上がります" : undefined,
    },
    {
      id: "persona", ok: hasPersona, score: hasPersona ? 1 : 0, weight: 0.20,
      label: "「こんな方に向いています」記述",
      hint: !hasPersona ? "ペルソナ記述があると応募者の自己照合が進みます" : undefined,
    },
    {
      id: "invitational", ok: invitationalCount >= 3,
      score: Math.min(1, invitationalCount / 3), weight: 0.15,
      label: `招くフレーズ ${invitationalCount}/3+（歓迎・カジュアル・気軽に 等）`,
    },
    {
      id: "emoji", ok: emojiCount >= 1 && emojiCount <= 5,
      score: emojiCount === 0 ? 0 : emojiCount > 5 ? 0.4 : 1,
      weight: 0.10,
      label: `絵文字 ${emojiCount} 個（1-5 個推奨）`,
      hint: emojiCount === 0 ? "🌱 や 💚 を 1-2 個入れるとブランドが伝わります"
          : emojiCount > 5 ? "絵文字が多すぎると幼く見えます" : undefined,
    },
    {
      id: "ng", ok: ngCount === 0,
      score: ngCount === 0 ? 1 : Math.max(0, 1 - ngCount * 0.3),
      weight: 0.10,
      label: ngCount === 0 ? "NG 表現なし" : `NG 表現 ${ngCount} 件検出`,
    },
  ];

  return {
    channel: "wantedly",
    score: packScore(checks),
    checks,
    summary: hasWhySection && lengthOk
      ? "Wantedly 適性◎。想いと適切な長さでファン化が見込めます。"
      : !hasWhySection
        ? "Wantedly では「想い」が伝わる構成が必要です。"
        : `文字数を ${totalChars < 600 ? "増やし" : "絞り"}、ストーリーを補強しましょう。`,
  };
}

function scoreLinkedIn(
  text: string, totalChars: number, ngCount: number,
): ChannelScore {
  const englishWords = countMatches(text, ENGLISH_WORD);
  const numbers = countMatches(text, NUMBER_PATTERN);
  const activeVerbs = ACTIVE_VERB_PATTERNS.reduce(
    (s, p) => s + countMatches(text, p), 0,
  );
  const hasComp = /\d+[万億]|\$\d|円|salary|comp/i.test(text);
  const lengthOk = totalChars >= 300 && totalChars <= 1200;

  const checks: CheckResult[] = [
    {
      id: "length", ok: lengthOk,
      score: lengthOk ? 1 : (totalChars < 300 ? totalChars / 300 : 1200 / Math.max(totalChars, 1)),
      weight: 0.15,
      label: `文字数 300-1200 推奨（現在 ${totalChars}）`,
    },
    {
      id: "english", ok: englishWords >= 5,
      score: Math.min(1, englishWords / 8), weight: 0.20,
      label: `英単語 ${englishWords} 個（5+ 推奨）`,
      hint: englishWords < 5 ? "LinkedIn ユーザーは英語混在に慣れています" : undefined,
    },
    {
      id: "numbers", ok: numbers >= 3,
      score: Math.min(1, numbers / 5), weight: 0.20,
      label: `数字 ${numbers} 個（3+ 推奨）`,
      hint: numbers < 3 ? "「5 年経験」「年収 800 万円」など具体数字でインパクト UP" : undefined,
    },
    {
      id: "active", ok: activeVerbs >= 4,
      score: Math.min(1, activeVerbs / 6), weight: 0.15,
      label: `行動動詞 ${activeVerbs} 個（〜します／設計し／推進し 等）`,
    },
    {
      id: "comp", ok: hasComp, score: hasComp ? 1 : 0, weight: 0.20,
      label: "報酬レンジの明示",
      hint: !hasComp ? "LinkedIn は給与明示があるとクリック率が 2 倍" : undefined,
    },
    {
      id: "ng", ok: ngCount === 0,
      score: ngCount === 0 ? 1 : Math.max(0, 1 - ngCount * 0.3),
      weight: 0.10,
      label: ngCount === 0 ? "NG 表現なし" : `NG 表現 ${ngCount} 件`,
    },
  ];

  return {
    channel: "linkedin",
    score: packScore(checks),
    checks,
    summary: hasComp && englishWords >= 5
      ? "LinkedIn 適性◎。プロフェッショナル層に届きやすい構造。"
      : "数字・英単語・報酬レンジを増やすとクリック率が上がります。",
  };
}

function scoreIndeed(
  text: string, requiredSkills: string[], ngCount: number,
): ChannelScore {
  const hasMustHave = /必須|要件|must|求める/i.test(text);
  const hasNiceToHave = /歓迎|あれば|nice to have|プラス/i.test(text);
  const hasComp = /\d+[万億]|\$\d|円|年収|salary/i.test(text);
  const hasLocation = /勤務|location|拠点|office|リモート/i.test(text);
  const skillCoverage = requiredSkills.length > 0
    ? requiredSkills.filter((s) => countOccurrences(text, s) > 0).length / requiredSkills.length
    : 1;

  const checks: CheckResult[] = [
    {
      id: "must", ok: hasMustHave, score: hasMustHave ? 1 : 0, weight: 0.20,
      label: "必須要件の明確化（「必須」「要件」セクション）",
      hint: !hasMustHave ? "Indeed は要件の明示性を重視" : undefined,
    },
    {
      id: "nice", ok: hasNiceToHave, score: hasNiceToHave ? 1 : 0, weight: 0.10,
      label: "歓迎条件の記載",
    },
    {
      id: "comp", ok: hasComp, score: hasComp ? 1 : 0, weight: 0.25,
      label: "給与レンジ明記",
      hint: !hasComp ? "Indeed は給与明示で応募率が 1.8 倍に" : undefined,
    },
    {
      id: "location", ok: hasLocation, score: hasLocation ? 1 : 0, weight: 0.15,
      label: "勤務地・働き方の明記",
    },
    {
      id: "skills", ok: skillCoverage >= 0.8,
      score: skillCoverage, weight: 0.20,
      label: `必須スキルの本文出現率 ${Math.round(skillCoverage * 100)}%`,
      hint: skillCoverage < 0.8 ? "全必須スキルを本文中で 1 回は触れましょう" : undefined,
    },
    {
      id: "ng", ok: ngCount === 0,
      score: ngCount === 0 ? 1 : Math.max(0, 1 - ngCount * 0.3),
      weight: 0.10,
      label: ngCount === 0 ? "NG 表現なし" : `NG 表現 ${ngCount} 件`,
    },
  ];

  return {
    channel: "indeed",
    score: packScore(checks),
    checks,
    summary: hasComp && hasMustHave && skillCoverage >= 0.8
      ? "Indeed 適性◎。検索からのクリック率が高い構造。"
      : "必須要件・給与・スキル列挙の明示で応募効率が改善します。",
  };
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  wantedly: "Wantedly",
  linkedin: "LinkedIn",
  indeed:   "Indeed",
};
