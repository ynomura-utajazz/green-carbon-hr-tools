"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold">問題が発生しました</h1>
              <p className="text-xs text-muted-foreground">
                ページの読み込み中にエラーが発生しました。
              </p>
            </div>
          </div>

          {error.digest && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
              ID: {error.digest}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={reset} className="gap-1.5">
              <RotateCw className="size-3.5" />
              再試行
            </Button>
            <Button variant="outline" asChild>
              <Link href="/" className="gap-1.5">
                <Home className="size-3.5" />
                ホームへ戻る
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
