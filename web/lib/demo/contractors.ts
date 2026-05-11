/**
 * 業務委託先のモックデータ。国内・海外、個人・法人を混在。
 * - インボイス制度対応有無、源泉徴収要否を持つ
 * - 月額・時給・案件単価の3パターン
 * - NDA / 機密保持契約の状態
 */

export type ContractorType = "individual" | "corporate";
export type PaymentModel = "monthly_retainer" | "hourly" | "project_based";
export type ContractStatus = "active" | "expiring_soon" | "ended" | "negotiating";
export type RiskLevel = "low" | "medium" | "high";

export type DemoContractor = {
  id: string;
  display_name: string;          // 個人名 or 法人名
  legal_name?: string;           // 個人の場合の本名（法人の場合は同じ）
  type: ContractorType;
  country_code: string;          // ISO 3166-1 alpha-2
  country_name: string;
  country_emoji: string;
  city: string;
  email: string;
  slack_user_id?: string;
  // 契約
  role: string;                  // 担当領域
  department: string;            // 委託元部署
  ownerEmployeeId: string;       // 社内担当者ID
  contract_start: string;        // ISO date
  contract_end: string;          // ISO date
  auto_renew: boolean;
  status: ContractStatus;
  // 報酬
  payment_model: PaymentModel;
  rate_amount: number;           // 月額/時給/案件単価
  currency: string;              // JPY / USD / SGD ...
  monthly_estimate_jpy: number;  // JPY換算見込
  // 税務
  has_invoice_number: boolean;   // インボイス登録（国内のみ意味あり）
  invoice_number?: string;       // T+13桁
  withholding_required: boolean; // 源泉徴収
  // 法務
  nda_signed_at: string | null;
  nda_expires_at: string | null;
  // 評価
  rating: number | null;         // 1-5
  risk_level: RiskLevel;
  notes?: string;
};

const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const DEMO_CONTRACTORS: DemoContractor[] = [
  // ─── 国内 個人 ───────────────────
  {
    id: "c1",
    display_name: "佐々木 みなみ",
    type: "individual",
    country_code: "JP", country_name: "日本", country_emoji: "🇯🇵", city: "東京",
    email: "minami.sasaki@example.com",
    slack_user_id: "U02CON001",
    role: "UI/UX デザイン（プロダクト）",
    department: "プロダクト",
    ownerEmployeeId: "e14",
    contract_start: day(-180), contract_end: day(15),  // 期限間近
    auto_renew: false, status: "expiring_soon",
    payment_model: "monthly_retainer", rate_amount: 600_000, currency: "JPY",
    monthly_estimate_jpy: 600_000,
    has_invoice_number: true, invoice_number: "T1234567890123", withholding_required: true,
    nda_signed_at: day(-180), nda_expires_at: day(545),
    rating: 5, risk_level: "low",
    notes: "新サービスのUIデザインを担当。継続意向あり。",
  },
  {
    id: "c2",
    display_name: "田村 健司",
    type: "individual",
    country_code: "JP", country_name: "日本", country_emoji: "🇯🇵", city: "大阪",
    email: "kenji.tamura@example.com",
    slack_user_id: "U02CON002",
    role: "顧問税理士",
    department: "経理・財務",
    ownerEmployeeId: "e26",
    contract_start: day(-720), contract_end: day(360), auto_renew: true, status: "active",
    payment_model: "monthly_retainer", rate_amount: 100_000, currency: "JPY",
    monthly_estimate_jpy: 100_000,
    has_invoice_number: true, invoice_number: "T9876543210987", withholding_required: false,
    nda_signed_at: day(-720), nda_expires_at: null,
    rating: 4, risk_level: "low",
  },
  {
    id: "c3",
    display_name: "藤村 麻衣",
    type: "individual",
    country_code: "JP", country_name: "日本", country_emoji: "🇯🇵", city: "福岡",
    email: "mai.fujimura@example.com",
    role: "コンテンツライター",
    department: "マーケティング",
    ownerEmployeeId: "e23",
    contract_start: day(-90), contract_end: day(85), auto_renew: false, status: "active",
    payment_model: "hourly", rate_amount: 5_000, currency: "JPY",
    monthly_estimate_jpy: 240_000,
    has_invoice_number: false, withholding_required: true,
    nda_signed_at: day(-90), nda_expires_at: day(635),
    rating: 4, risk_level: "medium",
    notes: "インボイス未登録のため、源泉徴収＋経過措置適用中。本人に登録を推奨済み。",
  },

  // ─── 国内 法人 ───────────────────
  {
    id: "c4",
    display_name: "株式会社グリーンロウ",
    legal_name: "株式会社グリーンロウ",
    type: "corporate",
    country_code: "JP", country_name: "日本", country_emoji: "🇯🇵", city: "東京",
    email: "contact@greenlaw.example.com",
    role: "顧問弁護士事務所",
    department: "経営企画",
    ownerEmployeeId: "e1",
    contract_start: day(-1080), contract_end: day(285), auto_renew: true, status: "active",
    payment_model: "monthly_retainer", rate_amount: 300_000, currency: "JPY",
    monthly_estimate_jpy: 300_000,
    has_invoice_number: true, invoice_number: "T1111222233334", withholding_required: false,
    nda_signed_at: day(-1080), nda_expires_at: null,
    rating: 5, risk_level: "low",
  },
  {
    id: "c5",
    display_name: "Acme Dev Studio Inc.",
    legal_name: "アクメ開発スタジオ株式会社",
    type: "corporate",
    country_code: "JP", country_name: "日本", country_emoji: "🇯🇵", city: "東京",
    email: "billing@acme-dev.example.com",
    role: "受託開発（バックエンド）",
    department: "技術",
    ownerEmployeeId: "e8",
    contract_start: day(-60), contract_end: day(120), auto_renew: false, status: "active",
    payment_model: "project_based", rate_amount: 4_500_000, currency: "JPY",
    monthly_estimate_jpy: 1_500_000,
    has_invoice_number: true, invoice_number: "T5555666677778", withholding_required: false,
    nda_signed_at: day(-60), nda_expires_at: day(665),
    rating: 4, risk_level: "low",
  },

  // ─── 海外 個人（フリーランス） ──
  {
    id: "c6",
    display_name: "Jane Carter",
    type: "individual",
    country_code: "SG", country_name: "シンガポール", country_emoji: "🇸🇬", city: "シンガポール",
    email: "jane.carter@example.com",
    slack_user_id: "U02CON006",
    role: "ASEAN 市場調査・ローカライゼーション",
    department: "グローバル",
    ownerEmployeeId: "e19",
    contract_start: day(-210), contract_end: day(155), auto_renew: false, status: "active",
    payment_model: "hourly", rate_amount: 80, currency: "SGD",
    monthly_estimate_jpy: 720_000,  // 80 SGD * 80h * 円換算
    has_invoice_number: false, withholding_required: false,  // 海外居住者は要租税条約確認
    nda_signed_at: day(-210), nda_expires_at: day(515),
    rating: 5, risk_level: "low",
    notes: "非居住者。租税条約に基づき源泉徴収免除（居住者証明書取得済）。",
  },
  {
    id: "c7",
    display_name: "Raj Patel",
    type: "individual",
    country_code: "IN", country_name: "インド", country_emoji: "🇮🇳", city: "ベンガルール",
    email: "raj.patel@example.com",
    slack_user_id: "U02CON007",
    role: "シニアエンジニア（モバイル）",
    department: "技術",
    ownerEmployeeId: "e9",
    contract_start: day(-150), contract_end: day(45), auto_renew: false, status: "expiring_soon",
    payment_model: "monthly_retainer", rate_amount: 8_000, currency: "USD",
    monthly_estimate_jpy: 1_200_000,
    has_invoice_number: false, withholding_required: false,
    nda_signed_at: day(-150), nda_expires_at: day(575),
    rating: 5, risk_level: "medium",
    notes: "正社員オファーを検討中。延長 vs 雇用転換を6月までに判断。",
  },
  {
    id: "c8",
    display_name: "Linh Tran",
    type: "individual",
    country_code: "VN", country_name: "ベトナム", country_emoji: "🇻🇳", city: "ハノイ",
    email: "linh.tran@example.com",
    role: "ベトナム語翻訳・ローカライゼーション",
    department: "マーケティング",
    ownerEmployeeId: "e23",
    contract_start: day(-300), contract_end: day(65), auto_renew: true, status: "active",
    payment_model: "project_based", rate_amount: 1_200, currency: "USD",
    monthly_estimate_jpy: 180_000,
    has_invoice_number: false, withholding_required: false,
    nda_signed_at: day(-300), nda_expires_at: day(425),
    rating: 4, risk_level: "low",
  },

  // ─── 海外 法人（オフショア / コンサル） ──
  {
    id: "c9",
    display_name: "Manila Devshop Pte Ltd",
    legal_name: "Manila Devshop Pte Ltd",
    type: "corporate",
    country_code: "PH", country_name: "フィリピン", country_emoji: "🇵🇭", city: "マニラ",
    email: "ops@manila-devshop.example.com",
    role: "オフショア開発（5名チーム）",
    department: "技術",
    ownerEmployeeId: "e8",
    contract_start: day(-90), contract_end: day(275), auto_renew: false, status: "active",
    payment_model: "monthly_retainer", rate_amount: 25_000, currency: "USD",
    monthly_estimate_jpy: 3_750_000,
    has_invoice_number: false, withholding_required: false,
    nda_signed_at: day(-90), nda_expires_at: day(635),
    rating: 4, risk_level: "medium",
    notes: "MSA 締結済。月次品質レビュー要。",
  },
  {
    id: "c10",
    display_name: "Carbon Insights Asia Ltd",
    legal_name: "Carbon Insights Asia Ltd",
    type: "corporate",
    country_code: "MY", country_name: "マレーシア", country_emoji: "🇲🇾", city: "クアラルンプール",
    email: "finance@carbon-insights.example.com",
    role: "ASEAN 調査リサーチ（外部委託）",
    department: "事業開発",
    ownerEmployeeId: "e3",
    contract_start: day(-30), contract_end: day(150), auto_renew: false, status: "active",
    payment_model: "project_based", rate_amount: 60_000, currency: "USD",
    monthly_estimate_jpy: 2_250_000,  // 6ヶ月で消化想定
    has_invoice_number: false, withholding_required: false,
    nda_signed_at: day(-30), nda_expires_at: day(695),
    rating: null, risk_level: "low",
  },

  // ─── 期限間近・期限切れ ───────────
  {
    id: "c11",
    display_name: "中川 翔",
    type: "individual",
    country_code: "JP", country_name: "日本", country_emoji: "🇯🇵", city: "京都",
    email: "sho.nakagawa@example.com",
    slack_user_id: "U02CON011",
    role: "PRライター",
    department: "マーケティング",
    ownerEmployeeId: "e23",
    contract_start: day(-360), contract_end: day(7), auto_renew: false, status: "expiring_soon",
    payment_model: "project_based", rate_amount: 80_000, currency: "JPY",
    monthly_estimate_jpy: 80_000,
    has_invoice_number: true, invoice_number: "T2222333344445", withholding_required: true,
    nda_signed_at: day(-360), nda_expires_at: day(365),
    rating: 4, risk_level: "high",
    notes: "🚨 期限まで残り7日。更新可否を即決必要。",
  },
  {
    id: "c12",
    display_name: "John Wilson",
    type: "individual",
    country_code: "US", country_name: "アメリカ", country_emoji: "🇺🇸", city: "サンフランシスコ",
    email: "john.wilson@example.com",
    role: "気候政策アドバイザー",
    department: "経営企画",
    ownerEmployeeId: "e1",
    contract_start: day(-540), contract_end: day(-30), auto_renew: false, status: "ended",
    payment_model: "monthly_retainer", rate_amount: 5_000, currency: "USD",
    monthly_estimate_jpy: 750_000,
    has_invoice_number: false, withholding_required: false,
    nda_signed_at: day(-540), nda_expires_at: day(190),
    rating: 5, risk_level: "low",
    notes: "プロジェクト完了に伴い終了。アルムナイとして関係継続。",
  },

  // ─── 交渉中 ──────────────────────
  {
    id: "c13",
    display_name: "Emma Schmidt",
    type: "individual",
    country_code: "DE", country_name: "ドイツ", country_emoji: "🇩🇪", city: "ベルリン",
    email: "emma.schmidt@example.com",
    role: "EU 規制コンプライアンス",
    department: "経営企画",
    ownerEmployeeId: "e1",
    contract_start: day(14), contract_end: day(379), auto_renew: false, status: "negotiating",
    payment_model: "monthly_retainer", rate_amount: 7_500, currency: "EUR",
    monthly_estimate_jpy: 1_300_000,
    has_invoice_number: false, withholding_required: false,
    nda_signed_at: null, nda_expires_at: null,
    rating: null, risk_level: "medium",
    notes: "条件交渉中。NDA 締結待ち。",
  },
];

export const CONTRACTOR_STATUS_LABEL: Record<ContractStatus, string> = {
  active: "稼働中",
  expiring_soon: "期限間近",
  ended: "終了",
  negotiating: "交渉中",
};

export const PAYMENT_MODEL_LABEL: Record<PaymentModel, string> = {
  monthly_retainer: "月額",
  hourly: "時給",
  project_based: "案件単価",
};

// ─── 支払い履歴 ─────────────────────────────
export type PaymentStatus = "paid" | "pending" | "overdue" | "scheduled";

export type ContractorPayment = {
  id: string;
  contractor_id: string;
  invoice_number: string;            // INV-YYYYMM-001
  invoice_date: string;              // ISO date
  due_date: string;                  // ISO date
  paid_at: string | null;            // ISO date
  status: PaymentStatus;
  amount: number;                    // 元通貨
  currency: string;
  amount_jpy: number;                // JPY換算
  description: string;               // 月次稼働 / 案件A など
  freee_synced: boolean;             // freee と同期済みか
};

const monthOffset = (n: number, day = 25) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  d.setDate(day);
  return d.toISOString().slice(0, 10);
};

// 各 contractor に対して 6 ヶ月分の支払履歴を自動生成
function buildPayments(): ContractorPayment[] {
  const result: ContractorPayment[] = [];
  let counter = 1;

  for (const c of [
    "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12",
  ]) {
    // 終了済み (c12) は過去6ヶ月のみ全部 paid
    // 期限間近 (c1, c7, c11) は最新が pending
    // それ以外は混在
    const months = c === "c12" ? -6 : -5;
    for (let i = months; i <= 0; i++) {
      const isLatest = i === 0;
      const isPaid = !isLatest || c === "c12";
      const isPending = isLatest && (c === "c1" || c === "c7" || c === "c11");
      const isOverdue = c === "c11" && i === -1;  // c11 は前月 overdue

      const status: PaymentStatus = isOverdue ? "overdue"
        : isPending ? "pending"
        : isPaid ? "paid"
        : "scheduled";

      // 金額（contractor の rate に応じて軽くばらつき）
      const baseAmounts: Record<string, [number, string]> = {
        c1: [600_000, "JPY"], c2: [100_000, "JPY"],
        c3: [240_000, "JPY"],  // hourly 換算
        c4: [300_000, "JPY"], c5: [1_500_000, "JPY"],
        c6: [6_400, "SGD"], c7: [8_000, "USD"],
        c8: [1_200, "USD"], c9: [25_000, "USD"], c10: [10_000, "USD"],
        c11: [80_000, "JPY"], c12: [5_000, "USD"],
      };
      const [amount, currency] = baseAmounts[c] ?? [100_000, "JPY"];
      const variance = 1 + ((counter % 7) - 3) * 0.05;  // ±15% 程度
      const finalAmount = Math.round(amount * variance);
      const rates: Record<string, number> = { JPY: 1, USD: 150, SGD: 113, EUR: 165, GBP: 192 };
      const amountJpy = Math.round(finalAmount * (rates[currency] ?? 1));

      const invDate = monthOffset(i, 25);
      const dueDate = monthOffset(i + 1, 15);
      const paidAt = isPaid ? monthOffset(i + 1, 10) : null;

      result.push({
        id: `pay-${c}-${counter}`,
        contractor_id: c,
        invoice_number: `INV-${invDate.slice(0, 7).replace("-", "")}-${String(counter).padStart(3, "0")}`,
        invoice_date: invDate,
        due_date: dueDate,
        paid_at: paidAt,
        status,
        amount: finalAmount,
        currency,
        amount_jpy: amountJpy,
        description: `${invDate.slice(0, 7)} 月次稼働分`,
        freee_synced: status === "paid" && Math.random() > 0.2,  // paid のうち80%同期済み
      });
      counter++;
    }
  }
  return result;
}

export const DEMO_PAYMENTS: ContractorPayment[] = buildPayments();

// ─── ドキュメント ─────────────────────────
export type DocumentKind = "nda" | "contract" | "invoice" | "msa" | "amendment" | "other";
export type DocumentStatus = "signed" | "draft" | "expired" | "pending_review";

export type ContractorDocument = {
  id: string;
  contractor_id: string;
  kind: DocumentKind;
  name: string;
  status: DocumentStatus;
  size_kb: number;
  uploaded_by: string;       // 社員名
  uploaded_at: string;
  expires_at: string | null;
  url: string;               // ダミーURL
};

export const DOC_KIND_LABEL: Record<DocumentKind, string> = {
  nda: "機密保持契約 (NDA)",
  contract: "業務委託契約書",
  msa: "マスター・サービス契約 (MSA)",
  invoice: "請求書",
  amendment: "覚書・変更契約",
  other: "その他",
};

function buildDocuments(): ContractorDocument[] {
  const result: ContractorDocument[] = [];
  let counter = 1;

  const NDA_PRESETS: Record<string, { signedDaysAgo: number; expiresInDays: number | null } | null> = {
    c1: { signedDaysAgo: 180, expiresInDays: 545 },
    c2: { signedDaysAgo: 720, expiresInDays: null },
    c3: { signedDaysAgo: 90, expiresInDays: 635 },
    c4: { signedDaysAgo: 1080, expiresInDays: null },
    c5: { signedDaysAgo: 60, expiresInDays: 665 },
    c6: { signedDaysAgo: 210, expiresInDays: 515 },
    c7: { signedDaysAgo: 150, expiresInDays: 575 },
    c8: { signedDaysAgo: 300, expiresInDays: 425 },
    c9: { signedDaysAgo: 90, expiresInDays: 635 },
    c10: { signedDaysAgo: 30, expiresInDays: 695 },
    c11: { signedDaysAgo: 360, expiresInDays: 365 },
    c12: { signedDaysAgo: 540, expiresInDays: 190 },
    c13: null,
  };

  const dayStr = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  for (const cid of Object.keys(NDA_PRESETS)) {
    const ndaInfo = NDA_PRESETS[cid];
    // NDA
    if (ndaInfo) {
      result.push({
        id: `doc-${counter++}`,
        contractor_id: cid,
        kind: "nda",
        name: `NDA_${cid}_2024.pdf`,
        status: ndaInfo.expiresInDays !== null && ndaInfo.expiresInDays < 0 ? "expired" : "signed",
        size_kb: 142 + (counter % 50),
        uploaded_by: "鎌田 彩",
        uploaded_at: dayStr(-ndaInfo.signedDaysAgo),
        expires_at: ndaInfo.expiresInDays !== null ? dayStr(ndaInfo.expiresInDays) : null,
        url: "#",
      });
    } else {
      result.push({
        id: `doc-${counter++}`,
        contractor_id: cid,
        kind: "nda",
        name: `NDA_${cid}_draft.pdf`,
        status: "draft",
        size_kb: 98,
        uploaded_by: "鎌田 彩",
        uploaded_at: dayStr(-3),
        expires_at: null,
        url: "#",
      });
    }
    // 業務委託契約書 / MSA
    if (cid !== "c13") {
      const isCorporate = ["c4", "c5", "c9", "c10"].includes(cid);
      result.push({
        id: `doc-${counter++}`,
        contractor_id: cid,
        kind: isCorporate ? "msa" : "contract",
        name: isCorporate ? `MSA_${cid}_v2.pdf` : `業務委託契約書_${cid}.pdf`,
        status: "signed",
        size_kb: 280 + (counter % 100),
        uploaded_by: "鎌田 彩",
        uploaded_at: dayStr(ndaInfo ? -ndaInfo.signedDaysAgo + 1 : -2),
        expires_at: null,
        url: "#",
      });
    }
    // 直近の請求書 (3 件)
    if (!["c12", "c13"].includes(cid)) {
      for (let i = -2; i <= 0; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        result.push({
          id: `doc-${counter++}`,
          contractor_id: cid,
          kind: "invoice",
          name: `請求書_${cid}_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}.pdf`,
          status: "signed",
          size_kb: 64 + (counter % 30),
          uploaded_by: "Galina Sofia",
          uploaded_at: dayStr(i * 30 + 25),
          expires_at: null,
          url: "#",
        });
      }
    }
  }
  return result;
}

export const DEMO_DOCUMENTS: ContractorDocument[] = buildDocuments();

// ─── 評価 ─────────────────────────────
export type ContractorEvaluation = {
  id: string;
  contractor_id: string;
  period: string;             // "2026 Q1"
  evaluated_at: string;
  evaluator: string;
  ratings: {
    quality: number;          // 1-5
    communication: number;
    timeliness: number;
    value: number;             // コストパフォーマンス
  };
  comment: string;
  recommend_continuation: "strong_yes" | "yes" | "maybe" | "no";
};

function buildEvaluations(): ContractorEvaluation[] {
  const periods = ["2025 Q3", "2025 Q4", "2026 Q1"];
  const result: ContractorEvaluation[] = [];
  let counter = 1;
  for (const cid of ["c1", "c2", "c4", "c5", "c6", "c7", "c8", "c9", "c11"]) {
    periods.forEach((period, i) => {
      const baseRating = cid === "c1" || cid === "c4" || cid === "c6" || cid === "c7" ? 5 : 4;
      const variance = (counter + i) % 3 - 1;
      const rate = (offset = 0) => Math.max(1, Math.min(5, baseRating + variance + offset));
      result.push({
        id: `eval-${counter++}`,
        contractor_id: cid,
        period,
        evaluated_at: new Date(Date.now() - (periods.length - 1 - i) * 90 * 86400_000).toISOString().slice(0, 10),
        evaluator: cid === "c2" || cid === "c11" ? "鎌田 彩" : "山田 花子",
        ratings: {
          quality: rate(),
          communication: rate(-1),
          timeliness: rate(0),
          value: rate(0),
        },
        comment: i === periods.length - 1
          ? "今期も期待を超える成果を出してくれた。継続強く推奨。"
          : "安定した品質。次期も同条件で継続。",
        recommend_continuation: baseRating === 5 ? "strong_yes" : "yes",
      });
    });
  }
  return result;
}

export const DEMO_EVALUATIONS: ContractorEvaluation[] = buildEvaluations();

// ─── ヘルパ ─────────────────────────────
export function paymentsFor(contractorId: string): ContractorPayment[] {
  return DEMO_PAYMENTS
    .filter((p) => p.contractor_id === contractorId)
    .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
}

export function documentsFor(contractorId: string): ContractorDocument[] {
  return DEMO_DOCUMENTS
    .filter((d) => d.contractor_id === contractorId)
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
}

export function evaluationsFor(contractorId: string): ContractorEvaluation[] {
  return DEMO_EVALUATIONS
    .filter((e) => e.contractor_id === contractorId)
    .sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at));
}

// ─── 稼働レコード（委託先からの提出） ─────────
export type SubmissionStatus = "draft" | "submitted" | "approved" | "rejected" | "paid";

export type WorkRecordEntry = {
  date: string;          // YYYY-MM-DD
  hours: number;
  description: string;
};

export type WorkRecord = {
  id: string;
  contractor_id: string;
  period: string;                    // "2026-04"
  days_worked: number;
  hours_total: number;
  task_summary: string;
  entries: WorkRecordEntry[];        // hourly / project の場合の明細
  deliverable_urls: string[];        // 成果物リンク
  submitted_at: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  reviewer_comment: string | null;
  status: SubmissionStatus;
};

export type InvoiceSubmission = {
  id: string;
  contractor_id: string;
  work_record_id: string | null;     // 紐付く稼働レコード
  invoice_number: string;
  invoice_date: string;
  amount: number;
  currency: string;
  amount_jpy: number;
  file_name: string;                 // アップロードされたファイル名
  file_size_kb: number;
  submitted_at: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  reviewer_comment: string | null;
  status: SubmissionStatus;
  freee_pushed: boolean;
  paid_at: string | null;
};

const dayStr2 = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const period = (monthOffset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// 稼働レコードをサンプルとして手書きで生成
export const DEMO_WORK_RECORDS: WorkRecord[] = [
  // c1 佐々木 みなみ — 月額固定、今月分を提出済 (HR承認待ち)
  {
    id: "wr-c1-1",
    contractor_id: "c1",
    period: period(0),
    days_worked: 22, hours_total: 168,
    task_summary: "新サービス UI のワイヤーフレーム作成、ユーザビリティテスト準備、デザインレビュー対応",
    entries: [],  // 月額固定なので明細なし
    deliverable_urls: ["https://figma.com/file/example-wireframe", "https://figma.com/file/example-flow"],
    submitted_at: dayStr2(-1),
    reviewer_id: null, reviewed_at: null, reviewer_comment: null,
    status: "submitted",
  },
  // c3 藤村 麻衣 — 時給、今月分の詳細明細
  {
    id: "wr-c3-1",
    contractor_id: "c3",
    period: period(0),
    days_worked: 14, hours_total: 48,
    task_summary: "ブログ記事5本執筆、編集チームとレビュー対応",
    entries: [
      { date: dayStr2(-21), hours: 4, description: "「環境ESG動向」記事執筆" },
      { date: dayStr2(-19), hours: 5, description: "編集者フィードバック反映" },
      { date: dayStr2(-15), hours: 6, description: "「再エネ業界MAP」記事執筆" },
      { date: dayStr2(-12), hours: 4, description: "サムネイル選定・キャプション作成" },
      { date: dayStr2(-9),  hours: 8, description: "「2026 政策動向まとめ」記事執筆" },
      { date: dayStr2(-7),  hours: 3, description: "リード文書き直し" },
      { date: dayStr2(-5),  hours: 6, description: "「炭素クレジット入門」記事執筆" },
      { date: dayStr2(-3),  hours: 5, description: "校正・最終修正" },
      { date: dayStr2(-2),  hours: 4, description: "「気候テック企業特集」執筆" },
      { date: dayStr2(-1),  hours: 3, description: "公開準備・SEO 調整" },
    ],
    deliverable_urls: ["https://docs.google.com/document/d/example-articles"],
    submitted_at: dayStr2(-1),
    reviewer_id: null, reviewed_at: null, reviewer_comment: null,
    status: "submitted",
  },
  // c5 Acme Dev — プロジェクト納品
  {
    id: "wr-c5-1",
    contractor_id: "c5",
    period: period(0),
    days_worked: 0, hours_total: 0,
    task_summary: "認証バックエンド SP-2 マイルストーン納品（Auth Service v2 / OAuth対応 / 監査ログ）",
    entries: [],
    deliverable_urls: [
      "https://github.com/example/auth-service/pull/42",
      "https://docs.example.com/architecture/auth-v2",
    ],
    submitted_at: dayStr2(-3),
    reviewer_id: "e8", reviewed_at: dayStr2(-1),
    reviewer_comment: "コードレビュー OK。テストカバレッジ 91% で要件達成。請求書発行をお願いします。",
    status: "approved",
  },
  // c6 Jane Carter — 時給、海外
  {
    id: "wr-c6-1",
    contractor_id: "c6",
    period: period(0),
    days_worked: 10, hours_total: 78,
    task_summary: "ASEAN 5カ国の規制比較レポート作成、現地パートナー候補リサーチ",
    entries: [
      { date: dayStr2(-20), hours: 8, description: "Singapore regulation deep-dive" },
      { date: dayStr2(-18), hours: 8, description: "Indonesia regulation deep-dive" },
      { date: dayStr2(-15), hours: 8, description: "Vietnam regulation deep-dive" },
      { date: dayStr2(-12), hours: 8, description: "Philippines regulation deep-dive" },
      { date: dayStr2(-10), hours: 8, description: "Malaysia regulation deep-dive" },
      { date: dayStr2(-7),  hours: 10, description: "Comparative analysis report drafting" },
      { date: dayStr2(-5),  hours: 8, description: "Partner candidate shortlist" },
      { date: dayStr2(-3),  hours: 10, description: "Final report polishing" },
      { date: dayStr2(-1),  hours: 10, description: "Q&A with stakeholders" },
    ],
    deliverable_urls: ["https://docs.google.com/document/d/asean-regulations-2026"],
    submitted_at: dayStr2(-1),
    reviewer_id: null, reviewed_at: null, reviewer_comment: null,
    status: "submitted",
  },
  // c7 Raj Patel — 月額、先月分 approved
  {
    id: "wr-c7-1",
    contractor_id: "c7",
    period: period(-1),
    days_worked: 22, hours_total: 176,
    task_summary: "iOS アプリ v3.2 リリース対応、SwiftUI リファクタ、パフォーマンス最適化",
    entries: [],
    deliverable_urls: ["https://github.com/example/ios-app/releases/tag/v3.2"],
    submitted_at: dayStr2(-30),
    reviewer_id: "e9", reviewed_at: dayStr2(-28),
    reviewer_comment: "リリース順調。アプリ起動速度 30% 改善は目を見張る成果。継続お願いします。",
    status: "paid",
  },
  // c8 Linh Tran — 案件単位
  {
    id: "wr-c8-1",
    contractor_id: "c8",
    period: period(-1),
    days_worked: 0, hours_total: 0,
    task_summary: "ベトナム語ローカライゼーション バッチ#7（UI 文字列 1,840 個 + マーケサイト）",
    entries: [],
    deliverable_urls: ["https://crowdin.com/project/example/vi"],
    submitted_at: dayStr2(-25),
    reviewer_id: "e23", reviewed_at: dayStr2(-23),
    reviewer_comment: "確認しました。次バッチもお願いします。",
    status: "approved",
  },
  // c11 中川 翔 — 案件単位、提出直後 (期限間近の契約)
  {
    id: "wr-c11-1",
    contractor_id: "c11",
    period: period(0),
    days_worked: 0, hours_total: 0,
    task_summary: "プレスリリース「Q2 業績」原稿作成、メディア対応用 Q&A 準備",
    entries: [],
    deliverable_urls: ["https://docs.google.com/document/d/press-release-q2"],
    submitted_at: dayStr2(0),  // 今日提出
    reviewer_id: null, reviewed_at: null, reviewer_comment: null,
    status: "submitted",
  },
  // c2 田村 健司 — 月額、過去分 paid
  {
    id: "wr-c2-1",
    contractor_id: "c2",
    period: period(-1),
    days_worked: 0, hours_total: 0,
    task_summary: "月次決算レビュー、税務相談（インボイス制度・電子帳簿保存法）",
    entries: [],
    deliverable_urls: [],
    submitted_at: dayStr2(-30),
    reviewer_id: "e26", reviewed_at: dayStr2(-29),
    reviewer_comment: "毎月ありがとうございます。",
    status: "paid",
  },
  // c4 顧問弁護士 — 月額、却下事例
  {
    id: "wr-c4-1",
    contractor_id: "c4",
    period: period(0),
    days_worked: 0, hours_total: 0,
    task_summary: "契約書レビュー（業務委託契約 5件、SLA 2件）、商標登録相談",
    entries: [],
    deliverable_urls: [],
    submitted_at: dayStr2(-2),
    reviewer_id: "e1", reviewed_at: dayStr2(-1),
    reviewer_comment: "今月分の詳細業務リストを別途いただけますか？月次レポートのフォーマットがズレているので。",
    status: "rejected",
  },
];

export const DEMO_INVOICE_SUBMISSIONS: InvoiceSubmission[] = [
  // c1 佐々木 みなみ — 月額の請求書（承認待ち）
  {
    id: "is-c1-1", contractor_id: "c1", work_record_id: "wr-c1-1",
    invoice_number: "INV-2026-0428",
    invoice_date: dayStr2(-1),
    amount: 600_000, currency: "JPY", amount_jpy: 600_000,
    file_name: "invoice_sasaki_202604.pdf", file_size_kb: 86,
    submitted_at: dayStr2(-1),
    reviewer_id: null, reviewed_at: null, reviewer_comment: null,
    status: "submitted", freee_pushed: false, paid_at: null,
  },
  // c5 Acme Dev — マイルストーン請求 approved
  {
    id: "is-c5-1", contractor_id: "c5", work_record_id: "wr-c5-1",
    invoice_number: "ACM-2026-04-A",
    invoice_date: dayStr2(-1),
    amount: 1_500_000, currency: "JPY", amount_jpy: 1_500_000,
    file_name: "acme_milestone_SP-2.pdf", file_size_kb: 142,
    submitted_at: dayStr2(-1),
    reviewer_id: "e8", reviewed_at: dayStr2(0),
    reviewer_comment: "承認します。経理回しお願いします。",
    status: "approved", freee_pushed: true, paid_at: null,
  },
  // c6 Jane Carter — USD/SGD請求、提出済
  {
    id: "is-c6-1", contractor_id: "c6", work_record_id: "wr-c6-1",
    invoice_number: "JC-202604",
    invoice_date: dayStr2(0),
    amount: 6_240, currency: "SGD", amount_jpy: 705_120,
    file_name: "Jane_Carter_invoice_April.pdf", file_size_kb: 64,
    submitted_at: dayStr2(0),
    reviewer_id: null, reviewed_at: null, reviewer_comment: null,
    status: "submitted", freee_pushed: false, paid_at: null,
  },
  // c11 中川 翔 — 一次差し戻し
  {
    id: "is-c11-1", contractor_id: "c11", work_record_id: null,
    invoice_number: "Nakagawa-PR-04",
    invoice_date: dayStr2(-2),
    amount: 80_000, currency: "JPY", amount_jpy: 80_000,
    file_name: "請求書_中川_2026年4月.pdf", file_size_kb: 72,
    submitted_at: dayStr2(-2),
    reviewer_id: "e23", reviewed_at: dayStr2(-1),
    reviewer_comment: "請求書の宛先が「Green Carbon 株式会社」になっています。「Green Carbon Inc.」への修正をお願いします。",
    status: "rejected", freee_pushed: false, paid_at: null,
  },
];

export function workRecordsFor(contractorId: string): WorkRecord[] {
  return DEMO_WORK_RECORDS
    .filter((w) => w.contractor_id === contractorId)
    .sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""));
}

export function invoiceSubmissionsFor(contractorId: string): InvoiceSubmission[] {
  return DEMO_INVOICE_SUBMISSIONS
    .filter((i) => i.contractor_id === contractorId)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
}

export function pendingSubmissionsCount(): { workRecords: number; invoices: number } {
  return {
    workRecords: DEMO_WORK_RECORDS.filter((w) => w.status === "submitted").length,
    invoices: DEMO_INVOICE_SUBMISSIONS.filter((i) => i.status === "submitted").length,
  };
}

export function allPendingSubmissions(): {
  workRecords: WorkRecord[];
  invoices: InvoiceSubmission[];
} {
  return {
    workRecords: DEMO_WORK_RECORDS
      .filter((w) => w.status === "submitted")
      .sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "")),
    invoices: DEMO_INVOICE_SUBMISSIONS
      .filter((i) => i.status === "submitted")
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)),
  };
}

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: "下書き",
  submitted: "承認待ち",
  approved: "承認済",
  rejected: "差し戻し",
  paid: "支払済",
};

export const STATUS_CLS: Record<SubmissionStatus, string> = {
  draft: "border-gray-200 bg-gray-50 text-gray-700",
  submitted: "border-blue-200 bg-blue-50 text-blue-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  paid: "border-purple-200 bg-purple-50 text-purple-800",
};
