/* Say It: listen to the model, record locally, play it back, or just move on. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const games = BEAR.games = BEAR.games || {};

  games.sayIt = function mountSayIt(host, opts) {
    const ui = BEAR.ui;
    const kit = BEAR.gameKit;
    const unit = opts.unit;
    const activity = opts.activity;
    const session = kit.makeSession();
    const canRecord = activity.allowRecord !== false && BEAR.recorder && BEAR.recorder.supported();
    let finished = false;
    let rec = null;
    let samplePlaying = false;

    const sampleKey = activity.audioKey;

    host.innerHTML = '';
    const game = ui.el('div', { class: 'game game--say' });
    const say = ui.el('div', { class: 'say' });
    game.appendChild(say);

    const stage = ui.el('div', { class: 'say__stage' });
    const itemKey = (sampleKey || '').match(/^(?:can|feel|im)_(.+)$/);
    const sampleItem = itemKey && unit.items[itemKey[1]];
    stage.appendChild(kit.bearStage({ pose: kit.activityPose(activity, unit), face: sampleItem ? sampleItem.face : 'happy' }));
    say.appendChild(stage);
    say.appendChild(ui.el('p', { class: 'say__kicker', text: activity.prompt || '轮到你了' }));
    say.appendChild(ui.el('p', { class: 'say__en', lang: 'en', text: activity.en }));
    say.appendChild(ui.el('p', { class: 'say__zh', text: activity.zh }));

    const sampleRow = ui.el('div', { class: 'say__sample' });
    const sampleBtn = ui.button({
      label: '听示范',
      iconName: 'speaker',
      variant: 'secondary',
      className: 'kid-audio',
      onClick: () => playSample()
    });
    sampleRow.appendChild(sampleBtn);
    say.appendChild(sampleRow);

    const recorderBox = ui.el('div', { class: 'recorder' });
    const recMain = ui.el('div', { class: 'recorder__main' });
    const recordOrb = ui.el('button', {
      type: 'button',
      class: 'record-orb',
      'aria-label': '开始录音'
    }, ui.icon('mic'));
    const timer = ui.el('span', {
      class: 'recorder__timer',
      'aria-hidden': 'true',
      text: '0.0s'
    });
    recMain.appendChild(recordOrb);
    recMain.appendChild(timer);
    recorderBox.appendChild(recMain);

    const wave = ui.el('div', { class: 'recorder__wave', 'aria-hidden': 'true' });
    for (let i = 0; i < 9; i += 1) wave.appendChild(ui.el('span'));
    recorderBox.appendChild(wave);

    const recStatus = ui.el('p', { class: 'recorder__status', 'aria-live': 'polite' });
    recorderBox.appendChild(recStatus);

    const recActions = ui.el('div', { class: 'recorder__actions' });
    const playBtn = ui.button({
      label: '回放',
      iconName: 'play',
      variant: 'soft',
      disabled: true,
      onClick: () => {
        if (!rec) return;
        if (rec.state === 'playing') rec.play();
        else rec.play();
      }
    });
    playBtn.hidden = true;
    const redoBtn = ui.button({
      label: '重录',
      iconName: 'refresh',
      variant: 'ghost',
      onClick: () => {
        if (!rec) return;
        rec.reset();
        beginRecord();
      }
    });
    redoBtn.hidden = true;
    const deleteBtn = ui.button({
      label: '删除',
      iconName: 'trash',
      variant: 'ghost',
      onClick: () => {
        if (!rec) return;
        rec.reset();
        timer.textContent = '0.0s';
        kit.setFeedback(recStatus, '录音已经删掉了，可以再录一次。', 'soft');
      }
    });
    deleteBtn.hidden = true;
    recActions.appendChild(playBtn);
    recActions.appendChild(redoBtn);
    recActions.appendChild(deleteBtn);
    recorderBox.appendChild(recActions);
    if (canRecord) {
      recorderBox.hidden = false;
      say.appendChild(recorderBox);
    } else {
      recorderBox.hidden = true;
    }

    const micNote = ui.el('p', { class: 'mic-note' }, [
      ui.icon('info'),
      ui.el('span', {
        text: canRecord
          ? '录音只在这台设备的内存里，不会上传；离开本页就清除。'
          : '这个页面不能录音（需要 https 或 localhost）。可以只听示范，再继续。'
      })
    ]);
    say.appendChild(micNote);

    if (!canRecord) {
      say.appendChild(ui.el('div', { class: 'notice' }, [
        ui.icon('mic'),
        ui.el('span', {
          text: '麦克风不可用。用手机或电脑的浏览器打开，并允许麦克风，就可以录音。'
        })
      ]));
    }

    if (activity.note) {
      say.appendChild(ui.el('p', {
        class: 'game__hint game__hint--soft',
        text: activity.note
      }));
    }

    const actions = ui.el('div', { class: 'say__actions' });
    const doneBtn = ui.button({
      label: '听过了，继续',
      iconName: 'arrow-right',
      variant: 'primary',
      size: 'xl',
      className: 'kid-action',
      onClick: () => finish()
    });
    actions.appendChild(doneBtn);
    say.appendChild(actions);
    host.appendChild(game);

    function updateDoneLabel() {
      const has = !!(rec && rec.hasRecording);
      doneBtn.lastChild.textContent = has ? '说过了，继续' : '听过了，继续';
      doneBtn.setAttribute('aria-label', doneBtn.lastChild.textContent);
    }

    function setRecordOrb(mode) {
      recordOrb.classList.toggle('record-orb--recording', mode === 'recording');
      recordOrb.replaceChildren(ui.icon(mode === 'recording' ? 'stop' : 'mic'));
      recorderBox.classList.toggle('recorder--recording', mode === 'recording');
      recordOrb.setAttribute('aria-label', mode === 'recording' ? '结束录音' : '开始录音');
    }

    function playSample() {
      if (!sampleKey || !session.alive || samplePlaying) return;
      samplePlaying = true;
      sampleBtn.classList.add('sound-orb--playing');
      sampleBtn.setAttribute('aria-busy', 'true');
      BEAR.audio.play(sampleKey).then(() => {
        samplePlaying = false;
        sampleBtn.classList.remove('sound-orb--playing');
        sampleBtn.removeAttribute('aria-busy');
      });
    }

    function status(text, tone) {
      recStatus.textContent = text || '';
      recStatus.className = 'recorder__status game__hint' + (tone ? ' game__hint--' + tone : '');
    }

    // When a completed recording pushes the continue button just past the
    // bottom edge (short landscape screens), nudge the page down so the
    // child can see the next step without hunting for it.
    function revealDoneButton() {
      session.timeout(() => {
        if (!session.alive || !doneBtn.isConnected) return;
        const rect = doneBtn.getBoundingClientRect();
        const overflow = rect.bottom - window.innerHeight;
        if (overflow <= 0 || rect.top >= window.innerHeight) return;
        const reduce = BEAR.store.settings().reducedMotion ||
          (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        window.scrollBy({
          top: overflow + 10,
          behavior: reduce ? 'auto' : 'smooth'
        });
      }, 80);
    }

    function applyRecorderState(state, detail) {
      detail = detail || {};
      if (state === 'requesting') {
        setRecordOrb('idle');
        status('正在准备麦克风…');
        recordOrb.disabled = true;
      } else if (state === 'recording') {
        recordOrb.disabled = false;
        setRecordOrb('recording');
        status('正在录音，最多 6 秒…');
        timer.textContent = '0.0s';
        playBtn.hidden = true;
        redoBtn.hidden = true;
        deleteBtn.hidden = true;
      } else if (state === 'stopping') {
        recordOrb.disabled = true;
        setRecordOrb('idle');
        status('正在保存录音…');
      } else if (state === 'ready') {
        recordOrb.disabled = false;
        setRecordOrb('idle');
        playBtn.hidden = false;
        playBtn.disabled = false;
        redoBtn.hidden = false;
        deleteBtn.hidden = false;
        setPlayLabel(false);
        status('录好了，点“回放”听听看。', 'good');
        updateDoneLabel();
        revealDoneButton();
      } else if (state === 'playing') {
        recordOrb.disabled = true;
        setPlayLabel(true);
        status('正在回放你的声音…');
      } else if (state === 'idle') {
        recordOrb.disabled = false;
        setRecordOrb('idle');
        playBtn.hidden = !(rec && rec.hasRecording);
        playBtn.disabled = !(rec && rec.hasRecording);
        redoBtn.hidden = !(rec && rec.hasRecording);
        deleteBtn.hidden = !(rec && rec.hasRecording);
        setPlayLabel(false);
        if (!(rec && rec.hasRecording)) timer.textContent = '0.0s';
        status(canRecord ? '点一下麦克风，开始录音（最多 6 秒）。' : '可以只听示范，再继续。');
        updateDoneLabel();
      } else if (state === 'error') {
        recordOrb.disabled = false;
        setRecordOrb('idle');
        playBtn.hidden = true;
        redoBtn.hidden = true;
        deleteBtn.hidden = true;
        const reason = detail.reason;
        if (reason === 'NotAllowedError' || reason === 'PermissionDeniedError' || reason === 'permission') {
          status('没有拿到麦克风权限。可以在浏览器里允许，或先不录音继续。', 'soft');
        } else if (reason === 'NotFoundError') {
          status('没有找到麦克风。先听示范，再继续吧。', 'soft');
        } else if (reason === 'playback') {
          status('回放失败了，可以重录一次。', 'soft');
        } else if (reason === 'empty') {
          status('没有录到声音，再试一次吧。', 'soft');
        } else {
          status('录音没有成功，再试一次，或者先不录音继续。', 'soft');
        }
        updateDoneLabel();
      } else if (state === 'unsupported') {
        recordOrb.disabled = true;
        status('这个浏览器不能录音，可以只听示范。', 'soft');
      }
    }

    function setPlayLabel(playing) {
      const label = playBtn.querySelector('.btn__label');
      if (label) label.textContent = playing ? '停止' : '回放';
      const iconWrap = playBtn.querySelector('.btn__icon');
      if (iconWrap) iconWrap.replaceWith(ui.icon(playing ? 'stop' : 'play', 'btn__icon'));
      playBtn.setAttribute('aria-label', playing ? '停止回放' : '回放录音');
    }

    function beginRecord() {
      if (!rec || !session.alive) return;
      BEAR.audio.stopAll();
      timer.textContent = '0.0s';
      rec.start();
    }

    function handleRecordClick() {
      if (!rec || !session.alive) return;
      if (rec.state === 'recording') {
        rec.stop();
        return;
      }
      if (rec.state === 'requesting' || rec.state === 'stopping') return;
      if (!BEAR.store.settings().micConsent) {
        ui.modal({
          title: '先问问家长',
          iconName: 'mic',
          body: [
            ui.el('p', { text: '接下来要使用麦克风，录下孩子跟读的声音。' }),
            ui.el('ul', {}, [
              ui.el('li', { text: '录音只保存在这台设备的内存里，不会上传。' }),
              ui.el('li', { text: '不会自动录音，离开本页就会清除。' }),
              ui.el('li', { text: '家长同意后，才能使用麦克风。' })
            ])
          ],
          actions: [
            { label: '先不录音', variant: 'secondary' },
            {
              label: '同意，开始录音',
              variant: 'primary',
              iconName: 'mic',
              onClick: () => {
                BEAR.store.setSetting('micConsent', true);
                beginRecord();
              }
            }
          ],
          onClose: () => {
            try { recordOrb.focus({ preventScroll: true }); } catch (err) {}
          }
        });
        return;
      }
      beginRecord();
    }

    recordOrb.addEventListener('click', () => {
      BEAR.sfx.play('tap');
      handleRecordClick();
    });

    if (canRecord) {
      rec = BEAR.recorder.create({
        maxMs: 6000,
        onState: applyRecorderState,
        onTick: (ms) => {
          timer.textContent = (ms / 1000).toFixed(1) + 's';
        }
      });
      recordOrb.disabled = false;
      status('点一下麦克风，开始录音（最多 6 秒）。');
    } else {
      recordOrb.disabled = true;
      recStatus.hidden = true;
      recActions.hidden = true;
    }

    updateDoneLabel();

    session.timeout(() => {
      if (session.alive && !samplePlaying && (!rec || rec.state === 'idle')) playSample();
    }, 350);

    function finish() {
      if (finished) return;
      finished = true;
      BEAR.audio.stopAll();
      if (rec) rec.destroy();
      if (typeof opts.onDone === 'function') opts.onDone();
    }

    return {
      destroy() {
        finished = true;
        session.destroy();
        if (rec) rec.destroy();
      }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
