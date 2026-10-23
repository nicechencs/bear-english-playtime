/* Local progress and settings. One child profile, no network. */
(function (root) {
  const KEY = 'bearEnglish.state';
  const BACKUP_KEY = 'bearEnglish.state.bak';
  const SCHEMA = 1;

  const defaultSettings = () => ({
    muted: false,
    slow: false,
    sfx: true,
    reducedMotion: false,
    theme: 'auto',
    micConsent: false
  });

  const defaultState = () => ({
    schemaVersion: SCHEMA,
    updatedAt: 0,
    settings: defaultSettings(),
    units: {},
    lastRoute: '#/'
  });

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const now = () => Date.now();

  function mergeState(base, incoming) {
    if (!isObj(incoming)) return base;
    const out = clone(base);
    if (isObj(incoming.settings)) {
      Object.keys(out.settings).forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(incoming.settings, k)) {
          out.settings[k] = incoming.settings[k];
        }
      });
    }
    if (typeof incoming.updatedAt === 'number') out.updatedAt = incoming.updatedAt;
    if (typeof incoming.lastRoute === 'string') out.lastRoute = incoming.lastRoute;
    if (isObj(incoming.units)) out.units = incoming.units;
    out.schemaVersion = SCHEMA;
    return out;
  }

  function safeStorage() {
    try {
      const s = root.localStorage;
      const probe = '__bear_probe__';
      s.setItem(probe, '1');
      s.removeItem(probe);
      return s;
    } catch (err) {
      return null;
    }
  }

  const storage = safeStorage();
  let persistent = !!storage;
  let state = defaultState();
  let saveTimer = 0;
  let dirty = false;
  const listeners = [];

  function emit() {
    const snapshot = clone(state);
    listeners.slice().forEach((fn) => {
      try { fn(snapshot); } catch (err) { /* a screen must not break persistence */ }
    });
  }

  function load() {
    if (!storage) return;
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        try { storage.setItem(BACKUP_KEY, raw); } catch (e) {}
        return;
      }
      state = mergeState(defaultState(), parsed);
    } catch (err) {
      persistent = false;
    }
  }

  function saveNow() {
    saveTimer = 0;
    dirty = false;
    if (!persistent || !storage) return false;
    state.updatedAt = now();
    try {
      storage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      persistent = false;
      return false;
    }
  }

  function save() {
    dirty = true;
    if (saveTimer) return;
    saveTimer = root.setTimeout(saveNow, 300);
  }

  function flush() {
    if (saveTimer) {
      root.clearTimeout(saveTimer);
      saveTimer = 0;
    }
    if (dirty) saveNow();
  }

  function unit(unitId) {
    if (!isObj(state.units[unitId])) {
      state.units[unitId] = {
        chapters: {},
        items: {},
        stickers: [],
        showtime: { done: false, crown: false }
      };
    }
    const u = state.units[unitId];
    if (!isObj(u.chapters)) u.chapters = {};
    if (!isObj(u.items)) u.items = {};
    if (!Array.isArray(u.stickers)) u.stickers = [];
    if (!isObj(u.showtime)) u.showtime = { done: false, crown: false };
    return u;
  }

  function chapter(unitId, chapterId) {
    const u = unit(unitId);
    if (!isObj(u.chapters[chapterId])) {
      u.chapters[chapterId] = { stars: 0, done: false, phase: 0, lastPlayed: 0 };
    }
    const c = u.chapters[chapterId];
    if (typeof c.stars !== 'number') c.stars = 0;
    if (typeof c.done !== 'boolean') c.done = false;
    if (typeof c.phase !== 'number') c.phase = 0;
    if (typeof c.lastPlayed !== 'number') c.lastPlayed = 0;
    return c;
  }

  const store = {
    get state() { return state; },
    get persistent() { return persistent; },
    settings() { return state.settings; },

    setSetting(key, value) {
      state.settings[key] = value;
      save();
      emit();
      return value;
    },

    getChapter(unitId, chapterId) {
      return clone(chapter(unitId, chapterId));
    },

    saveChapterProgress(unitId, chapterId, phase) {
      const c = chapter(unitId, chapterId);
      c.phase = Math.max(c.phase, Math.min(3, Math.max(0, phase)));
      c.lastPlayed = now();
      save();
      emit();
    },

    completeChapter(unitId, chapterId, stickerIds) {
      const c = chapter(unitId, chapterId);
      const newlyCompleted = !c.done;
      c.stars = Math.max(3, c.stars);
      c.done = true;
      c.phase = 3;
      c.lastPlayed = now();
      if (Array.isArray(stickerIds)) store.unlockStickers(unitId, stickerIds, true);
      save();
      emit();
      return newlyCompleted;
    },

    unlockStickers(unitId, stickerIds, skipSave) {
      const u = unit(unitId);
      const fresh = [];
      (stickerIds || []).forEach((id) => {
        if (u.stickers.indexOf(id) === -1) {
          u.stickers.push(id);
          fresh.push(id);
        }
      });
      if (!skipSave && fresh.length) save();
      if (fresh.length) emit();
      return fresh;
    },

    hasSticker(unitId, stickerId) {
      return unit(unitId).stickers.indexOf(stickerId) !== -1;
    },

    completeShowtime(unitId) {
      const u = unit(unitId);
      const newly = !u.showtime.done;
      u.showtime.done = true;
      u.showtime.crown = true;
      save();
      emit();
      return newly;
    },

    chapterSummary(unitId, chapters) {
      const rows = (chapters || []).map((ch) => {
        const c = chapter(unitId, ch.id);
        return {
          id: ch.id,
          done: !!c.done,
          stars: c.stars || 0,
          phase: c.phase || 0,
          lastPlayed: c.lastPlayed || 0
        };
      });
      return {
        rows,
        done: rows.filter((r) => r.done).length,
        stars: rows.reduce((n, r) => n + r.stars, 0),
        totalChapters: rows.length,
        maxStars: rows.length * 3
      };
    },

    unitSummary(unitData) {
      const chapterIds = unitData.chapters.map((c) => c.id);
      const record = unit(unitData.id);
      const stickers = record.stickers;
      const actionIds = Object.keys(unitData.items).filter((id) => unitData.items[id].kind === 'action');
      const learnedActions = actionIds.filter((id) => stickers.indexOf(id) !== -1).length;
      const chapters = store.chapterSummary(unitData.id, unitData.chapters);
      const allDone = chapters.totalChapters > 0 && chapters.done === chapters.totalChapters;
      return {
        chapters,
        allDone,
        learnedActions,
        totalActions: actionIds.length,
        stickers: stickers.slice(),
        showtime: clone(record.showtime)
      };
    },

    nextChapter(unit) {
      const rows = store.chapterSummary(unit.id, unit.chapters).rows;
      const unfinished = rows.find((r) => !r.done);
      return unfinished || null;
    },

    setLastRoute(route) {
      if (typeof route === 'string' && route !== state.lastRoute) {
        state.lastRoute = route;
        save();
      }
    },

    getLastRoute() { return state.lastRoute || '#/'; },

    reset(keepSettings) {
      const settings = keepSettings ? state.settings : defaultSettings();
      state = defaultState();
      state.settings = settings;
      saveNow();
      emit();
    },

    subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i !== -1) listeners.splice(i, 1);
      };
    },

    save,
    flush
  };

  load();
  root.BEAR = root.BEAR || {};
  root.BEAR.store = store;

  if (typeof root.addEventListener === 'function') {
    root.addEventListener('pagehide', flush);
    root.addEventListener('visibilitychange', () => {
      if (root.document && root.document.visibilityState === 'hidden') flush();
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = store;
})(typeof globalThis !== 'undefined' ? globalThis : this);
