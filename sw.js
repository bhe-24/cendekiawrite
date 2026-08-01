const CACHE_NAME = 'cendekia-pwa-v2';
// WAJIB masukkan start_url yang ada di manifest ke sini
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Paksa SW langsung aktif
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim()); // Klaim kontrol langsung
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Hapus cache versi lama
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Selalu kembalikan cache jika ada, ini syarat mutlak WebAPK offline
      return response || fetch(event.request);
    }).catch(() => {
      // Fallback jika tidak ada internet dan tidak ada di cache
      return caches.match('/index.html');
    })
  );
});
