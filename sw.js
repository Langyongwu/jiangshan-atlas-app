/* 江山时序 PWA 离线缓存层
 * 策略：
 *  - 安装时预缓存应用外壳（HTML/CSS/JS/图标/manifest）
 *  - 运行中按需缓存其余同源资源（地图快照等），cache-first + 后台回填
 * 这样首次打开后即可离线使用，后续浏览过的朝代地图也会留在手机本地。
 */
const CACHE_NAME = 'jiangshan-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/atlas_boot.js',
  './js/atlas_quiz.js',
  './js/atlas_snapshots.js',
  './js/china_geo_data.js',
  './js/i18n_dict.js',
  './js/lore_data.js',
  './js/map_data.js',
  './js/zh_hant.js',
  './assets/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  // 只接管同源请求，外域统计/分享链接直接放行
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: false }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // 只缓存成功的、非 opaque 响应
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => {
        // 导航请求离线时回退到首页
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('离线且未缓存', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
