/**
 * POST /api/ai/dashboard-narrative[?stream=1]
 * Body: DashboardInput
 */

import { NextResponse } from "next/server";
import { handleAi } from "@/lib/ai/handle";
import {
  buildDashboardNarrativePrompt, DEMO_RESPONSES, type DashboardInput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input: DashboardInput;
  try {
    input = (await req.json()) as DashboardInput;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }
  if (!input.period || typeof input.totalHeadcount !== "number") {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }
  return handleAi({
    req,
    useCase: "dashboard-narrative",
    prompt: buildDashboardNarrativePrompt(input),
    demoText: DEMO_RESPONSES.dashboard,
    maxTokens: 800,
    temperature: 0.4,
  });
}
