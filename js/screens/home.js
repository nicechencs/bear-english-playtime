/* Home: the five-chapter paper map and today's next step. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const screens = BEAR.screens = BEAR.screens || {};

  screens.home = {
    render(host, ctx) {
      const ui = BEAR.ui;
      const content = BEAR.content;
      const store = BEAR.store;
      let unit = content.getUnit(ctx.unitId);
      if (!unit && ctx.unitId) {
        host.innerHTML = '';
        host.appendChild(ui.emptyState({
          title: '没有找到这个单元',
          message: '回到首页看看当前开放的课程吧。',
          action: ui.button({
            label: '回到首页',
            variant: 'primary',
            onClick: () => BEAR.router.go('#/')
          })
        }));
        ui.setTitle('找不到单元');
        return function cleanupMissingUnit() {};
      }
      if (!unit) unit = content.listUnits()[0];
      if (!unit) {
        host.innerHTML = '';
        host.appendChild(ui.emptyState({
          title: '课程还在准备中',
          message: '稍后再来看看吧。'
        }));
        ui.setTitle('小熊英语游戏');
        return function cleanupNoUnits() {};
      }

      ui.setTitle('');
      const summary = store.unitSummary(unit);
      const rows = summary.chapters.rows;
      const rowById = Object.create(null);
      rows.forEach((row) => { rowById[row.id] = row; });
      const next = store.nextChapter(unit);
      const nextChapter = next ? unit.chapters.find((c) => c.id === next.id) : null;
      const showtimeDone = summary.showtime.done;
      const allChaptersDone = summary.chapters.done === summary.chapters.totalChapters;
      const badgeCount = rows.filter((r) => r.done).length;

      const screen = ui.el('section', { class: 'screen screen--home' });

      /* ---------- top brand row ---------- */
      const top = ui.el('header', { class: 'home-top' });
      const brand = ui.el('div', { class: 'brand' });
      const brandBear = ui.el('span', { class: 'brand__bear', 'aria-hidden': 'true' });
      brandBear.appendChild(BEAR.gameKit.bearMini({ pose: 'wave', face: 'happy' }));
      brand.appendChild(brandBear);
      brand.appendChild(ui.el('div', { class: 'brand__text' }, [
        ui.el('p', { class: 'brand__kicker', lang: 'en', text: "Bear's English Playtime" }),
        ui.el('p', { class: 'brand__zh', text: '小熊英语游戏' })
      ]));
      top.appendChild(brand);

      const topActions = ui.el('div', { class: 'home-top__actions' });
      const muted = store.settings().muted;
      const soundBtn = ui.iconButton(muted ? 'mute' : 'speaker', muted ? '打开声音' : '关闭声音', () => {
        const nextMuted = !store.settings().muted;
        store.setSetting('muted', nextMuted);
        BEAR.audio.setMuted(nextMuted);
        soundBtn.replaceChildren(ui.icon(nextMuted ? 'mute' : 'speaker', 'btn__icon'));
        soundBtn.setAttribute('aria-label', nextMuted ? '打开声音' : '关闭声音');
        ui.announce(nextMuted ? '声音已关闭' : '声音已打开');
      }, { size: 'sm' });
      topActions.appendChild(soundBtn);
      topActions.appendChild(ui.button({
        iconName: 'parent',
        label: '家长',
        ariaLabel: '家长',
        variant: 'ghost',
        className: 'home-parent-btn',
        onClick: () => BEAR.router.go('#/parent')
      }));
      top.appendChild(topActions);
      screen.appendChild(top);

      /* ---------- hero ---------- */
      const hero = ui.el('section', { class: 'hero' });
      const heroCopy = ui.el('div', { class: 'hero__copy' });
      heroCopy.appendChild(ui.el('p', {
        class: 'eyebrow eyebrow--zh',
        text: 'Unit ' + unit.order + ' · ' + unit.subtitle
      }));
      const h1 = ui.el('h1', { class: 'hero__title' });
      h1.appendChild(document.createTextNode('和小熊一起，'));
      h1.appendChild(ui.el('br'));
      h1.appendChild(document.createTextNode('动一动、说一说。'));
      h1.appendChild(ui.el('span', {
        class: 'hero__title-en',
        lang: 'en',
        text: 'Move, play, say!'
      }));
      heroCopy.appendChild(h1);
      heroCopy.appendChild(ui.el('p', { class: 'hero__desc', text: unit.description }));

      const progress = ui.el('div', { class: 'hero__progress' });
      progress.appendChild(ui.el('div', { class: 'hero__progress-top' }, [
        ui.el('span', { text: summary.chapters.done + ' / ' + summary.chapters.totalChapters + ' 章完成' }),
        ui.el('strong', { text: summary.chapters.stars + ' / ' + summary.chapters.maxStars + ' ★' })
      ]));
      const bar = ui.el('div', {
        class: 'progress-bar',
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': String(summary.chapters.maxStars),
        'aria-valuenow': String(summary.chapters.stars),
        'aria-label': '本章程获得的星星'
      }, ui.el('span', {
        class: 'progress-bar__fill',
        style: {
          width: (summary.chapters.maxStars
            ? Math.min(100, (summary.chapters.stars / summary.chapters.maxStars) * 100)
            : 0) + '%'
        }
      }));
      progress.appendChild(bar);
      heroCopy.appendChild(progress);

      const cta = ui.el('div', { class: 'hero__cta' });
      let primaryLabel;
      let primaryIcon;
      let primaryTarget;
      if (nextChapter) {
        primaryLabel = (next.phase > 0 ? '继续 · ' : '开始 · ') + nextChapter.zhTitle;
        primaryIcon = 'play';
        primaryTarget = '#/unit/' + unit.id + '/chapter/' + nextChapter.id;
      } else if (!showtimeDone) {
        primaryLabel = '去 Showtime';
        primaryIcon = 'trophy';
        primaryTarget = '#/unit/' + unit.id + '/showtime';
      } else {
        primaryLabel = '去游乐场';
        primaryIcon = 'sparkle';
        primaryTarget = '#/unit/' + unit.id + '/playground';
      }
      cta.appendChild(ui.button({
        label: primaryLabel,
        iconName: primaryIcon,
        variant: 'primary',
        size: 'xl',
        testId: 'home-primary',
        onClick: () => {
          BEAR.audio.unlock();
          if (BEAR.sfx) BEAR.sfx.unlock();
          BEAR.router.go(primaryTarget);
        }
      }));
      cta.appendChild(ui.button({
        label: allChaptersDone ? '看贴纸册' : '自由玩',
        iconName: allChaptersDone ? 'star' : 'leaf',
        variant: 'ghost',
        onClick: () => BEAR.router.go(
          allChaptersDone ? '#/unit/' + unit.id + '/stickers' : '#/unit/' + unit.id + '/playground'
        )
      }));
      heroCopy.appendChild(cta);

      const heroArt = ui.el('div', { class: 'hero__art' });
      heroArt.appendChild(BEAR.gameKit.bearStage({ pose: 'wave', face: 'happy' }));
      heroArt.appendChild(ui.el('div', { class: 'hero__bubble' }, [
        ui.el('span', { class: 'en', lang: 'en', text: 'Hello!' }),
        ui.el('span', { text: ' 一起玩吧' })
      ]));
      hero.appendChild(heroCopy);
      hero.appendChild(heroArt);
      screen.appendChild(hero);

      /* ---------- chapter map ---------- */
      const mapSection = ui.el('section', { class: 'home-section' });
      const mapHead = ui.el('div', { class: 'section-head' }, [
        ui.el('h2', { text: '学习地图' }),
        ui.el('span', { class: 'muted', text: '每章 3 颗星 · 随时可以进入' })
      ]);
      mapSection.appendChild(mapHead);

      const map = ui.el('ol', { class: 'map', 'aria-label': '学习章节，共 ' + unit.chapters.length + ' 章' });
      unit.chapters.forEach((chapter, index) => {
        const row = rowById[chapter.id] || { done: false, stars: 0, phase: 0 };
        const isNext = !!(nextChapter && nextChapter.id === chapter.id);
        const stateClass = row.done ? ' map-node--done' : isNext ? ' map-node--next' : '';
        const li = ui.el('li', { class: 'map__row' });
        const btn = ui.el('button', {
          type: 'button',
          class: 'map-node' + stateClass,
          'data-chapter-id': chapter.id,
          'data-testid': 'chapter-' + chapter.id,
          'aria-label': '第 ' + chapter.order + ' 章 ' + chapter.zhTitle +
            (row.done ? '，已完成' : isNext ? '，下一章' : '') +
            '，' + (row.stars || 0) + ' 颗星'
        });
        const badge = ui.el('span', { class: 'map-node__badge', 'aria-hidden': 'true' });
        badge.appendChild(ui.icon((chapter.badge && chapter.badge.icon) || 'leaf'));
        if (row.done) {
          badge.appendChild(ui.el('span', { class: 'map-node__check' }, ui.icon('check')));
        }
        btn.appendChild(badge);

        const text = ui.el('span', { class: 'map-node__text' });
        text.appendChild(ui.el('span', { class: 'map-node__num', text: '第 ' + chapter.order + ' 章' }));
        text.appendChild(ui.el('span', { class: 'map-node__zh', text: chapter.zhTitle }));
        text.appendChild(ui.el('span', { class: 'map-node__en', lang: 'en', text: chapter.title }));
        const meta = ui.el('span', { class: 'map-node__meta' });
        meta.appendChild(ui.starRow(row.stars || 0, 3, { className: 'stars--sm' }));
        let statusText;
        if (row.done) statusText = '已完成';
        else if (isNext) statusText = row.phase > 0 ? '继续第 ' + (row.phase + 1) + ' 阶段' : '下一章';
        else statusText = '未开始';
        meta.appendChild(ui.el('span', { class: 'map-node__status', text: statusText }));
        text.appendChild(meta);
        btn.appendChild(text);
        btn.appendChild(ui.el('span', { class: 'map-node__arrow', 'aria-hidden': 'true' }, ui.icon('arrow-right')));
        btn.addEventListener('click', () => {
          BEAR.audio.unlock();
          BEAR.router.go('#/unit/' + unit.id + '/chapter/' + chapter.id);
        });
        li.appendChild(btn);
        if (index < unit.chapters.length - 1) {
          li.appendChild(ui.el('span', { class: 'map__link', 'aria-hidden': 'true' }));
        }
        map.appendChild(li);
      });
      mapSection.appendChild(map);

      const showtimeWrap = ui.el('div', { class: 'showtime-row' });
      const showtimeState = showtimeDone ? 'done' : allChaptersDone ? 'open' : 'locked';
      const showtimeBtn = ui.el('button', {
        type: 'button',
        class: 'showtime-node' + (showtimeState === 'locked' ? ' showtime-node--locked' : ''),
        'data-testid': 'showtime-node',
        'aria-label': 'Showtime 毕业演出' + (
          showtimeDone ? '，已完成，可以再看一次' :
            allChaptersDone ? '，可以开始' :
              '，完成全部章节后解锁'
        )
      });
      const crown = ui.el('span', { class: 'showtime-node__crown', 'aria-hidden': 'true' });
      crown.appendChild(ui.icon(showtimeState === 'locked' ? 'lock' : 'trophy'));
      showtimeBtn.appendChild(crown);
      const showtimeText = ui.el('span', { class: 'showtime-node__text' });
      showtimeText.appendChild(ui.el('span', { class: 'showtime-node__title', text: 'Showtime · 毕业演出' }));
      let showtimeSub;
      if (showtimeDone) showtimeSub = '已经完成 · 皇冠在贴纸册里';
      else if (allChaptersDone) showtimeSub = '全部章节完成，去领取皇冠';
      else showtimeSub = '完成全部 ' + unit.chapters.length + ' 章解锁 · 还差 ' + (unit.chapters.length - summary.chapters.done) + ' 章';
      showtimeText.appendChild(ui.el('span', { class: 'showtime-node__sub', text: showtimeSub }));
      showtimeBtn.appendChild(showtimeText);
      const showtimeCta = ui.el('span', { class: 'showtime-node__cta' });
      showtimeCta.appendChild(ui.el('span', {
        text: showtimeState === 'locked' ? '查看进度' : showtimeState === 'done' ? '再看一次' : '去演出'
      }));
      showtimeCta.appendChild(ui.icon('arrow-right'));
      showtimeBtn.appendChild(showtimeCta);
      showtimeBtn.addEventListener('click', () => {
        BEAR.router.go('#/unit/' + unit.id + '/showtime');
      });
      showtimeWrap.appendChild(showtimeBtn);
      mapSection.appendChild(showtimeWrap);
      screen.appendChild(mapSection);

      /* ---------- quick play ---------- */
      const playSection = ui.el('section', { class: 'home-section' });
      playSection.appendChild(ui.el('div', { class: 'section-head' }, [
        ui.el('h2', { text: '自由玩' }),
        ui.el('span', { class: 'muted', text: '不算进度，随便点' })
      ]));
      const quick = ui.el('div', { class: 'quick-grid' });

      const playgroundCard = ui.el('button', {
        type: 'button',
        class: 'quick-card',
        'data-testid': 'quick-playground',
        'aria-label': '打开游乐场，自由点播动作和感觉'
      });
      const playgroundArt = ui.el('span', { class: 'quick-card__art', 'aria-hidden': 'true' });
      playgroundArt.appendChild(BEAR.gameKit.bearMini({ pose: 'run', face: 'happy' }));
      playgroundCard.appendChild(playgroundArt);
      playgroundCard.appendChild(ui.el('span', { class: 'quick-card__text' }, [
        ui.el('span', { class: 'quick-card__title', text: '游乐场' }),
        ui.el('span', { class: 'quick-card__sub', text: summary.totalActions + ' 个动作 · 点一点就会说' })
      ]));
      playgroundCard.addEventListener('click', () => {
        BEAR.router.go('#/unit/' + unit.id + '/playground');
      });
      quick.appendChild(playgroundCard);

      const stickerCard = ui.el('button', {
        type: 'button',
        class: 'quick-card quick-card--stickers',
        'data-testid': 'quick-stickers',
        'aria-label': '打开贴纸册，已有 ' + summary.learnedActions + ' 枚动作贴纸和 ' + badgeCount + ' 枚徽章'
      });
      const stickerArt = ui.el('span', { class: 'quick-card__art', 'aria-hidden': 'true' });
      stickerArt.appendChild(ui.icon('star'));
      stickerCard.appendChild(stickerArt);
      stickerCard.appendChild(ui.el('span', { class: 'quick-card__text' }, [
        ui.el('span', { class: 'quick-card__title', text: '贴纸册' }),
        ui.el('span', {
          class: 'quick-card__sub',
          text: boardTitle(summary, badgeCount)
        })
      ]));
      stickerCard.addEventListener('click', () => {
        BEAR.router.go('#/unit/' + unit.id + '/stickers');
      });
      quick.appendChild(stickerCard);
      playSection.appendChild(quick);
      screen.appendChild(playSection);

      screen.appendChild(ui.el('footer', { class: 'home-foot' }, [
        ui.el('p', {
          text: '录音只留在本机，不会上传。学习进度保存在这台设备上。'
        })
      ]));

      host.innerHTML = '';
      host.appendChild(screen);

      function boardTitle(sum, badges) {
        const actionCount = sum.learnedActions;
        return '动作贴纸 ' + actionCount + ' / ' + sum.totalActions + ' · 徽章 ' + badges + ' / ' + sum.chapters.totalChapters;
      }

      return function cleanupHome() {};
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
