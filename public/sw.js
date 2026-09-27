/* ponytail: public offline shell only; offline records need a separate security/data-sync design. */
const CACHE = "herdsync-offline-v1";
const ASSETS = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("herdsync-offline-") && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname === "/api" || url.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") {
    // Never store navigation responses, including authenticated pages and redirects.
    event.respondWith(fetch(event.request).catch(async () =>
      (await (await caches.open(CACHE)).match("/offline.html")) || Response.error()
    ));
  } else if (!url.search && ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async (cache) =>
      (await cache.match(url.pathname)) || fetch(event.request)
    ));
  }
});