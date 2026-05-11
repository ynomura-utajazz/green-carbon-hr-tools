import { isDemoMode, DEMO_CURRENT_EMPLOYEE_ID } from "@/lib/demo/mock-data";
import {
  DEMO_EMPLOYEES, DEMO_DEPARTMENTS,
  type DemoEmployee, type DemoDept,
} from "@/lib/demo/employees";
import {
  DEMO_ONEONONES, DEMO_ACTION_ITEMS,
  type OneOnOneSession, type ActionItem,
} from "@/lib/demo/oneonones";
import { OneOnOneClient } from "./oneonone-client";

export const dynamic = "force-dynamic";

export default async function OneOnOnePage() {
  // 認証実装後はここで auth 経由で employee を取得して manager_id でフィルタする
  const currentEmployeeId = isDemoMode() ? DEMO_CURRENT_EMPLOYEE_ID : "<auth-resolved>";

  const employees: DemoEmployee[] = DEMO_EMPLOYEES;
  const departments: DemoDept[] = DEMO_DEPARTMENTS;
  const sessions: OneOnOneSession[] = DEMO_ONEONONES;
  const actionItems: ActionItem[] = DEMO_ACTION_ITEMS;

  return (
    <OneOnOneClient
      currentEmployeeId={currentEmployeeId}
      employees={employees}
      departments={departments}
      sessions={sessions}
      actionItems={actionItems}
    />
  );
}
