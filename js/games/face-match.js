/* Face Match: explore five feelings, then find the face you hear. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const games = BEAR.games = BEAR.games || {};

  games.faceMatch = function mountFaceMatch(host, opts) {
    const ui = BEAR.ui;
    const kit = BEAR.gameKit;
    const content = BEAR.content;
    const unit = opts.unit;
    const activity = opts.activity;
    const pool = (activity.pool || []).filter((id) => unit.items[id] && unit.items[id].kind === 'feeling');
    const rounds = kit.buildRounds(pool, Math.max(1, activity.rounds || 3));
    const choiceCount = Math.max(2, Math.min(5, activity.choices || 3));
    const session = kit.makeSession();
    const explored = Object.create(null);
    let mode = 'explore';
    let index = 0;
    let answered = false;
    let finished = false;
    let attempts = 0;
    let autoTimer = 0;
    let soundOrb = null;
    let feedback = null;
    let nextBtn = null;
    let facesGrid = null;
    let roundLabel = null;
    let dots = null;
    let game = null;

    const introPhrase = activity.intro ? content.getPhrase(unit, activity.intro) : null;
    kit.preloadActivity(unit, activity);
    host.innerHTML = '';
    game = ui.el('div', { class: 'game game--faces' });
    host.appendChild(game);

    function playPhrase(key, button) {
      if (!key || !session.alive) return;
      if (button) button.classList.add('sound-orb--playing');
      BEAR.audio.play(key).then(() => {
        if (button) button.classList.remove('sound-orb--playing');
      });
    }

    function renderExplore() {
      mode = 'explore';
      game.innerHTML = '';
      const wrap = ui.el('div', { class: 'face-explore' });
      const prompt = ui.el('div', { class: 'game__prompt' });
      prompt.appendChild(ui.el('p', { class: 'game__kicker', text: '先认识这些表情' }));
      if (introPhrase) {
        const introBtn = ui.el('button', {
          type: 'button',
          class: 'sound-orb sound-orb--sm',
          'aria-label': '听问题'
        }, ui.icon('speaker'));
        introBtn.addEventListener('click', () => {
          BEAR.sfx.play('tap');
          playPhrase(introPhrase.audio, introBtn);
        });
        prompt.appendChild(introBtn);
        prompt.appendChild(ui.el('p', { class: 'chat__en', lang: 'en', text: introPhrase.en }));
        prompt.appendChild(ui.el('p', { class: 'chat__zh', text: introPhrase.zh }));
      }
      const exploreHint = ui.el('p', {
        class: 'game__hint',
        'aria-live': 'polite',
        text: '点一点每一张脸，听听它怎么说。'
      });
      prompt.appendChild(exploreHint);
      wrap.appendChild(prompt);

      const grid = ui.el('div', { class: 'face-grid' });
      pool.forEach((id, i) => {
        const item = unit.items[id];
        const card = ui.el('button', {
          type: 'button',
          class: 'face-card',
          'aria-label': '第 ' + (i + 1) + ' 张表情'
        });
        card.appendChild(ui.el('span', {
          class: 'face-card__art'
        }, kit.bearFace({ face: item.face })));
        card.appendChild(ui.el('span', {
          class: 'face-card__label',
          lang: 'en',
          text: item.en
        }));
        card.addEventListener('click', () => {
          if (!session.alive || mode !== 'explore') return;
          BEAR.sfx.play('tap');
          card.classList.add('face-card--named');
          card.setAttribute('aria-label', item.en + '，' + item.zh);
          explored[id] = 1;
          playPhrase(item.audio.feel || item.audio.word);
          const count = Object.keys(explored).length;
          exploreHint.textContent = item.en + ' · ' + item.zh +
            (count < pool.length ? '　已经认识 ' + count + ' / ' + pool.length : '　全部认识啦！');
          exploreHint.className = 'game__hint game__hint--soft';
        });
        grid.appendChild(card);
      });
      wrap.appendChild(grid);

      const startBtn = ui.button({
        label: '开始找一找',
        iconName: 'arrow-right',
        variant: 'primary',
        size: 'xl',
        className: 'btn--block',
        onClick: () => {
          if (!session.alive) return;
          BEAR.audio.stopAll();
          renderQuiz();
        }
      });
      wrap.appendChild(startBtn);
      wrap.appendChild(ui.el('p', {
        class: 'game__hint game__hint--soft',
        text: '找对了会听见小熊说 “I’m …”。'
      }));
      game.appendChild(wrap);
    }

    function renderQuiz() {
      mode = 'quiz';
      index = 0;
      game.innerHTML = '';
      const top = ui.el('div', { class: 'game__top' });
      roundLabel = ui.el('span', { class: 'game__kicker', text: '表情配对' });
      dots = ui.el('span', { class: 'round-dots' });
      top.appendChild(roundLabel);
      top.appendChild(dots);
      game.appendChild(top);

      const prompt = ui.el('div', { class: 'game__prompt' });
      prompt.appendChild(ui.el('p', { class: 'game__kicker', text: '听一听，找一找' }));
      soundOrb = ui.el('button', {
        type: 'button',
        class: 'sound-orb',
        'aria-label': '再听一次'
      }, ui.icon('speaker'));
      soundOrb.addEventListener('click', () => {
        if (mode !== 'quiz' || answered) return;
        BEAR.sfx.play('tap');
        playPrompt();
      });
      prompt.appendChild(soundOrb);
      feedback = ui.el('p', { class: 'game__hint', 'aria-live': 'polite' });
      prompt.appendChild(feedback);
      game.appendChild(prompt);

      facesGrid = ui.el('div', {
        class: 'face-grid face-grid--quiz',
        role: 'group',
        'aria-label': '表情选项'
      });
      game.appendChild(facesGrid);

      const foot = ui.el('div', { class: 'game__foot' });
      const replayBtn = ui.button({
        label: '再听一次',
        iconName: 'replay',
        variant: 'secondary',
        onClick: () => {
          if (!answered) playPrompt();
        }
      });
      nextBtn = ui.button({
        label: '下一个',
        iconName: 'arrow-right',
        variant: 'primary',
        className: 'btn--block',
        onClick: () => advance()
      });
      nextBtn.hidden = true;
      foot.appendChild(replayBtn);
      foot.appendChild(nextBtn);
      game.appendChild(foot);
      renderRound();
    }

    function currentItem() {
      return unit.items[rounds[index]];
    }

    function setRoundDots() {
      dots.innerHTML = '';
      const node = ui.dots(rounds.length, index, '第 ' + (index + 1) + ' 题，共 ' + rounds.length + ' 题');
      node.classList.add('round-dots');
      dots.appendChild(node);
    }

    function playPrompt() {
      const item = currentItem();
      if (!item) return Promise.resolve(false);
      return kit.playKey(item.audio.feel || item.audio.word, session, soundOrb).then((ok) => {
        if (!ok && session.alive) {
          kit.setFeedback(feedback, '声音走丢了，点喇叭再试一次。', 'soft');
        }
        return ok;
      });
    }

    function renderRound() {
      const item = currentItem();
      if (!item) {
        finish();
        return;
      }
      answered = false;
      attempts = 0;
      soundOrb.disabled = false;
      nextBtn.hidden = true;
      nextBtn.lastChild.textContent = '下一个';
      setRoundDots();
      kit.setFeedback(feedback, '先听，再点表情。', 'soft');
      facesGrid.innerHTML = '';
      const choices = kit.choiceItems(unit, pool, item.id, choiceCount);
      choices.forEach((choice, i) => {
        const card = ui.el('button', {
          type: 'button',
          class: 'face-card',
          'data-id': choice.id,
          'aria-label': '第 ' + (i + 1) + ' 个表情'
        });
        card.appendChild(ui.el('span', {
          class: 'face-card__art'
        }, kit.bearFace({ face: choice.face })));
        card.appendChild(ui.el('span', {
          class: 'face-card__label',
          lang: 'en',
          'aria-hidden': 'true',
          text: choice.en
        }));
        card.addEventListener('click', () => onPick(choice, card));
        facesGrid.appendChild(card);
      });
      session.timeout(() => {
        if (!answered && session.alive && mode === 'quiz') playPrompt();
      }, 300);
    }

    function onPick(choice, card) {
      if (!session.alive || mode !== 'quiz' || answered) return;
      const item = currentItem();
      if (!item) return;
      if (choice.id === item.id) {
        answered = true;
        session.clear(autoTimer);
        soundOrb.disabled = true;
        card.classList.add('face-card--correct');
        card.classList.remove('face-card--hint');
        const label = card.querySelector('.face-card__label');
        if (label) label.removeAttribute('aria-hidden');
        card.setAttribute('aria-label', choice.en + '，' + choice.zh);
        Array.prototype.forEach.call(facesGrid.children, (node) => {
          node.disabled = true;
          if (node !== card) {
            node.classList.add('face-card--dim');
            node.classList.remove('face-card--hint');
          }
        });
        BEAR.sfx.play('correct');
        kit.setFeedback(feedback, choice.en + ' · ' + choice.zh, 'good');
        ui.announce('答对了。' + choice.en + '，' + choice.zh);
        nextBtn.hidden = false;
        const last = index >= rounds.length - 1;
        if (last) {
          nextBtn.lastChild.textContent = '完成';
          nextBtn.setAttribute('aria-label', '完成这一组');
        }
        nextBtn.focus({ preventScroll: true });
        const followUp = item.audio.im || item.audio.feel;
        const roundAt = index;
        BEAR.audio.play(followUp).then((ok) => {
          if (!session.alive || !ok || index !== roundAt || !answered) return;
          if (!last) autoTimer = session.timeout(advance, 1600);
        });
      } else {
        attempts += 1;
        card.classList.add('face-card--wrong');
        BEAR.sfx.play('wrong');
        session.timeout(() => card.classList.remove('face-card--wrong'), 500);
        kit.setFeedback(feedback, attempts === 1 ? '再听一次，试试另一张脸。' : '没关系，再听一次。', 'soft');
        session.timeout(() => {
          if (!answered) playPrompt();
        }, 420);
        if (attempts >= 2) {
          Array.prototype.forEach.call(facesGrid.children, (node) => {
            if (node.getAttribute('data-id') === item.id) node.classList.add('face-card--hint');
          });
          kit.setFeedback(feedback, '听一听，亮起来的这张脸就是答案。', 'soft');
        }
      }
    }

    function advance() {
      if (!session.alive || finished) return;
      session.clear(autoTimer);
      if (!answered) return;
      index += 1;
      if (index >= rounds.length) {
        finish();
        return;
      }
      renderRound();
    }

    function finish() {
      if (finished) return;
      finished = true;
      session.clear(autoTimer);
      BEAR.audio.stopAll();
      if (typeof opts.onDone === 'function') opts.onDone();
    }

    renderExplore();

    return {
      destroy() {
        finished = true;
        session.destroy();
      }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
