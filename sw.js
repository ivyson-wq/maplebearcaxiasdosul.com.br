// Maple Bear Caxias do Sul — Service Worker v1
// Estratégia: cache-first em assets estáticos, network-first em HTML

const CACHE = 'mb-caxias-v1';
const PRECACHE = [
  '/',
  '/assets/styles.css',
  '/assets/analytics.js',
  '/assets/components.js',
  '/assets/lead-capture.js',
  '/assets/brand/logo-lockup-compact.png',
  '/assets/brand/chinook-reading.png',
  '/assets/brand/favicon-256.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request).then((r) => r || caches.match('/')))
    );
    return;
  }

  if (url.origin === location.origin && /\.(css|js|png|jpg|svg|webp|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((r) => {
          const copy = r.clone();
          if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, copy));
          return r;
        })
      )
    );
  }
});
