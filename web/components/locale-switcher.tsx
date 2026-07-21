"use client";

import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectClientLocale, setClientLocale, type Locale } from "@/lib/i18n";

// 言語切替 UI の表示フラグ。
// 現状 i18n 辞書は共通 UI（ナビ・見出し等 115 キー）しかカバーしておらず、
// 各ページ本文の大半（約 3,687 行）は日本語ベタ書きのまま。この状態で
// スイッチャーを出すと「切り替えられそうなのに英語化されない」と映り、
// テストで毎回 FAIL 扱いになる（T-UX-005）。将来オープン前に海外メンバー
// 向けの本格英語化を行う想定で、i18n の土台（lib/i18n / messages / t()）は
// すべて温存したまま、UI だけを一旦隠す。英語化が済んだら true に戻すだけ。
const SHOW_LOCALE_SWITCHER = false;

export function LocaleSwitcher() {
  const [locale, setLocale] = useState<Locale>("ja");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocale(detectClientLocale());
    setMounted(true);
  }, []);

  // 英語化が未完のため一旦非表示（上記フラグ参照）。土台は温存。
  if (!SHOW_LOCALE_SWITCHER) return null;

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="言語切替">
        <Languages className="size-4" />
      </Button>
    );
  }

  const next: Locale = locale === "ja" ? "en" : "ja";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch language (current: ${locale})`}
      title={`${locale === "ja" ? "日本語" : "English"} → ${next === "ja" ? "日本語" : "English"}`}
      onClick={() => setClientLocale(next)}
      className="relative"
    >
      <span className="font-mono text-[10px] font-bold uppercase">{locale}</span>
    </Button>
  );
}
