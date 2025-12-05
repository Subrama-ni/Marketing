// public/sw.js

const VERSION = "v1::marketing-app";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png"
  // add more static files if needed
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== VERSION).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // don't cache devtools requests or chrome-extension
  if (req.method !== "GET" || req.url.startsWith("chrome-extension://")) return;

  const isApi = req.url.includes("/api/");

  if (isApi) {
    // network-first for API (fallback to cache)
    event.respondWith(
      fetch(req)
        .then((res) => {
          // optionally cache some GET API responses
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // cache-first for static assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // cache fetched asset for offline
        return caches.open(VERSION).then((cache) => {
          cache.put(req, res.clone());
          return res;
        });
      });
    })
  );
});
