const CACHE_NAME = 'v1.8';
const ASSETS = [
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'assets/icon192.png',
  'assets/icon512.png'
];

// Installation Lifecycle hook 
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activation Lifecycle cleanup engine
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
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Cache Fetch Interceptor
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});

// ==========================================
// BACKGROUND OPERATING SYSTEM SHOW EVENT
// ==========================================
// This handles executing the reminder banner if it arrives from an offline sync or background queue
self.addEventListener('showNotification', (e) => {
  // Captures any system level data parameters dispatched to the operating worker thread
});
