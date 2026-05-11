"use client";

/**
 * Client Component 用の翻訳フック。
 *
 * 使い方：
 *   const t = useT();
 *   <button>{t("common.save")}</button>
 *
 * locale は cookie から読む（locale-switcher.tsx で書き込み済み）。
 * mount 前は DEFAULT_LOCALE を返すので SSR と一致する。
 */

import { useEffect, useState } from "react";
import {
  detectClientLocale, t as translate, DEFAULT_LOCALE, type Locale,
} from "@/lib/i18n";

export function useT(): (key: string) => string {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(detectClientLocale());
  }, []);

  return (key: string) => translate(key, locale);
}

export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  useEffect(() => {
    setLocale(detectClientLocale());
  }, []);
  return locale;
}
