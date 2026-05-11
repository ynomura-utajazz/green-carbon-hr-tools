/**
 * Slack Events API のリクエスト署名検証。
 *
 * 仕様：
 *   https://api.slack.com/authentication/verifying-requests-from-slack
 *
 *   sig_basestring = "v0:" + timestamp + ":" + raw_body
 *   expected = "v0=" + hex(HMAC_SHA256(SLACK_SIGNING_SECRET, sig_basestring))
 *   compare with X-Slack-Signature header (timing-safe)
 *
 *   timestamp は ±5 分以内であること（リプレイ攻撃対策）
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const FIVE_MIN_SEC = 5 * 60;

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function verifySlackSignature(opts: {
  signingSecret: string;
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  now?: number; // testing 用
}): VerifyResult {
  const { signingSecret, rawBody, timestamp, signature } = opts;
  if (!timestamp || !signature) {
    return { ok: false, reason: "missing-headers" };
  }
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad-timestamp" };

  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  if (Math.abs(now - ts) > FIVE_MIN_SEC) {
    return { ok: false, reason: "timestamp-out-of-window" };
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const computed = `v0=${createHmac("sha256", signingSecret).update(base).digest("hex")}`;

  // 長さが違うと timingSafeEqual が throw するので事前チェック
  if (computed.length !== signature.length) {
    return { ok: false, reason: "signature-mismatch" };
  }
  const a = Buffer.from(computed);
  const b = Buffer.from(signature);
  if (!timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature-mismatch" };
  }
  return { ok: true };
}
