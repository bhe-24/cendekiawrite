const CACHE_NAME = 'cendekia-pwa-cache-v1';

// Daftar file yang akan disimpan ke dalam HP pengguna (Bisa ditambah sesuai kebutuhan)
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/read.html',
  '/pratinjau.html',
  '/profil.html',
  '/search.html',
  '/pustaka.html',
  '/notifikasi.html',
  '/manifest.json'
];

// EVENT INSTALL: Menyimpan file-file di atas ke dalam Cache HP
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Membuka cache PWA');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// EVENT ACTIVATE: Membersihkan cache versi lama jika ada update
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache PWA versi lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// EVENT FETCH: Menyajikan file dari Cache jika internet lambat/putus
self.addEventListener('fetch', event => {
  // Hanya ambil request yang menggunakan metode GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika file ada di cache, tampilkan langsung
        if (response) {
          return response;
        }
        // Jika tidak ada di cache, ambil dari internet (Network)
        return fetch(event.request).then(
          function(response) {
            // Cek apakah response valid
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Simpan file baru ini ke cache agar besok-besok cepat dibuka
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});
