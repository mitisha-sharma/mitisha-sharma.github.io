/* ==========================================================================
   MITISHA'S WORLD  |  js/world.js
   The game engine for index.html: walking, collision, doors, hidden stars,
   the character sheet and the how-to-play dialog.

   Controls
     keyboard : arrow keys or WASD to walk, Enter / Space / E at a door
     touch    : drag anywhere to walk, tap a building to walk to its door
     mouse    : click a building (or the ground) to walk there

   Needs: config.js, avatar.js, common.js, art.js (and games.js for pop-up games)
   ========================================================================== */
(function () {
  var A = MW.art, T = A.T, C = A.C;
  var canvas = document.getElementById('world');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var stage = document.getElementById('stage');
  var promptBtn = document.getElementById('prompt');
  var promptText = document.getElementById('prompt-text');
  var stick = document.getElementById('stick');
  var iris = document.getElementById('iris');
  var live = document.getElementById('live');
  var reduced = MW.reducedMotion;

  var layers = null;
  var P = { x: 18 * T + 8, y: 18 * T + 14, dir: 'down', walk: 0, moving: false };
  var keys = {};
  var touch = null;                     // unit vector from dragging
  var path = null, autoEnter = null, stuck = 0;
  var near = null, entering = false;
  var view = { s: 2, w: 0, h: 0, cx: 0, cy: 0 };
  var parts = [];
  var clock = 0;
  var interactables = A.BUILDINGS.concat(A.EVENTS);
  var starDefs = (MW.config.stars || []).map(function (s) { return { id: s.id, x: s.x * T, y: s.y * T, clue: s.clue }; });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function foundIds() { return MW.store.get().stars; }
  function isFound(id) { return foundIds().indexOf(id) > -1; }

  /* ------------------------------------------------------------ sizing */
  function resize() {
    var r = stage.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.max(2, Math.round(r.width * dpr));
    canvas.height = Math.max(2, Math.round(r.height * dpr));
    var cssScale = clamp(Math.floor(r.width / 320), 2, 5);
    view.s = Math.max(1, Math.round(cssScale * dpr));
    view.w = canvas.width / view.s;
    view.h = canvas.height / view.s;
    var tb = document.querySelector('.topbar');
    if (tb) document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px');
  }

  /* ------------------------------------------------------- collision + paths */
  function hits(nx, ny) {
    var x0 = Math.floor((nx - 4) / T), x1 = Math.floor((nx + 3.99) / T);
    var y0 = Math.floor((ny - 5) / T), y1 = Math.floor((ny - 0.01) / T);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (A.isSolid(x, y)) return true;
    return false;
  }
  function tileOf(x, y) { return { x: Math.floor(x / T), y: Math.floor((y - 1) / T) }; }
  function nearestFree(t) {
    if (!A.isSolid(t.x, t.y)) return t;
    for (var r = 1; r < 8; r++) {
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (!A.isSolid(t.x + dx, t.y + dy)) return { x: t.x + dx, y: t.y + dy };
      }
    }
    return null;
  }
  function bfs(from, to) {
    var W = A.W, H = A.H, prev = {}, q = [from], k0 = from.x + ',' + from.y;
    prev[k0] = null;
    while (q.length) {
      var c = q.shift();
      if (c.x === to.x && c.y === to.y) {
        var out = [], cur = c;
        while (cur && !(cur.x === from.x && cur.y === from.y)) { out.unshift({ x: cur.x, y: cur.y }); cur = prev[cur.x + ',' + cur.y]; }
        return out;
      }
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c.x + d[0], ny = c.y + d[1], k = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || k in prev || A.isSolid(nx, ny)) return;
        prev[k] = c; q.push({ x: nx, y: ny });
      });
    }
    return null;
  }
  function walkTo(wx, wy) {
    var goal = nearestFree(tileOf(wx, wy));
    if (!goal) return false;
    var p = bfs(tileOf(P.x, P.y), goal);
    path = p && p.length ? p : null;
    stuck = 0;
    return !!path;
  }
  MW.pathTo = function (tx, ty, from) { return bfs(from, { x: tx, y: ty }); };   // used by the self-test

  /* ----------------------------------------------------------- interaction */
  function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
  function findNear() {
    for (var i = 0; i < interactables.length; i++) if (inRect(P.x, P.y - 2, interactables[i].zone)) return interactables[i];
    return null;
  }
  function label(it) { return it.page ? 'Open ' + it.open + ' (' + it.name + ')' : 'Play ' + it.name; }
  function setNear(it) {
    if (it === near) return;
    near = it;
    if (it) {
      promptText.textContent = label(it);
      promptBtn.hidden = false;
      live.textContent = 'You are at ' + it.name + '. Press Enter to ' + (it.page ? 'open ' + it.open + '.' : 'play.');
    } else {
      promptBtn.hidden = true;
      live.textContent = '';
    }
  }
  function activate(it) {
    if (!it || entering || MW.modal.isOpen()) return;
    if (it.page) {
      entering = true;
      MW.sound.play('door');
      var sx = (P.x - view.cx) * view.s / (window.devicePixelRatio || 1);
      var sy = (P.y - 10 - view.cy) * view.s / (window.devicePixelRatio || 1);
      var r = stage.getBoundingClientRect();
      iris.style.setProperty('--ix', (sx / r.width * 100) + '%');
      iris.style.setProperty('--iy', (sy / r.height * 100) + '%');
      iris.classList.add('on');
      setTimeout(function () { window.location.href = it.page; }, reduced ? 0 : 520);
    } else if (it.game && MW.games) {
      MW.sound.play('coin');
      MW.games.openModal(it.game, { onClose: function () { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } });
    }
  }
  promptBtn.addEventListener('click', function () { activate(near); canvas.focus({ preventScroll: true }); });
  window.addEventListener('pageshow', function () { entering = false; iris.classList.remove('on'); });

  /* ----------------------------------------------------------------- input */
  function typing() {
    var a = document.activeElement;
    return a && a !== document.body && a !== canvas && /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(a.tagName);
  }
  var KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
  window.addEventListener('keydown', function (e) {
    if (MW.modal.isOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    var dirKey = KEYMAP[e.key];
    if (dirKey && !(typing() && e.key.length > 1)) {
      if (typing()) return;
      keys[dirKey] = true; e.preventDefault(); return;
    }
    if (typing()) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') {
      if (near) { e.preventDefault(); activate(near); }
    } else if (e.key === 'c' || e.key === 'C') { openSheet(); }
    else if (e.key === 'h' || e.key === 'H' || e.key === '?') { openHelp(); }
    else if (e.key === 'm' || e.key === 'M') { MW.sound.toggle(); }
  });
  window.addEventListener('keyup', function (e) { var k = KEYMAP[e.key]; if (k) keys[k] = false; });
  window.addEventListener('blur', function () { keys = {}; touch = null; });

  var ptr = null;
  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), drag: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    var dx = e.clientX - ptr.x, dy = e.clientY - ptr.y, d = Math.hypot(dx, dy);
    if (!ptr.drag && d > 12) {
      ptr.drag = true; path = null; autoEnter = null;
      var r = stage.getBoundingClientRect();
      stick.style.left = (ptr.x - r.left) + 'px'; stick.style.top = (ptr.y - r.top) + 'px'; stick.hidden = false;
    }
    if (ptr.drag) {
      var m = Math.min(d, 46);
      touch = d > 8 ? { x: dx / d * (m / 46), y: dy / d * (m / 46) } : null;
      var knob = stick.firstElementChild;
      if (knob) knob.style.transform = 'translate(' + (d ? dx / d * m : 0) + 'px,' + (d ? dy / d * m : 0) + 'px)';
    }
  });
  function endPointer(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    var wasDrag = ptr.drag, quick = performance.now() - ptr.t < 450;
    var cx = ptr.x, cy = ptr.y;
    ptr = null; touch = null; stick.hidden = true;
    if (!wasDrag && quick && e.type === 'pointerup') tap(cx, cy);
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  function tap(clientX, clientY) {
    if (MW.modal.isOpen()) return;
    var r = canvas.getBoundingClientRect();
    var wx = view.cx + (clientX - r.left) / r.width * view.w;
    var wy = view.cy + (clientY - r.top) / r.height * view.h;
    var hit = null;
    for (var i = 0; i < interactables.length; i++) if (inRect(wx, wy, interactables[i].bounds)) { hit = interactables[i]; break; }
    if (hit) {
      if (near === hit) { activate(hit); return; }
      if (walkTo(hit.center.x, hit.center.y)) autoEnter = hit;
    } else {
      autoEnter = null;
      walkTo(wx, wy);
    }
  }

  /* ----------------------------------------------------------------- update */
  function update(dt) {
    var vx = 0, vy = 0;
    if (keys.left) vx -= 1; if (keys.right) vx += 1; if (keys.up) vy -= 1; if (keys.down) vy += 1;
    if (touch) { vx = touch.x; vy = touch.y; }
    var manual = vx !== 0 || vy !== 0;
    if (manual) { path = null; autoEnter = null; }
    else if (path && path.length) {
      var wp = path[0], tx = wp.x * T + 8, ty = wp.y * T + 12;
      var dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { path.shift(); if (!path.length) path = null; }
      else { vx = dx / d; vy = dy / d; }
    }
    var len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; len = 1; }
    if (len > 0.05) {
      var sp = 66 * dt, ox = P.x, oy = P.y;
      var nx = P.x + vx * sp; if (!hits(nx, P.y)) P.x = nx;
      var ny = P.y + vy * sp; if (!hits(P.x, ny)) P.y = ny;
      P.moving = true; P.walk += dt;
      if (Math.abs(vx) > Math.abs(vy)) P.dir = vx > 0 ? 'right' : 'left'; else P.dir = vy > 0 ? 'down' : 'up';
      if (path && Math.abs(P.x - ox) + Math.abs(P.y - oy) < 0.05) { stuck += dt; if (stuck > 0.6) { path = null; autoEnter = null; } } else stuck = 0;
    } else { P.moving = false; P.walk = 0; }

    setNear(findNear());
    if (autoEnter && !path && !manual) {
      var go = autoEnter; autoEnter = null;
      if (near === go) setTimeout(function () { if (near === go) activate(go); }, 140);
    }

    // stars
    starDefs.forEach(function (s) {
      if (isFound(s.id)) return;
      if (Math.hypot(P.x - s.x, (P.y - 4) - s.y) < 11) collectStar(s);
    });

    // particles
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt;
      if (p.life <= 0) parts.splice(i, 1);
    }
  }

  function burst(x, y, n) {
    if (reduced) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, s = 20 + Math.random() * 40;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, g: 90, life: .7 + Math.random() * .4, col: [C.yellow, C.pink, C.paper, C.mint][i % 4] });
    }
  }
  function collectStar(s) {
    MW.store.update(function (d) { if (d.stars.indexOf(s.id) < 0) d.stars.push(s.id); }, 'star found');
    MW.sound.play('star');
    burst(s.x, s.y, 16);
    parts.push({ x: s.x - 6, y: s.y - 10, vx: 0, vy: -14, life: 1.1, txt: '+15' });
    var have = foundIds().length, total = starDefs.length;
    live.textContent = 'You found a star. ' + have + ' of ' + total + '.';
    if (have >= total) setTimeout(allStars, 900);
  }
  function allStars() {
    MW.sound.play('win');
    var box = MW.el('div');
    box.appendChild(MW.el('p', 'lead', 'All 7 stars. A secret room just opened.'));
    box.appendChild(MW.el('p', '', 'It has a friendly message and a way to reach me.'));
    var a = MW.el('a', 'btn btn-red', 'Open the secret room'); a.href = 'hire-me.html';
    var p = MW.el('p', 'actions'); p.appendChild(a); box.appendChild(p);
    MW.modal.open({ title: 'You found every star!', content: box, focus: 'a.btn', onClose: function () { canvas.focus({ preventScroll: true }); } });
  }

  /* ------------------------------------------------------------------ draw */
  var STAR = ['..#..', '.###.', '#####', '.###.', '##.##'];
  function drawStar(x, y, big, col) {
    x = Math.round(x); y = Math.round(y);
    var o = big ? 1 : 0;
    ctx.fillStyle = C.ink;
    for (var r = 0; r < 5; r++) for (var k = 0; k < 5; k++) if (STAR[r].charAt(k) === '#') ctx.fillRect(x - 3 + k - 1 * 0, y - 3 + r + 1, 1, 1);
    ctx.fillStyle = col || C.yellow;
    for (var r2 = 0; r2 < 5; r2++) for (var k2 = 0; k2 < 5; k2++) if (STAR[r2].charAt(k2) === '#') ctx.fillRect(x - 3 + k2, y - 3 + r2, 1, 1);
    if (big) { ctx.fillStyle = C.paper; ctx.fillRect(x - 1, y - 2, 1, 1); }
    return o;
  }
  function glint(x, y, a) {
    ctx.globalAlpha = a; ctx.fillStyle = C.yellow;
    ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
    ctx.globalAlpha = 1;
  }

  function draw() {
    var s = view.s, mw = A.W * T, mh = A.H * T;
    view.cx = view.w >= mw ? -Math.floor((view.w - mw) / 2) : clamp(Math.round(P.x - view.w / 2), 0, mw - Math.floor(view.w));
    view.cy = view.h >= mh ? -Math.floor((view.h - mh) / 2) : clamp(Math.round(P.y - 8 - view.h / 2), 0, mh - Math.floor(view.h));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(s, 0, 0, s, -view.cx * s, -view.cy * s);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(layers.base, 0, 0);

    var t = reduced ? 0 : clock;
    // pond sparkle
    if (!reduced) {
      var ph = Math.floor(t * 2) % 3;
      ctx.fillStyle = '#fff';
      [[12, 23, 3, 2], [13, 24, 10, 8], [11, 25, 4, 10], [14, 23, 6, 3]].forEach(function (p, i) { if ((i + ph) % 3 === 0) ctx.fillRect(p[0] * T + p[2], p[1] * T + p[3], 3, 1); });
    }
    // little "?" bobs above mini-game pads that have not been played
    var g = MW.store.get().games;
    A.EVENTS.forEach(function (e) {
      var done = (e.game === 'morse' && g.morse) || (e.game === 'reverse' && g.reverse >= 5) || (e.game === 'timeline' && g.timeline);
      if (done) return;
      var by = e.ty * T - 4 + (reduced ? 0 : Math.round(Math.sin(t * 3 + e.tx) * 2));
      A.text(ctx, '!', e.tx * T + 15, by, C.red, 2);
    });
    // visited stars on the ground by each door
    var vis = MW.store.get().visited;
    A.BUILDINGS.forEach(function (b) { if (vis[b.id]) drawStar(b.door * T - 7, (b.ty + b.h) * T + 8, true, C.mint); });

    // hidden stars
    starDefs.forEach(function (st) {
      if (isFound(st.id)) return;
      var d = Math.hypot(P.x - st.x, P.y - st.y);
      var tw = reduced ? 1 : (Math.floor(t * 4 + st.x) % 2);
      if (d < 56) drawStar(st.x, st.y, tw, C.yellow);
      else if (d < 110) { ctx.globalAlpha = .75; drawStar(st.x, st.y, 0, C.yellow); ctx.globalAlpha = 1; }
      else glint(st.x, st.y, tw ? .55 : .3);
    });

    // trees, lamps and the player, sorted by their feet
    var items = [];
    var x0 = view.cx - 20, x1 = view.cx + view.w + 20, y0 = view.cy - 20, y1 = view.cy + view.h + 40;
    A.trees.forEach(function (tr) {
      var px = tr.x * T, py = tr.y * T;
      if (px < x0 || px > x1 || py < y0 || py > y1) return;
      items.push({ k: py + T, tree: tr });
    });
    A.lamps.forEach(function (l) { items.push({ k: l.y * T + T, lamp: l }); });
    items.push({ k: P.y, player: true });
    items.sort(function (a, b) { return a.k - b.k; });
    items.forEach(function (it) {
      if (it.tree) ctx.drawImage(layers.treeSprites[it.tree.v], it.tree.x * T - 1, it.tree.y * T - 8);
      else if (it.lamp) ctx.drawImage(layers.lampSprite, it.lamp.x * T + 3, it.lamp.y * T - 11);
      else drawPlayer();
    });
    ctx.drawImage(layers.over, 0, 0);

    drawEffects(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawPlayer() {
    var seq = [1, 0, 2, 0];
    var f = P.moving ? seq[Math.floor(P.walk * 8) % 4] : 0;
    var bob = (P.moving && f === 0 && !reduced) ? 1 : 0;
    ctx.fillStyle = 'rgba(23,20,31,.28)';
    ctx.fillRect(Math.round(P.x) - 5, Math.round(P.y) - 2, 10, 3);
    MW.avatar.draw(ctx, P.dir, f, Math.round(P.x), Math.round(P.y) - bob, 1, { hat: !!MW.store.get().ticket });
  }

  function drawEffects(t) {
    // chimney smoke
    var h = A.BUILDINGS[0];
    if (!reduced) for (var i = 0; i < 3; i++) {
      var ph = ((t * .5 + i / 3) % 1);
      ctx.globalAlpha = (1 - ph) * .8; ctx.fillStyle = C.paper;
      var r = 2 + Math.round(ph * 2);
      ctx.fillRect(Math.round(h.tx * T + h.w * T - 19 + Math.sin(ph * 6 + i) * 3), Math.round(h.ty * T - 16 - ph * 18), r, r);
    }
    ctx.globalAlpha = 1;
    // arcade lights
    var ar = A.BUILDINGS[1];
    for (var k = 0; k < 8; k++) {
      var on = reduced ? k % 2 : ((k + Math.floor(t * 3)) % 2);
      ctx.fillStyle = on ? C.red : C.yellow;
      ctx.fillRect(ar.tx * T + 34 + k * 8 + 2, ar.ty * T + 3, 3, 3); ctx.fillRect(ar.tx * T + 34 + k * 8 + 2, ar.ty * T + 25, 3, 3);
    }
    // studio ON AIR lamp
    var st = A.BUILDINGS[5];
    var lit = reduced || (Math.floor(t * 1.2) % 2 === 0);
    ctx.fillStyle = lit ? C.red : '#5A1A14'; ctx.fillRect(st.tx * T + st.w * T - 26, st.ty * T + 44, 18, 8);
    A.text(ctx, 'AIR', st.tx * T + st.w * T - 24, st.ty * T + 45, lit ? C.paper : '#8A3A30', 1);

    // arrow above the player when standing at a door or a game pad
    if (near) {
      var bob = reduced ? 0 : Math.round(Math.sin(clock * 6) * 2);
      var ax = Math.round(P.x), ay = Math.round(P.y - 36 + bob);
      ctx.fillStyle = C.ink; ctx.fillRect(ax - 5, ay - 1, 11, 2); ctx.fillRect(ax - 4, ay + 1, 9, 2); ctx.fillRect(ax - 3, ay + 3, 7, 2); ctx.fillRect(ax - 2, ay + 5, 5, 2); ctx.fillRect(ax - 1, ay + 7, 3, 1);
      ctx.fillStyle = C.red; ctx.fillRect(ax - 4, ay, 9, 1); ctx.fillRect(ax - 3, ay + 1, 7, 2); ctx.fillRect(ax - 2, ay + 3, 5, 2); ctx.fillRect(ax - 1, ay + 5, 3, 1);
    }
    // particles
    parts.forEach(function (p) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      if (p.txt) A.text(ctx, p.txt, Math.round(p.x), Math.round(p.y), C.ink, 1), A.text(ctx, p.txt, Math.round(p.x) - 1, Math.round(p.y) - 1, C.yellow, 1);
      else { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
    });
    ctx.globalAlpha = 1;
  }

  /* --------------------------------------------------------------- dialogs */
  function openSheet() {
    if (MW.modal.isOpen()) return;
    var cfg = MW.config, sh = cfg.sheet;
    var wrap = MW.el('div', 'sheet sheet-modal');
    var top = MW.el('div', 'sheet-top');
    var pt = MW.el('div', 'portrait'); var cv = document.createElement('canvas');
    cv.width = 80; cv.height = 92; cv.setAttribute('data-avatar', 'down'); cv.setAttribute('aria-hidden', 'true'); pt.appendChild(cv);
    var nm = MW.el('div'); nm.appendChild(MW.el('h3', 'sheet-name', sh.name)); nm.appendChild(MW.el('p', 'sheet-class', sh.cls));
    top.appendChild(pt); top.appendChild(nm); wrap.appendChild(top);
    var xp = MW.el('div', 'sheet-xp');
    xp.innerHTML = '<p class="pixel sheet-lv">Your XP: LV <b data-xp-lv>1</b> <span data-xp-name></span></p>' +
      '<span class="xp-track" role="progressbar" aria-label="Your progress to the next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-xp-bar><i class="xp-fill" data-xp-fill></i></span>' +
      '<p class="small" data-xp-detail></p>';
    wrap.appendChild(xp);
    var meta = MW.el('dl', 'sheet-meta');
    [['Home town', sh.home], ['Guild', sh.guild], ['Side quest', sh.sideQuest]].forEach(function (r) {
      var d = MW.el('div'); d.appendChild(MW.el('dt', '', r[0])); d.appendChild(MW.el('dd', '', r[1])); meta.appendChild(d);
    });
    wrap.appendChild(meta);
    wrap.appendChild(MW.el('h4', 'stats-title pixel', 'Stats'));
    var ul = MW.el('ul', 'stats');
    cfg.stats.forEach(function (s) {
      var li = MW.el('li', 'stat');
      li.appendChild(MW.el('span', 'stat-label', s.label));
      var dots = MW.el('span', 'stat-dots'); dots.setAttribute('aria-hidden', 'true'); li.appendChild(dots);
      li.appendChild(MW.el('span', 'stat-value pixel', s.value));
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    var more = MW.el('p', 'actions'); var a = MW.el('a', 'btn btn-sm btn-blue', 'Read the full About page'); a.href = 'about.html'; more.appendChild(a); wrap.appendChild(more);
    MW.modal.open({ title: 'Character sheet', content: wrap, onClose: function () { canvas.focus({ preventScroll: true }); } });
    MW.renderChip();
  }
  function openHelp() {
    if (MW.modal.isOpen()) return;
    var box = MW.el('div', 'help');
    box.innerHTML =
      '<ul class="help-list">' +
      '<li><b>Walk:</b> arrow keys or W A S D. On a phone, drag anywhere.</li>' +
      '<li><b>Go in:</b> stand at a door and press Enter, Space or E. Or tap the building.</li>' +
      '<li><b>Mini games:</b> walk onto the coloured pads with a red <b>!</b> above them.</li>' +
      '<li><b>Stars:</b> seven are hidden. Walk into one to collect it. Find all 7 for a secret room.</li>' +
      '<li><b>Keys:</b> C character sheet, H this help, M sound on or off.</li>' +
      '<li><b>No game?</b> The <a href="classic.html">normal site</a> has everything as plain pages.</li>' +
      '</ul>';
    var det = MW.el('details', 'clues');
    det.appendChild(MW.el('summary', 'pixel', 'Need a clue for the stars?'));
    var ol = MW.el('ol');
    starDefs.forEach(function (s, i) { ol.appendChild(MW.el('li', isFound(s.id) ? 'found' : '', (isFound(s.id) ? 'Found: ' : 'Star ' + (i + 1) + ': ') + s.clue)); });
    det.appendChild(ol); box.appendChild(det);
    MW.modal.open({ title: 'How to play', content: box, onClose: function () { canvas.focus({ preventScroll: true }); } });
  }
  var b1 = document.getElementById('btn-sheet'); if (b1) b1.addEventListener('click', openSheet);
  var b2 = document.getElementById('btn-help'); if (b2) b2.addEventListener('click', openHelp);

  /* ------------------------------------------------------------------ loop */
  var last = 0, started = false;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts; clock += dt;
    if (!MW.modal.isOpen()) update(dt); else { P.moving = false; }
    draw();
    if (!started) { started = true; var l = document.getElementById('loading'); if (l) l.hidden = true; }
    requestAnimationFrame(frame);
  }

  function start() {
    layers = A.build();
    resize();
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
    try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    requestAnimationFrame(frame);
    // first visit: show the how-to once
    try { if (!window.sessionStorage.getItem('mw-help-seen') && !MW.store.get().visited.about) { window.sessionStorage.setItem('mw-help-seen', '1'); setTimeout(openHelp, 400); } } catch (e) { /* storage blocked */ }
  }

  MW.world = { P: P, view: view, activate: activate, interactables: interactables, starDefs: starDefs, tap: tap, walkTo: walkTo, get near() { return near; }, sheet: openSheet, help: openHelp };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
