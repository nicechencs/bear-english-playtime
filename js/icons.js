/* Inline icon library for Bear's English Playtime.
 * Classic script; exposes window.BEAR.icons.
 * Every call returns a real 24x24 SVGElement using currentColor.
 */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var BEAR = global.BEAR = global.BEAR || {};

  var ICONS = {
    speaker:
      '<path d="M4 9.4h3.6L13 5.2v13.6l-5.4-4.2H4z" fill="currentColor" fill-opacity=".16" stroke="none"/>' +
      '<path d="M4 9.4h3.6L13 5.2v13.6l-5.4-4.2H4z"/>' +
      '<path d="M16.2 8.3a5.3 5.3 0 0 1 0 7.4M18.7 5.6a8.9 8.9 0 0 1 0 12.8"/>',

    mute:
      '<path d="M4 9.4h3.6L13 5.2v13.6l-5.4-4.2H4z" fill="currentColor" fill-opacity=".16" stroke="none"/>' +
      '<path d="M4 9.4h3.6L13 5.2v13.6l-5.4-4.2H4z"/>' +
      '<path d="m16.5 9.5 5 5M21.5 9.5l-5 5"/>',

    replay:
      '<path d="M20 12a8 8 0 1 1-2.34-5.66"/>' +
      '<path d="M20 4v5h-5"/>' +
      '<path d="m10.2 9.2 4.6 2.8-4.6 2.8Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',

    back:
      '<path d="M10 6.5 4.5 12l5.5 5.5"/>' +
      '<path d="M4.5 12H14a5.5 5.5 0 0 1 5.5 5.5V20"/>',

    close:
      '<path d="M6 6l12 12M18 6 6 18"/>',

    gear:
      '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/>' +
      '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.91a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.91 4.6H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.5.6.85 1.1 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',

    star:
      '<path d="m12 2.7 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9Z" fill="currentColor" stroke="none"/>',

    lock:
      '<rect x="4.2" y="10" width="15.6" height="10.5" rx="2.5"/>' +
      '<path d="M8 10V7a4 4 0 0 1 8 0v3"/>' +
      '<circle cx="12" cy="15.1" r="1.2" fill="currentColor" stroke="none"/>' +
      '<path d="M12 16.2v1.6"/>',

    check:
      '<path d="m5 12.3 4.4 4.4L19.2 6.9"/>',

    mic:
      '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" fill="currentColor" fill-opacity=".12"/>' +
      '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/>' +
      '<path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/>',

    stop:
      '<rect x="5.8" y="5.8" width="12.4" height="12.4" rx="2.4" fill="currentColor" stroke="none"/>' +
      '<rect x="5.8" y="5.8" width="12.4" height="12.4" rx="2.4"/>',

    play:
      '<path d="M8 5.2v13.6L19.2 12Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',

    home:
      '<path d="M3.8 11.3 12 4l8.2 7.3"/>' +
      '<path d="M6.2 9.6V20h11.6V9.6"/>' +
      '<path d="M10 20v-5.5h4V20"/>',

    'arrow-right':
      '<path d="M4 12h15.2"/><path d="m13.6 6.4 5.6 5.6-5.6 5.6"/>',

    'arrow-left':
      '<path d="M20 12H4.8"/><path d="m10.4 6.4-5.6 5.6 5.6 5.6"/>',

    refresh:
      '<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5"/>' +
      '<path d="M4 4v4.5h4.5"/>' +
      '<path d="M4 13a8 8 0 0 0 14.3 4.5l1.7-2"/>' +
      '<path d="M20 20v-4.5h-4.5"/>',

    trophy:
      '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" fill="currentColor" fill-opacity=".18" stroke="none"/>' +
      '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/>' +
      '<path d="M8 6H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5"/>' +
      '<path d="M12 13v4M8.5 21h7M9.5 17h5l.7 4h-6.4Z"/>' +
      '<path d="m12 5.8.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.8-1.4.8.3-1.5-1.1-1 1.5-.2Z" fill="currentColor" stroke="none"/>',

    leaf:
      '<path d="M20.5 3.5C12 3.5 4.5 8.4 4.5 15.2c0 2.7 2 4.8 4.8 4.8 6.7 0 11.2-7.9 11.2-16.5Z" fill="currentColor" fill-opacity=".12"/>' +
      '<path d="M20.5 3.5C12 3.5 4.5 8.4 4.5 15.2c0 2.7 2 4.8 4.8 4.8 6.7 0 11.2-7.9 11.2-16.5Z"/>' +
      '<path d="M4.5 20.5c2.8-5.2 7-8.3 12-11.2"/>',

    sparkle:
      '<path d="M12 2.5c.8 6.2 3.3 8.7 9.5 9.5-6.2.8-8.7 3.3-9.5 9.5-.8-6.2-3.3-8.7-9.5-9.5 6.2-.8 8.7-3.3 9.5-9.5Z" fill="currentColor" stroke="none"/>' +
      '<path d="M19 4.2 19.8 6l1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8Z" fill="currentColor" opacity=".55" stroke="none"/>',

    parent:
      '<circle cx="9" cy="6.5" r="2.7"/>' +
      '<path d="M4 20v-2.5a5 5 0 0 1 10 0V20"/>' +
      '<circle cx="17.5" cy="11.5" r="2.2"/>' +
      '<path d="M14.3 20v-3.3a3.2 3.2 0 0 1 6.4 0V20"/>',

    trash:
      '<path d="M4.5 7h15M9.3 7V4.2h5.4V7"/>' +
      '<path d="m6.8 7 .9 12.2a1.5 1.5 0 0 0 1.5 1.4h5.6a1.5 1.5 0 0 0 1.5-1.4L17.2 7"/>' +
      '<path d="M10 11v5.5M14 11v5.5"/>',

    info:
      '<circle cx="12" cy="12" r="8.7"/>' +
      '<circle cx="12" cy="7.8" r="1.15" fill="currentColor" stroke="none"/>' +
      '<path d="M12 11v5.5"/>',

    'chevron-down':
      '<path d="m6.5 9.2 5.5 5.4 5.5-5.4"/>',

    dot:
      '<circle cx="12" cy="12" r="4.6" fill="currentColor" stroke="none"/>',

    record:
      '<circle cx="12" cy="12" r="8.5"/>' +
      '<circle cx="12" cy="12" r="3.8" fill="currentColor" stroke="none"/>',

    'sound-wave':
      '<path d="M3.5 10v4M8 7.2v9.6M12.5 3.8v16.4M17 7.2v9.6M21 10v4"/>',

    clock:
      '<circle cx="12" cy="12" r="8.7"/>' +
      '<path d="M12 7v5.2l3.5 2"/>',

    heart:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8Z" fill="currentColor" fill-opacity=".13" stroke="none"/>' +
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8Z"/>'
  };

  var NAMES = Object.freeze([
    'speaker', 'mute', 'replay', 'back', 'close', 'gear', 'star', 'lock',
    'check', 'mic', 'stop', 'play', 'home', 'arrow-right', 'arrow-left',
    'refresh', 'trophy', 'leaf', 'sparkle', 'parent', 'trash', 'info',
    'chevron-down', 'dot', 'record', 'sound-wave', 'clock', 'heart'
  ]);

  function composeClass(extra) {
    var classes = ['icon'];
    if (extra !== null && typeof extra !== 'undefined' && extra !== false) {
      String(extra).split(/\s+/).forEach(function (name) {
        if (name && classes.indexOf(name) === -1) classes.push(name);
      });
    }
    return classes.join(' ');
  }

  function icon(name, className) {
    var el = document.createElementNS(SVG_NS, 'svg');
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('width', '24');
    el.setAttribute('height', '24');
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', 'currentColor');
    el.setAttribute('stroke-width', '2.2');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('focusable', 'false');
    el.setAttribute('class', composeClass(className));
    el.innerHTML = Object.prototype.hasOwnProperty.call(ICONS, name) ? ICONS[name] : '';
    return el;
  }

  BEAR.icons = {
    svg: icon,
    names: NAMES
  };
}(window));
