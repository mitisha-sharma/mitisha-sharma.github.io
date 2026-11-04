/* ==========================================================================
   MITISHA'S WORLD  |  js/common.js
   Loaded on every page. Handles:
   - saving progress (localStorage, wrapped in try/catch, memory fallback)
   - XP and levels, the XP chip in the header
   - sound (OFF by default) and the mute toggle
   - toasts, modal dialogs, the smiley that changes faces
   - marking a room as visited
   Needs js/config.js and js/avatar.js loaded first.
   ========================================================================== */
(function () {
  window.MW = window.MW || {};
  var cfg = MW.config || { rooms: [], levelNames: ['player'], xpPerLevel: 60, stars: [] };
  var KEY = 'mw-save-v1';

  MW.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------------------------------------------------------------- store */
  function defaults() {
    return { visited: {}, stars: [], stickers: {}, games: { morse: 0, hire: 0, reverse: 0, timeline: 0 }, sound: false, ticket: false };
  }
  function merge(base, extra) {
    if (!extra || typeof extra !== 'object') return base;
    Object.keys(base).forEach(function (k) {
      if (!(k in extra)) return;
      var b = base[k], e = extra[k];
      if (Array.isArray(b)) { if (Array.isArray(e)) base[k] = e.slice(); }
      else if (b && typeof b === 'object') { if (e && typeof e === 'object') base[k] = merge(b, e); }
      else if (typeof e === typeof b) base[k] = e;
    });
    return base;
  }
  function readStorage() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) return merge(defaults(), JSON.parse(raw));
    } catch (e) { /* storage blocked or broken: carry on in memory */ }
    return null;
  }
  var data = readStorage() || defaults();
  var storageWorks = true;
  function persist() {
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); storageWorks = true; }
    catch (e) { storageWorks = false; }
  }

  /* ------------------------------------------------------------------- xp */
  function roomIds() { return cfg.rooms.map(function (r) { return r.id; }); }
  function xpOf(d) {
    var ids = roomIds();
    var rooms = Object.keys(d.visited).filter(function (k) { return ids.indexOf(k) > -1 && d.visited[k]; }).length;
    var stickers = Object.keys(d.stickers).filter(function (k) { return d.stickers[k]; }).length;
    var g = d.games || {};
    return rooms * 10 + d.stars.length * 15 + stickers +
      (g.morse ? 30 : 0) + (g.hire ? 50 : 0) + Math.min(5, g.reverse || 0) * 10 + (g.timeline ? 30 : 0);
  }
  function levelOf(xp) { return 1 + Math.floor(xp / cfg.xpPerLevel); }

  MW.xp = {
    total: function () { return xpOf(data); },
    level: function () { return levelOf(xpOf(data)); },
    levelName: function () {
      var n = cfg.levelNames;
      return n[Math.min(n.length - 1, levelOf(xpOf(data)) - 1)];
    },
    progress: function () { return (xpOf(data) % cfg.xpPerLevel) / cfg.xpPerLevel; },
    into: function () { return xpOf(data) % cfg.xpPerLevel; },
    per: cfg.xpPerLevel
  };

  MW.store = {
    get: function () { return data; },
    works: function () { return storageWorks; },
    /* change the save inside fn(data); reason is shown in the toast */
    update: function (fn, reason) {
      var before = xpOf(data), lvBefore = levelOf(before);
      fn(data);
      persist();
      var after = xpOf(data), lvAfter = levelOf(after);
      renderChip();
      window.dispatchEvent(new CustomEvent('mw:change', { detail: { xp: after, gained: after - before } }));
      if (after > before) {
        MW.toast('+' + (after - before) + ' XP' + (reason ? ': ' + reason : ''));
        if (lvAfter > lvBefore) {
          setTimeout(function () { MW.toast('Level up! You are now level ' + lvAfter + ': ' + MW.xp.levelName(), { kind: 'level' }); MW.sound.play('level'); }, 700);
        }
      }
    },
    reset: function () { data = defaults(); persist(); renderChip(); window.dispatchEvent(new CustomEvent('mw:change', { detail: { reset: true } })); }
  };

  /* keep several tabs in sync */
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    var fresh = readStorage();
    if (fresh) { data = fresh; renderChip(); window.dispatchEvent(new CustomEvent('mw:change', { detail: { external: true } })); }
  });

  /* ------------------------------------------------------------ xp chip */
  function setAll(sel, fn) {
    var list = document.querySelectorAll(sel);
    for (var i = 0; i < list.length; i++) fn(list[i]);
  }
  function renderChip() {
    var lv = MW.xp.level(), name = MW.xp.levelName(), pct = Math.round(MW.xp.progress() * 100);
    setAll('[data-xp-lv]', function (el) { el.textContent = lv; });
    setAll('[data-xp-name]', function (el) { el.textContent = name; });
    setAll('[data-xp-fill]', function (el) { el.style.width = pct + '%'; });
    setAll('[data-xp-text]', function (el) { el.textContent = MW.xp.total() + ' XP'; });
    setAll('[data-xp-detail]', function (el) { el.textContent = MW.xp.into() + ' of ' + MW.xp.per + ' XP to the next level'; });
    setAll('[data-star-count]', function (el) { el.textContent = data.stars.length; });
    setAll('[data-xp-bar]', function (el) { el.setAttribute('aria-valuenow', pct); });
    setAll('canvas[data-avatar]', function (el) { if (MW.avatar) MW.avatar.paint(el, el.getAttribute('data-avatar') || 'down'); });
  }
  MW.renderChip = renderChip;

  /* ---------------------------------------------------------------- toast */
  var toastBox = null;
  MW.toast = function (msg, opts) {
    opts = opts || {};
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.className = 'toasts';
      toastBox.setAttribute('role', 'status');
      toastBox.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastBox);
    }
    var t = document.createElement('div');
    t.className = 'toast' + (opts.kind ? ' toast-' + opts.kind : '');
    t.textContent = msg;
    toastBox.appendChild(t);
    while (toastBox.children.length > 3) toastBox.removeChild(toastBox.firstChild);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, opts.ms || 3400);
  };

  /* ---------------------------------------------------------------- sound */
  var audio = null;
  function ensureAudio() {
    if (audio) return audio;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { audio = new AC(); } catch (e) { audio = null; }
    return audio;
  }
  function beep(freq, start, dur, type, vol) {
    var a = ensureAudio();
    if (!a) return;
    if (a.state === 'suspended' && a.resume) a.resume();
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    var t0 = a.currentTime + (start || 0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.06, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  var held = null;
  MW.sound = {
    isOn: function () { return !!data.sound; },
    syncLabel: function () {
      var on = !!data.sound;
      setAll('[data-sound-toggle]', function (el) {
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
        var lab = el.querySelector('[data-sound-label]');
        if (lab) lab.textContent = on ? 'Sound: on' : 'Sound: off';
      });
    },
    set: function (on) {
      data.sound = !!on; persist();
      if (on) { ensureAudio(); if (audio && audio.state === 'suspended' && audio.resume) audio.resume(); }
      MW.sound.syncLabel();
      if (on) MW.sound.play('coin');
    },
    toggle: function () { MW.sound.set(!data.sound); },
    play: function (name) {
      if (!data.sound) return;
      var seq = {
        coin:  [[988, 0, .07], [1319, .07, .16]],
        door:  [[392, 0, .08], [523, .08, .08], [659, .16, .14]],
        star:  [[784, 0, .08], [1175, .08, .08], [1568, .16, .2]],
        level: [[523, 0, .1], [659, .1, .1], [784, .2, .1], [1047, .3, .25]],
        win:   [[523, 0, .1], [659, .1, .1], [784, .2, .1], [1047, .3, .1], [1319, .4, .3]],
        good:  [[660, 0, .08], [880, .08, .14]],
        bad:   [[160, 0, .16, 'sawtooth'], [120, .1, .2, 'sawtooth']],
        dot:   [[700, 0, .07, 'sine', .08]],
        dash:  [[700, 0, .22, 'sine', .08]],
        tick:  [[300, 0, .03, 'square', .03]]
      }[name];
      if (!seq) return;
      seq.forEach(function (n) { beep(n[0], n[1], n[2], n[3], n[4]); });
    },
    /* a steady tone while a button is held (Blink Morse) */
    toneStart: function (freq) {
      if (!data.sound || held) return;
      var a = ensureAudio(); if (!a) return;
      if (a.state === 'suspended' && a.resume) a.resume();
      var o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = freq || 700;
      g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.08, a.currentTime + 0.01);
      o.connect(g); g.connect(a.destination); o.start();
      held = { o: o, g: g };
    },
    toneStop: function () {
      if (!held) return;
      var a = audio, h = held; held = null;
      try { h.g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.04); h.o.stop(a.currentTime + 0.06); } catch (e) { /* already stopped */ }
    }
  };

  /* --------------------------------------------------------------- modal */
  var modalStack = [];
  MW.modal = {
    open: function (opts) {
      var back = document.createElement('div');
      back.className = 'modal-back';
      var box = document.createElement('div');
      box.className = 'modal' + (opts.className ? ' ' + opts.className : '');
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      var tid = 'modal-title-' + Math.random().toString(36).slice(2, 7);
      box.setAttribute('aria-labelledby', tid);
      var head = document.createElement('div');
      head.className = 'modal-head';
      var h = document.createElement('h2');
      h.id = tid; h.className = 'modal-title'; h.textContent = opts.title || '';
      var close = document.createElement('button');
      close.type = 'button'; close.className = 'btn btn-sm modal-close';
      close.textContent = 'Close';
      head.appendChild(h); head.appendChild(close);
      var body = document.createElement('div');
      body.className = 'modal-body';
      if (opts.content) body.appendChild(opts.content);
      box.appendChild(head); box.appendChild(body);
      back.appendChild(box);
      document.body.appendChild(back);
      document.documentElement.classList.add('modal-open');
      var prev = document.activeElement;
      var api = {
        el: box, body: body,
        close: function () {
          if (!back.parentNode) return;
          back.parentNode.removeChild(back);
          modalStack = modalStack.filter(function (m) { return m !== api; });
          if (!modalStack.length) document.documentElement.classList.remove('modal-open');
          document.removeEventListener('keydown', onKey, true);
          if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* element gone */ } }
          if (opts.onClose) opts.onClose();
        }
      };
      function onKey(e) {
        if (modalStack[modalStack.length - 1] !== api) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); api.close(); return; }
        if (e.key === 'Tab') {
          var f = box.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener('keydown', onKey, true);
      close.addEventListener('click', api.close);
      back.addEventListener('pointerdown', function (e) { if (e.target === back) api.close(); });
      modalStack.push(api);
      setTimeout(function () { (opts.focus ? box.querySelector(opts.focus) : null) ? box.querySelector(opts.focus).focus() : close.focus(); }, 30);
      return api;
    },
    isOpen: function () { return modalStack.length > 0; }
  };

  /* -------------------------------------------------------- smiley faces */
  function wireFaces() {
    var hosts = document.querySelectorAll('.face-host');
    Array.prototype.forEach.call(hosts, function (h) {
      var n = 2;
      function change() { n = 2 + ((n - 1) % 5); h.setAttribute('data-face', String(n)); }
      h.addEventListener('pointerenter', change);
      h.addEventListener('focus', change, true);
    });
  }

  /* ------------------------------------------------------ small helpers */
  MW.byId = function (id) { return document.getElementById(id); };
  MW.el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function markVisited() {
    var id = document.body && document.body.getAttribute('data-room');
    if (!id || data.visited[id]) return;
    var room = cfg.rooms.filter(function (r) { return r.id === id; })[0];
    if (!room) return;
    MW.store.update(function (d) { d.visited[id] = 1; }, room.name + ' visited');
  }

  function init() {
    wireFaces();
    renderChip();
    MW.sound.syncLabel();           // sound stays silent until the visitor switches it on
    setAll('[data-sound-toggle]', function (el) {
      el.addEventListener('click', function () { MW.sound.toggle(); });
    });
    if (MW.avatar) MW.avatar.paintAll();
    markVisited();
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('pageshow', function (e) { if (e.persisted) renderChip(); });
})();
