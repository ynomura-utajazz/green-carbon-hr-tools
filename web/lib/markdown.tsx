/**
 * 軽量 Markdown レンダラ。外部依存なしで主要記法をサポート。
 * - # 〜 #### 見出し
 * - **bold** / *italic* / `code`
 * - リスト（- / 1.）
 * - 引用 >
 * - リンク [text](url)
 * - コードブロック ``` (single）
 * - 水平線 ---
 *
 * 完全な互換性は不要。社内 Wiki の用途では十分。
 */

import Link from "next/link";
import { cn } from "./utils";

type Token =
  | { kind: "h1" | "h2" | "h3" | "h4"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "code"; lang: string; text: string }
  | { kind: "hr" };

function tokenize(md: string): Token[] {
  const lines = md.split("\n");
  const tokens: Token[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 見出し
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length as 1 | 2 | 3 | 4;
      tokens.push({ kind: `h${level}` as Token["kind"], text: h[2] } as Token);
      i++;
      continue;
    }

    // 水平線
    if (/^---+$/.test(line.trim())) {
      tokens.push({ kind: "hr" });
      i++;
      continue;
    }

    // コードブロック
    const code = line.match(/^```(\w*)/);
    if (code) {
      const lang = code[1];
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // 閉じる
      tokens.push({ kind: "code", lang, text: buf.join("\n") });
      continue;
    }

    // 引用
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2));
        i++;
      }
      tokens.push({ kind: "quote", text: buf.join("\n") });
      continue;
    }

    // 順序リスト
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      tokens.push({ kind: "ol", items });
      continue;
    }

    // 順序なしリスト
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      tokens.push({ kind: "ul", items });
      continue;
    }

    // 段落
    if (line.trim() === "") {
      i++;
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].match(/^(#|>|---|```|[-*]\s|\d+\.\s)/)) {
      buf.push(lines[i]);
      i++;
    }
    tokens.push({ kind: "p", text: buf.join(" ") });
  }
  return tokens;
}

// インライン記法（**bold**, *italic*, `code`, [text](url)）
function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let key = 0;

  // 順番に処理：リンク → コード → bold → italic
  // 簡易的な置換ベース（重複なしと仮定）
  const regex = /(\[([^\]]+)\]\(([^)]+)\))|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      out.push(text.slice(lastIdx, m.index));
    }
    const matched = m[0];
    if (matched.startsWith("[")) {
      const linkText = m[2];
      const url = m[3];
      const isInternal = url.startsWith("/");
      out.push(
        isInternal ? (
          <Link key={key++} href={url} className="text-blue-700 underline hover:no-underline">
            {linkText}
          </Link>
        ) : (
          <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:no-underline">
            {linkText}
          </a>
        )
      );
    } else if (matched.startsWith("`")) {
      out.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
          {matched.slice(1, -1)}
        </code>
      );
    } else if (matched.startsWith("**")) {
      out.push(<strong key={key++}>{matched.slice(2, -2)}</strong>);
    } else if (matched.startsWith("*")) {
      out.push(<em key={key++}>{matched.slice(1, -1)}</em>);
    }
    lastIdx = m.index + matched.length;
  }
  if (lastIdx < text.length) out.push(text.slice(lastIdx));
  return out;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const tokens = tokenize(source);
  return (
    <div className={cn("space-y-4 text-sm leading-relaxed", className)}>
      {tokens.map((t, i) => {
        switch (t.kind) {
          case "h1":
            return <h1 key={i} className="mt-2 text-2xl font-extrabold tracking-tight">{renderInline(t.text)}</h1>;
          case "h2":
            return <h2 key={i} className="mt-4 border-b pb-1 text-xl font-bold tracking-tight">{renderInline(t.text)}</h2>;
          case "h3":
            return <h3 key={i} className="mt-3 text-base font-semibold">{renderInline(t.text)}</h3>;
          case "h4":
            return <h4 key={i} className="mt-2 text-sm font-semibold text-muted-foreground">{renderInline(t.text)}</h4>;
          case "p":
            return <p key={i}>{renderInline(t.text)}</p>;
          case "ul":
            return (
              <ul key={i} className="ml-5 list-disc space-y-1">
                {t.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="ml-5 list-decimal space-y-1">
                {t.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-4 border-gc-300 bg-gc-50/40 px-4 py-2 italic">
                {renderInline(t.text)}
              </blockquote>
            );
          case "code":
            return (
              <pre key={i} className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                <code className="font-mono">{t.text}</code>
              </pre>
            );
          case "hr":
            return <hr key={i} className="border-border" />;
          default:
            return null;
        }
      })}
    </div>
  );
}

export function extractHeadings(md: string): { level: number; text: string }[] {
  const result: { level: number; text: string }[] = [];
  const lines = md.split("\n");
  for (const line of lines) {
    const m = line.match(/^(#{1,4})\s+(.*)$/);
    if (m) result.push({ level: m[1].length, text: m[2] });
  }
  return result;
}
