"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ChevronDown, Menu } from "lucide-react";
import { TOOLS, CATEGORY_ORDER, toolsByCategory, type ToolCategory } from "@/lib/tools";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from "@/components/ui/sheet";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { QuickDmDialog } from "@/components/quick-dm-dialog";
import { BrandMark } from "@/components/brand-mark";
import { IntegrationStatusButton } from "@/components/integration-status";
import { NotificationsBell } from "@/components/notifications-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";

type Props = {
  user?: { name: string; email: string; avatarUrl?: string | null };
  demo?: boolean;
  children: React.ReactNode;
};

export function AppShell({ user, demo, children }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const t = useT();

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-gc-600 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        {t("appShell.skipToContent")}
      </a>
      {/* ── デスクトップ サイドバー ─────────────── */}
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark variant="wordmark" size="sm" />
          </Link>
        </div>
        <SidebarNav onNavigate={() => {}} />
        <div className="border-t p-3 text-[11px] text-muted-foreground">
          v2.0 · {TOOLS.length}ツール
        </div>
      </aside>

      {/* ── メイン ─────────────────── */}
      <div className="flex flex-1 flex-col">
        {demo && (
          <div className="border-b bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-900 md:px-8">
            🟡 デモモード中（モックデータで描画中）。本番運用時は <code className="font-mono">.env.local</code> に Supabase クレデンシャルを設定してください。
          </div>
        )}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          {/* モバイル用ハンバーガー */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("appShell.menu")}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col p-0">
              <div className="flex h-14 items-center border-b px-4">
                <Link href="/" onClick={() => setMobileNavOpen(false)}>
                  <BrandMark variant="wordmark" size="sm" />
                </Link>
              </div>
              <SheetTitle className="sr-only">{t("appShell.menu")}</SheetTitle>
              <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* モバイル用タイトル */}
          <Link href="/" className="md:hidden">
            <BrandMark variant="wordmark" size="sm" />
          </Link>

          {/* 検索ボックス（コマンドパレット起動） */}
          <Button
            variant="outline"
            className="hidden h-9 max-w-md flex-1 justify-start gap-2 px-3 text-muted-foreground md:flex"
            onClick={() =>
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
            }
          >
            <Search className="size-4" />
            <span className="text-sm">{t("appShell.searchPlaceholder")}</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              ⌘K
            </kbd>
          </Button>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="検索"
              className="md:hidden"
              onClick={() =>
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
              }
            >
              <Search className="size-4" />
            </Button>
            <IntegrationStatusButton />
            <LocaleSwitcher />
            <ThemeToggle />
            <NotificationsBell />
            {user && (
              <Button variant="ghost" className="h-9 gap-2 px-2">
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">
                    {user.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left lg:block">
                  <div className="text-xs font-medium leading-none">{user.name}</div>
                  <div className="text-[10px] text-muted-foreground">{user.email}</div>
                </div>
                <ChevronDown className="hidden size-3 opacity-60 lg:block" />
              </Button>
            )}
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-5 md:px-8 md:py-8 focus:outline-none">{children}</main>
      </div>

      <CommandPalette />
      <KeyboardShortcutsDialog />
      <QuickDmDialog />
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const grouped = toolsByCategory();
  const t = useT();
  const catLabel = (c: ToolCategory) => t(`category.${c}`);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {CATEGORY_ORDER.map((cat) => {
        const tools = grouped.get(cat) ?? [];
        if (!tools.length) return null;
        return (
          <div key={cat} className="mb-5">
            <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {catLabel(cat)}
            </div>
            <ul className="flex flex-col gap-0.5">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const active = pathname === tool.href || pathname.startsWith(tool.href + "/");
                return (
                  <li key={tool.id}>
                    <Link
                      href={tool.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{tool.name}</span>
                      {tool.status === "planned" && (
                        <span className="ml-auto text-[9px] uppercase tracking-wider text-muted-foreground">
                          soon
                        </span>
                      )}
                      {tool.status === "beta" && (
                        <span className="ml-auto text-[9px] uppercase tracking-wider text-blue-600">
                          beta
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
