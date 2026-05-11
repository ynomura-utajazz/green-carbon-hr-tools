/**
 * POST /api/recruiting/similar-employees
 * Body: { candidate: Pick<Candidate, ...> }
 *
 * 候補者と社員の類似度を計算し、上位 N 名を返す（活躍人材は別フラグ）。
 */

import { NextResponse } from "next/server";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_TALENT_PROFILES } from "@/lib/demo/talent-profiles";
import { computeCandidateSimilarity } from "@/lib/recruiting/similarity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { candidate: Parameters<typeof computeCandidateSimilarity>[0] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }
  if (!body.candidate) {
    return NextResponse.json({ ok: false, error: "missing-candidate" }, { status: 400 });
  }

  const empMap = new Map(DEMO_EMPLOYEES.map((e) => [e.id, e]));
  const pairs = DEMO_TALENT_PROFILES
    .map((p) => ({ profile: p, emp: empMap.get(p.employee_id) }))
    .filter((x): x is { profile: typeof DEMO_TALENT_PROFILES[number]; emp: typeof DEMO_EMPLOYEES[number] } => Boolean(x.emp));

  const all = computeCandidateSimilarity(body.candidate, pairs);

  return NextResponse.json({
    ok: true,
    top_overall: all.slice(0, 5),
    top_high_performers: all.filter((s) => s.is_high_performer).slice(0, 3),
  });
}
