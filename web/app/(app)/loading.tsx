import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="size-7 animate-spin text-gc-600" />
      <p className="text-sm text-muted-foreground">読み込み中…</p>
    </div>
  );
}
