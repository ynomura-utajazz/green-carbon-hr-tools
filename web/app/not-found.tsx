import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gc-50 text-gc-700">
            <Compass className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">404</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              お探しのページは見つかりませんでした。
            </p>
          </div>
          <Button asChild className="w-full gap-1.5">
            <Link href="/">
              <Home className="size-4" />
              ホームへ戻る
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
