/**
 * UI motion — page transitions, list stagger, expand helpers.
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

  function clearCoverClasses(el) {
    if (!el) return;
    el.classList.remove(
      'ux-cover-y', 'ux-cover-y--in', 'ux-cover-y--out',
      'ux-cover-up', 'ux-cover-up--in', 'ux-cover-up--out',
      'ux-push', 'ux-push--in', 'ux-push--out'
    );
  }

  /** scan → input: full page from top (no bounce) */
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
    clearCoverClasses(input);
    input.classList.add('active', 'ux-cover-y');
    void input.offsetWidth;
    if (reduceMotion()) {
      input.classList.add('ux-cover-y--in');
      if (done) done();
      return;
    }
    nextFrame().then(function () {
      input.classList.add('ux-cover-y--in');
      return wait(300);
    }).then(function () {
      if (done) done();
    });
  }

  function closeInputSheet(done) {
    var input = $('#screen-input');
    var scan = $('#screen-scan');
    if (!input || !input.classList.contains('ux-cover-y')) {
      if (done) done();
      return;
    }
    if (reduceMotion()) {
      input.classList.remove('active');
      clearCoverClasses(input);
      if (scan) scan.classList.add('active');
      if (done) done();
      return;
    }
    input.classList.remove('ux-cover-y--in');
    input.classList.add('ux-cover-y--out');
    wait(280).then(function () {
      input.classList.remove('active');
      clearCoverClasses(input);
      if (scan) scan.classList.add('active');
      if (done) done();
    });
  }

  /** match-pick: full page from bottom */
  function openMatchPickSheet(fromScreen, done) {
    var pick = $('#screen-match-pick');
    var from = fromScreen || document.querySelector('.screen.active');
    if (!pick) {
      if (done) done();
      return;
    }
    document.querySelectorAll('.screen').forEach(function (s) {
      if (s !== from && s !== pick) s.classList.remove('active');
    });
    if (from) from.classList.add('active');
    clearCoverClasses(pick);
    pick.classList.add('active', 'ux-cover-up');
    void pick.offsetWidth;
    if (reduceMotion()) {
      pick.classList.add('ux-cover-up--in');
      if (done) done();
      return;
    }
    nextFrame().then(function () {
      pick.classList.add('ux-cover-up--in');
      return wait(320);
    }).then(function () {
      if (done) done();
    });
  }

  function closeMatchPickSheet(done) {
    var pick = $('#screen-match-pick');
    if (!pick || !pick.classList.contains('ux-cover-up')) {
      if (done) done();
      return;
    }
    if (reduceMotion()) {
      pick.classList.remove('active');
      clearCoverClasses(pick);
      if (done) done();
      return;
    }
    pick.classList.remove('ux-cover-up--in');
    pick.classList.add('ux-cover-up--out');
    wait(280).then(function () {
      pick.classList.remove('active');
      clearCoverClasses(pick);
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
    clearCoverClasses(deals);
    deals.classList.add('active', 'ux-push');
    void deals.offsetWidth;
    nextFrame().then(function () {
      deals.classList.add('ux-push--in');
      return wait(320);
    }).then(function () {
      clearCoverClasses(deals);
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
    clearCoverClasses(deals);
    deals.classList.add('active', 'ux-push', 'ux-push--in');
    void deals.offsetWidth;
    nextFrame().then(function () {
      deals.classList.remove('ux-push--in');
      deals.classList.add('ux-push--out');
      return wait(280);
    }).then(function () {
      deals.classList.remove('active');
      clearCoverClasses(deals);
      if (done) done();
    });
  }

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

  function shakeElements(els) {
    var list = Array.prototype.slice.call(els || []);
    list.forEach(function (el) {
      el.classList.remove('is-shake');
      void el.offsetWidth;
      el.classList.add('is-shake');
    });
    wait(450).then(function () {
      list.forEach(function (el) { el.classList.remove('is-shake'); });
    });
  }

  global.UiMotion = {
    reduceMotion: reduceMotion,
    openInputSheet: openInputSheet,
    closeInputSheet: closeInputSheet,
    openMatchPickSheet: openMatchPickSheet,
    closeMatchPickSheet: closeMatchPickSheet,
    slideDealsIn: slideDealsIn,
    slideDealsOut: slideDealsOut,
    morphPlatToDeals: morphPlatToDeals,
    morphDealsToSet: morphDealsToSet,
    staggerListIn: staggerListIn,
    scrollCardToCenter: scrollCardToCenter,
    shakeElements: shakeElements
  };
})(window);
