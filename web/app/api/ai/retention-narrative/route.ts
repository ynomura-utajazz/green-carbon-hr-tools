/**
 * POST /api/ai/retention-narrative[?stream=1]
 * Body: RetentionInput
 */

import { NextResponse } from "next/server";
import { handleAi } from "@/lib/ai/handle";
import {
  buildRetentionNarrativePrompt, DEMO_RESPONSES, type RetentionInput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input: RetentionInput;
  try {
    input = (await req.json()) as RetentionInput;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }
  if (!input.employeeName || !Array.isArray(input.signals)) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }
  return handleAi({
    req,
    useCase: "retention-narrative",
    prompt: buildRetentionNarrativePrompt(input),
    demoText: DEMO_RESPONSES.retention,
    maxTokens: 1400,
    temperature: 0.4,
  });
}
