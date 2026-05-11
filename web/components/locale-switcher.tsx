"use client";

import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectClientLocale, setClientLocale, type Locale } from "@/lib/i18n";

export function LocaleSwitcher() {
  const [locale, setLocale] = useState<Locale>("ja");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocale(detectClientLocale());
    setMounted(true);
  }, []);

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
