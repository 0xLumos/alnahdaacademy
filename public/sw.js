// App-shell cache. Data requests (Supabase) always go to the network.
// Paths are resolved against the worker's scope so the site also works under a sub-path
// such as https://user.github.io/repo/.
const CACHE = "nahda-v3";
const BASE = new URL(self.registration.scope).pathname; // e.g. "/" or "/repo/"
const SHELL = ["", "index.html", "manifest.webmanifest", "icons/icon-192.png"].map((p) => BASE + p);

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Videos use range requests (206 responses), which cannot be cached; let the browser stream them.
  if (url.pathname.startsWith(BASE + "media/")) return;
  // Navigations: network first, fall back to the cached shell when offline.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match(BASE + "index.html")));
    return;
  }
  // Static assets: cache first, then network (and store).
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    })));
});
