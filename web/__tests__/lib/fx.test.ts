import { describe, it, expect } from "vitest";
import {
  computePaymentBreakdown,
  jpyValue,
  withholdingRate,
  recommendedTransferMethod,
} from "@/lib/fx";

describe("withholdingRate", () => {
  it("n_a → 0", () => {
    expect(withholdingRate("n_a")).toBe(0);
  });

  it("exempt_corporate / exempt_treaty → 0", () => {
    expect(withholdingRate("exempt_corporate")).toBe(0);
    expect(withholdingRate("exempt_treaty")).toBe(0);
  });

  it("standard_japan_20_42 → 20.42%", () => {
    expect(withholdingRate("standard_japan_20_42")).toBeCloseTo(0.2042, 4);
  });

  it("reduced_treaty_10 → 10%", () => {
    expect(withholdingRate("reduced_treaty_10")).toBe(0.1);
  });

  it("reduced_treaty_15 → 15%", () => {
    expect(withholdingRate("reduced_treaty_15")).toBe(0.15);
  });
});

describe("jpyValue", () => {
  it("JPY はそのまま返す", () => {
    expect(jpyValue(10_000, "JPY")).toBe(10_000);
  });

  it("USD * rate で換算", () => {
    expect(jpyValue(100, "USD", 150)).toBe(15_000);
  });

  it("未知通貨は元値を返す", () => {
    expect(jpyValue(1, "ZZZ" as never, undefined)).toBeTypeOf("number");
  });
});

describe("computePaymentBreakdown", () => {
  it("USD 1000、源泉なし、為替変動による差額を計算", () => {
    const r = computePaymentBreakdown({
      invoiceAmount: 1_000,
      invoiceCurrency: "USD",
      fxRateInvoiceDate: 150,
      fxRatePaymentDate: 155,
      withholdingPolicy: "n_a",
      paymentMethod: "wise",
    });

    expect(r.jpy_at_invoice).toBe(150_000);
    expect(r.jpy_at_payment).toBe(155_000);
    expect(r.fx_diff_jpy).toBe(5_000);
    expect(r.withholding_local).toBe(0);
    expect(r.net_received_local).toBe(1_000);
  });

  it("源泉徴収あり（20.42%）", () => {
    const r = computePaymentBreakdown({
      invoiceAmount: 100_000,
      invoiceCurrency: "JPY",
      fxRateInvoiceDate: 1,
      fxRatePaymentDate: 1,
      withholdingPolicy: "standard_japan_20_42",
      paymentMethod: "domestic_bank",
    });

    expect(r.withholding_local).toBeCloseTo(20_420, 0);
    expect(r.net_received_local).toBeCloseTo(79_580, 0);
  });

  it("送金手数料が total_cost_jpy に上乗せされる", () => {
    const r = computePaymentBreakdown({
      invoiceAmount: 1_000,
      invoiceCurrency: "USD",
      fxRateInvoiceDate: 150,
      fxRatePaymentDate: 150,
      withholdingPolicy: "n_a",
      paymentMethod: "swift",
    });

    expect(r.total_cost_jpy).toBeGreaterThan(r.jpy_at_payment);
    expect(r.transfer_fee_jpy).toBeGreaterThan(0);
  });
});

describe("recommendedTransferMethod", () => {
  it("JPY → domestic_bank を推奨", () => {
    expect(recommendedTransferMethod("JPY", 100_000)).toBe("domestic_bank");
  });

  it("USD 高額 → swift を推奨", () => {
    expect(recommendedTransferMethod("USD", 5_000_000)).toBe("swift");
  });

  it("USD 中小額 → wise を推奨", () => {
    expect(recommendedTransferMethod("USD", 1_000)).toBe("wise");
  });
});
