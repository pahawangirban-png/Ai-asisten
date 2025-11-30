const CACHE_NAME = 'ai-asisten-ios-v4'; // Saya ganti versi biar iPad refresh cache
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png', // PASTIKAN FILE INI ADA & NAMANYA BENAR
  './icon-512.png', // PASTIKAN FILE INI ADA & NAMANYA BENAR
  './logo.png',     // PASTIKAN FILE INI ADA
  
  // Library External (CDN)
  // Perhatian: Jika CDN down/lambat, installasi bisa gagal. 
  // Tapi script di bawah sudah saya buat agar tetap mencoba lanjut.
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=Orbitron:wght@400;500;600;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js',
  'https://unpkg.com/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.7.0/mammoth.browser.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// 1. INSTALL: Paksa simpan file penting
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Paksa SW baru segera aktif
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Memulai Caching...');
      // Kita coba cache satu per satu agar jika 1 gagal, yang lain tetap tersimpan
      for (const asset of ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.error('[SW] Gagal cache:', asset, err);
        }
      }
    })
  );
});

// 2. ACTIVATE: Hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Hapus cache lama:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim(); // Ambil alih kontrol halaman segera
});

// 3. FETCH: Strategi "Cache First, Network Fallback"
self.addEventListener('fetch', (event) => {
  // Abaikan request API (Supabase/Google) biar gak di-cache
  if (event.request.url.includes('supabase.co') || 
      event.request.method === 'POST' || 
      event.request.url.includes('google')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // A. Jika ada di cache, pakai cache (OFFLINE JALAN DISINI)
      if (cachedResponse) {
        return cachedResponse;
      }

      // B. Jika tidak ada, ambil dari internet
      return fetch(event.request)
        .then((networkResponse) => {
          // Cek validitas respon
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          // Simpan file baru ini ke cache untuk pemakaian berikutnya
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // C. Jika Offline & File tidak ada di cache -> Fallback ke index.html
          // Ini trik agar kalau reload halaman sub-path tetap kembali ke app
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
