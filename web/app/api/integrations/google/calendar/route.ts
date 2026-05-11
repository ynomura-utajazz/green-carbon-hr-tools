/**
 * POST /api/integrations/google/calendar
 *
 * Body: CreateEventInput + { accessToken: string }
 *
 * デモモード or 未接続時は { ok: false, fallback: "template-url" } を返し、
 * クライアント側は既存の Google Calendar URL TEMPLATE にフォールバック。
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { createCalendarEvent } from "@/lib/integrations/google-api";
import { getGoogleConfig } from "@/lib/integrations/config";
import type { CreateEventInput } from "@/lib/integrations/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = CreateEventInput & { accessToken?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  if (!body.title || !body.start || !body.end) {
    return NextResponse.json(
      { ok: false, error: "missing-fields" },
      { status: 400 },
    );
  }

  if (isDemoMode() || !getGoogleConfig() || !body.accessToken) {
    return NextResponse.json({
      ok: false,
      fallback: "template-url" as const,
      message:
        "Google Calendar 未接続。クライアント側で /lib/google-calendar.ts の createGoogleCalendarEventUrl を使ってください。",
    });
  }

  const result = await createCalendarEvent(body, body.accessToken);
  return NextResponse.json(result);
}
