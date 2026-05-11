"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen, Pin, TrendingUp, Clock, Search, ChevronRight, X, Tag, Eye, Edit3,
  Plus, Filter,
} from "lucide-react";
import {
  type WikiPage, type WikiCategory, CATEGORY_LABEL, CATEGORY_TONE, pagesByCategory,
  pinnedPages, recentPages, popularPages, pageBySlug,
} from "@/lib/demo/wiki";
import { type DemoEmployee } from "@/lib/demo/employees";
import { Markdown, extractHeadings } from "@/lib/markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { initials, formatDate, relativeTime, cn } from "@/lib/utils";

export function WikiClient({
  pages, employees,
}: {
  pages: WikiPage[];
  employees: DemoEmployee[];
}) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const [tab, setTab] = useState<"home" | "browse" | "recent">("home");
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<WikiCategory | "all">("all");

  const grouped = pagesByCategory();
  const pinned = pinnedPages();
  const recent = recentPages(6);
  const popular = popularPages(5);

  const searched = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return pages.filter((p) => `${p.title} ${p.content} ${p.tags.join(" ")}`.toLowerCase().includes(q));
  }, [pages, query]);

  const browseFiltered = useMemo(() => {
    return categoryFilter === "all"
      ? pages
      : pages.filter((p) => p.category === categoryFilter);
  }, [pages, categoryFilter]);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BookOpen className="size-6 text-gc-700" />
            社内 Wiki
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            会社情報・HR制度・テック・カルチャー — 全社共通の情報基盤。
          </p>
        </div>
        <Button className="gap-1.5">
          <Plus className="size-4" />
          ページ作成
        </Button>
      </div>

      {/* グローバル検索 */}
      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="キーワード・タグで全文検索..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* 検索結果 */}
      {query && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">検索結果（{searched.length} 件）</h3>
          {searched.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                マッチするページがありません
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {searched.map((p) => <PageRow key={p.id} page={p} empMap={empMap} onClick={() => setSelectedPage(p)} />)}
            </ul>
          )}
        </div>
      )}

      {!query && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="home" className="gap-2"><Pin className="size-3.5" />ホーム</TabsTrigger>
            <TabsTrigger value="browse" className="gap-2"><Filter className="size-3.5" />カテゴリ別</TabsTrigger>
            <TabsTrigger value="recent" className="gap-2"><Clock className="size-3.5" />最近の更新</TabsTrigger>
          </TabsList>

          <TabsContent value="home">
            <div className="grid gap-4 lg:grid-cols-3">
              {/* ピン留め */}
              <div className="lg:col-span-2">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Pin className="size-4 text-gc-700" />
                  ピン留めされたページ
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {pinned.map((p) => <PageCard key={p.id} page={p} empMap={empMap} onClick={() => setSelectedPage(p)} />)}
                </div>
              </div>

              {/* 人気ページ */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="size-4 text-gc-700" />
                  よく見られるページ
                </h3>
                <ul className="space-y-1.5">
                  {popular.map((p, i) => (
                    <li key={p.id}>
                      <button
                        onClick={() => setSelectedPage(p)}
                        className="flex w-full items-center gap-2 rounded-md border bg-card p-2 text-left text-sm transition-colors hover:bg-accent/40"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium">{p.title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            <Eye className="inline size-2.5" /> {p.views}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                <h3 className="mt-4 mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Clock className="size-4 text-gc-700" />
                  最近の更新
                </h3>
                <ul className="space-y-1.5">
                  {recent.slice(0, 5).map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => setSelectedPage(p)}
                        className="block w-full rounded-md border bg-card p-2 text-left text-sm transition-colors hover:bg-accent/40"
                      >
                        <div className="truncate text-xs font-medium">{p.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {relativeTime(p.last_updated_at)}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="browse">
            <div className="mb-3 flex flex-wrap gap-1.5">
              <CategoryChip
                label="すべて"
                active={categoryFilter === "all"}
                count={pages.length}
                onClick={() => setCategoryFilter("all")}
              />
              {(Object.keys(CATEGORY_LABEL) as WikiCategory[]).map((c) => (
                <CategoryChip
                  key={c}
                  label={CATEGORY_LABEL[c]}
                  active={categoryFilter === c}
                  count={grouped.get(c)?.length ?? 0}
                  onClick={() => setCategoryFilter(c)}
                />
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {browseFiltered.map((p) => <PageCard key={p.id} page={p} empMap={empMap} onClick={() => setSelectedPage(p)} />)}
            </div>
          </TabsContent>

          <TabsContent value="recent">
            <ul className="space-y-2">
              {recent.map((p) => <PageRow key={p.id} page={p} empMap={empMap} onClick={() => setSelectedPage(p)} />)}
            </ul>
          </TabsContent>
        </Tabs>
      )}

      <Sheet open={!!selectedPage} onOpenChange={(o) => !o && setSelectedPage(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-3xl" showClose={false}>
          {selectedPage && (
            <PageDetail
              page={selectedPage}
              empMap={empMap}
              onClose={() => setSelectedPage(null)}
              onSelectRelated={setSelectedPage}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CategoryChip({
  label, active, count, onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-7 rounded-full border px-2.5 text-xs transition-colors",
        active
          ? "border-gc-600 bg-gc-600 text-white"
          : "hover:bg-accent",
      )}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  );
}

function PageCard({
  page, empMap, onClick,
}: {
  page: WikiPage;
  empMap: Map<string, DemoEmployee>;
  onClick: () => void;
}) {
  const author = empMap.get(page.author_id);
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <BookOpen className="size-4 shrink-0 text-gc-700 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", CATEGORY_TONE[page.category])}>
                {CATEGORY_LABEL[page.category]}
              </span>
              {page.pinned && <Pin className="size-3 text-gc-700" />}
            </div>
            <h3 className="mt-1 line-clamp-2 font-semibold">{page.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              {author && (
                <span className="inline-flex items-center gap-1">
                  <Avatar className="size-3.5"><AvatarFallback className="text-[7px]">{initials(author.full_name)}</AvatarFallback></Avatar>
                  {author.full_name}
                </span>
              )}
              <span>·</span>
              <span>{relativeTime(page.last_updated_at)}</span>
              <span>·</span>
              <span><Eye className="inline size-2.5" /> {page.views}</span>
            </div>
            {page.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {page.tags.slice(0, 3).map((t) => (
                  <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PageRow({
  page, empMap, onClick,
}: {
  page: WikiPage;
  empMap: Map<string, DemoEmployee>;
  onClick: () => void;
}) {
  const author = empMap.get(page.author_id);
  return (
    <li>
      <Card
        onClick={onClick}
        className="cursor-pointer transition-colors hover:bg-accent/40"
      >
        <CardContent className="flex items-start gap-3 p-3">
          <BookOpen className="size-4 shrink-0 text-gc-700 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", CATEGORY_TONE[page.category])}>
                {CATEGORY_LABEL[page.category]}
              </span>
              {page.pinned && <Pin className="size-3 text-gc-700" />}
              <span className="font-semibold">{page.title}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              {author && <span>{author.full_name}</span>}
              <span>·</span>
              <span>{relativeTime(page.last_updated_at)}</span>
              <span>·</span>
              <span><Eye className="inline size-2.5" /> {page.views}</span>
            </div>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </li>
  );
}

function PageDetail({
  page, empMap, onClose, onSelectRelated,
}: {
  page: WikiPage;
  empMap: Map<string, DemoEmployee>;
  onClose: () => void;
  onSelectRelated: (p: WikiPage) => void;
}) {
  const author = empMap.get(page.author_id);
  const headings = extractHeadings(page.content);
  const related = page.related_slugs?.map((s) => pageBySlug(s)).filter(Boolean) as WikiPage[] | undefined;

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", CATEGORY_TONE[page.category])}>
                {CATEGORY_LABEL[page.category]}
              </span>
              {page.pinned && <Pin className="size-3 text-gc-700" />}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => toast.success("編集モードを開きました（デモ）")}>
              <Edit3 className="size-3.5" />
              編集
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {author && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar className="size-5"><AvatarFallback className="text-[8px]">{initials(author.full_name)}</AvatarFallback></Avatar>
              {author.full_name}
            </span>
          )}
          <span>·</span>
          <span>更新 {formatDate(page.last_updated_at)}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Eye className="size-2.5" />{page.views}</span>
        </div>

        {page.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {page.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-0.5 rounded-full border bg-muted/50 px-2 py-0.5 text-[10px]">
                <Tag className="size-2.5" />
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex">
        {/* TOC */}
        {headings.length > 1 && (
          <aside className="hidden w-48 shrink-0 border-r p-4 md:block">
            <div className="sticky top-32">
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                目次
              </h4>
              <ul className="space-y-1 text-xs">
                {headings.map((h, i) => (
                  <li key={i} className={cn("text-muted-foreground hover:text-foreground", h.level === 2 && "ml-2", h.level === 3 && "ml-4")}>
                    {h.text}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1 p-5">
          <Markdown source={page.content} />

          {/* 関連ページ */}
          {related && related.length > 0 && (
            <div className="mt-8 border-t pt-5">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                関連ページ
              </h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {related.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => onSelectRelated(r)}
                      className="flex w-full items-center gap-2 rounded-md border bg-card p-2 text-left text-sm transition-colors hover:bg-accent/40"
                    >
                      <BookOpen className="size-3.5 shrink-0 text-gc-700" />
                      <span className="truncate">{r.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
