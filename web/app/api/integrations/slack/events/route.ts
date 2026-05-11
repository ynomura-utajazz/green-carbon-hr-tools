/**
 * POST /api/integrations/slack/events
 *
 * Slack Events API の受信エンドポイント。
 *
 *   1. 署名検証（X-Slack-Signature + Timestamp）
 *   2. url_verification チャレンジに challenge をそのまま返す
 *   3. event_callback はディスパッチ（現状はログのみ。将来 team_join → 自動オンボーディング、user_change → 名簿同期 等に拡張）
 *
 * Slack 側で Event Subscriptions の Request URL に
 *   https://<your-domain>/api/integrations/slack/events
 * を登録すると、Slack が一度だけ url_verification を投げてきます。
 */

import { NextResponse } from "next/server";
import { verifySlackSignature } from "@/lib/integrations/slack-signing";
import {
  handleTeamJoin, handleUserChange, handleAppUninstalled,
} from "@/lib/integrations/slack-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 個別イベントの最低限の型。詳細フィールドは handler 側で参照する
type AnyEvent = { type: string; [k: string]: unknown };

type SlackEventEnvelope =
  | { type: "url_verification"; challenge: string }
  | {
      type: "event_callback";
      team_id?: string;
      event: AnyEvent;
    };

export async function POST(req: Request) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  // raw body 必須（再 stringify すると署名がズレる）
  const rawBody = await req.text();
  const verify = verifySlackSignature({
    signingSecret,
    rawBody,
    timestamp: req.headers.get("x-slack-request-timestamp"),
    signature: req.headers.get("x-slack-signature"),
  });

  if (!verify.ok) {
    return NextResponse.json({ error: verify.reason }, { status: 401 });
  }

  let payload: SlackEventEnvelope;
  try {
    payload = JSON.parse(rawBody) as SlackEventEnvelope;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  // 1. url_verification: challenge をそのまま返す（Slack 側 onboarding）
  if (payload.type === "url_verification") {
    return new NextResponse(payload.challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // 2. event_callback: 種別ごとにディスパッチ
  if (payload.type === "event_callback") {
    const ev = payload.event;
    console.info("[slack-events]", ev.type, { team_id: payload.team_id });

    // ハンドラを fire-and-forget。Slack は 3 秒以内 2xx を要求するため即応答。
    // 失敗しても Slack 側からは成功に見える（DB 書きの監視は別途必要）。
    void dispatch(payload).catch((e) => {
      console.error("[slack-events] handler failed", ev.type, e);
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: true });
}

async function dispatch(env: { type: "event_callback"; team_id?: string; event: AnyEvent }) {
  const ev = env.event;
  switch (ev.type) {
    case "team_join":
      // @ts-expect-error 型ガードは handler 側
      await handleTeamJoin(ev);
      return;
    case "user_change":
      // @ts-expect-error 型ガードは handler 側
      await handleUserChange(ev);
      return;
    case "app_uninstalled":
      await handleAppUninstalled({ type: "app_uninstalled", team_id: env.team_id });
      return;
    default:
      return;
  }
}
