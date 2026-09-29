// WildAssist service worker. Conservative by design:
//  - Navigations: NETWORK-FIRST, so online visitors always get fresh content.
//    Only when offline do we fall back to cache, then to the emergency page.
//  - Only PUBLIC pages are cached (never authenticated pages like /dashboard).
//  - Static assets under /_next/ are content-hashed, so cache-first is safe.
//  - Cross-origin requests (Supabase, etc.) are never intercepted.
// Bump CACHE to invalidate old caches on the next deploy.
const CACHE = "wildassist-v1";
const PUBLIC = ["/", "/emergency", "/triage"];
const PRECACHE = [...PUBLIC, "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  // Never touch cross-origin (API, Supabase, fonts CDN, etc.).
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, cache public pages, offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (PUBLIC.includes(url.pathname) && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((r) => r || caches.match("/emergency") || caches.match("/"))
        )
    );
    return;
  }

  // Content-hashed static assets: cache-first (immutable), else fetch + store.
  if (url.pathname.startsWith("/_next/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req)
            .then((res) => {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
              return res;
            })
            .catch(() => r)
      )
    );
  }
  // Everything else: let the network handle it (no interception).
});
