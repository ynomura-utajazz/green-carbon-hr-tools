/**
 * 軽量 i18n ユーティリティ。
 *
 * App Router の Server Component から locale を resolve（cookie 優先、ヘッダ Accept-Language fallback）。
 * Client Component は useLocaleClient() で同じ判定を再現する。
 *
 * 本格的な next-intl 移行時はこのファイルを置き換える想定。
 */

import jaMessages from "@/messages/ja.json";
import enMessages from "@/messages/en.json";

export const SUPPORTED_LOCALES = ["ja", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ja";

const MESSAGES: Record<Locale, typeof jaMessages> = {
  ja: jaMessages,
  en: enMessages,
};

export const LOCALE_COOKIE = "gc.locale";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

/** ドット記法で値を取り出す（"common.save" → 文字列） */
function lookup(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj) as string | undefined;
}

/**
 * t("common.save", "ja") のように使う。
 * キーが見つからなかった場合はキー自身を返す（デバッグしやすさ重視）。
 */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return lookup(MESSAGES[locale] as Record<string, unknown>, key) ?? key;
}

/**
 * ブラウザ環境で cookie から locale を取得（Client Component 用）。
 * 未設定なら navigator.language から推定。
 */
export function detectClientLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const cookie = document.cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${LOCALE_COOKIE}=`));
  if (cookie) {
    const v = decodeURIComponent(cookie.split("=")[1] ?? "");
    if (isLocale(v)) return v;
  }
  const nav = navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

export function setClientLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  // フルリロードで全 Server Component を再評価（最も確実な反映方法）
  window.location.reload();
}
