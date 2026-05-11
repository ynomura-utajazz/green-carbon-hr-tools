/**
 * デモ用の社員・部門データ。実在の Green Carbon 社員名は使わず、
 * 多様性が伝わるよう日本人・外国籍が混在するように構成。
 */

export type DemoDept = {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number;
};

export type OfficeLocation = {
  code: string;          // "JP-TYO" 等
  country: string;       // "日本"
  countryEmoji: string;  // "🇯🇵"
  city: string;          // "東京"
};

export type DemoEmployee = {
  id: string;
  employee_code: string;
  full_name: string;
  full_name_kana?: string;
  display_name_en?: string;
  email: string;
  department_id: string;
  manager_id: string | null;
  job_title: string;
  job_grade: string;
  employment_type: "full_time" | "part_time" | "contract" | "intern" | "business_partner";
  status: "active" | "on_leave";
  hire_date: string;
  nationality: string;
  is_foreign_national: boolean;
  slack_user_id?: string;        // U01ABCD2EF 形式
  office_location: string;       // OfficeLocation.code
  expertise_countries?: string[]; // この社員が詳しい国（"この国のことはこの人に聞け" 用）
};

export const SLACK_TEAM_ID = "T01GREENCARBON";  // デモ用の固定値（本番は env 変数）

export const OFFICES: OfficeLocation[] = [
  { code: "JP-TYO", country: "日本",       countryEmoji: "🇯🇵", city: "東京" },
  { code: "ID-JKT", country: "インドネシア", countryEmoji: "🇮🇩", city: "ジャカルタ" },
  { code: "VN-HCM", country: "ベトナム",   countryEmoji: "🇻🇳", city: "ホーチミン" },
  { code: "PH-MNL", country: "フィリピン", countryEmoji: "🇵🇭", city: "マニラ" },
  { code: "MY-KUL", country: "マレーシア", countryEmoji: "🇲🇾", city: "クアラルンプール" },
  { code: "SG-SIN", country: "シンガポール", countryEmoji: "🇸🇬", city: "シンガポール" },
  { code: "IN-BLR", country: "インド",     countryEmoji: "🇮🇳", city: "ベンガルール" },
  { code: "KR-SEL", country: "韓国",       countryEmoji: "🇰🇷", city: "ソウル" },
];

export const officeByCode = (code: string) => OFFICES.find((o) => o.code === code);

export const DEMO_DEPARTMENTS: DemoDept[] = [
  { id: "d-corp",     name: "経営企画",       parent_id: null,    display_order: 1 },
  { id: "d-bizdev",   name: "事業開発",       parent_id: null,    display_order: 2 },
  { id: "d-product",  name: "プロダクト",     parent_id: null,    display_order: 3 },
  { id: "d-eng",      name: "技術",           parent_id: "d-product", display_order: 4 },
  { id: "d-design",   name: "デザイン",       parent_id: "d-product", display_order: 5 },
  { id: "d-mkt",      name: "マーケティング", parent_id: null,    display_order: 6 },
  { id: "d-hr",       name: "人事",           parent_id: null,    display_order: 7 },
  { id: "d-fin",      name: "経理・財務",     parent_id: null,    display_order: 8 },
  { id: "d-global",   name: "グローバル",     parent_id: "d-bizdev", display_order: 9 },
];

export const DEMO_EMPLOYEES: DemoEmployee[] = [
  // 経営企画 (CXO 層) — 全員東京
  { id: "e1",  employee_code: "GC001", full_name: "野村 裕太", full_name_kana: "ノムラ ユウタ", email: "y.nomura@green-carbon.inc", department_id: "d-corp", manager_id: null, job_title: "CEO", job_grade: "EX", employment_type: "full_time", status: "active", hire_date: "2020-01-15", nationality: "JP", is_foreign_national: false, slack_user_id: "U01CEO001", office_location: "JP-TYO" },
  { id: "e2",  employee_code: "GC002", full_name: "高橋 真由", full_name_kana: "タカハシ マユ", email: "m.takahashi@green-carbon.inc", department_id: "d-hr", manager_id: "e1", job_title: "CHRO", job_grade: "EX", employment_type: "full_time", status: "active", hire_date: "2021-04-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01CHRO01", office_location: "JP-TYO" },
  { id: "e3",  employee_code: "GC003", full_name: "佐藤 太郎", full_name_kana: "サトウ タロウ", email: "t.sato@green-carbon.inc", department_id: "d-bizdev", manager_id: "e1", job_title: "COO", job_grade: "EX", employment_type: "full_time", status: "active", hire_date: "2020-03-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01COO001", office_location: "JP-TYO" },
  { id: "e4",  employee_code: "GC004", full_name: "山田 花子", full_name_kana: "ヤマダ ハナコ", email: "h.yamada@green-carbon.inc", department_id: "d-product", manager_id: "e1", job_title: "CPO", job_grade: "EX", employment_type: "full_time", status: "active", hire_date: "2021-06-15", nationality: "JP", is_foreign_national: false, slack_user_id: "U01CPO001", office_location: "JP-TYO" },

  // 人事
  { id: "e5",  employee_code: "GC010", full_name: "鎌田 彩",   email: "a.kamada@green-carbon.inc", department_id: "d-hr", manager_id: "e2", job_title: "HRBP マネージャー", job_grade: "M3", employment_type: "full_time", status: "active", hire_date: "2022-02-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01HR0001", office_location: "JP-TYO" },
  { id: "e6",  employee_code: "GC011", full_name: "塚本 真純", email: "m.tsukamoto@green-carbon.inc", department_id: "d-hr", manager_id: "e5", job_title: "リクルーター", job_grade: "S2", employment_type: "full_time", status: "active", hire_date: "2023-04-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01HR0002", office_location: "JP-TYO" },
  { id: "e7",  employee_code: "GC012", full_name: "Park Jihye", display_name_en: "Jihye Park", email: "jihye.park@green-carbon.inc", department_id: "d-hr", manager_id: "e5", job_title: "L&D スペシャリスト", job_grade: "S2", employment_type: "full_time", status: "active", hire_date: "2023-09-01", nationality: "KR", is_foreign_national: true, slack_user_id: "U01HR0003", office_location: "JP-TYO", expertise_countries: ["KR"] },

  // 技術 — 主に東京、一部ホーチミン
  { id: "e8",  employee_code: "GC020", full_name: "川崎 健太", email: "k.kawasaki@green-carbon.inc", department_id: "d-eng", manager_id: "e4", job_title: "VP of Engineering", job_grade: "M4", employment_type: "full_time", status: "active", hire_date: "2021-08-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01ENG001", office_location: "JP-TYO" },
  { id: "e9",  employee_code: "GC021", full_name: "藤本 渉",   email: "w.fujimoto@green-carbon.inc", department_id: "d-eng", manager_id: "e8", job_title: "テックリード", job_grade: "S5", employment_type: "full_time", status: "active", hire_date: "2022-01-15", nationality: "JP", is_foreign_national: false, slack_user_id: "U01ENG002", office_location: "JP-TYO" },
  { id: "e10", employee_code: "GC022", full_name: "藤原 恵",   email: "k.fujiwara@green-carbon.inc", department_id: "d-eng", manager_id: "e8", job_title: "シニアエンジニア", job_grade: "S4", employment_type: "full_time", status: "active", hire_date: "2022-07-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01ENG003", office_location: "JP-TYO" },
  { id: "e11", employee_code: "GC023", full_name: "Wibowo Agus", display_name_en: "Agus Wibowo", email: "agus.w@green-carbon.inc", department_id: "d-eng", manager_id: "e8", job_title: "シニアエンジニア", job_grade: "S4", employment_type: "full_time", status: "active", hire_date: "2023-02-01", nationality: "ID", is_foreign_national: true, slack_user_id: "U01ENG004", office_location: "ID-JKT", expertise_countries: ["ID"] },
  { id: "e12", employee_code: "GC024", full_name: "Nguyen Thanh", display_name_en: "Thanh Nguyen", email: "thanh.n@green-carbon.inc", department_id: "d-eng", manager_id: "e9", job_title: "ソフトウェアエンジニア", job_grade: "S3", employment_type: "full_time", status: "active", hire_date: "2024-04-01", nationality: "VN", is_foreign_national: true, slack_user_id: "U01ENG005", office_location: "VN-HCM", expertise_countries: ["VN"] },
  { id: "e13", employee_code: "GC025", full_name: "鈴木 健",   email: "k.suzuki@green-carbon.inc", department_id: "d-eng", manager_id: "e9", job_title: "ソフトウェアエンジニア", job_grade: "S3", employment_type: "full_time", status: "active", hire_date: "2024-10-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01ENG006", office_location: "JP-TYO" },

  // デザイン
  { id: "e14", employee_code: "GC030", full_name: "原田 梨沙", email: "r.harada@green-carbon.inc", department_id: "d-design", manager_id: "e4", job_title: "デザインリード", job_grade: "S5", employment_type: "full_time", status: "active", hire_date: "2022-05-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01DSN001", office_location: "JP-TYO" },
  { id: "e15", employee_code: "GC031", full_name: "下城 哲哉", email: "t.shimojo@green-carbon.inc", department_id: "d-design", manager_id: "e14", job_title: "プロダクトデザイナー", job_grade: "S3", employment_type: "full_time", status: "active", hire_date: "2023-11-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01DSN002", office_location: "JP-TYO" },

  // 事業開発
  { id: "e16", employee_code: "GC040", full_name: "土井 圭太", email: "k.doi@green-carbon.inc", department_id: "d-bizdev", manager_id: "e3", job_title: "事業開発マネージャー", job_grade: "M3", employment_type: "full_time", status: "active", hire_date: "2021-10-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01BD0001", office_location: "JP-TYO" },
  { id: "e17", employee_code: "GC041", full_name: "古山 健一", email: "k.furuyama@green-carbon.inc", department_id: "d-bizdev", manager_id: "e16", job_title: "シニア事業開発", job_grade: "S4", employment_type: "full_time", status: "active", hire_date: "2022-12-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01BD0002", office_location: "JP-TYO" },
  { id: "e18", employee_code: "GC042", full_name: "中尾 幸一", email: "k.nakao@green-carbon.inc", department_id: "d-bizdev", manager_id: "e16", job_title: "事業開発", job_grade: "S3", employment_type: "full_time", status: "active", hire_date: "2024-01-15", nationality: "JP", is_foreign_national: false, slack_user_id: "U01BD0003", office_location: "JP-TYO" },

  // グローバル — 各国に分散
  { id: "e19", employee_code: "GC050", full_name: "石川 拓哉", email: "t.ishikawa@green-carbon.inc", department_id: "d-global", manager_id: "e3", job_title: "グローバル事業統括", job_grade: "M3", employment_type: "full_time", status: "active", hire_date: "2022-08-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01GBL001", office_location: "SG-SIN", expertise_countries: ["SG", "MY"] },
  { id: "e20", employee_code: "GC051", full_name: "Lopez Maria", display_name_en: "Maria Lopez", email: "maria.l@green-carbon.inc", department_id: "d-global", manager_id: "e19", job_title: "ASEAN リード", job_grade: "S5", employment_type: "full_time", status: "active", hire_date: "2023-06-01", nationality: "PH", is_foreign_national: true, slack_user_id: "U01GBL002", office_location: "PH-MNL", expertise_countries: ["PH"] },
  { id: "e21", employee_code: "GC052", full_name: "Saw Jasmine", display_name_en: "Jasmine Saw", email: "j.saw@green-carbon.inc", department_id: "d-global", manager_id: "e20", job_title: "シニアコンサルタント", job_grade: "S4", employment_type: "full_time", status: "active", hire_date: "2024-02-01", nationality: "MY", is_foreign_national: true, slack_user_id: "U01GBL003", office_location: "MY-KUL", expertise_countries: ["MY"] },
  { id: "e22", employee_code: "GC053", full_name: "Aimen Sara", display_name_en: "Sara Aimen", email: "sara.a@green-carbon.inc", department_id: "d-global", manager_id: "e20", job_title: "アナリスト", job_grade: "S2", employment_type: "full_time", status: "active", hire_date: "2024-09-01", nationality: "ID", is_foreign_national: true, slack_user_id: "U01GBL004", office_location: "ID-JKT", expertise_countries: ["ID"] },

  // マーケティング
  { id: "e23", employee_code: "GC060", full_name: "南部 さくら", email: "s.nambu@green-carbon.inc", department_id: "d-mkt", manager_id: "e1", job_title: "マーケティングマネージャー", job_grade: "M3", employment_type: "full_time", status: "active", hire_date: "2022-04-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01MKT001", office_location: "JP-TYO" },
  { id: "e24", employee_code: "GC061", full_name: "Tirza Grace", display_name_en: "Grace Tirza", email: "grace.t@green-carbon.inc", department_id: "d-mkt", manager_id: "e23", job_title: "コンテンツマーケター", job_grade: "S3", employment_type: "full_time", status: "active", hire_date: "2023-08-01", nationality: "ID", is_foreign_national: true, slack_user_id: "U01MKT002", office_location: "ID-JKT", expertise_countries: ["ID"] },
  { id: "e25", employee_code: "GC062", full_name: "Nguyen An", display_name_en: "An Nguyen", email: "an.nguyen@green-carbon.inc", department_id: "d-mkt", manager_id: "e23", job_title: "デジタルマーケター", job_grade: "S2", employment_type: "full_time", status: "active", hire_date: "2024-06-01", nationality: "VN", is_foreign_national: true, slack_user_id: "U01MKT003", office_location: "VN-HCM", expertise_countries: ["VN"] },

  // 経理・財務
  { id: "e26", employee_code: "GC070", full_name: "串田 和也", email: "k.kushida@green-carbon.inc", department_id: "d-fin", manager_id: "e1", job_title: "CFO", job_grade: "EX", employment_type: "full_time", status: "active", hire_date: "2021-01-01", nationality: "JP", is_foreign_national: false, slack_user_id: "U01CFO001", office_location: "JP-TYO" },
  { id: "e27", employee_code: "GC071", full_name: "Galina Sofia", display_name_en: "Sofia Galina", email: "sofia.g@green-carbon.inc", department_id: "d-fin", manager_id: "e26", job_title: "経理スペシャリスト", job_grade: "S3", employment_type: "full_time", status: "active", hire_date: "2023-04-15", nationality: "RU", is_foreign_national: true, slack_user_id: "U01FIN001", office_location: "JP-TYO" },

  // インターン
  { id: "e28", employee_code: "GC080", full_name: "Esha Grace", display_name_en: "Grace Esha", email: "grace.e@green-carbon.inc", department_id: "d-product", manager_id: "e14", job_title: "デザインインターン", job_grade: "I1", employment_type: "intern", status: "active", hire_date: "2026-03-01", nationality: "IN", is_foreign_national: true, slack_user_id: "U01INT001", office_location: "IN-BLR", expertise_countries: ["IN"] },
  { id: "e29", employee_code: "GC081", full_name: "Lee Felicia", display_name_en: "Felicia Lee", email: "felicia.l@green-carbon.inc", department_id: "d-eng", manager_id: "e9", job_title: "エンジニアインターン", job_grade: "I1", employment_type: "intern", status: "active", hire_date: "2026-04-01", nationality: "SG", is_foreign_national: true, slack_user_id: "U01INT002", office_location: "SG-SIN", expertise_countries: ["SG"] },

  // 業務委託
  { id: "e30", employee_code: "GC090", full_name: "Olga Kira", display_name_en: "Kira Olga", email: "kira.o@green-carbon.inc", department_id: "d-eng", manager_id: "e9", job_title: "シニアエンジニア (業務委託)", job_grade: "C4", employment_type: "business_partner", status: "active", hire_date: "2025-01-01", nationality: "UA", is_foreign_national: true, slack_user_id: "U01BP0001", office_location: "JP-TYO" },
];

export function deptById(id: string): DemoDept | undefined {
  return DEMO_DEPARTMENTS.find((d) => d.id === id);
}

export function employeeById(id: string): DemoEmployee | undefined {
  return DEMO_EMPLOYEES.find((e) => e.id === id);
}

export function directReports(employeeId: string): DemoEmployee[] {
  return DEMO_EMPLOYEES.filter((e) => e.manager_id === employeeId);
}

export function rootEmployees(): DemoEmployee[] {
  return DEMO_EMPLOYEES.filter((e) => !e.manager_id);
}

/** 「この国のことはこの人に聞け」ビューに使う：その国の専門家を返す */
export function expertsForCountry(countryCode: string): DemoEmployee[] {
  return DEMO_EMPLOYEES
    .filter((e) =>
      e.expertise_countries?.includes(countryCode) ||
      e.nationality === countryCode ||
      officeByCode(e.office_location)?.code.startsWith(countryCode + "-")
    )
    .sort((a, b) => {
      // expertise_countries が明示的に設定されている人を優先
      const aExp = a.expertise_countries?.includes(countryCode) ? 0 : 1;
      const bExp = b.expertise_countries?.includes(countryCode) ? 0 : 1;
      return aExp - bExp;
    });
}
