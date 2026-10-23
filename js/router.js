/* Hash router. Screens register themselves; each render returns a cleanup function. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const screens = BEAR.screens = BEAR.screens || {};
  let current = null;
  let host = null;
  let internalNav = 0;
  let routeToken = 0;

  function parse(hash) {
    const raw = (hash || '').replace(/^#/, '');
    const clean = raw.split('?')[0] || '/';
    let parts;
    try {
      parts = clean.split('/').filter(Boolean).map(decodeURIComponent);
    } catch (err) {
      parts = [];
    }
    if (!parts.length) return { name: 'home', view: 'home', unitId: null };
    if (parts[0] === 'parent') return { name: 'parent', view: 'parent' };
    if (parts[0] !== 'unit' || !parts[1]) return { name: 'home', view: 'home', invalid: true };
    const unitId = parts[1];
    if (parts.length === 2) return { name: 'home', view: 'home', unitId };
    if (parts[2] === 'chapter' && parts[3]) {
      return { name: 'chapter', view: 'chapter', unitId, chapterId: parts[3] };
    }
    if (parts[2] === 'showtime') {
      return { name: 'chapter', view: 'chapter', unitId, chapterId: 'showtime', showtime: true };
    }
    if (parts[2] === 'playground' && parts.length === 3) {
      return { name: 'playground', view: 'playground', unitId };
    }
    if (parts[2] === 'stickers' && parts.length === 3) {
      return { name: 'stickers', view: 'stickers', unitId };
    }
    return { name: 'home', view: 'home', unitId, invalid: true };
  }

  function cleanupCurrent() {
    if (BEAR.ui && BEAR.ui.closeAll) BEAR.ui.closeAll();
    if (BEAR.audio) BEAR.audio.stopAll();
    if (BEAR.recorder && BEAR.recorder.stopAll) BEAR.recorder.stopAll();
    if (!current) return;
    const fn = current.cleanup;
    current = null;
    if (typeof fn === 'function') {
      try { fn(); } catch (err) {
        if (root.console) root.console.error('[bear] screen cleanup failed', err);
      }
    } else if (fn && typeof fn.destroy === 'function') {
      try { fn.destroy(); } catch (err) {
        if (root.console) root.console.error('[bear] screen destroy failed', err);
      }
    }
  }

  function focusTitle() {
    if (!host) return;
    const target = host.querySelector('[data-route-focus]') ||
      host.querySelector('.screen h1') ||
      host.querySelector('h1') ||
      host.querySelector('.screen');
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      try { target.focus({ preventScroll: true }); } catch (err) { try { target.focus(); } catch (e) {} }
    }
  }

  function renderError(container, message) {
    container.innerHTML = '';
    const wrap = document.createElement('section');
    wrap.className = 'screen screen--error';
    const title = document.createElement('h1');
    title.textContent = '这一页走丢了';
    const p = document.createElement('p');
    p.textContent = message || '回到首页再试一次吧。';
    const link = document.createElement('a');
    link.className = 'btn btn--primary';
    link.href = '#/';
    link.textContent = '回到首页';
    wrap.appendChild(title);
    wrap.appendChild(p);
    wrap.appendChild(link);
    container.appendChild(wrap);
    BEAR.ui.setTitle('这一页走丢了');
  }

  function route() {
    const token = ++routeToken;
    if (!host) host = document.getElementById('app');
    if (!host) return;

    cleanupCurrent();
    const parsed = parse(root.location.hash);
    const screen = screens[parsed.name];
    const content = [];
    host.innerHTML = '';
    host.className = 'app';
    host.setAttribute('data-route', parsed.name);

    if (!screen) {
      renderError(host, '找不到这个页面。');
      return;
    }

    const ctx = {
      unitId: parsed.unitId,
      chapterId: parsed.chapterId || null,
      showtime: !!parsed.showtime,
      path: root.location.hash || '#/',
      route: parsed,
      routeToken: token
    };

    if (parsed.name !== 'parent') {
      const last = root.location.hash || '#/';
      if (BEAR.store) BEAR.store.setLastRoute(last);
    }

    let result;
    try {
      result = screen.render(host, ctx);
    } catch (err) {
      if (root.console) root.console.error('[bear] screen render failed', err);
      renderError(host, '页面加载出错了。');
      return;
    }

    current = { name: parsed.name, cleanup: result };
    root.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    focusTitle();

    if (parsed.invalid) {
      BEAR.router.replace('#/');
    }
  }

  function go(path, opts) {
    opts = opts || {};
    const hash = path.startsWith('#') ? path : '#' + path;
    if (hash === root.location.hash) {
      route();
      return;
    }
    if (opts.replace) {
      try {
        root.history.replaceState(null, '', hash);
      } catch (err) {
        root.location.hash = hash;
        return;
      }
      route();
      return;
    }
    internalNav += 1;
    root.location.hash = hash;
  }

  function back(fallback) {
    if (internalNav > 0) {
      internalNav -= 1;
      root.history.back();
    } else {
      go(fallback || '#/');
    }
  }

  function start() {
    host = document.getElementById('app');
    root.addEventListener('hashchange', route);
    if (!root.location.hash) {
      try {
        root.history.replaceState(null, '', root.location.pathname + root.location.search + '#/');
      } catch (err) {
        root.location.hash = '#/';
      }
    }
    route();
  }

  BEAR.router = {
    start,
    route,
    go,
    navigate: go,
    replace(path) { go(path, { replace: true }); },
    back,
    parse,
    get current() { return current; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = BEAR.router;
})(typeof globalThis !== 'undefined' ? globalThis : this);
