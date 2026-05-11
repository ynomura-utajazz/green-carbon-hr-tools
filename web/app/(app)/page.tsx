import { isDemoMode, DEMO_USER } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { DashboardGreeting } from "@/components/dashboard-greeting";
import { QuickStats } from "@/components/quick-stats";
import { TodayPanel, ActivityFeed } from "@/components/today-panel";
import { CelebrationsPanel } from "@/components/celebrations-panel";
import { PinnedTools } from "@/components/pinned-tools";
import { ToolGrid } from "@/components/tool-grid";

export const dynamic = "force-dynamic";

async function resolveUserName(): Promise<string> {
  if (isDemoMode()) return DEMO_USER.name;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "ゲスト";
  const { data: emp } = await supabase
    .from("employees")
    .select("full_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return emp?.full_name ?? user.email?.split("@")[0] ?? "ゲスト";
}

export default async function HomePage() {
  const name = await resolveUserName();

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div className="animate-fade-up">
          <DashboardGreeting name={name} />
        </div>
        <QuickStats />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <TodayPanel />
        </div>
        <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: "260ms" }}>
          <ActivityFeed />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
          <CelebrationsPanel />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "340ms" }}>
          <PinnedTools />
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "320ms" }}>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">ツール一覧</h2>
            <p className="text-xs text-muted-foreground">
              ⌘K で全ツール・全社員を横断検索
            </p>
          </div>
        </div>
        <ToolGrid />
      </div>
    </div>
  );
}
