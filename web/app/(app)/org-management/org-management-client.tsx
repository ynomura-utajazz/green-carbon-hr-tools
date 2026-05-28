"use client";

import { useState, useMemo } from "react";
import { Shuffle, ArrowRight, Calendar, Plus, FileText, X, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { initials } from "@/lib/utils";

export type TransferRow = {
  id: string;
  employee_id: string;
  transfer_type: "promotion" | "demotion" | "lateral" | "role_change" | "manager_change" | "grade_change";
  effective_date: string;
  is_applied: boolean;
  from_department_id: string | null;
  from_manager_id: string | null;
  from_job_title: string | null;
  from_job_grade: string | null;
  to_department_id: string | null;
  to_manager_id: string | null;
  to_job_title: string | null;
  to_job_grade: string | null;
  reason: string | null;
};

export type EmployeeOption = {
  id: string;
  full_name: string;
  department_id: string | null;
  manager_id: string | null;
  job_title: string | null;
  job_grade: string | null;
};

export type DeptOption = {
  id: string;
  name: string;
};

const TYPE_LABEL: Record<TransferRow["transfer_type"], string> = {
  promotion: "昇格",
  demotion: "降格",
  lateral: "横異動",
  role_change: "役職変更",
  manager_change: "上司変更",
  grade_change: "グレード変更",
};

const TYPE_VARIANT: Record<TransferRow["transfer_type"], "default" | "secondary" | "success" | "warning" | "outline"> = {
  promotion: "success",
  demotion: "warning",
  lateral: "secondary",
  role_change: "default",
  manager_change: "outline",
  grade_change: "default",
};

type FormState = {
  employee_id: string;
  transfer_type: TransferRow["transfer_type"];
  effective_date: string;
  to_department_id: string;
  to_manager_id: string;
  to_job_title: string;
  to_job_grade: string;
  reason: string;
};

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: FormState = {
  employee_id: "",
  transfer_type: "lateral",
  effective_date: TODAY,
  to_department_id: "",
  to_manager_id: "",
  to_job_title: "",
  to_job_grade: "",
  reason: "",
};

export function OrgManagementClient({
  initialTransfers,
  employees,
  departments,
}: {
  initialTransfers: TransferRow[];
  employees: EmployeeOption[];
  departments: DeptOption[];
}) {
  const [transfers, setTransfers] = useState<TransferRow[]>(initialTransfers);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const pending = transfers.filter((t) => !t.is_applied);
  const applied = transfers.filter((t) => t.is_applied);
  const thisYear = transfers.filter((t) => t.effective_date.startsWith("2026")).length;
  const promotions = transfers.filter((t) => t.transfer_type === "promotion").length;

  const selectedEmp = form.employee_id ? empMap.get(form.employee_id) : null;

  const onSubmit = async () => {
    if (!form.employee_id || !form.transfer_type || !form.effective_date) {
      toast.error("社員・異動タイプ・発令日は必須です");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/transfers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          employee_id: form.employee_id,
          transfer_type: form.transfer_type,
          effective_date: form.effective_date,
          to_department_id: form.to_department_id || null,
          to_manager_id: form.to_manager_id || null,
          to_job_title: form.to_job_title || undefined,
          to_job_grade: form.to_job_grade || undefined,
          reason: form.reason || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "辞令発行に失敗しました");
        setSaving(false);
        return;
      }
      toast.success(json.warning ? `辞令を発行しました（${json.warning}）` : "辞令を発行しました");
      setTransfers((prev) => [json.transfer, ...prev]);
      setOpen(false);
      setForm(EMPTY_FORM);
      // Reload to fetch updated employee state
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      console.error(e);
      toast.error("通信エラーが発生しました");
      setSaving(false);
    }
  };

  const onApply = async (t: TransferRow) => {
    if (!window.confirm(`${empMap.get(t.employee_id)?.full_name ?? "社員"} の異動辞令を今すぐ適用しますか？`)) return;
    try {
      const res = await fetch(`/api/admin/transfers/${t.id}/apply`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "適用に失敗しました");
        return;
      }
      toast.success("異動辞令を適用しました");
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error("通信エラーが発生しました");
    }
  };

  const onDelete = async (t: TransferRow) => {
    if (t.is_applied) {
      toast.error("適用済み辞令は履歴保持のため削除できません");
      return;
    }
    if (!window.confirm("この辞令を取り消しますか？")) return;
    try {
      const res = await fetch(`/api/admin/transfers/${t.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "削除に失敗しました");
        return;
      }
      toast.success("辞令を取り消しました");
      setTransfers((prev) => prev.filter((x) => x.id !== t.id));
    } catch (e) {
      console.error(e);
      toast.error("通信エラーが発生しました");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Shuffle className="size-6 text-gc-700" />
            組織管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            異動・配置・降格昇格の辞令発行 + employees レコードへの自動適用。
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          辞令を発行
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="予約中" value={pending.length} unit="件" icon={Calendar} tone="warning" />
        <KpiTile label="適用済み" value={applied.length} unit="件" icon={CheckCircle2} tone="success" />
        <KpiTile label="今年の異動" value={thisYear} unit="件" icon={Shuffle} tone="primary" />
        <KpiTile label="昇格" value={promotions} unit="件" icon={ArrowRight} tone="success" />
      </div>

      {pending.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">予約中の異動辞令 ({pending.length})</h3>
            <ul className="space-y-2">
              {pending.map((t) => (
                <TransferRowView
                  key={t.id}
                  transfer={t}
                  empMap={empMap}
                  deptMap={deptMap}
                  onApply={() => onApply(t)}
                  onDelete={() => onDelete(t)}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">適用済み履歴 ({applied.length})</h3>
          {applied.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              まだ適用済みの異動辞令はありません
            </p>
          ) : (
            <ul className="space-y-2">
              {applied.map((t) => (
                <TransferRowView
                  key={t.id}
                  transfer={t}
                  empMap={empMap}
                  deptMap={deptMap}
                  onApply={null}
                  onDelete={null}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 辞令発行ダイアログ */}
      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>異動辞令を発行</DialogTitle>
            <DialogDescription>
              発令日が今日以前なら即座に employees に反映されます。
              未来日付なら予約状態で保持し、後で「適用」ボタンで反映できます。
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <Field label="対象社員 *">
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="社員を選択" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="異動タイプ *">
              <Select value={form.transfer_type} onValueChange={(v) => setForm({ ...form, transfer_type: v as TransferRow["transfer_type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="発令日 *">
              <Input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
            </Field>
            <Field label="変更後の部署">
              <Select value={form.to_department_id || "_none"} onValueChange={(v) => setForm({ ...form, to_department_id: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="変更なし" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">変更なし</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="変更後の上司">
              <Select value={form.to_manager_id || "_none"} onValueChange={(v) => setForm({ ...form, to_manager_id: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="変更なし" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">変更なし</SelectItem>
                  {employees.filter((e) => e.id !== form.employee_id).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="変更後の職位">
              <Input value={form.to_job_title} onChange={(e) => setForm({ ...form, to_job_title: e.target.value })} placeholder="例: シニアエンジニア" />
            </Field>
            <Field label="変更後のグレード">
              <Input value={form.to_job_grade} onChange={(e) => setForm({ ...form, to_job_grade: e.target.value })} placeholder="例: M3" />
            </Field>
            <div className="col-span-2">
              <Field label="理由 / 備考">
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="本人希望 / 組織再編 / 評価による昇格 等" />
              </Field>
            </div>
          </div>

          {selectedEmp && (
            <div className="rounded-md border bg-muted/30 p-2.5 text-xs">
              <div className="font-medium">{selectedEmp.full_name} 現在の所属</div>
              <div className="mt-1 text-muted-foreground space-y-0.5">
                <div>部署: {selectedEmp.department_id ? deptMap.get(selectedEmp.department_id)?.name : "—"}</div>
                <div>上司: {selectedEmp.manager_id ? empMap.get(selectedEmp.manager_id)?.full_name : "—"}</div>
                <div>職位: {selectedEmp.job_title || "—"}</div>
                <div>グレード: {selectedEmp.job_grade || "—"}</div>
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              <X className="size-4" /> キャンセル
            </Button>
            <Button onClick={onSubmit} disabled={saving || !form.employee_id}>
              {saving ? "発行中..." : "辞令を発行"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransferRowView({
  transfer, empMap, deptMap, onApply, onDelete,
}: {
  transfer: TransferRow;
  empMap: Map<string, EmployeeOption>;
  deptMap: Map<string, DeptOption>;
  onApply: (() => void) | null;
  onDelete: (() => void) | null;
}) {
  const emp = empMap.get(transfer.employee_id);
  const fromDept = transfer.from_department_id ? deptMap.get(transfer.from_department_id) : null;
  const toDept = transfer.to_department_id ? deptMap.get(transfer.to_department_id) : null;
  const fromManager = transfer.from_manager_id ? empMap.get(transfer.from_manager_id) : null;
  const toManager = transfer.to_manager_id ? empMap.get(transfer.to_manager_id) : null;

  return (
    <li className="rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback>{emp ? initials(emp.full_name) : "—"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{emp?.full_name ?? "—"}</span>
            <Badge variant={TYPE_VARIANT[transfer.transfer_type]}>{TYPE_LABEL[transfer.transfer_type]}</Badge>
            {transfer.is_applied ? (
              <Badge variant="success">適用済</Badge>
            ) : (
              <Badge variant="warning">予約中</Badge>
            )}
          </div>
          <div className="mt-1 space-y-0.5 text-xs">
            {(fromDept || toDept) && (
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-muted px-2 py-0.5">{fromDept?.name ?? "未配属"}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span className="rounded-full bg-gc-50 px-2 py-0.5 text-gc-800">{toDept?.name ?? "(変更なし)"}</span>
              </div>
            )}
            {(transfer.from_job_title || transfer.to_job_title) && (
              <div className="text-muted-foreground">
                職位: {transfer.from_job_title || "—"} → {transfer.to_job_title || "(変更なし)"}
              </div>
            )}
            {(fromManager || toManager) && (
              <div className="text-muted-foreground">
                上司: {fromManager?.full_name || "—"} → {toManager?.full_name || "(変更なし)"}
              </div>
            )}
            <div className="text-muted-foreground">
              発令日: {transfer.effective_date}
              {transfer.reason && <span> · 理由: {transfer.reason}</span>}
            </div>
          </div>
        </div>
        {onApply && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={onApply} className="h-7 text-xs">
              <CheckCircle2 className="size-3" /> 適用
            </Button>
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete} aria-label="取消">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function KpiTile({
  icon: Icon, label, value, unit, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; unit: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
}) {
  const cls = {
    primary: "text-gc-700 bg-gc-50 border-gc-200",
    success: "text-emerald-700 bg-emerald-50 border-emerald-200",
    warning: "text-amber-800 bg-amber-50 border-amber-200",
    danger: "text-red-800 bg-red-50 border-red-200",
    muted: "text-muted-foreground bg-muted/50 border-border",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
