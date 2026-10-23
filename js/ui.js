/* DOM helpers, dialogs, toasts, stars and paper confetti. No framework. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};
  const doc = root.document;
  let overlaySeq = 0;
  let openSheets = 0;
  const openModals = [];

  function el(tag, attrs, ...children) {
    const node = doc.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((key) => {
        const value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class' || key === 'className') {
          node.className = value;
        } else if (key === 'text') {
          node.textContent = value;
        } else if (key === 'html') {
          node.innerHTML = value;
        } else if (key === 'dataset') {
          Object.keys(value).forEach((k) => { node.dataset[k] = value[k]; });
        } else if (key === 'style' && typeof value === 'object') {
          Object.keys(value).forEach((k) => { node.style[k] = value[k]; });
        } else if (key.startsWith('on') && typeof value === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
          node.setAttribute(key, value === true ? '' : String(value));
        }
      });
    }
    append(node, children);
    return node;
  }

  function append(parent, children) {
    (children || []).forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      if (Array.isArray(child)) {
        append(parent, child);
      } else if (typeof child === 'string' || typeof child === 'number') {
        parent.appendChild(doc.createTextNode(String(child)));
      } else if (child.nodeType) {
        parent.appendChild(child);
      }
    });
  }

  function icon(name, className) {
    if (BEAR.icons && typeof BEAR.icons.svg === 'function') {
      try {
        const node = BEAR.icons.svg(name, className);
        if (node) {
          if (className && node.classList) node.classList.add(className);
          return node;
        }
      } catch (err) { /* fall through to a harmless placeholder */ }
    }
    return el('span', {
      class: 'icon icon--missing' + (className ? ' ' + className : ''),
      'aria-hidden': 'true'
    });
  }

  function button(opts) {
    opts = opts || {};
    const classes = ['btn', 'btn--' + (opts.variant || 'secondary')];
    if (opts.size) classes.push('btn--' + opts.size);
    if (opts.iconOnly) classes.push('btn--icon');
    if (opts.className) classes.push(opts.className);
    const attrs = {
      class: classes.join(' '),
      type: opts.type || 'button'
    };
    if (opts.disabled) attrs.disabled = true;
    if (opts.ariaLabel) attrs['aria-label'] = opts.ariaLabel;
    if (opts.title) attrs.title = opts.title;
    if (opts.pressed !== undefined) attrs['aria-pressed'] = opts.pressed ? 'true' : 'false';
    if (opts.id) attrs.id = opts.id;
    if (opts.testId) attrs['data-testid'] = opts.testId;

    const node = el('button', attrs);
    if (opts.iconName) {
      node.appendChild(icon(opts.iconName, 'btn__icon'));
    }
    if (opts.label) {
      node.appendChild(el('span', { class: 'btn__label', text: opts.label }));
    }
    if (opts.children) append(node, [opts.children]);
    if (typeof opts.onClick === 'function') {
      node.addEventListener('click', (event) => {
        if (node.disabled) return;
        if (!opts.quiet && BEAR.sfx) BEAR.sfx.play('tap');
        opts.onClick(event);
      });
    }
    return node;
  }

  function iconButton(name, label, onClick, opts) {
    opts = opts || {};
    return button({
      iconName: name,
      ariaLabel: label,
      title: opts.title || label,
      iconOnly: true,
      variant: opts.variant || 'ghost',
      size: opts.size || 'md',
      className: opts.className,
      onClick,
      quiet: opts.quiet,
      pressed: opts.pressed,
      disabled: opts.disabled
    });
  }

  function starRow(count, total, opts) {
    opts = opts || {};
    total = total === undefined ? 3 : total;
    const node = el('span', {
      class: 'stars' + (opts.className ? ' ' + opts.className : ''),
      role: 'img',
      'aria-label': count + ' / ' + total + ' 颗星'
    });
    for (let i = 0; i < total; i += 1) {
      const filled = i < count;
      node.appendChild(el('span', {
        class: 'stars__item' + (filled ? ' stars__item--on' : ''),
        'aria-hidden': 'true'
      }, icon('star', 'stars__icon')));
    }
    return node;
  }

  function dots(total, current, label) {
    const node = el('span', {
      class: 'dots',
      role: 'img',
      'aria-label': label || ('第 ' + (current + 1) + ' 步，共 ' + total + ' 步')
    });
    for (let i = 0; i < total; i += 1) {
      let cls = 'dots__dot';
      if (i < current) cls += ' dots__dot--done';
      if (i === current) cls += ' dots__dot--now';
      node.appendChild(el('span', { class: cls, 'aria-hidden': 'true' }));
    }
    return node;
  }

  function topbar(opts) {
    opts = opts || {};
    const bar = el('header', { class: 'topbar' + (opts.className ? ' ' + opts.className : '') });
    if (opts.back !== false) {
      bar.appendChild(iconButton(opts.backIcon || 'back', opts.backLabel || '返回', () => {
        if (typeof opts.onBack === 'function') opts.onBack();
        else if (root.BEAR.router) root.BEAR.router.back();
      }, { className: 'topbar__back' }));
    }
    const titleWrap = el('div', { class: 'topbar__titles' });
    const title = opts.titleEl || el('h1', {
      class: 'topbar__title',
      tabindex: '-1',
      text: opts.title || ''
    });
    titleWrap.appendChild(title);
    if (opts.subtitle) titleWrap.appendChild(el('p', { class: 'topbar__subtitle', text: opts.subtitle }));
    if (opts.center) titleWrap.appendChild(opts.center);
    bar.appendChild(titleWrap);
    const right = el('div', { class: 'topbar__right' });
    append(right, [opts.right]);
    bar.appendChild(right);
    bar.__title = title;
    return bar;
  }

  function lockScroll() {
    openSheets += 1;
    doc.body.classList.add('is-locked');
  }

  function unlockScroll() {
    openSheets = Math.max(0, openSheets - 1);
    if (!openSheets) doc.body.classList.remove('is-locked');
  }

  function focusables(container) {
    return Array.prototype.slice.call(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((node) => node.offsetParent !== null || node === doc.activeElement);
  }

  function modal(opts) {
    opts = opts || {};
    const overlayRoot = doc.getElementById('overlay-root') || doc.body;
    const id = 'sheet-title-' + (++overlaySeq);
    const previous = doc.activeElement;
    const overlay = el('div', { class: 'overlay' });
    const sheet = el('div', {
      class: 'sheet' + (opts.className ? ' ' + opts.className : ''),
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': id,
      tabindex: '-1'
    });
    const head = el('div', { class: 'sheet__head' });
    if (opts.iconName) {
      head.appendChild(el('span', { class: 'sheet__icon', 'aria-hidden': 'true' }, icon(opts.iconName, 'sheet__icon-svg')));
    }
    head.appendChild(el('h2', { class: 'sheet__title', id, text: opts.title || '' }));
    sheet.appendChild(head);

    const body = el('div', { class: 'sheet__body' });
    append(body, [opts.body]);
    sheet.appendChild(body);

    let closed = false;
    openModals.push(close);
    function close(result) {
      if (closed) return;
      closed = true;
      const idx = openModals.indexOf(close);
      if (idx !== -1) openModals.splice(idx, 1);
      doc.removeEventListener('keydown', onKey, true);
      overlay.classList.add('overlay--closing');
      unlockScroll();
      const finish = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (previous && typeof previous.focus === 'function') {
          try { previous.focus({ preventScroll: true }); } catch (err) { previous.focus(); }
        }
        if (typeof opts.onClose === 'function') opts.onClose(result);
      };
      if (reduceMotion()) finish();
      else root.setTimeout(finish, 160);
      if (typeof opts.onClosed === 'function') opts.onClosed(result);
    }

    if (opts.dismissible !== false) {
      head.appendChild(iconButton('close', '关闭', () => close('dismiss'), {
        className: 'sheet__close',
        variant: 'ghost'
      }));
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close('dismiss');
      });
    }

    const actionsNode = el('div', { class: 'sheet__actions' });
    (opts.actions || []).forEach((action) => {
      if (!action) return;
      if (action.nodeType) {
        actionsNode.appendChild(action);
        return;
      }
      const node = button({
        label: action.label,
        variant: action.variant || 'secondary',
        iconName: action.iconName,
        className: action.className,
        onClick: () => {
          if (typeof action.onClick === 'function') action.onClick(close);
          if (action.close !== false) close(action.value === undefined ? 'action' : action.value);
        }
      });
      if (action.autofocus) node.setAttribute('data-autofocus', 'true');
      actionsNode.appendChild(node);
    });
    if (actionsNode.childNodes.length) sheet.appendChild(actionsNode);

    function onKey(event) {
      if (event.key === 'Escape' && opts.dismissible !== false) {
        event.preventDefault();
        close('dismiss');
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables(sheet);
      if (!items.length) {
        event.preventDefault();
        sheet.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (doc.activeElement === first || doc.activeElement === sheet)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    overlay.appendChild(sheet);
    overlayRoot.appendChild(overlay);
    lockScroll();
    doc.addEventListener('keydown', onKey, true);
    root.requestAnimationFrame(() => {
      overlay.classList.add('overlay--open');
      const auto = sheet.querySelector('[data-autofocus="true"]');
      const items = focusables(sheet);
      (auto || items[0] || sheet).focus();
    });

    return { node: overlay, sheet, close };
  }

  function confirm(opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      modal({
        title: opts.title || '确认',
        body: opts.body || el('p', { text: opts.message || '' }),
        iconName: opts.iconName || 'info',
        className: opts.className,
        onClose: () => done(false),
        actions: [
          { label: opts.cancelText || '取消', variant: 'secondary' },
          {
            label: opts.confirmText || '确定',
            variant: opts.danger ? 'danger' : 'primary',
            iconName: opts.confirmIcon,
            onClick: () => done(true)
          }
        ]
      });
    });
  }

  let toastSeq = 0;
  function toast(message, opts) {
    opts = opts || {};
    const rootNode = doc.getElementById('toast-root') || doc.body;
    const node = el('div', {
      class: 'toast toast--' + (opts.tone || 'info'),
      role: 'status',
      'data-toast': String(++toastSeq)
    }, [opts.iconName ? icon(opts.iconName, 'toast__icon') : null, el('span', { text: message })]);
    rootNode.appendChild(node);
    root.requestAnimationFrame(() => node.classList.add('toast--in'));
    const ttl = opts.duration || 2800;
    root.setTimeout(() => {
      node.classList.remove('toast--in');
      node.classList.add('toast--out');
      root.setTimeout(() => {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 220);
    }, ttl);
    return node;
  }

  function announce(message) {
    const live = doc.getElementById('sr-live');
    if (!live) return;
    live.textContent = '';
    root.setTimeout(() => { live.textContent = message; }, 30);
  }

  function reduceMotion() {
    return !!(doc.body && doc.body.classList.contains('reduce-motion'));
  }

  function confetti(opts) {
    opts = opts || {};
    if (reduceMotion()) return;
    const count = opts.count || 36;
    const wrap = el('div', { class: 'confetti', 'aria-hidden': 'true' });
    const colors = ['var(--sun)', 'var(--leaf)', 'var(--action)', 'var(--sky)', 'var(--gold)'];
    for (let i = 0; i < count; i += 1) {
      const left = Math.random() * 100;
      const drift = (Math.random() * 2 - 1) * 30;
      const rotate = Math.round(Math.random() * 720 - 360);
      const delay = Math.round(Math.random() * 220);
      const duration = 900 + Math.round(Math.random() * 550);
      const size = 7 + Math.round(Math.random() * 8);
      wrap.appendChild(el('span', {
        class: 'confetti__piece' + (i % 3 === 0 ? ' confetti__piece--round' : ''),
        style: {
          left: left + '%',
          width: size + 'px',
          height: (i % 3 === 0 ? size : size * 0.55) + 'px',
          background: colors[i % colors.length],
          animationDelay: delay + 'ms',
          animationDuration: duration + 'ms',
          '--drift': drift + 'px',
          '--rot': rotate + 'deg'
        }
      }));
    }
    doc.body.appendChild(wrap);
    root.setTimeout(() => {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }, 1900);
  }

  function setTitle(text) {
    doc.title = text ? text + ' · 小熊英语游戏' : '小熊英语游戏 · Bear’s English Playtime';
  }

  function chip(opts) {
    opts = opts || {};
    const node = el('button', {
      type: 'button',
      class: 'chip' + (opts.active ? ' chip--active' : '') + (opts.className ? ' ' + opts.className : ''),
      'aria-pressed': opts.active ? 'true' : 'false'
    });
    if (opts.iconName) node.appendChild(icon(opts.iconName, 'chip__icon'));
    if (opts.label) node.appendChild(el('span', { text: opts.label }));
    if (typeof opts.onClick === 'function') {
      node.addEventListener('click', () => {
        if (BEAR.sfx) BEAR.sfx.play('tap');
        opts.onClick();
      });
    }
    return node;
  }

  function switchRow(opts) {
    const id = 'switch-' + (++overlaySeq);
    const input = el('input', { type: 'checkbox', id, class: 'switch__input', role: 'switch' });
    input.checked = !!opts.checked;
    const row = el('div', { class: 'switch-row' }, [
      el('div', { class: 'switch-row__text' }, [
        el('label', { class: 'switch-row__label', for: id, text: opts.label }),
        opts.hint ? el('p', { class: 'switch-row__hint', text: opts.hint }) : null
      ]),
      el('label', { class: 'switch', for: id }, [
        input,
        el('span', { class: 'switch__track', 'aria-hidden': 'true' }, el('span', { class: 'switch__thumb' }))
      ])
    ]);
    input.addEventListener('change', () => {
      if (BEAR.sfx) BEAR.sfx.play('tap');
      if (typeof opts.onChange === 'function') opts.onChange(input.checked);
    });
    return row;
  }

  function emptyState(opts) {
    opts = opts || {};
    return el('div', { class: 'empty' }, [
      el('span', { class: 'empty__art', 'aria-hidden': 'true' }, icon(opts.iconName || 'leaf', 'empty__icon')),
      el('h2', { class: 'empty__title', text: opts.title || '' }),
      opts.message ? el('p', { class: 'empty__text', text: opts.message }) : null,
      opts.action || null
    ]);
  }

  function closeAll() {
    openModals.slice().reverse().forEach((fn) => {
      try { fn('route'); } catch (err) {}
    });
  }

  BEAR.ui = {
    el,
    append,
    icon,
    button,
    iconButton,
    starRow,
    dots,
    topbar,
    modal,
    confirm,
    toast,
    announce,
    confetti,
    reduceMotion,
    setTitle,
    chip,
    switchRow,
    emptyState,
    closeAll
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = BEAR.ui;
})(typeof globalThis !== 'undefined' ? globalThis : this);
