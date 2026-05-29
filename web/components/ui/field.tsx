import { cn } from "@/lib/utils";

/**
 * フォームフィールドの共通ラッパー。
 * ラベル + 入力要素のレイアウトを統一する。
 */
export function Field({
  label, children, required, className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("space-y-1.5 text-sm block", className)}>
      <div className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </div>
      {children}
    </label>
  );
}
