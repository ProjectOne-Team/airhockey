const CACHE_NAME = 'airhockey-v1';
const assets = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './opponents.js',
  './assets/music/theme.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});