/**
 * POST /api/ai/recruiting-summary[?stream=1]
 * Body: CandidateInput
 */

import { NextResponse } from "next/server";
import { handleAi } from "@/lib/ai/handle";
import {
  buildCandidateSummaryPrompt, DEMO_RESPONSES, type CandidateInput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input: CandidateInput;
  try {
    input = (await req.json()) as CandidateInput;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }
  if (!input.name || !input.position || !input.interviewNotes) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }
  return handleAi({
    req,
    useCase: "recruiting-summary",
    prompt: buildCandidateSummaryPrompt(input),
    demoText: DEMO_RESPONSES.candidate,
    temperature: 0.4,
  });
}
