import { NextResponse } from "next/server";
import { handleAi } from "@/lib/ai/handle";
import {
  buildCoachingPrompt, DEMO_RESPONSES, type CoachingInput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input: CoachingInput;
  try { input = (await req.json()) as CoachingInput; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!input.employee_name || !input.focus_topic) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  return handleAi({
    req, useCase: "ai-coaching",
    prompt: buildCoachingPrompt(input),
    demoText: DEMO_RESPONSES.coaching,
    maxTokens: 1500, temperature: 0.7,
  });
}
