// AgentSpark Service Worker v1.1.2
const CACHE_NAME = 'agentspark-v1.1.2';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/i18n.js',
  './js/db.js',
  './js/auth.js',
  './js/gallery.js',
  './js/app.js',
  './manifest.json',
  './featured_templates.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@400,0..1&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://js.revenuecat.com/rc-web-sdk/v1.0.0/rc-web-sdk.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Network-first for API calls
  if (event.request.url.includes('googleapis.com') ||
      event.request.url.includes('openai.com') ||
      event.request.url.includes('anthropic.com') ||
      event.request.url.includes('mistral.ai') ||
      event.request.url.includes('groq.com')) {
    return; // Let API calls pass through
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }));
    })
  );
});
