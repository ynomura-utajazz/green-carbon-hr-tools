/**
 * POST /api/recruiting/buddy-match
 * Body: BuddyMatchInput
 */

import { NextResponse } from "next/server";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_TALENT_PROFILES } from "@/lib/demo/talent-profiles";
import { findBuddies, type BuddyMatchInput } from "@/lib/recruiting/buddy-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: BuddyMatchInput;
  try { body = (await req.json()) as BuddyMatchInput; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }
  if (!body.new_hire_role || !body.new_hire_department_id) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  const matches = findBuddies(body, DEMO_EMPLOYEES, DEMO_TALENT_PROFILES);
  return NextResponse.json({ ok: true, matches });
}
