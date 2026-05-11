import { NextResponse } from "next/server";
import { handleAi } from "@/lib/ai/handle";
import {
  buildJdPrompt, DEMO_RESPONSES, type JdInput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input: JdInput;
  try { input = (await req.json()) as JdInput; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }
  if (!input.role_title || !Array.isArray(input.required_skills) || input.required_skills.length === 0) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }
  return handleAi({
    req, useCase: "jd-generator",
    prompt: buildJdPrompt(input),
    demoText: DEMO_RESPONSES.jd,
    maxTokens: 2000, temperature: 0.6,
  });
}
