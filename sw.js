/* 轻账 PWA Service Worker —— 网络优先 + 缓存兜底 */
const CACHE_NAME = 'qingzhang-v1.4.0';

const ASSETS = [
  './index.html',
  './styles.css',
  './manifest.json',
  './vendor/fontawesome/css/all.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './vendor/fontawesome/webfonts/fa-regular-400.woff2',
  './vendor/fontawesome/webfonts/fa-brands-400.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 逐个缓存：单个失败不影响其它，避免 addAll 原子性导致全部缓存失败
      await Promise.all(
        ASSETS.map((url) => cache.add(url).catch((err) => console.warn('缓存失败(已跳过)', url, err)))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// 网络优先：在线时始终加载最新（改版后立即生效）；断网时回退到缓存
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(
          (cached) => cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)
        )
      )
  );
});
