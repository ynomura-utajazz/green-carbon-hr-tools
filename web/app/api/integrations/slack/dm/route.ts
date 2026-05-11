/**
 * POST /api/integrations/slack/dm
 *
 * Body: { slackUserId?: string; email?: string; text: string }
 *
 * デモモード or 未接続時は { ok: false, fallback: "url" } を返し、
 * クライアント側は既存の slack:// URL ハックにフォールバック。
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { sendSlackDm } from "@/lib/integrations/slack-api";
import { resolveSlackBotToken } from "@/lib/integrations/token-resolver";
import type { SendDmInput } from "@/lib/integrations/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: SendDmInput;
  try {
    body = (await req.json()) as SendDmInput;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  if (!body.text || (!body.slackUserId && !body.email)) {
    return NextResponse.json(
      { ok: false, error: "missing-fields" },
      { status: 400 },
    );
  }

  const token = await resolveSlackBotToken();
  if (isDemoMode() || !token) {
    return NextResponse.json({
      ok: false,
      fallback: "url" as const,
      message:
        "Slack 未接続。クライアント側で slack:// URL を開くフォールバックを使ってください。",
    });
  }

  const result = await sendSlackDm(body);
  return NextResponse.json(result);
}
