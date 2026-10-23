/* Sticker book: chapter badges, action stickers and the Showtime crown. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const screens = BEAR.screens = BEAR.screens || {};

  screens.stickers = {
    render(host, ctx) {
      const ui = BEAR.ui;
      const content = BEAR.content;
      const store = BEAR.store;
      const unit = content.getUnit(ctx.unitId) || content.listUnits()[0];
      if (!unit) {
        host.innerHTML = '';
        host.appendChild(ui.emptyState({
          title: '还没有贴纸册',
          message: '先完成一章学习吧。',
          action: ui.button({
            label: '回到地图',
            variant: 'primary',
            onClick: () => BEAR.router.go('#/')
          })
        }));
        return function cleanupEmpty() {};
      }

      ui.setTitle('贴纸册');
      const summary = store.unitSummary(unit);
      const rowById = Object.create(null);
      summary.chapters.rows.forEach((row) => { rowById[row.id] = row; });
      const badgeCount = summary.chapters.rows.filter((r) => r.done).length;
      const allChaptersDone = summary.chapters.done === summary.chapters.totalChapters;
      const actionItems = content.getItems(unit, unit.playground.actions || Object.keys(unit.items).filter((id) => unit.items[id].kind === 'action'));

      const screen = ui.el('section', { class: 'screen screen--stickers' });
      const top = ui.topbar({
        title: '贴纸册',
        subtitle: '听过的、做过的，都收在这里',
        onBack: () => BEAR.router.go('#/unit/' + unit.id),
        right: [ui.button({
          iconName: 'home',
          label: '地图',
          variant: 'ghost',
          size: 'sm',
          onClick: () => BEAR.router.go('#/unit/' + unit.id)
        })]
      });
      screen.appendChild(top);

      const hero = ui.el('div', { class: 'reward-hero' });
      const heroCopy = ui.el('div', { class: 'reward-hero__copy' });
      heroCopy.appendChild(ui.el('p', { class: 'eyebrow eyebrow--zh', text: '我的收藏' }));
      heroCopy.appendChild(ui.el('h2', { class: 'reward-hero__title', text: '每一点进步，都贴在这里' }));
      heroCopy.appendChild(ui.el('p', {
        class: 'reward-hero__sub',
        text: '动作贴纸 ' + summary.learnedActions + ' / ' + summary.totalActions +
          ' · 章节徽章 ' + badgeCount + ' / ' + summary.chapters.totalChapters +
          (summary.showtime.crown ? ' · 皇冠 1 / 1' : '')
      }));
      const heroArt = ui.el('div', { class: 'reward-hero__art', 'aria-hidden': 'true' });
      heroArt.appendChild(BEAR.gameKit.bearMini({ pose: summary.showtime.crown ? 'jump' : 'wave', face: 'happy' }));
      if (summary.showtime.crown) heroArt.appendChild(ui.icon('trophy'));
      hero.appendChild(heroCopy);
      hero.appendChild(heroArt);
      screen.appendChild(hero);

      /* Badges */
      const badgeSection = ui.el('section', { class: 'reward-section' });
      badgeSection.appendChild(ui.el('div', { class: 'reward-section__head' }, [
        ui.el('h2', { text: '章节徽章' }),
        ui.el('span', { class: 'reward-section__count', text: badgeCount + ' / ' + unit.chapters.length })
      ]));
      const badgeGrid = ui.el('div', { class: 'badge-grid' });
      unit.chapters.forEach((chapter) => {
        const row = rowById[chapter.id] || { done: false };
        const label = (chapter.badge && chapter.badge.label) || chapter.zhTitle;
        const locked = !row.done;
        const card = ui.el(locked ? 'div' : 'button', {
          class: 'badge-card' + (locked ? ' badge-card--locked' : ''),
          'aria-label': '第 ' + chapter.order + ' 章 ' + chapter.zhTitle + '：' + (locked ? '未获得' : '已获得'),
          ...(locked ? {} : { type: 'button' })
        });
        const medal = ui.el('span', { class: 'badge-card__medal', 'aria-hidden': 'true' });
        medal.appendChild(ui.icon((chapter.badge && chapter.badge.icon) || 'star'));
        if (locked) {
          medal.appendChild(ui.el('span', { class: 'badge-card__lock' }, ui.icon('lock')));
        }
        card.appendChild(medal);
        card.appendChild(ui.el('span', { class: 'badge-card__label', lang: 'en', text: label }));
        if (!locked) {
          card.addEventListener('click', () => {
            BEAR.sfx.play('star');
            ui.toast('第 ' + chapter.order + ' 章 · ' + chapter.zhTitle, { iconName: 'star' });
          });
        }
        badgeGrid.appendChild(card);
      });
      badgeSection.appendChild(badgeGrid);
      screen.appendChild(badgeSection);

      /* Action stickers */
      const stickerSection = ui.el('section', { class: 'reward-section' });
      stickerSection.appendChild(ui.el('div', { class: 'reward-section__head' }, [
        ui.el('h2', { text: '动作贴纸' }),
        ui.el('span', {
          class: 'reward-section__count',
          text: summary.learnedActions + ' / ' + summary.totalActions
        })
      ]));
      const stickerGrid = ui.el('div', { class: 'sticker-grid' });
      actionItems.forEach((item) => {
        const owned = store.hasSticker(unit.id, item.id);
        const btn = ui.el('button', {
          type: 'button',
          class: 'sticker' + (owned ? '' : ' sticker--locked'),
          'data-item-id': item.id,
          'aria-label': item.en + '，' + item.zh + (owned ? '，已获得' : '，未获得'),
          disabled: !owned
        });
        const art = ui.el('span', { class: 'sticker__art' });
        art.appendChild(BEAR.gameKit.bearMini({ pose: item.pose, face: item.face }));
        btn.appendChild(art);
        btn.appendChild(ui.el('span', { class: 'sticker__en', lang: 'en', text: item.en }));
        btn.appendChild(ui.el('span', { class: 'sticker__zh', text: item.zh }));
        if (owned) {
          btn.addEventListener('click', () => {
            BEAR.audio.unlock();
            BEAR.audio.play(item.audio.word);
            btn.classList.remove('sticker--hop');
            // restart the one-shot hop
            void btn.offsetWidth;
            btn.classList.add('sticker--hop');
            root.setTimeout(() => btn.classList.remove('sticker--hop'), 650);
            ui.announce(item.en + '，' + item.zh);
          });
        }
        stickerGrid.appendChild(btn);
      });
      stickerSection.appendChild(stickerGrid);
      screen.appendChild(stickerSection);

      /* Crown */
      const crownSection = ui.el('section', { class: 'reward-section' });
      crownSection.appendChild(ui.el('div', { class: 'reward-section__head' }, [
        ui.el('h2', { text: 'Showtime 皇冠' }),
        ui.el('span', { class: 'reward-section__count', text: summary.showtime.crown ? '1 / 1' : '0 / 1' })
      ]));
      const crown = ui.el('div', {
        class: 'crown-card ' + (
          summary.showtime.crown ? 'crown-card--on' :
            allChaptersDone ? 'crown-card--ready' : 'crown-card--off'
        )
      });
      const crownArt = ui.el('div', { class: 'crown-card__art', 'aria-hidden': 'true' });
      crownArt.appendChild(ui.icon(summary.showtime.crown || allChaptersDone ? 'trophy' : 'lock'));
      crown.appendChild(crownArt);
      const crownCopy = ui.el('div', { class: 'crown-card__copy' });
      crownCopy.appendChild(ui.el('h3', {
        class: 'crown-card__title',
        text: summary.showtime.crown ? '皇冠已经戴在小熊头上' :
          allChaptersDone ? '只差一场演出' : '皇冠还在等你'
      }));
      crownCopy.appendChild(ui.el('p', {
        class: 'crown-card__sub',
        text: summary.showtime.crown
          ? '你完成了毕业演出，所有动作和句子都难不倒你。'
          : allChaptersDone
            ? '全部章节都完成了，去 Showtime 领皇冠吧。'
            : '完成全部 ' + unit.chapters.length + ' 章，再完成 Showtime，就能拿到皇冠。'
      }));
      if (!summary.showtime.crown) {
        crownCopy.appendChild(ui.button({
          label: allChaptersDone ? '去 Showtime' : '回到地图继续',
          iconName: allChaptersDone ? 'trophy' : 'arrow-left',
          variant: 'soft',
          size: 'sm',
          onClick: () => BEAR.router.go(
            allChaptersDone ? '#/unit/' + unit.id + '/showtime' : '#/unit/' + unit.id
          )
        }));
      } else {
        crownCopy.appendChild(ui.button({
          label: '再看一次演出',
          iconName: 'refresh',
          variant: 'soft',
          size: 'sm',
          onClick: () => BEAR.router.go('#/unit/' + unit.id + '/showtime')
        }));
      }
      crown.appendChild(crownCopy);
      crownSection.appendChild(crown);
      screen.appendChild(crownSection);

      screen.appendChild(ui.el('p', {
        class: 'home-foot',
        text: '贴纸和徽章会保存在这台设备上。点击已获得的动作贴纸，可以再听一次。'
      }));

      host.innerHTML = '';
      host.appendChild(screen);

      return function cleanupStickers() {
        BEAR.audio.stopAll();
      };
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
