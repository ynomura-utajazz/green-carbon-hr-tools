/**
 * OAuth 認可フロー用の state（CSRF 対策）管理。
 *
 * - install エンドポイントで state を発行 → Cookie にセット → 認可 URL のクエリに含める
 * - callback エンドポイントで Cookie の値とクエリの値が一致するか検証
 *
 * Cookie は HttpOnly + SameSite=Lax + 短命（10 分）。
 */

import type { NextResponse } from "next/server";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const COOKIE_PREFIX = "gc.oauth.state.";
const TTL_SEC = 600;

export function generateState(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function setStateCookie(
  res: NextResponse,
  service: string,
  state: string,
): void {
  res.cookies.set(`${COOKIE_PREFIX}${service}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SEC,
  });
}

export function readStateCookie(
  cookies: ReadonlyRequestCookies,
  service: string,
): string | undefined {
  return cookies.get(`${COOKIE_PREFIX}${service}`)?.value;
}

export function clearStateCookie(res: NextResponse, service: string): void {
  res.cookies.delete(`${COOKIE_PREFIX}${service}`);
}

export function verifyState(
  cookies: ReadonlyRequestCookies,
  service: string,
  fromQuery: string | null,
): boolean {
  if (!fromQuery) return false;
  const cookieVal = readStateCookie(cookies, service);
  if (!cookieVal) return false;
  return cookieVal === fromQuery;
}
