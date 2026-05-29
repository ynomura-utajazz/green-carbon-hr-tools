import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type KpiTone = "primary" | "success" | "warning" | "danger" | "muted";

const TONE_CLASSES: Record<KpiTone, string> = {
  primary: "text-gc-700 bg-gc-50 border-gc-200",
  success: "text-emerald-700 bg-emerald-50 border-emerald-200",
  warning: "text-amber-800 bg-amber-50 border-amber-200",
  danger: "text-red-800 bg-red-50 border-red-200",
  muted: "text-muted-foreground bg-muted/50 border-border",
};

/**
 * KPI を表示する共通タイル。
 * /org-management, /attendance, /pulse-survey などで再利用。
 */
export function KpiTile({
  icon: Icon, label, value, unit, tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  unit?: string;
  tone?: KpiTone;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${TONE_CLASSES[tone]}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
            {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
