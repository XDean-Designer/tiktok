/**
 * 团购核销 · 平台开通（三步：店铺认证 → 平台授权 → 门店绑定）
 * v1.6.0 · 按同事 PRD + 问卷锁定决策（分平台状态、多门店、废绑定码等）
 */
(function (global) {
  'use strict';

  var MT_LOGO_SRC = 'assets/auth-open/meituan-logo.svg';
  var DY_LOGO_SRC = 'assets/auth-open/douyin-logo.svg';

  function setBrandImg(el, src, alt) {
    if (!el) return;
    el.innerHTML = '<img class="brand-svg" src="' + src + '" alt="' + (alt || '') + '" width="64" height="64">';
  }

  /* 与整站演示数据统一：id 供目录/配置，name 供展示 */
  var STORE_OPTIONS = [
    { id: 'store_zs', name: '悦颜美肌 · 中山路店' },
    { id: 'store_rm', name: '悦颜美肌 · 人民路店' },
    { id: 'store_gx', name: '悦颜美肌 · 高新店' }
  ];
  var ALL_STORE_IDS = STORE_OPTIONS.map(function (s) { return s.id; });

  function storeById(id) {
    for (var i = 0; i < STORE_OPTIONS.length; i++) {
      if (STORE_OPTIONS[i].id === id) return STORE_OPTIONS[i];
    }
    return null;
  }

  function storeNameOf(id) {
    var s = storeById(id);
    return s ? s.name : String(id || '');
  }

  function storeObjsOf(ids) {
    return (ids || []).map(function (id) {
      return storeById(id) || { id: id, name: String(id) };
    });
  }

  function emptyPlat() {
    return {
      auth: false,
      authAccount: '',
      authAccountId: '',
      bind: false,
      stores: [], /* store id[] */
      expired: false
    };
  }

  function defaultState() {
    return {
      merchantStatus: 'pending', /* pending | reviewing | failed | approved */
      failReason: '营业执照信息与填写信息不一致',
      dy: emptyPlat(),
      mt: emptyPlat()
    };
  }

  var api = null;
  var state = defaultState();
  var platform = 'dy'; /* dy | mt */
  var forceFallback = false;
  var lastAuthAccountId = { dy: '', mt: '' };
  var toastTimer = null;

  function $(id) { return document.getElementById(id); }
  function platKey() { return platform === 'mt' ? 'mt' : 'dy'; }
  function platState() { return state[platKey()]; }
  function isMt() { return platform === 'mt'; }
  function merchantApproved() { return state.merchantStatus === 'approved'; }

  function isOpen(p) {
    var s = state[p || platKey()];
    return merchantApproved() && s.auth && !s.expired && s.bind && s.stores.length > 0;
  }

  function syncSessionGate() {
    if (!api || !api.session) return;
    var s = api.session;
    s.shopCertStatus = state.merchantStatus;
    s.authDouyin = gateAuth('dy');
    s.authMeituan = gateAuth('mt');
    s.mapDouyin = isOpen('dy');
    s.mapMeituan = isOpen('mt');
    s.boundStoresDy = storeObjsOf(state.dy.stores);
    s.boundStoresMt = storeObjsOf(state.mt.stores);
    /* 当前登录门店：演示固定中山路；若未绑定则回落首个已绑 */
    if (!s.loginStoreId || !storeById(s.loginStoreId)) s.loginStoreId = 'store_zs';
    if (state.dy.stores.indexOf(s.loginStoreId) < 0 && state.dy.stores.length) {
      s.loginStoreId = state.dy.stores[0];
    }
    s.loginStoreName = storeNameOf(s.loginStoreId);
    /* 已开通才视为可核销映射就绪；未开通时 map=false 以拦验券 */
  }

  function gateAuth(p) {
    var s = state[p];
    if (!merchantApproved()) return 'none';
    if (s.expired) return 'expired';
    if (s.auth && s.bind && s.stores.length) return 'ok';
    if (s.auth) return 'ok'; /* 授权有效但未绑：门禁用 isPlatformReady */
    return 'none';
  }

  /** 验券/核销门禁：认证+授权有效+≥1绑定且未过期 */
  function isPlatformReady(plat) {
    var p = plat === 'meituan' || plat === 'mt' ? 'mt' : 'dy';
    return isOpen(p);
  }

  function aoToast(msg) {
    var el = $('ao-toast');
    if (!el) {
      if (api && api.toast) api.toast(msg);
      return;
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1400);
  }

  function showAo(id) {
    var root = $('ao-root');
    if (!root) return;
    root.querySelectorAll('.ao-screen').forEach(function (el) {
      el.classList.toggle('active', el.id === id);
    });
  }

  function openMask(id) {
    var m = $(id);
    if (m) m.classList.add('show');
  }
  function closeMask(id) {
    var m = $(id);
    if (m) m.classList.remove('show');
  }

  function getAuthLink() {
    return isMt() ? 'https://open.meituan.com/authorize' : 'https://life.douyin.com/authorize';
  }

  function render() {
    var ps = platState();
    var complete = isOpen();
    var expired = merchantApproved() && ps.auth && ps.expired;

    var nav = $('ao-nav-title');
    if (nav) nav.textContent = isMt() ? '美团开通' : '抖音开通';
    var logo = $('ao-platform-logo');
    if (logo) {
      setBrandImg(logo, isMt() ? MT_LOGO_SRC : DY_LOGO_SRC, isMt() ? '美团' : '抖音');
      logo.className = 'logo ' + (isMt() ? 'mt' : 'dy');
    }
    var name = $('ao-platform-name');
    if (name) name.textContent = isMt() ? '美团' : '抖音';
    var desc = $('ao-platform-desc');
    if (desc) desc.textContent = isMt()
      ? '授权并绑定门店后，即可核销美团团购券'
      : '授权并绑定门店后，即可核销抖音团购券';

    setText('ao-auth-name', isMt() ? '美团授权' : '抖音来客授权');
    setText('ao-bind-name', isMt() ? '绑定美团门店' : '绑定抖音门店');
    setText('ao-auth-desc', isMt() ? '授权美团商家账号' : '授权抖音来客账号');
    setText('ao-bind-desc', isMt() ? '绑定对应的美团门店' : '绑定对应的抖音门店');
    setText('ao-step-auth-name', isMt() ? '美团授权' : '抖音来客授权');
    setText('ao-step-bind-name', isMt() ? '绑定美团门店' : '绑定抖音门店');

    var tag = $('ao-access-tag');
    if (tag) {
      if (expired) { tag.textContent = '未开通（授权已过期）'; tag.className = 'tag expired'; }
      else if (complete) { tag.textContent = '已开通'; tag.className = 'tag ok'; }
      else { tag.textContent = '未开通'; tag.className = 'tag'; }
    }

    var progress = $('ao-progress');
    var manage = $('ao-manage');
    if (progress) progress.style.display = complete ? 'none' : 'block';
    if (manage) manage.style.display = complete ? 'block' : 'none';

    renderMerchant();
    renderAuthStep(ps, expired);
    renderBindStep(ps, expired);

    var validAuth = ps.auth && !ps.expired;
    var validBind = ps.bind && ps.stores.length > 0 && !ps.expired && validAuth;
    var n = Number(merchantApproved()) + Number(validAuth) + Number(validBind);
    setText('ao-progress-text', n + '/3');

    setStep('ao-step-merchant', merchantApproved(), !merchantApproved());
    setStep('ao-step-auth', validAuth, merchantApproved() && !validAuth);
    setStep('ao-step-bind', validBind, validAuth && !validBind);

    setText('ao-account-title', isMt() ? '已授权美团账号' : '已授权抖音账号');
    setText('ao-account-info', ps.authAccount || '186****5286');
    var ms = $('ao-manage-store');
    if (ms) {
      ms.innerHTML = (ps.stores || []).map(function (id) {
        return escapeHtml(storeNameOf(id));
      }).join('<br>') || '—';
    }

    ['ao-dy-confirm-logo', 'ao-dy-login-logo'].forEach(function (id) {
      setBrandImg($(id), DY_LOGO_SRC, '抖音');
    });
    setBrandImg($('ao-mt-login-logo'), MT_LOGO_SRC, '美团');
    var mtGrantBrand = document.querySelector('#ao-mt-grant .brandbox');
    if (mtGrantBrand) setBrandImg(mtGrantBrand, MT_LOGO_SRC, '美团');

    syncSessionGate();
    if (api && api.onAuthOpenChange) api.onAuthOpenChange();
  }

  function setText(id, t) {
    var el = $(id);
    if (el) el.textContent = t;
  }

  function setLinkLabel(btn, label) {
    if (!btn) return;
    var gray = btn.classList.contains('gray');
    var src = gray ? 'assets/auth-open/chevron-right-gray.svg' : 'assets/auth-open/chevron-right.svg';
    btn.innerHTML = escapeHtml(label) + '<img class="ao-chevron" src="' + src + '" alt="">';
  }

  function setStep(id, done, active) {
    var el = $(id);
    if (!el) return;
    el.className = 'step' + (done ? ' done' : '') + (active ? ' active' : '');
    var dot = el.querySelector('.step-dot');
    if (!dot) return;
    var num = id.indexOf('merchant') >= 0 ? '1' : id.indexOf('auth') >= 0 ? '2' : '3';
    if (done) {
      dot.innerHTML = '<img src="assets/auth-open/step-done.svg" alt="">';
    } else {
      dot.textContent = num;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderMerchant() {
    var desc = $('ao-merchant-desc');
    var st = $('ao-merchant-state');
    var btn = $('ao-merchant-btn');
    if (!desc || !st || !btn) return;
    desc.className = 'idesc';
    st.className = 'state';
    btn.className = 'link';
    var ms = state.merchantStatus;
    if (ms === 'approved') {
      desc.textContent = '完成店铺主体认证后，即可继续开通团购核销';
      st.style.display = 'inline';
      st.textContent = '已完成';
      st.className = 'state ok';
      btn.style.display = 'none';
    } else if (ms === 'reviewing') {
      desc.innerHTML = '<div class="merchant-status-line reviewing"><span class="merchant-status-dot"></span><span class="merchant-status-main">审核中</span><span class="merchant-status-sep">·</span><span>预计 2 小时内完成审核</span></div>';
      st.style.display = 'none';
      btn.style.display = 'none';
    } else if (ms === 'failed') {
      desc.innerHTML = '<div class="merchant-status-line failed"><span class="merchant-status-dot"></span><span class="merchant-status-main">审核未通过</span></div><div class="merchant-status-reason">' + escapeHtml(state.failReason) + '</div>';
      st.style.display = 'none';
      btn.style.display = 'inline-flex';
      setLinkLabel(btn, '去处理');
    } else {
      desc.textContent = '完成店铺主体认证后，即可继续开通团购核销';
      st.style.display = 'none';
      btn.style.display = 'inline-flex';
      setLinkLabel(btn, '去认证');
    }
  }

  function renderAuthStep(ps, expired) {
    var st = $('ao-auth-state');
    var btn = $('ao-auth-btn');
    if (!st || !btn) return;
    if (!merchantApproved()) {
      st.textContent = '待完成';
      st.className = 'state';
      btn.style.display = 'none';
    } else if (expired || ps.expired) {
      st.textContent = '';
      st.className = 'state';
      btn.style.display = 'inline-flex';
      setLinkLabel(btn, '重新授权');
    } else if (ps.auth) {
      st.textContent = '已完成';
      st.className = 'state ok';
      btn.style.display = 'none';
    } else {
      st.textContent = '';
      st.className = 'state';
      btn.style.display = 'inline-flex';
      setLinkLabel(btn, '去授权');
    }
  }

  function renderBindStep(ps, expired) {
    var st = $('ao-bind-state');
    var btn = $('ao-bind-btn');
    var bound = $('ao-bound-store');
    if (!st || !btn || !bound) return;
    if (expired || ps.expired) {
      st.textContent = '待完成';
      st.className = 'state';
      btn.style.display = 'none';
      bound.style.display = 'none';
    } else if (!ps.auth) {
      st.textContent = '待完成';
      st.className = 'state';
      btn.style.display = 'none';
      bound.style.display = 'none';
    } else if (ps.bind && ps.stores.length) {
      st.textContent = '已完成';
      st.className = 'state ok';
      btn.style.display = 'none';
      bound.style.display = 'none';
    } else {
      st.textContent = '';
      st.className = 'state';
      btn.style.display = 'inline-flex';
      setLinkLabel(btn, '去绑定');
      bound.style.display = 'none';
    }
  }

  function goCert() {
    showAo('ao-cert');
    var tip = $('ao-cert-tip');
    if (tip) {
      tip.textContent = state.merchantStatus === 'failed'
        ? ('请修改资料后重新提交。原因：' + state.failReason)
        : '请填写店铺主体资料并提交审核（原型示意）。';
    }
  }

  function submitCert() {
    /* 模拟业务结果：提交 → 审核中 */
    state.merchantStatus = 'reviewing';
    showAo('ao-main');
    render();
    aoToast('已提交认证（模拟）');
  }

  function demoApproveCert() {
    state.merchantStatus = 'approved';
    showAo('ao-main');
    render();
    aoToast('认证已通过（模拟）');
  }

  function demoFailCert() {
    state.merchantStatus = 'failed';
    showAo('ao-main');
    render();
  }

  function startThirdParty() {
    if (!merchantApproved()) return;
    if (forceFallback) {
      openFallback();
      return;
    }
    showAo(isMt() ? 'ao-mt-login' : 'ao-dy-login');
  }

  function openFallback() {
    setText('ao-fallback-link', getAuthLink());
    showAo('ao-fallback');
  }

  function copyAuthLink() {
    var text = getAuthLink();
    setText('ao-fallback-link', text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        aoToast('授权链接已复制');
      }).catch(function () {
        aoToast('请手动复制链接');
      });
    } else {
      aoToast('请手动复制链接');
    }
  }

  function queryAuthResult() {
    /* D3：仅查询；失败不改态。原型用 forceFallbackFail 模拟失败 */
    if (window.__aoAuthQueryFail) {
      aoToast('暂未查询到授权结果，请确认已在电脑浏览器完成授权后再试');
      return;
    }
    thirdPartySuccess({ fromQuery: true });
  }

  function cancelThirdParty() {
    aoToast('已取消本次授权');
    showAo('ao-main');
  }

  function thirdPartySuccess(opts) {
    var ps = platState();
    var newId = isMt() ? 'mt-acc-001' : 'dy-acc-001';
    var prevId = lastAuthAccountId[platKey()];
    var accountChanged = !!(prevId && prevId !== newId);
    var wasExpired = ps.expired;

    ps.auth = true;
    ps.expired = false;
    ps.authAccount = '186****5286';
    ps.authAccountId = newId;

    /* D13：过期重授或换号 → 清绑定；同号未过期重授保留绑定 */
    if (wasExpired || accountChanged) {
      ps.bind = false;
      ps.stores = [];
    }
    lastAuthAccountId[platKey()] = newId;

    forceFallback = false;
    showAo('ao-main');
    render();
    aoToast((isMt() ? '美团' : '抖音') + '授权成功（模拟）');
  }

  function openBind() {
    var ps = platState();
    if (!ps.auth || ps.expired) return;
    setText('ao-bind-title', isMt() ? '绑定美团门店' : '绑定抖音门店');
    setText('ao-bind-sheet-desc', '可多选');
    var box = $('ao-bind-list');
    if (box) {
      box.innerHTML = STORE_OPTIONS.map(function (st) {
        var on = ps.stores.indexOf(st.id) >= 0;
        return '<button type="button" class="choice store' + (on ? ' on' : '') + '" data-store="' + escapeHtml(st.id) + '">' +
          '<div class="store-name">' + escapeHtml(st.name) + '</div></button>';
      }).join('');
    }
    openMask('ao-bind-mask');
  }

  function toggleStore(btn) {
    btn.classList.toggle('on');
  }

  function confirmBind() {
    var selected = [];
    document.querySelectorAll('#ao-bind-list .choice.store.on').forEach(function (el) {
      selected.push(el.getAttribute('data-store'));
    });
    var ps = platState();
    /* D4：允许 0 家 → 回退未开通 2/3 */
    ps.stores = selected;
    ps.bind = selected.length > 0;
    closeMask('ao-bind-mask');
    render();
    if (!selected.length) aoToast('已取消全部门店绑定');
    else aoToast('已绑定 ' + selected.length + ' 家门店（模拟）');
  }

  function cancelAuthorization() {
    openMask('ao-cancel-mask');
  }

  function confirmCancelAuthorization() {
    var ps = platState();
    ps.auth = false;
    ps.expired = false;
    ps.bind = false;
    ps.stores = [];
    ps.authAccount = '';
    ps.authAccountId = '';
    lastAuthAccountId[platKey()] = '';
    closeMask('ao-cancel-mask');
    render();
    aoToast('已取消授权（模拟）');
  }

  function goGroupBuy() {
    closeAllAoMasks();
    var plat = isMt() ? 'meituan' : 'douyin';
    if (api && typeof api.openTgDealsFromAuth === 'function') {
      api.openTgDealsFromAuth(plat);
      return;
    }
    if (api && api.showScreen) api.showScreen('tg-deals');
  }

  function closeAllAoMasks() {
    closeMask('ao-bind-mask');
    closeMask('ao-cancel-mask');
  }

  function open(plat) {
    platform = (plat === 'meituan' || plat === 'mt') ? 'mt' : 'dy';
    showAo('ao-main');
    render();
  }

  function setDemoState(type) {
    forceFallback = false;
    if (type === 'initial') {
      state.merchantStatus = 'pending';
      state.dy = emptyPlat();
      state.mt = emptyPlat();
    } else if (type === 'merchantReviewing') {
      state.merchantStatus = 'reviewing';
    } else if (type === 'merchantFailed') {
      state.merchantStatus = 'failed';
    } else if (type === 'merchant') {
      state.merchantStatus = 'approved';
      platState().auth = false;
      platState().bind = false;
      platState().expired = false;
      platState().stores = [];
    } else if (type === 'auth') {
      state.merchantStatus = 'approved';
      var a = platState();
      a.auth = true; a.expired = false; a.bind = false; a.stores = [];
      a.authAccount = '186****5286'; a.authAccountId = platKey() + '-acc-001';
      lastAuthAccountId[platKey()] = a.authAccountId;
    } else if (type === 'complete') {
      state.merchantStatus = 'approved';
      var c = platState();
      c.auth = true; c.expired = false; c.bind = true; c.stores = ALL_STORE_IDS.slice();
      c.authAccount = '186****5286'; c.authAccountId = platKey() + '-acc-001';
      lastAuthAccountId[platKey()] = c.authAccountId;
    } else if (type === 'expired') {
      state.merchantStatus = 'approved';
      var e = platState();
      e.auth = true; e.expired = true; e.bind = false; e.stores = [];
      e.authAccount = '186****5286';
    } else if (type === 'fallback') {
      state.merchantStatus = 'approved';
      platState().auth = false;
      platState().bind = false;
      platState().stores = [];
      platState().expired = false;
      forceFallback = true;
      openFallback();
      render();
      return;
    }
    showAo('ao-main');
    render();
  }

  function bindDom() {
    var root = $('ao-root');
    if (!root || root.getAttribute('data-ao-bound')) return;
    root.setAttribute('data-ao-bound', '1');

    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-ao]');
      if (!t) {
        var store = e.target.closest('#ao-bind-list .choice.store');
        if (store) { toggleStore(store); return; }
        return;
      }
      var act = t.getAttribute('data-ao');
      if (act === 'back') {
        closeAllAoMasks();
        if (api && api.goBack) api.goBack();
        return;
      }
      if (act === 'main') { showAo('ao-main'); return; }
      if (act === 'cert') { goCert(); return; }
      if (act === 'cert-submit') { submitCert(); return; }
      if (act === 'cert-pass') { demoApproveCert(); return; }
      if (act === 'cert-fail') { demoFailCert(); return; }
      if (act === 'auth') { startThirdParty(); return; }
      if (act === 'reauth') { startThirdParty(); return; }
      if (act === 'mt-grant') { showAo('ao-mt-grant'); return; }
      if (act === 'dy-perm') { showAo('ao-dy-permission'); return; }
      if (act === 'auth-ok') { thirdPartySuccess(); return; }
      if (act === 'auth-cancel') { cancelThirdParty(); return; }
      if (act === 'fallback') { forceFallback = true; openFallback(); return; }
      if (act === 'copy-link') { copyAuthLink(); return; }
      if (act === 'query-auth') { queryAuthResult(); return; }
      if (act === 'bind') { openBind(); return; }
      if (act === 'bind-ok') { confirmBind(); return; }
      if (act === 'bind-close') { closeMask('ao-bind-mask'); return; }
      if (act === 'cancel-auth') { cancelAuthorization(); return; }
      if (act === 'cancel-auth-ok') { confirmCancelAuthorization(); return; }
      if (act === 'cancel-auth-close') { closeMask('ao-cancel-mask'); return; }
      if (act === 'tg-set') { goGroupBuy(); return; }
    });
  }

  function init(hostApi) {
    api = hostApi || {};
    state = defaultState();
    /* 演示默认双平台已开通，保证核销主链路可走；左侧「开通状态演示」可切未开通 */
    state.merchantStatus = 'approved';
    ['dy', 'mt'].forEach(function (p) {
      state[p] = {
        auth: true,
        authAccount: '186****5286',
        authAccountId: p + '-acc-001',
        bind: true,
        stores: ALL_STORE_IDS.slice(),
        expired: false
      };
      lastAuthAccountId[p] = p + '-acc-001';
    });
    bindDom();
    render();
  }

  global.AuthOpen = {
    init: init,
    open: open,
    render: render,
    setDemoState: setDemoState,
    showAo: showAo,
    openBind: openBind,
    cancelAuthorization: cancelAuthorization,
    isPlatformReady: isPlatformReady,
    isOpen: isOpen,
    getState: function () { return state; },
    getStoreOptions: function () { return STORE_OPTIONS.slice(); },
    storeNameOf: storeNameOf,
    storeById: storeById,
    syncSessionGate: syncSessionGate,
    aoToast: aoToast
  };
})(window);
