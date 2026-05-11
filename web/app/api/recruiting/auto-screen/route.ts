/**
 * POST /api/recruiting/auto-screen
 * Body: { candidate: Candidate }
 *
 * 自動判定（advance / review / park / reject）+ 理由・フラグを返す。
 */

import { NextResponse } from "next/server";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_POSITIONS, type Candidate } from "@/lib/demo/recruiting";
import { DEMO_TALENT_PROFILES } from "@/lib/demo/talent-profiles";
import { autoScreen } from "@/lib/recruiting/auto-screen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { candidate: Candidate };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }
  if (!body.candidate) {
    return NextResponse.json({ ok: false, error: "missing-candidate" }, { status: 400 });
  }

  const result = autoScreen(
    body.candidate,
    DEMO_POSITIONS,
    DEMO_EMPLOYEES.map((e) => ({ id: e.id, full_name: e.full_name, job_title: e.job_title })),
    DEMO_TALENT_PROFILES,
  );

  return NextResponse.json({ ok: true, result });
}
