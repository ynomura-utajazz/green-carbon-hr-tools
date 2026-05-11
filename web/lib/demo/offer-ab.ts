/**
 * オファーレター A/B テスト用デモデータ。
 *
 * 各バリアント：
 *  - キーメッセージ（fast / slow / personal / value）
 *  - 配信条件（ロール/経路）
 *  - 送付件数 / 開封 / 受諾 / 辞退
 */

export type OfferVariant = {
  id: string;
  name: string;
  /** 主要メッセージ（"スピード" / "ストックオプション強調" 等） */
  key_angle: string;
  /** ヘッダー文（先頭のフック） */
  hook: string;
  /** 中盤のセールス（オファー受諾を後押し） */
  pitch: string;
  /** 結びの呼びかけ */
  cta: string;
  /** 表示中（active）か否か */
  active: boolean;
  /** 配信開始日 */
  started_at: string;
  /** 送付件数 */
  sent_count: number;
  /** 開封件数 */
  opened_count: number;
  /** 受諾件数 */
  accepted_count: number;
  /** 辞退件数 */
  declined_count: number;
  /** 平均レスポンス日数 */
  avg_response_days: number;
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const DEMO_OFFER_VARIANTS: OfferVariant[] = [
  {
    id: "v-A",
    name: "Variant A — 標準",
    key_angle: "事業内容 + 待遇の網羅型",
    hook: "Green Carbon は東南アジア最大級の自然資本（マングローブ・森林）からカーボンクレジットを生み出す気候テックスタートアップです。",
    pitch: "あなたの技術力と当社のミッションが交差する地点で、新たな炭素削減の未来を描けると確信しています。年収レンジは ¥9,000,000-¥14,000,000、ストックオプションも付与いたします。",
    cta: "ぜひご検討の上、来週中にご返答いただけると幸いです。",
    active: true,
    started_at: day(-90),
    sent_count: 18,
    opened_count: 17,
    accepted_count: 11,
    declined_count: 6,
    avg_response_days: 6.2,
  },
  {
    id: "v-B",
    name: "Variant B — 物語型",
    key_angle: "ミッション × 個人ストーリー",
    hook: "田中さんと面接でお話しした、「カーボン計算アルゴリズムの精度を 1 桁上げたい」というお言葉が、ずっと心に残っています。",
    pitch: "そのビジョンこそ、当社が今から本気で取り組むべき課題です。あなたが入社する 90 日後の組織の姿を、面接官たちは既に強くイメージできています。年収 ¥9,500,000-¥14,500,000、SO 0.05-0.1%。",
    cta: "正式なオファーにあたり、来週月曜のランチで CEO 野村と再度お話しいただけませんか？",
    active: true,
    started_at: day(-45),
    sent_count: 14,
    opened_count: 14,
    accepted_count: 12,
    declined_count: 2,
    avg_response_days: 3.8,
  },
  {
    id: "v-C",
    name: "Variant C — スピード強調",
    key_angle: "速さで惹きつける",
    hook: "結論から：当社は田中さんに、シニアエンジニアとして即時の参画をお願いしたいと考えています。",
    pitch: "面接 4 回でこの判断に至るのは異例の速さです。それだけ、あなたの技術力とフィットが明確だったということです。年収 ¥10,000,000-¥14,000,000、初日からチームに権限を委ねます。",
    cta: "今週金曜までにご検討いただければ、当社最速プロセスで翌週月曜には書面オファーを発送できます。",
    active: true,
    started_at: day(-30),
    sent_count: 9,
    opened_count: 9,
    accepted_count: 5,
    declined_count: 4,
    avg_response_days: 2.5,
  },
  {
    id: "v-D",
    name: "Variant D — 報酬パッケージ強調",
    key_angle: "金銭価値を前面に",
    hook: "正式なオファーをお送りします。総報酬パッケージは年間 ¥15,500,000 相当（年収 + SO 期待値 + 福利厚生）です。",
    pitch: "業界標準を上回る給与、業界最大級のストックオプション枠（0.1-0.2%）、リモート可の働き方、フレックス、海外出張サポート。",
    cta: "詳細は添付の Term Sheet をご覧の上、ご質問あればいつでもどうぞ。",
    active: false, // 終了済
    started_at: day(-180),
    sent_count: 12,
    opened_count: 11,
    accepted_count: 7,
    declined_count: 5,
    avg_response_days: 5.1,
  },
];

export type VariantStats = {
  variant: OfferVariant;
  open_rate: number;     // 開封率
  accept_rate: number;   // 開封者のうち受諾
  hire_rate: number;     // 送付のうち受諾
};

export function computeVariantStats(v: OfferVariant): VariantStats {
  return {
    variant: v,
    open_rate:   v.sent_count > 0 ? v.opened_count / v.sent_count : 0,
    accept_rate: v.opened_count > 0 ? v.accepted_count / v.opened_count : 0,
    hire_rate:   v.sent_count > 0 ? v.accepted_count / v.sent_count : 0,
  };
}

/** 簡易統計的有意性（z-test for proportions, 2 サンプル） */
export function isSignificant(a: OfferVariant, b: OfferVariant): {
  z: number; significant: boolean; p_value_estimate: string;
} {
  const p1 = a.sent_count > 0 ? a.accepted_count / a.sent_count : 0;
  const p2 = b.sent_count > 0 ? b.accepted_count / b.sent_count : 0;
  const n1 = a.sent_count, n2 = b.sent_count;
  if (n1 < 5 || n2 < 5) return { z: 0, significant: false, p_value_estimate: "n<5" };
  const pPool = (a.accepted_count + b.accepted_count) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  const z = se > 0 ? (p1 - p2) / se : 0;
  const absZ = Math.abs(z);
  const pEst = absZ >= 2.58 ? "p<0.01" : absZ >= 1.96 ? "p<0.05" : absZ >= 1.64 ? "p<0.10" : "n.s.";
  return { z: Number(z.toFixed(2)), significant: absZ >= 1.96, p_value_estimate: pEst };
}
