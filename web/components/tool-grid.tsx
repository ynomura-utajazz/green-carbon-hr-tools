"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { TOOLS, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/tools";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ToolGrid() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (activeCategory !== "all" && t.category !== activeCategory) return false;
      if (!q) return true;
      const haystack = [t.name, t.description, ...t.keywords].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [query, activeCategory]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ツール名・キーワードで絞り込む..."
          className="h-10 pl-9"
        />
      </div>

      {/* カテゴリタブ */}
      <div className="flex flex-wrap gap-1.5">
        <CategoryChip label="すべて" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
        {CATEGORY_ORDER.map((c) => (
          <CategoryChip
            key={c}
            label={CATEGORY_LABELS[c]}
            active={activeCategory === c}
            onClick={() => setActiveCategory(c)}
          />
        ))}
      </div>

      {/* グリッド */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tool) => {
          const Icon = tool.icon;
          const disabled = tool.status === "planned";
          return (
            <Link
              key={tool.id}
              href={disabled ? "#" : tool.href}
              aria-disabled={disabled}
              onClick={(e) => disabled && e.preventDefault()}
              className={cn(
                "group relative",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <Card className="relative h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:border-gc-400 group-hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gc-500 transition-transform group-hover:scale-x-100" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-gc-100 text-gc-700">
                      <Icon className="size-5" />
                    </div>
                    <div className="flex gap-1">
                      {tool.status === "beta" && <Badge variant="beta">Beta</Badge>}
                      {tool.status === "planned" && <Badge variant="outline">準備中</Badge>}
                    </div>
                  </div>
                  <CardTitle className="mt-3 text-base">{tool.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                  <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                    {tool.description}
                  </CardDescription>
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    {tool.keywords.slice(0, 3).map((k) => (
                      <span key={k} className="rounded-md bg-muted px-1.5 py-0.5">{k}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-gc-600 opacity-0 transition-opacity group-hover:opacity-100">
                    開く <ArrowRight className="size-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            該当するツールが見つかりません。
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-sm transition-colors",
        active
          ? "border-gc-600 bg-gc-600 text-white"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
    </button>
  );
}
