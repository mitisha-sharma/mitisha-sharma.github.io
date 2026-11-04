/* ==========================================================================
   MITISHA'S WORLD  |  js/games.js
   The four mini games. Each one is a small function that builds its own
   HTML inside a container, so the same game works on play.html and as a
   pop-up when you walk onto a pad in the world.

     1. Blink Morse     (from the BlinkMorse project)
     2. Reverse Coding  (from the Reverse Coding Champion win)
     3. Edit Timeline   (from loving video editing)
     4. Hidden stars    (progress panel for the star hunt)

   Edit the words, puzzles and clips in the DATA blocks below.
   Needs: config.js, avatar.js, common.js
   ========================================================================== */
(function () {
  window.MW = window.MW || {};
  var el = MW.el, reduced = MW.reducedMotion;
  function save(fn, reason) { MW.store.update(fn, reason); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ======================================================================
     1. BLINK MORSE
     ====================================================================== */
  var MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
    N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..' };
  var UNMORSE = {}; Object.keys(MORSE).forEach(function (k) { UNMORSE[MORSE[k]] = k; });
  var WORDS = ['HI', 'SOS', 'CODE', 'HIRE ME'];       // DATA: change the words here
  var DASH_MS = 260;                                   // a press longer than this is a dash
  var COMMIT_MS = 1500;                                // pause this long and the letter is read

  function codeEl(code) {
    var s = el('span', 'code'); s.setAttribute('role', 'img');
    s.setAttribute('aria-label', code.split('').map(function (c) { return c === '.' ? 'dot' : 'dash'; }).join(' '));
    code.split('').forEach(function (c) { var i = el('i', c === '.' ? 'd' : 'l'); i.setAttribute('aria-hidden', 'true'); s.appendChild(i); });
    return s;
  }

  var EYE_SVG = '<svg viewBox="0 0 120 80" aria-hidden="true" focusable="false"><path class="eye-white" d="M6 40Q60 -4 114 40Q60 84 6 40z" fill="#FBF5E6" stroke="#17141F" stroke-width="5" stroke-linejoin="round"/>' +
    '<g class="eye-open"><circle cx="60" cy="40" r="19" fill="#2B50E8" stroke="#17141F" stroke-width="4"/><circle cx="60" cy="40" r="8" fill="#17141F"/><circle cx="54" cy="33" r="4" fill="#fff"/></g>' +
    '<path class="eye-lid" d="M6 40Q60 62 114 40" fill="none" stroke="#17141F" stroke-width="6" stroke-linecap="round"/>' +
    '<path class="eye-lash" d="M16 50l-8 8M40 60l-4 10M80 60l4 10M104 50l8 8" fill="none" stroke="#17141F" stroke-width="4" stroke-linecap="round"/></svg>';

  function mountMorse(box) {
    var level = 0, symbols = [], typed = '', done = {}, commitTimer = null, pressStart = 0, raf = 0, pressed = false, showHint = false, finished = false;
    box.className += ' mg mg-morse';
    var tabs = el('div', 'mg-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Pick a word');
    var target = el('div', 'mg-target'); target.setAttribute('aria-live', 'polite');
    var status = el('p', 'mg-status'); status.setAttribute('role', 'status');
    var eye = el('button', 'eye'); eye.type = 'button'; eye.innerHTML = EYE_SVG;
    eye.setAttribute('aria-label', 'Blink button. Tap or press Space for a dot. Hold for a dash.');
    var meter = el('div', 'mg-meter'); meter.setAttribute('aria-hidden', 'true'); meter.innerHTML = '<i></i><span class="thresh"></span><em>dot</em><em>dash</em>';
    var fill = meter.firstChild;
    var timer = el('div', 'mg-timer'); timer.setAttribute('aria-hidden', 'true'); timer.innerHTML = '<i></i>';
    var cur = el('p', 'mg-current'); cur.innerHTML = '<span class="pixel">Typing:</span> <span class="mg-code"></span>';
    var btns = el('div', 'mg-buttons');
    function mkBtn(label, cls, fn, aria) { var b = el('button', 'btn btn-sm ' + cls, label); b.type = 'button'; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', fn); btns.appendChild(b); return b; }
    mkBtn('Dot (.)', 'btn-paper', function () { add('.'); }, 'Add a dot');
    mkBtn('Dash (-)', 'btn-paper', function () { add('-'); }, 'Add a dash');
    mkBtn('Read letter', 'btn-mint', function () { commit(); }, 'Read this letter now');
    mkBtn('Undo', 'btn-paper', function () { symbols.pop(); renderCur(); restartTimer(); });
    var hintBtn = mkBtn('Show the code', 'btn-yellow', function () { showHint = !showHint; hintBtn.textContent = showHint ? 'Hide the code' : 'Show the code'; hintBtn.setAttribute('aria-pressed', showHint); renderTarget(); });
    hintBtn.setAttribute('aria-pressed', 'false');
    var chart = el('details', 'mg-chart'); chart.open = true;
    chart.appendChild(el('summary', 'pixel', 'Decoder chart'));
    var grid = el('ul', 'chart');
    Object.keys(MORSE).forEach(function (k) { var li = el('li'); li.appendChild(el('b', 'pixel', k)); li.appendChild(codeEl(MORSE[k])); li.setAttribute('data-l', k); grid.appendChild(li); });
    chart.appendChild(grid);
    var stage = el('div', 'mg-stage'); stage.appendChild(eye); stage.appendChild(meter);
    box.appendChild(tabs); box.appendChild(target); box.appendChild(status); box.appendChild(stage); box.appendChild(timer); box.appendChild(cur); box.appendChild(btns); box.appendChild(chart);

    function word() { return WORDS[level]; }
    function renderTabs() {
      tabs.innerHTML = '';
      WORDS.forEach(function (w, i) {
        var b = el('button', 'btn btn-sm ' + (i === level ? 'btn-red' : 'btn-paper'), (done[w] ? 'Done: ' : '') + w); b.type = 'button';
        b.setAttribute('aria-pressed', i === level ? 'true' : 'false');
        b.addEventListener('click', function () { level = i; reset(); });
        tabs.appendChild(b);
      });
    }
    function renderTarget() {
      target.innerHTML = '';
      var w = word(), n = 0;
      w.split('').forEach(function (ch) {
        if (ch === ' ') { target.appendChild(el('span', 'tl gap')); return; }
        var cell = el('span', 'tl' + (n < typed.replace(/ /g, '').length ? ' got' : (n === typed.replace(/ /g, '').length ? ' now' : '')));
        cell.appendChild(el('b', 'pixel', n < typed.replace(/ /g, '').length ? ch : (n === typed.replace(/ /g, '').length ? '?' : '_')));
        if (showHint) cell.appendChild(codeEl(MORSE[ch]));
        target.appendChild(cell); n++;
      });
      var lis = grid.children, need = word().replace(/ /g, '');
      for (var i = 0; i < lis.length; i++) lis[i].classList.toggle('need', need.indexOf(lis[i].getAttribute('data-l')) > -1);
      target.setAttribute('aria-label', 'Spell ' + w + '. ' + typed.replace(/ /g, '').length + ' of ' + need.length + ' letters done.');
    }
    function renderCur() { var c = cur.querySelector('.mg-code'); c.innerHTML = ''; if (symbols.length) c.appendChild(codeEl(symbols.join(''))); else c.textContent = '(nothing yet)'; }
    function say(t, bad) { status.textContent = t; status.className = 'mg-status' + (bad ? ' bad' : ''); }
    function reset() { symbols = []; typed = ''; finished = false; clearTimeout(commitTimer); renderTabs(); renderTarget(); renderCur(); timer.firstChild.style.width = '0'; say('Spell ' + word() + '. Tap for a dot, hold for a dash. Pause to lock in a letter.'); }
    function restartTimer() {
      clearTimeout(commitTimer);
      var bar = timer.firstChild;
      bar.style.transition = 'none'; bar.style.width = symbols.length ? '100%' : '0';
      if (!symbols.length || finished) return;
      void bar.offsetWidth;
      if (!reduced) { bar.style.transition = 'width ' + COMMIT_MS + 'ms linear'; bar.style.width = '0'; }
      commitTimer = setTimeout(commit, COMMIT_MS);
    }
    function add(sym) {
      if (finished) return;
      symbols.push(sym); MW.sound.play(sym === '.' ? 'dot' : 'dash'); renderCur(); restartTimer();
    }
    function commit() {
      clearTimeout(commitTimer);
      if (!symbols.length || finished) return;
      var code = symbols.join(''); symbols = []; renderCur(); timer.firstChild.style.width = '0';
      var letter = UNMORSE[code];
      var need = word().replace(/ /g, ''), pos = typed.replace(/ /g, '').length, want = need.charAt(pos);
      if (!letter) { MW.sound.play('bad'); say('That code is not a letter. Check the chart and try again.', true); return; }
      if (letter !== want) { MW.sound.play('bad'); say('That spelled ' + letter + ', but I need ' + want + '. Try again.', true); return; }
      typed += letter; MW.sound.play('good');
      var nextIsGap = word().charAt(typed.length) === ' ';
      if (nextIsGap) typed += ' ';
      renderTarget();
      if (typed.replace(/ /g, '').length === need.length) won(); else say('Yes, ' + letter + '! Next letter.');
    }
    function won() {
      finished = true; done[word()] = true; renderTabs(); MW.sound.play('win');
      say('Decoded: ' + word() + '!');
      save(function (d) { d.games.morse = 1; }, 'Blink Morse');
      if (word() === 'HIRE ME') setTimeout(surprise, 500);
      else if (level < WORDS.length - 1) { var nb = el('button', 'btn btn-sm btn-red', 'Next word'); nb.type = 'button'; nb.addEventListener('click', function () { level++; reset(); eye.focus(); }); status.appendChild(document.createTextNode(' ')); status.appendChild(nb); nb.focus(); }
    }
    function surprise() {
      save(function (d) { d.games.hire = 1; d.ticket = true; }, 'you spelled HIRE ME');
      confetti();
      var t = el('div', 'ticket-wrap');
      var tk = el('div', 'ticket');
      tk.appendChild(el('p', 'pixel ticket-top', 'ADMIT ONE'));
      tk.appendChild(el('h3', '', 'One friendly conversation with Mitisha'));
      tk.appendChild(el('p', '', 'You spelled HIRE ME in Morse code. That is a creative way to ask.'));
      var a = el('a', 'btn btn-red', 'Email me'); a.href = 'mailto:' + MW.config.email + '?subject=Hi%20Mitisha'; tk.appendChild(a);
      t.appendChild(tk);
      var hat = el('div', 'ticket-hat'); var cv = document.createElement('canvas'); cv.width = 80; cv.height = 92; cv.setAttribute('data-avatar', 'down'); cv.setAttribute('aria-hidden', 'true'); hat.appendChild(cv);
      hat.appendChild(el('p', 'small', 'Bonus unlocked: your avatar wears a party hat in the world now.'));
      t.appendChild(hat);
      MW.modal.open({ title: 'Surprise!', content: t, focus: 'a.btn' });
      MW.renderChip();
    }

    /* the eye: press and hold */
    function meterLoop() {
      if (!pressed) return;
      var d = performance.now() - pressStart, pct = Math.min(1, d / (DASH_MS * 2));
      fill.style.width = (pct * 100) + '%'; fill.className = d >= DASH_MS ? 'dash' : '';
      raf = requestAnimationFrame(meterLoop);
    }
    function down() {
      if (pressed || finished) return;
      pressed = true; pressStart = performance.now(); eye.classList.add('closed');
      clearTimeout(commitTimer); MW.sound.toneStart(700); meterLoop();
    }
    function up() {
      if (!pressed) return;
      pressed = false; cancelAnimationFrame(raf); eye.classList.remove('closed'); MW.sound.toneStop();
      var d = performance.now() - pressStart; fill.style.width = '0';
      symbols.push(d >= DASH_MS ? '-' : '.'); renderCur(); restartTimer();
    }
    eye.addEventListener('pointerdown', function (e) { e.preventDefault(); try { eye.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } down(); });
    eye.addEventListener('pointerup', up); eye.addEventListener('pointercancel', up); eye.addEventListener('lostpointercapture', up);
    eye.addEventListener('keydown', function (e) {
      if (e.key === ' ') { e.preventDefault(); if (!e.repeat) down(); }
      else if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Backspace') { e.preventDefault(); symbols.pop(); renderCur(); restartTimer(); }
    });
    eye.addEventListener('keyup', function (e) { if (e.key === ' ') { e.preventDefault(); up(); } });
    eye.addEventListener('click', function (e) { e.preventDefault(); });
    eye.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    reset();
    return { destroy: function () { clearTimeout(commitTimer); cancelAnimationFrame(raf); MW.sound.toneStop(); } };
  }

  function confetti() {
    if (reduced) return;
    var cv = document.createElement('canvas'); cv.className = 'confetti';
    cv.width = window.innerWidth; cv.height = window.innerHeight; document.body.appendChild(cv);
    var x = cv.getContext('2d'), cols = ['#FFD23F', '#FF4B3A', '#2B50E8', '#7FE3B5', '#FF8FC0'], bits = [];
    for (var i = 0; i < 140; i++) bits.push({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * .5, vx: (Math.random() - .5) * 140, vy: 120 + Math.random() * 220, s: 6 + Math.random() * 8, c: cols[i % 5] });
    var t0 = performance.now(), last = t0;
    (function step(now) {
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      x.clearRect(0, 0, cv.width, cv.height);
      bits.forEach(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; x.fillStyle = b.c; x.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s); });
      if (now - t0 < 2800) requestAnimationFrame(step); else if (cv.parentNode) cv.parentNode.removeChild(cv);
    })(t0);
  }

  /* ======================================================================
     2. REVERSE CODING     (DATA: 5 original puzzles. ans = index of the right option)
     ====================================================================== */
  var PUZZLES = [
    { out: 'olleh', kind: 'Code output', opts: ['reverse the word "hello"', 'sort the letters of "hello"', 'make "hello" uppercase'], ans: 0, why: 'The letters of "hello" come out backwards.' },
    { out: '1 1 2 3 5 8', kind: 'Code output', opts: ['the first six Fibonacci numbers', 'the first six prime numbers', 'powers of two up to 32'], ans: 0, why: 'Each number is the sum of the two before it.' },
    { out: 'Hi team, the meeting moved to 4 pm. Thanks!', kind: 'AI reply', opts: ['Write a short, polite note telling the team the meeting moved to 4 pm.', 'Write a long, angry email about meetings.', 'Summarise a book chapter in three bullet points.'], ans: 0, why: 'The reply is short, polite and mentions 4 pm, so the prompt asked for exactly that.' },
    { out: 'HELLO WORLD', kind: 'Code output', opts: ['"hello world".upper()', '"hello world".title()', '"hello world".capitalize()'], ans: 0, why: 'upper() makes every letter a capital. title() would give "Hello World".' },
    { out: '15', kind: 'Code output', opts: ['sum(range(1, 6))', '5 * 5', '2 ** 4'], ans: 0, why: '1 + 2 + 3 + 4 + 5 = 15. The other two give 25 and 16.' }
  ];

  function mountReverse(box) {
    var i = 0, score = 0, locked = false;
    box.className += ' mg mg-reverse';
    function render() {
      box.innerHTML = '';
      if (i >= PUZZLES.length) return end();
      var p = PUZZLES[i];
      box.appendChild(el('p', 'pixel rc-step', 'Round ' + (i + 1) + ' of ' + PUZZLES.length + '   Score: ' + score));
      var out = el('div', 'rc-out'); out.appendChild(el('span', 'pixel rc-label', 'Output: ' + p.kind)); out.appendChild(el('pre', '', p.out)); box.appendChild(out);
      box.appendChild(el('p', 'rc-q', 'Which input or prompt most likely made this?'));
      var list = el('div', 'rc-opts'); list.setAttribute('role', 'group'); list.setAttribute('aria-label', 'Answers');
      var order = shuffle(p.opts.map(function (t, k) { return { t: t, ok: k === p.ans }; }));
      var fb = el('p', 'rc-fb'); fb.setAttribute('role', 'status');
      order.forEach(function (o, k) {
        var b = el('button', 'rc-opt'); b.type = 'button';
        b.appendChild(el('span', 'pixel rc-letter', String.fromCharCode(65 + k))); b.appendChild(el('span', 'rc-text', o.t));
        b.addEventListener('click', function () {
          if (locked) return; locked = true;
          Array.prototype.forEach.call(list.children, function (c, idx) { c.disabled = true; if (order[idx].ok) c.classList.add('right'); });
          if (o.ok) { score++; b.classList.add('right'); fb.textContent = 'Correct. ' + p.why; fb.className = 'rc-fb good'; MW.sound.play('good'); }
          else { b.classList.add('wrong'); fb.textContent = 'Not quite. ' + p.why; fb.className = 'rc-fb bad'; MW.sound.play('bad'); }
          var nx = el('button', 'btn btn-red', i === PUZZLES.length - 1 ? 'See my score' : 'Next round'); nx.type = 'button';
          nx.addEventListener('click', function () { i++; locked = false; render(); var f = box.querySelector('.rc-opt,.btn'); if (f) f.focus(); });
          var row = el('p', 'actions'); row.appendChild(nx); fb.appendChild(row); nx.focus();
        });
        list.appendChild(b);
      });
      box.appendChild(list); box.appendChild(fb);
    }
    function end() {
      save(function (d) { d.games.reverse = Math.max(d.games.reverse || 0, score); }, 'Reverse Coding');
      var perfect = score === PUZZLES.length; if (perfect) MW.sound.play('win');
      var r = el('div', 'rc-end');
      r.appendChild(el('p', 'big-score pixel', score + ' / ' + PUZZLES.length));
      r.appendChild(el('p', 'lead', perfect ? 'Perfect round. Nicely read.' : (score >= 3 ? 'Good reading. One more go for a perfect round?' : 'Reversing is tricky. Another go?')));
      var again = el('button', 'btn btn-red', 'Play again'); again.type = 'button';
      again.addEventListener('click', function () { i = 0; score = 0; locked = false; render(); });
      var p = el('p', 'actions'); p.appendChild(again); r.appendChild(p);
      box.appendChild(r); again.focus();
    }
    render();
    return { destroy: function () {} };
  }

  /* ======================================================================
     3. EDIT TIMELINE     (DATA: five clips, listed in the CORRECT order)
     ====================================================================== */
  var INK = '#17141F';
  var CLIPS = [
    { id: 'c1', cap: 'A slice, all alone', bg: '#7FE3B5',
      svg: '<ellipse cx="60" cy="56" rx="38" ry="12" fill="#FBF5E6" stroke="' + INK + '" stroke-width="3"/><path d="M42 54L78 54L60 22z" fill="#FFD23F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><circle cx="56" cy="42" r="4" fill="#FF4B3A"/><circle cx="64" cy="49" r="3.5" fill="#FF4B3A"/>' },
    { id: 'c2', cap: 'Phone buzzes', bg: '#FF8FC0',
      svg: '<rect x="40" y="48" width="40" height="40" fill="#2B50E8" stroke="' + INK + '" stroke-width="3"/><circle cx="60" cy="32" r="15" fill="#F6BC96" stroke="' + INK + '" stroke-width="3"/><path d="M50 26q10-8 20 0v-4q-10-8-20 0z" fill="#2B1B22"/><rect x="54" y="52" width="14" height="20" rx="2" fill="' + INK + '"/><rect x="56" y="55" width="10" height="12" fill="#BFE3FF"/><circle cx="55" cy="33" r="2" fill="' + INK + '"/><circle cx="65" cy="33" r="2" fill="' + INK + '"/>' },
    { id: 'c3', cap: 'Eyes in the dark', bg: '#2E2A3D',
      svg: '<path d="M30 44l8-16 10 12zM90 44l-8-16-10 12z" fill="#17141F"/><rect x="26" y="40" width="68" height="34" rx="14" fill="#17141F"/><ellipse cx="46" cy="54" rx="9" ry="7" fill="#FFD23F"/><ellipse cx="74" cy="54" rx="9" ry="7" fill="#FFD23F"/><rect x="45" y="48" width="2.5" height="12" fill="#17141F"/><rect x="73" y="48" width="2.5" height="12" fill="#17141F"/><path d="M0 72h120v8H0z" fill="#4A4458"/>' },
    { id: 'c4', cap: 'Snatch!', bg: '#FFD23F',
      svg: '<ellipse cx="60" cy="62" rx="38" ry="11" fill="#FBF5E6" stroke="' + INK + '" stroke-width="3"/><path d="M118 8L74 40" stroke="#17141F" stroke-width="16" stroke-linecap="round"/><path d="M118 8L74 40" stroke="#E39A4A" stroke-width="10" stroke-linecap="round"/><circle cx="68" cy="46" r="11" fill="#E39A4A" stroke="' + INK + '" stroke-width="3"/><circle cx="62" cy="40" r="3" fill="#FFD23F" stroke="' + INK + '" stroke-width="1.5"/><path d="M60 54L72 54L66 44z" fill="#FF8FC0"/><path d="M12 28h18M6 40h20M16 52h16" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'c5', cap: 'Empty plate', bg: '#2B50E8',
      svg: '<ellipse cx="40" cy="66" rx="30" ry="9" fill="#FBF5E6" stroke="' + INK + '" stroke-width="3"/><circle cx="92" cy="40" r="14" fill="#F6BC96" stroke="' + INK + '" stroke-width="3"/><ellipse cx="92" cy="45" rx="4" ry="5" fill="' + INK + '"/><circle cx="87" cy="37" r="2" fill="' + INK + '"/><circle cx="97" cy="37" r="2" fill="' + INK + '"/><rect x="78" y="54" width="28" height="28" fill="#FF4B3A" stroke="' + INK + '" stroke-width="3"/><path d="M60 8h34v18H70l-6 8z" fill="#FBF5E6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><path d="M77 12v8M77 23v1" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>' }
  ];

  function mountTimeline(box) {
    box.className += ' mg mg-timeline';
    var order = [], dragging = null, slotW = 0, gap = 10;
    function initOrder() { do { order = shuffle(CLIPS); } while (order.every(function (c, k) { return c.id === CLIPS[k].id; })); }
    initOrder();
    var msg = el('p', 'mg-status', 'Drag the clips into the order that tells the story. On a keyboard, focus a clip and use the left and right arrow keys.'); msg.setAttribute('role', 'status');
    var track = el('ol', 'tl-track');
    var ruler = el('div', 'tl-ruler'); ruler.setAttribute('aria-hidden', 'true'); ruler.innerHTML = '<span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>00:20</span>';
    var head = el('div', 'tl-head'); head.setAttribute('aria-hidden', 'true');
    var wrap = el('div', 'tl-wrap'); wrap.appendChild(ruler); wrap.appendChild(track); wrap.appendChild(head);
    var row = el('p', 'actions');
    var play = el('button', 'btn btn-red', 'Play the cut'); play.type = 'button';
    var shuf = el('button', 'btn btn-sm btn-paper', 'Shuffle again'); shuf.type = 'button';
    row.appendChild(play); row.appendChild(shuf);
    box.appendChild(msg); box.appendChild(wrap); box.appendChild(row);

    var clipEls = {};
    CLIPS.forEach(function (c) {
      var li = el('li', 'tl-clip'); li.tabIndex = 0; li.setAttribute('data-id', c.id);
      li.innerHTML = '<svg viewBox="0 0 120 80" aria-hidden="true" focusable="false"><rect width="120" height="80" fill="' + c.bg + '"/>' + c.svg + '</svg>';
      li.appendChild(el('span', 'tl-cap pixel', c.cap));
      clipEls[c.id] = li; track.appendChild(li);
    });
    function measure() { slotW = track.clientWidth / CLIPS.length; }
    function layout(skip) {
      measure();
      order.forEach(function (c, k) {
        var e = clipEls[c.id]; if (e === skip) return;
        e.style.width = (slotW - gap) + 'px'; e.style.left = (k * slotW) + 'px';
        e.setAttribute('aria-label', 'Clip: ' + c.cap + '. Position ' + (k + 1) + ' of ' + CLIPS.length + '. Use the left and right arrow keys to move it.');
      });
      track.style.height = (clipEls[order[0].id].offsetHeight || 120) + 'px';
    }
    function move(id, to) {
      var from = order.findIndex(function (c) { return c.id === id; });
      if (to < 0 || to >= order.length || to === from) return false;
      var item = order.splice(from, 1)[0]; order.splice(to, 0, item); return true;
    }
    track.addEventListener('pointerdown', function (e) {
      var li = e.target.closest ? e.target.closest('.tl-clip') : null; if (!li) return;
      e.preventDefault(); li.focus();
      measure();
      dragging = { el: li, id: li.getAttribute('data-id'), x0: e.clientX, left0: parseFloat(li.style.left) || 0, pid: e.pointerId };
      li.classList.add('lifted'); try { li.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    });
    track.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== dragging.pid) return;
      var left = Math.max(0, Math.min(track.clientWidth - slotW, dragging.left0 + e.clientX - dragging.x0));
      dragging.el.style.left = left + 'px';
      var to = Math.max(0, Math.min(CLIPS.length - 1, Math.round(left / slotW)));
      if (move(dragging.id, to)) layout(dragging.el);
    });
    function drop(e) {
      if (!dragging || e.pointerId !== dragging.pid) return;
      dragging.el.classList.remove('lifted'); dragging = null; layout(); MW.sound.play('tick');
    }
    track.addEventListener('pointerup', drop); track.addEventListener('pointercancel', drop);
    track.addEventListener('keydown', function (e) {
      var li = e.target.closest ? e.target.closest('.tl-clip') : null; if (!li) return;
      var id = li.getAttribute('data-id'), idx = order.findIndex(function (c) { return c.id === id; }), to = idx;
      if (e.key === 'ArrowLeft') to = idx - 1; else if (e.key === 'ArrowRight') to = idx + 1; else return;
      e.preventDefault();
      if (move(id, to)) { layout(); msg.textContent = 'Moved "' + order[to].cap + '" to position ' + (to + 1) + ' of ' + CLIPS.length + '.'; MW.sound.play('tick'); }
    });
    shuf.addEventListener('click', function () { initOrder(); layout(); msg.textContent = 'Shuffled. Put the story back in order.'; msg.className = 'mg-status'; });
    play.addEventListener('click', function () {
      var right = order.filter(function (c, k) { return c.id === CLIPS[k].id; }).length;
      if (right < CLIPS.length) {
        MW.sound.play('bad');
        msg.textContent = right + ' of ' + CLIPS.length + ' clips are in the right place. Try again.'; msg.className = 'mg-status bad';
        wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake'); return;
      }
      msg.className = 'mg-status'; msg.textContent = 'Rolling...'; play.disabled = true;
      var k = 0;
      function step() {
        Object.keys(clipEls).forEach(function (id) { clipEls[id].classList.remove('playing'); });
        if (k >= CLIPS.length) { head.style.left = '100%'; finish(); return; }
        clipEls[order[k].id].classList.add('playing'); head.style.left = ((k + .5) / CLIPS.length * 100) + '%'; MW.sound.play('tick'); k++;
        setTimeout(step, reduced ? 80 : 650);
      }
      function finish() {
        play.disabled = false; MW.sound.play('win');
        msg.textContent = 'Cut approved! The slice is gone and so is the cat. That is a story.';
        save(function (d) { d.games.timeline = 1; }, 'Edit Timeline');
      }
      step();
    });
    layout();
    var ro = window.ResizeObserver ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(track); else window.addEventListener('resize', function () { layout(); });
    return { destroy: function () { if (ro) ro.disconnect(); }, relayout: layout };
  }

  /* ======================================================================
     4. HIDDEN STARS     (a progress panel for the star hunt in the world)
     ====================================================================== */
  function mountStars(box) {
    box.className += ' mg mg-stars';
    var stars = MW.config.stars || [];
    var row = el('ul', 'star-row'); row.setAttribute('aria-label', 'Stars found');
    var count = el('p', 'star-count pixel');
    var link = el('p', 'actions');
    var clues = el('details', 'clues'); clues.appendChild(el('summary', 'pixel', 'Need a clue?'));
    var ol = el('ol'); clues.appendChild(ol);
    box.appendChild(row); box.appendChild(count); box.appendChild(link); box.appendChild(clues);
    function render() {
      var got = MW.store.get().stars;
      row.innerHTML = ''; ol.innerHTML = '';
      stars.forEach(function (s, k) {
        var on = got.indexOf(s.id) > -1;
        var li = el('li', 'star' + (on ? ' on' : ''));
        li.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2l3 7 7.5.7-5.7 5 1.8 7.4L12 18l-6.6 4.1 1.8-7.4-5.7-5L9 9z" fill="' + (on ? '#FFD23F' : 'none') + '" stroke="#17141F" stroke-width="2" stroke-linejoin="round"/></svg><span class="sr-only">Star ' + (k + 1) + (on ? ' found' : ' not found yet') + '</span>';
        row.appendChild(li);
        var c = el('li', on ? 'found' : '', (on ? 'Found: ' : 'Star ' + (k + 1) + ': ') + s.clue); ol.appendChild(c);
      });
      count.textContent = got.length + ' of ' + stars.length + ' stars found';
      link.innerHTML = '';
      var go = el('a', 'btn btn-yellow', got.length >= stars.length ? 'Open the secret room' : 'Walk into the world and find them');
      go.href = got.length >= stars.length ? 'hire-me.html' : 'index.html'; link.appendChild(go);
    }
    window.addEventListener('mw:change', render);
    render();
    return { destroy: function () { window.removeEventListener('mw:change', render); } };
  }

  /* ---------------------------------------------------------------- public */
  var MOUNT = { morse: mountMorse, reverse: mountReverse, timeline: mountTimeline, stars: mountStars };
  var TITLES = { morse: 'Blink Morse', reverse: 'Reverse Coding', timeline: 'Edit Timeline', stars: 'Hidden stars' };
  var BLURBS = {
    morse: 'My BlinkMorse project is an ESP32 eye-blink Morse system. Tap the eye for a dot, hold it for a dash.',
    reverse: 'Pick the input or prompt that most likely made each output.',
    timeline: 'Drag the five clips into the order that tells the story.'
  };

  MW.games = {
    mount: function (name, container) { return MOUNT[name] ? MOUNT[name](container) : null; },
    openModal: function (name, opts) {
      opts = opts || {};
      var wrap = el('div', 'game-modal');
      if (BLURBS[name]) wrap.appendChild(el('p', 'game-blurb', BLURBS[name]));
      var inner = el('div'); wrap.appendChild(inner);
      var inst = MOUNT[name](inner);
      var m = MW.modal.open({ title: TITLES[name], content: wrap, className: 'modal-game', onClose: function () { if (inst && inst.destroy) inst.destroy(); if (opts.onClose) opts.onClose(); } });
      if (inst && inst.relayout) setTimeout(inst.relayout, 60);
      return m;
    }
  };

  function mountAll() {
    Array.prototype.forEach.call(document.querySelectorAll('.game-mount[data-game]'), function (c) { MW.games.mount(c.getAttribute('data-game'), c); });
  }
  document.addEventListener('DOMContentLoaded', mountAll);
})();
