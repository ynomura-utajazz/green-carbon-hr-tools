/**
 * /admin/audit-log
 *
 * 監査ログ閲覧画面（HR 管理者向け）。
 *
 * - 直近 200 件をテーブル表示
 * - actor / action / resource_type で絞り込み
 * - diff は JSON プレビューでホバー展開
 *
 * RLS：HR 管理者のみ select 可（schema 側で設定済み）
 * デモモード時はモックデータを返す。
 */

import { isDemoMode } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { AuditLogClient, type AuditRow } from "./audit-log-client";

export const dynamic = "force-dynamic";

const DEMO_ROWS: AuditRow[] = [
  { id: 1, action: "update", resource_type: "employees", resource_id: "e15", actor_name: "高橋 真由", created_at: minutesAgo(8), diff: { job_title: ["シニアエンジニア", "テックリード"] } },
  { id: 2, action: "create", resource_type: "one_on_ones", resource_id: "ses_2026-05-09T03:00", actor_name: "野村 裕太", created_at: minutesAgo(34), diff: null },
  { id: 3, action: "update", resource_type: "compensation_history", resource_id: "comp_e6", actor_name: "鎌田 彩",   created_at: hoursAgo(2),   diff: { base_annual: [9_000_000, 9_500_000] } },
  { id: 4, action: "view",   resource_type: "salary_band", resource_id: "S4", actor_name: "高橋 真由", created_at: hoursAgo(3) },
  { id: 5, action: "delete", resource_type: "candidates", resource_id: "cand-99", actor_name: "塚本 真純", created_at: hoursAgo(5),   diff: { stage: "withdrawn" } },
  { id: 6, action: "update", resource_type: "integration_tokens", resource_id: "slack:T01GREENCARBON", actor_name: "system", created_at: hoursAgo(8), diff: { rotated: true } },
  { id: 7, action: "create", resource_type: "offers", resource_id: "of_cand-1", actor_name: "野村 裕太", created_at: hoursAgo(11) },
  { id: 8, action: "update", resource_type: "employees", resource_id: "e6",  actor_name: "高橋 真由", created_at: hoursAgo(20), diff: { manager_id: ["e3", "e1"] } },
  { id: 9, action: "create", resource_type: "audit_logs", resource_id: "self-test", actor_name: "system", created_at: hoursAgo(26) },
  { id:10, action: "update", resource_type: "retention_records", resource_id: "rr_e6", actor_name: "system", created_at: hoursAgo(30), diff: { score: [42, 58] } },
];

function minutesAgo(m: number) { return new Date(Date.now() - m * 60_000).toISOString(); }
function hoursAgo(h: number)   { return new Date(Date.now() - h * 3_600_000).toISOString(); }

export default async function AuditLogPage() {
  const demo = isDemoMode();
  let rows: AuditRow[] = [];

  if (demo) {
    rows = DEMO_ROWS;
  } else {
    try {
      const sb = await createClient();
      const { data } = await sb
        .from("audit_logs")
        .select(`
          id, action, resource_type, resource_id, diff, ip, user_agent, created_at,
          actor:employees!audit_logs_actor_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      rows = (data ?? []).map((r) => {
        const actor = Array.isArray(r.actor) ? r.actor[0] : r.actor;
        return {
          id: r.id as number,
          action: r.action as string,
          resource_type: r.resource_type as string,
          resource_id: (r.resource_id as string) ?? null,
          actor_name: actor?.full_name ?? "—",
          created_at: r.created_at as string,
          diff: (r.diff as Record<string, unknown> | null) ?? null,
        };
      });
    } catch (e) {
      console.error("[audit-log] failed", e);
    }
  }

  return <AuditLogClient rows={rows} demo={demo} />;
}
