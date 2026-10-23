/* Playground: tap any action or feeling, or take a mixed challenge. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const screens = BEAR.screens = BEAR.screens || {};

  screens.playground = {
    render(host, ctx) {
      const ui = BEAR.ui;
      const content = BEAR.content;
      const unit = content.getUnit(ctx.unitId) || content.listUnits()[0];
      let activeGame = null;
      let gameToken = 0;
      let modalToken = 0;
      let finished = false;

      if (!unit || !unit.playground) {
        host.innerHTML = '';
        host.appendChild(ui.emptyState({
          title: '游乐场还没开放',
          message: '先回到地图学习吧。',
          action: ui.button({
            label: '回到地图',
            variant: 'primary',
            onClick: () => BEAR.router.go('#/')
          })
        }));
        ui.setTitle('游乐场');
        return function cleanupEmpty() {};
      }

      ui.setTitle('游乐场');
      const screen = ui.el('section', { class: 'screen screen--playground' });
      const top = ui.topbar({
        title: '游乐场',
        subtitle: '自由点播 · 不算进度',
        onBack: () => BEAR.router.go('#/unit/' + unit.id),
        right: [ui.button({
          iconName: 'star',
          label: '贴纸册',
          variant: 'ghost',
          size: 'sm',
          onClick: () => BEAR.router.go('#/unit/' + unit.id + '/stickers')
        })]
      });
      screen.appendChild(top);
      const main = ui.el('div', { class: 'playground' });
      screen.appendChild(main);
      host.innerHTML = '';
      host.appendChild(screen);

      const actions = content.getItems(unit, unit.playground.actions || []);
      const feelings = content.getItems(unit, unit.playground.feelings || []);
      const challenges = unit.playground.challenges || [];

      function destroyGame() {
        const game = activeGame;
        activeGame = null;
        gameToken += 1;
        if (!game) return;
        try {
          if (typeof game === 'function') game();
          else if (typeof game.destroy === 'function') game.destroy();
        } catch (err) {}
      }

      function challengeMeta(activity) {
        if (activity.type === 'findIt' && activity.mode === 'sentence') {
          return { title: '句子挑战', sub: (activity.rounds || 5) + ' 题 · 听 I can …', icon: 'sound-wave' };
        }
        if (activity.type === 'findIt') {
          return { title: '听音找图', sub: (activity.rounds || 5) + ' 题 · 动作词', icon: 'speaker' };
        }
        return { title: '听指令做动作', sub: (activity.items || []).length + ' 个动作 · 跟着做', icon: 'play' };
      }

      function openItem(item) {
        if (!item || finished) return;
        BEAR.audio.unlock();
        BEAR.audio.stopAll();
        const token = ++modalToken;
        const isFeeling = item.kind === 'feeling';
        const sentenceKey = content.itemAudioKey(item, 'sentence');
        const stage = ui.el('div', { class: 'play-sheet__stage' }, BEAR.gameKit.bearStage({
          pose: item.pose,
          face: item.face || 'happy'
        }));
        const sheetActions = ui.el('div', { class: 'play-sheet__actions' });
        const wordBtn = ui.button({
          label: '听单词',
          iconName: 'speaker',
          variant: 'secondary',
          className: 'kid-audio',
          onClick: () => {
            if (token !== modalToken) return;
            BEAR.audio.stopAll();
            BEAR.audio.play(item.audio.word);
          }
        });
        const sentenceBtn = ui.button({
          label: isFeeling ? '听感觉' : '听句子',
          iconName: 'sound-wave',
          variant: 'soft',
          className: 'kid-audio',
          onClick: () => {
            if (token !== modalToken) return;
            BEAR.audio.stopAll();
            if (sentenceKey) BEAR.audio.play(sentenceKey);
          }
        });
        sheetActions.appendChild(wordBtn);
        if (sentenceKey) sheetActions.appendChild(sentenceBtn);
        const body = ui.el('div', { class: 'play-sheet' }, [
          stage,
          ui.el('p', { class: 'play-sheet__word en', lang: 'en', text: item.en }),
          ui.el('p', { class: 'play-sheet__zh', text: item.zh }),
          ui.el('p', { class: 'play-sheet__sentence en', lang: 'en', text: item.sentence.en }),
          ui.el('p', { class: 'play-sheet__sentence-zh', text: item.sentence.zh }),
          sheetActions,
          item.tip ? ui.el('p', { class: 'play-sheet__tip', text: item.tip }) : null
        ]);
        const dialog = ui.modal({
          title: item.en,
          iconName: isFeeling ? 'heart' : 'leaf',
          body,
          className: 'sheet--play',
          onClose: () => {
            modalToken += 1;
            BEAR.audio.stopAll();
          }
        });
        // The modal closes before the tap audio would have finished; stopping is the
        // correct end state. Start the word, then its sentence, while the sheet is open.
        if (item.audio.word) {
          BEAR.audio.playSequence(sentenceKey ? [item.audio.word, sentenceKey] : [item.audio.word]);
        }
        return dialog;
      }

      function playGroup(title, count, items, kind) {
        const group = ui.el('section', { class: 'play-group' });
        group.appendChild(ui.el('div', { class: 'play-group__head' }, [
          ui.el('h3', { class: 'play-group__title', text: title }),
          ui.el('span', { class: 'play-group__count', text: count + ' 个' })
        ]));
        const grid = ui.el('div', { class: 'play-grid' });
        items.forEach((item) => {
          const btn = ui.el('button', {
            type: 'button',
            class: 'play-item',
            'aria-label': item.en + '，' + item.zh,
            'data-item-id': item.id
          });
          const art = ui.el('span', { class: 'play-item__art', 'aria-hidden': 'true' });
          art.appendChild(kind === 'feeling'
            ? BEAR.gameKit.bearFace({ face: item.face })
            : BEAR.gameKit.bearMini({ pose: item.pose, face: item.face }));
          btn.appendChild(art);
          btn.appendChild(ui.el('span', { class: 'play-item__en', lang: 'en', text: item.en }));
          btn.appendChild(ui.el('span', { class: 'play-item__zh', text: item.zh }));
          btn.addEventListener('click', () => openItem(item));
          grid.appendChild(btn);
        });
        group.appendChild(grid);
        return group;
      }

      function renderPlayground() {
        if (finished) return;
        destroyGame();
        modalToken += 1;
        BEAR.audio.stopAll();
        main.innerHTML = '';
        root.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        const head = ui.el('div', { class: 'playground-head' });
        const headCopy = ui.el('div', { class: 'playground-head__copy' }, [
          ui.el('p', { class: 'eyebrow eyebrow--zh', text: '自由点播' }),
          ui.el('h2', { text: '想玩什么，就点什么' }),
          ui.el('p', { class: 'muted', text: '点一张卡，听单词和句子；也可以挑战混合题。' })
        ]);
        const headArt = ui.el('div', { class: 'playground-head__bear', 'aria-hidden': 'true' });
        headArt.appendChild(BEAR.gameKit.bearMini({ pose: 'wave', face: 'happy' }));
        head.appendChild(headCopy);
        head.appendChild(headArt);
        main.appendChild(head);

        if (challenges.length) {
          const list = ui.el('div', { class: 'challenge-list' });
          challenges.forEach((activity, i) => {
            const meta = challengeMeta(activity);
            const btn = ui.el('button', {
              type: 'button',
              class: 'challenge-card',
              'data-testid': 'challenge-' + i,
              'aria-label': meta.title + '，' + meta.sub
            });
            btn.appendChild(ui.el('span', { class: 'challenge-card__icon', 'aria-hidden': 'true' }, ui.icon(meta.icon)));
            btn.appendChild(ui.el('span', { class: 'challenge-card__art', 'aria-hidden': 'true' },
              BEAR.gameKit.bearMini({ pose: BEAR.gameKit.activityPose(activity, unit), face: 'happy' })));
            btn.appendChild(ui.el('span', { class: 'challenge-card__text' }, [
              ui.el('span', { class: 'challenge-card__title', text: meta.title }),
              ui.el('span', { class: 'challenge-card__sub', text: meta.sub })
            ]));
            btn.addEventListener('click', () => startChallenge(activity, meta));
            list.appendChild(btn);
          });
          main.appendChild(list);
        }

        main.appendChild(playGroup('动作', actions.length, actions, 'action'));
        main.appendChild(playGroup('感觉', feelings.length, feelings, 'feeling'));
        main.appendChild(ui.el('p', {
          class: 'home-foot',
          text: '这里的点播不计入章节进度，随时回来玩。'
        }));
      }

      function startChallenge(activity, meta) {
        if (finished) return;
        BEAR.audio.unlock();
        if (BEAR.sfx) BEAR.sfx.unlock();
        destroyGame();
        BEAR.audio.stopAll();
        main.innerHTML = '';

        const backRow = ui.el('div', { class: 'playground-back' });
        backRow.appendChild(ui.button({
          label: '回到游乐场',
          iconName: 'arrow-left',
          variant: 'secondary',
          size: 'sm',
          onClick: () => renderPlayground()
        }));
        backRow.appendChild(ui.el('span', { class: 'pill pill--leaf', text: '混合挑战' }));
        main.appendChild(backRow);

        const bar = ui.el('div', { class: 'lesson__bar' });
        bar.appendChild(ui.el('div', { class: 'lesson__titles' }, [
          ui.el('p', { class: 'lesson__eyebrow', text: '自由挑战 · 不计进度' }),
          ui.el('h2', { class: 'lesson__title', text: meta.title })
        ]));
        bar.appendChild(ui.el('div', { class: 'lesson__progress' }, [
          ui.el('span', { class: 'lesson__count', text: meta.sub })
        ]));
        main.appendChild(bar);

        const hostEl = ui.el('div', { class: 'lesson__host' });
        main.appendChild(hostEl);
        const game = BEAR.games[activity.type];
        if (!game) {
          ui.toast('这个挑战还没准备好。', { tone: 'error' });
          renderPlayground();
          return;
        }
        const token = gameToken = gameToken + 1;
        let handle;
        try {
          handle = game(hostEl, {
            unit,
            chapter: null,
            phase: null,
            activity,
            onDone: () => challengeDone(token, activity, meta)
          });
        } catch (err) {
          ui.toast('挑战出错了，回到游乐场再试。', { tone: 'error' });
          renderPlayground();
          return;
        }
        if (token === gameToken) activeGame = handle;
        else if (handle && typeof handle.destroy === 'function') {
          try { handle.destroy(); } catch (err) {}
        }
      }

      function challengeDone(token, activity, meta) {
        if (finished || token !== gameToken) return;
        gameToken += 1;
        destroyGame();
        BEAR.audio.stopAll();
        BEAR.sfx.play('star');
        ui.confetti({ count: 24 });

        main.innerHTML = '';
        const wrap = ui.el('div', { class: 'phase-done' });
        wrap.appendChild(ui.el('div', { class: 'phase-done__star', 'aria-hidden': 'true' }, ui.icon('star')));
        wrap.appendChild(ui.el('p', { class: 'result__kicker', text: '自由挑战' }));
        wrap.appendChild(ui.el('h2', { class: 'phase-done__title', text: '挑战完成！' }));
        wrap.appendChild(ui.el('p', { class: 'phase-done__text', text: meta.title + ' · ' + meta.sub }));
        const actions = ui.el('div', { class: 'phase-done__actions' });
        actions.appendChild(ui.button({
          label: '再来一次',
          iconName: 'refresh',
          variant: 'primary',
          size: 'xl',
          className: 'kid-action',
          onClick: () => startChallenge(activity, meta)
        }));
        actions.appendChild(ui.button({
          label: '回到游乐场',
          iconName: 'arrow-left',
          variant: 'secondary',
          onClick: () => renderPlayground()
        }));
        wrap.appendChild(actions);
        main.appendChild(wrap);
        const heading = wrap.querySelector('h2');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          try { heading.focus({ preventScroll: true }); } catch (err) {}
        }
        ui.announce('挑战完成。');
      }

      renderPlayground();

      return function cleanupPlayground() {
        finished = true;
        gameToken += 1;
        modalToken += 1;
        destroyGame();
        BEAR.audio.stopAll();
      };
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
