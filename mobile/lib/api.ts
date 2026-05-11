/**
 * モバイルアプリの API クライアント。
 * Web 版の Next.js API ルートをそのまま叩く（Authorization は Supabase JWT）。
 */

import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)
  ?? "https://green-carbon.inc";

const TOKEN_KEY = "gchr.access_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}
