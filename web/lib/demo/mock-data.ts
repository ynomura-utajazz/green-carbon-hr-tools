/**
 * デモモード用のモックデータ。
 * NEXT_PUBLIC_DEMO_MODE=true のとき Supabase 呼び出しをこちらに差し替えて
 * 認証・DB を未設定でも UI を確認できるようにします。
 *
 * ⚠️ 本番環境では絶対に DEMO_MODE を有効化しないでください。
 */

// デモモードで「ログイン中」とみなす社員ID。employees.ts の e1（野村裕太/CEO）と一致。
// 直属の部下が多く、組織全体を見渡す視点でデモを通せるため CEO を採用。
export const DEMO_CURRENT_EMPLOYEE_ID = "e1";

export const DEMO_USER = {
  id: DEMO_CURRENT_EMPLOYEE_ID,
  email: "y.nomura@green-carbon.inc",
  name: "野村 裕太",
  avatarUrl: null,
};

export const DEMO_KPIS = {
  activeCount: 297,
  hiresThisMonth: 4,
  departmentsCount: 7,
  visaWarnings: 3,
};

export const DEMO_BIRTHDAYS = [
  { id: "1", full_name: "山田 花子", department: "プロダクト",   monthDay: "05/12" },
  { id: "2", full_name: "佐藤 太郎", department: "事業開発",     monthDay: "05/15" },
  { id: "3", full_name: "Lopez Maria", department: "グローバル",  monthDay: "05/18" },
  { id: "4", full_name: "鈴木 健",   department: "技術",         monthDay: "05/22" },
  { id: "5", full_name: "高橋 真由", department: "人事",         monthDay: "06/01" },
  { id: "6", full_name: "Nguyen An", department: "マーケティング", monthDay: "06/03" },
];

export const DEMO_AWARDS = [
  {
    id: "a1", value_tag: "Challenge",
    message: "新しい炭素クレジット市場の開拓に果敢に挑戦し、チーム全体を鼓舞してくれました。",
    awarded_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    recipient: "山田 花子", nominator: "佐藤 太郎",
  },
  {
    id: "a2", value_tag: "Co-Creation",
    message: "部門横断のプロジェクトで積極的に他部署と連携し、素晴らしい成果を出してくれました。",
    awarded_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    recipient: "鈴木 健", nominator: "高橋 真由",
  },
  {
    id: "a3", value_tag: "Impact",
    message: "クライアントへの提案が高く評価され、大型案件の受注につながりました。",
    awarded_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    recipient: "Lopez Maria", nominator: "Nguyen An",
  },
  {
    id: "a4", value_tag: "Sustainability",
    message: "再エネプロジェクトの長期計画を丁寧に設計し、将来世代への責任を体現しています。",
    awarded_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    recipient: "佐藤 太郎", nominator: "山田 花子",
  },
  {
    id: "a5", value_tag: "Integrity",
    message: "困難な状況でも正直に報告し、チームの信頼を守ってくれました。",
    awarded_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    recipient: "高橋 真由", nominator: "Lopez Maria",
  },
];

export const DEMO_ANNOUNCEMENTS = [
  {
    id: "n1",
    title: "Q2 OKR キックオフ説明会のお知らせ（5/20 14:00〜）",
    body: "Q2 の全社OKRと部門別目標を共有します。全マネージャー必須、メンバーは任意参加。Zoomリンクは Slack #all-hands に投稿済み。",
    link: "/announcements/q2-okr-kickoff",
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "n2",
    title: "定期健康診断（5/15〜6/30）の予約受付開始",
    body: "今年度の定期健康診断の予約を受け付け中です。5/31までに予約をお願いします。",
    link: "/health-check",
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "n3",
    title: "新入社員4名の入社（5/1付）",
    body: "5/1付で4名の新メンバーがジョインしました。オンボーディングへのご協力をお願いします。",
    link: "/directory",
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "n4",
    title: "リモートワーク制度ガイドラインの改定について",
    body: "2026年度よりリモートワーク制度のガイドラインを一部改定しました。詳細は社内Wiki参照。",
    link: "/wiki/remote-policy",
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
  },
];

export const isDemoMode = () =>
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === "https://xxxxxxxxxxxx.supabase.co";
