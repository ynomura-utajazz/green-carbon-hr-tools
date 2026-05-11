/**
 * 社内 Wiki のデモデータ。
 * Markdown コンテンツ + カテゴリ + タグ + 関連ページ。
 */

export type WikiCategory =
  | "company"        // 会社情報
  | "hr_policy"     // HR制度
  | "benefits"       // 福利厚生
  | "tech"           // テクノロジー
  | "ops"            // オペレーション
  | "culture"        // カルチャー
  | "global"         // グローバル
  | "compliance";    // コンプライアンス

export const CATEGORY_LABEL: Record<WikiCategory, string> = {
  company: "会社情報",
  hr_policy: "HR制度",
  benefits: "福利厚生",
  tech: "テクノロジー",
  ops: "オペレーション",
  culture: "カルチャー",
  global: "グローバル",
  compliance: "コンプライアンス",
};

export const CATEGORY_TONE: Record<WikiCategory, string> = {
  company: "border-gc-200 bg-gc-50 text-gc-800",
  hr_policy: "border-blue-200 bg-blue-50 text-blue-800",
  benefits: "border-purple-200 bg-purple-50 text-purple-800",
  tech: "border-cyan-200 bg-cyan-50 text-cyan-800",
  ops: "border-amber-200 bg-amber-50 text-amber-800",
  culture: "border-pink-200 bg-pink-50 text-pink-800",
  global: "border-indigo-200 bg-indigo-50 text-indigo-800",
  compliance: "border-red-200 bg-red-50 text-red-800",
};

export type WikiPage = {
  id: string;
  slug: string;
  title: string;
  category: WikiCategory;
  tags: string[];
  content: string;             // markdown
  author_id: string;
  last_updated_at: string;
  views: number;
  pinned: boolean;
  related_slugs?: string[];
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const DEMO_WIKI_PAGES: WikiPage[] = [
  // ─── 会社情報
  {
    id: "w-1", slug: "mission", title: "ミッション・ビジョン・バリュー",
    category: "company", tags: ["mission", "values", "OKR"],
    pinned: true, views: 1820, author_id: "e1", last_updated_at: day(-30),
    related_slugs: ["values-detail", "company-history"],
    content: `# Green Carbon のミッション

> **「気候変動の解決を通じて、すべての生命が共生できる地球をつくる」**

私たちは ASEAN を中心に、自然由来のカーボンクレジット創出を通じて気候変動の緩和に取り組みます。

## ビジョン
2030 年までに ASEAN におけるカーボンクレジット創出量で No.1 を獲得し、現地コミュニティとの共生モデルを世界に広げます。

## 6 つのバリュー
- 🔥 **Challenge** — 現状に満足せず、より高い目標に挑戦する
- 🤝 **Co-Creation** — 部門・国境を越えて協働し、より良い解を生み出す
- 🛡️ **Integrity** — 誠実であり、約束したことをやり抜く
- ⚡ **Impact** — 成果にこだわり、世界にインパクトを与える
- 🌱 **Sustainability** — 長期視点で持続可能な選択をする
- 🌏 **Global** — 多様な視点を尊重し、グローバル基準で考え行動する

## バリューの実践
私たちのバリューは [バリューアワード](/value-award) で日々称え合います。OKR の設計にも反映されています。

## 関連
- [全社 OKR (現サイクル)](/mbo-okr)
- [カルチャーブック](/wiki/culture-book)`,
  },
  {
    id: "w-2", slug: "company-history", title: "Green Carbon の歩み",
    category: "company", tags: ["history"],
    pinned: false, views: 412, author_id: "e1", last_updated_at: day(-90),
    content: `# Green Carbon の歩み

## 設立まで（〜2020）
- 創業者 野村 裕太が、東南アジアでの植林プロジェクトに参画した経験から起業を決意
- 2020 年 1 月、東京で会社設立

## 初期フェーズ（2020〜2022）
- インドネシアでの最初のクレジット創出プロジェクト立ち上げ
- 累計 50 万 t-CO2 のクレジット創出

## スケール期（2023〜）
- ASEAN 5 カ国に展開
- 累計 200 万 t-CO2 を突破
- 300 名規模に組織拡大

## 直近の主要マイルストーン
- 2024 年: シリーズ B 調達完了
- 2025 年: 大手商社との戦略パートナーシップ締結
- 2026 年: 自社 Carbon Platform v2 リリース予定`,
  },

  // ─── HR制度
  {
    id: "w-3", slug: "leave-policy", title: "休暇制度の詳細",
    category: "hr_policy", tags: ["休暇", "有給", "夏季"],
    pinned: true, views: 2103, author_id: "e2", last_updated_at: day(-60),
    related_slugs: ["remote-policy", "career-ladder"],
    content: `# 休暇制度

## 法定休暇
- **年次有給休暇**: 入社後 6 ヶ月で 10 日付与、その後 1 年ごとに増加（最大 20 日）
- **時間単位の取得可**: 30 分単位で取得可能

## 会社独自休暇
- **夏季休暇**: 5 日（7-9 月の間に取得）
- **年末年始休暇**: 12/29 〜 1/3 が公休
- **誕生日休暇**: 誕生日月内に 1 日取得可
- **アニバーサリー休暇**: 入社月に 1 日取得可（毎年）

## 特別休暇
- **慶弔休暇**: 結婚 5 日 / 出産 5 日 / 忌引 1〜7 日
- **生理休暇**: 必要時に取得
- **看護休暇**: 子の看護で年 5 日

## ライフイベント関連
- **育児休業**: 法定 + 会社独自で最大 2 年
- **介護休業**: 通算 93 日

## 申請方法
[勤怠・休暇管理](/attendance) ツールから申請してください。
事前申請を原則としますが、緊急時は事後申請も可能です。

## よくある質問
- Q: 有給は時効がありますか？
  A: 付与から 2 年で時効消滅します。

- Q: 退職時の有給消化は？
  A: 退職日までに消化可能です。引継ぎ計画と合わせて HR にご相談ください。`,
  },
  {
    id: "w-4", slug: "remote-policy", title: "リモートワーク制度",
    category: "hr_policy", tags: ["リモート", "ワークライフ"],
    pinned: true, views: 1856, author_id: "e2", last_updated_at: day(-15),
    content: `# リモートワーク制度（2026年5月改定版）

## 基本方針
ハイブリッドワーク制度を採用。週 3 日のオフィス出社を推奨しつつ、業務に支障のない範囲で柔軟な勤務形態を認めます。

## 制度詳細
- **コアタイム**: 11:00 〜 16:00 JST
- **フレックス勤務**: 全社員適用
- **海外からのリモート**: 四半期に最大 2 週間まで（事前申告必須）

## 海外リモート時の注意
- 滞在国・期間を事前に HR と上長に申告
- 税務・在留資格上のリスクを HR が確認
- 詳細は [海外赴任管理](/expat) ツールを参照

## オフィス利用
- 東京本社: フリーアドレス
- ASEAN ハブ拠点: 訪問時に座席予約

## 改定履歴
- 2026/05: 海外リモート可能期間を年間 4 週間 → 四半期 2 週間に変更
- 2025/04: 初版制定`,
  },
  {
    id: "w-5", slug: "career-ladder", title: "キャリアラダー",
    category: "hr_policy", tags: ["キャリア", "昇進", "評価"],
    pinned: true, views: 1432, author_id: "e2", last_updated_at: day(-7),
    content: `# キャリアラダー

職種別に標準的な役割と期待を明確化。昇進の透明性向上を目的としています。

## エンジニアリング
- **S2 ジュニア**: 既知の問題を指示のもとで解決
- **S3 ミッド**: チームの中核。独立して機能を実装
- **S4 シニア**: 複雑な技術課題をリード。設計を主導
- **S5 スタッフ**: 部門横断で技術的影響力を発揮
- **M3 マネージャー**: チームのアウトプット責任
- **M4 ディレクター**: 部門のロードマップ責任

## デザイン / プロダクト / 事業開発
別ページで詳述（準備中）。

## 昇進プロセス
- 半期ごとのキャリブレーション
- マネージャー推薦 → グレードレビュー会議で決定
- 詳細は [MBO×OKR](/mbo-okr) を参照`,
  },

  // ─── 福利厚生
  {
    id: "w-6", slug: "benefits-overview", title: "福利厚生 一覧",
    category: "benefits", tags: ["benefit"],
    pinned: false, views: 985, author_id: "e2", last_updated_at: day(-45),
    content: `# 福利厚生

## 健康・医療
- 健康保険・厚生年金（標準）
- 人間ドック補助（年 1 回 / 上限 5 万円）
- メンタルヘルスサポート（外部 EAP）

## 学習・成長
- 書籍購入補助（月 1 万円）
- 外部カンファレンス・研修補助（年 30 万円）
- オンライン学習プラットフォーム（Cambly / Italki / Udemy 法人ライセンス）

## 働き方
- リモートワーク手当（月 1 万円）
- フレックス勤務
- アニバーサリー休暇

## 経済的サポート
- 確定拠出年金（DC）
- ストックオプション（一定条件で全社員に付与）
- 育児・介護支援`,
  },

  // ─── テクノロジー
  {
    id: "w-7", slug: "engineering-handbook", title: "エンジニアリング ハンドブック",
    category: "tech", tags: ["engineering", "ガイドライン"],
    pinned: true, views: 1278, author_id: "e8", last_updated_at: day(-21),
    content: `# エンジニアリング ハンドブック

## 開発フロー
1. **Issue 起票** — GitHub Issues に詳細を記載
2. **設計レビュー** — 中規模以上は Design Doc を作成
3. **PR 提出** — 1 PR は 500 行以下を目安
4. **コードレビュー** — 1 名以上の承認 + CI パス
5. **マージ** — Squash merge をデフォルト

## 技術スタック
- **フロント**: Next.js / React / TypeScript / Tailwind
- **バックエンド**: Node.js / Go / PostgreSQL / Redis
- **インフラ**: AWS / Vercel / Cloudflare

## オンコール
- 週次ローテーション
- インシデント時は 15 分以内の一次対応
- 詳細は内部ランブック（社内 Wiki: oncall-runbook）

## 関連
- [GitHub Org のアクセス権申請](/wiki/access-request)`,
  },

  // ─── オペレーション
  {
    id: "w-8", slug: "expense-policy", title: "経費精算ガイド",
    category: "ops", tags: ["経費", "freee"],
    pinned: false, views: 723, author_id: "e26", last_updated_at: day(-90),
    content: `# 経費精算ガイド

## 提出期限
- 月末締め、翌月 5 日までに freee で提出
- 領収書は写真添付必須

## 主な項目
- 交通費: 出張申請承認後の実費
- 接待費: 上限金額あり、目的・参加者を記載
- 書籍・学習費: 月 1 万円まで自動承認
- リモートワーク手当: 月 1 万円固定

## NG パターン
- 私的利用との混在
- 領収書なしの申請
- 期限超過（特別な理由を要記載）

## 関連ツール
- [freee 経費精算](https://accounts.secure.freee.co.jp/)
- 経理マネージャー: 串田 和也 (CFO)`,
  },

  // ─── カルチャー
  {
    id: "w-9", slug: "culture-book", title: "Green Carbon カルチャーブック",
    category: "culture", tags: ["culture", "values"],
    pinned: true, views: 1654, author_id: "e1", last_updated_at: day(-180),
    content: `# Green Carbon カルチャーブック

## 私たちが大切にすること

### 1. **誠実であること**
短期的な利益のために妥協しない。誠実さが信頼を生み、信頼が事業を支える。

### 2. **フィードバック文化**
率直なフィードバックは贈り物。建設的に、具体的に、相手の成長のために。

### 3. **OKR で大胆に挑戦**
70% 達成で「ストレッチ目標」と評価する文化。失敗を学びに変える。

### 4. **ダイバーシティ & インクルージョン**
12 カ国出身のメンバーが活躍。多様な視点が革新を生む。

### 5. **長期視点**
四半期の数字より、3 年後にどう見えるかを考える。

## 私たちが避けること
- 政治的な振る舞い
- 縦割りの仕事
- 結果より過程を重視する評価

## チーム儀式
- 週次の Town Hall（全社）
- 月次の Value Award 表彰
- 四半期 OKR レビュー
- 年次の オフサイト`,
  },

  // ─── グローバル
  {
    id: "w-10", slug: "asean-overview", title: "ASEAN 拠点 概要",
    category: "global", tags: ["ASEAN", "拠点"],
    pinned: false, views: 567, author_id: "e19", last_updated_at: day(-30),
    content: `# ASEAN 拠点 概要

## 拠点一覧

### 🇸🇬 シンガポール（地域統括）
- 統括: 石川 拓哉
- メンバー: 1 名
- 機能: ASEAN 戦略・パートナーシップ

### 🇮🇩 インドネシア（ジャカルタ）
- リード: Sara Aimen
- メンバー: 2 名
- 機能: 政府交渉・現地パートナー

### 🇵🇭 フィリピン（マニラ）
- リード: Lopez Maria
- メンバー: 1 名
- 機能: ASEAN リード

### 🇲🇾 マレーシア（クアラルンプール）
- リード: Saw Jasmine
- メンバー: 1 名
- 機能: コンサルタント

### 🇻🇳 ベトナム（ホーチミン）
- メンバー: 1 名（エンジニア）
- 機能: 開発拠点

### 🇮🇳 インド（ベンガルール）
- メンバー: 1 名（インターン）

## コミュニケーション
- 全社 Slack: #global-team
- 週次同期: 火曜 10:00 JST
- ASEAN サミット: 半期ごと（オフライン開催）`,
  },

  // ─── コンプライアンス
  {
    id: "w-11", slug: "compliance-overview", title: "コンプライアンス基本",
    category: "compliance", tags: ["コンプラ", "通報"],
    pinned: false, views: 845, author_id: "e26", last_updated_at: day(-100),
    content: `# コンプライアンス基本

## 行動規範
全メンバーは以下の行動規範を遵守します。

1. **法令遵守**
2. **誠実な業務遂行**
3. **会社資産の適切な利用**
4. **機密情報の保護**
5. **ハラスメントの禁止**
6. **公正な取引**

## 通報窓口
- 社内: [目安箱](/voice-box)（匿名通報可能）
- 社外: 顧問弁護士事務所（株式会社グリーンロウ）

## 違反時の処分
社則に則り、譴責から懲戒解雇まで段階的に対応します。

## 関連
- [ハラスメント相談窓口](/voice-box)
- [社内ヘルプデスク](/helpdesk)`,
  },
  {
    id: "w-12", slug: "values-detail", title: "バリューの実践例",
    category: "culture", tags: ["values"],
    pinned: false, views: 432, author_id: "e1", last_updated_at: day(-50),
    content: `# バリューの実践例

各バリューの「Do / Don't」を具体例で示します。

## 🔥 Challenge
- ✅ Do: 過去のやり方を疑い、新しい方法を提案する
- ❌ Don't: 「前任者のやり方なので」と思考停止する

## 🤝 Co-Creation
- ✅ Do: 部門を超えて巻き込み、より良い解を出す
- ❌ Don't: 自部門の利益だけで判断する

## 🛡️ Integrity
- ✅ Do: 失敗をすぐ報告し、原因を共有する
- ❌ Don't: 失敗を隠蔽する

## ⚡ Impact
- ✅ Do: 数字とインパクトで議論する
- ❌ Don't: 「努力したから」を理由にする

## 🌱 Sustainability
- ✅ Do: 3 年後の姿から逆算して行動する
- ❌ Don't: 短期成果に流される

## 🌏 Global
- ✅ Do: 多様な視点を意図的に取り入れる
- ❌ Don't: 日本の常識を世界基準と思い込む`,
  },
];

// ─── ヘルパ ─────────────────────────
export function pagesByCategory(): Map<WikiCategory, WikiPage[]> {
  const map = new Map<WikiCategory, WikiPage[]>();
  for (const c of Object.keys(CATEGORY_LABEL) as WikiCategory[]) map.set(c, []);
  for (const p of DEMO_WIKI_PAGES) map.get(p.category)!.push(p);
  return map;
}

export function pinnedPages(): WikiPage[] {
  return DEMO_WIKI_PAGES.filter((p) => p.pinned);
}

export function recentPages(limit = 5): WikiPage[] {
  return [...DEMO_WIKI_PAGES]
    .sort((a, b) => b.last_updated_at.localeCompare(a.last_updated_at))
    .slice(0, limit);
}

export function popularPages(limit = 5): WikiPage[] {
  return [...DEMO_WIKI_PAGES].sort((a, b) => b.views - a.views).slice(0, limit);
}

export function pageBySlug(slug: string): WikiPage | undefined {
  return DEMO_WIKI_PAGES.find((p) => p.slug === slug);
}

export function searchPages(query: string): WikiPage[] {
  const q = query.toLowerCase();
  return DEMO_WIKI_PAGES.filter((p) => {
    const haystack = `${p.title} ${p.content} ${p.tags.join(" ")}`.toLowerCase();
    return haystack.includes(q);
  });
}
