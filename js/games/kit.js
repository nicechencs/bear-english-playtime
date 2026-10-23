/* Shared helpers for the five activity templates. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};

  function shuffle(input) {
    const list = (input || []).slice();
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function sample(input, count) {
    return shuffle(input).slice(0, count);
  }

  function buildRounds(pool, rounds) {
    const source = (pool || []).slice();
    if (!source.length) return [];
    let out = [];
    let guard = 0;
    while (out.length < rounds && guard < 100) {
      guard += 1;
      const deck = shuffle(source);
      if (out.length && deck.length > 1 && deck[0] === out[out.length - 1]) {
        const tmp = deck[0];
        deck[0] = deck[1];
        deck[1] = tmp;
      }
      out = out.concat(deck);
    }
    return out.slice(0, rounds);
  }

  function choiceItems(unit, poolIds, targetId, count) {
    const pool = (poolIds || []).filter((id) => unit.items[id]);
    const target = unit.items[targetId];
    if (!target) return [];
    const used = Object.create(null);
    used[targetId] = 1;
    const picked = [target];
    const push = (id) => {
      if (picked.length >= count || used[id] || !unit.items[id]) return;
      used[id] = 1;
      picked.push(unit.items[id]);
    };
    (target.contrast || []).forEach(push);
    shuffle(pool.filter((id) => !used[id])).forEach(push);
    return shuffle(picked).slice(0, Math.max(1, count));
  }

  function makeSession() {
    const timers = new Set();
    const cleanups = [];
    let alive = true;
    return {
      get alive() { return alive; },
      timeout(fn, ms) {
        if (!alive) return 0;
        const id = root.setTimeout(() => {
          timers.delete(id);
          if (alive) fn();
        }, ms);
        timers.add(id);
        return id;
      },
      clear(id) {
        if (!id) return;
        root.clearTimeout(id);
        timers.delete(id);
      },
      onDestroy(fn) {
        if (typeof fn === 'function') cleanups.push(fn);
      },
      destroy() {
        if (!alive) return;
        alive = false;
        timers.forEach((id) => root.clearTimeout(id));
        timers.clear();
        cleanups.forEach((fn) => {
          try { fn(); } catch (err) {}
        });
        cleanups.length = 0;
      }
    };
  }

  function fallbackBear() {
    return BEAR.ui.el('span', {
      class: 'bear-fallback',
      'aria-hidden': 'true'
    }, BEAR.ui.icon('leaf', 'bear-fallback__icon'));
  }

  function bearStage(opts) {
    if (BEAR.bear && typeof BEAR.bear.stage === 'function') {
      try {
        const node = BEAR.bear.stage(opts || {});
        if (node) return node;
      } catch (err) {}
    }
    return fallbackBear();
  }

  function bearMini(opts) {
    if (BEAR.bear && typeof BEAR.bear.mini === 'function') {
      try {
        const node = BEAR.bear.mini(opts || {});
        if (node) return node;
      } catch (err) {}
    }
    return fallbackBear();
  }

  function bearFace(opts) {
    if (BEAR.bear && typeof BEAR.bear.face === 'function') {
      try {
        const node = BEAR.bear.face(opts || {});
        if (node) return node;
      } catch (err) {}
    }
    return fallbackBear();
  }

  function setBear(node, pose, face) {
    if (BEAR.bear && typeof BEAR.bear.apply === 'function' && node) {
      try { BEAR.bear.apply(node, pose, face); return node; } catch (err) {}
    }
    return node;
  }

  async function playKey(key, session, button) {
    if (!key) return false;
    if (button) button.classList.add('sound-orb--playing');
    let ok = false;
    try {
      ok = await BEAR.audio.play(key);
    } catch (err) {
      ok = false;
    }
    if (button) button.classList.remove('sound-orb--playing');
    if (session && !session.alive) return false;
    return ok;
  }

  function playIconButton(label, onClick) {
    return BEAR.ui.button({
      iconName: 'speaker',
      label,
      variant: 'secondary',
      onClick
    });
  }

  function preloadActivity(unit, activity) {
    if (!BEAR.audio || !BEAR.audio.preload) return;
    const keys = BEAR.content.activityAudioKeys(unit, activity);
    BEAR.audio.preload(keys.slice(0, 12));
  }

  function addFeedback(host, text, tone) {
    const node = BEAR.ui.el('p', {
      class: 'game__hint' + (tone ? ' game__hint--' + tone : ''),
      'aria-live': 'polite'
    });
    node.textContent = text || '';
    host.appendChild(node);
    return node;
  }

  function setFeedback(node, text, tone) {
    if (!node) return;
    node.textContent = text || '';
    node.className = 'game__hint' + (tone ? ' game__hint--' + tone : '');
  }

  function roundHeader(ui, total, index) {
    return ui.el('div', { class: 'game__rounds' }, [
      ui.el('span', { text: '第 ' + (index + 1) + ' / ' + total + ' 题' }),
      ui.dots(total, index, '第 ' + (index + 1) + ' 题，共 ' + total + ' 题')
    ]);
  }

  BEAR.gameKit = {
    shuffle,
    sample,
    buildRounds,
    choiceItems,
    makeSession,
    bearStage,
    bearMini,
    bearFace,
    setBear,
    playKey,
    playIconButton,
    preloadActivity,
    addFeedback,
    setFeedback,
    roundHeader
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = BEAR.gameKit;
})(typeof globalThis !== 'undefined' ? globalThis : this);
