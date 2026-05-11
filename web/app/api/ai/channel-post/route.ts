import { NextResponse } from "next/server";
import { handleAi } from "@/lib/ai/handle";
import {
  buildChannelPostPrompt, DEMO_RESPONSES, type ChannelPostInput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input: ChannelPostInput;
  try { input = (await req.json()) as ChannelPostInput; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }
  if (!input.channel || !input.jd_text) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }
  return handleAi({
    req, useCase: "channel-post",
    prompt: buildChannelPostPrompt(input),
    demoText: DEMO_RESPONSES.channelPost,
    maxTokens: 1000, temperature: 0.7,
  });
}
