"use client";

/**
 * Service Worker 登録コンポーネント。
 *
 * - 本番のみ登録（dev では HMR と競合するためスキップ）
 * - 登録は Window load 後にして、初回ペイント遅延を起こさない
 * - 新バージョン検知時はトーストで通知 → ユーザー操作で reload
 */

import { useEffect } from "react";
import { toast } from "sonner";

export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // 新バージョン検知
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (
                installing.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                toast.message("新バージョンが利用可能です", {
                  description: "ページを再読み込みすると反映されます",
                  action: {
                    label: "再読み込み",
                    onClick: () => window.location.reload(),
                  },
                  duration: Infinity,
                });
              }
            });
          });
        })
        .catch((e) => console.warn("[sw] registration failed", e));
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
