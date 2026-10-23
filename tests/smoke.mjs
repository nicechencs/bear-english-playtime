/* Browser smoke tests. No build step; uses system Chrome via playwright-core.
 *
 *   npm install
 *   npm test
 *
 * Optional overrides:
 *   CHROME_PATH=/path/to/chrome
 *   PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function resolvePlaywright() {
  const custom = process.env.PLAYWRIGHT_CORE;
  if (!custom) return 'playwright-core';
  if (custom.startsWith('.') || custom.includes('/') || custom.includes('\\')) {
    return pathToFileURL(resolve(process.cwd(), custom)).href;
  }
  return custom;
}

const { chromium } = await import(resolvePlaywright());

let server;
let browser;
let base;

function handler(req, res) {
  (async () => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = normalize(join(ROOT, rel));
    if (file !== ROOT && !file.startsWith(ROOT + sep)) throw new Error('outside root');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(body);
  })().catch(() => {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });
}

before(async () => {
  server = createServer(handler);
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  base = 'http://127.0.0.1:' + server.address().port + '/';
  const launch = {
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  };
  if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
  else launch.channel = 'chrome';
  browser = await chromium.launch(launch);
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
});

async function openPage(t, viewport) {
  const context = await browser.newContext({ viewport, locale: 'zh-CN' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push('console: ' + message.text());
  });
  page.on('pageerror', (error) => errors.push('pageerror: ' + error.message));
  t.after(async () => { await context.close(); });
  return { context, page, errors };
}

async function doIt(page) {
  for (let guard = 0; guard < 6; guard += 1) {
    const button = page.getByRole('button', { name: /我们做了|我们完成啦/ });
    if (!(await button.count())) return;
    await button.click();
    await page.waitForTimeout(350);
  }
  throw new Error('Do It did not finish');
}

async function solveFindIt(page) {
  for (let guard = 0; guard < 15; guard += 1) {
    if (!(await page.locator('.game--find').count())) return;
    const cards = page.locator('.choice-grid .choice:not([disabled])');
    const count = await cards.count();
    for (let i = 0; i < count; i += 1) {
      await cards.nth(i).click();
      await page.waitForTimeout(160);
      if (await page.locator('.choice--correct').count()) break;
    }
    const next = page.locator('.game__foot .btn--primary');
    await next.waitFor({ state: 'visible', timeout: 5000 });
    await next.click();
    await page.waitForTimeout(400);
  }
  throw new Error('Find It did not finish');
}

test('home renders the five-chapter map without overflow', async (t) => {
  const { page, errors } = await openPage(t, { width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'networkidle' });

  assert.match(await page.title(), /小熊英语游戏/);
  assert.equal(await page.locator('.map-node').count(), 5);
  assert.ok(await page.locator('[data-testid="home-primary"]').isVisible());
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, 'horizontal overflow: ' + overflow + 'px');
  assert.deepEqual(errors, []);
});

test('chapter starts and Find It replay plays the again cue before the target', async (t) => {
  const { page, errors } = await openPage(t, { width: 390, height: 844 });
  await page.goto(base + '#/unit/unit1/chapter/i-can', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /开始学习|继续学习/ }).click();
  await page.waitForSelector('.game--find', { timeout: 8000 });
  await page.waitForTimeout(600);

  const firstKey = await page.evaluate(() => BEAR.audio.currentKey);
  assert.match(firstKey, /^can_/, 'auto-play should start a can_* clip');

  await page.locator('.game__foot button').first().click();
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => BEAR.audio.currentKey), 'again');
  await page.waitForTimeout(1300);
  assert.match(await page.evaluate(() => BEAR.audio.currentKey), /^can_/);
  assert.deepEqual(errors, []);
});

test('a full chapter awards three stars, a badge, and nine stickers', async (t) => {
  const { page, errors } = await openPage(t, { width: 390, height: 844 });
  await page.goto(base + '#/unit/unit1/chapter/action-words', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /开始学习|继续学习/ }).click();

  for (let phase = 0; phase < 3; phase += 1) {
    await page.waitForSelector('.doit, .game--find', { timeout: 10000 });
    await doIt(page);
    await page.waitForSelector('.game--find', { timeout: 8000 });
    await solveFindIt(page);
    if (phase < 2) {
      await page.getByRole('button', { name: /继续 ·/ }).click();
      await page.waitForTimeout(500);
    }
  }

  await page.getByText('章节完成', { exact: true }).waitFor({ state: 'visible', timeout: 8000 });
  await page.waitForTimeout(700);
  const saved = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('bearEnglish.state') || '{}');
    return raw.units && raw.units.unit1;
  });
  assert.equal(saved.chapters['action-words'].done, true);
  assert.equal(saved.chapters['action-words'].stars, 3);
  assert.equal(saved.stickers.length, 9);
  assert.deepEqual(errors, []);
});

test('file:// opens, renders, and skips the service worker', async (t) => {  const { page, errors } = await openPage(t, { width: 390, height: 844 });
  await page.goto(pathToFileURL(join(ROOT, 'index.html')).href, { waitUntil: 'load' });

  assert.match(await page.title(), /小熊英语游戏/);
  assert.equal(await page.locator('.map-node').count(), 5);
  assert.equal(await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)), false);
  assert.deepEqual(errors, []);
});

test('service worker caches the shell and audio for offline reload', async (t) => {
  const { context, page, errors } = await openPage(t, { width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'networkidle' });
  const caches = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise((done) => setTimeout(done, 1200));
    return caches.keys();
  });
  assert.ok(caches.some((name) => name.startsWith('bear-shell-')), 'shell cache missing');
  assert.ok(caches.some((name) => name.startsWith('bear-audio-')), 'audio cache missing');

  await context.setOffline(true);
  t.after(async () => { await context.setOffline(false).catch(() => {}); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);
  assert.match(await page.title(), /小熊英语游戏/);
  const status = await page.evaluate(async () => (await fetch('assets/audio/unit1/walk.mp3')).status);
  assert.equal(status, 200);
  assert.deepEqual(errors, []);
});
