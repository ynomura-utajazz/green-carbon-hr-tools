/**
 * 為替・送金手数料・源泉徴収（租税条約）のヘルパ。
 *
 * 本番では：
 *  - 為替レートは ExchangeRate-API / Open Exchange Rates / 三菱UFJ TTM などを毎営業日取得
 *  - 送金手数料は Wise API / 銀行 API でリアルタイム見積
 *  - 源泉徴収率は国税庁の租税条約表を内部DBで保持
 *
 * デモでは現実的なサンプル値を埋め込んで挙動を再現。
 */

export type Currency = "JPY" | "USD" | "EUR" | "GBP" | "SGD" | "AUD" | "CNY" | "KRW" | "INR" | "PHP" | "VND" | "MYR" | "THB" | "IDR";

export type PaymentMethod = "domestic_bank" | "swift" | "wise" | "payoneer" | "stripe";

export type WithholdingPolicy =
  | "exempt_corporate"           // 法人 → 不要
  | "exempt_treaty"              // 租税条約により免除（居住者証明書あり）
  | "reduced_treaty_10"          // 租税条約により 10%
  | "reduced_treaty_15"          // 15%
  | "standard_japan_20_42"       // 国内源泉所得 20.42%（個人・原則）
  | "non_resident_no_pe"         // 非居住者で日本国内源泉に該当しない
  | "n_a";

// ─── 為替レート（TTM 風 demo データ） ────
// 1 unit foreign = X JPY
type FxRate = {
  rate: number;          // 中値 (TTM)
  asOf: string;          // ISO date
  delta_1d_pct: number;  // 前日比 %
  delta_30d_pct: number; // 30日比 %
};

export const FX_RATES: Record<Currency, FxRate> = {
  JPY: { rate: 1.0,    asOf: "2026-05-08", delta_1d_pct: 0,    delta_30d_pct: 0 },
  USD: { rate: 150.42, asOf: "2026-05-08", delta_1d_pct: 0.18, delta_30d_pct: 1.92 },
  EUR: { rate: 165.30, asOf: "2026-05-08", delta_1d_pct: -0.05, delta_30d_pct: 2.41 },
  GBP: { rate: 192.05, asOf: "2026-05-08", delta_1d_pct: 0.08, delta_30d_pct: 1.55 },
  SGD: { rate: 113.45, asOf: "2026-05-08", delta_1d_pct: 0.12, delta_30d_pct: 1.67 },
  AUD: { rate: 99.20,  asOf: "2026-05-08", delta_1d_pct: -0.21, delta_30d_pct: -0.43 },
  CNY: { rate: 21.05,  asOf: "2026-05-08", delta_1d_pct: 0.04, delta_30d_pct: 0.88 },
  KRW: { rate: 0.111,  asOf: "2026-05-08", delta_1d_pct: -0.10, delta_30d_pct: 0.55 },
  INR: { rate: 1.81,   asOf: "2026-05-08", delta_1d_pct: 0.09, delta_30d_pct: 1.20 },
  PHP: { rate: 2.62,   asOf: "2026-05-08", delta_1d_pct: 0.05, delta_30d_pct: 0.75 },
  VND: { rate: 0.0061, asOf: "2026-05-08", delta_1d_pct: 0.02, delta_30d_pct: 0.30 },
  MYR: { rate: 32.85,  asOf: "2026-05-08", delta_1d_pct: 0.16, delta_30d_pct: 1.40 },
  THB: { rate: 4.18,   asOf: "2026-05-08", delta_1d_pct: 0.07, delta_30d_pct: 0.92 },
  IDR: { rate: 0.0094, asOf: "2026-05-08", delta_1d_pct: 0.01, delta_30d_pct: 0.45 },
};

export function jpyValue(amount: number, currency: string, rate?: number): number {
  const r = rate ?? FX_RATES[currency as Currency]?.rate ?? 1;
  return Math.round(amount * r);
}

// ─── 送金手数料 ──────────────────────────
type TransferMethodSpec = {
  label: string;
  description: string;
  flat_fee_jpy: number;     // 固定手数料
  percent_fee: number;       // 中間FX/手数料の割合（%）
  estimated_days: number;    // 着金日数
  supports: ("domestic" | "international")[];
  fx_markup_bps?: number;     // 為替スプレッド (basis points)
};

export const TRANSFER_METHODS: Record<PaymentMethod, TransferMethodSpec> = {
  domestic_bank: {
    label: "国内銀行振込",
    description: "三井住友銀行 / みずほ銀行 / 三菱UFJ。同行内は無料、他行宛で 330円〜660円",
    flat_fee_jpy: 440,
    percent_fee: 0,
    estimated_days: 0,
    supports: ["domestic"],
  },
  swift: {
    label: "海外送金 (SWIFT)",
    description: "従来型の銀行国際送金。コルレス銀行手数料込みで 5,000〜7,500 円。着金 2〜5 営業日",
    flat_fee_jpy: 6500,
    percent_fee: 0,
    estimated_days: 4,
    supports: ["international"],
    fx_markup_bps: 250,
  },
  wise: {
    label: "Wise (旧 TransferWise)",
    description: "中値レート + 透明な定率手数料。着金 1〜2 営業日。複数通貨保有可能",
    flat_fee_jpy: 0,
    percent_fee: 0.65,  // 0.65%
    estimated_days: 1,
    supports: ["international"],
    fx_markup_bps: 0,
  },
  payoneer: {
    label: "Payoneer",
    description: "受取側がアカウント保有。フリーランスに人気。受取側で換金時に手数料",
    flat_fee_jpy: 0,
    percent_fee: 1.0,
    estimated_days: 1,
    supports: ["international"],
    fx_markup_bps: 200,
  },
  stripe: {
    label: "Stripe Connect",
    description: "Stripe アカウント経由の送金。北米中心",
    flat_fee_jpy: 0,
    percent_fee: 0.25,
    estimated_days: 2,
    supports: ["international"],
    fx_markup_bps: 100,
  },
};

export function calcTransferFee(
  method: PaymentMethod,
  amountJpy: number,
): { fee_jpy: number; markup_jpy: number; total_cost_jpy: number; estimated_days: number } {
  const spec = TRANSFER_METHODS[method];
  const fee_jpy = spec.flat_fee_jpy + Math.round(amountJpy * (spec.percent_fee / 100));
  const markup_jpy = Math.round(amountJpy * ((spec.fx_markup_bps ?? 0) / 10_000));
  return {
    fee_jpy,
    markup_jpy,
    total_cost_jpy: fee_jpy + markup_jpy,
    estimated_days: spec.estimated_days,
  };
}

// ─── 源泉徴収（租税条約） ────────────────
type CountryWithholdingDefault = {
  has_treaty: boolean;
  default_policy: WithholdingPolicy;
  treaty_note: string;
};

// 日本との租税条約・源泉徴収率（簡略表）
export const COUNTRY_WITHHOLDING: Record<string, CountryWithholdingDefault> = {
  JP: { has_treaty: false, default_policy: "n_a", treaty_note: "国内取引（源泉徴収は別ルール）" },
  US: { has_treaty: true, default_policy: "exempt_treaty", treaty_note: "日米租税条約：人的役務提供は条件次第で免除（PE要件）" },
  GB: { has_treaty: true, default_policy: "exempt_treaty", treaty_note: "日英租税条約：人的役務提供は条件次第で免除" },
  DE: { has_treaty: true, default_policy: "exempt_treaty", treaty_note: "日独租税条約：人的役務提供は条件次第で免除" },
  SG: { has_treaty: true, default_policy: "exempt_treaty", treaty_note: "日星租税条約：人的役務提供は条件次第で免除" },
  AU: { has_treaty: true, default_policy: "reduced_treaty_10", treaty_note: "日豪租税条約：使用料・人的役務 10%" },
  IN: { has_treaty: true, default_policy: "reduced_treaty_10", treaty_note: "日印租税条約：人的役務提供 10%（技術役務料）" },
  CN: { has_treaty: true, default_policy: "reduced_treaty_10", treaty_note: "日中租税条約：使用料・利子 10%" },
  KR: { has_treaty: true, default_policy: "reduced_treaty_10", treaty_note: "日韓租税条約：使用料 10%" },
  PH: { has_treaty: true, default_policy: "reduced_treaty_15", treaty_note: "日比租税条約：使用料 15%" },
  VN: { has_treaty: true, default_policy: "reduced_treaty_10", treaty_note: "日越租税条約：技術役務料 10%" },
  MY: { has_treaty: true, default_policy: "reduced_treaty_10", treaty_note: "日馬租税条約：使用料・技術料 10%" },
  TH: { has_treaty: true, default_policy: "reduced_treaty_15", treaty_note: "日タイ租税条約：使用料 15%" },
  ID: { has_treaty: true, default_policy: "reduced_treaty_10", treaty_note: "日尼租税条約：使用料・技術料 10%" },
  RU: { has_treaty: true, default_policy: "exempt_treaty", treaty_note: "日露租税条約：人的役務提供は条件次第で免除" },
  UA: { has_treaty: true, default_policy: "reduced_treaty_10", treaty_note: "日ウ租税条約：使用料 10%" },
};

export function withholdingRate(policy: WithholdingPolicy): number {
  switch (policy) {
    case "exempt_corporate":
    case "exempt_treaty":
    case "non_resident_no_pe":
    case "n_a":
      return 0;
    case "reduced_treaty_10": return 0.10;
    case "reduced_treaty_15": return 0.15;
    case "standard_japan_20_42": return 0.2042;
  }
}

export function withholdingPolicyLabel(policy: WithholdingPolicy): string {
  return {
    exempt_corporate: "法人 → 源泉不要",
    exempt_treaty: "租税条約 免除（居住者証明書要）",
    reduced_treaty_10: "租税条約 軽減 10%",
    reduced_treaty_15: "租税条約 軽減 15%",
    standard_japan_20_42: "国内源泉 20.42%（個人）",
    non_resident_no_pe: "非居住者・国内源泉外",
    n_a: "該当なし",
  }[policy];
}

// ─── 支払い計算（メイン関数） ────────────
export type PaymentBreakdown = {
  invoice_amount: number;
  invoice_currency: string;

  fx_rate_invoice_date: number;        // 請求日のレート
  fx_rate_payment_date: number;        // 支払日のレート（今日想定）
  jpy_at_invoice: number;
  jpy_at_payment: number;
  fx_diff_jpy: number;                 // 為替差損益
  fx_diff_pct: number;

  withholding_policy: WithholdingPolicy;
  withholding_rate: number;
  withholding_local: number;           // 元通貨での源泉
  withholding_jpy: number;

  payment_method: PaymentMethod;
  transfer_fee_jpy: number;            // 振込手数料
  fx_markup_jpy: number;               // 為替スプレッド分
  estimated_days: number;

  // 結果
  net_received_local: number;          // 委託先が現地通貨で受け取る金額
  net_received_jpy: number;            // JPY換算
  total_cost_jpy: number;              // 当社の総支出 (JPY)
};

export function computePaymentBreakdown(opts: {
  invoiceAmount: number;
  invoiceCurrency: string;
  fxRateInvoiceDate: number;       // 請求日のレート（過去）
  fxRatePaymentDate?: number;      // 省略時は今のレート
  withholdingPolicy: WithholdingPolicy;
  paymentMethod: PaymentMethod;
}): PaymentBreakdown {
  const fxNow = opts.fxRatePaymentDate ?? FX_RATES[opts.invoiceCurrency as Currency]?.rate ?? 1;
  const jpyAtInvoice = opts.invoiceAmount * opts.fxRateInvoiceDate;
  const jpyAtPayment = opts.invoiceAmount * fxNow;

  const wRate = withholdingRate(opts.withholdingPolicy);
  const withholdingLocal = opts.invoiceAmount * wRate;
  const netLocal = opts.invoiceAmount - withholdingLocal;

  const transfer = calcTransferFee(opts.paymentMethod, jpyAtPayment);
  const netJpy = netLocal * fxNow;
  const totalCostJpy = jpyAtPayment + transfer.fee_jpy + transfer.markup_jpy;

  return {
    invoice_amount: opts.invoiceAmount,
    invoice_currency: opts.invoiceCurrency,
    fx_rate_invoice_date: opts.fxRateInvoiceDate,
    fx_rate_payment_date: fxNow,
    jpy_at_invoice: Math.round(jpyAtInvoice),
    jpy_at_payment: Math.round(jpyAtPayment),
    fx_diff_jpy: Math.round(jpyAtPayment - jpyAtInvoice),
    fx_diff_pct: ((fxNow - opts.fxRateInvoiceDate) / opts.fxRateInvoiceDate) * 100,
    withholding_policy: opts.withholdingPolicy,
    withholding_rate: wRate,
    withholding_local: Math.round(withholdingLocal * 100) / 100,
    withholding_jpy: Math.round(withholdingLocal * fxNow),
    payment_method: opts.paymentMethod,
    transfer_fee_jpy: transfer.fee_jpy,
    fx_markup_jpy: transfer.markup_jpy,
    estimated_days: transfer.estimated_days,
    net_received_local: Math.round(netLocal * 100) / 100,
    net_received_jpy: Math.round(netJpy),
    total_cost_jpy: Math.round(totalCostJpy),
  };
}

export function fmtFx(amount: number, currency: string): string {
  if (currency === "JPY") return `¥${amount.toLocaleString()}`;
  const sym = { USD: "$", EUR: "€", GBP: "£", SGD: "S$", AUD: "A$", CNY: "¥", KRW: "₩" }[currency] ?? `${currency} `;
  const decimals = ["JPY", "KRW", "VND", "IDR"].includes(currency) ? 0 : 2;
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function recommendedTransferMethod(currency: string, amount: number): PaymentMethod {
  if (currency === "JPY") return "domestic_bank";
  // 中規模以下は Wise、大型は SWIFT 推奨（コンプラ・追跡性）
  const jpyAmt = jpyValue(amount, currency);
  if (jpyAmt > 3_000_000) return "swift";
  return "wise";
}

export function recommendedWithholding(
  countryCode: string,
  contractorType: "individual" | "corporate",
): WithholdingPolicy {
  if (countryCode === "JP") return "n_a";  // 国内は別ルール（インボイス制度）
  if (contractorType === "corporate") return "exempt_corporate";
  return COUNTRY_WITHHOLDING[countryCode]?.default_policy ?? "non_resident_no_pe";
}
