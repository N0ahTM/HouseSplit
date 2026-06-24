const CACHE_NAME = "house-share-calculator-v27";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=20260624-v170",
  "./calc.js?v=20260624-v170",
  "./app.js?v=20260624-v170",
  "./manifest.webmanifest",
  "./icon.svg",
  "./docs/assets/icon-192.png",
  "./docs/assets/icon-512.png",
  "./docs/assets/apple-touch-icon.png",
  "./docs/assets/mobile-preview.png",
  "./docs/assets/repository-open-graph.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const oldKeys = keys.filter((key) => key !== CACHE_NAME);
        return Promise.all(oldKeys.map((key) => caches.delete(key))).then(() => oldKeys.length > 0);
      })
      .then((hadOldCaches) =>
        self.clients.claim().then(() => {
          if (!hadOldCaches) return undefined;
          return self.clients.matchAll({ type: "window" }).then((clients) =>
            Promise.all(
              clients.map((client) => {
                client.postMessage({ type: "HOUSE_SPLIT_UPDATED" });
                return undefined;
              }),
            ),
          );
        }),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
