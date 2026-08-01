// Naikkan versi cache setiap kali ada perubahan berarti pada sw.js atau daftar file inti.
// Ini WAJIB diubah setiap deploy penting, agar pengguna yang sudah pernah install
// tidak terjebak di versi service worker lama yang rusak (seperti kasus manifest sebelumnya).
const CACHE_NAME = 'cendekia-pwa-v3';

// Aset inti yang wajib tersedia offline. Gunakan path absolut (diawali "/")
// agar konsisten dengan manifest.json dan tidak bergantung pada folder halaman saat ini.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // PENTING: cache.addAll() bersifat all-or-nothing -- kalau SATU saja file gagal
      // diambil (404, typo path, dll), seluruh instalasi service worker gagal diam-diam.
      // Di sini tiap file di-cache satu-satu supaya satu file bermasalah tidak
      // menggagalkan instalasi PWA secara keseluruhan.
      return Promise.all(
        urlsToCache.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Gagal menyimpan cache untuk:', url, err))
        )
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      clients.claim(), // Ambil alih kontrol tab yang sudah terbuka tanpa perlu reload manual
      caches.keys().then(cacheNames =>
        Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName); // Bersihkan cache versi lama
            }
          })
        )
      )
    ])
  );
});

self.addEventListener('fetch', event => {
  // Hanya tangani permintaan GET biasa. Biarkan request lain (POST ke Firestore/Auth, dsb) lewat apa adanya.
  if (event.request.method !== 'GET') return;

  const isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    // NETWORK-FIRST untuk halaman HTML: pengguna selalu mendapat versi terbaru
    // saat online (konten cerita, harga, dsb tidak pernah basi), dan tetap bisa
    // membuka aplikasi dari cache saat benar-benar offline.
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(cached => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // CACHE-FIRST untuk aset statis (ikon, dsb) agar hemat kuota & cepat dimuat.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
