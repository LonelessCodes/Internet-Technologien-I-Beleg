const CACHE = "countdown-pwa";

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing Service Worker.....");

  event.waitUntil(
    caches.open(CACHE).then(cache => cache.add("/"))
  )
});

self.addEventListener("fetch", (event) => {
  console.log("[Service Worker] Fetch initiated.....");
  
  event.respondWith(
    caches.open(CACHE)
      .then(cache => cache.match(event.request))
      .then(response => response || fetch(event.request))
  );
});
