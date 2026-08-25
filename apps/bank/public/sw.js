/*
 * A deliberately small service worker.
 *
 * It exists for two reasons and no others: an installable app needs one, and a
 * phone with no signal should get a page in the bank's voice rather than the
 * browser's dinosaur.
 *
 * It caches NOTHING that belongs to anybody. No statements, no case sheets, no
 * exhibits — those are behind a session, and a copy of somebody's balance
 * sitting in a cache on a shared phone is a worse failure than being offline.
 * Only the static offline document and the immutable build assets are stored.
 */

const CACHE = "aurabank-shell-v1";
const SHELL = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Build output is content-hashed and public: safe to serve from cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Everything else goes to the network every time. A page that fails becomes
  // the offline document; a failed asset simply fails.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
  }
});
