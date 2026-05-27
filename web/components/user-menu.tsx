"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  user: { name: string; email: string; avatarUrl?: string | null };
};

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(`ログアウトに失敗しました: ${error.message}`);
        setSigningOut(false);
        return;
      }
      toast.success("ログアウトしました");
      // フルリロードでセッション切れを完全反映
      window.location.href = "/login";
    } catch (e) {
      toast.error("ログアウトに失敗しました");
      setSigningOut(false);
      console.error(e);
    }
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        className="h-9 gap-2 px-2"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar className="size-7">
          <AvatarFallback className="text-[10px]">
            {user.name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-left lg:block">
          <div className="text-xs font-medium leading-none">{user.name}</div>
          <div className="text-[10px] text-muted-foreground">{user.email}</div>
        </div>
        <ChevronDown className={cn("hidden size-3 opacity-60 lg:block transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <div className="px-2 py-2 lg:hidden">
            <div className="text-xs font-medium">{user.name}</div>
            <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
          </div>
          <div className="my-1 h-px bg-border lg:hidden" />
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {signingOut ? "ログアウト中..." : "ログアウト"}
          </button>
        </div>
      )}
    </div>
  );
}
