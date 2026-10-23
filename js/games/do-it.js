/* Do It: watch Bear, copy the action, then move on together. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const games = BEAR.games = BEAR.games || {};

  games.doIt = function mountDoIt(host, opts) {
    const ui = BEAR.ui;
    const kit = BEAR.gameKit;
    const content = BEAR.content;
    const unit = opts.unit;
    const activity = opts.activity;
    const items = content.getItems(unit, activity.items || []);
    const session = kit.makeSession();
    let index = 0;
    let finished = false;
    let playTimer = 0;

    kit.preloadActivity(unit, activity);
    host.innerHTML = '';
    if (!items.length) {
      host.appendChild(ui.emptyState({
        title: '没有找到动作',
        message: '请回到地图，换一章试试。'
      }));
      if (typeof opts.onDone === 'function') opts.onDone();
      return { destroy() { session.destroy(); } };
    }

    const game = ui.el('div', { class: 'doit' });
    const stage = ui.el('div', { class: 'doit__stage' });
    const copy = ui.el('div', { class: 'doit__copy' });
    game.appendChild(stage);
    game.appendChild(copy);
    host.appendChild(game);

    const count = ui.el('p', { class: 'doit__count' });
    const word = ui.el('p', { class: 'doit__word', lang: 'en' });
    const zh = ui.el('p', { class: 'doit__zh' });
    const sentence = ui.el('p', { class: 'doit__sentence', lang: 'en' });
    const sentenceZh = ui.el('p', { class: 'doit__sentence-zh' });
    const hint = ui.el('p', { class: 'doit__hint' });
    const audioRow = ui.el('div', { class: 'doit__audio' });

    const wordBtn = ui.el('button', {
      type: 'button',
      class: 'btn btn--secondary'
    }, [ui.icon('speaker'), ui.el('span', { text: '听单词' })]);
    const sentenceBtn = ui.el('button', {
      type: 'button',
      class: 'btn btn--ghost'
    }, [ui.icon('sound-wave'), ui.el('span', { text: '听句子' })]);

    const actions = ui.el('div', { class: 'doit__actions' });
    const doneBtn = ui.button({
      label: '我们做了',
      iconName: 'check',
      variant: 'primary',
      size: 'xl',
      onClick: () => advance()
    });

    copy.appendChild(count);
    copy.appendChild(word);
    copy.appendChild(zh);
    copy.appendChild(sentence);
    copy.appendChild(sentenceZh);
    audioRow.appendChild(wordBtn);
    audioRow.appendChild(sentenceBtn);
    copy.appendChild(audioRow);
    copy.appendChild(hint);
    actions.appendChild(doneBtn);
    copy.appendChild(actions);

    let bearSvg = null;

    function renderItem() {
      const item = items[index];
      if (!item) return;
      count.textContent = '动作 ' + (index + 1) + ' / ' + items.length;
      word.textContent = item.en;
      zh.textContent = item.zh;
      sentence.textContent = item.sentence.en;
      sentenceZh.textContent = item.sentence.zh;
      hint.textContent = item.tip || '';
      doneBtn.lastChild.textContent = index === items.length - 1 ? '我们完成啦' : '我们做了';
      stage.innerHTML = '';
      bearSvg = kit.bearStage({ pose: item.pose, face: item.face || 'happy' });
      stage.appendChild(bearSvg);
      session.clear(playTimer);
      playTimer = session.timeout(() => {
        playTimer = 0;
        playWord();
      }, 220);
    }

    function setPlaying(btn, yes) {
      if (!btn) return;
      btn.classList.toggle('sound-orb--playing', !!yes);
      btn.setAttribute('aria-busy', yes ? 'true' : 'false');
    }

    function playWord() {
      const item = items[index];
      if (!item || !session.alive) return;
      setPlaying(wordBtn, true);
      BEAR.audio.play(item.audio.word).then(() => {
        if (session.alive) setPlaying(wordBtn, false);
      });
    }

    function playSentence() {
      const item = items[index];
      if (!item || !session.alive) return;
      const key = content.itemAudioKey(item, 'sentence');
      if (!key) return;
      setPlaying(sentenceBtn, true);
      BEAR.audio.play(key).then(() => {
        if (session.alive) setPlaying(sentenceBtn, false);
      });
    }

    function advance() {
      if (!session.alive || finished) return;
      if (index >= items.length - 1) {
        finish();
        return;
      }
      index += 1;
      session.clear(playTimer);
      playTimer = 0;
      BEAR.audio.stopAll();
      renderItem();
    }

    function finish() {
      if (finished) return;
      finished = true;
      BEAR.audio.stopAll();
      if (typeof opts.onDone === 'function') opts.onDone();
    }

    wordBtn.addEventListener('click', () => {
      if (!session.alive) return;
      BEAR.sfx.play('tap');
      playWord();
    });
    sentenceBtn.addEventListener('click', () => {
      if (!session.alive) return;
      BEAR.sfx.play('tap');
      playSentence();
    });

    renderItem();

    return {
      destroy() {
        finished = true;
        session.destroy();
      }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
