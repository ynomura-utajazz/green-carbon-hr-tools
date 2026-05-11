import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  if (data.user) {
    await supabase
      .from("employees")
      .update({ auth_user_id: data.user.id })
      .eq("email", email)
      .is("auth_user_id", null);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
