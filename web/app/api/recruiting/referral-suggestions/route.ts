/**
 * GET /api/recruiting/referral-suggestions[?employeeId=...]
 *
 * employeeId 指定なし → 全社員 × 全候補者の Top 10 マッチ
 * employeeId 指定あり → その社員の Top 5 サジェスト
 */

import { NextResponse } from "next/server";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_TALENT_PROFILES, DEMO_STRATEGIC_GAPS } from "@/lib/demo/talent-profiles";
import { DEMO_EXTERNAL_POOL } from "@/lib/demo/external-pool";
import { suggestForEmployee, topReferralChances } from "@/lib/recruiting/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");

  const profileMap = new Map(DEMO_TALENT_PROFILES.map((p) => [p.employee_id, p]));

  if (employeeId) {
    const emp = DEMO_EMPLOYEES.find((e) => e.id === employeeId);
    const profile = profileMap.get(employeeId);
    if (!emp || !profile) {
      return NextResponse.json({ ok: false, error: "employee-not-found" }, { status: 404 });
    }
    const suggestions = suggestForEmployee(emp, profile, DEMO_EXTERNAL_POOL, DEMO_STRATEGIC_GAPS, 5);
    return NextResponse.json({ ok: true, suggestions });
  }

  // 全社員での top
  const pairs = DEMO_EMPLOYEES
    .filter((e) => e.status === "active")
    .map((emp) => {
      const profile = profileMap.get(emp.id);
      return profile ? { employee: emp, profile } : null;
    })
    .filter((x): x is { employee: typeof DEMO_EMPLOYEES[number]; profile: typeof DEMO_TALENT_PROFILES[number] } => x !== null);

  const top = topReferralChances(pairs, DEMO_EXTERNAL_POOL, DEMO_STRATEGIC_GAPS, 15);
  return NextResponse.json({ ok: true, top });
}
