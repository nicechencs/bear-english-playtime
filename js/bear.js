/* Bear's English Playtime - reusable bear illustration rig.
 * Classic script; exposes window.BEAR.bear.
 * Builds real SVG DOM nodes and keeps all styling in css/bear.css.
 */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var BEAR = global.BEAR = global.BEAR || {};

  var POSES = Object.freeze([
    'walk', 'run', 'jump', 'clap', 'dance', 'sing', 'kick', 'wave',
    'wobble', 'crawl', 'point', 'pat', 'shake', 'turn', 'snap', 'poke'
  ]);

  var FEELINGS = Object.freeze(['happy', 'sad', 'angry', 'hungry', 'sleepy']);
  var FACE_VARIANTS = Object.freeze(['normal', 'happy', 'sing', 'sad', 'angry', 'hungry', 'sleepy']);

  function normalizePose(value, fallback) {
    var token = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return POSES.indexOf(token) !== -1 ? token : (fallback || 'walk');
  }

  function normalizeFace(value, fallback) {
    var token = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return FACE_VARIANTS.indexOf(token) !== -1 ? token : (fallback || 'happy');
  }

  function splitClasses(value) {
    if (value === null || typeof value === 'undefined' || value === false) return [];
    if (Array.isArray(value)) {
      return value.reduce(function (all, item) {
        return all.concat(splitClasses(item));
      }, []);
    }
    return String(value).split(/\s+/).filter(Boolean);
  }

  function composeClass(base, extra) {
    var seen = Object.create(null);
    return base.concat(splitClasses(extra)).filter(function (name) {
      if (!name || seen[name]) return false;
      seen[name] = true;
      return true;
    }).join(' ');
  }

  function sparklePath(cx, cy, r) {
    function n(v) { return Math.round(v * 10) / 10; }
    var k = r * 0.2;
    return 'M' + n(cx) + ' ' + n(cy - r) +
      'Q' + n(cx + k) + ' ' + n(cy - k) + ' ' + n(cx + r) + ' ' + n(cy) +
      'Q' + n(cx + k) + ' ' + n(cy + k) + ' ' + n(cx) + ' ' + n(cy + r) +
      'Q' + n(cx - k) + ' ' + n(cy + k) + ' ' + n(cx - r) + ' ' + n(cy) +
      'Q' + n(cx - k) + ' ' + n(cy - k) + ' ' + n(cx) + ' ' + n(cy - r) + 'Z';
  }

  function heartPath(cx, cy, s) {
    return 'M' + cx + ' ' + (cy + s) +
      'C' + (cx - s * 1.65) + ' ' + (cy + s * 0.1) + ' ' +
      (cx - s * 1.05) + ' ' + (cy - s * 1.15) + ' ' +
      cx + ' ' + (cy - s * 0.42) +
      'C' + (cx + s * 1.05) + ' ' + (cy - s * 1.15) + ' ' +
      (cx + s * 1.65) + ' ' + (cy + s * 0.1) + ' ' +
      cx + ' ' + (cy + s) + 'Z';
  }

  function sparkle(cx, cy, r, fillClass, extra) {
    return '<path class="' + fillClass + '" d="' + sparklePath(cx, cy, r) + '"' +
      (extra ? ' ' + extra : '') + '/>';
  }

  function heart(cx, cy, s, fillClass, extra) {
    return '<path class="prop-heart ' + fillClass + '" d="' + heartPath(cx, cy, s) + '"' +
      (extra ? ' ' + extra : '') + '/>';
  }

  /* ---------------------------------------------------------------- head */

  function headMarkup() {
    return '' +
      '<g class="bear-head">' +
        '<circle class="bear-fill-soft" cx="116" cy="92" r="26"/>' +
        '<circle class="bear-fill-soft" cx="224" cy="92" r="26"/>' +
        '<circle class="bear-fill-muzzle" cx="116" cy="92" r="13"/>' +
        '<circle class="bear-fill-muzzle" cx="224" cy="92" r="13"/>' +
        '<circle class="bear-fill-soft" cx="170" cy="140" r="73"/>' +
        '<path class="bear-fill-soft" d="M157 77c2-14 11-19 17-7 5-13 14-8 14 5-7 5-23 6-31 2Z"/>' +
        '<ellipse class="bear-fill-muzzle" cx="170" cy="162" rx="38" ry="28"/>' +
        '<circle class="bear-fill-cheek" cx="127" cy="157" r="11" opacity=".5"/>' +
        '<circle class="bear-fill-cheek" cx="213" cy="157" r="11" opacity=".5"/>' +
        '<ellipse class="bear-fill-ink" cx="170" cy="151" rx="11" ry="8"/>' +
        '<ellipse class="bear-fill-surface" cx="167" cy="148" rx="3.2" ry="2.2" opacity=".55"/>' +

        '<g class="bear-face face-normal">' +
          '<circle class="bear-fill-ink" cx="145" cy="127" r="7.5"/>' +
          '<circle class="bear-fill-ink" cx="195" cy="127" r="7.5"/>' +
          '<circle class="bear-fill-surface" cx="147.5" cy="124.5" r="2.2" opacity=".85"/>' +
          '<circle class="bear-fill-surface" cx="197.5" cy="124.5" r="2.2" opacity=".85"/>' +
          '<path class="bear-line-ink bear-mouth" d="M156 174q14 11 28 0" stroke-width="4.5"/>' +
        '</g>' +

        '<g class="bear-face face-happy">' +
          '<path class="bear-line-ink" d="M136 130q9-16 18 0M186 130q9-16 18 0" stroke-width="5"/>' +
          '<path class="bear-fill-mouth bear-mouth" d="M151 168q19 29 38 0Z"/>' +
          '<path class="bear-fill-cheek" d="M163 183q7 8 14 0-7 10-14 0Z" opacity=".72"/>' +
        '</g>' +

        '<g class="bear-face face-sing">' +
          '<path class="bear-line-ink" d="M136 130q9-16 18 0M186 130q9-16 18 0" stroke-width="5"/>' +
          '<ellipse class="bear-fill-mouth bear-mouth" cx="170" cy="178" rx="14" ry="17"/>' +
          '<ellipse class="bear-fill-cheek" cx="170" cy="187" rx="7" ry="4" opacity=".62"/>' +
        '</g>' +

        '<g class="bear-face face-sad">' +
          '<circle class="bear-fill-ink" cx="145" cy="129" r="7.5"/>' +
          '<circle class="bear-fill-ink" cx="195" cy="129" r="7.5"/>' +
          '<circle class="bear-fill-surface" cx="147.5" cy="126.5" r="2.2" opacity=".8"/>' +
          '<circle class="bear-fill-surface" cx="197.5" cy="126.5" r="2.2" opacity=".8"/>' +
          '<path class="bear-line-ink" d="M132 120l26-7M208 120l-26-7" stroke-width="4.5"/>' +
          '<path class="bear-line-ink bear-mouth" d="M154 185q16-14 32 0" stroke-width="4.5"/>' +
          '<path class="bear-fill-sky" d="M139 146c-4 8-7 11-3 15 5-1 7-6 3-15Z" opacity=".82"/>' +
          '<path class="bear-fill-sky" d="M203 148c-3 6-5 8-2 11 4-1 5-4 2-11Z" opacity=".55"/>' +
        '</g>' +

        '<g class="bear-face face-angry">' +
          '<circle class="bear-fill-ink" cx="146" cy="130" r="6.5"/>' +
          '<circle class="bear-fill-ink" cx="194" cy="130" r="6.5"/>' +
          '<path class="bear-line-ink" d="M133 112l27 12M207 112l-27 12" stroke-width="5.5"/>' +
          '<path class="bear-line-ink bear-mouth" d="M154 184q16-13 32 0" stroke-width="5"/>' +
          '<path class="bear-line-action" d="M218 92l8-6M222 99l10 0M219 106l7 7" stroke-width="3.2" opacity=".8"/>' +
        '</g>' +

        '<g class="bear-face face-hungry">' +
          '<circle class="bear-fill-ink" cx="145" cy="127" r="7.5"/>' +
          '<circle class="bear-fill-ink" cx="195" cy="127" r="7.5"/>' +
          '<path class="bear-line-ink" d="M136 112q9 5 18-1M186 111q9-6 18 1" stroke-width="4"/>' +
          '<ellipse class="bear-fill-mouth bear-mouth" cx="170" cy="179" rx="12" ry="14"/>' +
          '<path class="bear-fill-sky" d="M178 190q5 8-2 13-5-4-2-13Z" opacity=".7"/>' +
        '</g>' +

        '<g class="bear-face face-sleepy">' +
          '<path class="bear-line-ink" d="M135 129q10 8 20 0M185 129q10 8 20 0" stroke-width="5"/>' +
          '<ellipse class="bear-fill-mouth bear-mouth" cx="170" cy="179" rx="8" ry="5.5"/>' +
          '<path class="bear-line-ink" d="M151 164q4 3 8 0" stroke-width="2.5" opacity=".55"/>' +
        '</g>' +

        '<g class="bear-sing-mouth" aria-hidden="true">' +
          '<ellipse class="bear-fill-mouth" cx="170" cy="179" rx="14" ry="17"/>' +
          '<ellipse class="bear-fill-cheek" cx="170" cy="188" rx="7" ry="4" opacity=".6"/>' +
        '</g>' +
      '</g>';
  }

  /* ---------------------------------------------------------------- torso */

  function bearMarkup() {
    return '' +
      '<ellipse class="bear-fill-ink bear-shadow" cx="170" cy="345" rx="82" ry="10" opacity=".12"/>' +
      '<g class="bear-mv">' +
        '<g class="bear-root">' +
          '<g class="bear-leg bear-legL">' +
            '<rect class="bear-fill-soft" x="125" y="279" width="39" height="58" rx="19"/>' +
            '<ellipse class="bear-fill-pad" cx="144" cy="335" rx="27" ry="13"/>' +
            '<path class="bear-line-pad" d="M134 335h4M144 337h4M154 335h4" stroke-width="2" opacity=".38"/>' +
          '</g>' +
          '<g class="bear-leg bear-legR">' +
            '<rect class="bear-fill-soft" x="176" y="279" width="39" height="58" rx="19"/>' +
            '<ellipse class="bear-fill-pad" cx="196" cy="335" rx="27" ry="13"/>' +
            '<path class="bear-line-pad" d="M186 335h4M196 337h4M206 335h4" stroke-width="2" opacity=".38"/>' +
          '</g>' +

          '<ellipse class="bear-fill-body" cx="170" cy="237" rx="60" ry="64"/>' +
          '<ellipse class="bear-fill-muzzle" cx="170" cy="249" rx="37" ry="44"/>' +
          '<path class="bear-fill-muzzle" d="M131 222q39 25 78 0" opacity=".55"/>' +

          '<g class="bear-arm bear-armL">' +
            '<rect class="bear-fill-body" x="103" y="203" width="30" height="73" rx="15"/>' +
            '<circle class="bear-fill-soft" cx="118" cy="274" r="16"/>' +
            '<ellipse class="bear-fill-pad" cx="118" cy="276" rx="5" ry="3.5" opacity=".35"/>' +
          '</g>' +
          '<g class="bear-arm bear-armR">' +
            '<rect class="bear-fill-body" x="207" y="203" width="30" height="73" rx="15"/>' +
            '<circle class="bear-fill-soft" cx="222" cy="274" r="16"/>' +
            '<ellipse class="bear-fill-pad" cx="222" cy="276" rx="5" ry="3.5" opacity=".35"/>' +
          '</g>' +

          '<g class="bear-scarf">' +
            '<path class="bear-fill-scarf" d="M112 194c22 22 94 22 116 0l-2 18c-25 22-87 22-112 0Z"/>' +
            '<path class="bear-line-scarf-light" d="M122 203c25 15 72 16 96 0" stroke-width="4" opacity=".8"/>' +
            '<path class="bear-fill-scarf" d="M206 210c19 13 25 35 16 51-5 9-17 6-19-4 6-14 0-28-9-38Z"/>' +
            '<path class="bear-line-scarf-light" d="M211 220c9 14 7 27 0 35" stroke-width="4" opacity=".7"/>' +
            '<circle class="bear-fill-scarf-light" cx="214" cy="212" r="7"/>' +
          '</g>' +

          headMarkup() +
        '</g>' +
      '</g>';
  }

  /* ---------------------------------------------------------------- props */

  function propsMarkup() {
    return '' +
      '<g class="bear-props" aria-hidden="true">' +

        '<g class="prop prop-walk">' +
          '<ellipse class="bear-fill-line" cx="84" cy="334" rx="12" ry="5" opacity=".55"/>' +
          '<ellipse class="bear-fill-line" cx="59" cy="340" rx="7" ry="3.5" opacity=".35"/>' +
          '<path class="bear-fill-leaf" d="M70 306c-11-5-18 3-16 13 10 1 17-4 16-13Z" opacity=".65"/>' +
          '<path class="bear-line-leaf" d="M62 316c4-3 8-6 11-10" stroke-width="2.5" opacity=".55"/>' +
        '</g>' +

        '<g class="prop prop-run">' +
          '<path class="bear-line-action prop-run-lines" d="M38 210h58M50 232h58M41 254h48" stroke-width="5" opacity=".68"/>' +
          '<ellipse class="bear-fill-line" cx="81" cy="334" rx="13" ry="5" opacity=".5"/>' +
          '<ellipse class="bear-fill-line" cx="54" cy="341" rx="8" ry="4" opacity=".3"/>' +
          sparkle(44, 291, 6, 'bear-fill-sun', 'opacity=".6"') +
        '</g>' +

        '<g class="prop prop-jump">' +
          sparkle(82, 286, 13, 'bear-fill-sun', 'opacity=".9"') +
          sparkle(272, 298, 9, 'bear-fill-cheek', 'opacity=".8"') +
          '<path class="bear-line-action" d="M78 320c-8-10-9-21-5-30M103 318c-3-10-2-19 3-27" stroke-width="4" opacity=".58"/>' +
          sparkle(300, 244, 5, 'bear-fill-action', 'opacity=".65"') +
        '</g>' +

        '<g class="prop prop-clap">' +
          sparkle(170, 226, 17, 'bear-fill-sun', 'opacity=".95"') +
          sparkle(143, 244, 6, 'bear-fill-action', 'opacity=".8"') +
          sparkle(199, 245, 5, 'bear-fill-cheek', 'opacity=".9"') +
          '<path class="bear-line-action" d="M170 201v-10M139 209l-7-8M201 209l7-8" stroke-width="4" opacity=".7"/>' +
        '</g>' +

        '<g class="prop prop-dance">' +
          sparkle(84, 185, 10, 'bear-fill-sun', 'opacity=".9"') +
          sparkle(258, 176, 8, 'bear-fill-cheek', 'opacity=".8"') +
          '<path class="bear-fill-leaf" d="M72 219c-8-1-11 7-4 12 7 0 9-6 4-12Z" opacity=".7"/>' +
          '<circle class="bear-fill-sky" cx="265" cy="236" r="5" opacity=".7"/>' +
        '</g>' +

        '<g class="prop prop-music">' +
          '<ellipse class="bear-fill-leaf" cx="55" cy="147" rx="10" ry="7" transform="rotate(-18 55 147)"/>' +
          '<path class="bear-line-leaf" d="M64 145V114q12-3 18 8" stroke-width="6" opacity=".9"/>' +
          '<path class="bear-fill-sun" d="M76 113q10-4 16 5-10 0-16-5Z" opacity=".9"/>' +
          '<ellipse class="bear-fill-leaf" cx="287" cy="119" rx="8" ry="6" transform="rotate(-18 287 119)"/>' +
          '<path class="bear-line-leaf" d="M294 117V94q10-2 14 7" stroke-width="5" opacity=".85"/>' +
        '</g>' +

        '<g class="prop prop-kick">' +
          '<path class="bear-line-action" d="M248 286l-9-7M257 278l-3-11M231 298h-12" stroke-width="4" opacity=".7"/>' +
          '<g class="prop-kick-ball">' +
            '<circle class="bear-fill-surface bear-stroke-ink" cx="263" cy="316" r="18" stroke-width="2.5"/>' +
            '<path class="bear-fill-ink" d="m263 307 8 6-3 10h-10l-3-10Z" opacity=".88"/>' +
            '<path class="bear-line-ink" d="M247 316c5-3 9-5 14-6M279 314c-5 0-9 2-12 4M252 329c4-4 9-6 12-7M276 326c-4-2-8-3-12-3" stroke-width="1.4" opacity=".32"/>' +
          '</g>' +
          '<ellipse class="bear-fill-line" cx="239" cy="340" rx="12" ry="4" opacity=".3"/>' +
        '</g>' +

        '<g class="prop prop-wave">' +
          '<path class="bear-line-sky" d="M263 137c8 6 12 14 13 23M275 124c13 8 19 21 20 35M286 111c17 11 25 28 26 46" stroke-width="5" opacity=".76"/>' +
          '<circle class="bear-fill-action" cx="261" cy="172" r="4" opacity=".65"/>' +
        '</g>' +

        '<g class="prop prop-wobble">' +
          '<path class="bear-line-sky" d="M53 213c7-8 14-8 21 0s14 8 21 0" stroke-width="4.5" opacity=".78"/>' +
          '<path class="bear-line-action" d="M246 198c7-8 14-8 21 0s14 8 21 0" stroke-width="4.5" opacity=".6"/>' +
          '<path class="bear-line-sky" d="M128 341c9-7 18-7 27 0s18 7 27 0" stroke-width="3.5" opacity=".45"/>' +
          '<circle class="bear-fill-sun" cx="252" cy="224" r="4" opacity=".65"/>' +
        '</g>' +

        '<g class="prop prop-crawl">' +
          '<ellipse class="bear-fill-line" cx="70" cy="322" rx="12" ry="5" opacity=".5"/>' +
          '<ellipse class="bear-fill-line" cx="47" cy="334" rx="8" ry="3.5" opacity=".3"/>' +
          '<path class="bear-line-action" d="M92 303H61M88 318H55" stroke-width="4" opacity=".6"/>' +
          sparkle(88, 286, 7, 'bear-fill-sun', 'opacity=".72"') +
        '</g>' +

        '<g class="prop prop-point">' +
          '<g class="prop-point-dot">' +
            '<circle class="bear-line-action" cx="309" cy="190" r="15" stroke-width="3" opacity=".45"/>' +
            '<circle class="bear-fill-action" cx="309" cy="190" r="8"/>' +
            '<circle class="bear-fill-surface" cx="309" cy="190" r="3"/>' +
          '</g>' +
          '<path class="bear-line-action" d="M283 170l-7-8M321 174l6-7M279 210l-9 3M324 204l9 4" stroke-width="3.5" opacity=".66"/>' +
        '</g>' +

        '<g class="prop prop-pat">' +
          heart(84, 167, 11, 'bear-fill-cheek', 'opacity=".9"') +
          heart(257, 134, 9, 'bear-fill-action', 'opacity=".82"') +
          heart(170, 45, 8, 'bear-fill-sun', 'opacity=".9"') +
          '<path class="bear-line-action" d="M107 143c-8-4-12-12-10-20M231 122c8-4 12-10 11-18" stroke-width="3" opacity=".45"/>' +
        '</g>' +

        '<g class="prop prop-shake">' +
          '<g class="bear-line-action" stroke-width="4.5" opacity=".75">' +
            '<path d="M90 190l-20-10M88 226H64M92 262l-18 10"/>' +
            '<path d="M250 190l20-10M252 226h24M248 262l18 10"/>' +
          '</g>' +
          '<circle class="bear-fill-sun" cx="78" cy="241" r="4" opacity=".6"/>' +
          '<circle class="bear-fill-action" cx="265" cy="211" r="4" opacity=".55"/>' +
        '</g>' +

        '<g class="prop prop-turn">' +
          '<g class="prop-turn-arrow">' +
            '<path class="bear-line-sky" d="M315 95a33 33 0 1 0-9.7 23.3" stroke-width="4.5" opacity=".82"/>' +
            '<path class="bear-line-sky" d="m302 126 12-6-2-13" stroke-width="4.5" opacity=".82"/>' +
          '</g>' +
          sparkle(303, 67, 6, 'bear-fill-sun', 'opacity=".8"') +
        '</g>' +

        '<g class="prop prop-snap">' +
          sparkle(268, 140, 15, 'bear-fill-sun', 'opacity=".95"') +
          sparkle(290, 122, 7, 'bear-fill-action', 'opacity=".8"') +
          sparkle(243, 124, 5, 'bear-fill-cheek', 'opacity=".85"') +
          '<path class="bear-line-action" d="M273 158l-4 10M287 147l8 6M256 151l-7 8" stroke-width="3.5" opacity=".65"/>' +
        '</g>' +

        '<g class="prop prop-poke">' +
          '<g class="prop-poke-balloon">' +
            '<path class="bear-fill-sun" d="M285 83c16 0 28 12 28 28 0 20-16 36-28 36s-28-16-28-36c0-16 12-28 28-28Z"/>' +
            '<path class="bear-fill-surface" d="M270 102c2-8 8-13 14-14 2 4 1 9-3 12-3 2-7 3-11 2Z" opacity=".38"/>' +
            '<path class="bear-fill-action" d="m285 144 6 9h-12Z"/>' +
            '<path class="bear-line-ink" d="M285 153c3 10-5 14-3 23" stroke-width="2" opacity=".7"/>' +
          '</g>' +
          '<path class="bear-line-action" d="M256 167l-9-5M260 181l-10 2" stroke-width="3.5" opacity=".65"/>' +
        '</g>' +

        '<g class="prop prop-sleepy">' +
          '<path class="bear-line-sky" d="M253 118h19l-19 20h19" stroke-width="3.5" opacity=".8"/>' +
          '<path class="bear-line-sky" d="M278 91h13l-13 14h13" stroke-width="3.5" opacity=".7"/>' +
          '<path class="bear-line-sky" d="M297 69h9l-9 10h9" stroke-width="3.5" opacity=".55"/>' +
        '</g>' +

      '</g>';
  }

  /* --------------------------------------------------------------- export */

  function createSvg(viewBox, width, height, classes, state) {
    var el = document.createElementNS(SVG_NS, 'svg');
    el.setAttribute('viewBox', viewBox);
    el.setAttribute('width', String(width));
    el.setAttribute('height', String(height));
    el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    el.setAttribute('focusable', 'false');
    el.setAttribute('class', composeClass(classes, state.className));
    if (state.label) el.setAttribute('aria-label', state.label);
    if (state.hidden) el.setAttribute('aria-hidden', 'true');
    el.innerHTML = state.markup;
    return el;
  }

  function stage(opts) {
    opts = opts || {};
    var pose = normalizePose(opts.pose);
    var face = normalizeFace(opts.face);
    var label = typeof opts.label === 'string' && opts.label.trim() ? opts.label : 'Bear';
    var classes = [
      'bear-stage',
      'bear-stage--' + pose,
      'bear-svg',
      'is-stage',
      'pose-' + pose,
      'face-' + face,
      'is-action'
    ];
    var el = createSvg('0 0 340 360', 340, 360, classes, {
      className: opts.className,
      label: label,
      hidden: false,
      markup: bearMarkup() + propsMarkup()
    });
    el.setAttribute('role', 'img');
    el.setAttribute('data-pose', pose);
    el.setAttribute('data-face', face);
    return el;
  }

  function mini(opts) {
    opts = opts || {};
    var pose = normalizePose(opts.pose);
    var face = normalizeFace(opts.face);
    var classes = [
      'bear-mini',
      'bear-mini--' + pose,
      'bear-svg',
      'is-mini',
      'pose-' + pose,
      'face-' + face
    ];
    var el = createSvg('0 0 340 360', 340, 360, classes, {
      className: opts.className,
      label: '',
      hidden: true,
      markup: bearMarkup() + propsMarkup()
    });
    el.setAttribute('data-pose', pose);
    el.setAttribute('data-face', face);
    return el;
  }

  function face(opts) {
    opts = opts || {};
    var faceName = normalizeFace(opts.face);
    var classes = [
      'bear-face',
      'bear-face--' + faceName,
      'bear-svg',
      'is-face',
      'face-' + faceName
    ];
    var el = createSvg('88 55 164 170', 164, 170, classes, {
      className: opts.className,
      label: '',
      hidden: true,
      markup: headMarkup()
    });
    el.setAttribute('data-face', faceName);
    return el;
  }

  function currentClassPart(el, prefix) {
    var found = '';
    if (!el || !el.classList) return found;
    for (var i = 0; i < el.classList.length; i += 1) {
      var name = el.classList.item(i);
      if (name.indexOf(prefix) === 0) found = name.slice(prefix.length);
    }
    return found;
  }

  function apply(svgEl, pose, faceName) {
    if (!svgEl || !svgEl.classList) return svgEl;

    var isStage = svgEl.classList.contains('bear-stage');
    var isMini = svgEl.classList.contains('bear-mini');
    var isHead = svgEl.classList.contains('bear-face') && !isStage && !isMini;

    var currentPose = svgEl.getAttribute('data-pose') || currentClassPart(svgEl, 'pose-');
    var currentFace = svgEl.getAttribute('data-face') || currentClassPart(svgEl, 'face-');
    var nextPose = normalizePose(pose, normalizePose(currentPose));
    var nextFace = normalizeFace(faceName, normalizeFace(currentFace));

    var remove = [];
    Array.prototype.forEach.call(svgEl.classList, function (name) {
      if (/^(bear-stage--|bear-mini--|bear-face--|pose-|face-)/.test(name)) remove.push(name);
    });
    remove.forEach(function (name) { svgEl.classList.remove(name); });

    svgEl.setAttribute('data-pose', nextPose);
    svgEl.setAttribute('data-face', nextFace);

    if (isStage) {
      svgEl.classList.add('bear-stage--' + nextPose, 'pose-' + nextPose, 'face-' + nextFace);
    } else if (isMini) {
      svgEl.classList.add('bear-mini--' + nextPose, 'pose-' + nextPose, 'face-' + nextFace);
    } else if (isHead) {
      svgEl.classList.add('bear-face--' + nextFace, 'face-' + nextFace);
    } else {
      svgEl.classList.add('pose-' + nextPose, 'face-' + nextFace);
    }

    if (isStage) {
      /* One-shot action restart: remove the trigger class long enough for a
       * style flush, then re-add it. This also drives the 120ms reduced-motion
       * opacity state. */
      svgEl.classList.remove('is-action');
      if (svgEl.getBoundingClientRect) svgEl.getBoundingClientRect();
      svgEl.classList.add('is-action');
    }
    return svgEl;
  }

  BEAR.bear = {
    stage: stage,
    mini: mini,
    face: face,
    apply: apply,
    poses: POSES,
    faces: FEELINGS
  };
}(window));
