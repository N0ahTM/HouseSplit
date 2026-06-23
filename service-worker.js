const CACHE_NAME = "house-share-calculator-v8";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=20260623-night",
  "./calc.js?v=20260623-night",
  "./app.js?v=20260623-night",
  "./manifest.webmanifest",
  "./icon.svg",
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
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
