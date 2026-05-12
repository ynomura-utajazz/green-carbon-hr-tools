"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Plus, Pencil, Trash2, Users, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Department = {
  id: string;
  parent_id: string | null;
  code: string | null;
  name: string;
  display_order: number;
  employee_count: number;
};

type TreeNode = Department & { children: TreeNode[] };

type FormState = {
  mode: "create" | "edit";
  id?: string;             // edit 時のみ
  parentId: string | null; // create 時の親
  name: string;
  code: string;
  display_order: number;
};

export function DepartmentsClient({ departments }: { departments: Department[] }) {
  const [list, setList] = useState<Department[]>(departments);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(departments.map((d) => d.id)));
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const tree = useMemo(() => buildTree(list), [list]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(parentId: string | null) {
    setForm({ mode: "create", parentId, name: "", code: "", display_order: 0 });
  }

  function openEdit(d: Department) {
    setForm({
      mode: "edit",
      id: d.id,
      parentId: d.parent_id,
      name: d.name,
      code: d.code ?? "",
      display_order: d.display_order,
    });
  }

  async function handleSave() {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("部署名は必須です");
      return;
    }
    setSaving(true);
    try {
      if (form.mode === "create") {
        const res = await fetch("/api/admin/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent_id: form.parentId,
            name: form.name.trim(),
            code: form.code.trim() || null,
            display_order: form.display_order,
          }),
        });
        const j = (await res.json()) as { ok: boolean; error?: string; department?: Department };
        if (!j.ok || !j.department) throw new Error(j.error ?? "作成失敗");
        setList((prev) => [...prev, j.department!]);
        setExpanded((prev) => new Set(prev).add(j.department!.id));
        toast.success("部署を作成しました");
      } else if (form.mode === "edit" && form.id) {
        const res = await fetch(`/api/admin/departments/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent_id: form.parentId,
            name: form.name.trim(),
            code: form.code.trim() || null,
            display_order: form.display_order,
          }),
        });
        const j = (await res.json()) as { ok: boolean; error?: string; department?: Department };
        if (!j.ok || !j.department) throw new Error(j.error ?? "更新失敗");
        setList((prev) => prev.map((d) => (d.id === form.id ? { ...d, ...j.department! } : d)));
        toast.success("部署を更新しました");
      }
      setForm(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(d: Department) {
    if (d.employee_count > 0) {
      toast.error(`所属社員が ${d.employee_count} 名います。先に異動してください`);
      return;
    }
    const hasChildren = list.some((x) => x.parent_id === d.id);
    if (hasChildren) {
      toast.error("子部署があるため削除できません。先に子部署を整理してください");
      return;
    }
    if (!confirm(`「${d.name}」を削除します。よろしいですか？`)) return;
    try {
      const res = await fetch(`/api/admin/departments/${d.id}`, { method: "DELETE" });
      const j = (await res.json()) as { ok: boolean; error?: string };
      if (!j.ok) throw new Error(j.error ?? "削除失敗");
      setList((prev) => prev.filter((x) => x.id !== d.id));
      toast.success("部署を削除しました");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const totalEmployees = list.reduce((sum, d) => sum + d.employee_count, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Building2 className="size-6 text-gc-700" />
            部署管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            組織図の追加・編集・削除・親変更。配下に社員がいる部署は削除できません。
          </p>
        </div>
        <Button onClick={() => openCreate(null)}>
          <Plus className="size-4" />
          ルート部署を追加
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="部署総数" value={list.length} unit="件" />
        <KpiTile label="所属社員総数" value={totalEmployees} unit="名" />
        <KpiTile label="最大深度" value={maxDepth(tree)} unit="階層" />
        <KpiTile label="空部署" value={list.filter((d) => d.employee_count === 0).length} unit="件" />
      </div>

      <Card>
        <CardContent className="p-2">
          {tree.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              部署がまだ登録されていません。「ルート部署を追加」から始めてください。
            </div>
          ) : (
            <ul className="space-y-0.5">
              {tree.map((node) => (
                <TreeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  onAddChild={openCreate}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {form && (
        <DepartmentFormDialog
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={() => setForm(null)}
          saving={saving}
          departments={list}
        />
      )}
    </div>
  );
}

function TreeRow({
  node, depth, expanded, onToggle, onAddChild, onEdit, onDelete,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string | null) => void;
  onEdit: (d: Department) => void;
  onDelete: (d: Department) => void;
}) {
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-md py-1.5 pr-2 hover:bg-muted/40",
        )}
        style={{ paddingLeft: depth * 20 + 8 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground",
            hasChildren ? "hover:bg-muted hover:text-foreground" : "invisible",
          )}
          aria-label={isOpen ? "折りたたむ" : "展開"}
        >
          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <Building2 className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium">{node.name}</span>
        {node.code && (
          <Badge variant="outline" className="font-mono text-[10px]">
            {node.code}
          </Badge>
        )}
        <Badge variant="secondary" className="ml-auto text-xs">
          <Users className="mr-1 size-3" />
          {node.employee_count}
        </Badge>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="icon" variant="ghost" className="size-7" onClick={() => onAddChild(node.id)} title="子部署を追加">
            <Plus className="size-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => onEdit(node)} title="編集">
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(node)}
            title="削除"
            disabled={node.employee_count > 0 || hasChildren}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {isOpen && hasChildren && (
        <ul>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function DepartmentFormDialog({
  form, setForm, onSave, onCancel, saving, departments,
}: {
  form: FormState;
  setForm: (f: FormState | null) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  departments: Department[];
}) {
  // 編集時、自分の子孫を parent にできないようフィルタ
  const descendantIds = useMemo(() => {
    if (form.mode !== "edit" || !form.id) return new Set<string>();
    const out = new Set<string>([form.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const d of departments) {
        if (d.parent_id && out.has(d.parent_id) && !out.has(d.id)) {
          out.add(d.id);
          changed = true;
        }
      }
    }
    return out;
  }, [form.id, form.mode, departments]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {form.mode === "create" ? "部署を追加" : "部署を編集"}
            </h2>
            <Button size="icon" variant="ghost" onClick={onCancel}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="dept-name" className="text-sm font-medium">部署名 *</label>
              <Input
                id="dept-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例：プロダクト開発部"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dept-code" className="text-sm font-medium">部署コード（任意）</label>
              <Input
                id="dept-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="例：G1-2-4"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                組織図で識別する一意のコード。空欄でも OK
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dept-parent" className="text-sm font-medium">親部署</label>
              <Select
                value={form.parentId ?? "__root__"}
                onValueChange={(v) =>
                  setForm({ ...form, parentId: v === "__root__" ? null : v })
                }
              >
                <SelectTrigger id="dept-parent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">（ルート / 親なし）</SelectItem>
                  {departments
                    .filter((d) => !descendantIds.has(d.id))
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.code ? `[${d.code}] ` : ""}{d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dept-order" className="text-sm font-medium">表示順</label>
              <Input
                id="dept-order"
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              キャンセル
            </Button>
            <Button onClick={onSave} disabled={saving}>
              <Save className="size-4" />
              {saving ? "保存中..." : form.mode === "create" ? "作成" : "更新"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-xl font-bold tabular-nums">{value}</span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── helpers ───────────────────────────────────────────────────────
function buildTree(flat: Department[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const d of flat) byId.set(d.id, { ...d, children: [] });
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // sort by display_order then name
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function maxDepth(nodes: TreeNode[], depth = 1): number {
  if (!nodes.length) return 0;
  return Math.max(...nodes.map((n) => (n.children.length ? maxDepth(n.children, depth + 1) : depth)));
}
