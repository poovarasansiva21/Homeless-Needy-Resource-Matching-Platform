const CACHE_NAME = 'sahaayaa-app-shell-v1';
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

// Install Event - Pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching SAHAAYAA AI application shell assets');
      return cache.addAll(APP_SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale cache storage
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event Handler - Smart Cache Policy
// Network-First for API and Socket.IO requests (Zero stale data for crisis matching)
// Cache-First with Network fallback for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests or browser extension schemes
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Network-First strategy for Flask API endpoints & Socket.IO
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-First, fallback to Network for App Shell static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache valid static responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If navigation request fails, return cached index.html app shell
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
