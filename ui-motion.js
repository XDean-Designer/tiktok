/**
 * UI motion — iOS-leaning transitions for scan sheet, platform morph,
 * list stagger, and expand helpers. Used by app.js.
 */
(function (global) {
  'use strict';

  function reduceMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function nextFrame() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { requestAnimationFrame(resolve); });
    });
  }

  /** Sheet: scan → input (mild rebound, no strong squash) */
  function openInputSheet(done) {
    var scan = $('#screen-scan');
    var input = $('#screen-input');
    if (!scan || !input) {
      if (done) done();
      return;
    }
    document.querySelectorAll('.screen').forEach(function (s) {
      if (s !== scan && s !== input) s.classList.remove('active');
    });
    scan.classList.add('active');
    input.classList.add('active', 'ux-sheet');
    input.classList.remove('ux-sheet--in', 'ux-sheet--settle', 'ux-sheet--out');
    void input.offsetWidth;
    if (reduceMotion()) {
      input.classList.add('ux-sheet--in');
      if (done) done();
      return;
    }
    nextFrame().then(function () {
      input.classList.add('ux-sheet--in');
      return wait(320);
    }).then(function () {
      input.classList.add('ux-sheet--settle');
      return wait(280);
    }).then(function () {
      input.classList.remove('ux-sheet--settle');
      if (done) done();
    });
  }

  function closeInputSheet(done) {
    var input = $('#screen-input');
    var scan = $('#screen-scan');
    if (!input || !input.classList.contains('ux-sheet')) {
      if (done) done();
      return;
    }
    if (reduceMotion()) {
      input.classList.remove('active', 'ux-sheet', 'ux-sheet--in', 'ux-sheet--settle', 'ux-sheet--out');
      if (scan) scan.classList.add('active');
      if (done) done();
      return;
    }
    input.classList.remove('ux-sheet--settle');
    input.classList.add('ux-sheet--out');
    wait(280).then(function () {
      input.classList.remove('active', 'ux-sheet', 'ux-sheet--in', 'ux-sheet--out');
      if (scan) scan.classList.add('active');
      if (done) done();
    });
  }

  /** tg-set → tg-deals: slide in from right */
  function slideDealsIn(done) {
    var set = $('#screen-tg-set');
    var deals = $('#screen-tg-deals');
    if (!set || !deals) {
      if (done) done();
      return;
    }
    if (reduceMotion()) {
      if (done) done();
      return;
    }
    document.querySelectorAll('.screen').forEach(function (s) {
      if (s !== set && s !== deals) s.classList.remove('active');
    });
    set.classList.add('active');
    deals.classList.add('active', 'ux-push');
    deals.classList.remove('ux-push--in', 'ux-push--out');
    void deals.offsetWidth;
    nextFrame().then(function () {
      deals.classList.add('ux-push--in');
      return wait(320);
    }).then(function () {
      deals.classList.remove('ux-push', 'ux-push--in', 'ux-push--out');
      if (done) done();
    });
  }

  /** tg-deals → tg-set: slide out to right */
  function slideDealsOut(done) {
    var set = $('#screen-tg-set');
    var deals = $('#screen-tg-deals');
    if (!deals) {
      if (done) done();
      return;
    }
    if (reduceMotion()) {
      if (done) done();
      return;
    }
    if (set) set.classList.add('active');
    deals.classList.add('active', 'ux-push', 'ux-push--in');
    void deals.offsetWidth;
    nextFrame().then(function () {
      deals.classList.remove('ux-push--in');
      deals.classList.add('ux-push--out');
      return wait(280);
    }).then(function () {
      deals.classList.remove('active', 'ux-push', 'ux-push--in', 'ux-push--out');
      if (done) done();
    });
  }

  /* legacy aliases */
  function morphPlatToDeals(_card, done) { slideDealsIn(done); }
  function morphDealsToSet(done) { slideDealsOut(done); }

  /** Stagger list cards in from left/right */
  function staggerListIn(container, dir, done) {
    if (!container) {
      if (done) done();
      return;
    }
    var cards = Array.prototype.slice.call(container.children).filter(function (el) {
      return el.nodeType === 1 && !el.hidden;
    });
    if (!cards.length || reduceMotion()) {
      if (done) done();
      return;
    }
    var dx = dir < 0 ? -28 : 28;
    cards.forEach(function (card, i) {
      card.classList.add('ux-stagger');
      card.style.setProperty('--ux-dx', dx + 'px');
      card.style.setProperty('--ux-delay', (i * 20) + 'ms');
      void card.offsetWidth;
      card.classList.add('ux-stagger--in');
    });
    var total = 220 + cards.length * 20;
    wait(Math.min(total, 320)).then(function () {
      cards.forEach(function (card) {
        card.classList.remove('ux-stagger', 'ux-stagger--in');
        card.style.removeProperty('--ux-dx');
        card.style.removeProperty('--ux-delay');
      });
      if (done) done();
    });
  }

  function scrollCardToCenter(card, scroller) {
    if (!card || !scroller) return;
    var cRect = card.getBoundingClientRect();
    var sRect = scroller.getBoundingClientRect();
    var cardMid = cRect.top + cRect.height / 2;
    var viewMid = sRect.top + sRect.height / 2;
    if (cardMid <= viewMid) return;
    var delta = cardMid - viewMid;
    if (reduceMotion()) {
      scroller.scrollTop += delta;
      return;
    }
    var start = scroller.scrollTop;
    var target = start + delta;
    var t0 = performance.now();
    var dur = 200;
    function tick(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      scroller.scrollTop = start + (target - start) * e;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  global.UiMotion = {
    reduceMotion: reduceMotion,
    openInputSheet: openInputSheet,
    closeInputSheet: closeInputSheet,
    slideDealsIn: slideDealsIn,
    slideDealsOut: slideDealsOut,
    morphPlatToDeals: morphPlatToDeals,
    morphDealsToSet: morphDealsToSet,
    staggerListIn: staggerListIn,
    scrollCardToCenter: scrollCardToCenter
  };
})(window);
