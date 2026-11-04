/* ==========================================================================
   MITISHA'S WORLD  |  js/avatar.js
   The pixel avatar. It is drawn in code from a few rectangles, so there is
   no image file to load. It is an original character: black bob, yellow hair
   clip, tomato hoodie, blue jeans, white sneakers.

   Want your own avatar? Two ways:
   1) Easy: draw a sprite sheet and set avatarSheet in js/config.js
      (the layout is explained there).
   2) Tweak the colours in PAL below.

   Public API (used by the world, the character sheet and the ID card):
     MW.avatar.draw(ctx, dir, frame, x, y, scale, opts)
        dir:   'down' | 'up' | 'left' | 'right'
        frame: 0 = standing, 1 = step A, 2 = step B
        x, y:  where the FEET CENTRE goes on the canvas
     MW.avatar.paint(canvas, dir, scale)   draws one avatar centred on a canvas
   ========================================================================== */
(function () {
  window.MW = window.MW || {};

  var CELL_W = 16, CELL_H = 23;           // size of one built-in frame
  var OX = 1, OY = 4;                     // inner 14x18 art sits inside the cell

  var PAL = {
    ink:   '#17141F',
    hair:  '#2B1B22',
    hairHi:'#4A3340',
    skin:  '#F6BC96',
    skinSh:'#E39A74',
    blush: '#FF8FC0',
    mouth: '#C9301F',
    clip:  '#FFD23F',
    hood:  '#FF4B3A',
    hoodSh:'#C9301F',
    string:'#FBF5E6',
    jeans: '#2B50E8',
    jeansSh:'#1B34A8',
    shoe:  '#FBF5E6',
    hat:   '#FF8FC0',
    hatTop:'#FFD23F'
  };

  /* shape = [x, y, w, h, colour]; coordinates are in the 14x18 inner grid */
  function shapes(dir, step, hat) {
    var s = [];
    function add(x, y, w, h, c) { s.push([x, y, w, h, c]); }

    // legs and shoes first (drawn under the hoodie)
    if (dir === 'left' || dir === 'right') {
      if (step === 0) {
        add(5, 15, 4, 2, PAL.jeans);
        add(5, 17, 5, 1, PAL.shoe);
      } else if (step === 1) {
        add(3, 15, 2, 2, PAL.jeansSh); add(2, 17, 3, 1, PAL.shoe);
        add(8, 15, 2, 2, PAL.jeans);   add(8, 17, 3, 1, PAL.shoe);
      } else {
        add(3, 15, 2, 2, PAL.jeans);   add(2, 17, 3, 1, PAL.shoe);
        add(8, 15, 2, 2, PAL.jeansSh); add(8, 17, 3, 1, PAL.shoe);
      }
    } else {
      if (step === 0) {
        add(4, 15, 2, 2, PAL.jeans);   add(3, 17, 3, 1, PAL.shoe);
        add(8, 15, 2, 2, PAL.jeans);   add(8, 17, 3, 1, PAL.shoe);
      } else if (step === 1) {
        add(4, 15, 2, 2, PAL.jeans);   add(3, 17, 3, 1, PAL.shoe);
        add(8, 15, 2, 1, PAL.jeansSh); add(8, 16, 3, 1, PAL.shoe);
      } else {
        add(4, 15, 2, 1, PAL.jeansSh); add(3, 16, 3, 1, PAL.shoe);
        add(8, 15, 2, 2, PAL.jeans);   add(8, 17, 3, 1, PAL.shoe);
      }
    }

    // body: hoodie
    if (dir === 'down' || dir === 'up') {
      add(3, 10, 8, 5, PAL.hood);
      add(3, 14, 8, 1, PAL.hoodSh);
      add(2, 10, 1, 4, PAL.hood);  add(11, 10, 1, 4, PAL.hood);
      add(2, 14, 1, 1, PAL.skin);  add(11, 14, 1, 1, PAL.skin);
      if (dir === 'down') {
        add(5, 10, 4, 1, PAL.hoodSh);
        add(6, 11, 1, 2, PAL.string); add(8, 11, 1, 2, PAL.string);
        add(5, 13, 4, 1, PAL.hoodSh);
      } else {
        add(4, 10, 6, 2, PAL.hoodSh);
      }
    } else {
      add(4, 10, 6, 5, PAL.hood);
      add(4, 14, 6, 1, PAL.hoodSh);
      var ax = step === 1 ? 7 : (step === 2 ? 4 : 5);
      add(ax, 11, 3, 3, PAL.hoodSh);
      add(ax + 1, 14, 1, 1, PAL.skin);
    }

    // neck
    add(6, 9, 2, 1, PAL.skinSh);

    // head
    if (dir === 'down') {
      add(4, 0, 6, 1, PAL.hair); add(3, 1, 8, 1, PAL.hair); add(2, 2, 10, 7, PAL.hair);
      add(4, 5, 6, 4, PAL.skin);
      add(5, 2, 3, 1, PAL.hairHi);
      add(5, 6, 1, 2, PAL.ink); add(8, 6, 1, 2, PAL.ink);
      add(4, 7, 1, 1, PAL.blush); add(9, 7, 1, 1, PAL.blush);
      add(6, 8, 2, 1, PAL.mouth);
      add(9, 3, 2, 1, PAL.clip);
    } else if (dir === 'up') {
      add(4, 0, 6, 1, PAL.hair); add(3, 1, 8, 1, PAL.hair); add(2, 2, 10, 7, PAL.hair);
      add(3, 9, 8, 1, PAL.hair);
      add(5, 2, 3, 1, PAL.hairHi);
      add(3, 3, 2, 1, PAL.clip);
    } else {
      add(4, 0, 6, 1, PAL.hair); add(3, 1, 8, 1, PAL.hair); add(3, 2, 8, 7, PAL.hair);
      add(3, 9, 6, 1, PAL.hair);
      add(8, 5, 3, 4, PAL.skin);
      add(11, 7, 1, 1, PAL.skin);
      add(5, 2, 3, 1, PAL.hairHi);
      add(9, 6, 1, 2, PAL.ink);
      add(9, 8, 2, 1, PAL.mouth);
      add(10, 7, 1, 1, PAL.blush);
      add(6, 3, 2, 1, PAL.clip);
    }

    if (hat) {
      add(6, -3, 2, 1, PAL.hat); add(5, -2, 4, 1, PAL.hat); add(4, -1, 6, 1, PAL.hat);
      add(6, -4, 2, 1, PAL.hatTop);
    }
    return s;
  }

  function paintShapes(ctx, list) {
    // 1) ink silhouette (every shape grown by 1px), 2) the real colours on top
    ctx.fillStyle = PAL.ink;
    list.forEach(function (r) { ctx.fillRect(OX + r[0] - 1, OY + r[1] - 1, r[2] + 2, r[3] + 2); });
    list.forEach(function (r) { ctx.fillStyle = r[4]; ctx.fillRect(OX + r[0], OY + r[1], r[2], r[3]); });
  }

  var cache = {};
  function frameCanvas(dir, step, hat) {
    var key = dir + step + (hat ? 'h' : '');
    if (cache[key]) return cache[key];
    var c = document.createElement('canvas');
    c.width = CELL_W; c.height = CELL_H;
    var ctx = c.getContext('2d');
    var base = dir === 'left' ? 'right' : dir;
    paintShapes(ctx, shapes(base, step, hat));
    if (dir === 'left') {                       // mirror the right-facing art
      var m = document.createElement('canvas');
      m.width = CELL_W; m.height = CELL_H;
      var mx = m.getContext('2d');
      mx.translate(CELL_W, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0);
      c = m;
    }
    cache[key] = c;
    return c;
  }

  /* ---- optional custom sprite sheet ---- */
  var sheetImg = null, sheetReady = false;
  function loadSheet() {
    var cfg = MW.config || {};
    if (!cfg.avatarSheet || sheetImg) return;
    sheetImg = new Image();
    sheetImg.onload = function () { sheetReady = true; window.dispatchEvent(new Event('mw:avatar')); };
    sheetImg.onerror = function () { sheetImg = null; sheetReady = false; };
    sheetImg.src = cfg.avatarSheet;
  }

  function draw(ctx, dir, frame, x, y, scale, opts) {
    opts = opts || {};
    scale = scale || 1;
    var hat = !!opts.hat;
    var cw = CELL_W, ch = CELL_H, src;
    if (sheetReady) {
      var cell = (MW.config && MW.config.avatarCell) || { w: CELL_W, h: CELL_H };
      cw = cell.w; ch = cell.h;
      var row = dir === 'down' ? 0 : (dir === 'up' ? 1 : 2);
      var sx = frame * cw, sy = row * ch;
      var flip = dir === 'left';
      ctx.imageSmoothingEnabled = false;
      var dx = Math.round(x - (cw * scale) / 2), dy = Math.round(y - ch * scale + scale);
      if (flip) {
        ctx.save(); ctx.translate(dx + cw * scale, dy); ctx.scale(-1, 1);
        ctx.drawImage(sheetImg, sx, sy, cw, ch, 0, 0, cw * scale, ch * scale);
        ctx.restore();
      } else {
        ctx.drawImage(sheetImg, sx, sy, cw, ch, dx, dy, cw * scale, ch * scale);
      }
      return;
    }
    src = frameCanvas(dir, frame, hat);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, cw, ch,
      Math.round(x - (cw * scale) / 2), Math.round(y - ch * scale + scale), cw * scale, ch * scale);
  }

  /* draw one avatar centred on a <canvas> (used by the character sheet and ID card) */
  function paint(canvas, dir, scale) {
    var s = scale || Math.max(1, Math.floor(Math.min(canvas.width / CELL_W, canvas.height / CELL_H)));
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var hat = !!(MW.store && MW.store.get().ticket);
    draw(ctx, dir || 'down', 0, canvas.width / 2, canvas.height - s, s, { hat: hat });
  }

  function paintAll() {
    var list = document.querySelectorAll('canvas[data-avatar]');
    for (var i = 0; i < list.length; i++) paint(list[i], list[i].getAttribute('data-avatar') || 'down');
  }

  MW.avatar = { draw: draw, paint: paint, paintAll: paintAll, CELL_W: CELL_W, CELL_H: CELL_H, PAL: PAL };
  loadSheet();
  window.addEventListener('mw:avatar', paintAll);
})();
