/* 核销：开单式员工选择 + 全屏价目多选匹配 */
(function (g) {
  'use strict';

  var STAFF_ROLE_OPTS = [
    { id: 'senior', label: '大工' },
    { id: 'mid', label: '中工' },
    { id: 'junior', label: '小工' }
  ];
  var STAFF_ROLE_PICK_ORDER = ['junior', 'mid', 'senior'];
  var STAFF_ROLE_DEFAULT = 'senior';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function DyMatchStaff(api) {
    this.api = api;
    this.staffRow = { id: '__verify__', staffIds: [], staffRoles: {}, staffDesignated: {} };
    this.staffCardEdit = null;
    this.pickType = 'project';
    this.pickGroup = 'g_proj_all';
    this.pickSelected = {};
    this._bound = false;
  }

  DyMatchStaff.prototype.staffList = function () {
    return (this.api.seed && this.api.seed.staff) || [];
  };

  DyMatchStaff.prototype.staffRoleLabel = function (roleId) {
    var hit = STAFF_ROLE_OPTS.filter(function (r) { return r.id === roleId; })[0];
    return hit ? hit.label : '';
  };

  DyMatchStaff.prototype.ensureStaffState = function () {
    var row = this.staffRow;
    if (!Array.isArray(row.staffIds)) row.staffIds = [];
    if (!row.staffRoles || typeof row.staffRoles !== 'object') row.staffRoles = {};
    if (!row.staffDesignated || typeof row.staffDesignated !== 'object') row.staffDesignated = {};
    var self = this;
    Object.keys(row.staffRoles).forEach(function (sid) {
      if (row.staffIds.indexOf(sid) < 0) delete row.staffRoles[sid];
    });
    Object.keys(row.staffDesignated).forEach(function (sid) {
      if (row.staffIds.indexOf(sid) < 0) delete row.staffDesignated[sid];
    });
    row.staffIds.forEach(function (sid) {
      if (!row.staffRoles[sid]) row.staffRoles[sid] = STAFF_ROLE_DEFAULT;
      if (typeof row.staffDesignated[sid] !== 'boolean') row.staffDesignated[sid] = false;
    });
  };

  DyMatchStaff.prototype.staffCardOrigin = function (index) {
    var col = index % 3;
    if (col === 0) return 'left center';
    if (col === 2) return 'right center';
    return 'center center';
  };

  DyMatchStaff.prototype.staffPickSummaryText = function (sid) {
    var designated = this.staffRow.staffDesignated && this.staffRow.staffDesignated[sid] === true;
    var guest = designated ? '点客' : '散客';
    var role = this.staffRoleLabel(this.staffRow.staffRoles && this.staffRow.staffRoles[sid] ? this.staffRow.staffRoles[sid] : '');
    return role ? guest + '·' + role : guest;
  };

  DyMatchStaff.prototype.staffAvatarHtml = function (st) {
    if (st.avatar) {
      return '<img class="staff-card__avatar" src="' + st.avatar + '" alt="" loading="lazy">';
    }
    var letter = (st.short || st.name || '?').toString().slice(0, 2);
    return '<span class="staff-card__avatar staff-card__avatar--ph" aria-hidden="true">' + escapeHtml(letter) + '</span>';
  };

  DyMatchStaff.prototype.renderStaffPickerHtml = function () {
    this.ensureStaffState();
    var edit = this.staffCardEdit;
    var self = this;
    var checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';
    var clearSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var cards = this.staffList().map(function (st, index) {
      var done = self.staffRow.staffIds.indexOf(st.id) >= 0;
      var isEdit = !!(edit && edit.staffId === st.id);
      var dim = !!(edit && !isEdit);
      var origin = self.staffCardOrigin(index);
      var originSide = index % 3 === 0 ? 'left' : index % 3 === 2 ? 'right' : 'center';
      var body = '';
      var jobTitle = st.role ? '<div class="staff-card__title">' + escapeHtml(st.role) + '</div>' : '';
      if (isEdit && edit.face === 'designate') {
        body = '<div class="staff-card__split" role="group" aria-label="点客或散客">' +
          '<button type="button" class="staff-card__split-btn staff-card__split-btn--des" data-staff-opt-designate="1" data-staff-id="' + st.id + '">点客</button>' +
          '<button type="button" class="staff-card__split-btn staff-card__split-btn--guest" data-staff-opt-designate="0" data-staff-id="' + st.id + '">散客</button>' +
          '</div>';
      } else if (isEdit && edit.face === 'role') {
        var roleBtns = STAFF_ROLE_PICK_ORDER.map(function (rid) {
          return '<button type="button" class="staff-card__split-btn staff-card__split-btn--role" data-staff-opt-role="' + rid + '" data-staff-id="' + st.id + '">' + escapeHtml(self.staffRoleLabel(rid)) + '</button>';
        }).join('');
        body = '<div class="staff-card__split staff-card__split--3" role="group" aria-label="选择工位">' + roleBtns + '</div>';
      } else {
        var pickLine = done
          ? '<div class="staff-card__title staff-card__title--pick">' + escapeHtml(self.staffPickSummaryText(st.id)) + '</div>'
          : jobTitle;
        body =
          (done ? '<span class="staff-card__check">' + checkSvg + '</span>' : '') +
          self.staffAvatarHtml(st) +
          '<div class="staff-card__name">' + escapeHtml(st.name) + '</div>' +
          pickLine;
      }
      var clearBtn = (done && !isEdit)
        ? '<button type="button" class="staff-card__clear" data-staff-clear data-staff-id="' + st.id + '" aria-label="清空选择">' + clearSvg + '</button>'
        : '';
      if (isEdit) {
        return '<div class="staff-card is-editing' + (done ? ' is-done' : '') + '"' +
          ' style="--staff-origin:' + origin + '"' +
          ' data-origin="' + originSide + '"' +
          ' data-staff-card data-staff-id="' + st.id + '">' +
          '<div class="staff-card__panel" data-face="' + edit.face + '">' + body + '</div>' +
          '</div>';
      }
      return '<div class="staff-card' + (done ? ' is-done' : '') + (dim ? ' is-dim' : '') + '"' +
        ' style="--staff-origin:' + origin + '"' +
        ' data-origin="' + originSide + '"' +
        ' data-staff-card data-staff-id="' + st.id + '">' +
        clearBtn +
        '<button type="button" class="staff-card__panel" data-staff-card-hit data-staff-id="' + st.id + '" aria-label="' + escapeHtml(st.name) + '">' +
        body +
        '</button>' +
        '</div>';
    }).join('');
    return '<div class="detail-item__staff-block detail-item__staff-block--cards' + (edit ? ' is-picking' : '') + '">' +
      (edit ? '<button type="button" class="staff-card-scrim" data-staff-scrim aria-label="取消选择"></button>' : '') +
      '<div class="staff-grid' + (edit ? ' is-morphing' : '') + '">' + cards + '</div>' +
      '</div>';
  };

  DyMatchStaff.prototype.animateStaffMorphLayout = function (grid) {
    if (!grid) return;
    var token = (grid._staffMorphToken = (grid._staffMorphToken || 0) + 1);
    var cards = Array.prototype.slice.call(grid.querySelectorAll(':scope > .staff-card'));
    var editing = cards.filter(function (c) { return c.classList.contains('is-editing'); })[0];
    var reduce = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    cards.forEach(function (c) {
      c.classList.remove('is-pinching', 'is-expanding');
      c.style.transition = 'none';
      c.style.transform = '';
      c.style.width = '';
      c.style.zIndex = '';
    });
    grid.classList.toggle('is-morphing', !!editing);

    if (!editing) {
      requestAnimationFrame(function () {
        if (grid._staffMorphToken !== token) return;
        cards.forEach(function (c) { c.style.transition = ''; });
      });
      return;
    }

    var gap = 8;
    var narrowW = 32;
    var gridW = grid.clientWidth;
    if (gridW <= 0) return;
    var cellW = (gridW - gap * 2) / 3;
    var faceEl = editing.querySelector('[data-face]');
    var face = faceEl ? faceEl.getAttribute('data-face') : '';
    var editWFull = face === 'role' ? gridW : Math.min(gridW, cellW * 2 + gap);
    var editW = Math.max(cellW, Math.round(editWFull * (2 / 3)));
    var idx = cards.indexOf(editing);
    if (idx < 0) return;
    var col = idx % 3;
    var rowStart = idx - col;
    var natural = [0, cellW + gap, 2 * (cellW + gap)];
    var lefts = [natural[0], natural[1], natural[2]];
    if (col === 0) {
      lefts[0] = 0;
      lefts[1] = editW + gap;
      lefts[2] = editW + gap * 2 + cellW;
    } else if (col === 2) {
      lefts[2] = gridW - editW;
      lefts[1] = lefts[2] - gap - cellW;
      lefts[0] = lefts[1] - gap - cellW;
    } else {
      lefts[1] = (gridW - editW) / 2;
      lefts[0] = lefts[1] - gap - cellW;
      lefts[2] = lefts[1] + editW + gap;
    }
    var narrowDx = (cellW - narrowW) / 2;

    var applyFinalLayout = function () {
      for (var i = 0; i < 3; i++) {
        var card = cards[rowStart + i];
        if (!card) continue;
        var dx = lefts[i] - natural[i];
        var w = (i === col) ? editW : cellW;
        card.style.transition = 'transform .17s cubic-bezier(.22,.82,.24,1), width .17s cubic-bezier(.22,.82,.24,1)';
        card.style.width = w + 'px';
        card.style.transform = 'translateX(' + dx + 'px)';
        if (i === col) card.style.zIndex = '6';
      }
    };

    if (reduce) {
      editing.classList.add('is-expanding');
      applyFinalLayout();
      return;
    }

    editing.style.zIndex = '6';
    editing.classList.add('is-pinching');
    editing.style.width = cellW + 'px';
    editing.style.transform = 'translateX(0)';
    for (var i = 0; i < 3; i++) {
      if (i === col) continue;
      var card = cards[rowStart + i];
      if (!card) continue;
      card.style.width = cellW + 'px';
      card.style.transform = 'translateX(0)';
    }
    void grid.offsetWidth;

    requestAnimationFrame(function () {
      if (grid._staffMorphToken !== token) return;
      editing.style.transition = 'transform .09s cubic-bezier(.4,0,.2,1), width .09s cubic-bezier(.4,0,.2,1)';
      editing.style.width = narrowW + 'px';
      editing.style.transform = 'translateX(' + narrowDx + 'px)';

      var phaseDone = false;
      var runExpand = function () {
        if (phaseDone || grid._staffMorphToken !== token) return;
        phaseDone = true;
        editing.classList.remove('is-pinching');
        editing.classList.add('is-expanding');
        applyFinalLayout();
      };
      var onShrinkEnd = function (e) {
        if (e && e.target !== editing) return;
        if (e && e.propertyName && e.propertyName !== 'width' && e.propertyName !== 'transform') return;
        editing.removeEventListener('transitionend', onShrinkEnd);
        runExpand();
      };
      editing.addEventListener('transitionend', onShrinkEnd);
      setTimeout(runExpand, 110);
    });
  };

  DyMatchStaff.prototype.renderStaffInto = function (root) {
    if (!root) return;
    root.innerHTML = this.renderStaffPickerHtml();
    var self = this;
    requestAnimationFrame(function () {
      var grid = root.querySelector('.staff-grid');
      if (grid) self.animateStaffMorphLayout(grid);
    });
  };

  DyMatchStaff.prototype.syncStaffFromSession = function () {
    var s = this.api.session;
    var ids = (s.selectedEmpIds && s.selectedEmpIds.length)
      ? s.selectedEmpIds.slice()
      : (s.selectedEmpId ? [s.selectedEmpId] : []);
    this.staffRow = {
      id: '__verify__',
      staffIds: ids,
      staffRoles: Object.assign({}, s.staffRoles || {}),
      staffDesignated: Object.assign({}, s.staffDesignated || {})
    };
    this.staffCardEdit = null;
    this.ensureStaffState();
  };

  DyMatchStaff.prototype.commitStaffToSession = function () {
    this.ensureStaffState();
    var s = this.api.session;
    s.selectedEmpIds = this.staffRow.staffIds.slice();
    s.selectedEmpId = s.selectedEmpIds[0] || null;
    s.staffRoles = Object.assign({}, this.staffRow.staffRoles);
    s.staffDesignated = Object.assign({}, this.staffRow.staffDesignated);
  };

  DyMatchStaff.prototype.empSummaryText = function () {
    var s = this.api.session;
    var ids = s.selectedEmpIds && s.selectedEmpIds.length ? s.selectedEmpIds : (s.selectedEmpId ? [s.selectedEmpId] : []);
    if (!ids.length) return '未选';
    var first = this.api.staffById(ids[0]);
    var name = first ? first.name : '未选';
    if (ids.length === 1) {
      var des = s.staffDesignated && s.staffDesignated[ids[0]];
      var role = this.staffRoleLabel(s.staffRoles && s.staffRoles[ids[0]]);
      var tag = (des ? '点客' : '散客') + (role ? '·' + role : '');
      return name + '（' + tag + '）';
    }
    return name + ' 等' + ids.length + '人';
  };

  /* ---- 价目匹配 ---- */
  DyMatchStaff.prototype.allCatalogItems = function () {
    var seed = this.api.seed;
    return [].concat(seed.projects || [], seed.shopProducts || []);
  };

  DyMatchStaff.prototype.itemById = function (id) {
    return this.allCatalogItems().filter(function (p) { return p.id === id; })[0];
  };

  DyMatchStaff.prototype.visibleItems = function (bucket) {
    var list = bucket === 'product'
      ? (this.api.seed.shopProducts || [])
      : (this.api.seed.projects || []);
    return list.filter(function (it) { return !it.hidden; });
  };

  DyMatchStaff.prototype.groupsFor = function (bucket) {
    var g = (this.api.seed.catalogGroups && this.api.seed.catalogGroups[bucket]) || [];
    return g;
  };

  DyMatchStaff.prototype.openMatchPick = function () {
    var s = this.api.session;
    this.pickSelected = {};
    var ids = (s.selectedMatchIds && s.selectedMatchIds.length)
      ? s.selectedMatchIds
      : (s.selectedProdId ? [s.selectedProdId] : []);
    var self = this;
    ids.forEach(function (id) { if (id) self.pickSelected[id] = true; });
    this.pickType = 'project';
    this.pickGroup = 'g_proj_all';
    this.renderMatchPick();
    this.api.showScreen('match-pick');
  };

  DyMatchStaff.prototype.renderMatchPick = function () {
    var typeBar = document.getElementById('matchPickTypes');
    if (typeBar) {
      Array.prototype.forEach.call(typeBar.querySelectorAll('[data-match-type]'), function (btn) {
        var on = btn.getAttribute('data-match-type') === this.pickType;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      }.bind(this));
    }
    this.renderMatchGroups();
    this.renderMatchList();
    this.syncMatchCount();
  };

  DyMatchStaff.prototype.renderMatchGroups = function () {
    var host = document.getElementById('matchPickGroups');
    if (!host) return;
    var groups = this.groupsFor(this.pickType);
    var gid = this.pickGroup;
    var tabs = groups.map(function (g) {
      return '<button type="button" class="catalog-group-tab' + (g.id === gid ? ' on' : '') + '" data-match-group="' + escapeHtml(g.id) + '">' +
        escapeHtml(g.name) + '</button>';
    }).join('');
    host.innerHTML =
      '<div class="catalog-group-segment">' +
      '<div class="catalog-group-scroll">' + tabs + '</div>' +
      '<div class="catalog-group-fade" aria-hidden="true"></div>' +
      '</div>';
  };

  DyMatchStaff.prototype.renderMatchList = function () {
    var list = document.getElementById('matchPickList');
    if (!list) return;
    var items = this.visibleItems(this.pickType);
    var group = this.groupsFor(this.pickType).filter(function (g) { return g.id === this.pickGroup; }.bind(this))[0];
    if (group && group.itemIds) {
      var allow = {};
      group.itemIds.forEach(function (id) { allow[id] = true; });
      items = items.filter(function (it) { return allow[it.id]; });
    }
    var checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
    var self = this;
    list.innerHTML = items.map(function (it) {
      var on = !!self.pickSelected[it.id];
      var sub = (it.category || '') + (it.spec ? ' · ' + it.spec : '') + ' · ¥' + it.price;
      return '<div class="match-pick-item-wrap' + (on ? ' on' : '') + '">' +
        '<button type="button" class="match-pick-item" data-match-item="' + escapeHtml(it.id) + '">' +
        '<span class="match-pick-item__check">' + (on ? checkSvg : '') + '</span>' +
        '<span class="match-pick-item__text">' +
        '<span class="match-pick-item__name">' + escapeHtml(it.name) + '</span>' +
        '<span class="match-pick-item__sub">' + escapeHtml(sub) + '</span>' +
        '</span></button></div>';
    }).join('') || '<div style="padding:24px;text-align:center;color:#929292;font-size:13px;">该分组暂无项目</div>';
  };

  DyMatchStaff.prototype.syncMatchCount = function () {
    var n = Object.keys(this.pickSelected).length;
    var el = document.getElementById('matchPickCount');
    if (el) el.innerHTML = '已选 <strong>' + n + '</strong> 项';
  };

  DyMatchStaff.prototype.commitMatchPick = function () {
    var ids = Object.keys(this.pickSelected);
    if (!ids.length) {
      this.api.toast('请至少选择一项');
      return false;
    }
    var items = ids.map(function (id) { return this.itemById(id); }.bind(this)).filter(Boolean);
    var s = this.api.session;
    s.selectedMatchIds = items.map(function (it) { return it.id; });
    s.selectedProdId = s.selectedMatchIds[0] || null;
    s.mismatched = false;
    s.matchMemory = s.matchMemory || {};
    s.matchMemory[s.couponName] = items.map(function (it) {
      return { id: it.id, kind: it.kind || 'project', name: it.name, price: it.price };
    });
    return true;
  };

  DyMatchStaff.prototype.bindEvents = function () {
    if (this._bound) return;
    this._bound = true;
    var self = this;

    document.addEventListener('click', function (e) {
      var root = e.target.closest('#empPickRoot[data-staff-root], [data-staff-root]#empPickRoot');
      if (!root) root = e.target.closest('#empPickRoot');
      if (root) {
        var scrim = e.target.closest('[data-staff-scrim]');
        if (scrim) {
          self.staffCardEdit = null;
          self.renderStaffInto(root);
          return;
        }
        var clearBtn = e.target.closest('[data-staff-clear]');
        if (clearBtn) {
          e.preventDefault();
          e.stopPropagation();
          var cSid = clearBtn.getAttribute('data-staff-id');
          self.ensureStaffState();
          self.staffRow.staffIds = self.staffRow.staffIds.filter(function (id) { return id !== cSid; });
          delete self.staffRow.staffRoles[cSid];
          delete self.staffRow.staffDesignated[cSid];
          if (self.staffCardEdit && self.staffCardEdit.staffId === cSid) self.staffCardEdit = null;
          self.renderStaffInto(root);
          return;
        }
        var desOpt = e.target.closest('[data-staff-opt-designate]');
        if (desOpt) {
          e.preventDefault();
          e.stopPropagation();
          var dSid = desOpt.getAttribute('data-staff-id');
          if (!self.staffCardEdit || self.staffCardEdit.staffId !== dSid) return;
          self.staffCardEdit.draftDesignated = desOpt.getAttribute('data-staff-opt-designate') === '1';
          self.staffCardEdit.face = 'role';
          self.renderStaffInto(root);
          return;
        }
        var roleOpt = e.target.closest('[data-staff-opt-role]');
        if (roleOpt) {
          e.preventDefault();
          e.stopPropagation();
          var rSid = roleOpt.getAttribute('data-staff-id');
          if (!self.staffCardEdit || self.staffCardEdit.staffId !== rSid) return;
          self.ensureStaffState();
          if (self.staffRow.staffIds.indexOf(rSid) < 0) self.staffRow.staffIds.push(rSid);
          self.staffRow.staffDesignated[rSid] = !!self.staffCardEdit.draftDesignated;
          self.staffRow.staffRoles[rSid] = roleOpt.getAttribute('data-staff-opt-role') || STAFF_ROLE_DEFAULT;
          self.staffCardEdit = null;
          self.renderStaffInto(root);
          return;
        }
        var staffHit = e.target.closest('[data-staff-card-hit]');
        if (staffHit) {
          e.preventDefault();
          var hitSid = staffHit.getAttribute('data-staff-id');
          if (self.staffCardEdit && self.staffCardEdit.staffId === hitSid) {
            self.staffCardEdit = null;
          } else {
            self.ensureStaffState();
            self.staffCardEdit = { staffId: hitSid, face: 'designate', draftDesignated: null };
          }
          self.renderStaffInto(root);
          return;
        }
      }

      var typeBtn = e.target.closest('[data-match-type]');
      if (typeBtn && document.getElementById('screen-match-pick') &&
          document.getElementById('screen-match-pick').classList.contains('active')) {
        self.pickType = typeBtn.getAttribute('data-match-type');
        self.pickGroup = self.pickType === 'product' ? 'g_prod_all' : 'g_proj_all';
        self.renderMatchPick();
        return;
      }
      var gBtn = e.target.closest('[data-match-group]');
      if (gBtn) {
        self.pickGroup = gBtn.getAttribute('data-match-group');
        self.renderMatchPick();
        return;
      }
      var itemBtn = e.target.closest('[data-match-item]');
      if (itemBtn) {
        var mid = itemBtn.getAttribute('data-match-item');
        if (self.pickSelected[mid]) delete self.pickSelected[mid];
        else self.pickSelected[mid] = true;
        self.renderMatchList();
        self.syncMatchCount();
        return;
      }
      if (e.target.closest('#btnMatchPickClear')) {
        self.pickSelected = {};
        self.renderMatchList();
        self.syncMatchCount();
        return;
      }
      if (e.target.closest('#btnMatchPickOk')) {
        if (self.commitMatchPick()) {
          self.api.toast(self.api.session.selectedMatchIds.length > 1 ? '已匹配多项' : '已匹配');
          self.api.showScreen('confirm');
          self.api.syncConfirmUI();
        }
        return;
      }
      if (e.target.closest('#btnMatchPickCancel') || e.target.closest('#btnMatchPickBack')) {
        self.api.goBack();
        return;
      }
      if (e.target.closest('#btnEmpPickOk')) {
        if (!self.staffRow.staffIds.length) {
          self.api.toast('请至少选择一名员工');
          return;
        }
        self.commitStaffToSession();
        self.api.closeMasks();
        self.api.syncConfirmUI();
        self.api.toast('已选择：' + self.empSummaryText());
        return;
      }
    });
  };

  g.DyMatchStaff = DyMatchStaff;
})(window);
