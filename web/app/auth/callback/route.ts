import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

const ALLOWED_DOMAIN = process.env.GOOGLE_WORKSPACE_DOMAIN ?? "green-carbon.inc";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?reason=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth/error?reason=${encodeURIComponent(error.message)}`);
  }

  // Workspace ドメイン制限
  const email = data.user?.email ?? "";
  const domain = email.split("@")[1];
  if (domain !== ALLOWED_DOMAIN) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/error?reason=invalid_domain`);
  }

  // employees レコードに auth_user_id を紐付け（メール一致で初回リンク）
  // service role を使って RLS バイパス（anon client だと UPDATE が silent fail する）
  if (data.user) {
    const admin = createServiceClient();
    const writer = admin ?? supabase;

    // まず既存社員レコードへの紐付けを試行
    const { data: existing } = await writer
      .from("employees")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      // 既存レコードあり → auth_user_id を更新
      await writer
        .from("employees")
        .update({ auth_user_id: data.user.id })
        .eq("email", email);
    } else if (admin) {
      // 既存レコードなし & service role 利用可
      // → 初回ログインテスター用にデフォルト組織の社員レコードを自動作成
      const { data: defaultOrg } = await admin
        .from("organizations")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (defaultOrg) {
        const nameFromEmail = email.split("@")[0].replace(/\./g, " ");
        await admin.from("employees").insert({
          organization_id: defaultOrg.id as string,
          auth_user_id: data.user.id,
          email,
          full_name: nameFromEmail,
          status: "active",
        });
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
