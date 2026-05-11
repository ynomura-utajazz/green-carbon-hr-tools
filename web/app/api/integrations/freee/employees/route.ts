/**
 * GET /api/integrations/freee/employees?company_id=NN
 *
 * freee から社員マスタを取得。
 * デモモード or 未接続時はデモデータをそのまま返す。
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { listFreeeEmployees } from "@/lib/integrations/freee-api";
import { getFreeeConfig } from "@/lib/integrations/config";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = Number(url.searchParams.get("company_id"));

  if (isDemoMode() || !getFreeeConfig()?.accessToken) {
    return NextResponse.json({
      demo: true,
      employees: DEMO_EMPLOYEES.map((e) => ({
        id: parseInt(e.id.replace(/\D/g, ""), 10) || 0,
        num: e.employee_code,
        display_name: e.full_name,
        entry_date: e.hire_date,
        retire_date: null,
        email: e.email,
      })),
    });
  }

  if (!companyId) {
    return NextResponse.json(
      { error: "missing company_id" },
      { status: 400 },
    );
  }

  const result = await listFreeeEmployees(companyId);
  if ("_error" in result) {
    return NextResponse.json({ error: result._error }, { status: 502 });
  }
  return NextResponse.json({ demo: false, employees: result });
}
