import { isDemoMode } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { AlumniClient, type AlumniRow, type ReferralRow } from "./alumni-client";

export const dynamic = "force-dynamic";

// デモデータ（従来 page.tsx にハードコードされていたもの。デモ表示を不変に保つため保持）
const DEMO_ALUMNI: AlumniRow[] = [
  { id: "a1", name: "John Wilson",   ex_role: "気候政策アドバイザー", current: "Climate Policy Institute - Director", left_at: "2025-09",  referral_score: 5, alumni_event: true,  contacts: 8, country: "🇺🇸" },
  { id: "a2", name: "Carlos Mendez", ex_role: "BD Latin America",     current: "GreenTech LatAm - VP",                left_at: "2025-12",  referral_score: 4, alumni_event: false, contacts: 3, country: "🇲🇽" },
  { id: "a3", name: "鈴木 良一",      ex_role: "テックリード",        current: "他社 CTO",                            left_at: "2024-06",  referral_score: 5, alumni_event: true,  contacts: 12, country: "🇯🇵" },
  { id: "a4", name: "Park Hyejin",   ex_role: "プロダクトマーケ",     current: "韓国スタートアップ - PM",              left_at: "2024-09",  referral_score: 4, alumni_event: false, contacts: 5, country: "🇰🇷" },
  { id: "a5", name: "山田 健太郎",    ex_role: "事業開発",            current: "VC アナリスト",                        left_at: "2025-03",  referral_score: 4, alumni_event: true,  contacts: 6, country: "🇯🇵" },
  { id: "a6", name: "Amelia Rodriguez", ex_role: "ASEAN BD",          current: "Sustainability Consultancy - Partner", left_at: "2024-11",  referral_score: 5, alumni_event: true,  contacts: 9, country: "🇸🇬" },
];

const DEMO_REFERRALS: ReferralRow[] = [
  { id: "r1", from: "鈴木 良一", to: "シニアエンジニア候補",  status: "面接中" },
  { id: "r2", from: "Amelia Rodriguez", to: "ASEAN BD候補", status: "書類選考" },
  { id: "r3", from: "山田 健太郎", to: "事業開発候補",      status: "応募" },
];

const DEMO_COMEBACK_HIRES = 1;

// ISO 3166-1 alpha-2（例: "JP"）→ 国旗絵文字。2文字英字以外は空文字（安全既定）。
function flagEmoji(nationality: string | null | undefined): string {
  if (!nationality) return "";
  const cc = nationality.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
}

export default async function AlumniPage() {
  if (isDemoMode()) {
    return (
      <AlumniClient
        alumni={DEMO_ALUMNI}
        referrals={DEMO_REFERRALS}
        comebackHires={DEMO_COMEBACK_HIRES}
      />
    );
  }

  // 本番: alumni テーブルから取得。前職ロール・退職年月・国籍は former_employee_id 経由で employees から補完。
  const supabase = await createClient();
  const { data: alumniData, error } = await supabase
    .from("alumni")
    .select("id, former_employee_id, full_name, email, current_company, current_role_title, linkedin_url, referral_score, notes, last_contact_at, created_at")
    .order("referral_score", { ascending: false, nullsFirst: false });
  if (error) console.error("[alumni] alumni query failed:", error.message);
  const rows = alumniData ?? [];

  // 退職者（元社員）情報の補完。directory は status=active のみ取得するため、ここでは別途 id 指定で取得する。
  const formerIds = [
    ...new Set(rows.map((r) => r.former_employee_id).filter(Boolean)),
  ] as string[];
  const empMap = new Map<
    string,
    { job_title: string | null; nationality: string | null; resign_date: string | null }
  >();
  if (formerIds.length > 0) {
    const { data: emps, error: empErr } = await supabase
      .from("employees")
      .select("id, job_title, nationality, resign_date")
      .in("id", formerIds);
    if (empErr) console.error("[alumni] former employees query failed:", empErr.message);
    for (const e of emps ?? []) {
      empMap.set(e.id as string, {
        job_title: (e.job_title as string | null) ?? null,
        nationality: (e.nationality as string | null) ?? null,
        resign_date: (e.resign_date as string | null) ?? null,
      });
    }
  }

  const alumni: AlumniRow[] = rows.map((r) => {
    const emp = r.former_employee_id ? empMap.get(r.former_employee_id as string) : undefined;
    // current_company / current_role_title → "会社 - 役職"（片方のみなら片方だけ）。
    const current = [r.current_company, r.current_role_title].filter(Boolean).join(" - ");
    return {
      id: r.id as string,
      name: r.full_name as string,
      ex_role: emp?.job_title ?? "",
      current,
      left_at: emp?.resign_date ? String(emp.resign_date).slice(0, 7) : "",
      referral_score: (r.referral_score as number | null) ?? 0,
      // alumni_event / contacts は実スキーマに存在しないため安全既定（false / 0 = 非表示）。
      alumni_event: false,
      contacts: 0,
      country: flagEmoji(emp?.nationality),
    };
  });

  // アルムナイ発のリファラルを表す専用テーブルは未定義。空表示（空状態）とする。
  const referrals: ReferralRow[] = [];

  return (
    <AlumniClient
      alumni={alumni}
      referrals={referrals}
      comebackHires={0}
    />
  );
}
