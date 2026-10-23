/* Tiny synthesized UI sounds. No audio files, no external assets. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  let ctx = null;
  let enabled = true;
  let unlocked = false;

  function ensure() {
    if (ctx) return ctx;
    const Ctor = root.AudioContext || root.webkitAudioContext;
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch (err) { ctx = null; }
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (!c) return false;
    unlocked = true;
    if (c.state === 'suspended') c.resume().catch(() => {});
    return true;
  }

  function tone(freq, when, dur, type, volume) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume || 0.06, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.15));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + (dur || 0.15) + 0.03);
  }

  function glide(from, to, dur, volume) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume || 0.045, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function play(name) {
    if (!enabled || !unlocked) return;
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    switch (name) {
      case 'tap':
        tone(520, 0, 0.06, 'sine', 0.035);
        break;
      case 'correct':
        tone(523.25, 0, 0.16, 'triangle', 0.055);
        tone(659.25, 0.09, 0.18, 'triangle', 0.055);
        tone(783.99, 0.18, 0.24, 'triangle', 0.05);
        break;
      case 'wrong':
        glide(220, 170, 0.2, 0.035);
        break;
      case 'star':
        tone(1046.5, 0, 0.1, 'sine', 0.04);
        tone(1318.5, 0.07, 0.12, 'sine', 0.04);
        tone(1567.98, 0.14, 0.18, 'sine', 0.035);
        break;
      case 'complete':
        tone(523.25, 0, 0.12, 'triangle', 0.05);
        tone(659.25, 0.1, 0.12, 'triangle', 0.05);
        tone(783.99, 0.2, 0.14, 'triangle', 0.05);
        tone(1046.5, 0.32, 0.3, 'triangle', 0.045);
        break;
      case 'open':
        tone(660, 0, 0.08, 'sine', 0.03);
        break;
      case 'close':
        tone(440, 0, 0.08, 'sine', 0.03);
        break;
      default:
        tone(520, 0, 0.05, 'sine', 0.03);
    }
  }

  BEAR.sfx = {
    unlock,
    play,
    setEnabled(v) { enabled = !!v; },
    isEnabled() { return enabled; },
    get unlocked() { return unlocked; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = BEAR.sfx;
})(typeof globalThis !== 'undefined' ? globalThis : this);
