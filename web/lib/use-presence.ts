"use client";

/**
 * 同一画面・同一 entity（例：1on1 セッション）を見ているユーザーを
 * Supabase Realtime presence で同期するフック。
 *
 * 使い方：
 *   const others = usePresence("oneonone:" + sessionId, { name: meName });
 *   <PresenceAvatars users={others} />
 *
 * デモモード時は固定のサンプルユーザーを返す（Supabase 接続不要で UI 確認可能）。
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo/mock-data";

export type PresenceUser = {
  user_id: string;
  name: string;
  avatar_url?: string | null;
  online_at: string;
};

const DEMO_OTHERS: PresenceUser[] = [
  { user_id: "demo-1", name: "高橋 真由", online_at: new Date().toISOString() },
];

export function usePresence(
  channelKey: string,
  me: { user_id?: string; name: string; avatar_url?: string | null },
): PresenceUser[] {
  const [others, setOthers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (isDemoMode()) {
      // デモモード：固定値を 800ms 後にセット（実 connection 風の挙動）
      const t = setTimeout(() => setOthers(DEMO_OTHERS), 800);
      return () => clearTimeout(t);
    }
    if (!me.user_id) return;

    let active = true;
    const supabase = createClient();
    const channel = supabase.channel(channelKey, {
      config: { presence: { key: me.user_id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        if (!active) return;
        const flat: PresenceUser[] = [];
        for (const [uid, metas] of Object.entries(state)) {
          if (uid === me.user_id) continue; // 自分は除外
          const first = metas[0];
          if (first) flat.push(first);
        }
        setOthers(flat);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: me.user_id,
            name: me.name,
            avatar_url: me.avatar_url,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      active = false;
      void channel.unsubscribe();
    };
  }, [channelKey, me.user_id, me.name, me.avatar_url]);

  return others;
}
