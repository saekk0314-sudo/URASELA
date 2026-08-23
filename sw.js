const CACHE = "urasela-v3";
const CORE = [
  "./", "./index.html", "./src/styles.css", "./src/data.js", "./src/engine.js", "./src/app.js", "./manifest.webmanifest",
  "./assets/icon.svg", "./assets/generated/hero-urasela.webp", "./assets/generated/characters-sheet.webp",
  "./assets/generated/tarot-sheet-a.webp", "./assets/generated/tarot-sheet-b.webp", "./assets/generated/og-urasela.jpg"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(hit => hit || caches.match("./index.html"))));
});
