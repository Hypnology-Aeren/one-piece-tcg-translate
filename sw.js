const CACHE_NAME = 'optcg-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './cards_tr.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
