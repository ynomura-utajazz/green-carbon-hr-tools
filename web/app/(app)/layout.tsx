import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { IntegrationResultToast } from "@/components/integration-result-toast";
import { isDemoMode, DEMO_USER } from "@/lib/demo/mock-data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // デモモード: Supabase 未設定で UI を確認したい時用
  if (isDemoMode()) {
    return (
      <AppShell
        demo
        user={{ name: DEMO_USER.name, email: DEMO_USER.email, avatarUrl: null }}
      >
        <IntegrationResultToast />
        {children}
      </AppShell>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: emp } = await supabase
    .from("employees")
    .select("id, full_name, email, avatar_url")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (
    <AppShell
      user={{
        name: emp?.full_name ?? user.email?.split("@")[0] ?? "ゲスト",
        email: emp?.email ?? user.email ?? "",
        avatarUrl: emp?.avatar_url,
      }}
    >
      <IntegrationResultToast />
      {children}
    </AppShell>
  );
}
