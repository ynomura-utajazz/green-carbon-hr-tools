/**
 * Green Carbon HR Tools — Service Worker
 *
 * 戦略：
 *  - HTML（ナビゲーション）：network-first → 失敗時 cache → 失敗時 /offline.html
 *  - 静的アセット（_next/static/*, /icon, /apple-icon, /icon-large）：stale-while-revalidate
 *  - API（/api/*）：常に network、キャッシュしない
 *  - その他 GET：network-first（優先キャッシュなし）
 *
 * 更新時：CACHE_VERSION を上げると旧キャッシュが activate で削除される。
 */

const CACHE_VERSION = "gc-hr-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const HTML_CACHE = `${CACHE_VERSION}-html`;

const PRECACHE_URLS = ["/offline.html"];

// ── install: 最低限のオフライン用ページを事前取得 ─────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(HTML_CACHE)
      .then((c) => c.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

// ── activate: 旧バージョンのキャッシュを削除 ─────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

// ── fetch: 戦略を URL で振り分け ─────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 別オリジン（Slack OAuth 等のリダイレクト先）はスルー
  if (url.origin !== self.location.origin) return;

  // API は常に network、cache しない
  if (url.pathname.startsWith("/api/")) {
    return; // default fetch behavior
  }

  // 静的アセット → stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/icon" ||
    url.pathname === "/apple-icon" ||
    url.pathname === "/icon-large" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/manifest.json" ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff")
  ) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ナビゲーション（HTML）→ network-first → cache → /offline.html
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstHtml(req));
    return;
  }

  // それ以外は default
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  const networkFetch = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone()).catch(() => undefined);
      return res;
    })
    .catch(() => cached);
  return cached || networkFetch;
}

async function networkFirstHtml(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(HTML_CACHE);
      cache.put(req, res.clone()).catch(() => undefined);
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    return caches.match("/offline.html");
  }
}
