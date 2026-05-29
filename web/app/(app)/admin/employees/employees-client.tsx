"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { cn, initials } from "@/lib/utils";

export type EmployeeRow = {
  id: string;
  employee_code: string;
  email: string;
  full_name: string;
  full_name_kana: string | null;
  preferred_name: string | null;
  display_name_en: string | null;
  department_id: string | null;
  manager_id: string | null;
  job_title: string | null;
  job_grade: string | null;
  employment_type: "full_time" | "part_time" | "contract" | "intern" | "business_partner";
  status: "active" | "on_leave" | "resigned";
  hire_date: string | null;
  resign_date: string | null;
  nationality: string | null;
};

export type DeptOption = {
  id: string;
  name: string;
  parent_id: string | null;
};

const EMP_TYPE_LABEL = {
  full_time: "正社員",
  part_time: "パート",
  contract: "契約社員",
  intern: "インターン",
  business_partner: "業務委託",
} as const;

const STATUS_LABEL = {
  active: "在籍",
  on_leave: "休職",
  resigned: "退職",
} as const;

const STATUS_VARIANT: Record<EmployeeRow["status"], "default" | "secondary" | "danger" | "outline"> = {
  active: "default",
  on_leave: "secondary",
  resigned: "outline",
};

type FormState = Partial<EmployeeRow> & { _saving?: boolean };

const EMPTY_FORM: FormState = {
  employee_code: "",
  email: "",
  full_name: "",
  full_name_kana: "",
  department_id: null,
  manager_id: null,
  job_title: "",
  employment_type: "full_time",
  status: "active",
};

export function EmployeesClient({
  initialEmployees,
  departments,
}: {
  initialEmployees: EmployeeRow[];
  departments: DeptOption[];
}) {
  const [employees, setEmployees] = useState<EmployeeRow[]>(initialEmployees);
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (deptFilter !== "all" && e.department_id !== deptFilter) return false;
      if (!q) return true;
      return (
        e.full_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.employee_code || "").toLowerCase().includes(q) ||
        (e.job_title || "").toLowerCase().includes(q)
      );
    });
  }, [employees, query, deptFilter]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (emp: EmployeeRow) => {
    setForm(emp);
    setEditingId(emp.id);
    setDialogOpen(true);
  };

  const onSave = async () => {
    if (!form.full_name?.trim() || !form.email?.trim()) {
      toast.error("氏名とメールは必須です");
      return;
    }
    setForm((f) => ({ ...f, _saving: true }));

    const body = {
      employee_code: form.employee_code || undefined,
      email: form.email,
      full_name: form.full_name,
      full_name_kana: form.full_name_kana || undefined,
      preferred_name: form.preferred_name || undefined,
      display_name_en: form.display_name_en || undefined,
      department_id: form.department_id ?? null,
      manager_id: form.manager_id ?? null,
      job_title: form.job_title || undefined,
      job_grade: form.job_grade || undefined,
      employment_type: form.employment_type,
      status: form.status,
      hire_date: form.hire_date || undefined,
      resign_date: form.resign_date || undefined,
      nationality: form.nationality || undefined,
    };

    try {
      const isEdit = editingId !== null;
      const res = await fetch(
        isEdit ? `/api/admin/employees/${editingId}` : "/api/admin/employees",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "保存に失敗しました");
        setForm((f) => ({ ...f, _saving: false }));
        return;
      }
      const saved = json.employee as EmployeeRow;
      setEmployees((prev) => {
        if (isEdit) return prev.map((e) => (e.id === saved.id ? saved : e));
        return [...prev, saved].sort((a, b) => a.full_name.localeCompare(b.full_name));
      });
      toast.success(isEdit ? "社員情報を更新しました" : "社員を追加しました");
      setDialogOpen(false);
    } catch (e) {
      toast.error("通信エラーが発生しました");
      console.error(e);
      setForm((f) => ({ ...f, _saving: false }));
    }
  };

  const onDelete = async (emp: EmployeeRow) => {
    if (!window.confirm(`${emp.full_name} を削除しますか？\n（履歴は残ります — soft delete）`)) return;
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.message || json.error || "削除に失敗しました");
        return;
      }
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      toast.success(`${emp.full_name} を削除しました`);
    } catch (e) {
      toast.error("通信エラーが発生しました");
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">社員管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            社員の追加・編集・退職処理。配下に部下がいる社員は削除できません（先に異動辞令で manager 変更）。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> 社員を追加
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="総社員数" value={employees.length} />
        <Kpi label="在籍" value={employees.filter((e) => e.status === "active").length} tone="success" />
        <Kpi label="休職" value={employees.filter((e) => e.status === "on_leave").length} tone="warning" />
        <Kpi label="退職" value={employees.filter((e) => e.status === "resigned").length} tone="muted" />
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="名前・メール・社員コード・職位で検索"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="部署で絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての部署</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 一覧 */}
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {filtered.length === 0 && (
              <li className="py-10 text-center text-sm text-muted-foreground">
                該当する社員はいません
              </li>
            )}
            {filtered.map((emp) => {
              const dept = emp.department_id ? deptMap.get(emp.department_id) : null;
              const manager = emp.manager_id ? empMap.get(emp.manager_id) : null;
              return (
                <li key={emp.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/40">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="text-[10px]">{initials(emp.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-[180px] flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{emp.full_name}</span>
                      <Badge variant={STATUS_VARIANT[emp.status]}>{STATUS_LABEL[emp.status]}</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {EMP_TYPE_LABEL[emp.employment_type]}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {emp.employee_code} · {emp.email}
                    </div>
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block min-w-[140px]">
                    {emp.job_title || "—"}
                  </div>
                  <div className="hidden text-xs text-muted-foreground md:block min-w-[120px]">
                    {dept?.name || "—"}
                  </div>
                  <div className="hidden text-xs text-muted-foreground lg:block min-w-[120px]">
                    上司: {manager?.full_name || "—"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} aria-label="編集">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(emp)} aria-label="削除">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* 追加・編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !form._saving && setDialogOpen(o)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "社員を編集" : "社員を追加"}</DialogTitle>
            <DialogDescription>
              {editingId ? "情報を変更して保存してください。" : "新規入社時にこのフォームから登録します。"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <Field label="氏名 *">
              <Input value={form.full_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="例: 山田 太郎" />
            </Field>
            <Field label="フリガナ">
              <Input value={form.full_name_kana ?? ""} onChange={(e) => setForm((f) => ({ ...f, full_name_kana: e.target.value }))} placeholder="ヤマダ タロウ" />
            </Field>
            <Field label="メール *">
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="taro@green-carbon.inc" />
            </Field>
            <Field label="社員コード">
              <Input value={form.employee_code ?? ""} onChange={(e) => setForm((f) => ({ ...f, employee_code: e.target.value }))} placeholder="空欄なら自動採番" />
            </Field>
            <Field label="部署">
              <Select
                value={form.department_id ?? "_none"}
                onValueChange={(v) => setForm((f) => ({ ...f, department_id: v === "_none" ? null : v }))}
              >
                <SelectTrigger><SelectValue placeholder="未配属" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">（未配属）</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="上司">
              <Select
                value={form.manager_id ?? "_none"}
                onValueChange={(v) => setForm((f) => ({ ...f, manager_id: v === "_none" ? null : v }))}
              >
                <SelectTrigger><SelectValue placeholder="未設定" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">（上司なし）</SelectItem>
                  {employees
                    .filter((e) => e.id !== editingId && e.status === "active")
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="職位">
              <Input value={form.job_title ?? ""} onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))} placeholder="例: シニアエンジニア" />
            </Field>
            <Field label="ジョブグレード">
              <Input value={form.job_grade ?? ""} onChange={(e) => setForm((f) => ({ ...f, job_grade: e.target.value }))} placeholder="例: M3" />
            </Field>
            <Field label="雇用形態">
              <Select value={form.employment_type ?? "full_time"} onValueChange={(v) => setForm((f) => ({ ...f, employment_type: v as EmployeeRow["employment_type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EMP_TYPE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="ステータス">
              <Select value={form.status ?? "active"} onValueChange={(v) => setForm((f) => ({ ...f, status: v as EmployeeRow["status"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="入社日">
              <Input type="date" value={form.hire_date ?? ""} onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))} />
            </Field>
            <Field label="退職日">
              <Input type="date" value={form.resign_date ?? ""} onChange={(e) => setForm((f) => ({ ...f, resign_date: e.target.value }))} />
            </Field>
            <Field label="国籍">
              <Input value={form.nationality ?? ""} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} placeholder="JP / VN / ID 等" />
            </Field>
            <Field label="英語表記名">
              <Input value={form.display_name_en ?? ""} onChange={(e) => setForm((f) => ({ ...f, display_name_en: e.target.value }))} placeholder="Taro Yamada" />
            </Field>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={form._saving}>
              <X className="size-4" /> キャンセル
            </Button>
            <Button onClick={onSave} disabled={form._saving}>
              {form._saving ? "保存中..." : editingId ? "更新" : "作成"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" | "muted" }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "success" && "text-emerald-700",
          tone === "warning" && "text-amber-700",
          tone === "muted" && "text-muted-foreground",
        )}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
