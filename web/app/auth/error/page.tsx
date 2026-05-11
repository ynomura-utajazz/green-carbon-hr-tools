import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const REASON_MESSAGES: Record<string, string> = {
  missing_code: "認証コードが見つかりませんでした。",
  invalid_domain: "このアプリは社内Google Workspace アカウントのみ利用できます。",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason = "" } = await searchParams;
  const message = REASON_MESSAGES[reason] ?? `ログインに失敗しました (${reason})`;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <AlertCircle className="mx-auto size-10 text-destructive" />
        <h1 className="text-xl font-bold">ログインできませんでした</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button asChild>
          <Link href="/login">ログイン画面に戻る</Link>
        </Button>
      </div>
    </div>
  );
}
