/* App boot: settings, global audio helpers, router, PWA lifecycle. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const APP_VERSION = '1.0.4';
  let lastAudioErrorAt = 0;
  let installPrompt = null;
  let registration = null;
  let reloadingForUpdate = false;

  BEAR.session = BEAR.session || {};

  function applySettings() {
    if (!BEAR.store) return;
    const settings = BEAR.store.settings();
    const html = document.documentElement;
    if (settings.theme === 'light' || settings.theme === 'dark') {
      html.setAttribute('data-theme', settings.theme);
    } else {
      html.removeAttribute('data-theme');
    }
    document.body.classList.toggle('reduce-motion', !!settings.reducedMotion);
    if (BEAR.audio) {
      BEAR.audio.setMuted(!!settings.muted);
      BEAR.audio.setRate(settings.slow ? 0.75 : 1);
    }
    if (BEAR.sfx) BEAR.sfx.setEnabled(!!settings.sfx);
  }

  function setupAudioErrors() {
    if (!BEAR.audio) return;
    BEAR.audio.setErrorHandler((message, key) => {
      if (root.console) root.console.warn('[bear]', message, key);
      const now = Date.now();
      if (now - lastAudioErrorAt < 2500) return;
      lastAudioErrorAt = now;
      BEAR.ui.toast('声音走丢了，点喇叭再试一次。', {
        tone: 'error',
        duration: 3200,
        iconName: 'info'
      });
    });
  }

  function setupUnlock() {
    let unlocked = false;
    function unlockOnce() {
      if (unlocked) return;
      unlocked = true;
      try {
        if (BEAR.audio) BEAR.audio.unlock();
        if (BEAR.sfx) BEAR.sfx.unlock();
      } catch (err) {}
    }
    ['pointerdown', 'touchstart', 'keydown'].forEach((type) => {
      root.addEventListener(type, unlockOnce, { once: true, capture: true, passive: true });
    });
  }

  function setupContentChecks() {
    if (!BEAR.content) return;
    const units = BEAR.content.listUnits();
    units.forEach((unit) => {
      const errors = BEAR.content.validateUnit(unit, root.BEAR_AUDIO);
      if (errors.length) {
        if (root.console) root.console.error('[bear] content errors in ' + unit.id, errors);
      }
    });
  }

  function setupInstallPrompt() {
    root.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      installPrompt = event;
    });
    root.addEventListener('appinstalled', () => {
      installPrompt = null;
      try {
        BEAR.ui.toast('已安装到主屏幕', { iconName: 'sparkle' });
      } catch (err) {}
    });
  }

  function canUseServiceWorker() {
    if (!('serviceWorker' in root.navigator)) return false;
    if (root.location.protocol === 'file:') return false;
    if (/[?&]sw=off(?:&|$)/.test(root.location.search)) return false;
    return true;
  }

  function registerServiceWorker() {
    if (!canUseServiceWorker()) return;
    const url = './sw.js';
    root.navigator.serviceWorker.register(url, { scope: './' }).then((reg) => {
      registration = reg;
      BEAR.app.registration = reg;
      if (reg.waiting) {
        // A previous version is waiting; the parent panel can apply it.
        BEAR.app.updateReadyNow = true;
      }
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && root.navigator.serviceWorker.controller) {
            BEAR.app.updateReadyNow = true;
          }
        });
      });
      // Check quietly, but never skipWaiting mid-lesson.
      reg.update().catch(() => {});
    }).catch((err) => {
      if (root.console) root.console.warn('[bear] service worker not registered', err);
    });

    root.navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloadingForUpdate) return;
      reloadingForUpdate = false;
      root.location.reload();
    });
  }

  function setupAppApi() {
    BEAR.app = {
      version: APP_VERSION,
      registration: null,
      updateReadyNow: false,
      canInstall() {
        return !!installPrompt;
      },
      async install() {
        if (!installPrompt) return false;
        const prompt = installPrompt;
        installPrompt = null;
        try {
          prompt.prompt();
          const choice = await prompt.userChoice;
          return !!(choice && choice.outcome === 'accepted');
        } catch (err) {
          return false;
        }
      },
      updateReady() {
        return !!(registration && registration.waiting) || !!this.updateReadyNow;
      },
      async checkUpdate() {
        if (!registration) return 'unsupported';
        try {
          await registration.update();
        } catch (err) {
          return 'unsupported';
        }
        if (registration.waiting) {
          this.updateReadyNow = true;
          return 'ready';
        }
        const installing = registration.installing;
        if (installing) {
          await new Promise((resolve) => {
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              resolve();
            };
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' || installing.state === 'redundant') finish();
            });
            root.setTimeout(finish, 4000);
          });
          if (registration.waiting) {
            this.updateReadyNow = true;
            return 'ready';
          }
        }
        return 'none';
      },
      async applyUpdate() {
        if (!registration || !registration.waiting) return false;
        reloadingForUpdate = true;
        try {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } catch (err) {
          reloadingForUpdate = false;
          return false;
        }
        // Some browsers fire controllerchange without a reload; keep a fallback.
        root.setTimeout(() => {
          if (reloadingForUpdate) {
            reloadingForUpdate = false;
            root.location.reload();
          }
        }, 2200);
        return true;
      },
      applySettings
    };
  }

  function boot() {
    if (!BEAR.store || !BEAR.ui || !BEAR.router) {
      showFatal('页面没有加载完整，请刷新再试。');
      return;
    }

    BEAR.session.parentVerified = false;
    setupContentChecks();
    setupAudioErrors();
    applySettings();
    BEAR.store.subscribe(() => {
      applySettings();
    });
    setupUnlock();
    setupInstallPrompt();
    setupAppApi();
    registerServiceWorker();
    BEAR.router.start();

    if (root.console) root.console.info('[bear] ready v' + APP_VERSION);
  }

  function showFatal(message) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'screen';
    const h = document.createElement('h1');
    h.textContent = '小熊迷路了';
    const p = document.createElement('p');
    p.textContent = message;
    const btn = document.createElement('button');
    btn.className = 'btn btn--primary';
    btn.type = 'button';
    btn.textContent = '刷新页面';
    btn.addEventListener('click', () => root.location.reload());
    wrap.appendChild(h);
    wrap.appendChild(p);
    wrap.appendChild(btn);
    app.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
