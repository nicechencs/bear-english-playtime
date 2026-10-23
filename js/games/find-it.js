/* Find It: hear a word or sentence, tap the matching picture. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const games = BEAR.games = BEAR.games || {};

  games.findIt = function mountFindIt(host, opts) {
    const ui = BEAR.ui;
    const kit = BEAR.gameKit;
    const content = BEAR.content;
    const unit = opts.unit;
    const activity = opts.activity;
    const mode = activity.mode === 'sentence' ? 'sentence' : 'word';
    const pool = (activity.pool || []).filter((id) => unit.items[id]);
    const totalRounds = Math.max(1, activity.rounds || pool.length || 1);
    const rounds = kit.buildRounds(pool, totalRounds);
    const choiceCount = Math.max(2, Math.min(3, activity.choices || 2));
    const session = kit.makeSession();
    let index = 0;
    let answered = false;
    let finished = false;
    let autoTimer = 0;
    let promptSeq = 0;
    let soundOrb = null;
    let feedback = null;
    let nextBtn = null;
    let optionsGrid = null;
    let roundDots = null;

    kit.preloadActivity(unit, activity);

    host.innerHTML = '';
    const game = ui.el('div', { class: 'game game--find' });

    const top = ui.el('div', { class: 'game__top' });
    const roundLabel = ui.el('span', { class: 'game__kicker' });
    const dots = ui.el('span', { class: 'round-dots' });
    top.appendChild(roundLabel);
    top.appendChild(dots);
    game.appendChild(top);

    if (activity.intro) {
      const phrase = content.getPhrase(unit, activity.intro);
      if (phrase) {
        const introBtn = ui.button({
          iconName: 'speaker',
          label: '听问题',
          variant: 'soft',
          size: 'sm',
          quiet: true,
          onClick: () => {
            if (speaker) {
              speaker.classList.add('sound-orb--playing');
              BEAR.audio.play(phrase.audio).then(() => {
                if (speaker) speaker.classList.remove('sound-orb--playing');
              });
            }
          }
        });
        let speaker = null;
        const intro = ui.el('div', { class: 'game__intro' }, [
          introBtn,
          ui.el('span', { class: 'grow' }, [
            ui.el('span', { class: 'en', lang: 'en', text: phrase.en }),
            ui.el('span', { text: '  ' + phrase.zh })
          ])
        ]);
        speaker = introBtn;
        game.appendChild(intro);
      }
    }

    const prompt = ui.el('div', { class: 'game__prompt' });
    const promptTitle = ui.el('p', {
      class: 'game__title',
      text: mode === 'sentence' ? '听句子，找动作' : '听一听，找一找'
    });
    soundOrb = ui.el('button', {
      type: 'button',
      class: 'sound-orb',
      'aria-label': '再听一次题目'
    }, ui.icon('speaker', 'sound-orb__icon'));
    soundOrb.addEventListener('click', () => {
      if (!session.alive) return;
      BEAR.sfx.play('tap');
      playPrompt();
    });
    prompt.appendChild(promptTitle);
    prompt.appendChild(soundOrb);
    feedback = ui.el('p', { class: 'game__hint', 'aria-live': 'polite' });
    prompt.appendChild(feedback);
    game.appendChild(prompt);

    optionsGrid = ui.el('div', {
      class: 'choice-grid' + (choiceCount === 3 ? ' choice-grid--3' : ''),
      role: 'group',
      'aria-label': '图片选项'
    });
    game.appendChild(optionsGrid);

    const foot = ui.el('div', { class: 'game__foot' });
    const replayBtn = ui.button({
      label: '再听一次',
      iconName: 'replay',
      variant: 'secondary',
      className: 'kid-audio',
      onClick: () => { if (!answered) playPrompt(true); }
    });
    nextBtn = ui.button({
      label: '下一个',
      iconName: 'arrow-right',
      variant: 'primary',
      className: 'btn--block kid-action',
      onClick: () => advance()
    });
    nextBtn.hidden = true;
    foot.appendChild(replayBtn);
    foot.appendChild(nextBtn);
    game.appendChild(foot);

    host.appendChild(game);

    function currentItem() {
      return unit.items[rounds[index]];
    }

    function currentAudio() {
      return content.itemAudioKey(currentItem(), mode);
    }

    function setRoundDots() {
      dots.innerHTML = '';
      const node = ui.dots(rounds.length, index, '第 ' + (index + 1) + ' 题，共 ' + rounds.length + ' 题');
      node.classList.add('round-dots');
      dots.appendChild(node);
    }

    async function playPrompt(withCue) {
      const key = currentAudio();
      if (!key) {
        kit.setFeedback(feedback, '这道题的声音走丢了，点“下一个”继续。', 'soft');
        return false;
      }
      const my = ++promptSeq;
      if (withCue) {
        soundOrb.classList.add('sound-orb--playing');
        await BEAR.audio.play('again');
        // A newer replay (or the sound orb) superseded this cue.
        if (my !== promptSeq) return false;
        if (!session.alive || answered) {
          soundOrb.classList.remove('sound-orb--playing');
          return false;
        }
      }
      return kit.playKey(key, session, soundOrb).then((ok) => {
        if (!ok && session.alive && !answered) {
          kit.setFeedback(feedback, '声音走丢了，点喇叭再试一次。', 'soft');
        }
        return ok;
      });
    }

    function buildOptions(item) {
      optionsGrid.innerHTML = '';
      answered = false;
      const options = kit.choiceItems(unit, pool, item.id, choiceCount);
      options.forEach((option, i) => {
        const card = ui.el('button', {
          type: 'button',
          class: 'choice',
          'data-id': option.id,
          'aria-label': '第 ' + (i + 1) + ' 个图片选项，' + option.en + '，' + option.zh
        });
        const art = ui.el('span', { class: 'choice__art' }, kit.bearMini({ pose: option.pose, face: option.face }));
        const label = ui.el('span', { class: 'choice__label', 'aria-hidden': 'true' }, [
          ui.el('span', { class: 'en', lang: 'en', text: option.en }),
          ui.el('span', { class: 'zh', text: option.zh })
        ]);
        const badge = ui.el('span', { class: 'choice__badge', 'aria-hidden': 'true' }, ui.icon('check'));
        card.appendChild(art);
        card.appendChild(label);
        card.appendChild(badge);
        card.addEventListener('click', () => onPick(option, card));
        optionsGrid.appendChild(card);
      });
    }

    function onPick(option, card) {
      if (!session.alive || answered || finished) return;
      if (card.classList.contains('choice--wrong') || card.disabled) return;
      const item = currentItem();
      if (!item) return;
      if (option.id === item.id) {
        answered = true;
        session.clear(autoTimer);
        soundOrb.disabled = true;
        replayBtn.disabled = true;
        card.classList.remove('choice--hint');
        card.classList.add('choice--correct');
        const label = card.querySelector('.choice__label');
        if (label) label.removeAttribute('aria-hidden');
        card.setAttribute('aria-label', option.en + '，' + option.zh);
        Array.prototype.forEach.call(optionsGrid.children, (elNode) => {
          elNode.disabled = true;
          if (elNode !== card) {
            elNode.classList.add('choice--dim');
            elNode.classList.remove('choice--hint');
          }
        });
        BEAR.sfx.play('correct');
        const labelText = mode === 'sentence'
          ? item.sentence.en + ' · ' + item.sentence.zh
          : item.en + ' · ' + item.zh;
        kit.setFeedback(feedback, labelText, 'good');
        ui.announce('答对了。' + labelText);
        nextBtn.hidden = false;
        nextBtn.focus({ preventScroll: true });
        const last = index >= rounds.length - 1;
        if (last) {
          nextBtn.setAttribute('aria-label', '完成这一组');
          nextBtn.lastChild.textContent = '完成';
        }
        const audioKey = content.itemAudioKey(item, mode);
        if (audioKey && session.alive) {
          const roundAt = index;
          const ok = BEAR.audio.play(audioKey).then((played) => {
            if (!session.alive || !played) return false;
            if (index !== roundAt || !answered) return false;
            if (!last) {
              autoTimer = session.timeout(advance, 1600);
            }
            return true;
          });
          // keep the promise chain contained; failures already surface in the hint
          if (ok && typeof ok.catch === 'function') ok.catch(() => {});
        }
      } else {
        const wrongCount = (Number(card.dataset.wrong) || 0) + 1;
        card.dataset.wrong = String(wrongCount);
        card.classList.add('choice--wrong');
        BEAR.sfx.play('wrong');
        session.timeout(() => card.classList.remove('choice--wrong'), 500);
        kit.setFeedback(feedback, wrongCount === 1 ? '再听一次，试试另一个。' : '没关系，再听一次。', 'soft');
        session.timeout(() => {
          if (!answered) playPrompt();
        }, 420);
        const attempts = (Number(optionsGrid.dataset.attempts) || 0) + 1;
        optionsGrid.dataset.attempts = String(attempts);
        if (attempts >= 2) {
          Array.prototype.forEach.call(optionsGrid.children, (node) => {
            const id = node.getAttribute('data-id');
            if (id === item.id) node.classList.add('choice--hint');
          });
          kit.setFeedback(feedback, '听一听，亮起来的这个就是答案。点一下它。', 'soft');
        }
      }
    }

    function renderRound() {
      const item = currentItem();
      if (!item) {
        finish();
        return;
      }
      answered = false;
      optionsGrid.dataset.attempts = '0';
      soundOrb.disabled = false;
      replayBtn.disabled = false;
      nextBtn.hidden = true;
      nextBtn.lastChild.textContent = '下一个';
      nextBtn.setAttribute('aria-label', '下一个');
      roundLabel.textContent = mode === 'sentence' ? '句子找图' : '听音找图';
      setRoundDots();
      kit.setFeedback(feedback, mode === 'sentence' ? '先听句子，再点图片。' : '先听，再点图片。', 'soft');
      buildOptions(item);
      session.timeout(() => {
        if (!answered && session.alive) playPrompt();
      }, 300);
    }

    function advance() {
      if (!session.alive || finished) return;
      session.clear(autoTimer);
      autoTimer = 0;
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

    renderRound();

    return {
      destroy() {
        finished = true;
        session.destroy();
      }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
