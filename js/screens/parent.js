/* Parent area: arithmetic gate, settings, progress, storage, reset. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const screens = BEAR.screens = BEAR.screens || {};

  screens.parent = {
    render(host, ctx) {
      const ui = BEAR.ui;
      const content = BEAR.content;
      const store = BEAR.store;
      const session = BEAR.session = BEAR.session || {};
      const unit = content.getUnit(ctx.unitId) || content.listUnits()[0];
      if (store && typeof store.flush === 'function') store.flush();

      ui.setTitle('家长设置');

      if (!session.parentVerified) {
        renderGate();
      } else {
        renderParent();
      }

      function frame(title, subtitle) {
        const screen = ui.el('section', { class: 'screen screen--parent' });
        const top = ui.topbar({
          title,
          subtitle,
          onBack: () => BEAR.router.go(unit ? '#/unit/' + unit.id : '#/'),
          right: [ui.button({
            iconName: 'home',
            label: '地图',
            variant: 'ghost',
            size: 'sm',
            onClick: () => BEAR.router.go(unit ? '#/unit/' + unit.id : '#/')
          })]
        });
        screen.appendChild(top);
        const wrap = ui.el('div', { class: 'parent-wrap' });
        screen.appendChild(wrap);
        host.innerHTML = '';
        host.appendChild(screen);
        return wrap;
      }

      function renderGate() {
        const wrap = frame('家长入口', '先做一道小算术');
        const gate = ui.el('div', { class: 'gate' });
        gate.appendChild(ui.el('div', { class: 'gate__icon', 'aria-hidden': 'true' }, ui.icon('lock')));
        gate.appendChild(ui.el('h2', { class: 'gate__title', text: '这里是家长区' }));
        gate.appendChild(ui.el('p', {
          class: 'gate__text',
          text: '为了避免小朋友误触，请先回答一道小题目。每打开一次网站，只需要验证一次。'
        }));
        const a = 2 + Math.floor(Math.random() * 8);
        const b = 2 + Math.floor(Math.random() * 8);
        const answer = a + b;
        gate.appendChild(ui.el('p', {
          class: 'gate__question',
          'aria-label': a + ' 加 ' + b + ' 等于多少',
          text: a + ' + ' + b + ' = ?'
        }));
        const form = ui.el('form', { class: 'gate__form', novalidate: true });
        const input = ui.el('input', {
          class: 'gate__input',
          type: 'text',
          inputmode: 'numeric',
          pattern: '[0-9]*',
          autocomplete: 'off',
          maxlength: '3',
          'aria-label': '请输入答案',
          placeholder: '?'
        });
        const submit = ui.button({
          label: '进入',
          iconName: 'arrow-right',
          variant: 'primary',
          type: 'submit'
        });
        form.appendChild(input);
        form.appendChild(submit);
        gate.appendChild(form);
        const error = ui.el('p', { class: 'gate__error', 'aria-live': 'assertive' });
        gate.appendChild(error);
        gate.appendChild(ui.el('div', { class: 'parent-actions' }, ui.button({
          label: '返回学习地图',
          iconName: 'arrow-left',
          variant: 'ghost',
          onClick: () => BEAR.router.go(unit ? '#/unit/' + unit.id : '#/')
        })));
        wrap.appendChild(gate);
        root.setTimeout(() => {
          try { input.focus(); } catch (err) {}
        }, 60);

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const value = Number(String(input.value).trim());
          if (value === answer) {
            session.parentVerified = true;
            renderParent();
            return;
          }
          error.textContent = '答案不对，再试一次。';
          input.value = '';
          input.focus();
        });
        input.addEventListener('input', () => { error.textContent = ''; });
      }

      function renderParent() {
        if (!unit) {
          const wrap = frame('家长设置', '');
          wrap.appendChild(ui.emptyState({
            title: '还没有课程数据',
            message: '请先打开一个单元。'
          }));
          return;
        }
        const summary = store.unitSummary(unit);
        const settings = store.settings();
        const wrap = frame('家长设置', '只在这台设备上生效');
        const hero = ui.el('div', { class: 'parent-hero' });
        hero.appendChild(ui.el('p', { class: 'eyebrow eyebrow--zh', text: 'Parent Zone' }));
        hero.appendChild(ui.el('h2', { text: '给家长的控制台' }));
        hero.appendChild(ui.el('p', {
          text: '这里的按钮都比较大，内容也在本机。孩子学习时不需要登录，也不会弹出广告。'
        }));
        wrap.appendChild(hero);

        /* ---------- sound & motion ---------- */
        const soundSec = section('声音与动画', '所有设置会立刻生效，并留在这台设备上。');
        soundSec.appendChild(ui.switchRow({
          label: '慢速播放',
          hint: '把英文示范放慢到 0.75 倍，音高不变。',
          checked: !!settings.slow,
          onChange: (checked) => {
            store.setSetting('slow', checked);
            BEAR.audio.setRate(checked ? 0.75 : 1);
            ui.toast(checked ? '已开启慢速播放' : '已恢复常速');
          }
        }));
        soundSec.appendChild(ui.switchRow({
          label: '静音',
          hint: '保留点击和动画，只关闭声音。',
          checked: !!settings.muted,
          onChange: (checked) => {
            store.setSetting('muted', checked);
            BEAR.audio.setMuted(checked);
            ui.toast(checked ? '已静音' : '声音已打开');
          }
        }));
        soundSec.appendChild(ui.switchRow({
          label: '操作音效',
          hint: '点按、答对和星星的轻提示音。',
          checked: !!settings.sfx,
          onChange: (checked) => {
            store.setSetting('sfx', checked);
            BEAR.sfx.setEnabled(checked);
          }
        }));
        soundSec.appendChild(ui.switchRow({
          label: '减弱动画',
          hint: '减少纸屑、弹跳和循环动画，适合容易分心的孩子。',
          checked: !!settings.reducedMotion,
          onChange: (checked) => {
            store.setSetting('reducedMotion', checked);
            if (BEAR.app && BEAR.app.applySettings) BEAR.app.applySettings();
          }
        }));
        const themeLine = ui.el('div', { class: 'setting-line setting-line--stack' });
        themeLine.appendChild(ui.el('span', { class: 'setting-line__label', text: '外观' }));
        const themeOptions = ui.el('div', { class: 'theme-options', role: 'group', 'aria-label': '外观主题' });
        const themeChips = [];
        [['auto', '跟随系统'], ['light', '浅色'], ['dark', '深色']].forEach(([value, label]) => {
          const chip = ui.chip({
            label,
            active: settings.theme === value,
            onClick: () => {
              store.setSetting('theme', value);
              themeChips.forEach((node) => {
                const on = node.dataset.themeValue === value;
                node.classList.toggle('chip--active', on);
                node.setAttribute('aria-pressed', on ? 'true' : 'false');
              });
              if (BEAR.app && BEAR.app.applySettings) BEAR.app.applySettings();
            }
          });
          chip.dataset.themeValue = value;
          themeChips.push(chip);
          themeOptions.appendChild(chip);
        });
        themeLine.appendChild(themeOptions);
        soundSec.appendChild(themeLine);
        wrap.appendChild(soundSec);

        /* ---------- microphone ---------- */
        const micSec = section('录音与隐私', '跟读录音只用于当场回放，不做评分。');
        const supported = BEAR.recorder && BEAR.recorder.supported();
        if (settings.micConsent) {
          micSec.appendChild(ui.switchRow({
            label: '允许录音练习',
            hint: '关闭后，下次进入跟读练习会重新询问。已经录下的内容不会被保存。',
            checked: true,
            onChange: (checked) => {
              store.setSetting('micConsent', checked);
              ui.toast(checked ? '已允许录音练习' : '已关闭；下次会重新询问');
            }
          }));
        } else {
          micSec.appendChild(ui.switchRow({
            label: '允许录音练习',
            hint: '默认关闭。开启后，跟读页会直接请求麦克风。',
            checked: false,
            onChange: (checked) => {
              store.setSetting('micConsent', checked);
              if (checked) {
                ui.toast('已允许；第一次录音时浏览器仍会询问麦克风权限', { duration: 3600 });
              }
            }
          }));
        }
        const privacy = ui.el('ul', { class: 'privacy-list' });
        [
          '录音只保存在这台设备的内存里，不会上传到服务器。',
          '不做自动录音；离开跟读页面就释放麦克风并清除录音。',
          '不做语音识别，也不给发音打分；只供孩子听自己的声音。',
          '学习进度、贴纸和设置保存在浏览器本机。'
        ].forEach((text) => privacy.appendChild(ui.el('li', { text })));
        micSec.appendChild(privacy);
        if (!supported) {
          micSec.appendChild(ui.el('div', { class: 'notice' }, [
            ui.icon('info'),
            ui.el('span', {
              text: '当前页面不能使用麦克风。录音需要 https 或 localhost；用 file:// 直接打开时可以只听示范。'
            })
          ]));
        }
        wrap.appendChild(micSec);

        /* ---------- progress ---------- */
        const progressSec = section('学习进度', '进度只记录完成情况，不按正确率扣分。');
        const statTable = ui.el('div', { class: 'stat-table' });
        summary.chapters.rows.forEach((row) => {
          const chapter = unit.chapters.find((c) => c.id === row.id);
          if (!chapter) return;
          const line = ui.el('div', { class: 'stat-row' });
          const name = ui.el('span', { class: 'stat-row__name' });
          const dotClass = row.done ? 'status-dot status-dot--done' :
            (row.phase > 0 ? 'status-dot status-dot--next' : 'status-dot');
          name.appendChild(ui.el('span', { class: dotClass, 'aria-hidden': 'true' }));
          name.appendChild(ui.el('span', { text: chapter.zhTitle }));
          line.appendChild(name);
          const value = ui.el('span', { class: 'stat-row__value' });
          value.appendChild(ui.starRow(row.stars || 0, 3, { className: 'stars--sm' }));
          value.appendChild(ui.el('span', {
            text: row.done ? '已完成' : row.phase > 0 ? '进行中' : '未开始'
          }));
          line.appendChild(value);
          statTable.appendChild(line);
        });
        const showLine = ui.el('div', { class: 'stat-row' });
        const showName = ui.el('span', { class: 'stat-row__name' });
        showName.appendChild(ui.el('span', {
          class: 'status-dot' + (summary.showtime.done ? ' status-dot--done' : ''),
          'aria-hidden': 'true'
        }));
        showName.appendChild(ui.el('span', { text: 'Showtime · 毕业演出' }));
        showLine.appendChild(showName);
        showLine.appendChild(ui.el('span', {
          class: 'stat-row__value',
          text: summary.showtime.crown ? '皇冠已获得' : summary.showtime.done ? '已完成' : '未完成'
        }));
        statTable.appendChild(showLine);
        progressSec.appendChild(statTable);
        progressSec.appendChild(ui.el('div', { class: 'parent-actions' }, [
          ui.button({
            label: '查看贴纸册',
            iconName: 'star',
            variant: 'soft',
            onClick: () => BEAR.router.go('#/unit/' + unit.id + '/stickers')
          }),
          ui.button({
            label: '回到学习地图',
            iconName: 'home',
            variant: 'ghost',
            onClick: () => BEAR.router.go('#/unit/' + unit.id)
          })
        ]));
        wrap.appendChild(progressSec);

        /* ---------- app & storage ---------- */
        const appSec = section('应用与存储', '安装到主屏幕后，断网也能继续学习。');
        const storageLine = ui.el('div', { class: 'stat-row' });
        storageLine.appendChild(ui.el('span', { class: 'stat-row__name', text: '学习记录' }));
        storageLine.appendChild(ui.el('span', {
          class: 'parent-status' + (store.persistent ? '' : ' parent-status--off'),
          text: store.persistent ? '保存在本机浏览器' : '当前浏览器无法保存进度'
        }));
        appSec.appendChild(storageLine);
        const savedLine = ui.el('div', { class: 'stat-row' });
        savedLine.appendChild(ui.el('span', { class: 'stat-row__name', text: '上次保存' }));
        savedLine.appendChild(ui.el('span', {
          class: 'stat-row__value',
          text: store.state.updatedAt ? formatTime(store.state.updatedAt) : '还没有记录'
        }));
        appSec.appendChild(savedLine);

        const standalone = isStandalone();
        const installable = !!(BEAR.app && BEAR.app.canInstall && BEAR.app.canInstall());
        const appActions = ui.el('div', { class: 'parent-actions' });
        if (standalone) {
          appSec.appendChild(ui.el('p', { class: 'parent-sec__note', text: '当前已经作为应用打开。' }));
        } else if (installable) {
          appActions.appendChild(ui.button({
            label: '安装到主屏幕',
            iconName: 'sparkle',
            variant: 'primary',
            onClick: async () => {
              const installed = BEAR.app && BEAR.app.install ? await BEAR.app.install() : false;
              if (installed) {
                ui.toast('安装请求已发出，按浏览器提示完成即可');
                root.setTimeout(renderParent, 800);
              } else {
                ui.toast('浏览器没有弹出安装提示，可以从浏览器菜单里选择“安装应用”', { duration: 4000 });
              }
            }
          }));
        } else {
          appSec.appendChild(ui.el('p', {
            class: 'parent-sec__note',
            text: isIOS()
              ? '在 iPhone / iPad 上，用 Safari 打开后点“分享” → “添加到主屏幕”。'
              : '在浏览器菜单里选择“安装应用 / 添加到主屏幕”。离线学习需要先通过 https 打开一次。'
          }));
        }

        const updateReady = !!(BEAR.app && BEAR.app.updateReady && BEAR.app.updateReady());
        appActions.appendChild(ui.button({
          label: updateReady ? '有新版本，更新并重启' : '检查更新',
          iconName: 'refresh',
          variant: updateReady ? 'primary' : 'secondary',
          onClick: async () => {
            if (!BEAR.app) return;
            if (updateReady) {
              const ok = await ui.confirm({
                title: '更新并重启',
                message: '会刷新页面以使用新版本。学习进度已经保存在本机，不会丢失。',
                confirmText: '更新并重启',
                cancelText: '稍后',
                iconName: 'refresh'
              });
              if (!ok) return;
              const applied = BEAR.app.applyUpdate ? await BEAR.app.applyUpdate() : false;
              if (!applied) ui.toast('更新还没准备好，请稍后再试。');
              return;
            }
            if (!BEAR.app.checkUpdate) {
              ui.toast('离线更新在正式网站上可用。');
              return;
            }
            const result = await BEAR.app.checkUpdate();
            if (result === 'ready') {
              ui.toast('有新版本了，正在准备更新。', { iconName: 'refresh' });
              renderParent();
            } else if (result === 'unsupported') {
              ui.toast('当前打开方式不支持离线更新；用 https 访问网站后可用。', { duration: 3600 });
            } else {
              ui.toast('已经是最新版本。');
            }
          }
        }));
        appSec.appendChild(appActions);
        wrap.appendChild(appSec);

        /* ---------- reset ---------- */
        const resetSec = section('重置数据', '', true);
        resetSec.appendChild(ui.el('p', {
          class: 'parent-sec__note',
          text: '重置无法撤销。徽章、贴纸、皇冠和章节星星都会被清空。'
        }));
        const resetActions = ui.el('div', { class: 'parent-actions' });
        resetActions.appendChild(ui.button({
          label: '重置学习进度',
          iconName: 'refresh',
          variant: 'secondary',
          onClick: async () => {
            const ok = await ui.confirm({
              title: '重置学习进度？',
              message: '星星、徽章、贴纸和皇冠都会清空，声音、动画和录音许可等设置会保留。',
              confirmText: '重置进度',
              cancelText: '取消',
              danger: true,
              iconName: 'trash'
            });
            if (!ok) return;
            store.reset(true);
            BEAR.audio.stopAll();
            renderParent();
            ui.toast('学习进度已重置');
          }
        }));
        resetActions.appendChild(ui.button({
          label: '清除全部数据',
          iconName: 'trash',
          variant: 'danger',
          onClick: async () => {
            const ok = await ui.confirm({
              title: '清除全部数据？',
              message: '进度、贴纸、徽章和所有设置都会被清除，包括静音、慢速和录音许可。此操作无法撤销。',
              confirmText: '全部清除',
              cancelText: '取消',
              danger: true,
              iconName: 'trash'
            });
            if (!ok) return;
            store.reset(false);
            if (BEAR.sfx) { BEAR.sfx.setEnabled(true); BEAR.sfx.play('close'); }
            BEAR.audio.setMuted(false);
            BEAR.audio.setRate(1);
            if (BEAR.app && BEAR.app.applySettings) BEAR.app.applySettings();
            renderParent();
            ui.toast('全部数据已清除');
          }
        }));
        resetSec.appendChild(resetActions);
        wrap.appendChild(resetSec);

        /* ---------- about ---------- */
        const aboutSec = section('关于', '');
        const about = ui.el('div', { class: 'about-block' });
        about.appendChild(ui.el('p', {
          text: '小熊英语游戏 · Unit 1「动作与表达」· 版本 ' + (BEAR.app && BEAR.app.version ? BEAR.app.version : '1.0.0')
        }));
        about.appendChild(ui.el('p', {
          text: '英文录音沿用初版素材（62 段），没有使用外部语音合成；本页面不会上传录音或学习数据。'
        }));
        about.appendChild(ui.el('p', {
          text: '英文字体 Fredoka 以 SIL Open Font License 授权，已随站点本地打包。图标和小熊插画均为本站内联 SVG。'
        }));
        about.appendChild(ui.el('p', {
          text: store.persistent
            ? '学习记录保存在浏览器 localStorage。清理站点数据会把进度一起清除。'
            : '当前浏览器禁用了本地存储，进度只在本次打开期间有效。'
        }));
        aboutSec.appendChild(about);
        wrap.appendChild(aboutSec);

        wrap.appendChild(ui.el('p', {
          class: 'home-foot',
          text: '建议家长陪同使用。每次学习 3–6 分钟，跟着孩子的节奏来。'
        }));

        const heading = wrap.querySelector('h2');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          try { heading.focus({ preventScroll: true }); } catch (err) {}
        }
      }

      function section(title, note, danger) {
        const node = ui.el('section', { class: 'parent-sec' + (danger ? ' danger-zone' : '') });
        const head = ui.el('div', { class: 'parent-sec__head' });
        head.appendChild(ui.el('h2', { class: 'parent-sec__title', text: title }));
        node.appendChild(head);
        if (note) node.appendChild(ui.el('p', { class: 'parent-sec__note', text: note }));
        return node;
      }

      function formatTime(ms) {
        try {
          return new Intl.DateTimeFormat('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date(ms));
        } catch (err) {
          return new Date(ms).toLocaleString();
        }
      }

      function isStandalone() {
        try {
          return !!(root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) ||
            !!(root.navigator && root.navigator.standalone);
        } catch (err) {
          return false;
        }
      }

      function isIOS() {
        return /iPad|iPhone|iPod/.test(root.navigator.userAgent) && !root.MSStream;
      }

      return function cleanupParent() {};
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
