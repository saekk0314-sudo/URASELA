const CACHE = "urasela-growth-v1";
const CORE = [
  "./", "./index.html", "./config.js", "./src/styles.css", "./src/data.js", "./src/engine.js", "./src/analytics.js", "./src/ads.js", "./src/app.js", "./manifest.webmanifest",
  "./assets/icon.svg", "./assets/icon-192.png", "./assets/icon-512.png", "./assets/apple-touch-icon.png", "./assets/generated/hero-urasela.webp", "./assets/generated/characters-sheet.webp"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    return response;
  }).catch(() => caches.match(event.request).then(hit => hit || (event.request.mode === "navigate" ? caches.match("./index.html") : Response.error()))));
});
