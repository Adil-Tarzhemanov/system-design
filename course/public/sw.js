// Service worker курса. Плейсхолдер версии ниже подставляет server.mjs при
// отдаче файла — это хеш от статики и уроков. Новый деплой даёт другой sw.js,
// браузер видит отличие в байтах и переустанавливает воркер.
const VERSION = '__VERSION__';
const SHELL = `shell-${VERSION}`;
const PAGES = `pages-${VERSION}`;

// Оболочка: без неё офлайн вообще не откроется.
const PRECACHE = [
  '/offline',
  '/static/style.css',
  '/static/quiz.js',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL, PAGES]);
    await Promise.all((await caches.keys()).filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Страницы: сеть вперёд — прогресс и даты повторов должны быть свежими.
// Упал запрос — отдаём последнюю просмотренную версию этой страницы,
// а если её не видели ни разу, то /offline.
async function page(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(PAGES)).put(req, res.clone());
    return res;
  } catch {
    return (await caches.match(req)) || (await caches.match('/offline')) || Response.error();
  }
}

// Статика: из кэша сразу, обновление тихо в фоне.
async function asset(req) {
  const hit = await caches.match(req);
  const fresh = fetch(req).then(async (res) => {
    if (res.ok) (await caches.open(SHELL)).put(req, res.clone());
    return res;
  }).catch(() => hit || Response.error());
  return hit || fresh;
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') return e.respondWith(page(request));
  if (PRECACHE.includes(url.pathname)) return e.respondWith(asset(request));
});
