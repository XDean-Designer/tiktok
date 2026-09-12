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

  /** scan → input: full page from bottom */
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

  /** 收起展开区：内容淡出上移 + 高度收拢（约 160ms），再执行真正的收起 */
  function collapseExpandAnimated(card, done) {
    var expand = card && card.querySelector('.tg-coupon-card__expand');
    var h = expand ? expand.getBoundingClientRect().height : 0;
    if (!expand || h <= 0 || reduceMotion() || !card.classList.contains('is-open')) {
      if (done) done();
      return;
    }
    expand.style.overflow = 'hidden';
    expand.style.height = h + 'px';
    expand.style.transition = 'height 0.16s ease, padding-bottom 0.16s ease';
    card.classList.add('is-closing');
    void expand.offsetWidth;
    nextFrame().then(function () {
      expand.style.height = '0px';
      expand.style.paddingBottom = '0px';
      return wait(170);
    }).then(function () {
      card.classList.remove('is-closing');
      expand.style.transition = '';
      expand.style.height = '';
      expand.style.paddingBottom = '';
      expand.style.overflow = '';
      if (done) done();
    });
  }

  /**
   * 保存成功反馈：按钮勾选形变 + 卡片轻回弹 + 「已配置」标签弹入，
   * 停留约 320ms（reduced-motion 降为 150ms 即时呈现）后收起展开区并回调。
   * opts.configured === false 时不动标签（清空匹配后仍为「未配置」）。
   */
  function saveSuccessFeedback(card, done, opts) {
    if (!card) {
      if (done) done();
      return;
    }
    var reduced = reduceMotion();
    var btn = card.querySelector('.btn-save');
    var tag = (opts && opts.configured === false) ? null : card.querySelector('.tg-coupon-card__tag');
    if (btn) btn.classList.add('is-saved');
    if (tag) {
      tag.textContent = '已配置';
      tag.classList.add('is-on', 'is-save-pop');
    }
    if (!reduced) card.classList.add('is-save-pulse');
    wait(reduced ? 150 : 320).then(function () {
      card.classList.remove('is-save-pulse');
      if (btn) btn.classList.remove('is-saved');
      if (tag) tag.classList.remove('is-save-pop');
      /* 反馈期间卡片已被收起/切换：不再播收起动画，交由回调自行判断 */
      if (!card.classList.contains('is-open')) {
        if (done) done();
        return;
      }
      return collapseExpandAnimated(card, done);
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
    shakeElements: shakeElements,
    saveSuccessFeedback: saveSuccessFeedback,
    collapseExpandAnimated: collapseExpandAnimated
  };
})(window);
