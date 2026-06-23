const CACHE_NAME = "house-share-calculator-v18";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=20260623-fxlive1",
  "./calc.js?v=20260623-fxlive1",
  "./app.js?v=20260623-fxlive1",
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
