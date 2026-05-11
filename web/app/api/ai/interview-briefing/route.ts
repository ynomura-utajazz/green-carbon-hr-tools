/**
 * POST /api/ai/interview-briefing[?stream=1]
 * Body: InterviewBriefingInput
 *
 * 面接前の Markdown ブリーフィングを返す。ストリーミング推奨。
 */

import { NextResponse } from "next/server";
import { handleAi } from "@/lib/ai/handle";
import {
  buildInterviewBriefingPrompt, DEMO_RESPONSES, type InterviewBriefingInput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input: InterviewBriefingInput;
  try { input = (await req.json()) as InterviewBriefingInput; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!input.candidate_name || !input.position_title || !input.interviewer_name) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  return handleAi({
    req, useCase: "interview-briefing",
    prompt: buildInterviewBriefingPrompt(input),
    demoText: DEMO_RESPONSES.interviewBriefing,
    maxTokens: 1500, temperature: 0.4,
  });
}
