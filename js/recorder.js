/* Local-only voice recording. Blobs live in memory; nothing is uploaded. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const active = new Set();
  const MIMES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

  function supported() {
    try {
      return !!(root.navigator && root.navigator.mediaDevices &&
        typeof root.navigator.mediaDevices.getUserMedia === 'function' &&
        typeof root.MediaRecorder === 'function');
    } catch (err) {
      return false;
    }
  }

  function pickMime() {
    if (typeof root.MediaRecorder === 'undefined' || !root.MediaRecorder.isTypeSupported) return '';
    for (let i = 0; i < MIMES.length; i += 1) {
      try {
        if (root.MediaRecorder.isTypeSupported(MIMES[i])) return MIMES[i];
      } catch (err) {}
    }
    return '';
  }

  function create(opts) {
    opts = opts || {};
    const maxMs = Math.max(1000, opts.maxMs || 6000);
    let state = 'idle';
    let stream = null;
    let recorder = null;
    let chunks = [];
    let blob = null;
    let url = null;
    let timer = 0;
    let ticker = 0;
    let startedAt = 0;
    let lastDuration = 0;
    let player = null;
    let destroyed = false;
    let discard = false;

    function emit(next, detail) {
      state = next;
      if (typeof opts.onState === 'function') {
        try { opts.onState(next, detail || {}); } catch (err) {}
      }
    }

    function tick() {
      if (state !== 'recording') return;
      const elapsed = Math.min(maxMs, Date.now() - startedAt);
      if (typeof opts.onTick === 'function') {
        try { opts.onTick(elapsed); } catch (err) {}
      }
      if (elapsed >= maxMs) stop();
    }

    function clearTimers() {
      if (timer) {
        root.clearTimeout(timer);
        timer = 0;
      }
      if (ticker) {
        root.clearInterval(ticker);
        ticker = 0;
      }
    }

    function releaseStream() {
      if (!stream) return;
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {}
      stream = null;
    }

    function revoke() {
      if (url) {
        try { URL.revokeObjectURL(url); } catch (err) {}
        url = null;
      }
      blob = null;
    }

    function stopPlayer() {
      if (!player) return;
      try {
        player.onended = null;
        player.onerror = null;
        player.pause();
        player.removeAttribute('src');
        player.load();
      } catch (err) {}
      player = null;
    }

    function cleanupRecording() {
      clearTimers();
      releaseStream();
      if (recorder) {
        try {
          recorder.ondataavailable = null;
          recorder.onstop = null;
          recorder.onerror = null;
          if (recorder.state !== 'inactive') recorder.stop();
        } catch (err) {}
      }
      recorder = null;
      chunks = [];
    }

    function finishBlob() {
      releaseStream();
      clearTimers();
      const recorderMime = (recorder && recorder.mimeType) || '';
      recorder = null;
      if (discard) {
        discard = false;
        chunks = [];
        emit('idle');
        return;
      }
      if (!chunks.length) {
        chunks = [];
        emit('error', { reason: 'empty' });
        return;
      }
      const type = recorderMime || chunks[0].type || 'audio/webm';
      const nextBlob = new Blob(chunks, { type });
      const nextDuration = Date.now() - startedAt;
      chunks = [];
      revoke();
      blob = nextBlob;
      try {
        url = URL.createObjectURL(blob);
      } catch (err) {
        blob = null;
        emit('error', { reason: 'blob' });
        return;
      }
      lastDuration = nextDuration;
      emit('ready', { duration: nextDuration, mime: type });
    }

    async function start() {
      if (destroyed) return false;
      if (!supported()) {
        emit('unsupported');
        return false;
      }
      if (state === 'recording' || state === 'requesting' || state === 'stopping') return false;
      stopPlayer();
      revoke();
      discard = false;
      lastDuration = 0;
      emit('requesting');
      let media;
      try {
        media = await root.navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
      } catch (err) {
        emit('error', { reason: err && err.name ? err.name : 'permission' });
        return false;
      }
      if (destroyed) {
        try { media.getTracks().forEach((track) => track.stop()); } catch (err2) {}
        return false;
      }
      stream = media;
      const mime = pickMime();
      try {
        recorder = mime ? new root.MediaRecorder(stream, { mimeType: mime }) : new root.MediaRecorder(stream);
      } catch (err) {
        try {
          recorder = new root.MediaRecorder(stream);
        } catch (err2) {
          releaseStream();
          emit('error', { reason: 'recorder' });
          return false;
        }
      }
      chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        cleanupRecording();
        emit('error', { reason: 'record' });
      };
      recorder.onstop = () => finishBlob();
      try {
        recorder.start(120);
      } catch (err) {
        cleanupRecording();
        emit('error', { reason: 'start' });
        return false;
      }
      startedAt = Date.now();
      emit('recording', { maxMs });
      ticker = root.setInterval(tick, 100);
      timer = root.setTimeout(stop, maxMs + 40);
      return true;
    }

    function stop() {
      if (state !== 'recording' || !recorder) return;
      clearTimers();
      emit('stopping');
      try {
        if (recorder.state !== 'inactive') recorder.stop();
        else finishBlob();
      } catch (err) {
        cleanupRecording();
        emit('error', { reason: 'stop' });
      }
    }

    function cancel() {
      if (state === 'recording' || state === 'stopping') {
        discard = true;
        if (recorder && recorder.state !== 'inactive') {
          try { recorder.stop(); } catch (err) { cleanupRecording(); emit('idle'); }
        } else {
          cleanupRecording();
          emit('idle');
        }
      }
    }

    function reset() {
      stopPlayer();
      revoke();
      lastDuration = 0;
      if (state === 'recording' || state === 'stopping' || state === 'requesting') {
        cancel();
      } else {
        emit('idle');
      }
    }

    function play() {
      if (!url || state === 'recording' || state === 'requesting') return Promise.resolve(false);
      if (state === 'playing') {
        stopPlayer();
        emit('ready');
        return Promise.resolve(true);
      }
      stopPlayer();
      if (BEAR.audio) BEAR.audio.stopAll();
      const audio = new root.Audio();
      player = audio;
      audio.src = url;
      audio.onended = () => {
        if (player === audio) player = null;
        emit('ready');
      };
      audio.onerror = () => {
        if (player === audio) player = null;
        emit('error', { reason: 'playback' });
      };
      emit('playing');
      const started = audio.play();
      if (started && typeof started.catch === 'function') {
        started.catch(() => {
          if (player === audio) player = null;
          emit('error', { reason: 'playback' });
        });
      }
      return Promise.resolve(true);
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      discard = true;
      stopPlayer();
      clearTimers();
      releaseStream();
      if (recorder) {
        try {
          recorder.ondataavailable = null;
          recorder.onstop = null;
          recorder.onerror = null;
          if (recorder.state !== 'inactive') recorder.stop();
        } catch (err) {}
        recorder = null;
      }
      chunks = [];
      revoke();
      active.delete(handle);
      state = 'idle';
    }

    function abort() {
      // Leaving the screen: release the mic and object URL without a state walk.
      if (destroyed) return;
      clearTimers();
      releaseStream();
      if (recorder) {
        try {
          recorder.ondataavailable = null;
          recorder.onstop = null;
          if (recorder.state !== 'inactive') recorder.stop();
        } catch (err) {}
        recorder = null;
      }
      chunks = [];
      stopPlayer();
      revoke();
      active.delete(handle);
      emit('idle');
    }

    const handle = {
      start,
      stop,
      reset,
      cancel,
      play,
      destroy,
      abort,
      get state() { return state; },
      get hasRecording() { return !!url; },
      get duration() {
        return state === 'recording' ? Date.now() - startedAt : lastDuration;
      },
      get supported() { return supported(); }
    };
    active.add(handle);
    if (state === 'idle') emit('idle');
    return handle;
  }

  function stopAll() {
    Array.from(active).forEach((handle) => {
      try { handle.abort(); } catch (err) {}
    });
  }

  BEAR.recorder = {
    create,
    supported,
    stopAll,
    get activeCount() { return active.size; }
  };

  if (typeof root.addEventListener === 'function') {
    root.addEventListener('pagehide', stopAll);
    root.addEventListener('visibilitychange', () => {
      if (root.document && root.document.visibilityState === 'hidden') stopAll();
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = BEAR.recorder;
})(typeof globalThis !== 'undefined' ? globalThis : this);
