const CACHE_NAME = 'tracker-v1.1';
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
      // FORCES THE NEW SERVICE WORKER TO TAKE OVER IMMEDIATELY
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
      // CLAIMS ALL OPEN TABS IMMEDIATELY SO THE NEW CODE APPLIES
      return self.clients.claim();
    })
  );
});

// Cache-First Fetch Interceptor with a network fallback safety
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // If found in cache, return it. Otherwise, fetch from live server.
      return cachedResponse || fetch(e.request);
    })
  );
});