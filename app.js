(function () {
  var historyStack = ['home'];
  var currentOrder = null;
  var filterState = { status: 'all', time: 'all' };
  var filterDraft = { status: 'all', time: 'all' };
  var empPickCtx = 'confirm'; // confirm | attr
  /* 无核销权限时禁止进入的主链路（防绕过） */
  var CONSUME_ENTRY = { scan: 1, input: 1, result: 1, confirm: 1, success: 1 };
  var session = {
    offline: false,
    camDenied: false,
    auth: 'ok', // none | pending | ok | expired
    rolePerm: true, // 账号是否有核销操作权限（16B：进页可，动作时拦）
    allowReassign: true,
    selectedEmpId: null, // 业绩归属默认空：不默认店主，核销时点击选择
    selectedEmpIds: [],
    staffRoles: {},
    staffDesignated: {},
    opName: '顾清扬', // 当前操作账号（成功页“操作人”），与业绩归属解耦
    selectedProdId: null,
    selectedMatchIds: [],
    matchMemory: {},
    /* 内部开单字段（6X：UI 文案仍显示「抖音团购」等） */
    orderType: '快捷开单',
    payType: '团购',
    couponName: '深层补水护理 · 单次体验',
    couponPrice: 268,
    couponCode: 'dy9182-ABCD-7781',
    mismatched: true,
    phone: ''
  };

  var seed = window.DySeed || { staff: [], products: [], projects: [], shopProducts: [], catalogGroups: {}, couponDemos: {} };
  var matchStaff = null;

  var ORDERS = [
    {
      id: 'o1',
      name: '深层补水护理 · 单次体验',
      price: 268,
      code: 'dy9182-ABCD-7781',
      oid: '716829104455',
      time: '2026-09-03 15:42',
      op: '顾清扬',
      bill: 'SO20260903018',
      status: 'ok',
      canRevoke: true,
      revokeHint: '剩余 42 分钟可撤销'
    },
    {
      id: 'o2',
      name: '时尚洗剪吹',
      price: 98,
      code: 'dy4410-KK92-1203',
      oid: '716829088120',
      time: '2026-09-03 11:18',
      op: '林屿森',
      bill: 'SO20260903007',
      status: 'ok',
      canRevoke: false,
      revokeHint: '已超过 1 小时，不可撤销'
    },
    {
      id: 'o3',
      name: '头皮护理套餐',
      price: 168,
      code: 'dy2201-PL88-0091',
      oid: '716828901144',
      time: '2026-09-02 19:05',
      op: '何苏叶',
      bill: 'SO20260902044',
      status: 'revoked',
      canRevoke: false,
      revokeHint: '已撤销'
    },
    {
      id: 'o4',
      name: '美白淡斑护理',
      price: 398,
      code: 'dy5502-RF01-3344',
      oid: '716828700221',
      time: '2026-09-01 16:20',
      op: 'Lisa',
      bill: 'SO20260901012',
      status: 'refund',
      canRevoke: false,
      revokeHint: '顾客退款后已冲销，业绩已回滚'
    }
  ];

  /* 核销阶段失败（确认后） */
  var FAIL_MAP = {
    invalid: {
      title: '券状态异常',
      desc: '核销提交时平台返回券不可用。请核对后重试或改输码。',
      action: '重新扫码或改输码',
      code: 'CONSUME_INVALID',
      primary: 'scan'
    },
    used: {
      title: '券已核销',
      desc: '这张券已经核销过了，不会重复开单。可在验券订单里查看原单。',
      action: '查看验券订单',
      code: 'CONSUME_USED',
      primary: 'orders'
    },
    store: {
      title: '非本店可用券',
      desc: '券适用门店与当前登录门店不一致，无法核销。',
      action: '更换门店或核对券信息',
      code: 'CONSUME_STORE_MISMATCH',
      primary: 'scan'
    },
    perm: {
      title: '无核销权限',
      desc: '当前账号未被授予抖音核销权限，或门店授权已到期。请联系店长处理。',
      action: '联系店长 / 查看授权指引',
      code: 'CONSUME_NO_PERM',
      primary: 'owner-auth'
    },
    network: {
      title: '网络超时',
      desc: '请求超时了。可以再试一次，不用担心会重复扣券。',
      action: '稍后重试',
      code: 'NET_TIMEOUT',
      primary: 'confirm'
    }
  };

  /* 验券阶段失败（扫码/输码 → 验券） */
  var VFAIL_MAP = {
    invalid: {
      title: '券无效或已过期',
      desc: '验券未通过，尚未发起核销与开单。请核对有效期或让顾客在抖音侧查看券状态。',
      action: '重新扫码或改输码'
    },
    used: {
      title: '券已核销',
      desc: '这张券已经核销过了，不会再开单。可查看原单。',
      action: '查看验券订单'
    },
    store: {
      title: '非本店可用券',
      desc: '验券未通过：券适用门店与当前门店不一致。',
      action: '更换门店或核对券信息'
    },
    network: {
      title: '网络超时',
      desc: '验券请求超时。可以再试一次，不用担心会重复扣券。',
      action: '稍后重试'
    }
  };

  var AUTH_UI = {
    none: { label: '未发起', tag: 'tag-rev', expire: '—' },
    pending: { label: '待确认', tag: 'tag-plat-dy', expire: '—' },
    ok: { label: '已授权', tag: 'tag-ok', expire: '2027-03-01' },
    expired: { label: '已到期', tag: 'tag-rev', expire: '2026-08-01' }
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function staffById(id) {
    if (id == null) return undefined;
    return seed.staff.filter(function (s) { return s.id === id; })[0];
  }
  function prodById(id) {
    var all = [].concat(seed.projects || [], seed.shopProducts || [], seed.products || []);
    return all.filter(function (p) { return p.id === id; })[0];
  }
  function staffName() {
    var s = staffById(session.selectedEmpId);
    return s ? s.name : '';
  }
  function refreshAttrEmp() {
    var a = $('#attrDefaultEmp');
    if (!a) return;
    var nm = staffName();
    a.textContent = (nm ? nm : '未选') + ' ▸';
    a.style.color = nm ? 'var(--info)' : '#B9B9B9';
  }
  function applyMemoryForCoupon(name) {
    var mem = session.matchMemory && session.matchMemory[name];
    if (mem && mem.length) {
      session.selectedMatchIds = mem.map(function (m) { return m.id; });
      session.selectedProdId = session.selectedMatchIds[0] || null;
      session.mismatched = false;
      return true;
    }
    return false;
  }
  /* 无事先价目映射：仅会话记忆可自动已匹配 */
  function resolveCouponMatch(name) {
    if (applyMemoryForCoupon(name)) return { mismatched: false };
    session.selectedMatchIds = [];
    session.selectedProdId = null;
    return { mismatched: true };
  }
  function isCouponMatched() {
    if (session.mismatched) return false;
    if (session.selectedMatchIds && session.selectedMatchIds.length) return true;
    return !!session.selectedProdId;
  }
  function syncMatchStatusTags() {
    var matched = isCouponMatched();
    ['#resultUnmatchTag', '#confirmUnmatchTag'].forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      el.hidden = false;
      el.textContent = matched ? '已匹配' : '未匹配';
      el.classList.toggle('tag-unmatch', !matched);
      el.classList.toggle('tag-matched', matched);
    });
  }

  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 1600);
  }

  function setNav(flow) {
    $all('.site-nav .nav-item').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-flow') === flow);
    });
  }

  function closeMasks() {
    $all('.picker-mask.open, .dialog-mask.open, .loading-mask.open').forEach(function (m) {
      m.classList.remove('open');
    });
  }

  function openMask(id) {
    var m = document.getElementById(id);
    if (m) m.classList.add('open');
  }

  function showLoading(text) {
    $('#loadingText').textContent = text || '请稍候…';
    openMask('loadingMask');
  }

  function hideLoading() {
    var m = $('#loadingMask');
    if (m) m.classList.remove('open');
  }

  function withLoading(text, ms, done) {
    showLoading(text);
    setTimeout(function () {
      hideLoading();
      if (done) done();
    }, ms || 900);
  }

  function flashScanOk() {
    var fb = $('#scanFeedback');
    if (!fb) return;
    fb.classList.add('open');
    setTimeout(function () { fb.classList.remove('open'); }, 700);
  }

  function reinforceScanFail() {
    var entry = $('#scanInputEntry');
    if (entry) {
      entry.classList.add('pulse');
      clearTimeout(reinforceScanFail._t);
      reinforceScanFail._t = setTimeout(function () {
        entry.classList.remove('pulse');
      }, 3200);
    }
    toast('识别失败');
  }

  function storeAuthOk() {
    return session.auth === 'ok';
  }

  function gateOnAction() {
    if (!session.rolePerm) {
      showScreen('tpl-noperm');
      return false;
    }
    if (!storeAuthOk()) {
      toast(session.auth === 'expired' ? '门店授权已到期' : '门店尚未完成授权');
      showScreen('owner-auth');
      return false;
    }
    return true;
  }

  /* 无权限：进核销链路前即拦（扫码/输码/结果/确认/成功等入口） */
  function gateConsumeEntry() {
    if (!session.rolePerm) {
      showScreen('tpl-noperm');
      return false;
    }
    return true;
  }

  function applyAuthUI() {
    var ui = AUTH_UI[session.auth] || AUTH_UI.ok;
    $all('#authStateBar button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-auth') === session.auth);
    });
    var tag = $('#authStatusTag');
    if (tag) tag.innerHTML = '<span class="tag ' + ui.tag + '">' + ui.label + '</span>';
    var exp = $('#authExpire');
    if (exp) exp.textContent = ui.expire;
  }

  function syncDemoGateUI() {
    $all('#demoNetBar button').forEach(function (b) {
      var v = b.getAttribute('data-demo-net');
      b.classList.toggle('on', session.offline ? v === 'offline' : v === 'online');
    });
    $all('#demoCamBar button').forEach(function (b) {
      var v = b.getAttribute('data-demo-cam');
      b.classList.toggle('on', session.camDenied ? v === 'denied' : v === 'ok');
    });
    $all('#demoPermBar button').forEach(function (b) {
      var v = b.getAttribute('data-demo-perm');
      b.classList.toggle('on', session.rolePerm ? v === 'ok' : v === 'none');
    });
  }

  function isScanActive() {
    var s = $('#screen-scan');
    return !!(s && s.classList.contains('active'));
  }

  function ensureScanThen(fn) {
    if (!session.rolePerm) {
      showScreen('tpl-noperm');
      return;
    }
    if (isScanActive()) {
      fn();
      return;
    }
    // 演示：强制进入扫码页以便看到反馈，不走离线/相机门禁
    showScreen('scan');
    setTimeout(fn, 280);
  }

  function runScanDemo(kind) {
    if (kind === 'ok') {
      startVerify({ fromScan: true });
    } else if (kind === 'dup') {
      startVerify({ dup: true, fromScan: true });
    } else if (kind === 'mismatch') {
      startVerify({ mismatch: true, fromScan: true });
    } else if (kind === 'multi') {
      startVerify({ multi: true, fromScan: true });
    } else {
      reinforceScanFail();
    }
  }

  function syncConfirmUI() {
    var empBtn = $('#confirmEmpBtn');
    if (empBtn) {
      var empText = matchStaff ? matchStaff.empSummaryText() : (staffName() || '未选');
      var hasEmp = empText !== '未选';
      empBtn.textContent = empText + (session.allowReassign ? ' ▸' : '（不可改派）');
      empBtn.style.color = hasEmp ? 'var(--info)' : '#B9B9B9';
    }

    var ids = session.selectedMatchIds && session.selectedMatchIds.length
      ? session.selectedMatchIds
      : (session.selectedProdId ? [session.selectedProdId] : []);
    var items = ids.map(prodById).filter(Boolean);
    var pickCta = $('#btnPickMatch');
    var head = $('#confirmMatchHead');
    var itemsEl = $('#confirmMatchItems');
    var ratio = $('#confirmMatchRatio');
    var tip = $('#confirmUnmatchTip');
    var cpr = $('#confirmPrice');
    var face = $('#confirmFace');
    var codeEl = $('#confirmCode');

    if (face) face.textContent = '¥' + Number(session.couponPrice);
    if (codeEl) codeEl.textContent = maskCode(session.couponCode);
    if (cpr) cpr.textContent = '¥' + Number(session.couponPrice).toFixed(2);

    if (!items.length) {
      if (pickCta) pickCta.hidden = false;
      if (head) head.hidden = true;
      if (itemsEl) itemsEl.innerHTML = '';
      if (ratio) ratio.hidden = true;
      if (tip) tip.hidden = false;
    } else if (items.length === 1) {
      if (pickCta) pickCta.hidden = true;
      if (head) head.hidden = false;
      if (itemsEl) {
        itemsEl.innerHTML =
          '<div class="match-item-line"><span class="nm">' + items[0].name + '</span></div>';
      }
      if (ratio) ratio.hidden = true;
      if (tip) tip.hidden = true;
    } else {
      if (pickCta) pickCta.hidden = true;
      if (head) head.hidden = false;
      if (itemsEl) {
        itemsEl.innerHTML = items.map(function (it) {
          var kind = it.kind === 'product' ? '产品' : '项目';
          return '<div class="match-item-line">' +
            '<span class="nm">' + it.name + '</span>' +
            '<span class="sub">' + kind + ' · 门店价 ¥' + it.price + '</span>' +
            '</div>';
        }).join('');
      }
      if (ratio) ratio.hidden = false;
      if (tip) tip.hidden = true;
    }

    var matchRow = $('#confirmMatchRow');
    if (matchRow) matchRow.classList.toggle('is-multi', items.length > 1);

    var couponNameEl = $('#confirmCouponName');
    if (couponNameEl) couponNameEl.textContent = session.couponName || '';
    syncMatchStatusTags();

    var so = $('#successOp');
    if (so) so.textContent = session.opName || '顾清扬';
  }

  function applyCouponToResult(name, price, code, prodId, mismatched) {
    session.couponName = name;
    session.couponPrice = price;
    session.couponCode = code;
    session.orderType = '快捷开单';
    session.payType = '团购';
    if (mismatched) {
      session.selectedProdId = null;
      session.selectedMatchIds = [];
      session.mismatched = true;
      applyMemoryForCoupon(name);
    } else if (Array.isArray(prodId)) {
      session.selectedMatchIds = prodId.slice();
      session.selectedProdId = session.selectedMatchIds[0] || null;
      session.mismatched = false;
    } else if (prodId) {
      session.selectedProdId = prodId;
      session.selectedMatchIds = [prodId];
      session.mismatched = false;
      applyMemoryForCoupon(name);
    } else {
      session.selectedProdId = null;
      session.selectedMatchIds = [];
      session.mismatched = true;
      applyMemoryForCoupon(name);
    }
    var rn = $('#resultProdName');
    var rp = $('#resultPrice');
    var rc = $('#resultCode');
    if (rn) rn.textContent = name;
    if (rp) rp.textContent = String(price);
    if (rc) rc.textContent = maskCode(code);
    $all('#screen-confirm .info-card:first-of-type .kv').forEach(function (row) {
      var k = row.querySelector('.k');
      var v = row.querySelector('.v');
      if (k && v && k.textContent === '面额') v.textContent = '¥' + price;
      if (k && v && k.textContent === '券码') v.textContent = maskCode(code);
    });
    var face = $('#confirmFace');
    var codeEl = $('#confirmCode');
    if (face) face.textContent = '¥' + price;
    if (codeEl) codeEl.textContent = maskCode(code);
    syncConfirmUI();
  }

  function maskCode(code) {
    if (!code || code.length < 8) return code;
    return code.slice(0, 2) + '********' + code.slice(-4);
  }

  function showScreen(flow, push) {
    var map = {
      home: 'screen-home',
      scan: 'screen-scan',
      input: 'screen-input',
      result: 'screen-result',
      confirm: 'screen-confirm',
      success: 'screen-success',
      fail: 'screen-fail',
      'verify-fail': 'screen-verify-fail',
      orders: 'screen-orders',
      detail: 'screen-detail',
      'revoke-ok': 'screen-revoke-ok',
      'owner-auth': 'screen-owner-auth',
      'owner-attr': 'screen-owner-attr',
      'cam-denied': 'screen-cam-denied',
      'tpl-offline': 'screen-tpl-offline',
      'tpl-timeout': 'screen-tpl-timeout',
      'tpl-noperm': 'screen-tpl-noperm',
      'match-pick': 'screen-match-pick'
    };
    var id = map[flow];
    if (!id) return;
    $all('.screen').forEach(function (s) { s.classList.remove('active'); });
    var screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
    setNav(flow);
    if (push !== false) {
      if (historyStack[historyStack.length - 1] !== flow) historyStack.push(flow);
    }
    if (flow === 'orders') renderOrders();
    if (flow === 'confirm') syncConfirmUI();
    if (flow === 'owner-auth') applyAuthUI();
    if (flow === 'owner-attr') {
      refreshAttrEmp();
    }
    if (flow !== 'scan') {
      var entry = $('#scanInputEntry');
      if (entry) entry.classList.remove('pulse');
    }
    closeMasks();
  }

  function goBack() {
    if (historyStack.length > 1) historyStack.pop();
    var prev = historyStack[historyStack.length - 1] || 'home';
    showScreen(prev, false);
  }

  function tryEnterScan() {
    if (!gateConsumeEntry()) return;
    if (session.camDenied) {
      showScreen('cam-denied');
      return;
    }
    if (session.offline) {
      openMask('offlineMask');
      return;
    }
    showScreen('scan');
  }

  function startVerify(opts) {
    opts = opts || {};
    if (!gateOnAction()) return;
    if (session.offline) {
      showScreen('tpl-offline');
      return;
    }
    withLoading(opts.loadingText || '正在验券…', 900, function () {
      if (opts.dup) {
        openMask('dupMask');
        return;
      }
      if (opts.vfail) {
        setVerifyFail(opts.vfail);
        showScreen('verify-fail');
        return;
      }
      if (opts.mismatch) {
        var mm = (seed.couponDemos && seed.couponDemos.mismatch) || {
          name: '抖音专享护理 · 单次体验', price: 199, code: 'dy9900-MM00-1122'
        };
        applyCouponToResult(mm.name, mm.price, mm.code, null, true);
        flashScanOk();
        setTimeout(function () { showScreen('result'); }, 500);
        return;
      }
      if (opts.multi) {
        var md = (seed.couponDemos && seed.couponDemos.multi) || {
          name: '护理组合体验券', price: 436, code: 'dy8800-MT00-5566'
        };
        /* 预写入会话记忆，模拟此前手工多选匹配 */
        session.matchMemory[md.name] = [
          { id: 'p21', kind: 'project', name: '深层补水护理', price: 268 },
          { id: 'p15', kind: 'project', name: '头皮护理', price: 168 }
        ];
        applyCouponToResult(md.name, md.price, md.code, null, true);
        flashScanOk();
        setTimeout(function () { showScreen('result'); }, 500);
        return;
      }
      var demo = (seed.couponDemos && seed.couponDemos.default) || {
        name: '深层补水护理 · 单次体验', price: 268, code: 'dy9182-ABCD-7781'
      };
      var name = opts.name || demo.name;
      var price = opts.price != null ? opts.price : demo.price;
      var code = opts.code || demo.code;
      resolveCouponMatch(name);
      applyCouponToResult(name, price, code, null, true);
      if (opts.fromScan) flashScanOk();
      setTimeout(function () { showScreen('result'); }, opts.fromScan ? 500 : 0);
    });
  }

  function startConsume() {
    if (!gateOnAction()) return;
    if (session.offline) {
      showScreen('tpl-offline');
      return;
    }
    withLoading('正在核销…', 1000, function () {
      showScreen('success');
    });
  }

  function renderOrders() {
    var list = $('#orderListDouyin');
    var empty = $('#orderListEmpty');
    var onTab = $('.plat-tab.on', $('#orderTabs'));
    var plat = onTab ? onTab.getAttribute('data-order-plat') : 'douyin';

    if (plat !== 'douyin') {
      list.hidden = true;
      empty.hidden = false;
      return;
    }

    var rows = ORDERS.filter(function (o) {
      if (filterState.status === 'ok' && o.status !== 'ok') return false;
      if (filterState.status === 'revoked' && o.status !== 'revoked') return false;
      if (filterState.status === 'refund' && o.status !== 'refund') return false;
      if (filterState.time === 'today' && (o.time || '').indexOf('2026-09-03') !== 0) return false;
      return true;
    });

    if (!rows.length) {
      list.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.hidden = false;
    list.innerHTML = rows.map(function (o) {
      var st = o.status === 'revoked'
        ? '<span class="tag tag-rev">已撤销</span>'
        : o.status === 'refund'
          ? '<span class="tag tag-refund">退款冲销</span>'
          : '<span class="tag tag-ok">已核销</span>';
      return (
        '<button type="button" class="order-card" data-order-id="' + o.id + '">' +
          '<div class="row1"><div class="name">' + o.name + '</div><div class="amt">¥' + o.price + '</div></div>' +
          '<div class="meta">' + o.time + ' · ' + o.op + '</div>' +
          '<div class="tags"><span class="tag tag-plat-dy">抖音</span>' + st + '</div>' +
        '</button>'
      );
    }).join('');
  }

  function openDetail(id) {
    var o = ORDERS.filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    currentOrder = o;
    $('#detailName').textContent = o.name;
    $('#detailPrice').textContent = o.price;
    var statusHtml =
      o.status === 'revoked' ? '<span class="tag tag-rev">已撤销</span>'
        : o.status === 'refund' ? '<span class="tag tag-refund">退款冲销</span>'
          : '<span class="tag tag-ok">已核销</span>';
    $('#detailStatus').innerHTML = statusHtml;
    var codeEl = $('#detailCode');
    var codeTxt = codeEl.querySelector('.copy-text');
    if (codeTxt) codeTxt.textContent = o.code; else codeEl.textContent = o.code;
    codeEl.setAttribute('data-copy', o.code);
    var oidEl = $('#detailOid');
    var oidTxt = oidEl.querySelector('.copy-text');
    if (oidTxt) oidTxt.textContent = o.oid; else oidEl.textContent = o.oid;
    oidEl.setAttribute('data-copy', o.oid);
    $('#detailTime').textContent = o.time;
    $('#detailOp').textContent = o.op;
    $('#detailBill').textContent = o.bill;
    $('#detailRevokeHint').textContent = o.revokeHint;
    var cs = $('#detailCsGuide');
    /* Figma S8b 不展示客服卡；控件保留供后续演示扩展 */
    if (cs) cs.hidden = true;
    var btn = $('#btnRevoke');
    if (o.status === 'refund' || o.status === 'revoked') {
      btn.disabled = true;
      btn.textContent = o.status === 'refund' ? '已退款冲销' : '已撤销';
    } else if (o.canRevoke) {
      btn.disabled = false;
      btn.textContent = '撤销核销';
    } else {
      btn.disabled = true;
      btn.textContent = '已超时不可撤销';
    }
    showScreen('detail');
  }

  function syncFilterChips(state) {
    $all('#filterStatusChips .filter-chip').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-f-status') === state.status);
    });
    $all('#filterTimeChips .filter-chip').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-f-time') === state.time);
    });
  }

  function syncFilterBadge() {
    var dot = $('#filterBtn .filter-dot');
    var active = filterState.status !== 'all' || filterState.time !== 'all';
    if (dot) dot.hidden = !active;
  }

  function skipPhone() {
    session.phone = '';
    closeMasks();
    var btn = $('#btnAddPhone');
    if (btn) btn.textContent = '登记手机号 ▸';
    toast('已跳过');
  }

  function isFlowActive(flow) {
    var map = {
      fail: 'screen-fail',
      'verify-fail': 'screen-verify-fail'
    };
    var id = map[flow];
    var s = id ? document.getElementById(id) : null;
    return !!(s && s.classList.contains('active'));
  }

  function ensureFlowThen(flow, fn) {
    if (isFlowActive(flow)) {
      fn();
      return;
    }
    showScreen(flow);
    setTimeout(fn, 80);
  }

  function setFail(type) {
    var f = FAIL_MAP[type] || FAIL_MAP.invalid;
    $('#failTitle').textContent = f.title;
    $('#failDesc').textContent = f.desc;
    $('#failAction').textContent = f.action;
    $('#failCode').textContent = f.code;
    $all('#failSwitch button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-fail') === type);
    });
    var primary = $('#failPrimaryBtn');
    primary.setAttribute('data-go', f.primary);
    primary.textContent = f.primary === 'orders' ? '查看订单'
      : f.primary === 'owner-auth' ? '查看授权指引'
      : f.primary === 'confirm' ? '重试核销'
      : f.primary === 'input' ? '手动输码'
      : '重新扫码';
  }

  function setVerifyFail(type) {
    var f = VFAIL_MAP[type] || VFAIL_MAP.invalid;
    $('#vfailTitle').textContent = f.title;
    $('#vfailDesc').textContent = f.desc;
    $('#vfailAction').textContent = f.action;
    $all('#verifyFailSwitch button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-vfail') === type);
    });
    var foot = $('#screen-verify-fail .footer-actions .btn-primary');
    if (foot) {
      if (type === 'used') {
        foot.setAttribute('data-go', 'orders');
        foot.textContent = '查看订单';
      } else {
        foot.setAttribute('data-go', 'scan');
        foot.textContent = '重新扫码';
      }
    }
  }

  function setInputPlat(plat) {
    $all('#inputTabs .plat-tab').forEach(function (t) {
      t.classList.toggle('on', t.getAttribute('data-plat') === plat);
    });
    $('#inputPanelDouyin').hidden = plat !== 'douyin';
    $('#inputPanelCoupon').hidden = plat !== 'coupon';
    $('#inputPanelMeituan').hidden = plat !== 'meituan';
  }

  function openEmpPicker(ctx) {
    empPickCtx = ctx || 'confirm';
    if (!matchStaff) return;
    matchStaff.syncStaffFromSession();
    var root = $('#empPickRoot');
    matchStaff.renderStaffInto(root);
    openMask('empMask');
  }

  function openProdPicker() {
    if (!matchStaff) return;
    matchStaff.openMatchPick();
  }

  // events
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-flow]');
    if (t && t.classList.contains('nav-item')) {
      var navFlow = t.getAttribute('data-flow');
      if (CONSUME_ENTRY[navFlow] && !session.rolePerm) {
        historyStack = ['tpl-noperm'];
        showScreen('tpl-noperm', false);
        return;
      }
      historyStack = [navFlow];
      showScreen(navFlow, false);
      return;
    }

    var go = e.target.closest('[data-go]');
    if (go) {
      var target = go.getAttribute('data-go');
      if (target === 'scan') {
        tryEnterScan();
        return;
      }
      if (target === 'confirm' && !gateOnAction()) return;
      if (target === 'input' && !gateConsumeEntry()) return;
      showScreen(target);
      return;
    }

    if (e.target.closest('[data-back]')) {
      goBack();
      return;
    }

    if (e.target.closest('[data-close-mask]')) {
      closeMasks();
      return;
    }

    var copy = e.target.closest('[data-copy]');
    if (copy) {
      var v = copy.getAttribute('data-copy');
      if (v && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(v).then(function () { toast('已复制'); }).catch(function () { toast('已复制：' + v); });
      } else {
        toast('已复制：' + v);
      }
      return;
    }

    if (e.target.closest('#homeScanBtn')) {
      tryEnterScan();
      return;
    }

    var demo = e.target.closest('[data-demo-scan]');
    if (demo) {
      var kind = demo.getAttribute('data-demo-scan');
      ensureScanThen(function () { runScanDemo(kind); });
      return;
    }

    var netBtn = e.target.closest('#demoNetBar [data-demo-net]');
    if (netBtn) {
      session.offline = netBtn.getAttribute('data-demo-net') === 'offline';
      syncDemoGateUI();
      toast(session.offline ? '演示：已离线' : '演示：已联网');
      return;
    }
    var camBtn = e.target.closest('#demoCamBar [data-demo-cam]');
    if (camBtn) {
      session.camDenied = camBtn.getAttribute('data-demo-cam') === 'denied';
      syncDemoGateUI();
      toast(session.camDenied ? '演示：相机无权限' : '演示：相机已授权');
      return;
    }
    var permBtn = e.target.closest('#demoPermBar [data-demo-perm]');
    if (permBtn) {
      session.rolePerm = permBtn.getAttribute('data-demo-perm') === 'ok';
      syncDemoGateUI();
      toast(session.rolePerm ? '演示：账号有核销权限' : '演示：账号无核销权限');
      return;
    }

    if (e.target.closest('#btnOfflineEnterScan')) {
      closeMasks();
      if (!gateConsumeEntry()) return;
      showScreen('scan');
      return;
    }

    if (e.target.closest('#btnRetryOnline')) {
      session.offline = false;
      syncDemoGateUI();
      toast('已切换为联网');
      goBack();
      return;
    }

    if (e.target.closest('#btnOpenSettings')) {
      toast('请在系统设置中开启相机权限（示意）');
      return;
    }

    if (e.target.closest('#btnViewDupOrder')) {
      closeMasks();
      openDetail('o1');
      return;
    }

    var plat = e.target.closest('#inputTabs [data-plat]');
    if (plat) {
      var p = plat.getAttribute('data-plat');
      if (p === 'meituan') return;
      setInputPlat(p);
      return;
    }

    if (e.target.closest('#btnVerifyNow')) {
      var val = ($('#codeInput').value || '').trim();
      if (!val) {
        toast('请输入券码');
        return;
      }
      if (/used|已核销/i.test(val)) {
        startVerify({ dup: true });
        return;
      }
      if (/fail|无效/i.test(val)) {
        startVerify({ vfail: 'invalid' });
        return;
      }
      if (/mismatch|未匹配/i.test(val)) {
        startVerify({ mismatch: true });
        return;
      }
      startVerify({ code: val, name: '深层补水护理 · 单次体验' });
      return;
    }

    if (e.target.closest('#btnConfirmVerify')) {
      startConsume();
      return;
    }

    if (e.target.closest('#confirmEmpBtn')) {
      if (!session.allowReassign) {
        toast('店长已关闭「核销时允许改派」');
        return;
      }
      openEmpPicker('confirm');
      return;
    }

    if (e.target.closest('#attrDefaultEmp')) {
      openEmpPicker('attr');
      return;
    }

    if (e.target.closest('#btnPickMatch') || e.target.closest('#btnPickProduct') || e.target.closest('#confirmMatchEdit')) {
      openProdPicker();
      return;
    }

    var empItem = e.target.closest('#empPickList [data-emp-id]');
    if (empItem) {
      session.selectedEmpId = empItem.getAttribute('data-emp-id');
      session.selectedEmpIds = [session.selectedEmpId];
      closeMasks();
      syncConfirmUI();
      refreshAttrEmp();
      toast('已选择：' + (staffName() || '已选择'));
      return;
    }

    var prodItem = e.target.closest('#prodPickList [data-prod-id]');
    if (prodItem) {
      session.selectedProdId = prodItem.getAttribute('data-prod-id');
      session.selectedMatchIds = [session.selectedProdId];
      session.mismatched = false;
      closeMasks();
      syncConfirmUI();
      toast('已匹配项目');
      return;
    }

    if (e.target.closest('#btnAddPhone')) {
      openMask('phoneMask');
      return;
    }

    if (e.target.closest('#btnSkipPhone')) {
      skipPhone();
      return;
    }

    if (e.target.closest('#btnSavePhone')) {
      var phone = ($('#phoneInput').value || '').trim();
      if (phone && !/^1\d{10}$/.test(phone)) {
        toast('请输入 11 位手机号');
        return;
      }
      if (!phone) {
        skipPhone();
        return;
      }
      session.phone = phone;
      closeMasks();
      var btn = $('#btnAddPhone');
      if (btn) btn.textContent = phone.slice(0, 3) + '****' + phone.slice(-4) + ' ▸';
      toast('手机号已保存');
      return;
    }

    var failBtn = e.target.closest('#failSwitch [data-fail]');
    if (failBtn) {
      var failType = failBtn.getAttribute('data-fail');
      ensureFlowThen('fail', function () { setFail(failType); });
      return;
    }

    var vfailBtn = e.target.closest('#verifyFailSwitch [data-vfail]');
    if (vfailBtn) {
      var vfailType = vfailBtn.getAttribute('data-vfail');
      ensureFlowThen('verify-fail', function () { setVerifyFail(vfailType); });
      return;
    }

    var authBtn = e.target.closest('#authStateBar [data-auth]');
    if (authBtn) {
      session.auth = authBtn.getAttribute('data-auth');
      applyAuthUI();
      toast('授权状态：' + (AUTH_UI[session.auth] || {}).label);
      return;
    }

    if (e.target.closest('#filterBtn')) {
      filterDraft = { status: filterState.status, time: filterState.time };
      syncFilterChips(filterDraft);
      openMask('filterMask');
      return;
    }

    var statusChip = e.target.closest('#filterStatusChips [data-f-status]');
    if (statusChip) {
      filterDraft.status = statusChip.getAttribute('data-f-status');
      syncFilterChips(filterDraft);
      return;
    }

    var timeChip = e.target.closest('#filterTimeChips [data-f-time]');
    if (timeChip) {
      filterDraft.time = timeChip.getAttribute('data-f-time');
      syncFilterChips(filterDraft);
      return;
    }

    if (e.target.closest('#btnFilterReset')) {
      filterDraft = { status: 'all', time: 'all' };
      syncFilterChips(filterDraft);
      return;
    }

    if (e.target.closest('#btnFilterApply')) {
      filterState = { status: filterDraft.status, time: filterDraft.time };
      syncFilterBadge();
      closeMasks();
      renderOrders();
      toast(filterState.status === 'all' && filterState.time === 'all' ? '已显示全部' : '已应用筛选');
      return;
    }

    var orderPlat = e.target.closest('#orderTabs [data-order-plat]');
    if (orderPlat) {
      var op = orderPlat.getAttribute('data-order-plat');
      if (op === 'meituan') return;
      $all('#orderTabs .plat-tab').forEach(function (t) {
        t.classList.toggle('on', t === orderPlat);
      });
      renderOrders();
      return;
    }

    var orderCard = e.target.closest('[data-order-id]');
    if (orderCard) {
      openDetail(orderCard.getAttribute('data-order-id'));
      return;
    }

    if (e.target.closest('#btnRevoke')) {
      if (!currentOrder) return;
      if (currentOrder.canRevoke) {
        openMask('revokeMask');
      } else if (currentOrder.status === 'ok') {
        var cs = $('#detailCsGuide');
        if (cs) {
          cs.hidden = false;
          cs.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        toast('已超时，请联系客服');
      }
      return;
    }

    if (e.target.closest('#btnRevokeConfirm')) {
      // 14B：确认 → 成功，无撤销失败中间页
      if (currentOrder) {
        currentOrder.status = 'revoked';
        currentOrder.canRevoke = false;
        currentOrder.revokeHint = '已撤销';
      }
      closeMasks();
      withLoading('正在撤销…', 700, function () {
        showScreen('revoke-ok');
      });
      return;
    }

    if (e.target.closest('#swReassign')) {
      var sw = e.target.closest('#swReassign');
      sw.classList.toggle('on');
      session.allowReassign = sw.classList.contains('on');
      syncConfirmUI();
      return;
    }
    if (e.target.closest('#swStoreOnly')) {
      e.target.closest('.switch').classList.toggle('on');
      return;
    }

    if (e.target.closest('#btnSaveAttr')) {
      toast('配置已保存');
      return;
    }

    if (e.target.classList.contains('picker-mask') || e.target.classList.contains('dialog-mask')) {
      closeMasks();
    }
  });

  // boot
  matchStaff = new window.DyMatchStaff({
    seed: seed,
    session: session,
    staffById: staffById,
    toast: toast,
    showScreen: showScreen,
    goBack: goBack,
    closeMasks: closeMasks,
    syncConfirmUI: syncConfirmUI,
    refreshAttrEmp: refreshAttrEmp,
    staffName: staffName
  });
  matchStaff.bindEvents();

  setFail('invalid');
  setVerifyFail('invalid');
  setInputPlat('douyin');
  applyAuthUI();
  syncDemoGateUI();
  syncConfirmUI();
  renderOrders();

  function applyFigmaCapture() {
    var key = new URLSearchParams(location.search).get('capture');
    if (!key) return;
    var root = document.documentElement;
    root.classList.add('figma-capture', 'view-desktop');
    root.classList.remove('view-mobile');
    root.style.removeProperty('--app-h');
    root.style.removeProperty('--app-w');
    root.style.removeProperty('--app-top');
    root.style.removeProperty('--app-left');

    var routes = {
      scan: function () { showScreen('scan', false); historyStack = ['scan']; },
      input: function () { setInputPlat('douyin'); showScreen('input', false); historyStack = ['input']; },
      result: function () {
        applyCouponToResult('深层补水护理 · 单次体验', 268, 'dy9182-ABCD-7781', null, true);
        showScreen('result', false); historyStack = ['result'];
      },
      confirm: function () {
        applyCouponToResult('深层补水护理 · 单次体验', 268, 'dy9182-ABCD-7781', null, true);
        showScreen('confirm', false); historyStack = ['confirm'];
      },
      success: function () { showScreen('success', false); historyStack = ['success']; },
      orders: function () { showScreen('orders', false); historyStack = ['orders']; },
      'detail-ok': function () { openDetail('o1'); historyStack = ['orders', 'detail']; },
      'detail-timeout': function () { openDetail('o2'); historyStack = ['orders', 'detail']; },
      'revoke-ok': function () { showScreen('revoke-ok', false); historyStack = ['revoke-ok']; },
      'cam-denied': function () { showScreen('cam-denied', false); historyStack = ['cam-denied']; },
      'tpl-offline': function () { showScreen('tpl-offline', false); historyStack = ['tpl-offline']; },
      'tpl-timeout': function () { showScreen('tpl-timeout', false); historyStack = ['tpl-timeout']; },
      'tpl-noperm': function () { showScreen('tpl-noperm', false); historyStack = ['tpl-noperm']; },
      'verify-fail': function () {
        setVerifyFail('invalid');
        showScreen('verify-fail', false); historyStack = ['verify-fail'];
      },
      fail: function () {
        setFail('invalid');
        showScreen('fail', false); historyStack = ['fail'];
      },
      'owner-auth': function () {
        session.auth = 'ok';
        applyAuthUI();
        showScreen('owner-auth', false); historyStack = ['owner-auth'];
      }
    };
    var run = routes[key];
    if (!run) {
      console.warn('[capture] unknown key:', key);
      showScreen('home', false);
      historyStack = ['home'];
      return;
    }
    setTimeout(run, 80);
  }

  if (new URLSearchParams(location.search).get('capture')) {
    applyFigmaCapture();
  } else {
    showScreen('home', false);
    historyStack = ['home'];
  }
  syncFilterBadge();

  window.addEventListener('resize', function () {
    if (window.__dyApplyViewShell) window.__dyApplyViewShell();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      if (window.__dySyncAppHeight) window.__dySyncAppHeight();
    });
  }
})();
