"use client";

/**
 * OAuth コールバックから戻った時の結果通知。
 * URL の `?integration=slack&result=ok` 等をピックアップし、トーストを 1 度だけ出す。
 *
 * 配置：app/(app)/layout.tsx もしくは home page のクライアントスロット。
 */

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const SERVICE_LABEL: Record<string, string> = {
  slack: "Slack",
  google: "Google",
  google_calendar: "Google Calendar",
  freee: "freee 人事労務",
};

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const integ = sp?.get("integration");
    const result = sp?.get("result");
    if (!integ || !result) return;

    const name = SERVICE_LABEL[integ] ?? integ;
    if (result === "ok") {
      toast.success(`${name} と接続しました`, {
        description: sp?.get("team")
          ? `ワークスペース: ${sp.get("team")}`
          : "API 経由でのメッセージ送信が有効になりました",
      });
    } else if (result === "demo-mode") {
      toast.warning(`${name} 連携はデモモード中`, {
        description: "NEXT_PUBLIC_DEMO_MODE=false にして再起動してください",
      });
    } else {
      toast.error(`${name} 接続に失敗しました`, {
        description: sp?.get("reason") ?? "もう一度お試しください",
      });
    }

    // クエリパラメータを掃除（トースト 2 重発火防止）
    const url = new URL(window.location.href);
    ["integration", "result", "team", "reason"].forEach((k) => url.searchParams.delete(k));
    router.replace(url.pathname + (url.search || ""));
  }, [sp, router]);

  return null;
}

export function IntegrationResultToast() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
