/* Single voice channel. One Audio element, cancellable playback, iOS unlock. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const SILENT = 'data:audio/wav;base64,UklGRqQHAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  let el = null;
  let seq = 0;
  let pending = null;
  let watchdog = 0;
  let currentKey = null;
  let rate = 1;
  let muted = false;
  let unlocked = false;
  let errorHandler = null;
  const preloads = [];

  function notify(message, key) {
    if (typeof errorHandler === 'function') {
      try { errorHandler(message, key); } catch (err) {}
    } else {
      root.console && root.console.warn && root.console.warn('[bear audio]', message, key);
    }
  }

  function getEl() {
    if (el) return el;
    el = new root.Audio();
    el.preload = 'auto';
    el.playsInline = true;
    try { el.setAttribute('playsinline', ''); } catch (err) {}
    return el;
  }

  function clearWatch() {
    if (watchdog) {
      root.clearTimeout(watchdog);
      watchdog = 0;
    }
  }

  function settle(ok) {
    clearWatch();
    if (!pending) return;
    const p = pending;
    pending = null;
    p(ok);
  }

  function stopAll() {
    seq += 1;
    clearWatch();
    if (pending) {
      const p = pending;
      pending = null;
      p(false);
    }
    if (el) {
      el.onended = null;
      el.onerror = null;
      try { el.pause(); } catch (err) {}
      try { el.currentTime = 0; } catch (err) {}
    }
    currentKey = null;
  }

  function unlock() {
    const a = getEl();
    unlocked = true;
    if (BEAR.sfx && BEAR.sfx.unlock) BEAR.sfx.unlock();
    stopAll();
    const my = ++seq;
    a.src = SILENT;
    a.muted = true;
    const done = () => {
      // A real clip may have started while the silent clip was priming the
      // element. Never pause/reset that clip from this callback.
      if (my !== seq) return;
      try { a.pause(); } catch (err) {}
      try { a.currentTime = 0; } catch (err) {}
      a.muted = muted;
    };
    const p = a.play();
    if (p && typeof p.then === 'function') {
      p.then(done).catch(done);
    } else {
      done();
    }
    return true;
  }

  function play(key, opts) {
    opts = opts || {};
    const src = root.BEAR_AUDIO && root.BEAR_AUDIO[key];
    stopAll();
    const my = ++seq;
    currentKey = key;

    if (!src) {
      notify('音频缺失：' + key, key);
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      const a = getEl();
      pending = resolve;
      a.onended = () => { if (my === seq) settle(true); };
      a.onerror = () => {
        if (my !== seq) return;
        notify('音频加载失败：' + key, key);
        settle(false);
      };
      a.pause();
      try { a.currentTime = 0; } catch (err) {}
      a.muted = !!muted;
      a.src = src;
      a.playbackRate = rate;
      try { a.preservesPitch = true; } catch (err) {}
      try { a.webkitPreservesPitch = true; } catch (err) {}
      const duration = Number.isFinite(a.duration) ? a.duration : 0;
      const waitMs = Math.max(2500, (duration ? (duration / rate + 1.5) : 8) * 1000);
      clearWatch();
      watchdog = root.setTimeout(() => {
        if (my !== seq) return;
        notify('音频超时：' + key, key);
        settle(false);
      }, waitMs);

      const started = a.play();
      if (started && typeof started.then === 'function') {
        started.catch((err) => {
          if (my !== seq) return;
          notify('音频无法播放：' + key, key);
          settle(false);
        });
      }
      if (opts.volume !== undefined) {
        try { a.volume = Math.max(0, Math.min(1, opts.volume)); } catch (err) {}
      }
    });
  }

  async function playSequence(keys) {
    for (let i = 0; i < keys.length; i += 1) {
      const ok = await play(keys[i]);
      if (!ok) return false;
    }
    return true;
  }

  function preload(keys) {
    if (!root.BEAR_AUDIO) return;
    (keys || []).forEach((key) => {
      if (!root.BEAR_AUDIO[key]) return;
      if (preloads.some((p) => p.key === key)) return;
      try {
        const a = new root.Audio();
        a.preload = 'auto';
        a.src = root.BEAR_AUDIO[key];
        a.load();
        preloads.push({ key, audio: a });
        while (preloads.length > 14) preloads.shift();
      } catch (err) {}
    });
  }

  function setMuted(v) {
    muted = !!v;
    if (el) el.muted = muted;
  }

  function setRate(v) {
    rate = Number(v) || 1;
    if (el) {
      try { el.playbackRate = rate; } catch (err) {}
      try { el.preservesPitch = true; } catch (err) {}
    }
  }

  BEAR.audio = {
    play,
    playSequence,
    preload,
    stopAll,
    unlock,
    setMuted,
    setRate,
    setErrorHandler(fn) { errorHandler = fn; },
    get rate() { return rate; },
    get muted() { return muted; },
    get currentKey() { return currentKey; },
    get unlocked() { return unlocked; }
  };

  if (typeof root.addEventListener === 'function') {
    root.addEventListener('pagehide', stopAll);
    root.addEventListener('visibilitychange', () => {
      if (root.document && root.document.visibilityState === 'hidden') stopAll();
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = BEAR.audio;
})(typeof globalThis !== 'undefined' ? globalThis : this);
