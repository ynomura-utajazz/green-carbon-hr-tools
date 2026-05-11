/**
 * POST /api/ai/talent-pool-message[?stream=1]
 * Body: TalentReactivateInput
 */

import { NextResponse } from "next/server";
import { handleAi } from "@/lib/ai/handle";
import {
  buildTalentReactivatePrompt, DEMO_RESPONSES, type TalentReactivateInput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input: TalentReactivateInput;
  try { input = (await req.json()) as TalentReactivateInput; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!input.candidate_name || !input.kind || !input.past_event) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  return handleAi({
    req, useCase: "talent-reactivate",
    prompt: buildTalentReactivatePrompt(input),
    demoText: DEMO_RESPONSES.talentReactivate,
    maxTokens: 800, temperature: 0.7,
  });
}
