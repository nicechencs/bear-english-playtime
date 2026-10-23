/* Chapter player: start gate, phases, activities, star moments, results. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const screens = BEAR.screens = BEAR.screens || {};

  const CHAPTER_POSES = {
    'self-intro': 'wave',
    'action-words': 'run',
    'i-can': 'jump',
    'new-actions': 'crawl',
    'new-i-can': 'clap',
    showtime: 'jump'
  };

  screens.chapter = {
    render(host, ctx) {
      const ui = BEAR.ui;
      const content = BEAR.content;
      const store = BEAR.store;
      const unit = content.getUnit(ctx.unitId);
      const session = BEAR.gameKit.makeSession();
      let currentGame = null;
      let flowToken = 0;
      let finished = false;
      let phaseIndex = 0;
      let activityIndex = 0;
      let main = null;
      let screen = null;
      let isShowtime = false;
      let chapter = null;

      if (!unit) {
        host.innerHTML = '';
        host.appendChild(ui.emptyState({
          title: '没有找到这个单元',
          message: '回到首页，看看有哪些章节吧。',
          action: ui.button({
            label: '回到首页',
            variant: 'primary',
            onClick: () => BEAR.router.go('#/')
          })
        }));
        ui.setTitle('找不到单元');
        return function cleanupEmpty() {};
      }

      isShowtime = ctx.showtime || ctx.chapterId === unit.showtime.id;
      chapter = isShowtime ? unit.showtime : content.getChapter(unit, ctx.chapterId);
      if (!chapter) {
        host.innerHTML = '';
        host.appendChild(ui.emptyState({
          title: '找不到这一章',
          message: '可能章节换了名字。回到地图再选一次吧。',
          action: ui.button({
            label: '回到地图',
            variant: 'primary',
            onClick: () => BEAR.router.go('#/unit/' + unit.id)
          })
        }));
        ui.setTitle('找不到章节');
        return function cleanupMissing() {};
      }

      ui.setTitle(isShowtime ? 'Showtime' : chapter.zhTitle);
      screen = ui.el('section', { class: 'screen screen--lesson' });
      host.innerHTML = '';
      host.appendChild(screen);

      const soundBtn = ui.button({
        iconName: store.settings().muted ? 'mute' : 'speaker',
        iconOnly: true,
        variant: 'ghost',
        ariaLabel: store.settings().muted ? '打开声音' : '关闭声音',
        title: '声音',
        onClick: () => {
          const next = !store.settings().muted;
          store.setSetting('muted', next);
          BEAR.audio.setMuted(next);
          refreshSound();
          ui.announce(next ? '声音已关闭' : '声音已打开');
        }
      });
      const slowBtn = ui.button({
        iconName: 'clock',
        iconOnly: true,
        variant: 'ghost',
        ariaLabel: store.settings().slow ? '关闭慢速播放' : '开启慢速播放',
        title: '慢速播放',
        pressed: store.settings().slow,
        onClick: () => {
          const next = !store.settings().slow;
          store.setSetting('slow', next);
          BEAR.audio.setRate(next ? 0.75 : 1);
          slowBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
          slowBtn.setAttribute('aria-label', next ? '关闭慢速播放' : '开启慢速播放');
          ui.announce(next ? '慢速播放已开启' : '慢速播放已关闭');
        }
      });

      const top = ui.topbar({
        title: isShowtime ? '毕业演出' : chapter.zhTitle,
        subtitle: isShowtime ? 'Showtime' : chapter.title,
        onBack: () => BEAR.router.go('#/unit/' + unit.id),
        right: [soundBtn, slowBtn]
      });
      screen.appendChild(top);
      main = ui.el('div', { class: 'lesson' });
      screen.appendChild(main);

      kitPreload();

      function kitPreload() {
        const keys = content.chapterAudioKeys(unit, chapter);
        if (keys.length && BEAR.audio) BEAR.audio.preload(keys.slice(0, 12));
      }

      function refreshSound() {
        const muted = store.settings().muted;
        soundBtn.replaceChildren(ui.icon(muted ? 'mute' : 'speaker', 'btn__icon'));
        soundBtn.setAttribute('aria-label', muted ? '打开声音' : '关闭声音');
      }

      function goHome() {
        BEAR.router.go('#/unit/' + unit.id);
      }

      function focusMainHeading() {
        const heading = main.querySelector('h2');
        if (!heading) return;
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        try { heading.focus({ preventScroll: true }); } catch (err) {}
      }

      function destroyGame() {
        const game = currentGame;
        currentGame = null;
        if (!game) return;
        try {
          if (typeof game === 'function') game();
          else if (typeof game.destroy === 'function') game.destroy();
        } catch (err) {}
      }

      function showtimeSummary() {
        return store.unitSummary(unit);
      }

      function showtimeLocked() {
        const done = showtimeSummary();
        return !done.showtime.done && !content.showtimeUnlocked(store, unit);
      }

      function renderLocked() {
        main.innerHTML = '';
        const summary = showtimeSummary();
        const card = ui.el('div', { class: 'chapter-start' });
        const art = ui.el('div', { class: 'chapter-start__art' });
        art.appendChild(BEAR.gameKit.bearStage({ pose: 'jump', face: 'happy' }));
        art.appendChild(ui.el('span', { class: 'chapter-start__lock' }, ui.icon('lock')));
        const copy = ui.el('div', { class: 'chapter-start__copy' });
        copy.appendChild(ui.el('p', { class: 'eyebrow', text: 'Unit ' + unit.order + ' · Showtime' }));
        copy.appendChild(ui.el('h2', { class: 'chapter-start__title', text: 'Showtime' }));
        copy.appendChild(ui.el('p', { class: 'chapter-start__zh', text: '毕业演出' }));
        copy.appendChild(ui.el('p', {
          class: 'chapter-start__desc',
          text: '完成 ' + unit.chapters.length + ' 个章节后，小熊会邀请你来毕业演出。把学过的动作和句子串起来，就能拿到皇冠。'
        }));
        const progressTop = ui.el('div', { class: 'hero__progress-top' }, [
          ui.el('span', { text: '章节进度' }),
          ui.el('strong', { text: summary.chapters.done + ' / ' + summary.chapters.totalChapters })
        ]);
        copy.appendChild(progressTop);
        const bar = ui.el('div', {
          class: 'progress-bar',
          role: 'progressbar',
          'aria-valuemin': '0',
          'aria-valuemax': String(summary.chapters.totalChapters),
          'aria-valuenow': String(summary.chapters.done),
          'aria-label': '章节完成进度'
        }, ui.el('span', {
          class: 'progress-bar__fill',
          style: { width: (summary.chapters.totalChapters ? (summary.chapters.done / summary.chapters.totalChapters) * 100 : 0) + '%' }
        }));
        copy.appendChild(bar);
        const remaining = unit.chapters.filter((c, i) => !summary.chapters.rows[i] || !summary.chapters.rows[i].done);
        if (remaining.length) {
          const preview = ui.el('div', { class: 'phase-preview' });
          remaining.forEach((c) => {
            preview.appendChild(ui.el('span', { class: 'pill', text: c.zhTitle }));
          });
          copy.appendChild(preview);
        }
        const actions = ui.el('div', { class: 'chapter-start__actions' });
        actions.appendChild(ui.button({
          label: '回到地图继续学习',
          iconName: 'arrow-left',
          variant: 'primary',
          size: 'xl',
          onClick: goHome
        }));
        copy.appendChild(actions);
        card.appendChild(art);
        card.appendChild(copy);
        main.appendChild(card);
        focusMainHeading();
        ui.announce('Showtime 还没有解锁。完成全部章节后就可以参加。');
      }

      function renderStart() {
        flowToken += 1;
        destroyGame();
        BEAR.audio.stopAll();
        main.innerHTML = '';

        if (isShowtime && showtimeLocked()) {
          renderLocked();
          return;
        }

        const record = isShowtime
          ? { stars: 0, done: showtimeSummary().showtime.done, phase: 0 }
          : store.getChapter(unit.id, chapter.id);
        const done = !!record.done;
        const startAt = done ? 0 : Math.min(2, Math.max(0, record.phase || 0));
        const stars = isShowtime ? 0 : (record.stars || 0);
        const pose = CHAPTER_POSES[chapter.id] || 'wave';

        const card = ui.el('div', { class: 'chapter-start' });
        const art = ui.el('div', { class: 'chapter-start__art' });
        art.appendChild(BEAR.gameKit.bearStage({ pose, face: 'happy' }));
        const badgeIcon = isShowtime ? 'trophy' : (chapter.badge && chapter.badge.icon) || 'leaf';
        art.appendChild(ui.el('span', { class: 'chapter-start__badge', 'aria-hidden': 'true' }, ui.icon(badgeIcon)));

        const steps = ui.el('div', { class: 'chapter-start__steps', role: 'img', 'aria-label': '听一听、做一做、说一说' }, [
          ui.icon('speaker'), ui.icon('arrow-right', 'chapter-start__step-arrow'),
          ui.icon('play'), ui.icon('arrow-right', 'chapter-start__step-arrow'),
          ui.icon('sound-wave')
        ]);
        art.appendChild(steps);

        const copy = ui.el('div', { class: 'chapter-start__copy' });
        copy.appendChild(ui.el('p', {
          class: 'eyebrow',
          text: isShowtime ? 'Unit ' + unit.order + ' · Showtime' : 'Unit ' + unit.order + ' · 第 ' + chapter.order + ' 章'
        }));
        copy.appendChild(ui.el('h2', {
          class: 'chapter-start__title',
          lang: 'en',
          text: isShowtime ? 'Showtime!' : chapter.title
        }));
        copy.appendChild(ui.el('p', {
          class: 'chapter-start__zh',
          text: isShowtime ? '毕业演出' : chapter.zhTitle
        }));
        const howTo = parentTip(isShowtime
          ? '把学过的动作和句子串起来，完成 3 个挑战，就能拿到皇冠。'
          : '3 个小阶段，听一听、做一做、说一说。完成每个阶段，就能得到一颗星。', '家长看玩法');

        const actions = ui.el('div', { class: 'chapter-start__actions' });
        let primaryLabel;
        if (isShowtime) primaryLabel = done ? '再看一次演出' : '开始演出';
        else if (done) primaryLabel = '再玩一次';
        else if (startAt > 0) primaryLabel = '继续 · ' + chapter.phases[startAt].zhTitle;
        else primaryLabel = '开始学习';
        const startBtn = ui.button({
          label: primaryLabel,
          iconName: 'play',
          variant: 'primary',
          size: 'xl',
          className: 'kid-action',
          onClick: () => beginSession(startAt)
        });
        actions.appendChild(startBtn);
        if (!isShowtime && !done && startAt > 0) {
          actions.appendChild(ui.button({
            label: '从头开始',
            iconName: 'refresh',
            variant: 'secondary',
            onClick: () => beginSession(0)
          }));
        }
        actions.appendChild(ui.button({
          label: '回到地图',
          iconName: 'home',
          variant: 'ghost',
          onClick: goHome
        }));
        copy.appendChild(actions);

        if (!isShowtime) {
          const starLine = ui.el('div', { class: 'chapter-start__stars' });
          starLine.appendChild(ui.el('span', {
            text: done ? '已完成' : stars > 0 ? '已获得' : '还没开始'
          }));
          starLine.appendChild(ui.starRow(stars, 3, { className: 'stars--sm' }));
          starLine.appendChild(ui.el('span', { text: stars + ' / 3' }));
          copy.appendChild(starLine);
          const preview = ui.el('div', { class: 'phase-preview' });
          chapter.phases.forEach((phase, i) => {
            preview.appendChild(stepPreview(phase, i, done || i < (record.phase || 0)));
          });
          copy.appendChild(preview);
          if (chapter.tip) {
            copy.appendChild(parentTip(chapter.tip, '家长提示'));
          }
        } else {
          const doneLine = ui.el('div', { class: 'chapter-start__stars' });
          doneLine.appendChild(ui.el('span', { class: 'pill pill--sun' }, [
            ui.icon('trophy'),
            ui.el('span', { text: done ? '已经完成过演出' : (chapter.activities ? chapter.activities.length : 3) + ' 个挑战' })
          ]));
          copy.appendChild(doneLine);
          if (done) {
            copy.appendChild(ui.el('p', { class: 'chapter-start__note', text: '皇冠已经在贴纸册里了。再演一次也很好。' }));
          }
        }

        copy.appendChild(howTo);

        card.appendChild(art);
        card.appendChild(copy);
        main.appendChild(card);
        focusMainHeading();
      }

      function stepPreview(phase, index, completed) {
        const pill = ui.el('span', { class: 'pill' + (completed ? ' pill--leaf' : '') });
        pill.appendChild(ui.el('span', { class: 'phase-preview__icon', 'aria-hidden': 'true' },
          ui.icon(BEAR.gameKit.activityIcon(phase.activities && phase.activities[0]))));
        pill.appendChild(ui.el('span', { text: (index + 1) + ' · ' + phase.zhTitle }));
        return pill;
      }

      function parentTip(text, label) {
        const details = ui.el('details', { class: 'parent-tip chapter-start__tip' });
        const summary = ui.el('summary');
        summary.appendChild(ui.icon('chevron-down'));
        summary.appendChild(ui.el('span', { text: label || '家长提示' }));
        details.appendChild(summary);
        details.appendChild(ui.el('p', { class: 'parent-tip__body', text }));
        return details;
      }

      function beginSession(startAt) {
        if (finished) return;
        BEAR.audio.unlock();
        if (BEAR.sfx) BEAR.sfx.unlock();
        phaseIndex = startAt;
        activityIndex = 0;
        BEAR.audio.play('lets');
        renderTransition();
      }

      function renderTransition() {
        main.innerHTML = '';
        const wrap = ui.el('div', { class: 'chapter-go' });
        wrap.appendChild(BEAR.gameKit.bearStage({
          pose: isShowtime ? 'jump' : CHAPTER_POSES[chapter.id] || 'wave',
          face: 'happy'
        }));
        wrap.appendChild(ui.el('p', { class: 'chapter-go__en en', lang: 'en', text: "Let's do it!" }));
        wrap.appendChild(ui.el('p', { class: 'chapter-go__zh', text: '我们一起做吧。' }));
        main.appendChild(wrap);
        session.timeout(() => {
          if (finished) return;
          renderActivity();
        }, 1200);
      }

      function activitiesForPhase() {
        if (isShowtime) return chapter.activities || [];
        const phase = chapter.phases[phaseIndex];
        return (phase && phase.activities) || [];
      }

      function currentPhase() {
        return isShowtime ? null : chapter.phases[phaseIndex];
      }

      function lessonBar(activityCount) {
        const bar = ui.el('div', { class: 'lesson__bar' });
        const titles = ui.el('div', { class: 'lesson__titles' });
        if (isShowtime) {
          titles.appendChild(ui.el('p', { class: 'lesson__eyebrow', text: 'Showtime · 毕业演出' }));
          const title = ui.el('h2', { class: 'lesson__title' });
          title.appendChild(ui.icon(BEAR.gameKit.activityIcon(chapter.activities[activityIndex]), 'lesson__activity-icon'));
          title.appendChild(ui.el('span', { text: '第 ' + (activityIndex + 1) + ' 个挑战' }));
          titles.appendChild(title);
        } else {
          const phase = currentPhase();
          titles.appendChild(ui.el('p', {
            class: 'lesson__eyebrow',
            text: '第 ' + (phaseIndex + 1) + ' / 3 阶段 · ' + (phase ? phase.title : '')
          }));
          const title = ui.el('h2', { class: 'lesson__title' });
          title.appendChild(ui.icon(BEAR.gameKit.activityIcon(phase && phase.activities && phase.activities[activityIndex]), 'lesson__activity-icon'));
          title.appendChild(ui.el('span', { text: phase ? phase.zhTitle : '' }));
          titles.appendChild(title);
        }
        const progress = ui.el('div', { class: 'lesson__progress' });
        if (!isShowtime) {
          const stars = store.getChapter(unit.id, chapter.id).stars || 0;
          progress.appendChild(ui.starRow(stars, 3, { className: 'stars--sm' }));
        }
        progress.appendChild(ui.el('span', {
          class: 'lesson__count',
          text: (isShowtime ? '挑战 ' : '活动 ') + Math.min(activityIndex + 1, activityCount) + ' / ' + activityCount
        }));
        bar.appendChild(titles);
        bar.appendChild(progress);
        return bar;
      }

      function renderActivity() {
        if (finished) return;
        const activities = activitiesForPhase();
        if (!activityIndex) activityIndex = 0;
        if (!activities.length) {
          phaseComplete();
          return;
        }
        if (activityIndex >= activities.length) {
          phaseComplete();
          return;
        }
        const activity = activities[activityIndex];
        const game = BEAR.games[activity.type];
        main.innerHTML = '';
        main.appendChild(lessonBar(activities.length));
        const hostEl = ui.el('div', { class: 'lesson__host' });
        main.appendChild(hostEl);
        root.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        if (!game) {
          ui.toast('这个活动还没有准备好。', { tone: 'error' });
          activityIndex += 1;
          session.timeout(renderActivity, 150);
          return;
        }
        const token = ++flowToken;
        let handle = null;
        try {
          handle = game(hostEl, {
            unit,
            chapter,
            phase: currentPhase(),
            activity,
            onDone: () => activityDone(token)
          });
        } catch (err) {
          if (root.console) root.console.error('[bear] activity failed', activity.type, err);
          ui.toast('这一步出错了，先跳到下一步。', { tone: 'error' });
          activityIndex += 1;
          session.timeout(renderActivity, 200);
          return;
        }
        if (token === flowToken) currentGame = handle;
        else {
          try {
            if (handle && typeof handle.destroy === 'function') handle.destroy();
          } catch (err) {}
        }
      }

      function activityDone(token) {
        if (finished || token !== flowToken) return;
        flowToken += 1;
        destroyGame();
        BEAR.audio.stopAll();
        const activities = activitiesForPhase();
        if (activityIndex >= activities.length - 1) {
          activityIndex = activities.length;
          phaseComplete();
          return;
        }
        activityIndex += 1;
        ui.announce('下一项');
        renderActivity();
      }

      function phaseComplete() {
        if (finished) return;
        BEAR.audio.stopAll();
        if (isShowtime) {
          finishShowtime();
          return;
        }
        const completed = phaseIndex + 1;
        store.saveChapterProgress(unit.id, chapter.id, completed);
        BEAR.sfx.play('star');
        ui.confetti({ count: 16 });
        if (completed >= 3) {
          finishChapter();
          return;
        }
        renderPhaseDone(completed);
      }

      function renderPhaseDone(completed) {
        main.innerHTML = '';
        const wrap = ui.el('div', { class: 'phase-done' });
        wrap.appendChild(ui.el('div', { class: 'phase-done__star', 'aria-hidden': 'true' }, ui.icon('star')));
        wrap.appendChild(ui.el('div', { class: 'phase-done__bear', 'aria-hidden': 'true' }, BEAR.gameKit.bearMini({ pose: CHAPTER_POSES[chapter.id] || 'wave', face: 'happy' })));
        wrap.appendChild(ui.el('p', { class: 'result__kicker', text: '第 ' + completed + ' 阶段完成' }));
        wrap.appendChild(ui.el('h2', { class: 'phase-done__title', text: '得到一颗星！' }));
        wrap.appendChild(ui.starRow(completed, 3, { className: 'stars--lg phase-done__stars' }));
        wrap.appendChild(ui.el('p', {
          class: 'phase-done__text',
          text: completed === 1 ? '听一听、做一做，你已经进入状态了。' : '再做一点点，这一章就完成了。'
        }));
        const actions = ui.el('div', { class: 'phase-done__actions' });
        const nextPhase = chapter.phases[phaseIndex + 1];
        actions.appendChild(ui.button({
          label: '继续 · ' + (nextPhase ? nextPhase.zhTitle : '下一阶段'),
          iconName: 'arrow-right',
          variant: 'primary',
          size: 'xl',
          className: 'kid-action',
          onClick: () => {
            BEAR.sfx.play('tap');
            phaseIndex += 1;
            activityIndex = 0;
            renderActivity();
          }
        }));
        actions.appendChild(ui.button({
          label: '回到地图',
          iconName: 'home',
          variant: 'ghost',
          onClick: goHome
        }));
        wrap.appendChild(actions);
        main.appendChild(wrap);
        focusMainHeading();
        ui.announce('得到一颗星。' + completed + ' 颗星了。');
      }

      function finishChapter() {
        if (finished) return;
        store.completeChapter(unit.id, chapter.id, chapter.stickerIds);
        renderResult(false);
      }

      function finishShowtime() {
        if (finished) return;
        store.completeShowtime(unit.id);
        renderResult(true);
      }

      function renderResult(showtime) {
        main.innerHTML = '';
        root.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        const wrap = ui.el('div', { class: 'result' + (showtime ? ' result--showtime' : '') });
        const badgeIcon = showtime ? 'trophy' : (chapter.badge && chapter.badge.icon) || 'leaf';
        wrap.appendChild(ui.el('div', {
          class: 'result__badge' + (showtime ? ' result__badge--crown' : ''),
          'aria-hidden': 'true'
        }, ui.icon(badgeIcon)));
        wrap.appendChild(ui.el('div', { class: 'result__bear', 'aria-hidden': 'true' },
          BEAR.gameKit.bearMini({ pose: CHAPTER_POSES[chapter.id] || 'wave', face: 'happy' })));
        wrap.appendChild(ui.el('p', {
          class: 'result__kicker',
          text: showtime ? '毕业演出完成' : '章节完成'
        }));
        wrap.appendChild(ui.el('h2', {
          class: 'result__title',
          lang: 'en',
          text: showtime ? 'Showtime!' : chapter.title
        }));
        wrap.appendChild(ui.el('p', {
          class: 'result__zh',
          text: showtime ? '皇冠是你的了' : chapter.zhTitle
        }));
        if (!showtime) {
          wrap.appendChild(ui.starRow(3, 3, { className: 'stars--lg result__stars' }));
        } else {
          wrap.appendChild(ui.el('p', {
            class: 'result__text',
            text: '你听懂了动作和句子，也大胆地说出来了。小熊把皇冠送给你。'
          }));
        }
        if (!showtime) {
          wrap.appendChild(ui.el('p', {
            class: 'result__text',
            text: (chapter.badge && chapter.badge.label ? chapter.badge.label + ' · ' : '') +
              '你完成了这一章。去贴纸册看看新徽章吧。'
          }));
        }

        const actions = ui.el('div', { class: 'result__actions' });
        wrap.appendChild(actions);

        if (!showtime && chapter.stickerIds && chapter.stickerIds.length) {
          const stickerWrap = ui.el('div', { class: 'result__stickers' });
          stickerWrap.appendChild(ui.el('p', {
            class: 'result__stickers-title',
            text: '动作贴纸 · ' + chapter.stickerIds.length + ' 枚已收进贴纸册'
          }));
          const row = ui.el('div', { class: 'result__sticker-row' });
          content.getItems(unit, chapter.stickerIds).forEach((item) => {
            row.appendChild(ui.el('div', { class: 'result__sticker' }, [
              BEAR.gameKit.bearMini({ pose: item.pose, face: item.face }),
              ui.el('span', { class: 'en', lang: 'en', text: item.en })
            ]));
          });
          stickerWrap.appendChild(row);
          wrap.appendChild(stickerWrap);
        }

        if (showtime) {
          actions.appendChild(ui.button({
            label: '回到地图',
            iconName: 'home',
            variant: 'primary',
            size: 'xl',
            className: 'kid-action',
            onClick: goHome
          }));
          actions.appendChild(ui.button({
            label: '看看贴纸册',
            iconName: 'star',
            variant: 'secondary',
            onClick: () => BEAR.router.go('#/unit/' + unit.id + '/stickers')
          }));
          actions.appendChild(ui.button({
            label: '再演一次',
            iconName: 'refresh',
            variant: 'ghost',
            onClick: () => {
              BEAR.audio.stopAll();
              renderStart();
            }
          }));
        } else {
          const next = store.nextChapter(unit);
          const nextChapter = next ? unit.chapters.find((c) => c.id === next.id) : null;
          const summary = store.unitSummary(unit);
          if (nextChapter) {
            actions.appendChild(ui.button({
              label: '下一章 · ' + nextChapter.zhTitle,
              iconName: 'arrow-right',
              variant: 'primary',
              size: 'xl',
              className: 'kid-action',
              onClick: () => BEAR.router.go('#/unit/' + unit.id + '/chapter/' + nextChapter.id)
            }));
          } else if (!summary.showtime.done) {
            actions.appendChild(ui.button({
              label: '去 Showtime 领皇冠',
              iconName: 'trophy',
              variant: 'primary',
              size: 'xl',
              className: 'kid-action',
              onClick: () => BEAR.router.go('#/unit/' + unit.id + '/showtime')
            }));
          } else {
            actions.appendChild(ui.button({
              label: '回到地图',
              iconName: 'home',
              variant: 'primary',
              size: 'xl',
              onClick: goHome
            }));
          }
          if (nextChapter || !summary.showtime.done) {
            actions.appendChild(ui.button({
              label: '回到地图',
              iconName: 'home',
              variant: 'secondary',
              onClick: goHome
            }));
          } else {
            actions.appendChild(ui.button({
              label: '看看贴纸册',
              iconName: 'star',
              variant: 'secondary',
              onClick: () => BEAR.router.go('#/unit/' + unit.id + '/stickers')
            }));
          }
          actions.appendChild(ui.button({
            label: '再玩一次',
            iconName: 'refresh',
            variant: 'ghost',
            onClick: () => {
              BEAR.audio.stopAll();
              renderStart();
            }
          }));
        }
        main.appendChild(wrap);
        ui.confetti({ count: showtime ? 52 : 40 });
        BEAR.audio.play('cheer');
        focusMainHeading();
        ui.announce(showtime ? '毕业演出完成，你得到了皇冠。' : '章节完成，你得到了三颗星和一枚徽章。');
      }

      renderStart();

      return function cleanupChapter() {
        finished = true;
        flowToken += 1;
        session.destroy();
        destroyGame();
        BEAR.audio.stopAll();
      };
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
