import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifySlackSignature } from "@/lib/integrations/slack-signing";

const SECRET = "test-signing-secret";

function signedHeaders(body: string, ts: number) {
  const base = `v0:${ts}:${body}`;
  const sig = `v0=${createHmac("sha256", SECRET).update(base).digest("hex")}`;
  return { signature: sig, timestamp: String(ts) };
}

describe("verifySlackSignature", () => {
  it("正しい署名 + 5 分以内 → ok", () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = '{"type":"url_verification","challenge":"abc"}';
    const { signature, timestamp } = signedHeaders(body, ts);

    const r = verifySlackSignature({
      signingSecret: SECRET,
      rawBody: body,
      signature,
      timestamp,
    });
    expect(r.ok).toBe(true);
  });

  it("署名不一致 → 失敗", () => {
    const ts = Math.floor(Date.now() / 1000);
    const r = verifySlackSignature({
      signingSecret: SECRET,
      rawBody: "{}",
      signature: "v0=tampered_signature_value_with_correct_length___________________",
      timestamp: String(ts),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("signature-mismatch");
  });

  it("タイムスタンプが 5 分超 → 失敗", () => {
    const oldTs = Math.floor(Date.now() / 1000) - 6 * 60;
    const body = "{}";
    const { signature, timestamp } = signedHeaders(body, oldTs);

    const r = verifySlackSignature({
      signingSecret: SECRET,
      rawBody: body,
      signature,
      timestamp,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("timestamp-out-of-window");
  });

  it("ヘッダ欠落 → 失敗", () => {
    const r = verifySlackSignature({
      signingSecret: SECRET,
      rawBody: "{}",
      signature: null,
      timestamp: null,
    });
    expect(r.ok).toBe(false);
  });
});
