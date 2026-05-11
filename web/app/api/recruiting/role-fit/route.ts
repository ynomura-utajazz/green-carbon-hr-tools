/**
 * POST /api/recruiting/role-fit
 * Body: { candidate }
 *
 * 候補者を全 open ポジションに対してスコアリングし、降順で返す。
 */

import { NextResponse } from "next/server";
import { DEMO_POSITIONS } from "@/lib/demo/recruiting";
import { computeRoleFit } from "@/lib/recruiting/role-fit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { candidate: Parameters<typeof computeRoleFit>[0] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }
  if (!body.candidate) {
    return NextResponse.json({ ok: false, error: "missing-candidate" }, { status: 400 });
  }

  const fits = computeRoleFit(body.candidate, DEMO_POSITIONS);
  return NextResponse.json({ ok: true, fits });
}
