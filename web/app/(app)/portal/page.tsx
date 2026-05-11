import { createClient } from "@/lib/supabase/server";
import {
  isDemoMode, DEMO_KPIS, DEMO_BIRTHDAYS, DEMO_AWARDS, DEMO_ANNOUNCEMENTS,
} from "@/lib/demo/mock-data";
import { PortalClient, type PortalData } from "./portal-client";

export const dynamic = "force-dynamic";

async function loadPortalData(): Promise<PortalData> {
  if (isDemoMode()) {
    return {
      activeCount: DEMO_KPIS.activeCount,
      hiresThisMonth: DEMO_KPIS.hiresThisMonth,
      departmentsCount: DEMO_KPIS.departmentsCount,
      visaWarnings: DEMO_KPIS.visaWarnings,
      birthdays: DEMO_BIRTHDAYS,
      awards: DEMO_AWARDS,
      announcements: DEMO_ANNOUNCEMENTS,
      // モックモードでは詳細リストをデモ的に作成
      newHires: [
        { id: "nh1", full_name: "Esha Grace",  job_title: "デザインインターン", department: "プロダクト", hire_date: "2026-05-01", email: "grace.e@green-carbon.inc", slack_user_id: "U01INT001" },
        { id: "nh2", full_name: "Lee Felicia", job_title: "エンジニアインターン", department: "技術",     hire_date: "2026-05-01", email: "felicia.l@green-carbon.inc", slack_user_id: "U01INT002" },
        { id: "nh3", full_name: "鈴木 健",     job_title: "ソフトウェアエンジニア", department: "技術",   hire_date: "2026-05-08", email: "k.suzuki@green-carbon.inc", slack_user_id: "U01ENG006" },
        { id: "nh4", full_name: "Nguyen An",   job_title: "デジタルマーケター",   department: "マーケティング", hire_date: "2026-05-15", email: "an.nguyen@green-carbon.inc", slack_user_id: "U01MKT003" },
      ],
      visaWarningList: [
        { id: "v1", full_name: "Wibowo Agus",  visa_status: "技術・人文知識・国際業務", expires_at: "2026-05-22", days_left: 14, email: "agus.w@green-carbon.inc", slack_user_id: "U01ENG004" },
        { id: "v2", full_name: "Nguyen Thanh", visa_status: "技術・人文知識・国際業務", expires_at: "2026-06-01", days_left: 24, email: "thanh.n@green-carbon.inc", slack_user_id: "U01ENG005" },
        { id: "v3", full_name: "Tirza Grace",  visa_status: "技術・人文知識・国際業務", expires_at: "2026-06-05", days_left: 28, email: "grace.t@green-carbon.inc", slack_user_id: "U01MKT002" },
      ],
    };
  }

  const supabase = await createClient();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const next30 = new Date(today.getTime() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const [
    { count: activeCount },
    { count: hiresThisMonth },
    { count: departmentsCount },
    { data: birthdayRows },
    { data: awardRows },
    { count: visaWarnings },
    { data: announcementRows },
  ] = await Promise.all([
    supabase.from("employees").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("employees").select("*", { count: "exact", head: true }).gte("hire_date", monthStart).eq("status", "active"),
    supabase.from("departments").select("*", { count: "exact", head: true }),
    supabase.from("employees")
      .select("id, full_name, birth_date, departments(name)")
      .not("birth_date", "is", null).eq("status", "active").limit(50),
    supabase.from("value_awards")
      .select("id, value_tag, message, awarded_at, recipient:recipient_id(full_name), nominator:nominator_id(full_name)")
      .order("awarded_at", { ascending: false }).limit(5),
    supabase.from("visa_records").select("*", { count: "exact", head: true }).lte("expires_at", next30),
    supabase.from("notifications").select("id, title, body, link, created_at")
      .eq("kind", "announcement").order("created_at", { ascending: false }).limit(4),
  ]);

  type BirthdayRow = {
    id: string; full_name: string; birth_date: string;
    departments: { name: string }[] | { name: string } | null;
  };
  const birthdays = ((birthdayRows ?? []) as BirthdayRow[])
    .map((e) => {
      const b = new Date(e.birth_date);
      const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const dept = Array.isArray(e.departments) ? e.departments[0] : e.departments;
      return {
        id: e.id,
        full_name: e.full_name,
        department: dept?.name ?? "—",
        monthDay: `${(b.getMonth() + 1).toString().padStart(2, "0")}/${b.getDate().toString().padStart(2, "0")}`,
        nextTime: next.getTime(),
      };
    })
    .filter((e) => e.nextTime - today.getTime() < 30 * 24 * 3600 * 1000)
    .sort((a, b) => a.nextTime - b.nextTime)
    .slice(0, 6)
    .map(({ nextTime: _n, ...rest }) => rest);

  type AwardRow = {
    id: string; value_tag: string; message: string; awarded_at: string;
    recipient: { full_name: string }[] | { full_name: string } | null;
    nominator: { full_name: string }[] | { full_name: string } | null;
  };
  const awards = ((awardRows ?? []) as AwardRow[]).map((a) => {
    const recipient = Array.isArray(a.recipient) ? a.recipient[0] : a.recipient;
    const nominator = Array.isArray(a.nominator) ? a.nominator[0] : a.nominator;
    return {
      id: a.id, value_tag: a.value_tag, message: a.message, awarded_at: a.awarded_at,
      recipient: recipient?.full_name ?? "—",
      nominator: nominator?.full_name ?? "—",
    };
  });

  return {
    activeCount: activeCount ?? 0,
    hiresThisMonth: hiresThisMonth ?? 0,
    departmentsCount: departmentsCount ?? 0,
    visaWarnings: visaWarnings ?? 0,
    birthdays, awards,
    announcements: announcementRows ?? [],
    newHires: [],
    visaWarningList: [],
  };
}

export default async function PortalPage() {
  const data = await loadPortalData();
  return <PortalClient data={data} />;
}
