/* ==========================================================================
   MITISHA'S WORLD  |  js/pages.js
   Small behaviours for individual pages. Loaded at the end of every page that
   uses the shared footer. Each block does nothing if its page is not open.
   ========================================================================== */
(function () {
  window.MW = window.MW || {};
  if (!MW.store) return;

  document.addEventListener('DOMContentLoaded', function () {

    /* ---- footer: reset my progress ---- */
    var reset = document.querySelector('[data-reset-progress]');
    if (reset) {
      reset.addEventListener('click', function () {
        if (window.confirm('Reset your XP, stars and stickers on this device?')) {
          MW.store.reset();
          MW.toast('Progress reset. Fresh start!');
        }
      });
    }

    /* ---- skills: collect the stickers ---- */
    var stickers = document.querySelectorAll('.sticker[data-skill]');
    if (stickers.length) {
      var counter = document.querySelector('[data-sticker-count]');
      var syncStickers = function () {
        var saved = MW.store.get().stickers, n = 0;
        Array.prototype.forEach.call(stickers, function (b) {
          var on = !!saved[b.getAttribute('data-skill')];
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          if (on) n++;
        });
        if (counter) counter.textContent = n;
      };
      Array.prototype.forEach.call(stickers, function (b) {
        b.addEventListener('click', function () {
          var name = b.getAttribute('data-skill');
          MW.store.update(function (d) { d.stickers[name] = d.stickers[name] ? 0 : 1; }, 'sticker stuck: ' + name);
          MW.sound.play('tick');
        });
      });
      window.addEventListener('mw:change', syncStickers);
      syncStickers();
    }

    /* ---- projects: insert a coin to boot a cabinet ---- */
    Array.prototype.forEach.call(document.querySelectorAll('.cab'), function (cab) {
      var btn = cab.querySelector('.coin-btn');
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (cab.classList.contains('on')) return;
        cab.classList.add('on');
        btn.setAttribute('aria-expanded', 'true');
        var label = btn.querySelector('span:last-child');
        if (label) label.textContent = 'Coin inserted';
        MW.sound.play('coin');
        var go = cab.querySelector('.screen-play a');
        if (go) go.focus();
      });
    });

    /* ---- secret room: only open once all stars are found ---- */
    var locked = document.querySelector('[data-hire-locked]');
    var open = document.querySelector('[data-hire-open]');
    if (locked && open) {
      var total = (MW.config && MW.config.stars ? MW.config.stars.length : 7);
      var gate = function () {
        var ok = MW.store.get().stars.length >= total;
        locked.hidden = ok;
        open.hidden = !ok;
      };
      window.addEventListener('mw:change', gate);
      gate();
    }
  });
})();
