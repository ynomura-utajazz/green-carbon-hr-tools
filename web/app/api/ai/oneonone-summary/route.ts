/**
 * POST /api/ai/oneonone-summary[?stream=1]
 * Body: OneOnOneInput
 */

import { NextResponse } from "next/server";
import { handleAi } from "@/lib/ai/handle";
import {
  buildOneOnOneSummaryPrompt, DEMO_RESPONSES, type OneOnOneInput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input: OneOnOneInput;
  try {
    input = (await req.json()) as OneOnOneInput;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }
  if (!input.managerName || !input.memberName || !input.rawNotes) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }
  return handleAi({
    req,
    useCase: "oneonone-summary",
    prompt: buildOneOnOneSummaryPrompt(input),
    demoText: DEMO_RESPONSES.oneonone,
    temperature: 0.3,
  });
}
