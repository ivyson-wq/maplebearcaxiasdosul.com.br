// Maple Bear Caxias do Sul — Service Worker v2
// Estratégia: network-first em HTML, cache-first em assets estáticos.
//
// Bug v1 (corrigido nesta versão): qualquer falha de fetch fazia o SW
// devolver `caches.match('/')` (home page) com a URL original ainda no
// navegador. Resultado: clicar em "Agendar visita" levava à mesma página
// home quando havia qualquer hiccup de rede. Pior, fetches que retornavam
// 404 eram cacheados e servidos depois.
//
// Esta versão:
//  1. Só cacheia navegação se response.ok (200-299). Nunca cacheia 404/500.
//  2. Em falha de rede REAL (offline), tenta cache da URL exata; se não
//     tem, mostra página de erro inline (não a home).
//  3. Bump de CACHE força invalidação completa do v1.
//  4. skipWaiting + claim → atualização imediata sem reload.

const CACHE = 'mb-caxias-v3';
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

const OFFLINE_HTML = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Sem conexão — Maple Bear Caxias do Sul</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,sans-serif;max-width:520px;margin:80px auto;padding:24px;color:#1a1814;text-align:center}h1{font-size:1.6rem;margin:0 0 12px}p{line-height:1.6;color:#5a5a5a}a{color:#b8112e;text-decoration:underline}</style></head><body><h1>Você está sem conexão</h1><p>Não foi possível carregar esta página. Verifique sua internet e tente novamente.</p><p><a href="javascript:location.reload()">Tentar de novo</a> · <a href="https://wa.me/5554997021634">WhatsApp</a></p></body></html>`;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Navegação (HTML): network-first, fallback offline page (NÃO home)
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          // Só cacheia 2xx — evita servir 404 cacheado como se fosse válido
          if (r && r.ok) {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return r;
        })
        .catch(() =>
          caches.match(e.request).then((cached) =>
            cached || new Response(OFFLINE_HTML, {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          )
        ),
    );
    return;
  }

  // Assets estáticos: cache-first
  if (url.origin === location.origin && /\.(css|js|png|jpg|svg|webp|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((r) => {
          if (r && r.ok) {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return r;
        }),
      ),
    );
  }
});
