/* Service Worker untuk Cache Offline & PWA TTQ Pusat */
const CACHE_NAME = 'ttq-pusat-v3.6'; // Di-bump ke v3.6 agar browser memperbarui cache
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/core.js?v=3.5',
  './js/dashboard.js?v=3.5',
  './js/editor.js?v=3.5',
  './js/progress.js?v=3.5',
  './js/config.js?v=3.5',
  './js/users.js?v=3.5',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // 1. ABAIKAN jika bukan skema HTTP/HTTPS (Misal: chrome-extension://, data:, blob:)
  if (!e.request.url.startsWith('http://') && !e.request.url.startsWith('https://')) {
    return;
  }

  // 2. ABAIKAN jika bukan method GET (Misal: POST, PUT, DELETE)
  if (e.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(e.request.url);

  // 3. Abaikan API Google Apps Script & Google Content agar data realtime tidak tertahan
  if (requestUrl.hostname.includes('script.google.com') || requestUrl.hostname.includes('googleusercontent.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 4. Proses caching aman untuk aset static
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        // Izinkan menyimpan tipe 'basic' (aset lokal) dan 'cors' (aset CDN/Google Fonts)
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
