/*
 * Service worker Sportikus.
 *
 * - Оболочка приложения: страница — сначала сеть, без сети — последняя сохранённая копия;
 *   файлы сборки /assets/* неизменяемы (хэш в имени) — из кэша.
 * - Без сети остаются доступны «Мои события» и билеты: ответы личного кабинета
 *   сохраняются после каждого успешного запроса. При выходе из аккаунта клиент удаляет этот кэш.
 * - Остальной API всегда идёт в сеть: каталог, места и заявки должны быть свежими.
 */

const VERSION = 'v1';
const SHELL_CACHE = `sportikus-shell-${VERSION}`;
const API_CACHE = `sportikus-api-${VERSION}`;
const APP_SHELL_URL = '/';

const STATIC_FILES = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/logo-s.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// Личные данные, нужные на входе на мероприятие без интернета
const OFFLINE_API = ['/api/v1/me/participations', '/api/v1/me/events', '/api/v1/auth/me', '/api/v1/me/preferences'];

// Не страницы приложения: их ответы нельзя подменять оболочкой SPA
const NOT_APP_PAGES = ['/api/', '/uploads/', '/swagger-ui', '/v3/api-docs', '/actuator'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([APP_SHELL_URL, ...STATIC_FILES]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('sportikus-') && key !== SHELL_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    if (NOT_APP_PAGES.some((prefix) => url.pathname.startsWith(prefix))) return;
    event.respondWith(appPage(request));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }
  if (STATIC_FILES.includes(url.pathname) || url.pathname.startsWith('/icons/')) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }
  if (OFFLINE_API.includes(url.pathname)) {
    event.respondWith(networkFirstApi(request));
  }
});

async function appPage(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      // Все маршруты SPA отдают один и тот же index.html — храним одну копию
      cache.put(APP_SHELL_URL, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(APP_SHELL_URL);
    return cached || offlinePage();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    // 401 — сессии больше нет: сохранённые личные данные не показываем
    if (response.status === 401) cache.delete(request);
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: { code: 'OFFLINE', message: 'Нет сети. Эти данные ещё не сохранены на устройстве.' } }),
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }
}

function offlinePage() {
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Sportikus — нет сети</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f4f5f7;color:#0e1116;padding:24px;text-align:center}
b{display:block;font-size:22px;margin-bottom:8px}button{margin-top:16px;padding:12px 20px;border:0;border-radius:12px;
background:#0bd68a;color:#fff;font-weight:700;font-size:15px}</style></head>
<body><div><b>Нет подключения к интернету</b>Откройте Sportikus один раз при наличии сети —
после этого приложение и ваши билеты будут доступны офлайн.<br><button onclick="location.reload()">Повторить</button></div></body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
