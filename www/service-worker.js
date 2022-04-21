const CACHE = "countdown-pwa";

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing Service Worker.....");

  /**
   * Cache bei Installation des SWs alle Resourcen, die Notwendig sind um
   * offline zu funktionieren.
   */
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        "/",

        "/icons/android-chrome-192x192.png", // Favicon, Android Chrome M39+ with 4.0 screen density
        "/icons/android-chrome-512x512.png", // Favicon, Android Chrome M47+ Splash screen with 4.0 screen density
        "/icons/apple-touch-icon.png", // Favicon, Apple default
        "/icons/favicon-16x16.png", // Favicon, default
        "/icons/favicon-32x32.png", // Favicon, Safari on Mac OS
        "/icons/safari-pinned-tab.svg", // Favicon, Safari pinned tab

        "/styles/base.css",
        "/styles/components.css",
        "/styles/dialog.css",
        "/styles/index.css",

        "/favicon.ico", // Favicon, IE and fallback for other browsers
        "/index.html",
        "/main.js",
        "/manifest.json",
      ])
    )
  )
});

/**
 * Offline-first Strategie
 * Sehe bei jeder Request erst im Cache nach, und wenn das Item nicht
 * im Cache liegt, versuche das Netwerk mit der Anfrage zu erreichen.
 */
self.addEventListener("fetch", (event) => {
  console.log("[Service Worker] Fetch initiated.....");

  event.respondWith(
    caches.open(CACHE)
      .then((cache) => cache.match(event.request))
      .then((response) => response || fetch(event.request))
  );
});
