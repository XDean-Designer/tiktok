(function () {
  var historyStack = ['home'];
  /* 逻辑父级：返回栈为空时兜底，并用于按入口初始化历史栈 */
  var BACK_PARENT = {
    'tg-set': 'workbench',
    'tg-deals': 'tg-set',
    'tg-config': 'tg-deals',
    'order-flow': 'workbench',
    'auth-open': 'account',
    'pick-member': 'confirm'
  };
  var currentOrder = null;
  var filterState = { status: 'all', time: 'all' };
  var filterDraft = { status: 'all', time: 'all' };
  /* 无核销权限时禁止进入的主链路（防绕过） */
  var CONSUME_ENTRY = { scan: 1, input: 1, result: 1, confirm: 1, 'pick-member': 1, success: 1 };
  /* 页面/弹层 → PRD 屏级锚点（PRD-团购核销.html） */
  var PRD_ANCHOR = {
    home: 'home',
    workbench: 'home',
    'order-flow': 'home',
    account: 'account',
    scan: 'scan',
    input: 'input',
    result: 'result',
    confirm: 'confirm',
    'match-pick': 'match-pick',
    'pick-member': 'pick-member',
    'coupon-ph': 'scan',
    success: 'success',
    fail: 'fail',
    orders: 'orders',
    detail: 'detail',
    'revoke-ok': 'revoke-ok',
    'owner-auth': 'auth-open',
    'owner-auth-mt': 'auth-open',
    'auth-open': 'auth-open',
    'dy-auth-grant': 'auth-open',
    'tg-set': 'tg-set',
    'tg-deals': 'tg-deals',
    'tg-config': 'tg-config',
    'cam-denied': 'cam-denied',
    'tpl-offline': 'tpl-offline',
    'tpl-timeout': 'tpl-timeout',
    'tpl-noperm': 'tpl-noperm',
    'verify-fail': 'verify-fail'
  };
  var PRD_MASK_ANCHOR = {
    empMask: 'empMask',
    phoneMask: null,
    filterMask: 'orders',
    revokeMask: 'detail',
    dupMask: 'scan',
    offlineMask: 'tpl-offline',
    authNeedMask: 'auth-open',
    mapNeedMask: 'auth-open',
    camDeniedMask: 'cam-denied',
    offlinePageMask: 'tpl-offline',
    timeoutMask: 'tpl-timeout',
    nopermMask: 'tpl-noperm',
    vfailMask: 'verify-fail',
    failMask: 'fail',
    loadingMask: null
  };
  var PRD_TITLE = {
    howto: '怎么读这份 PRD',
    home: '6.1 演示首页（占位）',
    account: '6.1b 账号管理',
    scan: '6.2 扫码核销',
    input: '6.3 输码验券',
    result: '6.4 验券结果',
    confirm: '6.5 核销确认',
    'match-pick': '6.6 选择消费项',
    'pick-member': '6.5b 选择顾客',
    empMask: '6.7 选择服务员工',
    success: '6.8 核销成功',
    fail: '6.9 核销失败',
    orders: '6.10 核销明细',
    detail: '6.11 订单详情与撤销',
    'revoke-ok': '6.12 撤销成功',
    'tg-set': '6.13c 团购设置',
    'tg-deals': '6.13c 目录列表',
    'tg-config': '6.13c 默认配置',
    'auth-open': '6.13 平台开通（三步）',
    'owner-auth': '6.13 平台开通（三步）',
    'owner-auth-mt': '6.13 平台开通（三步）',
    'dy-auth-grant': '6.13 平台开通（三步）',
    'cam-denied': '6.14 相机无权限',
    'tpl-offline': '6.15 断网模板',
    'tpl-timeout': '6.15 超时模板',
    'tpl-noperm': '6.15 无权限模板',
    'verify-fail': '6.16 验券失败',
    masks: '6.17 弹层汇总'
  };
  var session = {
    offline: false,
    camDenied: false,
    plat: 'douyin', // douyin | meituan（当前核销平台）
    authDouyin: 'ok', // none | pending | ok | expired
    authMeituan: 'ok',
    mapDouyin: true, // 平台门店是否已绑定 APP store
    mapMeituan: true,
    bindCodeDy: '',
    bindCodeMt: '',
    shopCertStatus: 'approved',
    dyGrantScopes: ['store', 'verify', 'reconcile'],
    orderId: '716829104455',
    dealId: 'product_882910',
    rolePerm: true, // 对应 APP 角色权限「收银开单」：关闭则不可扫码核销
    selectedEmpId: null, // 业绩归属默认空：不默认店主，核销时点击选择
    selectedEmpIds: [],
    staffRoles: {},
    staffDesignated: {},
    opName: '顾清扬', // 当前操作账号（成功页“操作人”），与业绩归属解耦
    selectedProdId: null,
    selectedMatchIds: [],
    selectedMatchQty: {}, // { [matchId]: number }
    matchMemory: {},
    dealDefaults: {}, // { [storeId]: { [dealId]: { matches:[{id,qty}], matchIds } } }
    tgEditDealId: null,
    tgStoreId: 'store_zs', /* 团购券列表当前门店 TAB */
    loginStoreId: 'store_zs',
    loginStoreName: '悦颜美肌 · 中山路店',
    boundStoresDy: [],
    boundStoresMt: [],
    matchPickFrom: 'confirm', // confirm | tg-config
    /* 内部开单字段（UI 文案按平台显示「抖音团购 / 美团团购」） */
    orderType: '快捷开单',
    payType: '团购',
    couponName: '深层补水护理 · 单次体验',
    couponPrice: 268,
    couponCode: 'dy9182-ABCD-7781',
    couponKind: 'groupbuy', /* groupbuy | times */
    timesTotal: 0,
    timesLeft: 0,
    timesUse: 1, /* 本次核销次数（与核销项目数量解耦） */
    timesUnitPrice: 0, /* 单次结算价 */
    lastBillAmount: 0,
    mismatched: true,
    /* 确认页 · 消费顾客（与员工业绩点客/散客解耦） */
    customerMode: 'guest', /* member | guest */
    guestJoin: 'no', /* yes | no */
    guestGender: 'male',
    joinGender: 'male',
    joinPhone: '',
    joinNick: '',
    selectedMember: null,
    tgCustomerSeq: 1,
    lastCustomerLabel: '男散客',
    registeredMembers: [] /* 演示：确认核销时新建的会员 */
  };

  var seed = window.DySeed || { staff: [], products: [], projects: [], shopProducts: [], catalogGroups: {}, couponDemos: {} };
  var matchStaff = null;

  /* 选择顾客页：仅真实会员（无散客快捷入口）· 对齐 Figma 58:111 */
  var DEMO_MEMBERS = [
    {
      id: 'm1', name: '陈女士', phone: '19900000255', letter: 'C', vip: true, cards: 3,
      gender: 'female', avatar: 'assets/icons/avatar-female.png',
      last: '最近消费：2026.8.15 水光三次卡【¥300.00】'
    },
    {
      id: 'm2', name: '陈昕然', phone: '19900000256', letter: 'C', vip: false, cards: 0,
      gender: 'male', avatar: 'assets/icons/avatar-male.png',
      last: '最近消费：未消费'
    },
    {
      id: 'm3', name: '高海泉', phone: '13800001122', letter: 'G', vip: false, cards: 0,
      gender: 'male', avatar: 'assets/icons/avatar-male.png',
      last: '最近消费：未消费'
    },
    {
      id: 'm4', name: '李女士', phone: '18600003344', letter: 'L', vip: true, cards: 2,
      gender: 'female', avatar: 'assets/icons/avatar-female.png',
      last: '最近消费：2026.8.10 御方九物【¥198.00】'
    },
    {
      id: 'm5', name: '马婷', phone: '13600006677', letter: 'M', vip: false, cards: 0,
      gender: 'female', avatar: 'assets/icons/avatar-female.png',
      last: '最近消费：未消费'
    }
  ];
  var PICK_INDEX_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

  var ORDERS = [
    {
      id: 'o1',
      plat: 'douyin',
      couponName: '深层补水护理 · 单次体验',
      name: '深层补水护理',
      customer: '陈女士',
      price: 268,
      code: 'dy9182-ABCD-7781',
      oid: '716829104455',
      dealId: 'product_882910',
      time: '2026-09-03 15:42',
      op: '顾清扬',
      bill: 'SO20260903018',
      status: 'ok',
      canRevoke: true,
      revokeHint: '剩余 42 分钟可撤销'
    },
    {
      id: 'o2',
      plat: 'douyin',
      couponName: '时尚洗剪吹',
      name: '洗剪吹',
      customer: '男散客',
      price: 98,
      code: 'dy4410-KK92-1203',
      oid: '716829088120',
      dealId: 'product_660188',
      time: '2026-09-03 11:18',
      op: '林屿森',
      bill: 'SO20260903007',
      status: 'ok',
      canRevoke: false,
      revokeHint: '已超过 1 小时，不可撤销'
    },
    {
      id: 'o3',
      plat: 'douyin',
      couponName: '头皮护理套餐',
      name: '头皮护理',
      customer: '女散客',
      price: 168,
      code: 'dy2201-PL88-0091',
      oid: '716828901144',
      dealId: 'product_771204',
      time: '2026-09-02 19:05',
      op: '何苏叶',
      bill: 'SO20260902044',
      status: 'revoked',
      canRevoke: false,
      revokeHint: '已撤销'
    },
    {
      id: 'o4',
      plat: 'douyin',
      couponName: '美白淡斑护理',
      name: '美白淡斑护理',
      customer: '李女士',
      price: 398,
      code: 'dy5502-RF01-3344',
      oid: '716828700221',
      dealId: 'product_550201',
      time: '2026-09-01 16:20',
      op: 'Lisa',
      bill: 'SO20260901012',
      status: 'refund',
      canRevoke: false,
      revokeHint: '顾客退款后已回滚业绩'
    },
    {
      id: 'o5',
      plat: 'meituan',
      couponName: '深层补水护理 · 美团专享',
      name: '深层补水护理',
      customer: '陈女士',
      price: 258,
      code: 'mt7182-ABCD-9901',
      oid: 'MT202609031102',
      dealId: 'deal_910288',
      time: '2026-09-03 14:08',
      op: '顾清扬',
      bill: 'SO20260903022',
      status: 'ok',
      canRevoke: true,
      revokeHint: '剩余 51 分钟可撤销'
    },
    {
      id: 'o6',
      plat: 'meituan',
      couponName: '时尚洗剪吹 · 美团',
      name: '快捷开单',
      customer: '男散客',
      price: 88,
      code: 'mt3301-KK11-8822',
      oid: 'MT202609021455',
      dealId: 'deal_774411',
      time: '2026-09-02 16:40',
      op: '林屿森',
      bill: 'SO20260902051',
      status: 'ok',
      canRevoke: false,
      revokeHint: '已超过 1 小时，不可撤销'
    }
  ];

  /* 核销阶段失败（确认后） */
  var FAIL_MAP = {
    invalid: {
      title: '券状态异常',
      desc: '核销提交时平台返回券不可用。请核对后重试或改输码。',
      action: '重新扫码或改输码',
      primary: 'scan'
    },
    used: {
      title: '券已核销',
      desc: '这张券已经核销过了，不会重复开单。可在验券订单里查看原单。',
      action: '查看验券订单',
      primary: 'orders'
    },
    store: {
      title: '非本店可用券',
      desc: '券适用门店与当前登录门店不一致，无法核销。',
      action: '更换门店或核对券信息',
      primary: 'scan'
    },
    perm: {
      title: '无核销权限',
      desc: '当前账号未开启「收银开单」权限，或门店授权已到期。请联系店长处理。',
      action: '联系店长 / 去团购设置',
      primary: 'tg-set'
    },
    network: {
      title: '网络超时',
      desc: '请求超时了。可以再试一次，不用担心会重复扣券。',
      action: '稍后重试',
      primary: 'confirm'
    }
  };

  /* 验券阶段失败（扫码/输码 → 验券） */
  var VFAIL_MAP = {
    invalid: {
      title: '券无效或已过期',
      desc: '验券未通过，尚未发起核销与开单。请核对有效期或让顾客在平台侧查看券状态。',
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
    none: { label: '未开通', tag: 'tag-rev', expire: '—' },
    pending: { label: '等待审核', tag: 'tag-wait', expire: '—' },
    ok: { label: '已授权', tag: 'tag-ok', expire: '2027-03-01' },
    expired: { label: '已到期', tag: 'tag-rev', expire: '2026-08-01' }
  };

  /* 账号管理 · 团购核销行状态（文案；颜色对齐授权页标签色） */
  var AUTH_ROW = {
    none: { label: '去开通', cls: 'is-go' },
    pending: { label: '审核中', cls: 'is-pending' },
    ok: { label: '已开通', cls: 'is-ok' },
    expired: { label: '已到期', cls: 'is-expired' }
  };

  var DY_GRANT_PERM_LABEL = {
    store: '门店信息',
    verify: '团购核销',
    reconcile: '团购对账',
    catalog: '商品同步'
  };

  function normalizeAuthState(v) {
    if (v === 'ok' || v === 'expired' || v === 'pending') return v;
    return 'none';
  }

  var pendingAuthPlat = 'douyin';
  var EXCEPTION_MASK = {
    'cam-denied': 'camDeniedMask',
    'tpl-offline': 'offlinePageMask',
    'tpl-timeout': 'timeoutMask',
    'tpl-noperm': 'nopermMask',
    'verify-fail': 'vfailMask',
    fail: 'failMask'
  };

  /* 扫码演示当前券类型：douyin | meituan | coupon | voucher | times */
  var scanKind = 'douyin';

  function isMeituan() { return session.plat === 'meituan'; }
  function platLabel() { return isMeituan() ? '美团' : '抖音'; }
  /* 支付方式字段：对齐线上称呼，仅「抖音」/「美团」 */
  function platPayLabel() { return isMeituan() ? '美团' : '抖音'; }
  function platGroupbuyTitle(plat) {
    return (plat === 'meituan') ? '美团团购' : '抖音团购';
  }
  function orderListTitle(o) {
    /* 门店流水 / 核销明细列表：显示核销团购券名；详情仍用 o.name（匹配项或快捷开单） */
    if (o && o.couponName) return o.couponName;
    return (o && o.name) || '团购核销';
  }
  function pad2(n) {
    n = Number(n) || 0;
    return n < 10 ? '0' + n : String(n);
  }
  function resolveMemberDisplayName(raw, gender) {
    var name = String(raw || '').trim();
    if (!name) return '';
    if (name.length === 1) {
      return name + (gender === 'female' ? '小姐' : '先生');
    }
    return name;
  }
  function currentMatchItems() {
    var ids = session.selectedMatchIds && session.selectedMatchIds.length
      ? session.selectedMatchIds
      : (session.selectedProdId ? [session.selectedProdId] : []);
    return ids.map(prodById).filter(Boolean);
  }
  function orderDetailNameFromSession() {
    var items = currentMatchItems();
    if (!items.length) return '快捷开单';
    return items.map(function (it) {
      var q = matchQtyOf(it.id);
      return q > 1 ? (it.name + '×' + q) : it.name;
    }).join('、');
  }
  function allMembers() {
    return DEMO_MEMBERS.concat(session.registeredMembers || []).filter(function (m, i, arr) {
      return arr.findIndex(function (x) { return x.id === m.id; }) === i;
    });
  }
  function saveJoinDraftFromDom() {
    var p = $('#custJoinPhone');
    var n = $('#custJoinNick');
    if (p) session.joinPhone = String(p.value || '');
    if (n) session.joinNick = String(n.value || '');
  }
  function restoreJoinDraftToDom() {
    var p = $('#custJoinPhone');
    var n = $('#custJoinNick');
    if (p) p.value = session.joinPhone || '';
    if (n) n.value = session.joinNick || '';
  }
  function syncConfirmCustUI() {
    var mode = session.customerMode === 'member' ? 'member' : 'guest';
    $all('#custModeSeg [data-cust-mode]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-cust-mode') === mode);
    });
    var panelM = $('#custPanelMember');
    var panelG = $('#custPanelGuest');
    if (panelM) panelM.hidden = mode !== 'member';
    if (panelG) panelG.hidden = mode !== 'guest';

    var mem = session.selectedMember;
    var cta = $('#btnPickMember');
    var sum = $('#custMemberSummary');
    if (mode === 'member') {
      if (mem) {
        if (cta) cta.hidden = true;
        if (sum) sum.hidden = false;
        var av = $('#custMemberAvatar');
        var nm = $('#custMemberName');
        var ph = $('#custMemberPhone');
        if (av) {
          av.src = mem.avatar || (mem.gender === 'male'
            ? 'assets/icons/avatar-male.png'
            : 'assets/icons/avatar-female.png');
        }
        if (nm) nm.textContent = mem.name || '—';
        if (ph) ph.textContent = mem.phone || '—';
      } else {
        if (cta) cta.hidden = false;
        if (sum) sum.hidden = true;
      }
    }

    var join = session.guestJoin === 'yes' ? 'yes' : 'no';
    $all('#custJoinSeg [data-cust-join]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-cust-join') === join);
    });
    var noJoin = $('#custGuestNoJoin');
    var yesJoin = $('#custGuestJoin');
    if (noJoin) noJoin.hidden = join === 'yes';
    if (yesJoin) yesJoin.hidden = join !== 'yes';
    if (join === 'yes') restoreJoinDraftToDom();

    var gGuest = session.guestGender || 'male';
    $all('#custGuestGender [data-guest-gender]').forEach(function (b) {
      var on = b.getAttribute('data-guest-gender') === gGuest;
      b.classList.toggle('on', on);
      b.classList.toggle('is-male', b.getAttribute('data-guest-gender') === 'male');
      b.classList.toggle('is-female', b.getAttribute('data-guest-gender') === 'female');
    });
    var gJoin = session.joinGender || 'male';
    $all('#custJoinGender [data-join-gender]').forEach(function (b) {
      var on = b.getAttribute('data-join-gender') === gJoin;
      b.classList.toggle('on', on);
      b.classList.toggle('is-male', b.getAttribute('data-join-gender') === 'male');
      b.classList.toggle('is-female', b.getAttribute('data-join-gender') === 'female');
    });

    var btn = $('#btnConfirmVerify');
    if (btn) {
      var ok = mode !== 'member' || !!(mem && mem.id);
      btn.disabled = !ok;
    }
  }
  function scrollConfirmCustCard() {
    var card = $('#confirmCustCard');
    var body = card && card.closest('.page-body');
    if (!card || !body) return;
    requestAnimationFrame(function () {
      try {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } catch (e) {
        var top = card.offsetTop - 12;
        body.scrollTop = Math.max(0, top);
      }
      /* 保证卡片底部（含展开内容）尽量进入可视区 */
      setTimeout(function () {
        var bodyRect = body.getBoundingClientRect();
        var cardRect = card.getBoundingClientRect();
        if (cardRect.bottom > bodyRect.bottom - 8) {
          body.scrollTop += (cardRect.bottom - bodyRect.bottom + 16);
        }
        if (cardRect.top < bodyRect.top + 8) {
          body.scrollTop -= (bodyRect.top + 8 - cardRect.top);
        }
      }, 60);
    });
  }
  function renderPickMemberIndex() {
    var idx = $('#pickMemberIndex');
    if (!idx) return;
    idx.innerHTML = PICK_INDEX_LETTERS.map(function (L) {
      return '<button type="button" data-pick-letter="' + L + '">' + L + '</button>';
    }).join('');
  }
  function renderPickMemberList() {
    var list = $('#pickMemberList');
    if (!list) return;
    renderPickMemberIndex();
    var members = allMembers().slice().sort(function (a, b) {
      return String(a.letter || '#').localeCompare(String(b.letter || '#')) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'zh');
    });
    var html = '';
    var last = '';
    members.forEach(function (m) {
      var L = m.letter || '#';
      if (L !== last) {
        html += '<div class="pick-member-h" id="pick-letter-' + L + '" data-letter="' + L + '">' + L + '</div>';
        last = L;
      }
      var av = m.avatar || (m.gender === 'male'
        ? 'assets/icons/avatar-male.png'
        : 'assets/icons/avatar-female.png');
      var vipHtml = m.vip
        ? '<span class="vip-wrap"><span>VIP</span></span>' +
          (m.cards ? '<span class="cnt">(' + m.cards + ')</span>' : '')
        : '';
      html +=
        '<button type="button" class="pick-member-row" data-member-id="' + m.id + '">' +
          '<img class="av" src="' + av + '" alt="" width="44" height="44">' +
          '<span class="info">' +
            '<span class="line1">' +
              '<span class="nm">' + m.name + '</span>' + vipHtml +
              '<span class="ph">' + (m.phone || '') + '</span>' +
            '</span>' +
            '<span class="sub">' + (m.last || '最近消费：未消费') + '</span>' +
          '</span>' +
        '</button>';
    });
    list.innerHTML = html || '<div class="pick-member-h">暂无会员</div>';
  }
  function jumpPickLetter(letter) {
    var el = document.getElementById('pick-letter-' + letter);
    var list = $('#pickMemberList');
    if (!el || !list) return;
    list.scrollTop = el.offsetTop - list.offsetTop;
  }
  function openPickMember() {
    renderPickMemberList();
    showScreen('pick-member');
  }
  function pickMemberById(id) {
    var m = allMembers().filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    session.selectedMember = {
      id: m.id,
      name: m.name,
      phone: m.phone || '',
      letter: m.letter || '#',
      vip: !!m.vip,
      gender: m.gender || 'female',
      avatar: m.avatar || ''
    };
    session.customerMode = 'member';
    showScreen('confirm');
    syncConfirmCustUI();
    toast('已选择：' + m.name);
  }
  function resetCustomerDraftForNewCoupon() {
    session.customerMode = 'guest';
    session.guestJoin = 'no';
    session.guestGender = 'male';
    session.joinGender = 'male';
    session.joinPhone = '';
    session.joinNick = '';
    session.selectedMember = null;
    session.lastCustomerLabel = '男散客';
    restoreJoinDraftToDom();
  }
  function resolveCustomerSnapshot() {
    if (session.customerMode === 'member') {
      if (!session.selectedMember || !session.selectedMember.id) {
        return { error: '请选择会员' };
      }
      return {
        kind: 'member',
        label: session.selectedMember.name,
        memberId: session.selectedMember.id,
        phone: session.selectedMember.phone || ''
      };
    }
    saveJoinDraftFromDom();
    if (session.guestJoin === 'yes') {
      var phone = String(session.joinPhone || '').trim();
      var nick = String(session.joinNick || '').trim();
      var gender = session.joinGender || 'male';
      if (phone && !/^1\d{10}$/.test(phone)) {
        return { error: '请输入 11 位手机号' };
      }
      if (phone || nick) {
        var displayName = nick
          ? resolveMemberDisplayName(nick, gender)
          : ('团购顾客' + pad2(session.tgCustomerSeq));
        if (!nick) session.tgCustomerSeq += 1;
        var mem = {
          id: 'm_tg_' + Date.now(),
          name: displayName,
          phone: phone,
          letter: '#',
          vip: false,
          cards: 0,
          gender: gender,
          avatar: gender === 'male' ? 'assets/icons/avatar-male.png' : 'assets/icons/avatar-female.png',
          last: '最近消费：未消费',
          from: 'verify-confirm'
        };
        session.registeredMembers.push(mem);
        DEMO_MEMBERS.push(mem);
        toast('已注册为会员：' + displayName);
        return {
          kind: 'member',
          label: displayName,
          memberId: mem.id,
          phone: phone,
          newlyRegistered: true
        };
      }
      return {
        kind: 'guest',
        label: (gender === 'female' ? '女' : '男') + '散客'
      };
    }
    var g = session.guestGender || 'male';
    return {
      kind: 'guest',
      label: (g === 'female' ? '女' : '男') + '散客'
    };
  }
  /* 结果页等头部平台标识：保留「抖音团购」/「美团团购」 */
  function platHeadLabel() { return isMeituan() ? '美团团购' : '抖音团购'; }
  function platAuthKey() { return isMeituan() ? 'authMeituan' : 'authDouyin'; }
  function platMapKey() { return isMeituan() ? 'mapMeituan' : 'mapDouyin'; }
  function currentAuth() { return session[platAuthKey()]; }
  function setCurrentAuth(v) { session[platAuthKey()] = v; }
  function storeAuthOk() { return currentAuth() === 'ok'; }
  function storeMapOk() { return !!session[platMapKey()]; }
  function currentBindCode() { return isMeituan() ? session.bindCodeMt : session.bindCodeDy; }
  function authScreenForPlat() { return 'auth-open'; }
  function platformReady(plat) {
    var p = plat || session.plat;
    if (window.AuthOpen && typeof AuthOpen.isPlatformReady === 'function') {
      return !!AuthOpen.isPlatformReady(p);
    }
    var key = (p === 'meituan' || p === 'mt') ? 'authMeituan' : 'authDouyin';
    var map = (p === 'meituan' || p === 'mt') ? 'mapMeituan' : 'mapDouyin';
    return normalizeAuthState(session[key]) === 'ok' && !!session[map];
  }
  function openAuthOpen(plat) {
    session.plat = (plat === 'meituan' || plat === 'mt') ? 'meituan' : 'douyin';
    syncPlatformChrome();
    if (window.AuthOpen) AuthOpen.open(session.plat === 'meituan' ? 'mt' : 'dy');
    showScreen('auth-open');
  }
  function refreshAuthDerivedUI() {
    if (window.AuthOpen && AuthOpen.syncSessionGate) AuthOpen.syncSessionGate();
    syncAcctAuthUI();
    syncTgSetCards();
    syncMapBars();
  }
  function defaultDealId() { return isMeituan() ? 'deal_910288' : 'product_882910'; }
  function defaultOrderId() { return isMeituan() ? 'MT202609031102' : '716829104455'; }
  function couponDemoKey(kind) {
    if (!isMeituan()) return kind;
    if (kind === 'default') return 'meituanDefault';
    if (kind === 'mismatch') return 'meituanMismatch';
    if (kind === 'multi') return 'meituanMulti';
    return kind;
  }
  function getCouponDemo(kind) {
    var demos = seed.couponDemos || {};
    var key = couponDemoKey(kind || 'default');
    return demos[key] || demos.default || {
      name: '深层补水护理 · 单次体验', price: 268, code: 'dy9182-ABCD-7781'
    };
  }

  /* L1 团购券目录：主表 + 按门店差异（D2b：各店券种不完全相同） */
  var DEAL_MASTER = {
    product_882910: { id: 'product_882910', name: '深层补水护理 · 单次体验', price: 268 },
    product_771204: { id: 'product_771204', name: '头皮护理套餐', price: 168 },
    product_660188: { id: 'product_660188', name: '时尚洗剪吹', price: 88 },
    product_tc_dy10: { id: 'product_tc_dy10', name: '深层补水护理 · 10次卡', price: 1980, couponKind: 'times', timesTotal: 10, timesUnitPrice: 198 },
    deal_910288: { id: 'deal_910288', name: '美甲修护套餐 · 单次', price: 128 },
    deal_910301: { id: 'deal_910301', name: '肩颈舒缓护理', price: 198 },
    deal_910455: { id: 'deal_910455', name: '洗剪吹基础套餐', price: 68 },
    deal_tc_mt5: { id: 'deal_tc_mt5', name: '肩颈舒缓护理 · 5次卡', price: 890, couponKind: 'times', timesTotal: 5, timesUnitPrice: 178 }
  };

  /* 门店 → 本店上架的 L1 id 列表（演示：中山路全量，人民路少 1，高新少 2） */
  var DEAL_IDS_BY_STORE = {
    douyin: {
      store_zs: ['product_882910', 'product_771204', 'product_660188', 'product_tc_dy10'],
      store_rm: ['product_882910', 'product_771204', 'product_tc_dy10'],
      store_gx: ['product_882910', 'product_tc_dy10']
    },
    meituan: {
      store_zs: ['deal_910288', 'deal_910301', 'deal_910455', 'deal_tc_mt5'],
      store_rm: ['deal_910288', 'deal_910301', 'deal_tc_mt5'],
      store_gx: ['deal_910288', 'deal_tc_mt5']
    }
  };

  function seedDemoDealDefaults() {
    session.dealDefaults = {
      store_zs: {
        product_882910: {
          matches: [{ id: 'p21', qty: 1 }, { id: 'p15', qty: 2 }],
          matchIds: ['p21', 'p15']
        },
        deal_910288: {
          matches: [{ id: 'p21', qty: 1 }],
          matchIds: ['p21']
        }
      },
      store_rm: {
        product_771204: {
          matches: [{ id: 'p15', qty: 1 }],
          matchIds: ['p15']
        },
        deal_910301: {
          matches: [{ id: 'p21', qty: 1 }, { id: 'p15', qty: 1 }],
          matchIds: ['p21', 'p15']
        }
      },
      store_gx: {}
    };
  }
  seedDemoDealDefaults();

  var TG_CHEV_SVG = '<img class="tg-coupon-card__chev" src="assets/icons/chevron-right-16.svg" alt="" width="16" height="16" aria-hidden="true">';
  var ICO_DY = 'assets/icons/douyin-logo.svg';
  var ICO_MT = 'assets/icons/meituan-logo.svg';

  function platKeyOf(plat) {
    return plat === 'meituan' || plat === 'mt' ? 'meituan' : 'douyin';
  }

  function boundStoresOf(plat) {
    var key = platKeyOf(plat);
    var fromSession = key === 'meituan' ? session.boundStoresMt : session.boundStoresDy;
    if (fromSession && fromSession.length) return fromSession.slice();
    if (window.AuthOpen && AuthOpen.getState) {
      var st = AuthOpen.getState();
      var ids = (key === 'meituan' ? st.mt : st.dy).stores || [];
      return ids.map(function (id) {
        return (AuthOpen.storeById && AuthOpen.storeById(id)) || { id: id, name: id };
      });
    }
    return [];
  }

  function ensureTgStoreId(plat) {
    var stores = boundStoresOf(plat);
    var ids = stores.map(function (s) { return s.id; });
    if (!session.tgStoreId || ids.indexOf(session.tgStoreId) < 0) {
      session.tgStoreId = ids[0] || session.loginStoreId || 'store_zs';
    }
    return session.tgStoreId;
  }

  function dealsOfStore(plat, storeId) {
    var pk = platKeyOf(plat);
    var ids = (DEAL_IDS_BY_STORE[pk] && DEAL_IDS_BY_STORE[pk][storeId]) || [];
    return ids.map(function (id) { return DEAL_MASTER[id]; }).filter(Boolean);
  }

  function boundDealCountSum(plat) {
    /* 已绑门店目录券数累加（同券多店各算 1） */
    var pk = platKeyOf(plat);
    var n = 0;
    var stores = boundStoresOf(pk);
    if (stores.length) {
      stores.forEach(function (st) {
        var ids = (DEAL_IDS_BY_STORE[pk] && DEAL_IDS_BY_STORE[pk][st.id]) || [];
        n += ids.length;
      });
      return n;
    }
    /* 无绑店时回落：全部门店目录累加（演示兜底） */
    Object.keys(DEAL_IDS_BY_STORE[pk] || {}).forEach(function (sid) {
      n += ((DEAL_IDS_BY_STORE[pk][sid] || []).length);
    });
    return n;
  }

  function uniqueDealCount(plat) {
    /* 兼容旧调用：团购设置「共 N 项」改为绑店累加 */
    return boundDealCountSum(plat);
  }

  function getDealDefault(storeId, dealId) {
    if (!dealId) return null;
    var bucket = session.dealDefaults && session.dealDefaults[storeId || session.tgStoreId || session.loginStoreId];
    return bucket && bucket[dealId] ? bucket[dealId] : null;
  }

  function setDealDefault(storeId, dealId, value) {
    session.dealDefaults = session.dealDefaults || {};
    var sid = storeId || session.tgStoreId || session.loginStoreId;
    if (!session.dealDefaults[sid]) session.dealDefaults[sid] = {};
    session.dealDefaults[sid][dealId] = value;
  }

  function syncLoginStoreChrome() {
    var name = session.loginStoreName || '悦颜美肌 · 中山路店';
    var home = $('#homeStoreBtn');
    if (home) {
      home.innerHTML = name + ' <span class="chev">▾</span>';
    }
    var resultStore = $('#resultStoreName');
    if (resultStore) resultStore.textContent = name;
  }

  function matchQtyOf(id) {
    var q = session.selectedMatchQty && session.selectedMatchQty[id];
    q = Number(q);
    return q >= 1 ? Math.min(99, Math.floor(q)) : 1;
  }

  function setMatchQty(id, qty) {
    session.selectedMatchQty = session.selectedMatchQty || {};
    var n = Number(qty);
    if (!(n >= 1)) n = 1;
    if (n > 99) n = 99;
    session.selectedMatchQty[id] = Math.floor(n);
  }

  function syncMatchIdsFromQty() {
    session.selectedMatchIds = Object.keys(session.selectedMatchQty || {}).filter(function (id) {
      return matchQtyOf(id) >= 1;
    });
  }

  function applyMatchesToSession(matches) {
    session.selectedMatchQty = {};
    session.selectedMatchIds = [];
    (matches || []).forEach(function (m) {
      var id = typeof m === 'string' ? m : m.id;
      if (!id) return;
      var qty = typeof m === 'string' ? 1 : (m.qty || 1);
      setMatchQty(id, qty);
      session.selectedMatchIds.push(id);
    });
    session.selectedProdId = session.selectedMatchIds[0] || null;
  }

  function collectMatchesFromSession() {
    return (session.selectedMatchIds || []).map(function (id) {
      return { id: id, qty: matchQtyOf(id) };
    });
  }

  function dealById(id) {
    return DEAL_MASTER[id] || null;
  }

  function isTimesDeal(deal) {
    return !!(deal && deal.couponKind === 'times');
  }

  function timesDealOf(plat) {
    var storeId = session.loginStoreId || session.tgStoreId || 'store_zs';
    var rows = dealsOfStore(plat, storeId);
    for (var i = 0; i < rows.length; i++) {
      if (isTimesDeal(rows[i])) return rows[i];
    }
    var pk = platKeyOf(plat);
    var allIds = [];
    Object.keys(DEAL_IDS_BY_STORE[pk] || {}).forEach(function (sid) {
      allIds = allIds.concat(DEAL_IDS_BY_STORE[pk][sid] || []);
    });
    for (var j = 0; j < allIds.length; j++) {
      var d = DEAL_MASTER[allIds[j]];
      if (isTimesDeal(d)) return d;
    }
    return null;
  }

  function isTimesScanKind(k) {
    return k === 'times' || k === 'times-dy' || k === 'times-mt';
  }

  function dealDefaultSummary(def) {
    if (!def) return '';
    var matches = def.matches;
    if (!matches || !matches.length) {
      matches = (def.matchIds || []).map(function (id) { return { id: id, qty: 1 }; });
    }
    var names = matches.map(function (m) {
      var p = prodById(m.id);
      if (!p) return '';
      var q = m.qty > 1 ? ('×' + m.qty) : '';
      return p.name + q;
    }).filter(Boolean);
    return names.join('、');
  }

  function tgCardCopy(state, plat) {
    if (state === 'ok') {
      var n = uniqueDealCount(plat);
      return { status: '共' + n + '项', cls: 'is-ok' };
    }
    if (state === 'pending') return { status: '等待审核', cls: 'is-pending' };
    if (state === 'expired') return { status: '授权已到期，去续期', cls: 'is-expired' };
    return { status: '去开通', cls: 'is-none' };
  }

  function syncTgSetCards() {
    [
      { plat: 'douyin', card: '#tgCardDy', st: '#tgCardDyStatus', key: 'authDouyin' },
      { plat: 'meituan', card: '#tgCardMt', st: '#tgCardMtStatus', key: 'authMeituan' }
    ].forEach(function (item) {
      var state = normalizeAuthState(session[item.key]);
      var copy = platformReady(item.plat)
        ? tgCardCopy('ok', item.plat)
        : tgCardCopy(state === 'expired' ? 'expired' : 'none', item.plat);
      var card = $(item.card);
      var st = $(item.st);
      if (st) st.textContent = copy.status;
      if (card) {
        card.classList.remove('is-ok', 'is-none', 'is-expired', 'is-pending');
        card.classList.add(copy.cls);
      }
    });
  }

  function openTgPlat(plat) {
    session.plat = plat === 'meituan' ? 'meituan' : 'douyin';
    syncPlatformChrome();
    if (!platformReady(session.plat)) {
      openAuthOpen(session.plat);
      return;
    }
    ensureTgStoreId(session.plat);
    showScreen('tg-deals');
  }

  /* 开通页「去设置团购券」：直达对应平台团购券列表，返回回开通页 */
  function openTgDealsFromAuth(plat) {
    session.plat = (plat === 'meituan' || plat === 'mt') ? 'meituan' : 'douyin';
    syncPlatformChrome();
    ensureTgStoreId(session.plat);
    if (historyStack[historyStack.length - 1] !== 'auth-open') {
      var i = historyStack.lastIndexOf('auth-open');
      if (i >= 0) historyStack = historyStack.slice(0, i + 1);
      else historyStack = ['home', 'account', 'auth-open'];
    }
    showScreen('tg-deals');
  }

  function escapeTgHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** TAB 文案：含「 · 」时按分隔符换行（品牌 / 店名），字号不缩小 */
  function storeTabLabelHtml(name) {
    var raw = String(name || '');
    var parts = raw.split(' · ');
    if (parts.length >= 2) {
      return '<span class="tg-tab-line">' + escapeTgHtml(parts[0]) + '</span>' +
        '<span class="tg-tab-line">' + escapeTgHtml(parts.slice(1).join(' · ')) + '</span>';
    }
    return '<span class="tg-tab-line">' + escapeTgHtml(raw) + '</span>';
  }

  function renderTgStoreTabs() {
    var wrap = $('#tgStoreTabs');
    if (!wrap) return;
    var plat = session.plat === 'meituan' ? 'meituan' : 'douyin';
    var stores = boundStoresOf(plat);
    var cur = ensureTgStoreId(plat);
    /* C2：仅 1 家绑定时隐藏 TAB */
    if (stores.length <= 1) {
      wrap.hidden = true;
      wrap.innerHTML = '';
      return;
    }
    wrap.hidden = false;
    wrap.innerHTML = stores.map(function (st) {
      var on = st.id === cur ? ' on' : '';
      return '<button type="button" class="plat-tab' + on + '" role="tab" aria-selected="' +
        (st.id === cur ? 'true' : 'false') + '" data-tg-store="' + escapeTgHtml(st.id) + '">' +
        storeTabLabelHtml(st.name) + '</button>';
    }).join('');
  }

  function renderTgDealList() {
    var plat = session.plat === 'meituan' ? 'meituan' : 'douyin';
    var title = $('#tgDealsTitle');
    if (title) title.textContent = plat === 'meituan' ? '美团团购券' : '抖音团购券';
    renderTgStoreTabs();
    var storeId = ensureTgStoreId(plat);
    var list = $('#tgDealList');
    var empty = $('#tgDealEmpty');
    var emptyTitle = $('#tgDealEmptyTitle');
    var emptyDesc = $('#tgDealEmptyDesc');
    var rows = dealsOfStore(plat, storeId);
    if (list) list.classList.add('tg-deal-list--cards');
    if (!rows.length) {
      if (list) { list.innerHTML = ''; list.hidden = true; }
      if (empty) empty.hidden = false;
      if (emptyTitle) emptyTitle.textContent = '暂无团购券';
      if (emptyDesc) {
        emptyDesc.textContent = '该门店暂无同步到的团购券。验券仍可凭顾客券码完成。';
      }
      return;
    }
    if (empty) empty.hidden = true;
    if (list) {
      list.hidden = false;
      list.innerHTML = rows.map(function (d) {
        var def = getDealDefault(storeId, d.id);
        var configured = def && ((def.matches && def.matches.length) || (def.matchIds && def.matchIds.length));
        var tag = configured ? '已配置' : '未配置';
        var summary = dealDefaultSummary(def);
        var logo = '<img class="tg-coupon-card__logo" src="' + (plat === 'meituan' ? ICO_MT : ICO_DY) + '" alt="" width="24" height="24">';
        var kindTag = isTimesDeal(d) ? '<span class="tg-coupon-card__kind">次卡</span>' : '';
        return '<button type="button" class="tg-coupon-card" data-tg-deal="' + d.id + '">' +
          '<span class="tg-coupon-card__body">' +
          '<span class="tg-coupon-card__row tg-coupon-card__row--main">' +
          logo +
          '<span class="tg-coupon-card__title">' +
          '<span class="tg-coupon-card__name">' + d.name + '</span>' + kindTag +
          '</span>' +
          '<span class="tg-coupon-card__price">¥' + d.price + '</span>' +
          '</span>' +
          '<span class="tg-coupon-card__divider" aria-hidden="true"></span>' +
          '<span class="tg-coupon-card__row tg-coupon-card__row--sub">' +
          '<span class="tg-coupon-card__tag' + (configured ? ' is-on' : '') + '">' + tag + '</span>' +
          '<span class="tg-coupon-card__summary' + (summary ? '' : ' is-empty') + '">' + summary + '</span>' +
          '</span>' +
          '</span>' +
          TG_CHEV_SVG +
          '</button>';
      }).join('');
    }
  }

  function loadTgConfigDraft(deal) {
    session.tgEditDealId = deal.id;
    session.couponName = deal.name;
    session.couponPrice = deal.price;
    session.dealId = deal.id;
    var def = getDealDefault(session.tgStoreId || session.loginStoreId, deal.id);
    if (def && ((def.matches && def.matches.length) || (def.matchIds && def.matchIds.length))) {
      var matches = def.matches && def.matches.length
        ? def.matches
        : (def.matchIds || []).map(function (id) { return { id: id, qty: 1 }; });
      applyMatchesToSession(matches);
      session.mismatched = false;
    } else {
      applyMatchesToSession([]);
      session.mismatched = true;
    }
    /* 默认配置不再预填业绩归属；核销确认页仍可选手动选择 */
    session.selectedEmpIds = [];
    session.selectedEmpId = null;
    session.staffRoles = {};
    session.staffDesignated = {};
  }

  function matchLineHtml(it) {
    var qty = matchQtyOf(it.id);
    var kind = it.kind === 'product' ? '产品' : '项目';
    var qtyTxt = qty > 1 ? (' · ×' + qty) : '';
    return '<div class="match-item-line">' +
      '<span class="nm">' + it.name + (qty > 1 ? (' ×' + qty) : '') + '</span>' +
      '<span class="sub">' + kind + ' · 门店价 ¥' + it.price + qtyTxt + '</span>' +
      '</div>';
  }

  function syncTgConfigUI() {
    var deal = dealById(session.tgEditDealId) || { name: session.couponName, price: session.couponPrice };
    var times = isTimesDeal(deal);
    var nameEl = $('#tgConfigName');
    var face = $('#tgConfigFace');
    var faceLabel = $('#tgConfigFaceLabel');
    var head = $('#tgConfigPlatHead');
    var kindEl = $('#tgConfigKindTag');
    var timesTotalRow = $('#tgConfigTimesTotalRow');
    var timesUnitRow = $('#tgConfigTimesUnitRow');
    var timesTotalEl = $('#tgConfigTimesTotal');
    var timesUnitEl = $('#tgConfigTimesUnit');

    if (nameEl) nameEl.textContent = deal.name || '';
    if (face) face.textContent = '¥' + Number(deal.price || session.couponPrice || 0);
    if (faceLabel) faceLabel.textContent = times ? '售价' : '面额';
    var matchLabel = $('#tgConfigMatchLabel');
    if (matchLabel) matchLabel.textContent = times ? '单次核销' : '核销项目';
    if (kindEl) kindEl.hidden = !times;
    if (head) {
      var label = times ? '次卡' : '团购券';
      head.innerHTML = isMeituan()
        ? '<img src="' + ICO_MT + '" alt="" width="24" height="24"><span>' + label + '</span>'
        : '<img src="' + ICO_DY + '" alt="" width="24" height="24"><span>' + label + '</span>';
    }
    if (timesTotalRow) timesTotalRow.hidden = !times;
    if (timesUnitRow) timesUnitRow.hidden = !times;
    if (times && timesTotalEl) timesTotalEl.textContent = (deal.timesTotal || 0) + ' 次';
    if (times && timesUnitEl) {
      var unit = deal.timesUnitPrice != null
        ? Number(deal.timesUnitPrice)
        : (deal.timesTotal ? Math.round((Number(deal.price) / Number(deal.timesTotal)) * 100) / 100 : 0);
      timesUnitEl.textContent = '¥' + unit;
    }

    var ids = session.selectedMatchIds && session.selectedMatchIds.length
      ? session.selectedMatchIds
      : (session.selectedProdId ? [session.selectedProdId] : []);
    var items = ids.map(prodById).filter(Boolean);
    var pickCta = $('#btnTgPickMatch');
    var mHead = $('#tgConfigMatchHead');
    var itemsEl = $('#tgConfigMatchItems');
    var ratio = $('#tgConfigMatchRatio');
    var matchRow = $('#tgConfigMatchRow');

    if (!items.length) {
      if (pickCta) pickCta.hidden = false;
      if (mHead) mHead.hidden = true;
      if (itemsEl) itemsEl.innerHTML = '';
      if (ratio) ratio.hidden = true;
    } else {
      if (pickCta) pickCta.hidden = true;
      if (mHead) mHead.hidden = false;
      if (itemsEl) itemsEl.innerHTML = items.map(matchLineHtml).join('');
      if (ratio) ratio.hidden = items.length < 2;
    }
    if (matchRow) {
      matchRow.classList.toggle('is-multi', items.length > 1);
      matchRow.classList.toggle('is-single', items.length === 1);
    }
  }

  function saveTgConfig() {
    var id = session.tgEditDealId;
    if (!id) return;
    var matches = collectMatchesFromSession();
    setDealDefault(session.tgStoreId || session.loginStoreId, id, {
      matches: matches,
      matchIds: matches.map(function (m) { return m.id; })
    });
    toast('已保存默认配置');
    showScreen('tg-deals');
  }

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
  function applyMemoryForCoupon(name) {
    var mem = session.matchMemory && session.matchMemory[name];
    if (mem && mem.length) {
      applyMatchesToSession(mem.map(function (m) {
        return { id: m.id, qty: m.qty || 1 };
      }));
      session.mismatched = false;
      return true;
    }
    return false;
  }
  /* 预填优先级：当前登录门店的团购设置默认值（匹配项+数量）> 会话记忆 > 空；业绩归属不预填 */
  function resolveCouponMatch(name, dealId) {
    var storeId = session.loginStoreId || session.tgStoreId;
    var def = getDealDefault(storeId, dealId);
    if (def && ((def.matches && def.matches.length) || (def.matchIds && def.matchIds.length))) {
      var matches = def.matches && def.matches.length
        ? def.matches
        : (def.matchIds || []).map(function (id) { return { id: id, qty: 1 }; });
      applyMatchesToSession(matches);
      session.mismatched = false;
      return;
    }
    if (!applyMemoryForCoupon(name)) {
      applyMatchesToSession([]);
      session.mismatched = true;
    }
  }
  function isCouponMatched() {
    if (session.mismatched) return false;
    if (session.selectedMatchIds && session.selectedMatchIds.length) return true;
    return !!session.selectedProdId;
  }
  function syncMatchStatusTags() {
    /* 验券流程不再展示「已匹配 / 未匹配」标签；匹配能力仍由 mismatched / selectedMatchIds 驱动 */
  }

  function showUnsupportedCoupon(kind) {
    var title = $('#unsupportedCouponTitle');
    var desc = $('#unsupportedCouponDesc');
    if (kind === 'voucher') {
      if (title) title.textContent = '暂不支持核销代金券';
      if (desc) desc.textContent = '当前只能核销团购套餐券与次卡，请换一张团购券再试。';
    } else {
      if (title) title.textContent = '暂不支持核销';
      if (desc) desc.textContent = '当前只能核销团购套餐券与次卡，请换一张团购券再试。';
    }
    openMask('unsupportedCouponMask');
  }

  function isTimesCoupon() {
    return session.couponKind === 'times';
  }

  function timesUnitPrice() {
    if (session.timesUnitPrice > 0) return Number(session.timesUnitPrice);
    var total = Number(session.timesTotal || 0);
    var face = Number(session.couponPrice || 0);
    if (total > 0 && face > 0) return Math.round((face / total) * 100) / 100;
    return face;
  }

  function timesBillAmount() {
    var use = Math.max(1, Number(session.timesUse || 1));
    return Math.round(timesUnitPrice() * use * 100) / 100;
  }

  function clampTimesUse() {
    var left = Math.max(0, Number(session.timesLeft || 0));
    var use = Math.max(1, Number(session.timesUse || 1));
    if (left < 1) use = 1;
    else if (use > left) use = left;
    session.timesUse = use;
    return use;
  }

  function syncTimesRows() {
    var show = isTimesCoupon();
    var left = Number(session.timesLeft || 0);
    var total = Number(session.timesTotal || 0);
    var leftText = left + ' 次';
    var totalText = total + ' 次';
    ['#resultTimesRow', '#confirmTimesRow', '#resultTimesTotalRow', '#confirmTimesTotalRow', '#confirmTimesUseRow'].forEach(function (sel) {
      var row = $(sel);
      if (row) row.hidden = !show;
    });
    var rt = $('#resultTimesTotal');
    var ct = $('#confirmTimesTotal');
    var rl = $('#resultTimesLeft');
    var cl = $('#confirmTimesLeft');
    if (rt) rt.textContent = totalText;
    if (ct) ct.textContent = totalText;
    if (rl) rl.textContent = leftText;
    if (cl) cl.textContent = leftText;

    if (show) clampTimesUse();
    var useEl = $('#confirmTimesUse');
    if (useEl) useEl.textContent = String(session.timesUse || 1);

    var mtTip = $('#confirmMtTimesTip');
    if (mtTip) {
      mtTip.hidden = !(show && isMeituan() && Number(session.timesUse || 1) > 1);
    }

    var faceLabel = $('#confirmFaceLabel');
    if (faceLabel) faceLabel.textContent = show ? '单次结算价' : '面额';
  }

  function applyTimesCouponDemo(plat) {
    var p = plat === 'meituan' ? 'meituan' : 'douyin';
    session.plat = p;
    var deal = timesDealOf(p);
    if (!deal) {
      toast('当前平台暂无次卡目录');
      return;
    }
    session.couponKind = 'times';
    session.dealId = deal.id;
    session.timesTotal = Number(deal.timesTotal || 0);
    session.timesLeft = Number(deal.timesTotal || 0);
    session.timesUse = 1;
    session.timesUnitPrice = deal.timesUnitPrice != null
      ? Number(deal.timesUnitPrice)
      : (deal.timesTotal ? Math.round((Number(deal.price) / Number(deal.timesTotal)) * 100) / 100 : 0);
    var code = (p === 'meituan' ? 'mt' : 'dy') + 'TC-' + String(deal.id).slice(-6).toUpperCase();
    applyCouponToResult(deal.name, deal.price, code, null, true);
    syncTimesRows();
    syncConfirmUI();
  }

  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 1600);
  }

  function setNav(flow) {
    var highlight = flow;
    if (flow === 'auth-open') {
      highlight = session.plat === 'meituan' ? 'owner-auth-mt' : 'owner-auth';
    }
    $all('.site-nav .nav-item').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-flow') === highlight);
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
    if (id && PRD_MASK_ANCHOR[id]) syncPrdPanel(PRD_MASK_ANCHOR[id]);
  }

  function syncPrdPanel(anchor) {
    if (!anchor) return;
    var titleEl = $('#prdPaneTitle');
    if (titleEl) titleEl.textContent = PRD_TITLE[anchor] || anchor;
    var frame = $('#prdFrame');
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: 'prd-goto', anchor: anchor }, '*');
    } catch (err) { /* ignore */ }
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

  function flashScanOk(msg, sub) {
    var fb = $('#scanFeedback');
    if (!fb) return;
    var t = fb.querySelector('.ff-t');
    var s = fb.querySelector('.ff-s');
    if (t) t.textContent = msg || '识别成功';
    if (s) s.textContent = sub || '';
    fb.classList.add('open');
    setTimeout(function () { fb.classList.remove('open'); }, 700);
  }

  function dyGrantScopeText() {
    var scopes = session.dyGrantScopes && session.dyGrantScopes.length
      ? session.dyGrantScopes
      : ['store', 'verify', 'reconcile'];
    return scopes.map(function (k) { return DY_GRANT_PERM_LABEL[k] || k; }).join('、');
  }

  function syncDyAuthGrantUI() {
    var st = normalizeAuthState(session.authDouyin);
    var panelForm = $('#dyGrantPanelForm');
    var panelPending = $('#dyGrantPanelPending');
    var panelOk = $('#dyGrantPanelOk');
    var footForm = $('#dyGrantFooterForm');
    var footBack = $('#dyGrantFooterBack');
    var isForm = st === 'none' || st === 'expired';
    var isPending = st === 'pending';
    var isOk = st === 'ok';
    if (panelForm) panelForm.hidden = !isForm;
    if (panelPending) panelPending.hidden = !isPending;
    if (panelOk) panelOk.hidden = !isOk;
    if (footForm) footForm.hidden = !isForm;
    if (footBack) footBack.hidden = isForm;
    var scopeTxt = dyGrantScopeText();
    var pendingScope = $('#dyGrantPendingScope');
    var okScope = $('#dyGrantOkScope');
    if (pendingScope) pendingScope.textContent = scopeTxt;
    if (okScope) okScope.textContent = scopeTxt;
    var okExpire = $('#dyGrantOkExpire');
    if (okExpire) okExpire.textContent = (AUTH_UI.ok && AUTH_UI.ok.expire) || '2027-03-01';
    var okMapped = $('#dyGrantOkMapped');
    if (okMapped) okMapped.textContent = session.mapDouyin ? '是' : '否';
    if (isForm) {
      $all('#dyGrantPerms .dy-grant-perm:not(.is-locked)').forEach(function (b) {
        b.classList.remove('is-on');
        b.setAttribute('aria-pressed', 'false');
      });
    }
  }

  function collectDyGrantScopes() {
    var scopes = [];
    $all('#dyGrantPerms .dy-grant-perm.is-on').forEach(function (b) {
      var key = b.getAttribute('data-perm');
      if (key) scopes.push(key);
    });
    return scopes.length ? scopes : ['store', 'verify', 'reconcile'];
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

  function syncAcctAuthUI() {
    [
      { plat: 'douyin', key: 'authDouyin', st: '#acctAuthDySt' },
      { plat: 'meituan', key: 'authMeituan', st: '#acctAuthMtSt' }
    ].forEach(function (item) {
      var state = normalizeAuthState(session[item.key]);
      session[item.key] = state;
      var row = platformReady(item.plat)
        ? AUTH_ROW.ok
        : (state === 'expired' ? AUTH_ROW.expired : AUTH_ROW.none);
      var el = $(item.st);
      if (!el) return;
      el.textContent = row.label;
      el.className = 'acct-plat-st ' + row.cls;
    });
  }

  function syncMapBars() {
    $all('#mapDyBar button').forEach(function (b) {
      var on = (b.getAttribute('data-map') === 'ok') === !!session.mapDouyin;
      b.classList.toggle('on', on);
    });
    $all('#mapMtBar button').forEach(function (b) {
      var on = (b.getAttribute('data-map') === 'ok') === !!session.mapMeituan;
      b.classList.toggle('on', on);
    });
  }

  function syncAuthBindUI() {
    var dyMap = $('#authDyMapped');
    var mtMap = $('#authMtMapped');
    if (dyMap) dyMap.textContent = session.mapDouyin ? '是' : '否';
    if (mtMap) mtMap.textContent = session.mapMeituan ? '是' : '否';
    var dyCode = $('#authDyBindCode');
    var dyRow = $('#authDyBindRow');
    if (dyCode) dyCode.textContent = session.bindCodeDy;
    if (dyRow) dyRow.setAttribute('data-copy', session.bindCodeDy);
    var mtCode = $('#authMtBindCode');
    var mtRow = $('#authMtBindRow');
    if (mtCode) mtCode.textContent = session.bindCodeMt;
    if (mtRow) mtRow.setAttribute('data-copy', session.bindCodeMt);
    syncMapBars();
  }

  function openAuthNeedMask(plat) {
    pendingAuthPlat = plat === 'meituan' ? 'meituan' : 'douyin';
    var name = pendingAuthPlat === 'meituan' ? '美团' : '抖音';
    var authKey = pendingAuthPlat === 'meituan' ? 'authMeituan' : 'authDouyin';
    var st = normalizeAuthState(session[authKey]);
    var title = $('#authNeedTitle');
    var desc = $('#authNeedDesc');
    var go = $('#btnAuthNeedGo');
    if (st === 'expired') {
      if (title) title.textContent = name + '团购授权已到期';
      if (desc) desc.textContent = '当前门店' + name + '授权已到期，暂时无法验券核销。请先完成续期后再试。';
      if (go) go.textContent = '去续期';
    } else {
      if (title) title.textContent = '尚未开通' + name + '团购核销';
      if (desc) desc.textContent = '当前门店尚未完成' + name + '开通（认证+授权+门店绑定），暂时无法验券核销。请先完成开通后再试。';
      if (go) go.textContent = '去开通';
    }
    openMask('authNeedMask');
  }

  function openMapNeedMask(plat) {
    pendingAuthPlat = plat === 'meituan' ? 'meituan' : 'douyin';
    var name = pendingAuthPlat === 'meituan' ? '美团' : '抖音';
    var title = $('#mapNeedTitle');
    var desc = $('#mapNeedDesc');
    if (title) title.textContent = '请完善门店绑定';
    if (desc) {
      desc.textContent = name + '已授权，但尚未绑定门店，暂时无法验券。请完成门店绑定后再试。';
    }
    openMask('mapNeedMask');
  }

  function simulateAuthCallback(plat) {
    if (plat === 'meituan') {
      session.authMeituan = 'ok';
      session.mapMeituan = true;
      applyAuthMtUI();
      toast('已模拟汇付回调：美团已授权并绑定本店');
    } else {
      session.authDouyin = 'ok';
      session.mapDouyin = true;
      applyAuthUI();
      toast('已模拟授权回调：抖音已授权并绑定本店');
    }
  }

  function openException(flow) {
    var maskId = EXCEPTION_MASK[flow];
    if (!maskId) return false;
    if (flow === 'fail') setFail($('#failSwitch .on') ? $('#failSwitch .on').getAttribute('data-fail') : 'invalid');
    if (flow === 'verify-fail') setVerifyFail($('#verifyFailSwitch .on') ? $('#verifyFailSwitch .on').getAttribute('data-vfail') : 'invalid');
    openMask(maskId);
    setNav(flow);
    syncPrdPanel(PRD_ANCHOR[flow] || flow);
    return true;
  }

  function gateOnAction() {
    if (!session.rolePerm) {
      openException('tpl-noperm');
      return false;
    }
    if (!platformReady(session.plat)) {
      if (window.AuthOpen && AuthOpen.getState) {
        var st = AuthOpen.getState();
        var p = session.plat === 'meituan' ? st.mt : st.dy;
        if (st.merchantStatus === 'approved' && p.auth && !p.expired && !(p.bind && p.stores && p.stores.length)) {
          openMapNeedMask(session.plat);
          return false;
        }
      } else if (storeAuthOk() && !storeMapOk()) {
        openMapNeedMask(session.plat);
        return false;
      }
      openAuthNeedMask(session.plat);
      return false;
    }
    return true;
  }

  /* 无权限：进核销链路前即拦（扫码/输码/结果/确认/成功等入口） */
  function gateConsumeEntry() {
    if (!session.rolePerm) {
      openException('tpl-noperm');
      return false;
    }
    return true;
  }

  function applyAuthUI() {
    session.authDouyin = normalizeAuthState(session.authDouyin);
    var ui = AUTH_UI[session.authDouyin] || AUTH_UI.ok;
    $all('#authStateBar button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-auth') === session.authDouyin);
    });
    var tag = $('#authStatusTag');
    if (tag) tag.innerHTML = '<span class="tag ' + ui.tag + '">' + ui.label + '</span>';
    var exp = $('#authExpire');
    if (exp) exp.textContent = ui.expire;
    syncAcctAuthUI();
    syncAuthBindUI();
    syncTgSetCards();
  }

  function applyAuthMtUI() {
    session.authMeituan = normalizeAuthState(session.authMeituan);
    var ui = AUTH_UI[session.authMeituan] || AUTH_UI.ok;
    $all('#authMtStateBar button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-auth') === session.authMeituan);
    });
    var tag = $('#authMtStatusTag');
    if (tag) tag.innerHTML = '<span class="tag ' + ui.tag + '">' + ui.label + '</span>';
    var exp = $('#authMtExpire');
    if (exp) exp.textContent = ui.expire;
    syncAcctAuthUI();
    syncAuthBindUI();
    syncTgSetCards();
  }

  function syncPlatformChrome() {
    var head = $('#resultPlatHead');
    if (head) {
      var img = head.querySelector('img');
      var span = head.querySelector('span');
      if (img) {
        img.src = isMeituan() ? ICO_MT : ICO_DY;
        img.width = 16;
        img.height = 16;
      }
      if (span) span.textContent = platHeadLabel();
    }
    var cHead = $('#confirmPlatHead');
    if (cHead) {
      var ci = cHead.querySelector('img');
      if (ci) {
        ci.src = isMeituan() ? ICO_MT : ICO_DY;
        ci.width = 16;
        ci.height = 16;
      }
    }
    var rt = $('#resultPlatTag');
    if (rt) rt.innerHTML = isMeituan() ? mtBadgeHtml() : '<span class="tag tag-plat-dy">抖音</span>';
    var pay = $('#confirmPayWay');
    if (pay) pay.textContent = platPayLabel();
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
      openException('tpl-noperm');
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

  function mtBadgeHtml() {
    return '<span class="tag tag-plat-mt tag--ico">' +
      '<img class="tag-mt-ico" src="assets/icons/meituan-tag.svg" alt="美团">' +
      '</span>';
  }

  function syncScanPlatForDemo() {
    if (scanKind === 'douyin' || scanKind === 'meituan') {
      session.plat = scanKind;
      syncPlatformChrome();
    }
  }

  /* 扫码自动识别：douyin/meituan → 团购主流程；times → 次卡主流程；coupon → 线上系统券示意；voucher → 不支持 */
  function scanCouponAuto(kind) {
    if (kind === 'coupon') {
      flashScanOk('识别成功', '系统优惠券');
      setTimeout(function () { showScreen('coupon-ph'); }, 750);
      return;
    }
    if (kind === 'voucher') {
      flashScanOk('识别成功', '代金券');
      setTimeout(function () { showUnsupportedCoupon('voucher'); }, 750);
      return;
    }
    if (isTimesScanKind(kind)) {
      var timesPlat = kind === 'times-mt' ? 'meituan' : 'douyin';
      if (kind === 'times') {
        timesPlat = session.plat === 'meituan' ? 'meituan' : 'douyin';
      }
      session.plat = timesPlat;
      syncPlatformChrome();
      flashScanOk('识别成功', timesPlat === 'meituan' ? '美团次卡' : '抖音次卡');
      setTimeout(function () {
        applyTimesCouponDemo(timesPlat);
        withLoading('正在验券…', 700, function () {
          showScreen('result');
        });
      }, 750);
      return;
    }
    session.plat = kind;
    session.couponKind = 'groupbuy';
    session.timesTotal = 0;
    session.timesLeft = 0;
    session.timesUse = 1;
    session.timesUnitPrice = 0;
    syncPlatformChrome();
    runScanDemo('matched');
  }

  function syncScanCouponUI() {
    $all('#scanCouponBar [data-scan-coupon]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-scan-coupon') === scanKind);
    });
    var isGroupbuy = scanKind === 'douyin' || scanKind === 'meituan' || isTimesScanKind(scanKind);
    $all('#scanScenarioBar [data-demo-scan]').forEach(function (b) {
      var k = b.getAttribute('data-demo-scan');
      var platOnly = k === 'matched' || k === 'mismatch' || k === 'multi';
      b.disabled = !isGroupbuy && platOnly;
    });
  }

  function runScanDemo(kind) {
    if (kind === 'ok' || kind === 'matched') {
      if (scanKind === 'coupon' || scanKind === 'voucher') {
        scanCouponAuto(scanKind);
        return;
      }
      if (isTimesScanKind(scanKind)) {
        scanCouponAuto(scanKind);
        return;
      }
      syncScanPlatForDemo();
      session.couponKind = 'groupbuy';
      session.timesLeft = 0;
      var demo = getCouponDemo('default');
      session.matchMemory[demo.name] = [
        { id: 'p21', kind: 'project', name: '深层补水护理', price: 268 }
      ];
      startVerify({ fromScan: true, name: demo.name, price: demo.price, code: demo.code });
    } else if (kind === 'dup') {
      if (scanKind === 'voucher') {
        scanCouponAuto(scanKind);
        return;
      }
      startVerify({ dup: true, fromScan: true });
    } else if (kind === 'mismatch') {
      if (scanKind === 'coupon' || scanKind === 'voucher') {
        scanCouponAuto(scanKind);
        return;
      }
      if (isTimesScanKind(scanKind)) {
        scanCouponAuto(scanKind);
        return;
      }
      syncScanPlatForDemo();
      session.couponKind = 'groupbuy';
      startVerify({ mismatch: true, fromScan: true });
    } else if (kind === 'multi') {
      if (scanKind === 'coupon' || scanKind === 'voucher') {
        scanCouponAuto(scanKind);
        return;
      }
      if (isTimesScanKind(scanKind)) {
        scanCouponAuto(scanKind);
        return;
      }
      syncScanPlatForDemo();
      session.couponKind = 'groupbuy';
      startVerify({ multi: true, fromScan: true });
    } else {
      if (scanKind === 'voucher') {
        scanCouponAuto(scanKind);
        return;
      }
      reinforceScanFail();
    }
  }

  function syncConfirmUI() {
    var empBtn = $('#confirmEmpBtn');
    if (empBtn) {
      var empText = matchStaff ? matchStaff.empSummaryText() : (staffName() || '未选');
      var hasEmp = empText !== '未选';
      empBtn.textContent = empText + ' ▸';
      empBtn.classList.toggle('is-empty', !hasEmp);
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

    if (face) {
      if (isTimesCoupon()) face.textContent = '¥' + timesUnitPrice();
      else face.textContent = '¥' + Number(session.couponPrice);
    }
    if (codeEl) codeEl.textContent = maskCode(session.couponCode);
    if (cpr) {
      if (isTimesCoupon()) cpr.textContent = '¥' + timesBillAmount().toFixed(2);
      else cpr.textContent = '¥' + Number(session.couponPrice).toFixed(2);
    }

    if (!items.length) {
      if (pickCta) pickCta.hidden = false;
      if (head) head.hidden = true;
      if (itemsEl) itemsEl.innerHTML = '';
      if (ratio) ratio.hidden = true;
      if (tip) tip.hidden = false;
    } else {
      if (pickCta) pickCta.hidden = true;
      if (head) head.hidden = false;
      if (itemsEl) itemsEl.innerHTML = items.map(matchLineHtml).join('');
      if (ratio) ratio.hidden = items.length < 2;
      if (tip) tip.hidden = true;
    }

    var matchRow = $('#confirmMatchRow');
    if (matchRow) {
      matchRow.classList.toggle('is-multi', items.length > 1);
      matchRow.classList.toggle('is-single', items.length === 1);
    }
    var matchLabel = $('#confirmMatchLabel');
    if (matchLabel) matchLabel.textContent = isTimesCoupon() ? '单次核销' : '核销项目';

    var couponNameEl = $('#confirmCouponName');
    if (couponNameEl) couponNameEl.textContent = session.couponName || '';
    var pay = $('#confirmPayWay');
    if (pay) pay.textContent = platPayLabel();
    syncMatchStatusTags();
    syncTimesRows();

    var so = $('#successOp');
    if (so) so.textContent = session.opName || '顾清扬';
    var cfgScreen = $('#screen-tg-config');
    if (cfgScreen && cfgScreen.classList.contains('active')) syncTgConfigUI();
    syncConfirmCustUI();
  }

  function applyCouponToResult(name, price, code, prodId, mismatched) {
    session.couponName = name;
    session.couponPrice = price;
    session.couponCode = code;
    if (session.couponKind !== 'times') {
      session.couponKind = 'groupbuy';
      session.timesTotal = 0;
      session.timesLeft = 0;
      session.timesUse = 1;
      session.timesUnitPrice = 0;
    } else {
      clampTimesUse();
    }
    session.orderId = defaultOrderId();
    if (!(session.couponKind === 'times' && session.dealId)) {
      session.dealId = defaultDealId();
    }
    session.orderType = '快捷开单';
    session.payType = '团购';
    resetCustomerDraftForNewCoupon();
    if (mismatched) {
      resolveCouponMatch(name, session.dealId);
    } else if (Array.isArray(prodId)) {
      applyMatchesToSession(prodId.map(function (id) { return { id: id, qty: 1 }; }));
      session.mismatched = false;
    } else if (prodId) {
      applyMatchesToSession([{ id: prodId, qty: 1 }]);
      session.mismatched = false;
      resolveCouponMatch(name, session.dealId);
      if (!session.selectedMatchIds.length) {
        applyMatchesToSession([{ id: prodId, qty: 1 }]);
        session.mismatched = false;
      }
    } else {
      resolveCouponMatch(name, session.dealId);
    }
    var rn = $('#resultProdName');
    var rp = $('#resultPrice');
    var rc = $('#resultCode');
    var ro = $('#resultOid');
    if (rn) rn.textContent = name;
    if (rp) rp.textContent = String(price);
    if (rc) rc.textContent = maskCode(code);
    if (ro) ro.textContent = session.orderId;
    var face = $('#confirmFace');
    var codeEl = $('#confirmCode');
    var co = $('#confirmOid');
    if (face) face.textContent = '¥' + price;
    if (codeEl) codeEl.textContent = maskCode(code);
    if (co) co.textContent = session.orderId;
    var soid = $('#successOid');
    var soidr = $('#successOidRow');
    if (soid) soid.textContent = session.orderId;
    if (soidr) soidr.setAttribute('data-copy', session.orderId);
    syncConfirmUI();
  }

  function maskCode(code) {
    if (!code || code.length < 8) return code;
    return code.slice(0, 2) + '********' + code.slice(-4);
  }

  function showScreen(flow, push) {
    if (EXCEPTION_MASK[flow]) {
      openException(flow);
      return;
    }
    var map = {
      home: 'screen-home',
      workbench: 'screen-workbench',
      'order-flow': 'screen-order-flow',
      account: 'screen-account',
      'tg-set': 'screen-tg-set',
      'tg-deals': 'screen-tg-deals',
      'tg-config': 'screen-tg-config',
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
      'auth-open': 'screen-auth-open',
      'owner-auth': 'screen-auth-open',
      'owner-auth-mt': 'screen-auth-open',
      'dy-auth-grant': 'screen-auth-open',
      'match-pick': 'screen-match-pick',
      'pick-member': 'screen-pick-member',
      'coupon-ph': 'screen-coupon-ph'
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
    if (flow === 'confirm') {
      syncConfirmUI();
      syncConfirmCustUI();
    }
    if (flow === 'pick-member') renderPickMemberList();
    if (flow === 'owner-auth' || flow === 'owner-auth-mt' || flow === 'auth-open' || flow === 'dy-auth-grant') {
      if (window.AuthOpen) {
        var openPlat = (flow === 'owner-auth-mt' || session.plat === 'meituan') ? 'mt' : 'dy';
        if (flow === 'owner-auth') openPlat = 'dy';
        if (flow === 'owner-auth-mt') openPlat = 'mt';
        AuthOpen.open(openPlat);
      }
    }
    var statusBar = document.querySelector('#frame .status-bar');
    if (statusBar) {
      statusBar.classList.remove('status-bar--auth-warm');
    }
    if (flow === 'account') {
      syncAcctAuthUI();
      syncAuthBindUI();
    }
    if (flow === 'tg-set') syncTgSetCards();
    if (flow === 'tg-deals') renderTgDealList();
    if (flow === 'tg-config') syncTgConfigUI();
    if (flow === 'result' || flow === 'confirm') syncTimesRows();
    if (flow === 'scan' || flow === 'result' || flow === 'confirm' || flow === 'input') syncPlatformChrome();
    if (flow !== 'scan') {
      var entry = $('#scanInputEntry');
      if (entry) entry.classList.remove('pulse');
    }
    closeMasks();
    syncPrdPanel(PRD_ANCHOR[flow] || flow);
  }

  function goBack() {
    if (historyStack.length > 1) {
      historyStack.pop();
      showScreen(historyStack[historyStack.length - 1] || 'home', false);
      return;
    }
    var cur = historyStack[historyStack.length - 1];
    var parent = BACK_PARENT[cur];
    if (parent) {
      historyStack = initialStackFor(parent);
      showScreen(parent, false);
      return;
    }
    showScreen(historyStack[0] || 'home', false);
  }

  /* 按逻辑父级链生成初始历史栈；无父级定义的页面保持单页栈（原行为） */
  function initialStackFor(flow) {
    if (!BACK_PARENT[flow]) return [flow];
    var chain = [];
    var cur = flow;
    var guard = 0;
    while (cur && guard++ < 10) {
      chain.unshift(cur);
      cur = BACK_PARENT[cur];
    }
    if (chain[0] !== 'home') chain.unshift('home');
    return chain;
  }

  /* 统一入口：按页面逻辑父级初始化历史栈 */
  function seedHistoryFor(flow) {
    historyStack = initialStackFor(flow);
  }

  function tryEnterScan() {
    if (!gateConsumeEntry()) return;
    if (session.camDenied) {
      openException('cam-denied');
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
      openException('tpl-offline');
      return;
    }
    withLoading(opts.loadingText || '正在验券…', 900, function () {
      if (opts.dup) {
        openMask('dupMask');
        return;
      }
      if (opts.vfail) {
        setVerifyFail(opts.vfail);
        openException('verify-fail');
        return;
      }
      if (opts.mismatch) {
        var mm = getCouponDemo('mismatch');
        session.dealId = defaultDealId();
        applyMatchesToSession([]);
        session.mismatched = true;
        session.couponName = mm.name;
        session.couponPrice = mm.price;
        session.couponCode = mm.code;
        session.orderId = defaultOrderId();
        applyCouponToResult(mm.name, mm.price, mm.code, null, true);
        /* 演示强制未匹配：清空设置预填 */
        applyMatchesToSession([]);
        session.mismatched = true;
        syncConfirmUI();
        flashScanOk();
        setTimeout(function () { showScreen('result'); }, 500);
        return;
      }
      if (opts.multi) {
        var md = getCouponDemo('multi');
        /* 预写入会话记忆，模拟此前手工多选匹配 */
        session.matchMemory[md.name] = [
          { id: 'p21', kind: 'project', name: '深层补水护理', price: 268, qty: 1 },
          { id: 'p15', kind: 'project', name: '头皮护理', price: 168, qty: 1 }
        ];
        applyCouponToResult(md.name, md.price, md.code, null, true);
        flashScanOk();
        setTimeout(function () { showScreen('result'); }, 500);
        return;
      }
      var demo = getCouponDemo('default');
      var name = opts.name || demo.name;
      var price = opts.price != null ? opts.price : demo.price;
      var code = opts.code || demo.code;
      applyCouponToResult(name, price, code, null, true);
      if (opts.fromScan) flashScanOk();
      setTimeout(function () { showScreen('result'); }, opts.fromScan ? 500 : 0);
    });
  }

  function syncSuccessCard() {
    var bill = isTimesCoupon() ? timesBillAmount() : Number(session.couponPrice || 0);
    session.lastBillAmount = bill;
    var nameEl = $('#successProdName');
    var priceEl = $('#successPrice');
    var codeEl = $('#successCode');
    var codeRow = $('#successCodeRow');
    if (nameEl) nameEl.textContent = session.couponName || '';
    if (priceEl) priceEl.textContent = String(bill);
    if (codeEl) codeEl.textContent = session.couponCode || '';
    if (codeRow) codeRow.setAttribute('data-copy', session.couponCode || '');

    var useRow = $('#successTimesUseRow');
    var leftRow = $('#successTimesLeftRow');
    var useEl = $('#successTimesUse');
    var leftEl = $('#successTimesLeft');
    var show = isTimesCoupon();
    if (useRow) useRow.hidden = !show;
    if (leftRow) leftRow.hidden = !show;
    if (useEl) useEl.textContent = (session.timesUse || 1) + ' 次';
    if (leftEl) leftEl.textContent = (session.timesLeft || 0) + ' 次';

    var custEl = $('#successCustomer');
    if (custEl) custEl.textContent = session.lastCustomerLabel || '男散客';
    var so = $('#successOp');
    if (so) so.textContent = session.opName || '顾清扬';
  }

  function pushVerifyOrder(consumedTimes, customerSnap) {
    var bill = isTimesCoupon() ? timesBillAmount() : Number(session.couponPrice || 0);
    var now = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    var time = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
      ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
    var plat = session.plat || 'douyin';
    var order = {
      id: 'o' + Date.now(),
      plat: plat,
      couponName: session.couponName || '团购核销',
      name: orderDetailNameFromSession(),
      customer: (customerSnap && customerSnap.label) || session.lastCustomerLabel || '男散客',
      price: bill,
      code: session.couponCode || '',
      oid: session.orderId || defaultOrderId(),
      dealId: session.dealId || defaultDealId(),
      time: time,
      op: session.opName || '顾清扬',
      bill: 'SO' + String(Date.now()).slice(-11),
      status: 'ok',
      canRevoke: true,
      revokeHint: '剩余 59 分钟可撤销',
      couponKind: session.couponKind || 'groupbuy',
      timesConsumed: consumedTimes || 0,
      timesRestored: false,
      orderType: session.orderType || '快捷开单',
      payType: session.payType || '团购'
    };
    ORDERS.unshift(order);
    return order;
  }

  function startConsume() {
    if (!gateOnAction()) return;
    if (session.offline) {
      openException('tpl-offline');
      return;
    }
    if (session.customerMode === 'member' && !(session.selectedMember && session.selectedMember.id)) {
      toast('请选择会员');
      syncConfirmCustUI();
      return;
    }
    var snap = resolveCustomerSnapshot();
    if (snap.error) {
      toast(snap.error);
      return;
    }
    session.lastCustomerLabel = snap.label;
    if (isTimesCoupon()) {
      var need = clampTimesUse();
      if (need > Number(session.timesLeft || 0)) {
        var desc = $('#timesInsufficientDesc');
        if (desc) {
          desc.textContent = '本次核销 ' + need + ' 次，剩余仅 ' + (session.timesLeft || 0) + ' 次。请减少本次核销次数后再试。';
        }
        openMask('timesInsufficientMask');
        return;
      }
    }
    withLoading('正在核销…', 1000, function () {
      var consumed = 0;
      if (isTimesCoupon()) {
        consumed = clampTimesUse();
        session.timesLeft = Math.max(0, Number(session.timesLeft || 0) - consumed);
        syncTimesRows();
      }
      pushVerifyOrder(consumed, snap);
      syncSuccessCard();
      showScreen('success');
    });
  }

  function renderOrders() {
    var list = $('#orderListDouyin');
    var empty = $('#orderListEmpty');
    var onTab = $('.plat-tab.on', $('#orderTabs'));
    var plat = onTab ? onTab.getAttribute('data-order-plat') : 'douyin';

    if (plat === 'coupon') {
      list.hidden = true;
      empty.hidden = false;
      return;
    }

    var rows = ORDERS.filter(function (o) {
      if ((o.plat || 'douyin') !== plat) return false;
      /* 核销明细不展示已退款（status=refund）；造数可保留供详情深链 */
      if (o.status === 'refund') return false;
      if (filterState.status === 'ok' && o.status !== 'ok') return false;
      if (filterState.status === 'revoked' && o.status !== 'revoked') return false;
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
          ? '<span class="tag tag-refund">已退款</span>'
          : '<span class="tag tag-ok">已核销</span>';
      var platTag = (o.plat === 'meituan')
        ? mtBadgeHtml()
        : '<span class="tag tag-plat-dy">抖音</span>';
      return (
        '<button type="button" class="order-card" data-order-id="' + o.id + '">' +
          '<div class="row1"><div class="name">' + orderListTitle(o) + '</div><div class="amt">¥' + o.price + '</div></div>' +
          '<div class="meta">' + o.time + ' · ' + o.op +
            (o.customer ? (' · ' + o.customer) : '') + '</div>' +
          '<div class="tags">' + platTag + st + '</div>' +
        '</button>'
      );
    }).join('');
  }

  function openDetail(id) {
    var o = ORDERS.filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    currentOrder = o;
    $('#detailName').textContent = o.name || '快捷开单';
    $('#detailPrice').textContent = o.price;
    var statusHtml =
      o.status === 'revoked' ? '<span class="tag tag-rev">已撤销</span>'
        : o.status === 'refund' ? '<span class="tag tag-refund">已退款</span>'
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
    var dc = $('#detailCustomer');
    if (dc) dc.textContent = o.customer || '—';
    $('#detailBill').textContent = o.bill;
    $('#detailRevokeHint').textContent = o.revokeHint;
    var cs = $('#detailCsGuide');
    /* Figma S8b 不展示客服卡；控件保留供后续演示扩展 */
    if (cs) cs.hidden = true;
    var btn = $('#btnRevoke');
    if (o.status === 'refund' || o.status === 'revoked') {
      btn.disabled = true;
      btn.textContent = o.status === 'refund' ? '已退款' : '已撤销';
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

  function proceedSuccessAction(action) {
    if (action === 'continue') {
      showScreen('scan');
      return;
    }
    showScreen('home');
  }

  function finishSuccess() {
    proceedSuccessAction('done');
  }

  function isFlowActive(flow) {
    var maskId = EXCEPTION_MASK[flow];
    if (maskId) {
      var m = document.getElementById(maskId);
      return !!(m && m.classList.contains('open'));
    }
    return false;
  }

  function ensureFlowThen(flow, fn) {
    if (EXCEPTION_MASK[flow]) {
      openException(flow);
      setTimeout(fn, 80);
      return;
    }
    if (isFlowActive(flow)) {
      fn();
      return;
    }
    showScreen(flow);
    setTimeout(fn, 80);
  }

  function setFail(type) {
    var f = FAIL_MAP[type] || FAIL_MAP.invalid;
    var title = $('#failTitle');
    var desc = $('#failDesc');
    var action = $('#failAction');
    if (title) title.textContent = f.title;
    if (desc) desc.textContent = f.desc;
    if (action) action.textContent = f.action;
    $all('#failSwitch button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-fail') === type);
    });
    var primary = $('#failPrimaryBtn');
    if (primary) {
      primary.setAttribute('data-ex-go', f.primary);
      primary.textContent = f.primary === 'orders' ? '查看订单'
        : f.primary === 'tg-set' ? '去团购设置'
        : f.primary === 'confirm' ? '重试核销'
        : f.primary === 'input' ? '手动输码'
        : '重新扫码';
    }
  }

  function setVerifyFail(type) {
    var f = VFAIL_MAP[type] || VFAIL_MAP.invalid;
    var title = $('#vfailTitle');
    var desc = $('#vfailDesc');
    if (title) title.textContent = f.title;
    if (desc) desc.textContent = f.desc;
    $all('#verifyFailSwitch button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-vfail') === type);
    });
    var primary = $('#vfailMask .ok');
    if (primary) {
      if (type === 'used') {
        primary.setAttribute('data-ex-go', 'orders');
        primary.textContent = '查看订单';
      } else {
        primary.setAttribute('data-ex-go', 'scan');
        primary.textContent = '重新扫码';
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
    if (plat === 'douyin' || plat === 'meituan') {
      session.plat = plat;
      syncPlatformChrome();
    }
  }

  function setOrderPlat(plat) {
    $all('#orderTabs .plat-tab').forEach(function (t) {
      t.classList.toggle('on', t.getAttribute('data-order-plat') === plat);
    });
    if (plat === 'douyin' || plat === 'meituan') {
      session.plat = plat;
      syncPlatformChrome();
    }
    renderOrders();
  }

  function openEmpPicker(from) {
    if (!matchStaff) return;
    var title = $('#empMaskTitle');
    if (title) {
      title.textContent = from === 'tg-config' ? '选择归属员工' : '选择服务员工';
    }
    matchStaff.syncStaffFromSession();
    var root = $('#empPickRoot');
    matchStaff.renderStaffInto(root);
    openMask('empMask');
  }

  function openProdPicker() {
    if (!matchStaff) return;
    matchStaff.openMatchPick('confirm');
  }

  // events
  document.addEventListener('focusin', function (e) {
    if (e.target.closest && e.target.closest('#confirmCustCard')) {
      scrollConfirmCustCard();
    }
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-flow]');
    if (t && t.classList.contains('nav-item')) {
      var navFlow = t.getAttribute('data-flow');
      if (CONSUME_ENTRY[navFlow] && !session.rolePerm) {
        openException('tpl-noperm');
        return;
      }
      if (EXCEPTION_MASK[navFlow]) {
        openException(navFlow);
        return;
      }
      if (navFlow === 'owner-auth' || navFlow === 'owner-auth-mt') {
        session.plat = navFlow === 'owner-auth-mt' ? 'meituan' : 'douyin';
        syncPlatformChrome();
        if (window.AuthOpen) AuthOpen.open(session.plat === 'meituan' ? 'mt' : 'dy');
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
        return;
      }
      seedHistoryFor(navFlow);
      showScreen(navFlow, false);
      return;
    }

    var go = e.target.closest('[data-go]');
    if (go) {
      var target = go.getAttribute('data-go');
      if (target === 'scan') {
        var successActive = $('#screen-success') && $('#screen-success').classList.contains('active');
        if (successActive) {
          proceedSuccessAction('continue');
          return;
        }
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

    if (e.target.closest('#homeScanBtn') || e.target.closest('#homeVerifyBtn')) {
      tryEnterScan();
      return;
    }

    if (e.target.closest('#homeMoreBtn') || e.target.closest('#homeTabWorkbench')) {
      showScreen('workbench');
      return;
    }

    var homeTab = e.target.closest('[data-home-tab]');
    if (homeTab && homeTab.closest('#screen-home')) {
      var ht = homeTab.getAttribute('data-home-tab');
      if (ht === 'home') return;
      if (ht === 'workbench') {
        showScreen('workbench');
        return;
      }
      toast('演示未接入');
      return;
    }

    var wbTile = e.target.closest('[data-wb]');
    if (wbTile && wbTile.closest('#screen-workbench')) {
      var wbKey = wbTile.getAttribute('data-wb');
      if (wbKey === 'tuangou-set') {
        showScreen('tg-set');
        return;
      }
      if (wbKey === 'flow') {
        showScreen('order-flow');
        return;
      }
      toast('演示未接入');
      return;
    }

    var ofTab = e.target.closest('[data-of-tab]');
    if (ofTab && ofTab.closest('#screen-order-flow')) {
      $all('#screen-order-flow .of-tab').forEach(function (b) {
        b.classList.toggle('on', b === ofTab);
      });
      if (ofTab.getAttribute('data-of-tab') === 'void') {
        toast('示意：撤销后开单在此查看（作废）');
      }
      return;
    }

    if (e.target.closest('#btnOrderFlowFilter')) {
      toast('示意：筛选');
      return;
    }

    var tgPlat = e.target.closest('[data-tg-plat]');
    if (tgPlat) {
      openTgPlat(tgPlat.getAttribute('data-tg-plat'));
      return;
    }

    var tgStoreTab = e.target.closest('[data-tg-store]');
    if (tgStoreTab) {
      session.tgStoreId = tgStoreTab.getAttribute('data-tg-store');
      renderTgDealList();
      return;
    }

    var tgDeal = e.target.closest('[data-tg-deal]');
    if (tgDeal) {
      var deal = dealById(tgDeal.getAttribute('data-tg-deal'));
      if (!deal) return;
      loadTgConfigDraft(deal);
      showScreen('tg-config');
      return;
    }

    if (e.target.closest('#btnTgPickMatch') || e.target.closest('#tgConfigMatchEdit')) {
      if (!matchStaff) return;
      matchStaff.openMatchPick('tg-config');
      return;
    }

    if (e.target.closest('#btnTgConfigSave')) {
      saveTgConfig();
      return;
    }

    if (e.target.closest('#btnTgConfigCancel')) {
      goBack();
      return;
    }

    var wbTab = e.target.closest('[data-wb-tab]');
    if (wbTab && wbTab.closest('#screen-workbench')) {
      var wt = wbTab.getAttribute('data-wb-tab');
      if (wt === 'home') {
        showScreen('home');
        return;
      }
      if (wt === 'workbench') return;
      toast('演示未接入');
      return;
    }

    if (e.target.closest('#homeStoreBtn')) {
      showScreen('account');
      return;
    }

    var authEntry = e.target.closest('[data-auth-entry]');
    if (authEntry) {
      openAuthOpen(authEntry.getAttribute('data-auth-entry'));
      return;
    }

    if (e.target.closest('#btnAuthNeedGo')) {
      closeMasks();
      openAuthOpen(pendingAuthPlat || session.plat);
      return;
    }

    if (e.target.closest('#btnMapNeedGo')) {
      closeMasks();
      openAuthOpen(pendingAuthPlat || session.plat);
      return;
    }

    if (e.target.closest('#btnNopermAuth')) {
      closeMasks();
      showScreen('tg-set');
      return;
    }

    var aoDemo = e.target.closest('#aoStateBar [data-ao-demo]');
    if (aoDemo) {
      var demoType = aoDemo.getAttribute('data-ao-demo');
      $all('#aoStateBar button').forEach(function (b) {
        b.classList.toggle('on', b === aoDemo);
      });
      if (window.AuthOpen) {
        AuthOpen.setDemoState(demoType);
        refreshAuthDerivedUI();
        if (demoType !== 'fallback') {
          openAuthOpen(session.plat);
        } else {
          session.plat = session.plat === 'meituan' ? 'meituan' : 'douyin';
          historyStack = ['account', 'auth-open'];
          showScreen('auth-open', false);
        }
        toast('演示开通态：' + demoType);
      }
      return;
    }

    if (e.target.closest('#btnAcctLogout')) {
      toast('演示：退出登录（示意）');
      return;
    }

    var exGo = e.target.closest('[data-ex-go]');
    if (exGo) {
      var exTarget = exGo.getAttribute('data-ex-go');
      closeMasks();
      if (exTarget === 'scan') {
        tryEnterScan();
        return;
      }
      if (exTarget === 'input' && !gateConsumeEntry()) return;
      if (exTarget === 'confirm' && !gateOnAction()) return;
      showScreen(exTarget);
      return;
    }

    var couponChip = e.target.closest('#scanCouponBar [data-scan-coupon]');
    if (couponChip) {
      var ckind = couponChip.getAttribute('data-scan-coupon');
      scanKind = ckind;
      syncScanCouponUI();
      if (ckind === 'douyin' || ckind === 'meituan') {
        setInputPlat(ckind);
      }
      ensureScanThen(function () { scanCouponAuto(ckind); });
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
      toast(session.rolePerm ? '演示：收银开单权限已开启' : '演示：收银开单权限已关闭');
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
      closeMasks();
      toast('已切换为联网');
      return;
    }

    if (e.target.closest('#btnOpenSettings')) {
      closeMasks();
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
      setInputPlat(p);
      return;
    }

    if (e.target.closest('#btnVerifyNow') || e.target.closest('#btnVerifyNowMt')) {
      var fromMt = !!e.target.closest('#btnVerifyNowMt');
      if (fromMt) session.plat = 'meituan';
      else session.plat = 'douyin';
      syncPlatformChrome();
      var inputEl = fromMt ? $('#codeInputMt') : $('#codeInput');
      var val = ((inputEl && inputEl.value) || '').trim();
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
      var demoNow = getCouponDemo('default');
      startVerify({ code: val, name: demoNow.name, price: demoNow.price });
      return;
    }

    if (e.target.closest('#btnConfirmVerify')) {
      if ($('#btnConfirmVerify') && $('#btnConfirmVerify').disabled) return;
      startConsume();
      return;
    }

    if (e.target.closest('#btnPickMember') || e.target.closest('#btnReselectMember')) {
      openPickMember();
      return;
    }
    if (e.target.closest('#btnPickMemberBack')) {
      goBack();
      return;
    }
    var memRow = e.target.closest('#pickMemberList [data-member-id]');
    if (memRow) {
      pickMemberById(memRow.getAttribute('data-member-id'));
      return;
    }
    var custModeBtn = e.target.closest('#custModeSeg [data-cust-mode]');
    if (custModeBtn) {
      saveJoinDraftFromDom();
      session.customerMode = custModeBtn.getAttribute('data-cust-mode') === 'member' ? 'member' : 'guest';
      syncConfirmCustUI();
      scrollConfirmCustCard();
      return;
    }
    var custJoinBtn = e.target.closest('#custJoinSeg [data-cust-join]');
    if (custJoinBtn) {
      saveJoinDraftFromDom();
      session.guestJoin = custJoinBtn.getAttribute('data-cust-join') === 'yes' ? 'yes' : 'no';
      syncConfirmCustUI();
      scrollConfirmCustCard();
      return;
    }
    var guestGenderBtn = e.target.closest('#custGuestGender [data-guest-gender]');
    if (guestGenderBtn) {
      session.guestGender = guestGenderBtn.getAttribute('data-guest-gender') === 'female' ? 'female' : 'male';
      syncConfirmCustUI();
      scrollConfirmCustCard();
      return;
    }
    var joinGenderBtn = e.target.closest('#custJoinGender [data-join-gender]');
    if (joinGenderBtn) {
      session.joinGender = joinGenderBtn.getAttribute('data-join-gender') === 'female' ? 'female' : 'male';
      syncConfirmCustUI();
      scrollConfirmCustCard();
      return;
    }
    if (e.target.closest('#confirmCustCard')) {
      /* 点卡片内其它控件（输入框等）也滚到完整可见 */
      if (e.target.closest('input, button, .cust-seg, .gender-seg, .cust-pick-cta, .cust-reselect')) {
        scrollConfirmCustCard();
      }
    }
    var pickLetter = e.target.closest('#pickMemberIndex [data-pick-letter]');
    if (pickLetter) {
      jumpPickLetter(pickLetter.getAttribute('data-pick-letter'));
      return;
    }

    if (e.target.closest('#btnTimesUsePlus')) {
      if (!isTimesCoupon()) return;
      session.timesUse = Math.min(Number(session.timesLeft || 0), Number(session.timesUse || 1) + 1);
      if (session.timesUse < 1) session.timesUse = 1;
      syncTimesRows();
      syncConfirmUI();
      return;
    }

    if (e.target.closest('#btnTimesUseMinus')) {
      if (!isTimesCoupon()) return;
      session.timesUse = Math.max(1, Number(session.timesUse || 1) - 1);
      syncTimesRows();
      syncConfirmUI();
      return;
    }

    if (e.target.closest('#btnSuccessDone')) {
      finishSuccess();
      return;
    }

    if (e.target.closest('#confirmEmpBtn')) {
      openEmpPicker();
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
      toast('已选择：' + (staffName() || '已选择'));
      return;
    }

    var prodItem = e.target.closest('#prodPickList [data-prod-id]');
    if (prodItem) {
      session.selectedProdId = prodItem.getAttribute('data-prod-id');
      applyMatchesToSession([{ id: session.selectedProdId, qty: 1 }]);
      session.mismatched = false;
      closeMasks();
      syncConfirmUI();
      toast('已选核销项目');
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

    var authBtn = e.target.closest('#authStateBar [data-auth], #authMtStateBar [data-auth]');
    if (authBtn) {
      var authPlat = authBtn.getAttribute('data-auth-plat') || 'douyin';
      var authVal = normalizeAuthState(authBtn.getAttribute('data-auth'));
      if (authPlat === 'meituan') {
        session.authMeituan = authVal === 'pending' ? 'none' : authVal;
      } else {
        session.authDouyin = authVal;
        if (authVal === 'ok') session.mapDouyin = true;
        if (authVal === 'pending' || authVal === 'none') session.mapDouyin = false;
      }
      applyAuthUI();
      applyAuthMtUI();
      syncAuthBindUI();
      if (document.getElementById('screen-dy-auth-grant') &&
          document.getElementById('screen-dy-auth-grant').classList.contains('active')) {
        syncDyAuthGrantUI();
      }
      toast((authPlat === 'meituan' ? '美团' : '抖音') + '授权状态：' + (AUTH_UI[authVal] || AUTH_UI.none).label);
      return;
    }

    var mapBtn = e.target.closest('#mapDyBar [data-map], #mapMtBar [data-map]');
    if (mapBtn) {
      var mapPlat = mapBtn.getAttribute('data-map-plat') || 'douyin';
      var mapped = mapBtn.getAttribute('data-map') === 'ok';
      if (mapPlat === 'meituan') session.mapMeituan = mapped;
      else session.mapDouyin = mapped;
      syncAuthBindUI();
      toast((mapPlat === 'meituan' ? '美团' : '抖音') + '门店映射：' + (mapped ? '已绑定' : '未绑定'));
      return;
    }

    if (e.target.closest('#btnDySettle')) {
      window.open(
        'https://welcome.dylk.com/h5/growth/dispatch?channel_id=dylk_promote_gongzhonghao%3Fsource%3Dwechat_laikeassistant_merchant_entrance',
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }
    if (e.target.closest('#btnDyOpenGrant')) {
      showScreen('dy-auth-grant');
      return;
    }
    var grantPerm = e.target.closest('#dyGrantPerms .dy-grant-perm');
    if (grantPerm) {
      if (grantPerm.classList.contains('is-locked')) return;
      var on = grantPerm.classList.toggle('is-on');
      grantPerm.setAttribute('aria-pressed', on ? 'true' : 'false');
      return;
    }
    if (e.target.closest('#btnDyGrantAgree')) {
      session.dyGrantScopes = collectDyGrantScopes();
      session.authDouyin = 'pending';
      session.mapDouyin = false;
      applyAuthUI();
      syncAuthBindUI();
      toast('已提交，等待审核');
      showScreen('owner-auth');
      return;
    }
    if (e.target.closest('#btnDyGrantBack')) {
      showScreen('owner-auth');
      return;
    }
    if (e.target.closest('#btnDyRefreshAuth')) {
      if (normalizeAuthState(session.authDouyin) === 'pending') {
        applyAuthUI();
        toast('仍在等待审核');
        return;
      }
      simulateAuthCallback('douyin');
      return;
    }
    if (e.target.closest('#btnMtSettle')) {
      toast('演示：跳转美团商家入驻（外链）');
      return;
    }
    if (e.target.closest('#btnMtHuifu')) {
      toast('演示：打开汇付天下商户/ISV 后台（外链）');
      return;
    }
    if (e.target.closest('#btnMtRefreshAuth')) {
      simulateAuthCallback('meituan');
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
      setOrderPlat(orderPlat.getAttribute('data-order-plat'));
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
      var restored = 0;
      if (currentOrder) {
        currentOrder.status = 'revoked';
        currentOrder.canRevoke = false;
        currentOrder.revokeHint = '已撤销';
        if (currentOrder.couponKind === 'times' && currentOrder.timesConsumed > 0 && !currentOrder.timesRestored) {
          restored = Number(currentOrder.timesConsumed) || 0;
          currentOrder.timesRestored = true;
          if (session.couponCode === currentOrder.code && session.couponKind === 'times') {
            session.timesLeft = Number(session.timesLeft || 0) + restored;
            syncTimesRows();
          }
        }
      }
      var revokeDesc = $('#revokeOkDesc');
      if (revokeDesc) {
        revokeDesc.textContent = restored > 0
          ? ('对应开单已冲销，已恢复次卡 ' + restored + ' 次；员工业绩已回滚，撤销流水已保留。订单流水对应开单作废。')
          : '对应开单已冲销，员工业绩已回滚，撤销流水已保留。订单流水对应开单作废。';
      }
      closeMasks();
      withLoading('正在撤销…', 700, function () {
        showScreen('revoke-ok');
        if (restored > 0) toast('已恢复 ' + restored + ' 次');
      });
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
    staffName: staffName,
    isTimesDealId: function (id) { return isTimesDeal(dealById(id)); }
  });
  matchStaff.bindEvents();

  setFail('invalid');
  setVerifyFail('invalid');
  setInputPlat('douyin');
  applyAuthUI();
  applyAuthMtUI();
  syncDemoGateUI();
  syncScanCouponUI();
  syncPlatformChrome();
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
      'cam-denied': function () { showScreen('home', false); historyStack = ['home']; openException('cam-denied'); },
      'tpl-offline': function () { showScreen('home', false); historyStack = ['home']; openException('tpl-offline'); },
      'tpl-timeout': function () { showScreen('home', false); historyStack = ['home']; openException('tpl-timeout'); },
      'tpl-noperm': function () { showScreen('home', false); historyStack = ['home']; openException('tpl-noperm'); },
      'verify-fail': function () {
        setVerifyFail('invalid');
        showScreen('home', false); historyStack = ['home'];
        openException('verify-fail');
      },
      fail: function () {
        setFail('invalid');
        showScreen('home', false); historyStack = ['home'];
        openException('fail');
      },
      account: function () { showScreen('account', false); historyStack = ['account']; },
      workbench: function () { showScreen('workbench', false); historyStack = ['workbench']; },
      'owner-auth': function () {
        if (window.AuthOpen) AuthOpen.setDemoState('complete');
        openAuthOpen('douyin');
        historyStack = ['account', 'auth-open'];
      },
      'owner-auth-mt': function () {
        if (window.AuthOpen) AuthOpen.setDemoState('complete');
        openAuthOpen('meituan');
        historyStack = ['account', 'auth-open'];
      },
      'auth-open': function () {
        if (window.AuthOpen) AuthOpen.setDemoState('complete');
        openAuthOpen(session.plat);
        historyStack = ['account', 'auth-open'];
      },
      'ao-dy-progress': function () {
        session.plat = 'douyin';
        if (window.AuthOpen) { AuthOpen.open('dy'); AuthOpen.setDemoState('merchant'); }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'ao-dy-done': function () {
        session.plat = 'douyin';
        if (window.AuthOpen) { AuthOpen.open('dy'); AuthOpen.setDemoState('complete'); }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'ao-mt-progress': function () {
        session.plat = 'meituan';
        if (window.AuthOpen) { AuthOpen.open('mt'); AuthOpen.setDemoState('merchant'); }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'ao-mt-done': function () {
        session.plat = 'meituan';
        if (window.AuthOpen) { AuthOpen.open('mt'); AuthOpen.setDemoState('complete'); }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'ao-cert': function () {
        /* Figma「AO-店铺认证」= 主态 0/3（去认证），非独立表单页 */
        session.plat = 'douyin';
        if (window.AuthOpen) {
          AuthOpen.open('dy');
          AuthOpen.setDemoState('initial');
        }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'ao-fallback': function () {
        session.plat = 'douyin';
        if (window.AuthOpen) { AuthOpen.open('dy'); AuthOpen.setDemoState('fallback'); }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'ao-mt-login': function () {
        session.plat = 'meituan';
        if (window.AuthOpen) {
          AuthOpen.open('mt');
          AuthOpen.setDemoState('merchant');
          AuthOpen.showAo('ao-mt-login');
        }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'ao-mt-grant': function () {
        session.plat = 'meituan';
        if (window.AuthOpen) {
          AuthOpen.open('mt');
          AuthOpen.setDemoState('merchant');
          AuthOpen.showAo('ao-mt-grant');
        }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'ao-dy-login': function () {
        session.plat = 'douyin';
        if (window.AuthOpen) {
          AuthOpen.open('dy');
          AuthOpen.setDemoState('merchant');
          AuthOpen.showAo('ao-dy-login');
        }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'ao-dy-grant': function () {
        session.plat = 'douyin';
        if (window.AuthOpen) {
          AuthOpen.open('dy');
          AuthOpen.setDemoState('merchant');
          AuthOpen.showAo('ao-dy-permission');
        }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'ao-bind-sheet': function () {
        session.plat = 'douyin';
        if (window.AuthOpen) {
          AuthOpen.open('dy');
          AuthOpen.setDemoState('auth');
          AuthOpen.openBind();
        }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'ao-cancel-dialog': function () {
        session.plat = 'douyin';
        if (window.AuthOpen) {
          AuthOpen.open('dy');
          AuthOpen.setDemoState('complete');
          AuthOpen.cancelAuthorization();
        }
        historyStack = ['account', 'auth-open'];
        showScreen('auth-open', false);
      },
      'tg-set': function () {
        session.authDouyin = 'ok';
        session.authMeituan = 'ok';
        session.mapDouyin = true;
        session.mapMeituan = true;
        syncTgSetCards();
        showScreen('tg-set', false); seedHistoryFor('tg-set');
      },
      'tg-deals-dy': function () {
        session.plat = 'douyin';
        session.authDouyin = 'ok';
        session.mapDouyin = true;
        session.tgStoreId = 'store_zs';
        seedDemoDealDefaults();
        if (window.AuthOpen) AuthOpen.syncSessionGate();
        syncPlatformChrome();
        showScreen('tg-deals', false); seedHistoryFor('tg-deals');
      },
      'tg-deals-mt': function () {
        session.plat = 'meituan';
        session.authMeituan = 'ok';
        session.mapMeituan = true;
        session.tgStoreId = 'store_zs';
        seedDemoDealDefaults();
        if (window.AuthOpen) AuthOpen.syncSessionGate();
        syncPlatformChrome();
        showScreen('tg-deals', false); seedHistoryFor('tg-deals');
      },
      'tg-config-dy': function () {
        session.plat = 'douyin';
        session.authDouyin = 'ok';
        session.mapDouyin = true;
        session.tgStoreId = 'store_zs';
        seedDemoDealDefaults();
        if (window.AuthOpen) AuthOpen.syncSessionGate();
        syncPlatformChrome();
        var deal = dealById('product_882910');
        if (deal) loadTgConfigDraft(deal);
        showScreen('tg-config', false); seedHistoryFor('tg-config');
      },
      'tg-config-mt': function () {
        session.plat = 'meituan';
        session.authMeituan = 'ok';
        session.mapMeituan = true;
        session.tgStoreId = 'store_zs';
        seedDemoDealDefaults();
        if (window.AuthOpen) AuthOpen.syncSessionGate();
        syncPlatformChrome();
        var deal = dealById('deal_910288');
        if (deal) {
          setDealDefault('store_zs', 'deal_910288', {
            matches: [{ id: 'p21', qty: 1 }, { id: 'p15', qty: 1 }],
            matchIds: ['p21', 'p15']
          });
          loadTgConfigDraft(deal);
        }
        showScreen('tg-config', false); seedHistoryFor('tg-config');
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

  if (window.AuthOpen) {
    AuthOpen.init({
      session: session,
      showScreen: showScreen,
      goBack: goBack,
      toast: toast,
      openTgDealsFromAuth: openTgDealsFromAuth,
      onAuthOpenChange: function () {
        syncAcctAuthUI();
        syncTgSetCards();
        syncMapBars();
        syncLoginStoreChrome();
        if (document.querySelector('#screen-tg-deals.active')) renderTgDealList();
      }
    });
    AuthOpen.syncSessionGate();
  }
  refreshAuthDerivedUI();
  syncLoginStoreChrome();

  if (new URLSearchParams(location.search).get('capture')) {
    applyFigmaCapture();
  } else {
    var deepFlow = new URLSearchParams(location.search).get('flow');
    if (deepFlow === 'owner-auth' || deepFlow === 'owner-auth-mt' || deepFlow === 'dy-auth-grant') {
      openAuthOpen(deepFlow === 'owner-auth-mt' ? 'meituan' : 'douyin');
      historyStack = ['account', 'auth-open'];
    } else if (deepFlow && deepFlow !== 'home') {
      seedHistoryFor(deepFlow);
      showScreen(deepFlow, false);
    } else {
      showScreen('home', false);
      historyStack = ['home'];
    }
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
