/* Intro Chat: Bear asks, the grown-up models an answer, the child tries. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const games = BEAR.games = BEAR.games || {};

  games.introChat = function mountIntroChat(host, opts) {
    const ui = BEAR.ui;
    const kit = BEAR.gameKit;
    const content = BEAR.content;
    const unit = opts.unit;
    const activity = opts.activity;
    const turns = activity.turns || [];
    const session = kit.makeSession();
    let index = 0;
    let selected = -1;
    let finished = false;
    let stageSvg = null;
    let stageWrap = null;
    let questionBtn = null;
    let answerList = null;
    let wordRow = null;
    let noteEl = null;
    let feedback = null;
    let nextBtn = null;
    let dots = null;

    host.innerHTML = '';
    if (!turns.length) {
      if (typeof opts.onDone === 'function') opts.onDone();
      return { destroy() { session.destroy(); } };
    }

    const game = ui.el('div', { class: 'game game--chat' });
    const top = ui.el('div', { class: 'game__top' });
    top.appendChild(ui.el('span', { class: 'game__kicker', text: '家长带答 · 听一听，说一说' }));
    dots = ui.el('span', { class: 'round-dots' });
    top.appendChild(dots);
    game.appendChild(top);

    const scene = ui.el('div', { class: 'chat__scene' });
    stageWrap = ui.el('div', { class: 'chat__bear' });
    scene.appendChild(stageWrap);
    const bubble = ui.el('div', { class: 'chat__bubble' });
    const qRow = ui.el('div', { class: 'chat__q-row' });
    questionBtn = ui.el('button', {
      type: 'button',
      class: 'sound-orb sound-orb--sm',
      'aria-label': '听问题'
    }, ui.icon('speaker'));
    questionBtn.addEventListener('click', () => {
      if (!session.alive) return;
      BEAR.sfx.play('tap');
      playQuestion();
    });
    const qText = ui.el('div', { class: 'grow' }, [
      ui.el('p', { class: 'chat__en', lang: 'en' }),
      ui.el('p', { class: 'chat__zh' })
    ]);
    qRow.appendChild(questionBtn);
    qRow.appendChild(qText);
    bubble.appendChild(qRow);
    noteEl = ui.el('p', { class: 'chat__note' });
    bubble.appendChild(noteEl);
    scene.appendChild(bubble);
    game.appendChild(scene);

    const answerPrompt = ui.el('p', { class: 'game__kicker', text: '听一听示范，跟着说' });
    game.appendChild(answerPrompt);
    answerList = ui.el('div', { class: 'answer-list' });
    game.appendChild(answerList);
    wordRow = ui.el('div', { class: 'answer-words' });
    game.appendChild(wordRow);

    feedback = ui.el('p', { class: 'game__hint', 'aria-live': 'polite' });
    game.appendChild(feedback);

    const actions = ui.el('div', { class: 'chat__actions' });
    nextBtn = ui.button({
      label: '先听一个示范回答',
      iconName: 'arrow-right',
      variant: 'primary',
      size: 'xl',
      disabled: true,
      onClick: () => advance()
    });
    actions.appendChild(nextBtn);
    game.appendChild(actions);
    host.appendChild(game);

    function currentTurn() {
      return turns[index];
    }

    function currentPhraseQuestion() {
      const turn = currentTurn();
      return turn && turn.q ? content.getPhrase(unit, turn.q) : null;
    }

    function renderDots() {
      dots.innerHTML = '';
      const node = ui.dots(turns.length, index, '第 ' + (index + 1) + ' 个问题，共 ' + turns.length + ' 个');
      node.classList.add('round-dots');
      dots.appendChild(node);
    }

    function playQuestion() {
      const phrase = currentPhraseQuestion();
      if (!phrase || !session.alive) return;
      questionBtn.classList.add('sound-orb--playing');
      BEAR.audio.play(phrase.audio).then(() => {
        if (session.alive) questionBtn.classList.remove('sound-orb--playing');
      });
    }

    function labelFor(answer) {
      if (answer.item && answer.mode === 'im') {
        const item = unit.items[answer.item];
        if (item) return { en: "I'm " + item.en + '.', zh: item.zh };
      }
      return content.answerLabel(unit, answer);
    }

    function answerArt(answer) {
      if (answer.item && unit.items[answer.item]) {
        const item = unit.items[answer.item];
        return item.kind === 'feeling'
          ? kit.bearFace({ face: item.face })
          : kit.bearMini({ pose: item.pose, face: item.face });
      }
      return kit.bearMini({ pose: answer.phrase === 'a_girl' ? 'point' : 'wave', face: 'happy' });
    }

    function renderTurn() {
      const turn = currentTurn();
      if (!turn) {
        finish();
        return;
      }
      selected = -1;
      const phrase = currentPhraseQuestion();
      const qEn = qText.firstChild;
      const qZh = qText.lastChild;
      qEn.textContent = phrase ? phrase.en : 'Question';
      qZh.textContent = phrase ? phrase.zh : (turn.zh || '');
      noteEl.textContent = turn.note || '';
      noteEl.hidden = !turn.note;
      feedback.textContent = '';
      feedback.className = 'game__hint';
      nextBtn.disabled = true;
      nextBtn.lastChild.textContent = index === turns.length - 1 ? '说完了，继续' : '我们说过了';
      nextBtn.setAttribute('aria-label', nextBtn.lastChild.textContent);

      stageWrap.innerHTML = '';
      stageSvg = kit.bearStage({ pose: 'wave', face: 'happy' });
      stageWrap.appendChild(stageSvg);

      answerList.innerHTML = '';
      wordRow.innerHTML = '';
      wordRow.hidden = true;
      nextBtn.classList.add('btn--primary');
      renderDots();

      const answers = turn.answers || [];
      const wordAnswers = [];
      answers.forEach((answer, i) => {
        const label = labelFor(answer);
        const card = ui.el('button', {
          type: 'button',
          class: 'answer-card',
          'aria-label': '听示范回答：' + label.en + '，' + label.zh
        });
        card.appendChild(ui.el('span', { class: 'answer-card__icon', 'aria-hidden': 'true' }, ui.icon('speaker')));
        const art = ui.el('span', { class: 'answer-card__art', 'aria-hidden': 'true' }, answerArt(answer));
        if (answer.phrase === 'a_age') {
          const age = label.en.match(/\b(\d+)\b/);
          if (age) art.appendChild(ui.el('span', { class: 'answer-card__number', text: age[1] }));
        }
        if (answer.phrase === 'a_name') {
          const name = label.en.match(/My name is\s+([^.!?]+)/i);
          if (name) art.appendChild(ui.el('span', { class: 'answer-card__name', lang: 'en', text: name[1].trim() }));
        }
        if (answer.word) art.appendChild(ui.el('span', { class: 'answer-card__word-cue', 'aria-hidden': 'true' }, [
          ui.icon('speaker'), ui.el('span', { lang: 'en', text: answer.word })
        ]));
        card.appendChild(art);
        card.appendChild(ui.el('span', { class: 'answer-card__text' }, [
          ui.el('span', { class: 'answer-card__en en', lang: 'en', text: label.en }),
          ui.el('span', { class: 'answer-card__zh', text: label.zh })
        ]));
        card.setAttribute('aria-pressed', 'false');
        card.addEventListener('click', () => chooseAnswer(i, card, answer));
        answerList.appendChild(card);
        if (answer.word) wordAnswers.push(answer.word);
      });

      if (wordAnswers.length) {
        wordRow.hidden = false;
        wordRow.appendChild(ui.el('span', { class: 'answer-words__label', text: '先听小词：' }));
        wordAnswers.forEach((wordKey) => {
          const phraseWord = content.getPhrase(unit, wordKey);
          if (!phraseWord) return;
          const chip = ui.chip({
            label: phraseWord.en + ' · ' + phraseWord.zh,
            iconName: 'speaker',
            onClick: () => {
              BEAR.sfx.play('tap');
              BEAR.audio.play(phraseWord.audio);
              kit.setFeedback(feedback, phraseWord.en + ' · ' + phraseWord.zh, 'soft');
            }
          });
          wordRow.appendChild(chip);
        });
      }

      session.timeout(() => {
        if (session.alive && selected < 0) playQuestion();
      }, 350);
    }

    function chooseAnswer(i, card, answer) {
      if (!session.alive) return;
      selected = i;
      Array.prototype.forEach.call(answerList.children, (node) => {
        node.classList.remove('answer-card--selected');
        node.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('answer-card--selected');
      card.setAttribute('aria-pressed', 'true');
      const key = content.answerAudioKey(unit, answer);
      if (answer.word && unit.phrases[answer.word] && key) {
        BEAR.audio.playSequence([unit.phrases[answer.word].audio, key]);
      } else if (key) BEAR.audio.play(key);
      if (answer.item) {
        const item = unit.items[answer.item];
        if (item) kit.setBear(stageSvg, item.pose || item.id, item.face || 'happy');
      } else {
        kit.setBear(stageSvg, 'wave', 'happy');
      }
      nextBtn.disabled = false;
      nextBtn.classList.add('kid-action');
      const label = labelFor(answer);
      kit.setFeedback(feedback, '轮到你们了：' + label.en, 'soft');
      ui.announce('示范回答：' + label.en);
    }

    function advance() {
      if (!session.alive || finished) return;
      if (selected < 0) {
        kit.setFeedback(feedback, '先点一个示范回答听一听。', 'soft');
        return;
      }
      if (index >= turns.length - 1) {
        finish();
        return;
      }
      index += 1;
      BEAR.audio.stopAll();
      renderTurn();
    }

    function finish() {
      if (finished) return;
      finished = true;
      BEAR.audio.stopAll();
      if (typeof opts.onDone === 'function') opts.onDone();
    }

    renderTurn();

    return {
      destroy() {
        finished = true;
        session.destroy();
      }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
