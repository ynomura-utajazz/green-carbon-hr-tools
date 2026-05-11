/**
 * AI Copilot のプロンプトテンプレート集。
 * すべて日本語応答前提。各関数は { system, user } を返す。
 */

// ── 採用候補者の評価サマリ生成 ────────────────────────────────

export type CandidateInput = {
  name: string;
  position: string;
  resumeText?: string;
  interviewNotes: string;
  scorecards?: { interviewer: string; rating: number; comments: string }[];
  /** 候補者の希望条件 */
  preferences?: string;
};

export function buildCandidateSummaryPrompt(c: CandidateInput): {
  system: string;
  user: string;
} {
  const system = `あなたは Green Carbon 株式会社（300名規模の気候テック企業）の HR ビジネスパートナーです。
採用候補者の情報を読み、採用判断に必要な要点を簡潔にまとめます。

出力フォーマット（Markdown）：
## サマリ
[3 行以内で候補者の核となる強み・経験を要約]

## 強み
- [箇条書き 3〜5 個]

## 懸念点
- [箇条書き 1〜3 個。なければ「特になし」と書く]

## 推奨アクション
- [次のステップを 1〜2 個。例：技術面接の追加、リファレンスチェック、現場メンバー面談]

## 総合評価
[Strong Hire / Hire / No Hire / Strong No Hire のいずれか + 1 文の理由]

注意：
- 推測で書かず、与えられた情報のみから判断する
- バイアス（性別・年齢・国籍・出身校）に基づく評価は禁止
- 「〜と思われる」「〜の可能性が高い」など曖昧な表現は避け、根拠を必ず示す`;

  const user = `候補者：${c.name}
ポジション：${c.position}

【職務経歴】
${c.resumeText ?? "（提供なし）"}

【面接メモ】
${c.interviewNotes}

${c.scorecards && c.scorecards.length > 0 ? `【スコアカード】
${c.scorecards.map((s) => `- ${s.interviewer}（${s.rating}/5）: ${s.comments}`).join("\n")}` : ""}

${c.preferences ? `【希望条件】\n${c.preferences}` : ""}

上記から評価サマリを生成してください。`;

  return { system, user };
}

// ── 1on1 議事録要約 ────────────────────────────────────────────

export type OneOnOneInput = {
  managerName: string;
  memberName: string;
  date: string;
  rawNotes: string;
  /** 前回の積み残し */
  previousActions?: string[];
};

export function buildOneOnOneSummaryPrompt(i: OneOnOneInput): {
  system: string;
  user: string;
} {
  const system = `あなたは 1on1 ファシリテーションのプロフェッショナルです。
マネージャーが取った 1on1 の生メモを、フォローアップしやすい構造化された議事録に整形します。

出力フォーマット（Markdown）：
## ハイライト
[3 行以内で今回の核となる話題]

## ディスカッション内容
- [話題ごとに箇条書き。発言者を「M:」「メンバー:」で示す必要なし、要旨のみ]

## 次回までのアクション
| 担当 | アクション | 期限 |
|---|---|---|
| メンバー / マネージャー / HR | [具体的な行動] | [日付 or "次回まで"] |

## 気になる兆候
[エンゲージメント低下・離職フラグ・キャリア停滞などのサイン。なければ「特になし」]

## 次回の推奨議題
- [箇条書き 1〜3 個]

注意：
- メモにない情報は補完しない
- メンバーの個人情報（家族構成・健康状態など）はサマリに含めない
- 「気になる兆候」は事実ベースで書き、決めつけない`;

  const user = `マネージャー：${i.managerName}
メンバー：${i.memberName}
日付：${i.date}

${i.previousActions && i.previousActions.length > 0
    ? `【前回の積み残し】\n${i.previousActions.map((a) => `- ${a}`).join("\n")}\n`
    : ""}

【今回の生メモ】
${i.rawNotes}

上記を整形して議事録を生成してください。`;

  return { system, user };
}

// ── 離職リスクの言語化 ────────────────────────────────────────

export type RetentionInput = {
  employeeName: string;
  department: string;
  jobTitle: string;
  tenureMonths: number;
  riskScore: number;          // 0–100
  signals: {
    label: string;
    value: string;
    weight: "low" | "med" | "high";
  }[];
  recentOneOnOneSummary?: string;
  recentSurveyScore?: { engagement: number; mood: number };
};

export function buildRetentionNarrativePrompt(r: RetentionInput): {
  system: string;
  user: string;
} {
  const system = `あなたは Green Carbon の HR ビジネスパートナーです。
離職リスクスコアの数値に対し、マネージャーが「なぜリスクが高いか」「何をすべきか」を理解できるよう、
人間味のある分析と具体的な介入プランを生成します。

出力フォーマット（Markdown）：
## リスクの全体像
[2〜3 行で、なぜこのスコアになっているのかを物語として説明]

## 主要な懸念シグナル
- [上位 3 個まで。各シグナルが意味することを 1 行で解説]

## 推奨アクション（30日以内）
1. **即時（今週）**：[緊急度高のアクション]
2. **短期（2週間以内）**：[マネージャー主導のアクション]
3. **中期（1ヶ月以内）**：[HR/組織レベルのアクション]

## 注意点
[マネージャーが避けるべき会話のトーン、デリケートな点を 1〜2 行]

注意：
- 「離職する」と断定せず、「離職リスクが高まっている」とまで
- 推奨アクションは具体的かつ実行可能なものに（「面談する」ではなく「火曜午後にカフェで 30 分」）
- センシティブな個人情報（健康・家族）には触れない`;

  const sigList = r.signals
    .map((s) => `- [${s.weight.toUpperCase()}] ${s.label}: ${s.value}`)
    .join("\n");

  const user = `対象社員：${r.employeeName}（${r.department} / ${r.jobTitle}、勤続 ${r.tenureMonths}ヶ月）
離職リスクスコア：${r.riskScore} / 100

【検出シグナル】
${sigList}

${r.recentOneOnOneSummary ? `【直近 1on1 のサマリ】\n${r.recentOneOnOneSummary}` : ""}

${r.recentSurveyScore ? `【直近サーベイ】\nエンゲージメント: ${r.recentSurveyScore.engagement}/5、気分: ${r.recentSurveyScore.mood}/5` : ""}

上記から、マネージャーが行動できる介入プランを生成してください。`;

  return { system, user };
}

// ── 構造化 JSON: 候補者スコアカード自動生成 ────────────────────

export type ScorecardOutput = {
  ratings: {
    /** 0〜5 整数。0=情報不足、1=合致せず、5=極めて高い */
    technical: number;
    communication: number;
    culture_fit: number;
    leadership: number;
  };
  highlights: string[];   // 3〜5 個
  concerns: string[];     // 0〜3 個
  recommendation: "Strong Hire" | "Hire" | "No Hire" | "Strong No Hire";
  rationale: string;      // 1 文
};

export function buildScorecardPrompt(c: CandidateInput): {
  system: string;
  user: string;
} {
  const system = `あなたは Green Carbon の HR ビジネスパートナーです。
候補者情報を読み、構造化された JSON のスコアカードを返します。

## 出力形式（必ず純粋な JSON のみ。マークダウン・コードフェンス・前後の説明文を一切付けない）
{
  "ratings": {
    "technical":     0..5 の整数,
    "communication": 0..5 の整数,
    "culture_fit":   0..5 の整数,
    "leadership":    0..5 の整数
  },
  "highlights":     ["強み1", "強み2", ...],   // 3〜5 個
  "concerns":       ["懸念1", ...],            // 0〜3 個
  "recommendation": "Strong Hire" | "Hire" | "No Hire" | "Strong No Hire",
  "rationale":      "1 文の理由"
}

## ルーブリック
- 0: 情報不足で評価不能
- 1-2: 期待水準を下回る
- 3:   期待水準どおり
- 4:   期待水準を上回る
- 5:   極めて高い

## 禁則
- マークダウン記法（**, ##, - など）を出力に含めない
- 性別・年齢・国籍・出身校をシグナルにしない
- 推測ではなく与えられた情報のみから判断する`;

  const user = `候補者：${c.name}
ポジション：${c.position}

【職務経歴】
${c.resumeText ?? "（提供なし）"}

【面接メモ】
${c.interviewNotes}

${c.scorecards && c.scorecards.length > 0 ? `【他評価者のスコアカード】
${c.scorecards.map((s) => `- ${s.interviewer}（${s.rating}/5）: ${s.comments}`).join("\n")}` : ""}

JSON でスコアカードを返してください。`;

  return { system, user };
}

/** デモ用構造化レスポンス */
export const DEMO_LIVE_QUESTIONS: LiveQuestionOutput = {
  suggestions: [
    {
      competency: "リーダーシップ",
      question: "ジュニアメンバーが詰まっている時、まず何をしますか？具体的なエピソードがあれば聞かせてください。",
      rationale: "未カバーのリーダーシップ軸。仮説ではなく実体験を引き出す",
      type: "behavioral",
    },
    {
      competency: "戦略・抽象化",
      question: "Green Carbon の事業を聞いた今、技術投資としてあなたなら何を最優先しますか？",
      rationale: "事業理解の深さと、自分で考える力をセットで確認",
      type: "scenario",
    },
    {
      competency: "カルチャーフィット",
      question: "前職での意思決定の中で、もう一度やるなら違う選択をするものは何ですか？",
      rationale: "内省力と失敗の言語化能力。未カバー領域",
      type: "behavioral",
    },
    {
      competency: "コミュニケーション",
      question: "技術的な意見の対立があった時、どう合意形成しますか？最近の例で。",
      rationale: "海外メンバーとの協業も多いため、対立解消の引き出しを確認",
      type: "behavioral",
    },
  ],
  time_advice:
    "残り 25 分なので、ここからは深掘り型を中心に。リーダーシップとカルチャーフィットを優先し、技術深掘りは次ラウンドへ。",
};

export const DEMO_SCORECARD: ScorecardOutput = {
  ratings: { technical: 5, communication: 4, culture_fit: 4, leadership: 3 },
  highlights: [
    "カーボンクレジット計算アルゴリズムの実装経験 2 年（前職での運用実績あり）",
    "TypeScript / Next.js / PostgreSQL を業務で 5 年以上",
    "英語で技術ドキュメント執筆・海外チームとの連携経験あり",
    "前職スタートアップでの 0→1 経験",
  ],
  concerns: [
    "マネジメント経験が浅く、テックリード期待のロールではストレッチが必要",
  ],
  recommendation: "Hire",
  rationale: "ドメイン適合度・技術力ともに高水準。マネジメント志向のフィットを面接で確認した上で採用が望ましい。",
};

// ── HR ダッシュボード経営サマリ ────────────────────────────────

export type DashboardInput = {
  period: string;          // 例：「2026年5月」「2026Q1」
  totalHeadcount: number;
  prevHeadcount?: number;
  fullTimeRatio: number;   // 0–1
  foreignRatio: number;
  attritionRate: number;
  topDept?: { name: string; count: number };
  hires30d?: number;
  exits30d?: number;
};

export function buildDashboardNarrativePrompt(d: DashboardInput): {
  system: string;
  user: string;
} {
  const system = `あなたは Green Carbon の CHRO 補佐です。
HR ダッシュボードの数値を見て、CEO・取締役会向けの「3 段落の経営サマリ」を生成します。

## 出力フォーマット（Markdown）
### 現状（What's the situation now?）
[数値の事実を 2〜3 文で。重要な変化に注目]

### 含意（What does it mean?）
[なぜこの状態になっているか、どこに注目すべきか 2〜3 文]

### 経営判断のポイント（What to decide next?）
[CEO が今期判断すべき論点を箇条書き 2〜3 個]

注意：
- 推測で語らない。与えられた数値だけから読み取る
- 「採用を増やすべき」のような断定はせず「採用ペースを見直す材料あり」と慎重に
- ヘッドカウント / 比率 / 離職率の関係性を読む`;

  const user = `期間：${d.period}
総ヘッドカウント：${d.totalHeadcount}名${d.prevHeadcount ? `（前期 ${d.prevHeadcount}名、${d.totalHeadcount - d.prevHeadcount > 0 ? "+" : ""}${d.totalHeadcount - d.prevHeadcount}名）` : ""}
正社員比率：${(d.fullTimeRatio * 100).toFixed(0)}%
外国籍比率：${(d.foreignRatio * 100).toFixed(0)}%
今期離職率：${(d.attritionRate * 100).toFixed(1)}%
${d.topDept ? `最大部門：${d.topDept.name}（${d.topDept.count}名）` : ""}
${d.hires30d !== undefined ? `直近30日 入社：${d.hires30d}名` : ""}
${d.exits30d !== undefined ? `直近30日 退職：${d.exits30d}名` : ""}

経営サマリを生成してください。`;

  return { system, user };
}

// ── 戦略的採用リコメンド ──────────────────────────────────────

export type HiringStrategyInput = {
  /** 例：「2026年度 ASEAN 展開、ML 強化、IPO 準備の 3 軸」 */
  business_priorities: string;
  /** 現組織のスキル分布サマリ（自動生成可能） */
  current_org_summary: string;
  /** 既知のギャップ（StrategicGap[] を文字列化したもの） */
  known_gaps: string;
};

export function buildHiringStrategyPrompt(i: HiringStrategyInput): {
  system: string; user: string;
} {
  const system = `あなたは Green Carbon の CHRO 補佐です。
事業計画と現組織のスキル分布から、向こう 12 ヶ月の採用戦略を立案します。

## 出力フォーマット（Markdown）
## 採用優先度
| 優先度 | ロール | 必要時期 | 採用人数 | 主理由 |
|---|---|---|---|---|
| 🔥 即時 | ... |

## 各ロールの具体提案
### [ロール名]
- **なぜ今必要か**: 1〜2 文
- **必須スキル**: 列挙
- **歓迎条件**: 列挙
- **どこで採るか**: チャネル提案（リファラル / Wantedly / LinkedIn / エージェント / 業務委託転換）

## リスクと代替案
[当該採用が遅延した場合の代替（業務委託・外注・自動化）を 2〜3 個]

## 注意点
- 推測ではなく与えられた情報のみから判断
- 「採るべき」と断言せず「採用優先度が高い」程度の表現
- 性別・年齢・国籍は採用基準に入れない`;

  const user = `## 事業優先順位
${i.business_priorities}

## 現組織の状況
${i.current_org_summary}

## 既知のギャップ
${i.known_gaps}

向こう 12 ヶ月の採用戦略を立案してください。`;

  return { system, user };
}

// ── JD（求人票）生成 ─────────────────────────────────────────

export type JdInput = {
  role_title: string;
  team: string;
  required_skills: string[];
  nice_to_have?: string[];
  /** 報酬レンジ（例：「800-1200万円」） */
  comp_range?: string;
  location?: string;
  /** "個性"。例: "気候テック × グローバルチーム" */
  brand_keywords?: string;
};

export function buildJdPrompt(i: JdInput): { system: string; user: string } {
  const system = `あなたは Green Carbon（気候テックスタートアップ）の採用広報担当です。
候補者を惹きつけ、応募障壁を下げる JD を Markdown で書きます。

## 出力フォーマット
# {ロール名}

## なぜこのロールがあるか（why）
[3〜5 文。事業文脈と当該ロールの位置付け。気候変動への影響を 1 文で]

## 主な責務（what you'll do）
- 動詞始まりの行を 4〜6 個

## 必須スキル（must-have）
- 行ごとに 1 スキル + 1 行の補足

## 歓迎条件（nice-to-have）
- スキル + 1 行の補足

## こんな方に向いています
- 3 文程度のペルソナ記述

## 待遇 / 働き方
- 報酬・場所・在宅可否・グローバル要素 等

## 選考フロー
- カジュアル面談 → 一次面接 → 課題 → 最終面接

## ルール
- マイルドな英単語混在 OK（例: "OKR", "1on1"）
- 性別・年齢を匂わせる表現は禁止
- 命令形ではなく「〜していただきます」「〜できます」
- 過度な煽り（「圧倒的成長」「即戦力で」）は避ける`;

  const user = `ロール: ${i.role_title}
チーム: ${i.team}
必須: ${i.required_skills.join(", ")}
${i.nice_to_have ? `歓迎: ${i.nice_to_have.join(", ")}` : ""}
${i.comp_range ? `報酬: ${i.comp_range}` : ""}
${i.location ? `勤務地: ${i.location}` : ""}
${i.brand_keywords ? `ブランドキーワード: ${i.brand_keywords}` : ""}

JD を生成してください。`;

  return { system, user };
}

// ── 採用広報チャネル投稿テンプレ ─────────────────────────────

export type ChannelPostInput = {
  channel: "wantedly" | "linkedin" | "twitter" | "indeed" | "facebook";
  jd_text: string;            // 上の JD 出力か手書き
  /** 採用 URL（応募導線） */
  apply_url?: string;
};

export function buildChannelPostPrompt(i: ChannelPostInput): { system: string; user: string } {
  const channelGuide: Record<ChannelPostInput["channel"], string> = {
    wantedly:  "Wantedly：「想い」を前面に。会社のビジョンや人を含む 600〜900 字。絵文字 1〜2 個 OK。「やりがい」「文化」を強調。",
    linkedin:  "LinkedIn：プロフェッショナル / 英語混じり OK。300〜500 字。インパクトと数字を含める。",
    twitter:   "X(Twitter)：140 字 + リンク 1 つ。フックの一文 + ハッシュタグ 2-3 個。",
    indeed:    "Indeed：実務的・端的。職務内容と必須要件を簡潔に。500 字以内。",
    facebook:  "Facebook：カジュアル。物語調 OK。500-800 字、写真の有無前提で書く。",
  };

  const system = `あなたは Green Carbon の採用広報担当です。
JD をもとに、各チャネルの作法に合わせた投稿テキストを作ります。

## このチャネルのお作法
${channelGuide[i.channel]}

## 出力ルール
- 純粋なテキストのみ（マークダウン記法は最小限）
- 過度な煽り表現禁止
- 性別・年齢を匂わせない
- 末尾に応募導線（提供された URL があればそれ、なければ会社サイト）
- ハッシュタグは LinkedIn / X のみ`;

  const user = `## JD
${i.jd_text}

${i.apply_url ? `## 応募 URL\n${i.apply_url}` : ""}

このチャネル向けの投稿文を生成してください。`;

  return { system, user };
}

// ── 面接前ブリーフィング ─────────────────────────────────────

export type InterviewBriefingInput = {
  candidate_name: string;
  candidate_role: string;
  position_title: string;
  required_skills: string[];
  resume_summary?: string;
  candidate_notes?: string;
  previous_interview_notes?: string;
  interviewer_name: string;
  interviewer_role: string;
  round_label: string;
  focus_competencies?: string[];
};

export function buildInterviewBriefingPrompt(i: InterviewBriefingInput): {
  system: string; user: string;
} {
  const system = `あなたは Green Carbon の HR ビジネスパートナーです。
面接官のために 5 分で読める "面接前ブリーフィング" を生成します。

## 出力フォーマット（Markdown）
## この候補者をひと言で
[1〜2 文で核を捉える]

## このラウンドで確認すべきこと
- [箇条書き 3〜5 個。前回までで未確認の項目を優先]

## 推奨質問
1. **[質問の核となる 1 行]** — [なぜ聞くか / どんな回答を引き出したいか]
2. ...
（5〜7 個。コンピテンシー軸ごとに最低 1 個。オープンクエスチョン優先）

## 注意点・配慮
- [候補者の経歴上のセンシティブ点や避けたほうが良い質問]
- [対応すべきレッドフラグや確認事項]

## 候補者の強みを引き出すフック
- [候補者が話したいであろうトピック 2〜3 個]

## ルール
- バイアス誘発質問（性別・年齢・既婚・国籍）は禁止
- "Strength-Question" を 1 つ以上含める
- 前回までで触れた話題は重複させない
- 推測は「〜の可能性」と表現`;

  const user = `面接ラウンド: ${i.round_label}
面接官: ${i.interviewer_name}（${i.interviewer_role}）

候補者: ${i.candidate_name}（現職: ${i.candidate_role}）
ポジション: ${i.position_title}
必須スキル: ${i.required_skills.join(", ")}

${i.resume_summary ? `【経歴サマリ】\n${i.resume_summary}\n` : ""}
${i.candidate_notes ? `【書類選考メモ】\n${i.candidate_notes}\n` : ""}
${i.previous_interview_notes ? `【前回までの面接メモ】\n${i.previous_interview_notes}\n` : ""}
${i.focus_competencies?.length ? `【このラウンドで重点評価する軸】\n${i.focus_competencies.join("、")}` : ""}

ブリーフィングを生成してください。`;

  return { system, user };
}

// ── 構造化：議事録からアクション抽出 ──────────────────────────

export type ActionExtractionInput = {
  notes: string;
  participants: string[];
  meeting_date: string;
};

export type ExtractedAction = {
  assignee: string;
  title: string;
  due_date: string | null;
  category: "follow_up" | "decision" | "research" | "deliverable" | "intro" | "other";
  suggested_destination: "oneonone" | "okr" | "hr_helpdesk" | "recruiting" | "general_task";
  confidence: number;
};

export type ActionExtractionOutput = {
  actions: ExtractedAction[];
  summary_oneliner: string;
};

export function buildActionExtractionPrompt(i: ActionExtractionInput): {
  system: string; user: string;
} {
  const system = `あなたは議事録からアクションアイテムを抽出する AI です。
日本語の対話メモから、誰が何をいつまでにやるかを構造化された JSON で返します。

## 出力形式（純粋な JSON のみ。マークダウン・コードフェンス禁止）
{
  "actions": [
    {
      "assignee": "氏名（参加者リストにある名前、不明なら 'Unassigned'）",
      "title": "アクション本文（動詞始まりの 1 行）",
      "due_date": "ISO 日付 'YYYY-MM-DD' または null",
      "category": "follow_up | decision | research | deliverable | intro | other",
      "suggested_destination": "oneonone | okr | hr_helpdesk | recruiting | general_task",
      "confidence": 0..1
    }
  ],
  "summary_oneliner": "議事録の要旨を 1 行で"
}

## 期限の解釈ルール
- 「今日中」 → meeting_date と同日
- 「明日」 → meeting_date + 1 日
- 「来週」 → meeting_date + 7 日
- 「来月」 → meeting_date + 30 日
- 「次回」「ASAP」「いずれ」 → null

## 抽出のコツ
- 「〜します」「〜やります」「〜お願い」「〜確認」が含まれる文を候補に
- 雑談・感想は無視
- 1 文で複数アクションあれば分割

## カテゴリ
- follow_up / decision / research / deliverable / intro / other

## destination
- oneonone: 個人キャリア / メンタリング
- okr: 業務 OKR・プロジェクト
- hr_helpdesk: 制度・労務系
- recruiting: 採用候補者
- general_task: その他`;

  const user = `会議日: ${i.meeting_date}
参加者: ${i.participants.join(", ")}

【議事録】
${i.notes}

JSON でアクションを抽出してください。`;

  return { system, user };
}

// ── AI コーチング会話 ──────────────────────────────────────

export type CoachingInput = {
  employee_name: string;
  role: string;
  recent_context: string;
  focus_topic: string;
  prior_sessions?: string;
};

export function buildCoachingPrompt(i: CoachingInput): {
  system: string; user: string;
} {
  const system = `あなたはエグゼクティブコーチです。GROW モデル（Goal / Reality / Options / Will）を緩やかに踏襲しつつ、
社員自身の内省を促す対話文を生成してください。アドバイスではなく「問い」を中心に。

## 出力フォーマット（Markdown）
## このセッションのテーマ
[1-2 文で焦点を明確に]

## ウォームアップの問い
1. [現状を振り返る問い]
2. [感情を言語化する問い]

## 深掘りの問い
1. [Goal を明確にする問い]
2. [Reality（現状障壁）に踏み込む問い]
3. [Options（選択肢）を広げる問い]

## 行動の問い
1. [今週中に試せる小さな一歩]
2. [来月までに進められること]

## 私からの観察（最小限）
[コーチとして気づいたパターンを 2-3 文。決めつけず仮説として]

## 来月までの宿題
- [小さな実験 1 つ]
- [次回までに準備しておくと良いこと]

## ルール
- 「〜すべき」と命令しない。「〜について、もう少し聞かせて」型の質問を中心に
- アドバイス過多にしない
- 心理的安全性を重視し、本人の選択を尊重
- 「なぜ」より「どんな」「いつ」「もし〜だったら」を多用
- 問いは合計 7-10 個に留める`;

  const user = `対象社員: ${i.employee_name}（${i.role}）

【今月の関心テーマ】
${i.focus_topic}

【直近 1 年のコンテキスト】
${i.recent_context}

${i.prior_sessions ? `【過去のコーチング履歴】\n${i.prior_sessions}\n` : ""}

セッション用の問いを生成してください。`;

  return { system, user };
}

// ── オンボーディング 90 日プラン生成 ─────────────────────────

export type OnboardingPlanInput = {
  new_hire_name: string;
  role_title: string;
  department: string;
  manager_name: string;
  start_date: string;
  background_summary: string;
  required_skills: string[];
  team_context?: string;
};

export function buildOnboardingPlanPrompt(i: OnboardingPlanInput): {
  system: string; user: string;
} {
  const system = `あなたは Green Carbon の HR ビジネスパートナーです。
新入社員のための「30/60/90 日プラン」を Markdown で生成します。

## 出力フォーマット
## ウェルカムメッセージ
[1〜2 文。本人へ直接の温かい一言]

## 30 日（Learning フェーズ）
**ゴール**: [1 文]

### マネージャーが提供すべきこと
- [3〜5 個、具体的に]

### 本人が達成するべきこと
- [3〜5 個]

### 30 日終了時のチェックポイント
- [3〜4 個]

## 60 日（Contributing フェーズ）
**ゴール**: ...
### マネージャー / 本人 / チェックポイント（同形式）

## 90 日（Driving フェーズ）
**ゴール**: ...
### マネージャー / 本人 / チェックポイント

## 推奨 1on1 カデンス
- 最初の 30 日：週 1（30 分）
- 31〜60 日：隔週 1（45 分）
- 61〜90 日：月 1（60 分）

## 想定される困難と対応
- [2〜3 個の躓きとマネージャー対応案]

## ルール
- 役職レベルに応じた負荷感調整
- リモート/拠点考慮（海外メンバーなら言語・時差配慮）
- 「成果物」ベースで具体化
- センシティブな個人情報には踏み込まない`;

  const user = `新入社員: ${i.new_hire_name}
ロール: ${i.role_title}
部門: ${i.department}
マネージャー: ${i.manager_name}
入社予定日: ${i.start_date}

【経歴サマリ】
${i.background_summary}

【ロールに求めるスキル】
${i.required_skills.join(", ")}

${i.team_context ? `【チーム文脈】\n${i.team_context}` : ""}

90 日プランを生成してください。`;

  return { system, user };
}

// ── タレントプール 再アクティベートメッセージ ──────────────

export type TalentReactivateInput = {
  candidate_name: string;
  kind: string;
  current_role?: string;
  current_company?: string;
  past_event: string;
  months_since: number;
  owner_name?: string;
  new_position?: { title: string; reason: string };
  channel: "email" | "linkedin_dm" | "slack";
};

export function buildTalentReactivatePrompt(i: TalentReactivateInput): {
  system: string; user: string;
} {
  const channelGuide: Record<TalentReactivateInput["channel"], string> = {
    email:       "メール：丁寧で短め（200-350 字）。件名 + 本文。書き出しは「お久しぶりです」系。",
    linkedin_dm: "LinkedIn DM：カジュアル目寄り（150-250 字）。短く、「コーヒー一杯どうですか」型。",
    slack:       "Slack DM（アルムナイチャンネル）：絵文字 1-2 個、フランク。100-200 字。",
  };
  const kindContext: Record<string, string> = {
    alumni:         "元社員（退職者）。会社の今を伝えつつ関係性を維持する目的。",
    past_applicant: "過去応募者。「成長を歓迎」のトーンで失礼なく再接触。",
    casual:         "過去のカジュアル面談者。前回の話題を踏まえる。",
    silver_medal:   "最終まで進んだ惜敗候補。「あの時の決断はリスペクト」を示す。",
  };

  const system = `あなたは Green Carbon の HR ビジネスパートナーです。
タレントプールの候補者に「再アクティベート」のメッセージを書きます。

## このチャネルの作法
${channelGuide[i.channel]}

## 種別ごとの注意
${kindContext[i.kind] ?? "適切なトーンで丁寧に。"}

## 出力フォーマット
- メールの場合：件名と本文を分けて出力（"件名:" ラベル付き）
- LinkedIn / Slack の場合：本文のみ

## ルール
- 「強引に応募を促す」のは禁止。あくまで「お元気ですか + 近況共有」が主
- 経過月数を踏まえ、自然な書き出し
- 新ポジションがあれば「もしご興味あれば」程度に控えめに紹介
- バイアス・押しつけ表現を避ける
- 末尾は返信ハードルを下げる文`;

  const user = `候補者: ${i.candidate_name}（${i.current_role ?? "—"} @ ${i.current_company ?? "—"}）
種別: ${i.kind}
最後の接点: ${i.past_event}
経過: ${i.months_since} ヶ月
${i.owner_name ? `送信者: ${i.owner_name}（社内担当）` : ""}
${i.new_position ? `紹介したい新ポジション: ${i.new_position.title}（理由: ${i.new_position.reason}）` : ""}

${i.channel === "email" ? "メール（件名 + 本文）" : "本文のみ"}を生成してください。`;

  return { system, user };
}

// ── 構造化：リアルタイム質問サジェスト ─────────────────────

export type LiveQuestionInput = {
  candidate_name: string;
  position_title: string;
  required_skills: string[];
  conversation_so_far: string;
  covered_competencies: string[];
  minutes_remaining: number;
};

export type LiveQuestionSuggestion = {
  competency: string;
  question: string;
  rationale: string;
  type: "open" | "behavioral" | "technical" | "scenario";
};

export type LiveQuestionOutput = {
  suggestions: LiveQuestionSuggestion[];
  time_advice: string;
};

export function buildLiveQuestionPrompt(i: LiveQuestionInput): {
  system: string; user: string;
} {
  const system = `あなたは Green Carbon の面接コーチです。
進行中の面接で、面接官に「次に何を聞くか」を素早くサジェストします。

## 出力形式（純粋な JSON のみ。マークダウン・コードフェンス・前後の説明文を一切付けない）
{
  "suggestions": [
    {
      "competency": "技術力 / 実行力 / コミュニケーション / リーダーシップ / カルチャーフィット 等",
      "question": "実際に聞く 1 文",
      "rationale": "なぜ今これを聞くべきか 1 文",
      "type": "open" | "behavioral" | "technical" | "scenario"
    }
  ],
  "time_advice": "残り時間での深掘り推奨ポイント 1〜2 文"
}

## ルール
- 3〜5 個の質問
- covered の軸は避ける
- オープンクエスチョン優先
- 残時間 < 15 分 → 1〜2 個に絞り深掘り型に
- 残時間 ≥ 30 分 → 行動質問 + 仮説質問のミックス
- バイアス誘発質問は絶対禁止`;

  const user = `候補者: ${i.candidate_name}
ポジション: ${i.position_title}
必須スキル: ${i.required_skills.join(", ")}
残り時間: ${i.minutes_remaining} 分

【これまでの会話の要点】
${i.conversation_so_far || "（まだ会話がない）"}

【既にカバーした評価軸】
${i.covered_competencies.length > 0 ? i.covered_competencies.join("、") : "（まだ何もカバーしていない）"}

JSON で次の質問サジェストを返してください。`;

  return { system, user };
}

// ── デモモード時のフォールバック応答 ─────────────────────────

export const DEMO_RESPONSES = {
  candidate: `## サマリ
気候テック領域での強い実装経験を持つシニアエンジニア。前職でカーボンクレジット計算ロジックを 2 年運用しており、当社のドメインに即戦力。

## 強み
- カーボンクレジット計算アルゴリズムの実装経験（炭素隔離量推定モデル）
- TypeScript / Next.js / PostgreSQL の業務利用 5 年以上
- 英語での技術ドキュメント執筆経験あり（海外チームとの連携可）
- スタートアップ環境での 0→1 経験（前職は 30 名規模で参画）

## 懸念点
- マネジメント経験が浅い（IC 寄り）。本ポジションは将来テックリード期待のため、ストレッチが必要

## 推奨アクション
- VP of Engineering との 1on1 面接（マネジメント志向のすり合わせ）
- リファレンスチェック 2 件（前職マネージャー + 同僚）

## 総合評価
**Hire** — ドメイン適合度・技術力ともに高水準。マネジメント志向のフィットを確認した上で内定が望ましい。`,

  oneonone: `## ハイライト
来期 OKR の方向性とキャリアパスについての対話が中心。本人は技術深耕を希望し、マネジメント志向は現状なし。

## ディスカッション内容
- 来期 OKR：CO2 計算エンジンのリファクタリングを KR に据えたい意向
- キャリア：今後 1〜2 年は IC として技術深耕を続けたい
- チーム：新人 2 名のメンタリングは続けたいが、PM 業務は引き受けたくない
- 学習：Rust の勉強会を社内で開きたい意欲あり

## 次回までのアクション
| 担当 | アクション | 期限 |
|---|---|---|
| メンバー | OKR ドラフトを作成 | 来週金曜 |
| マネージャー | テックリードロールの定義を明文化 | 次回まで |
| HR | Rust 勉強会の社内告知サポート | 2週間以内 |

## 気になる兆候
特になし。エンゲージメントは安定。

## 次回の推奨議題
- OKR ドラフトのレビュー
- 副業／社外活動の希望確認`,

  dashboard: `### 現状
総ヘッドカウントは 297 名（前期 +12 名、+4.2%）。正社員比率 87% を維持しつつ業務委託 8% を上手く併用。外国籍比率 28% は 300 人規模のスタートアップとして高水準で、グローバル展開の体制が整いつつある。

### 含意
今期の採用ペース（直近30日 +9 名）は計画線。離職率 9.5% は業界平均（10–12%）を下回るが、最大部門「技術」は人員集中度が高くキーパーソン依存リスクが残る。多様性指標の高さは強みだが、海外メンバーのオンボーディング体制（ビザ・税・言語）が追従できているか要確認。

### 経営判断のポイント
- 技術部門のサクセションプラン整備：単一障害点の特定と知識継承計画
- 海外メンバー向け制度の点検：在留資格更新・送金フロー・現地ホリデー対応
- 業務委託 8% を恒常的水準とするか、正社員転換を進めるかの方針決定`,

  coaching: `## このセッションのテーマ
来期に向けた「マネジメント志向 vs 技術深耕」の自己整理。最近の 1on1 で揺らぎを感じているのを言語化していきましょう。

## ウォームアップの問い
1. ここ 1 ヶ月で「自分らしくいられた」と感じた瞬間はありましたか？それはどんな状況でしたか？
2. もし今、コーヒー片手に過去 30 日の自分を振り返るとしたら、どんな感情の言葉が浮かびますか？

## 深掘りの問い
1. **Goal**: 1 年後の理想の自分を描いたとして、それは「技術深耕」「マネジメント」どちらの方向に近いですか？両方あり得るとしたら、どんなブレンド比率？
2. **Reality**: 「マネジメントは自分には向いていない」と思う場面が最近ありましたか？それはあなた自身の判断ですか、それとも誰かの言葉が引き金ですか？
3. **Options**: テックリードのまま、メンバーの成長に貢献する道（IC track）にはどんな具体的な活動が含まれますか？

## 行動の問い
1. 今週、メンバー 1 人を選んで 30 分の「育成 1on1」を試してみるとしたら、誰とどんな話をしますか？
2. 来月までに、技術記事 1 本をペアで書いてみるとしたら、誰と組みたいですか？

## 私からの観察（最小限）
ここ 3 回のセッションで「自分の選択肢を狭めて語る」傾向があるように感じました。「マネジメント or 技術」の二択ではなく、グラデーションで考えてみる余白があるかもしれません（仮説です）。

## 来月までの宿題
- 「育成 1on1」を 1 件試してみる
- 「自分が一番輝く瞬間」を 5 つメモして、来月持ってきてください`,

  onboardingPlan: `## ウェルカムメッセージ
田中さん、Green Carbon にようこそ！🌱
あなたの 9 年の経験が、私たちのカーボン計算プロダクトを次のレベルに進めると確信しています。最初の 90 日、一緒に楽しみながら走りましょう。

## 30 日（Learning フェーズ）
**ゴール**: 事業ドメイン・主要メンバー・コードベースを理解し、自走の足場を作る

### マネージャーが提供すべきこと
- Day 1：開発環境セットアップ + 主要ドキュメント tour（Notion + GitHub）
- Day 1-3：CTO 面談 + チーム全員との 1on1（30 分 × 6 名）
- Week 1：カーボン計算アルゴリズムのオンボーディング資料を一緒に読む（2h）
- Week 2：既存コードベースの軽量タスク 2 件をペアプロでアサイン
- 毎週金曜：30 分の温度感チェック 1on1

### 本人が達成するべきこと
- 現行プロダクトの主要画面を実際に動かして触ってみる
- カーボン計算ロジック（推定モデル + 検証ロジック）の概要をまとめた 1 枚資料を作成
- 担当 PM・デザイナー・SRE と各 30 分の自己紹介
- 入社 2 週間以内に 1 個目の Pull Request をマージ

### 30 日終了時のチェックポイント
- 開発環境で全テストが通る
- カーボン計算の主要 3 アルゴリズムを口頭で説明できる
- 主要メンバー全員と 1 度は会話済み
- 軽量バグ修正 2 件を本番に出している

## 60 日（Contributing フェーズ）
**ゴール**: 機能開発の主担当として動き、チームの問題解決に貢献する

### マネージャーが提供すべきこと
- 中規模機能（1 週間〜2 週間スコープ）のオーナーシップを渡す
- 設計レビューに必ず参加させ、フィードバックを丁寧に与える
- ICVCM 認証フロー全体の説明会（経営層含む）

### 本人が達成するべきこと
- 1 機能をリード（要件 → 設計 → 実装 → リリース → モニタリング）
- 技術ブログ 1 本（社内 Wiki）を書く
- 後輩 1 名のコードレビューを習慣化

### 60 日終了時のチェックポイント
- 担当機能が本番で稼働している
- 影響範囲を見据えた設計判断ができている
- 「○○の質問は田中さん」とチームが認識し始めている

## 90 日（Driving フェーズ）
**ゴール**: テックリード相当の判断ができ、チームをドライブする

### マネージャーが提供すべきこと
- 来期 OKR 設計への参画
- 採用面接デビュー（候補者 1 名）
- テックリード公式アサインを目指した 1on1 シリーズ

### 本人が達成するべきこと
- 来期 OKR の KR を 2 個オーナー
- 技術的負債の解消ロードマップ案を作成
- 後輩 1 名のメンタリングを正式に引き受ける

### 90 日終了時のチェックポイント
- チーム横断の意思決定に積極的に関与
- 新機能の設計レビューをリード
- 採用候補者の評価が他面接官と一致している

## 推奨 1on1 カデンス
- 最初の 30 日：週 1（30 分）
- 31〜60 日：隔週 1（45 分）
- 61〜90 日：月 1（60 分）+ 必要時の追加

## 想定される困難と対応
- **困難 1**：気候ドメインのキャッチアップ → 環境部門メンバーと月 1 ランチを設定
- **困難 2**：海外メンバーとの英語ミーティング → 通訳サポートを最初の 30 日は確実につける
- **困難 3**：マネジメント志向と現職の IC 寄りのギャップ → 60 日時点でキャリアパス会話を設定`,

  talentReactivate: `件名: お久しぶりです — Green Carbon の野村です

野村と申します。お久しぶりです。

前回お話しいただいた頃から半年経ちまして、その後もずっと「またご一緒したいな」と思っておりました。

おかげさまで会社は ASEAN 拠点が 3 つになり、ML チームの立ち上げも進んでおります。先日お話ししたカーボン計算アルゴリズムの精度向上、まさにそのフェーズに入ったところです。

もしお時間あれば、近況だけでも 15 分ほどお話しできたら嬉しいです。
「気候 × ML」の世界観が、半年前からどう進化したかをお伝えしたく。

ご都合いかがでしょうか？お気軽にどうぞ 🙏`,

  interviewBriefing: `## この候補者をひと言で
カーボン計算ドメインに 2 年の実装経験があり、TypeScript / Next.js / PostgreSQL の業務利用 5 年以上のシニアエンジニア。前職スタートアップで 0→1 経験あり、技術力・実装速度ともに上位。

## このラウンドで確認すべきこと
- マネジメント志向の有無（書類段階では IC 寄りに見える、本ロールはテックリード期待）
- 当社固有の「気候領域への意義づけ」がどの程度本気か（環境スタートアップへの転職は初）
- 現職の引き継ぎスケジュールと実 join 可能日（書類記載の希望と現実乖離がないか）
- リモート前提の働き方への適合（前職は full-onsite）

## 推奨質問
1. **「これまでで一番技術的に挑戦した実装は？」** — 技術力と粘り強さの両軸を引き出す Strength-Question
2. **「3 名程度のジュニアをメンタリングする状況だとして、どう関わりますか？」** — マネジメント志向の確認（仮説質問）
3. **「気候変動という領域にコードで関わることに、どんな意味を見出していますか？」** — Why-this-company の確認
4. **「最近読んだ技術書・論文と、それが自分の実装をどう変えたか」** — 学習指向の確認
5. **「前職での意思決定の中で、後悔しているものは？」** — 内省力と失敗の言語化
6. **「リモート中心の働き方で、自分なりに気をつけていることは？」** — セルフマネジメント

## 注意点・配慮
- 過去 1 年のキャリアパスの跳ね方（年収レンジ +30%）に触れる場合は、市場価値の話として中立的に
- 海外メンバーとのやりとり経験ゼロ。「英語で大丈夫か」を直接聞くのは避け、「英語ドキュメントとの接し方」で間接的に確認

## 候補者の強みを引き出すフック
- カーボンクレジット計算アルゴリズムの実装詳細（書類で熱量を感じる）
- スタートアップ 0→1 期の苦労話
- 趣味の Rust 勉強会主催（社内勉強会への巻き込み可能性）`,

  hiringStrategy: `## 採用優先度
| 優先度 | ロール | 必要時期 | 採用人数 | 主理由 |
|---|---|---|---|---|
| 🔥 即時 | ML エンジニア（シニア）| 2026Q3 | 2 名 | Carbon 計算精度の事業核心。外注依存はコスト・スピード両面で限界 |
| 🔥 即時 | リージョナル事業開発（ASEAN）| 2026Q4 | 2 名 | COO 1 人依存の解消。インドネシア・ベトナム拡大ボトルネック |
| ⚡ 高 | 気候政策スペシャリスト | 2026Q3 | 1 名 | ICVCM/IRA 等の制度変更を読み解く専任不在は事業リスク |
| ⚡ 高 | プロダクトマネージャー（B2B SaaS）| 2026Q4 | 1 名 | CPO 1 人で全プロダクト見ている。判断速度が組織サイズに追いつかず |
| 🟡 中 | 経理マネージャー（IPO 経験）| 2027Q1 | 1 名 | IPO 準備フェーズに先んじた連結決算体制構築 |

## 各ロールの具体提案

### ML エンジニア（シニア）
- **なぜ今必要か**: Carbon 計算アルゴリズムの精度向上は競合優位の核心。現状外注で対応中だが反復速度に限界
- **必須スキル**: Python、PyTorch/TensorFlow、MLOps、時系列データ、PostgreSQL
- **歓迎条件**: カーボンクレジット計算経験、衛星データ処理経験、論文執筆経験
- **どこで採るか**: LinkedIn（外資 ML 出身 / インド・シンガポール）+ 大学院推薦（東工大・東大）+ 業務委託からの転換

### リージョナル事業開発（ASEAN）
- **なぜ今必要か**: ASEAN 拠点 3 つ（IDN/VNM/PHL）で COO 1 名依存。属人化リスクと拡大ペースのボトルネック
- **必須スキル**: BD/Sales、ASEAN市場知識、英語ビジネスレベル、PJM
- **歓迎条件**: 現地法人立ち上げ経験、エネルギー業界経験、現地語
- **どこで採るか**: 現地ヘッドハンター（シンガポール拠点）+ LinkedIn ASEAN セグメント + 既存メンバー紹介

## リスクと代替案
- ML 採用が遅れた場合：外部コンサル契約 6 ヶ月延長（月 250 万円 × 6 = 1500 万円）
- ASEAN BD 採用が遅れた場合：シンガポール代理店経由の販売委託（マージン 20% で売上機会を一部譲渡）
- 全採用遅延：直近半年の事業計画を 80% スケール調整

## 注意点
すべて「優先度が高い」段階の判断材料です。最終的なヘッドカウント決定は経営会議で。
本提案は 2026 年 5 月時点の事業情報を前提としており、四半期ごとに見直しを推奨します。`,

  jd: `# シニア ML エンジニア（Carbon 計算チーム）

## なぜこのロールがあるか
Green Carbon は東南アジア最大級の自然資本（マングローブ・森林）からカーボンクレジットを生み出すスタートアップです。
クレジットの「質」を担保する核心は、衛星データと現地計測を組み合わせた精緻な CO2 隔離量推定アルゴリズム。
このロールは、その推定モデルを次の世代へ進化させる責任者です。あなたの実装が、地球規模の炭素削減量を正しく可視化します。

## 主な責務
- 衛星画像 + 現地計測データから森林炭素量を推定する ML モデルの設計・実装
- 既存推定パイプライン（Python + PyTorch）の精度改善と推論コストの最適化
- 計算結果の第三者認証（Verra / Gold Standard）対応に向けた検証ロジック
- 大学・研究機関との共同研究プロジェクトの技術リード
- ML エンジニアチーム（現状は業務委託 2 名）の正社員化に向けたメンバー採用への協力

## 必須スキル
- Python での実装経験 5 年以上（うち ML プロダクト 3 年以上）
- PyTorch または TensorFlow の業務利用
- MLOps の経験（モデル学習〜デプロイ〜モニタリングの一貫運用）
- 時系列データの取り扱い（季節性・欠損補完など）
- PostgreSQL でのデータ設計・クエリチューニング

## 歓迎条件
- カーボンクレジット計算 / 環境科学 / リモートセンシング の知識
- 衛星画像処理（Sentinel-2 / Landsat）の経験
- 修士以上または論文執筆の経験
- 英語での技術コミュニケーション

## こんな方に向いています
気候変動に「コードで」関わりたい方。アルゴリズムの精度が直接、地球の炭素削減量に反映されることに意義を見出せる方。
スタートアップらしい意思決定の速さを愛しつつ、自分のドメイン理解も深めていきたい方。

## 待遇 / 働き方
- 想定年収：900-1,400 万円（経験により応相談）
- 勤務地：東京（恵比寿）またはフルリモート（国内）
- 業務時間：フレックス、コアタイムなし
- 海外メンバーとの英語ミーティングあり（週 2-3 回 / 通訳サポート可）
- ストックオプション付与

## 選考フロー
1. カジュアル面談（30 分・人事）
2. 一次面接（60 分・現場テックリード）
3. 技術課題（持ち帰り 1 週間 + プレゼン 60 分）
4. 最終面接（60 分・CEO + CPO）

応募はこちら → https://green-carbon.inc/careers/ml-engineer
ご質問があればカジュアル面談からどうぞ。`,

  channelPost: `Green Carbon の採用情報を更新しました 🌱

東南アジアの森林・マングローブから生まれるカーボンクレジット。その「質」の核心は、衛星データと現地計測を組み合わせた CO2 隔離量推定モデルです。

このロールは、推定アルゴリズムを次世代へ進化させる責任者。あなたのコードが、地球規模の炭素削減量を正しく可視化します。

🔍 必須スキル
- Python で ML プロダクト 3 年以上
- PyTorch/TensorFlow + MLOps の経験
- 時系列データの扱い

🎁 待遇
- 想定年収 900-1,400 万円
- 完全フレックス・国内リモート可
- ストックオプション

気候テック × グローバル × 技術深耕、興味があればまずはカジュアルにお話ししましょう。
詳細・応募 → https://green-carbon.inc/careers/ml-engineer

#気候テック #ClimateT ech #MLエンジニア #採用`,

  retention: `## リスクの全体像
直近 3 ヶ月で 1on1 の頻度が低下し、サーベイのエンゲージメントスコアも 4.2 → 3.1 に落ち込んでいる。Slack の発言量も半減しており、組織への関与度が下がっている兆候。本人の能力・成果は依然高水準であり、引き止め可能なゾーン。

## 主要な懸念シグナル
- [HIGH] エンゲージメントスコア急降下: 業務・組織への満足度が大きく揺らいでいる可能性
- [HIGH] 1on1 頻度低下: マネージャーとの対話不足。声を上げる場が失われている
- [MED] Slack アクティビティ低下: チームへの心理的距離が広がりつつある

## 推奨アクション（30日以内）
1. **即時（今週）**：マネージャーが 60 分の delibrate 1on1 をブッキング。アジェンダを「キャリアの方向性と働き方」に絞る
2. **短期（2週間以内）**：希望すれば部署横断のプロジェクトへの参画機会を提示。視点が広がる仕事に当てる
3. **中期（1ヶ月以内）**：HR から CHRO 1on1 を打診（組織側の話を聞きたい姿勢を明示）

## 注意点
「離職を考えてる？」と直接聞くと身構える可能性が高い。「最近の働き方で違和感があれば教えてほしい」と入口を広く取る。`,
} as const;
