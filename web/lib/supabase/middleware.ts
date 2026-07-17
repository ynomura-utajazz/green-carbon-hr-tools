import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC_PATHS = [
  "/login", "/auth/callback", "/auth/error",
  "/contractor-portal",
  // 候補者向け公開ランディング（採用広報）
  "/careers",
  "/api/public/apply",
  "/api/public/track",
  "/api/public/feedback",
];
// 認証チェックを通さない静的アセット。
// manifest はブラウザが credentials 無しで取得するため、認証ガードに掛かると
// /login の HTML が返り "Manifest: Line 1, column 1, Syntax error" になる（BUG-005）。
const STATIC_PREFIXES = [
  "/_next", "/favicon", "/icon", "/apple-icon", "/api/health",
  "/manifest", "/sw.js", "/offline.html", "/brand",
  // Vercel Cron はセッション Cookie を持たないため、認証ガードに掛かると
  // /login へリダイレクトされ、ジョブ本体が一度も実行されない。
  "/api/cron",
];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // デモモード: Supabase 未設定でも UI を確認できるよう全パスを通過
  const demoMode =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("xxxxxxxxxxxx");
  if (demoMode) {
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
