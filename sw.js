/* Offline shell + audio. Bump VERSION whenever shipped files change. */
importScripts('./data/audio.js');

const VERSION = '1.0.3';
const SHELL_CACHE = 'bear-shell-' + VERSION;
const AUDIO_CACHE = 'bear-audio-' + VERSION;
const SHELL_PREFIX = 'bear-shell-';
const AUDIO_PREFIX = 'bear-audio-';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/bear.css',
  './css/screens.css',
  './js/main.js',
  './js/router.js',
  './js/ui.js',
  './js/store.js',
  './js/sfx.js',
  './js/audio.js',
  './js/recorder.js',
  './js/content.js',
  './js/icons.js',
  './js/bear.js',
  './js/games/kit.js',
  './js/games/find-it.js',
  './js/games/do-it.js',
  './js/games/face-match.js',
  './js/games/intro-chat.js',
  './js/games/say-it.js',
  './js/screens/home.js',
  './js/screens/chapter.js',
  './js/screens/playground.js',
  './js/screens/stickers.js',
  './js/screens/parent.js',
  './data/audio.js',
  './data/units/unit1.js',
  './data/units/index.js',
  './assets/fonts/OFL.txt',
  './assets/icons/favicon.svg',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png'
];

const AUDIO_FILES = Object.keys(self.BEAR_AUDIO || {}).map((key) => './' + self.BEAR_AUDIO[key]);

function unique(list) {
  return Array.from(new Set(list));
}

async function precache(cacheName, files) {
  const cache = await caches.open(cacheName);
  await Promise.all(files.map(async (path) => {
    try {
      await cache.add(path);
    } catch (err) {
      // A missing optional file must not block the whole install.
      console.warn('[bear sw] could not precache', path, err);
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await Promise.all([
      precache(SHELL_CACHE, unique(SHELL_FILES)),
      precache(AUDIO_CACHE, unique(AUDIO_FILES))
    ]);
    // Do not skipWaiting here: updates must not swap mid-lesson.
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => {
      if (name.startsWith(SHELL_PREFIX) && name !== SHELL_CACHE) return caches.delete(name);
      if (name.startsWith(AUDIO_PREFIX) && name !== AUDIO_CACHE) return caches.delete(name);
      return Promise.resolve(false);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function offlinePage() {
  return new Response(
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>小熊在休息</title><style>' +
    'body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FBF1E2;color:#3A2A1F;font-family:system-ui,sans-serif;text-align:center;padding:24px}' +
    'div{max-width:420px}h1{font-size:1.5rem}p{color:#6C5746;line-height:1.7}' +
    'button{margin-top:18px;min-height:56px;padding:0 24px;border:0;border-radius:16px;background:#A94A18;color:#fff;font-size:1rem}' +
    '</style></head><body><div><h1>小熊在休息</h1><p>离线缓存还没有准备好。连上网络，刷新一次就可以继续学习。</p>' +
    '<button onclick="location.reload()">再试一次</button></div></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function navigationResponse(request) {
  try {
    return await fetch(request);
  } catch (err) {
    const cached = await caches.match('./index.html', { ignoreSearch: true }) ||
      await caches.match('./', { ignoreSearch: true });
    return cached || offlinePage();
  }
}

async function audioResponse(request) {
  const url = new URL(request.url);
  const key = new Request(url.href, { method: 'GET' });
  const hasRange = request.headers.has('range');
  const cached = await caches.match(key, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && !hasRange) {
      const copy = response.clone();
      const cache = await caches.open(AUDIO_CACHE);
      cache.put(key, copy).catch(() => {});
    }
    return response;
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Audio unavailable offline' });
  }
}

async function shellResponse(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && request.method === 'GET') {
      const copy = response.clone();
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, copy).catch(() => {});
    }
    return response;
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (url.pathname.indexOf('/assets/audio/') !== -1) {
    event.respondWith(audioResponse(request));
    return;
  }

  event.respondWith(shellResponse(request));
});
