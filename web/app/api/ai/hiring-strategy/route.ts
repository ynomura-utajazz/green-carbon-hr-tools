import { NextResponse } from "next/server";
import { handleAi } from "@/lib/ai/handle";
import {
  buildHiringStrategyPrompt, DEMO_RESPONSES, type HiringStrategyInput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input: HiringStrategyInput;
  try { input = (await req.json()) as HiringStrategyInput; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }
  if (!input.business_priorities) {
    return NextResponse.json({ ok: false, error: "missing-priorities" }, { status: 400 });
  }
  return handleAi({
    req, useCase: "hiring-strategy",
    prompt: buildHiringStrategyPrompt(input),
    demoText: DEMO_RESPONSES.hiringStrategy,
    maxTokens: 1800, temperature: 0.4,
  });
}
