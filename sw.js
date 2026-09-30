const CACHE = 'regrelab-v9';

const ASSETS = [
  './',
  'index.html',
  'tests.html',
  'manifest.json',
  'css/styles.css',
  'js/stats.js',
  'js/format.js',
  'js/icons.js',
  'js/content.js',
  'js/charts.js',
  'js/steps.js',
  'js/share.js',
  'js/ui.js',
  'js/tests.js',
  'js/exercises.js',
  'js/qr.js',
  'vendor/qrcode.js',
  'js/influence.js',
  'js/practice.js',
  'js/board.js',
  'vendor/chart.umd.js',
  'vendor/katex/katex.min.js',
  'vendor/katex/katex.min.css',
  'vendor/fonts/newsreader-latin-wght-normal.woff2',
  'vendor/fonts/newsreader-latin-wght-italic.woff2',
  'vendor/fonts/ibm-plex-sans-latin-400-normal.woff2',
  'vendor/fonts/ibm-plex-sans-latin-400-italic.woff2',
  'vendor/fonts/ibm-plex-sans-latin-500-normal.woff2',
  'vendor/fonts/ibm-plex-sans-latin-600-normal.woff2',
  'vendor/fonts/ibm-plex-sans-latin-ext-400-normal.woff2',
  'vendor/fonts/ibm-plex-sans-latin-ext-600-normal.woff2',
  'vendor/fonts/ibm-plex-mono-latin-400-normal.woff2',
  'vendor/fonts/ibm-plex-mono-latin-500-normal.woff2',
  'vendor/fonts/ibm-plex-mono-latin-600-normal.woff2',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
].concat([
  'AMS-Regular', 'Caligraphic-Bold', 'Caligraphic-Regular', 'Fraktur-Bold', 'Fraktur-Regular', 'Main-Bold', 'Main-BoldItalic',
  'Main-Italic', 'Main-Regular', 'Math-BoldItalic', 'Math-Italic', 'SansSerif-Bold', 'SansSerif-Italic', 'SansSerif-Regular',
  'Script-Regular', 'Size1-Regular', 'Size2-Regular', 'Size3-Regular', 'Size4-Regular', 'Typewriter-Regular'
].map(n => 'vendor/katex/fonts/KaTeX_' + n + '.woff2'));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Red primero (siempre la última versión con conexión); si falla, se usa lo guardado.
  event.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
