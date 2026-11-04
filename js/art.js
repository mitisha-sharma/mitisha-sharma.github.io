/* ==========================================================================
   MITISHA'S WORLD  |  js/art.js
   Draws the whole town in code (no image files) and builds the collision map.
   The map is 36 x 30 tiles, each tile 16 x 16 pixels.

   To MOVE a building: change tx / ty in BUILDINGS below, and check that the
   door can still be reached. To ADD trees: add [column, row] to TREES.
   Everything is drawn once into hidden canvases, then the engine
   (js/world.js) just copies the visible part to the screen.
   ========================================================================== */
(function () {
  window.MW = window.MW || {};

  var T = 16, MAP_W = 36, MAP_H = 30;

  var C = {
    ink: '#17141F', paper: '#FBF5E6', yellow: '#FFD23F', red: '#FF4B3A', redD: '#C9301F', blue: '#2B50E8', blueD: '#1B34A8',
    mint: '#7FE3B5', mintD: '#4DBF8E', pink: '#FF8FC0', pinkD: '#E0629A',
    grass: '#8FE08A', grass2: '#74CF73', grass3: '#B0EEA8',
    path: '#FFE9A8', path2: '#F2D27F', plaza1: '#FFF3C9', plaza2: '#FFE08A',
    water: '#4F86FF', water2: '#8DB4FF', wood: '#B87A3D', woodD: '#8A5628',
    leaf: '#3FB36A', leaf2: '#2E9558', leaf3: '#63D083', slate: '#2E2A3D', glass: '#BFE3FF'
  };

  /* ---- buildings. door = first of the 2 door columns. ---- */
  var BUILDINGS = [
    { id: 'about',     page: 'about.html',      name: 'Home',           open: 'About me',    sign: 'HOME',       tx: 3,  ty: 3,  w: 6, h: 5, door: 5,  style: 'house' },
    { id: 'projects',  page: 'projects.html',   name: 'Arcade',         open: 'Projects',    sign: 'ARCADE',     tx: 14, ty: 2,  w: 8, h: 6, door: 17, style: 'arcade' },
    { id: 'wins',      page: 'wins.html',       name: 'Trophy hall',    open: 'Wins',        sign: 'TROPHIES',   tx: 28, ty: 3,  w: 6, h: 5, door: 30, style: 'trophy' },
    { id: 'education', page: 'education.html',  name: 'School',         open: 'Education',   sign: 'SCHOOL',     tx: 2,  ty: 13, w: 8, h: 5, door: 5,  style: 'school' },
    { id: 'skills',    page: 'skills.html',     name: 'Skill shop',     open: 'Skills',      sign: 'SKILL SHOP', tx: 28, ty: 13, w: 6, h: 5, door: 30, style: 'shop' },
    { id: 'studio',    page: 'studio.html',     name: 'Editing studio', open: 'Studio',      sign: 'STUDIO',     tx: 3,  ty: 22, w: 6, h: 5, door: 5,  style: 'studio' },
    { id: 'contact',   page: 'contact.html',    name: 'Post office',    open: 'Contact',     sign: 'POST',       tx: 28, ty: 22, w: 6, h: 5, door: 30, style: 'post' },
    { id: 'play',      page: 'play.html',       name: 'Game corner',    open: 'Mini games',  sign: 'GAMES',      tx: 16, ty: 23, w: 4, h: 3, door: 17, style: 'kiosk' },
    { id: 'experience', page: 'experience.html', name: 'Quest board',   open: 'Experience',  sign: 'QUESTS',     tx: 17, ty: 13, w: 2, h: 2, door: 17, style: 'board' }
  ];

  /* ---- little mini-game spots you can walk onto (2 x 2 tiles) ---- */
  var EVENTS = [
    { id: 'ev-morse',    game: 'morse',    name: 'Blink Morse',     tx: 21, ty: 9,  color: C.yellow, label: 'TAP' },
    { id: 'ev-reverse',  game: 'reverse',  name: 'Reverse Coding',  tx: 25, ty: 9,  color: C.mint,   label: 'GUESS' },
    { id: 'ev-timeline', game: 'timeline', name: 'Edit Timeline',   tx: 9,  ty: 27, color: C.pink,   label: 'CUT' }
  ];

  /* ---- scattered trees [column, row]. The border trees are added automatically. ---- */
  var TREES = [
    [10, 3], [10, 5], [11, 4], [24, 3], [25, 5], [23, 4], [26, 3],
    [11, 12], [11, 16], [25, 13], [26, 17], [24, 15],
    [1, 17], [1, 24], [1, 9], [34, 17], [34, 24], [34, 9],
    [22, 23], [24, 25], [25, 23], [23, 27], [13, 28], [20, 28],
    [7, 11], [30, 11], [9, 24], [32, 20]
  ];
  var LAMPS = [[13, 12], [22, 12], [13, 19], [22, 19]];

  var WATER = { 22: [12, 13], 23: [11, 12, 13, 14], 24: [11, 12, 13, 14], 25: [11, 12, 13, 14], 26: [12, 13] };

  /* ------------------------------------------------------------ tiny bitmap font */
  var FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', ' ': '000000000000000', '!': '010010010000010', '?': '110001010000010', '.': '000000000000010',
    '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110', '4': '101101111001001',
    '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110'
  };
  function textW(str, sc) { return str.length * 4 * sc - sc; }
  function text(c, str, x, y, col, sc) {
    sc = sc || 1; c.fillStyle = col;
    var cx = x;
    for (var i = 0; i < str.length; i++) {
      var g = FONT[str.charAt(i).toUpperCase()] || FONT[' '];
      for (var r = 0; r < 5; r++) for (var k = 0; k < 3; k++) if (g.charAt(r * 3 + k) === '1') c.fillRect(cx + k * sc, y + r * sc, sc, sc);
      cx += 4 * sc;
    }
  }

  /* ------------------------------------------------------------------ helpers */
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  function box(c, x, y, w, h, fill) { R(c, x - 1, y - 1, w + 2, h + 2, C.ink); R(c, x, y, w, h, fill); }
  function shadow(c, x, y, w, h) { R(c, x + 4, y + 5, w, h, 'rgba(23,20,31,.28)'); }
  function roofPattern(c, x, y, w, h, col, dark) {
    R(c, x, y, w, h, col);
    for (var j = 3; j < h; j += 4) {
      R(c, x, y + j, w, 1, dark);
      for (var i = ((j >> 2) & 1) * 4; i < w; i += 8) R(c, x + i, y + j - 3, 1, 3, dark);
    }
  }
  function win(c, x, y, w, h) {
    box(c, x, y, w, h, C.glass);
    R(c, x + (w >> 1), y, 1, h, C.ink); R(c, x, y + (h >> 1), w, 1, C.ink);
    R(c, x + 1, y + 1, 2, 2, '#fff');
  }
  function sign(c, cx, y, str, bg, fg, sc) {
    sc = sc || 1;
    var w = textW(str, sc) + 6, h = 5 * sc + 4;
    box(c, Math.round(cx - w / 2), y, w, h, bg);
    text(c, str, Math.round(cx - w / 2) + 3, y + 2, fg, sc);
  }
  function door(c, x, y, col, trim) {
    box(c, x, y, 32, 26, col);
    R(c, x + 15, y, 2, 26, C.ink);
    R(c, x + 4, y + 4, 8, 8, trim || 'rgba(255,255,255,.45)'); R(c, x + 20, y + 4, 8, 8, trim || 'rgba(255,255,255,.45)');
    R(c, x + 12, y + 14, 2, 2, C.yellow); R(c, x + 18, y + 14, 2, 2, C.yellow);
    R(c, x - 2, y + 26, 36, 4, C.redD); R(c, x - 2, y + 26, 36, 1, C.ink);
  }
  function awning(c, x, y, w, a, b, drop) {
    for (var i = 0; i < w; i += 6) {
      var col = ((i / 6) & 1) ? a : b;
      R(c, x + i, y, 6, drop, col);
      R(c, x + i + 1, y + drop, 4, 2, col);
    }
    R(c, x, y - 1, w, 1, C.ink);
  }

  /* ------------------------------------------------------------ building art */
  function wallAndRoof(c, b, wallCol, roofCol, roofDark, roofH) {
    var x = b.tx * T, y = b.ty * T, W = b.w * T, H = b.h * T;
    shadow(c, x, y, W, H);
    box(c, x, y, W, H, wallCol);
    roofPattern(c, x, y, W, roofH, roofCol, roofDark);
    R(c, x, y + roofH, W, 2, C.ink);
    return { x: x, y: y, W: W, H: H, dx: b.door * T, dy: y + H - 26 };
  }

  var DRAW = {
    house: function (c, b, over) {
      var g = wallAndRoof(c, b, C.yellow, C.red, C.redD, 32);
      R(c, g.x - 2, g.y + 29, g.W + 4, 3, C.redD); R(c, g.x - 2, g.y + 28, g.W + 4, 1, C.ink);
      win(c, g.x + 8, g.y + 40, 16, 14); win(c, g.x + g.W - 24, g.y + 40, 16, 14);
      R(c, g.x + 7, g.y + 55, 18, 4, C.woodD); R(c, g.x + g.W - 25, g.y + 55, 18, 4, C.woodD);
      [9, 13, 17, 21].forEach(function (o, i) { R(c, g.x + o - 1, g.y + 53, 3, 3, i % 2 ? C.pink : C.paper); R(c, g.x + g.W - 32 + o, g.y + 53, 3, 3, i % 2 ? C.paper : C.pink); });
      door(c, g.dx, g.dy, C.blue);
      sign(c, g.x + g.W / 2, g.y + 34, b.sign, C.paper, C.ink);
      box(over, g.x + g.W - 24, g.y - 12, 10, 18, C.redD); R(over, g.x + g.W - 26, g.y - 14, 14, 3, C.ink);
    },
    arcade: function (c, b, over) {
      var g = wallAndRoof(c, b, C.blue, C.ink, '#2A2536', 32);
      R(c, g.x, g.y + 26, g.W, 4, C.red);
      box(c, g.x + 34, g.y + 6, 60, 18, C.yellow);
      text(c, b.sign, g.x + 34 + 7, g.y + 10, C.ink, 2);
      for (var i = 0; i < 8; i++) { R(c, g.x + 34 + i * 8 + 2, g.y + 3, 3, 3, C.paper); R(c, g.x + 34 + i * 8 + 2, g.y + 25, 3, 3, C.paper); }
      [g.x + 10, g.x + g.W - 34].forEach(function (wx, k) {
        box(c, wx, g.y + 42, 24, 30, '#0F0D16');
        R(c, wx + 4, g.y + 46, 6, 12, k ? C.pink : C.mint); R(c, wx + 14, g.y + 46, 6, 12, k ? C.yellow : C.pink);
        R(c, wx + 5, g.y + 48, 4, 4, C.ink); R(c, wx + 15, g.y + 48, 4, 4, C.ink);
        R(c, wx + 6, g.y + 62, 12, 4, C.red);
      });
      awning(c, g.dx - 6, g.dy - 12, 44, C.red, C.paper, 8);
      door(c, g.dx, g.dy, C.ink, 'rgba(255,210,63,.35)');
    },
    trophy: function (c, b, over) {
      var g = wallAndRoof(c, b, C.mint, C.pink, C.pinkD, 30);
      [g.x + 6, g.x + g.W - 14].forEach(function (px) {
        box(c, px, g.y + 34, 8, g.H - 34, C.paper); R(c, px - 2, g.y + 33, 12, 3, C.paper); R(c, px - 2, g.y + g.H - 3, 12, 3, C.paper);
        R(c, px + 3, g.y + 38, 1, g.H - 46, 'rgba(23,20,31,.2)');
      });
      sign(c, g.x + g.W / 2, g.y + 34, b.sign, C.yellow, C.ink);
      door(c, g.dx, g.dy, C.yellow, 'rgba(23,20,31,.18)');
      var cx = g.x + g.W / 2 - 8, cy = g.y - 16;
      box(over, cx + 4, cy, 8, 7, C.yellow); box(over, cx + 6, cy + 7, 4, 4, C.yellow); box(over, cx + 3, cy + 11, 10, 3, C.red);
      R(over, cx + 1, cy + 1, 3, 4, C.yellow); R(over, cx + 12, cy + 1, 3, 4, C.yellow);
      R(over, cx + 6, cy + 2, 2, 2, C.paper);
    },
    school: function (c, b, over) {
      var g = wallAndRoof(c, b, C.red, C.redD, '#9E2418', 28);
      for (var j = 32; j < g.H; j += 4) { R(c, g.x, g.y + j, g.W, 1, C.redD); for (var i = ((j >> 2) & 1) * 4; i < g.W; i += 8) R(c, g.x + i, g.y + j + 1, 1, 3, C.redD); }
      [g.x + 8, g.x + 28, g.x + g.W - 24, g.x + g.W - 44].forEach(function (wx) { win(c, wx, g.y + 38, 14, 16); });
      box(c, g.x + g.W / 2 - 8, g.y + 30, 16, 16, C.paper);
      R(c, g.x + g.W / 2 - 1, g.y + 33, 2, 6, C.ink); R(c, g.x + g.W / 2 - 1, g.y + 38, 5, 2, C.ink);
      sign(c, g.x + g.W / 2, g.y + 48, b.sign, C.blue, C.paper);
      door(c, g.dx, g.dy, C.blueD);
      box(over, g.x + g.W / 2 - 12, g.y - 16, 24, 18, C.red); box(over, g.x + g.W / 2 - 4, g.y - 12, 8, 8, C.yellow);
      R(over, g.x + g.W / 2 - 14, g.y - 18, 28, 3, C.ink);
      R(over, g.x + g.W - 14, g.y - 20, 2, 26, C.ink); R(over, g.x + g.W - 12, g.y - 20, 10, 7, C.yellow);
    },
    shop: function (c, b, over) {
      var g = wallAndRoof(c, b, C.pink, C.mint, C.mintD, 28);
      awning(c, g.x, g.y + 30, g.W, C.yellow, C.paper, 8);
      [g.x + 6, g.x + g.W - 28].forEach(function (wx, k) {
        box(c, wx, g.y + 46, 22, 20, C.glass);
        [C.red, C.blue, C.yellow, C.mint, C.pink].forEach(function (col, i) {
          R(c, wx + 2 + (i % 3) * 7, g.y + 49 + ((i / 3) | 0) * 8, 5, 5, col); R(c, wx + 2 + (i % 3) * 7, g.y + 49 + ((i / 3) | 0) * 8, 5, 1, 'rgba(255,255,255,.7)');
        });
      });
      sign(c, g.x + g.W / 2, g.y + 42, b.sign, C.paper, C.ink);
      door(c, g.dx, g.dy + 0, C.blue);
    },
    studio: function (c, b, over) {
      var g = wallAndRoof(c, b, C.slate, C.ink, '#2A2536', 30);
      R(c, g.x, g.y + 28, g.W, 2, C.mint);
      for (var i = 0; i < g.W; i += 8) { R(c, g.x + i + 2, g.y + 4, 4, 4, C.paper); R(c, g.x + i + 2, g.y + 20, 4, 4, C.paper); }
      sign(c, g.x + g.W / 2, g.y + 34, b.sign, C.mint, C.ink);
      box(c, g.x + 8, g.y + 44, 18, 14, C.paper);
      R(c, g.x + 8, g.y + 44, 18, 4, C.ink); for (var s = 0; s < 18; s += 6) R(c, g.x + 10 + s, g.y + 44, 3, 4, C.paper);
      R(c, g.x + 12, g.y + 51, 10, 2, C.ink);
      box(c, g.x + g.W - 26, g.y + 44, 18, 8, '#5A1A14');
      door(c, g.dx, g.dy, C.mintD, 'rgba(23,20,31,.25)');
    },
    post: function (c, b, over) {
      var g = wallAndRoof(c, b, C.paper, C.blue, C.blueD, 30);
      sign(c, g.x + g.W / 2, g.y + 35, b.sign, C.red, C.paper, 2);
      win(c, g.x + 8, g.y + 52, 14, 12); win(c, g.x + g.W - 22, g.y + 52, 14, 12);
      door(c, g.dx, g.dy, C.red);
      box(over, g.x + g.W / 2 - 9, g.y - 10, 18, 12, C.paper); R(over, g.x + g.W / 2 - 8, g.y - 9, 16, 1, C.ink);
      R(over, g.x + g.W / 2 - 7, g.y - 8, 7, 4, C.ink); R(over, g.x + g.W / 2 - 1, g.y - 8, 8, 4, C.ink);
      R(over, g.x + g.W / 2 - 6, g.y - 8, 5, 3, C.paper); R(over, g.x + g.W / 2, g.y - 8, 6, 3, C.paper);
      var mx = g.dx - 24, my = g.y + g.H - 16;
      R(c, mx + 6, my + 8, 3, 10, C.ink); box(c, mx, my, 15, 9, C.blue); R(c, mx + 3, my + 3, 9, 2, C.ink);
      R(c, mx + 13, my - 4, 2, 6, C.red);
    },
    kiosk: function (c, b, over) {
      var x = b.tx * T, y = b.ty * T, W = b.w * T, H = b.h * T;
      shadow(c, x, y, W, H);
      box(c, x, y, W, H, C.yellow);
      awning(c, x - 2, y + 2, W + 4, C.red, C.paper, 12);
      sign(c, x + W / 2, y + 17, b.sign, C.ink, C.yellow);
      box(c, x + 6, y + 27, W - 12, 13, '#0F0D16');
      R(c, x + 10, y + 30, 6, 7, C.mint); R(c, x + 20, y + 30, 6, 7, C.pink); R(c, x + 30, y + 30, 6, 7, C.blue); R(c, x + 40, y + 30, 6, 7, C.yellow);
      R(c, x + 2, y + 40, W - 4, 4, C.woodD);
      R(over, x + W / 2 - 1, y - 8, 3, 8, C.ink); box(over, x + W / 2 - 4, y - 14, 9, 7, C.red);
      var dx = b.door * T;
      R(c, dx - 2, y + H, 36, 4, C.redD); R(c, dx - 2, y + H, 36, 1, C.ink);
    },
    board: function (c, b, over) {
      var x = b.tx * T, y = b.ty * T;
      shadow(c, x, y + 4, 32, 28);
      R(c, x + 2, y + 14, 3, 16, C.ink); R(c, x + 27, y + 14, 3, 16, C.ink);
      box(c, x - 4, y + 2, 40, 22, C.wood);
      R(c, x - 3, y + 3, 38, 2, '#D79A58');
      [[x + 1, y + 7, C.paper, 8, 9], [x + 11, y + 6, C.yellow, 8, 10], [x + 21, y + 8, C.pink, 8, 9], [x + 28, y + 12, C.mint, 6, 8]].forEach(function (n) {
        R(c, n[0], n[1], n[3], n[4], n[2]); R(c, n[0] + 1, n[1] + 3, n[3] - 2, 1, C.ink); R(c, n[0] + 1, n[1] + 5, n[3] - 3, 1, C.ink);
        R(c, n[0] + (n[3] >> 1) - 1, n[1], 2, 2, C.red);
      });
      sign(c, x + 16, y - 7, b.sign, C.red, C.paper);
    }
  };

  /* ------------------------------------------------------------------ scenery */
  function treeSprite(variant) {
    var cv = mk(18, 28), c = cv.getContext('2d');
    var leaf = [C.leaf, C.leaf, C.pink, C.leaf, C.yellow][variant % 5];
    var dark = [C.leaf2, C.leaf2, C.pinkD, C.leaf2, '#E0A800'][variant % 5];
    var light = [C.leaf3, C.leaf3, '#FFC2DD', C.leaf3, '#FFE88A'][variant % 5];
    var rows = [[5, 8], [3, 12], [2, 14], [1, 16], [1, 16], [1, 16], [2, 14], [3, 12], [5, 8]];
    var oy = 2;
    rows.forEach(function (r, i) { R(c, r[0] - 1, oy + i, r[1] + 2, 1, C.ink); });
    R(c, rows[0][0], oy - 1, rows[0][1], 1, C.ink); R(c, rows[8][0], oy + 9, rows[8][1], 1, C.ink);
    R(c, 7, oy + 9, 4, 12, C.ink);
    R(c, 8, oy + 9, 2, 11, C.woodD);
    rows.forEach(function (r, i) { R(c, r[0], oy + i, r[1], 1, leaf); });
    R(c, 4, oy + 1, 5, 1, light); R(c, 3, oy + 2, 4, 1, light); R(c, 2, oy + 3, 3, 1, light); R(c, 6, oy + 4, 2, 2, light);
    R(c, 11, oy + 6, 5, 1, dark); R(c, 8, oy + 7, 7, 1, dark); R(c, 6, oy + 8, 6, 1, dark); R(c, 13, oy + 4, 3, 2, dark);
    R(c, 5, oy + 12, 8, 2, 'rgba(23,20,31,.25)');
    return cv;
  }
  function lampSprite() {
    var cv = mk(10, 28), c = cv.getContext('2d');
    R(c, 3, 4, 4, 22, C.ink); R(c, 4, 5, 2, 20, '#4A4458'); R(c, 1, 24, 8, 3, C.ink);
    box(c, 1, 0, 8, 7, C.yellow); R(c, 2, 1, 2, 2, '#fff');
    return cv;
  }

  /* ------------------------------------------------------------------ build everything */
  var solid = new Uint8Array(MAP_W * MAP_H);
  var treeList = [], lampList = [];
  var pathTiles = {}, zones = [];
  function setSolid(x, y, v) { if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) solid[y * MAP_W + x] = v === undefined ? 1 : v; }
  function isSolid(x, y) { if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true; return solid[y * MAP_W + x] === 1; }

  function layout() {
    // border
    for (var x = 0; x < MAP_W; x++) { setSolid(x, 0); setSolid(x, MAP_H - 1); }
    for (var y = 0; y < MAP_H; y++) { setSolid(0, y); setSolid(MAP_W - 1, y); }
    // buildings
    BUILDINGS.forEach(function (b) {
      for (var yy = b.ty; yy < b.ty + b.h; yy++) for (var xx = b.tx; xx < b.tx + b.w; xx++) setSolid(xx, yy);
      var zy = b.ty + b.h;
      b.zone = { x: b.door * T - 4, y: zy * T - 2, w: 2 * T + 8, h: 2 * T + 2 };
      b.bounds = { x: b.tx * T - 4, y: b.ty * T - 14, w: b.w * T + 8, h: (b.h + 2) * T + 14 };
      b.center = { x: b.door * T + T, y: zy * T + 10 };
    });
    // water
    Object.keys(WATER).forEach(function (row) { WATER[row].forEach(function (col) { setSolid(col, +row); }); });
    // trees
    TREES.forEach(function (t) { treeList.push({ x: t[0], y: t[1], v: (t[0] * 7 + t[1] * 3) % 5 }); setSolid(t[0], t[1]); });
    for (var i = 0; i < MAP_W; i++) { treeList.push({ x: i, y: 0, v: (i * 3) % 5 }); treeList.push({ x: i, y: MAP_H - 1, v: (i * 2 + 1) % 5 }); }
    for (var j = 1; j < MAP_H - 1; j++) { treeList.push({ x: 0, y: j, v: (j * 3 + 1) % 5 }); treeList.push({ x: MAP_W - 1, y: j, v: (j * 2) % 5 }); }
    LAMPS.forEach(function (l) { lampList.push({ x: l[0], y: l[1] }); setSolid(l[0], l[1]); });
    EVENTS.forEach(function (e) {
      e.zone = { x: e.tx * T - 2, y: e.ty * T - 2, w: 2 * T + 4, h: 2 * T + 4 };
      e.bounds = { x: e.tx * T - 2, y: e.ty * T - 6, w: 2 * T + 4, h: 2 * T + 8 };
      e.center = { x: e.tx * T + T, y: e.ty * T + T + 4 };
    });
  }

  function paintPaths(c) {
    function band(x0, y0, x1, y1) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) pathTiles[x + ',' + y] = 1; }
    band(4, 10, 33, 11); band(4, 20, 33, 21); band(4, 27, 33, 28); band(9, 22, 10, 26); band(25, 22, 26, 26);
    band(13, 12, 22, 19);
    BUILDINGS.forEach(function (b) { band(b.door, b.ty + b.h, b.door + 1, b.ty + b.h + 1); });
    band(17, 15, 18, 16);
    Object.keys(pathTiles).forEach(function (k) {
      var p = k.split(','), x = +p[0], y = +p[1];
      if (isSolid(x, y)) return;
      var plaza = x >= 13 && x <= 22 && y >= 12 && y <= 19;
      if (plaza) R(c, x * T, y * T, T, T, ((x + y) & 1) ? C.plaza1 : C.plaza2);
      else {
        R(c, x * T, y * T, T, T, C.path);
        var r = rng(x * 131 + y * 17);
        for (var n = 0; n < 4; n++) R(c, x * T + ((r() * 14) | 0), y * T + ((r() * 14) | 0), 2, 1, C.path2);
      }
    });
    // path edges: darker line where path meets grass
    Object.keys(pathTiles).forEach(function (k) {
      var p = k.split(','), x = +p[0], y = +p[1];
      if (isSolid(x, y)) return;
      if (!pathTiles[x + ',' + (y - 1)]) R(c, x * T, y * T, T, 1, C.path2);
      if (!pathTiles[x + ',' + (y + 1)]) R(c, x * T, y * T + 15, T, 1, C.path2);
      if (!pathTiles[(x - 1) + ',' + y]) R(c, x * T, y * T, 1, T, C.path2);
      if (!pathTiles[(x + 1) + ',' + y]) R(c, x * T + 15, y * T, 1, T, C.path2);
    });
    // plaza border
    c.fillStyle = C.ink;
    c.fillRect(13 * T - 1, 12 * T - 1, 10 * T + 2, 1); c.fillRect(13 * T - 1, 20 * T, 10 * T + 2, 1);
  }

  function paintPond(c) {
    Object.keys(WATER).forEach(function (row) {
      WATER[row].forEach(function (col) {
        var x = col * T, y = +row * T;
        var has = function (cx, cy) { return WATER[cy] && WATER[cy].indexOf(cx) > -1; };
        R(c, x, y, T, T, C.water);
        var r = rng(col * 31 + row);
        for (var n = 0; n < 3; n++) R(c, x + 2 + ((r() * 10) | 0), y + 2 + ((r() * 12) | 0), 4, 1, C.water2);
        if (!has(col, +row - 1)) { R(c, x, y - 2, T, 2, C.path2); R(c, x, y - 3, T, 1, C.ink); }
        if (!has(col, +row + 1)) { R(c, x, y + T, T, 2, C.path2); R(c, x, y + T + 2, T, 1, C.ink); }
        if (!has(col - 1, +row)) { R(c, x - 2, y, 2, T, C.path2); R(c, x - 3, y, 1, T, C.ink); }
        if (!has(col + 1, +row)) { R(c, x + T, y, 2, T, C.path2); R(c, x + T + 2, y, 1, T, C.ink); }
      });
    });
    // lily pads
    [[12, 24, 5, 3], [13, 25, 9, 7]].forEach(function (p) { R(c, p[0] * T + p[2], p[1] * T + p[3], 6, 4, C.leaf); R(c, p[0] * T + p[2] + 3, p[1] * T + p[3], 3, 1, C.water); });
    R(c, 12 * T + 12, 23 * T + 5, 3, 3, C.pink);
  }

  function paintEvents(c) {
    EVENTS.forEach(function (e) {
      var x = e.tx * T, y = e.ty * T;
      R(c, x + 3, y + 4, 32, 32, 'rgba(23,20,31,.25)');
      box(c, x, y, 32, 32, e.color);
      c.fillStyle = C.ink;
      for (var i = 2; i < 30; i += 4) { c.fillRect(x + i, y + 2, 2, 1); c.fillRect(x + i, y + 29, 2, 1); c.fillRect(x + 2, y + i, 1, 2); c.fillRect(x + 29, y + i, 1, 2); }
      if (e.game === 'morse') { R(c, x + 6, y + 8, 4, 4, C.ink); R(c, x + 13, y + 8, 12, 4, C.ink); R(c, x + 6, y + 15, 12, 4, C.ink); R(c, x + 21, y + 15, 4, 4, C.ink); }
      if (e.game === 'reverse') text(c, '?', x + 11, y + 7, C.ink, 3);
      if (e.game === 'timeline') { R(c, x + 6, y + 7, 20, 13, C.ink); R(c, x + 8, y + 9, 16, 9, C.paper); R(c, x + 14, y + 11, 1, 5, C.ink); R(c, x + 15, y + 12, 1, 3, C.ink); R(c, x + 16, y + 13, 1, 1, C.ink); }
      text(c, e.label, x + 16 - Math.round(textW(e.label, 1) / 2), y + 24, C.ink, 1);
    });
  }

  function paintGround(c) {
    R(c, 0, 0, MAP_W * T, MAP_H * T, C.grass);
    var r = rng(7);
    for (var n = 0; n < 1500; n++) {
      var x = (r() * MAP_W * T) | 0, y = (r() * MAP_H * T) | 0, k = r();
      if (k < .5) R(c, x, y, 1, 2, C.grass2); else if (k < .8) R(c, x, y, 2, 1, C.grass3); else { R(c, x, y, 1, 2, C.grass2); R(c, x + 2, y + 1, 1, 2, C.grass2); }
    }
  }

  function paintFlowers(c) {
    var r = rng(99), cols = [C.pink, C.yellow, C.paper, C.red];
    function flower(x, y) {
      var col = cols[(r() * cols.length) | 0];
      R(c, x, y + 1, 1, 2, C.leaf2); R(c, x - 1, y, 3, 1, col); R(c, x, y - 1, 1, 3, col); R(c, x, y, 1, 1, C.yellow);
    }
    for (var n = 0; n < 160; n++) {
      var tx = 1 + ((r() * (MAP_W - 2)) | 0), ty = 1 + ((r() * (MAP_H - 2)) | 0);
      if (isSolid(tx, ty) || pathTiles[tx + ',' + ty]) continue;
      flower(tx * T + 2 + ((r() * 12) | 0), ty * T + 3 + ((r() * 10) | 0));
    }
    // a proper flower patch east of the school door
    for (var k = 0; k < 26; k++) flower(7 * T + 4 + ((r() * 36) | 0), 18 * T + 3 + ((r() * 26) | 0));
    // bushes along the house and the plaza
    [[2, 8], [9, 8], [2, 28], [14, 22]].forEach(function (p) { box(c, p[0] * T + 2, p[1] * T + 6, 12, 8, C.leaf); R(c, p[0] * T + 4, p[1] * T + 7, 4, 2, C.leaf3); });
    // bench in the plaza
    box(c, 19 * T, 17 * T + 4, 28, 6, C.wood); R(c, 19 * T + 1, 17 * T + 10, 3, 4, C.ink); R(c, 19 * T + 24, 17 * T + 10, 3, 4, C.ink);
  }

  var built = null;
  function build() {
    if (built) return built;
    layout();
    var base = mk(MAP_W * T, MAP_H * T), over = mk(MAP_W * T, MAP_H * T);
    var bc = base.getContext('2d'), oc = over.getContext('2d');
    paintGround(bc);
    paintPaths(bc);
    paintPond(bc);
    paintEvents(bc);
    paintFlowers(bc);
    BUILDINGS.filter(function (b) { return b.style !== 'board'; }).concat(BUILDINGS.filter(function (b) { return b.style === 'board'; }))
      .sort(function (a, b) { return (a.ty + a.h) - (b.ty + b.h); })
      .forEach(function (b) { DRAW[b.style](bc, b, oc); });
    var sprites = [0, 1, 2, 3, 4].map(treeSprite);
    built = { base: base, over: over, treeSprites: sprites, lampSprite: lampSprite() };
    return built;
  }

  MW.art = {
    T: T, W: MAP_W, H: MAP_H, C: C, BUILDINGS: BUILDINGS, EVENTS: EVENTS, WATER: WATER,
    build: build, isSolid: isSolid, trees: treeList, lamps: lampList, text: text, textW: textW
  };
})();
