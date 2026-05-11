/**
 * バリューアワードのデモデータ。
 * 6 つの会社バリューに沿ってピアツーピアで称え合う。
 */

export type ValueTag = "Challenge" | "Co-Creation" | "Integrity" | "Impact" | "Sustainability" | "Global";

export const VALUE_LABEL: Record<ValueTag, string> = {
  Challenge: "Challenge",
  "Co-Creation": "Co-Creation",
  Integrity: "Integrity",
  Impact: "Impact",
  Sustainability: "Sustainability",
  Global: "Global",
};

export const VALUE_DESCRIPTION: Record<ValueTag, string> = {
  Challenge: "現状に満足せず、より高い目標に挑戦する",
  "Co-Creation": "部門・国境を越えて協働し、より良い解を生み出す",
  Integrity: "誠実であり、約束したことをやり抜く",
  Impact: "成果にこだわり、世界にインパクトを与える",
  Sustainability: "長期視点で持続可能な選択をする",
  Global: "多様な視点を尊重し、グローバル基準で考え行動する",
};

export const VALUE_EMOJI: Record<ValueTag, string> = {
  Challenge: "🔥",
  "Co-Creation": "🤝",
  Integrity: "🛡️",
  Impact: "⚡",
  Sustainability: "🌱",
  Global: "🌏",
};

export const VALUE_COLOR: Record<ValueTag, string> = {
  Challenge: "border-red-200 bg-red-50 text-red-800",
  "Co-Creation": "border-blue-200 bg-blue-50 text-blue-800",
  Integrity: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Impact: "border-amber-200 bg-amber-50 text-amber-800",
  Sustainability: "border-gc-200 bg-gc-50 text-gc-800",
  Global: "border-cyan-200 bg-cyan-50 text-cyan-800",
};

export const VALUE_BG: Record<ValueTag, string> = {
  Challenge: "from-red-400 to-red-600",
  "Co-Creation": "from-blue-400 to-blue-600",
  Integrity: "from-emerald-400 to-emerald-600",
  Impact: "from-amber-400 to-amber-600",
  Sustainability: "from-gc-400 to-gc-600",
  Global: "from-cyan-400 to-cyan-600",
};

export type Award = {
  id: string;
  recipient_id: string;
  nominator_id: string;
  value: ValueTag;
  message: string;
  awarded_at: string;     // ISO datetime
  reactions: { emoji: string; count: number }[];
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

export const DEMO_AWARDS: Award[] = [
  { id: "aw-1",  recipient_id: "e5",  nominator_id: "e2",  value: "Co-Creation", message: "全社展開のフェーズで部門間調整を見事にリード。HR ロードマップが軌道に乗ったのは彩さんのおかげ。", awarded_at: day(-1), reactions: [{ emoji: "🎉", count: 12 }, { emoji: "🙌", count: 8 }, { emoji: "💪", count: 3 }] },
  { id: "aw-2",  recipient_id: "e10", nominator_id: "e9",  value: "Challenge", message: "難航していた認証バックエンドのリファクタを完遂。技術的に難易度が高い領域に挑戦してくれました。", awarded_at: day(-2), reactions: [{ emoji: "🔥", count: 18 }, { emoji: "👏", count: 9 }] },
  { id: "aw-3",  recipient_id: "e22", nominator_id: "e20", value: "Global", message: "Sara はインドネシア政府との折衝で、現地文化を踏まえた絶妙な交渉を進めてくれました。海外メンバーがいる強みを活かす好例。", awarded_at: day(-3), reactions: [{ emoji: "🌏", count: 15 }, { emoji: "🙌", count: 6 }] },
  { id: "aw-4",  recipient_id: "e9",  nominator_id: "e8",  value: "Impact", message: "ASEAN プラットフォーム v2 の主要モジュールを期限通りに納品。プロダクトロードマップの大きな前進。", awarded_at: day(-4), reactions: [{ emoji: "⚡", count: 22 }, { emoji: "🎯", count: 7 }] },
  { id: "aw-5",  recipient_id: "e11", nominator_id: "e8",  value: "Integrity", message: "深夜に発生した本番障害で、自宅から即座にコールに参加し、率直に状況を共有。誠実さが安心を生む。", awarded_at: day(-5), reactions: [{ emoji: "🛡️", count: 14 }, { emoji: "🙏", count: 8 }] },
  { id: "aw-6",  recipient_id: "e23", nominator_id: "e1",  value: "Challenge", message: "縮小傾向にあったインバウンドチャネルを、新コンテンツ戦略で再活性化。Q1 末で MQL +30%。", awarded_at: day(-6), reactions: [{ emoji: "🔥", count: 11 }] },
  { id: "aw-7",  recipient_id: "e16", nominator_id: "e3",  value: "Co-Creation", message: "事業開発と技術部門の橋渡し役として、技術的制約を踏まえた現実的な提案をクライアントに行ってくれました。", awarded_at: day(-7), reactions: [{ emoji: "🤝", count: 9 }] },
  { id: "aw-8",  recipient_id: "e17", nominator_id: "e16", value: "Sustainability", message: "クライアントの長期戦略を念頭に置いた提案を継続的に行い、短期的なディスカウントに頼らない取引設計を実現。", awarded_at: day(-8), reactions: [{ emoji: "🌱", count: 13 }, { emoji: "💚", count: 5 }] },
  { id: "aw-9",  recipient_id: "e12", nominator_id: "e9",  value: "Co-Creation", message: "ベトナムオフィスから日本側への週次同期を毎回欠かさず実施。時差の中で連携を保ってくれている。", awarded_at: day(-9), reactions: [{ emoji: "🤝", count: 8 }, { emoji: "🌏", count: 6 }] },
  { id: "aw-10", recipient_id: "e14", nominator_id: "e4",  value: "Impact", message: "デザインシステム v2 の浸透で、エンジニア生産性が体感で 30% 向上。プラットフォーム横断の影響大。", awarded_at: day(-10), reactions: [{ emoji: "⚡", count: 17 }, { emoji: "🎨", count: 5 }] },
  { id: "aw-11", recipient_id: "e6",  nominator_id: "e2",  value: "Challenge", message: "難航していたシニアエンジニア採用で、リファラル経由の候補者を 3 名引き出しに成功。", awarded_at: day(-11), reactions: [{ emoji: "🔥", count: 9 }] },
  { id: "aw-12", recipient_id: "e7",  nominator_id: "e5",  value: "Sustainability", message: "L&D プログラムを継続的に改善。短期成果より長期的な人材育成にコミット。", awarded_at: day(-12), reactions: [{ emoji: "🌱", count: 8 }] },
  { id: "aw-13", recipient_id: "e20", nominator_id: "e3",  value: "Global", message: "ASEAN ハブ拠点の立ち上げをマニラから一人で牽引。多文化チームのまとめ方が見事。", awarded_at: day(-13), reactions: [{ emoji: "🌏", count: 14 }, { emoji: "🙌", count: 9 }] },
  { id: "aw-14", recipient_id: "e2",  nominator_id: "e1",  value: "Impact", message: "300名規模に対応した HR システム刷新を主導。組織スケールに不可欠な基盤を構築。", awarded_at: day(-14), reactions: [{ emoji: "⚡", count: 21 }, { emoji: "👑", count: 6 }] },
  { id: "aw-15", recipient_id: "e15", nominator_id: "e14", value: "Challenge", message: "新サービスの UI を 2 週間でゼロから設計。難易度の高いステークホルダー調整も乗り越えた。", awarded_at: day(-15), reactions: [{ emoji: "🔥", count: 7 }] },
  { id: "aw-16", recipient_id: "e26", nominator_id: "e1",  value: "Integrity", message: "監査対応で発覚した過去の処理不備を、隠さず即座に報告し是正案を提示。透明性の手本。", awarded_at: day(-16), reactions: [{ emoji: "🛡️", count: 11 }, { emoji: "👍", count: 4 }] },
  { id: "aw-17", recipient_id: "e8",  nominator_id: "e4",  value: "Co-Creation", message: "プロダクトとエンジニアリングのアライメントを継続的に向上。VPoE として模範。", awarded_at: day(-17), reactions: [{ emoji: "🤝", count: 9 }] },
  { id: "aw-18", recipient_id: "e21", nominator_id: "e20", value: "Impact", message: "マレーシア最大手とのパートナー契約を成立。ASEAN 戦略の重要マイルストーン。", awarded_at: day(-18), reactions: [{ emoji: "⚡", count: 16 }, { emoji: "🎯", count: 8 }] },
  { id: "aw-19", recipient_id: "e3",  nominator_id: "e1",  value: "Sustainability", message: "短期目標に流されず、3 年スパンの ASEAN 投資戦略を経営会議で論破して通した。", awarded_at: day(-19), reactions: [{ emoji: "🌱", count: 12 }] },
  { id: "aw-20", recipient_id: "e4",  nominator_id: "e1",  value: "Challenge", message: "新規プロダクトラインの提案を辛抱強く続け、経営承認を獲得。", awarded_at: day(-20), reactions: [{ emoji: "🔥", count: 8 }] },
  { id: "aw-21", recipient_id: "e13", nominator_id: "e9",  value: "Co-Creation", message: "新人ながら積極的に他チームに質問・提案。チーム文化への馴染み方が早い。", awarded_at: day(-22), reactions: [{ emoji: "🤝", count: 6 }] },
  { id: "aw-22", recipient_id: "e25", nominator_id: "e23", value: "Global", message: "ベトナム語コンテンツの品質を一段上げてくれた。日本人視点では気づかない言い回しを修正。", awarded_at: day(-25), reactions: [{ emoji: "🌏", count: 7 }] },
  { id: "aw-23", recipient_id: "e5",  nominator_id: "e2",  value: "Integrity", message: "難しいフィードバックを率直に伝え、関係も維持する。HR の手本。", awarded_at: day(-28), reactions: [{ emoji: "🛡️", count: 10 }] },
  { id: "aw-24", recipient_id: "e10", nominator_id: "e8",  value: "Impact", message: "オンコール対応で重大障害の影響を最小化。本番システムの信頼性を支えてくれている。", awarded_at: day(-30), reactions: [{ emoji: "⚡", count: 13 }] },
];

export function awardsByValue(): Map<ValueTag, Award[]> {
  const map = new Map<ValueTag, Award[]>();
  for (const v of Object.keys(VALUE_LABEL) as ValueTag[]) map.set(v, []);
  for (const a of DEMO_AWARDS) map.get(a.value)!.push(a);
  return map;
}

export function topRecipients(): { id: string; count: number }[] {
  const map = new Map<string, number>();
  for (const a of DEMO_AWARDS) map.set(a.recipient_id, (map.get(a.recipient_id) ?? 0) + 1);
  return [...map.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}

export function topNominators(): { id: string; count: number }[] {
  const map = new Map<string, number>();
  for (const a of DEMO_AWARDS) map.set(a.nominator_id, (map.get(a.nominator_id) ?? 0) + 1);
  return [...map.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}

export function thisMonthMVP(): { id: string; count: number } | null {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const map = new Map<string, number>();
  for (const a of DEMO_AWARDS) {
    if (new Date(a.awarded_at) >= monthStart) {
      map.set(a.recipient_id, (map.get(a.recipient_id) ?? 0) + 1);
    }
  }
  const top = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? { id: top[0], count: top[1] } : null;
}
