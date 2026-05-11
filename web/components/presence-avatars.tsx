"use client";

/**
 * 同じ画面を今見ている他ユーザのアバターを並べる小型 UI。
 *
 * <PresenceAvatars users={...} />
 *
 * 0 人なら null（DOM ノード自体描画しない）。
 * 4 人を超えたら 4 人 + "+N" 表記。
 */

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";
import type { PresenceUser } from "@/lib/use-presence";

const MAX = 4;

export function PresenceAvatars({
  users, label, className,
}: {
  users: PresenceUser[];
  /** 例：「閲覧中」「編集中」 */
  label?: string;
  className?: string;
}) {
  if (users.length === 0) return null;
  const visible = users.slice(0, MAX);
  const overflow = Math.max(0, users.length - MAX);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-1.5 py-0.5 text-[11px] backdrop-blur",
        className,
      )}
      title={users.map((u) => u.name).join("、")}
      aria-label={`${users.length} 名が現在この画面を見ています`}
    >
      <span
        className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-500"
        aria-hidden
      />
      <div className="flex -space-x-1">
        {visible.map((u) => (
          <Avatar key={u.user_id} className="size-5 border-2 border-background">
            <AvatarFallback className="text-[8px]">{initials(u.name)}</AvatarFallback>
          </Avatar>
        ))}
        {overflow > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full border-2 border-background bg-muted text-[8px] font-bold">
            +{overflow}
          </span>
        )}
      </div>
      {label && <span className="text-muted-foreground">{label}</span>}
    </div>
  );
}
