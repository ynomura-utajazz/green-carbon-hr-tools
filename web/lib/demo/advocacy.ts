/**
 * 社員アドボカシー：外部発信のトラッキング。
 *
 * 種類：
 *  - article : ブログ・Note・Medium 記事
 *  - talk    : カンファレンス登壇
 *  - podcast : Podcast 出演
 *  - social  : X/LinkedIn の数字（フォロワー × 反応）
 *  - oss     : OSS 貢献（PR / Issue / Commit）
 *  - press   : メディア掲載・取材
 *
 * リーチスコア = views × 0.0001 + reactions × 0.5 + estimated_audience × 0.001
 */

export type AdvocacyKind = "article" | "talk" | "podcast" | "social" | "oss" | "press";

export type AdvocacyPost = {
  id: string;
  employee_id: string;
  kind: AdvocacyKind;
  title: string;
  /** URL */
  url: string;
  /** 発信日 */
  published_at: string;
  /** 関連スキル / トピック */
  topics: string[];
  /** 視聴・閲覧数 */
  views?: number;
  /** リアクション（いいね / コメント / シェア合計） */
  reactions?: number;
  /** 推定聴衆規模（カンファレンスなら参加者数） */
  estimated_audience?: number;
  /** 報奨ポイント（社内制度） */
  reward_points: number;
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const KIND_META: Record<AdvocacyKind, { label: string; emoji: string; cls: string }> = {
  article: { label: "ブログ記事",  emoji: "📝", cls: "bg-blue-100 text-blue-800 border-blue-300" },
  talk:    { label: "登壇",        emoji: "🎤", cls: "bg-purple-100 text-purple-800 border-purple-300" },
  podcast: { label: "ポッドキャスト", emoji: "🎙️", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  social:  { label: "ソーシャル発信", emoji: "📱", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  oss:     { label: "OSS 貢献",    emoji: "🐙", cls: "bg-gray-100 text-gray-800 border-gray-300" },
  press:   { label: "メディア掲載",  emoji: "📰", cls: "bg-red-100 text-red-800 border-red-300" },
};

export const DEMO_ADVOCACY: AdvocacyPost[] = [
  {
    id: "a-1", employee_id: "e9", kind: "article",
    title: "Carbon 計算アルゴリズムを Rust で書き直した話",
    url: "https://zenn.dev/green-carbon/article-1",
    published_at: day(-14),
    topics: ["Rust", "カーボン計算", "システム設計"],
    views: 12_400, reactions: 320, reward_points: 50,
  },
  {
    id: "a-2", employee_id: "e8", kind: "talk",
    title: "気候テック × グローバルチーム — VPoE が語る組織設計",
    url: "https://eng-meetup.example/2026-spring",
    published_at: day(-30),
    topics: ["チームビルディング", "気候テック", "リモート"],
    views: 480, estimated_audience: 220, reactions: 95,
    reward_points: 80,
  },
  {
    id: "a-3", employee_id: "e3", kind: "press",
    title: "Forbes Japan: 「東南アジアの森林からカーボンを生む COO」",
    url: "https://forbesjapan.example/feature-coo",
    published_at: day(-45),
    topics: ["ASEAN市場知識", "気候政策", "BD/Sales"],
    views: 38_000, reward_points: 100,
  },
  {
    id: "a-4", employee_id: "e14", kind: "article",
    title: "気候プロダクトのデザインで気をつけている 7 つのこと",
    url: "https://note.com/harada/design-climate",
    published_at: day(-7),
    topics: ["Webデザイン", "UXリサーチ", "ブランドデザイン"],
    views: 6_200, reactions: 180,
    reward_points: 40,
  },
  {
    id: "a-5", employee_id: "e11", kind: "talk",
    title: "ジャカルタ DevConf: 衛星画像 ML パイプライン",
    url: "https://jakarta-devconf.example/2026",
    published_at: day(-60),
    topics: ["ML", "MLOps", "衛星画像処理"],
    views: 320, estimated_audience: 180, reactions: 60,
    reward_points: 70,
  },
  {
    id: "a-6", employee_id: "e10", kind: "oss",
    title: "next-themes に Custom Variant 機能を追加（merged）",
    url: "https://github.com/pacocoursey/next-themes/pull/123",
    published_at: day(-21),
    topics: ["TypeScript", "Next.js"],
    reactions: 14,
    reward_points: 30,
  },
  {
    id: "a-7", employee_id: "e9", kind: "podcast",
    title: "fukabori.fm 出演：カーボン計算と工学の融合",
    url: "https://fukabori.fm/episode/100",
    published_at: day(-50),
    topics: ["カーボン計算", "Rust"],
    views: 8_900, reactions: 75,
    reward_points: 60,
  },
  {
    id: "a-8", employee_id: "e2", kind: "article",
    title: "300 名規模スタートアップの戦略人事 12 ヶ月",
    url: "https://note.com/takahashi-chro/strategy-hr",
    published_at: day(-90),
    topics: ["人事戦略", "組織開発"],
    views: 18_500, reactions: 410, reward_points: 60,
  },
  {
    id: "a-9", employee_id: "e4", kind: "social",
    title: "X スレッド：B2B SaaS PdM が四半期で実行した 5 つ",
    url: "https://x.com/cpo_yamada/status/1234567",
    published_at: day(-3),
    topics: ["プロダクトマネジメント", "B2B SaaS"],
    views: 47_000, reactions: 1_200,
    reward_points: 30,
  },
  {
    id: "a-10", employee_id: "e7", kind: "article",
    title: "韓国市場 H1 2026 カーボン政策レビュー",
    url: "https://medium.com/@park-jihye/korea-carbon-h1",
    published_at: day(-22),
    topics: ["気候政策", "韓国市場"],
    views: 3_400, reactions: 95, reward_points: 35,
  },
  {
    id: "a-11", employee_id: "e9", kind: "oss",
    title: "tokio に Carbon-related performance issue を contribute",
    url: "https://github.com/tokio-rs/tokio/pull/45678",
    published_at: day(-5),
    topics: ["Rust"],
    reactions: 28,
    reward_points: 40,
  },
];

export function reachScore(p: AdvocacyPost): number {
  const v = p.views ?? 0;
  const r = p.reactions ?? 0;
  const a = p.estimated_audience ?? 0;
  return Math.round(v * 0.0001 + r * 0.5 + a * 0.001);
}
