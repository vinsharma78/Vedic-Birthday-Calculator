// Simple service worker to make the app installable
const CACHE_NAME = 'viniyogah-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/branding/favicon-v9.png',
  '/branding/viniyogah-vel-192.png',
  '/branding/viniyogah-vel-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
