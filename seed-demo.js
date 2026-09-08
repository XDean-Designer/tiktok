/* 演示数据：员工对齐开单；价目对齐提成设置（项目+产品） */
window.DySeed = {
  staff: [
    { id: 'st0', name: '顾清扬', short: '顾', role: '店主', avatar: 'assets/emp-avatars/man-e.jpg' },
    { id: 'st1', name: '林屿森', short: '森', role: '美容师', avatar: 'assets/emp-avatars/man-a.jpg' },
    { id: 'st2', name: '何苏叶', short: '叶', role: '店长', avatar: 'assets/emp-avatars/woman-a.jpg' },
    { id: 'st3', name: '阿Ken', short: 'Ken', role: '美容师', avatar: 'assets/emp-avatars/man-b.jpg' },
    { id: 'st4', name: 'Lisa', short: 'Lisa', role: '美甲师', avatar: 'assets/emp-avatars/woman-b.jpg' }
  ],
  /* 兼容旧字段：扁平项目列表（由 projects 派生） */
  products: [],
  projects: [
    { id: 'p1', name: '时尚洗吹', price: 58, category: '洗吹', kind: 'project' },
    { id: 'p2', name: '精致剪发', price: 98, category: '剪发', kind: 'project' },
    { id: 'p3', name: '洗剪吹', price: 68, category: '洗吹', kind: 'project' },
    { id: 'p4', name: '儿童剪发', price: 48, category: '剪发', kind: 'project', hidden: true },
    { id: 'p5', name: '女士造型', price: 128, category: '造型', kind: 'project', hidden: true },
    { id: 'p6', name: '染发', price: 358, category: '烫染', kind: 'project' },
    { id: 'p7', name: '漂发', price: 288, category: '烫染', kind: 'project' },
    { id: 'p8', name: '烫发', price: 398, category: '烫染', kind: 'project' },
    { id: 'p9', name: '摩根烫', price: 458, category: '烫染', kind: 'project' },
    { id: 'p10', name: '电棒烫', price: 428, category: '烫染', kind: 'project' },
    { id: 'p11', name: '深层滋养', price: 198, category: '护理', kind: 'project' },
    { id: 'p12', name: '蛋白矫正', price: 598, category: '护理', kind: 'project' },
    { id: 'p13', name: '头疗', price: 138, category: '护理', kind: 'project', hidden: true },
    { id: 'p14', name: '接发', price: 888, category: '造型', kind: 'project' },
    { id: 'p15', name: '头皮护理', price: 168, category: '护理', kind: 'project' },
    { id: 'p16', name: '挑染', price: 198, category: '烫染', kind: 'project' },
    { id: 'p17', name: '时尚造型', price: 128, category: '造型', kind: 'project' },
    { id: 'p18', name: '暖色漂褪', price: 328, category: '烫染', kind: 'project' },
    { id: 'p19', name: '洗头', price: 28, category: '洗吹', kind: 'project' },
    { id: 'p20', name: '面部清洁护理', price: 168, category: '美容', kind: 'project' },
    { id: 'p21', name: '深层补水护理', price: 268, category: '美容', kind: 'project' },
    { id: 'p22', name: '美白淡斑护理', price: 398, category: '美容', kind: 'project' },
    { id: 'p23', name: '手部基础美甲', price: 98, category: '美甲', kind: 'project' },
    { id: 'p24', name: '猫眼甲油胶', price: 158, category: '美甲', kind: 'project' },
    { id: 'p25', name: '卸甲重做', price: 68, category: '美甲', kind: 'project' },
    { id: 'p26', name: '开花嫁接睫毛', price: 288, category: '美睫', kind: 'project' },
    { id: 'p27', name: '美睫补嫁', price: 128, category: '美睫', kind: 'project' }
  ],
  shopProducts: [
    { id: 'pd1', name: '剑琅修护洗发水', price: 128, category: '洗护', kind: 'product', spec: '500ml' },
    { id: 'pd2', name: '剑琅滋养护发素', price: 98, category: '洗护', kind: 'product', spec: '500ml' },
    { id: 'pd3', name: '剑琅头皮护理精华', price: 168, category: '护理', kind: 'product', spec: '100ml' },
    { id: 'pd4', name: '剑琅造型发蜡', price: 88, category: '造型', kind: 'product', spec: '80g', hidden: true },
    { id: 'pd5', name: '剑琅染发护色套装', price: 198, category: '烫染', kind: 'product' },
    { id: 'pd6', name: '剑琅免洗喷雾', price: 68, category: '护理', kind: 'product', spec: '150ml' },
    { id: 'pd7', name: '剑琅儿童温和洗发水', price: 78, category: '洗护', kind: 'product', spec: '300ml' },
    { id: 'pd8', name: '剑琅控油洗发水', price: 118, category: '洗护', kind: 'product', spec: '400ml' },
    { id: 'pd9', name: '剑琅柔顺发膜', price: 148, category: '护理', kind: 'product', spec: '200ml' },
    { id: 'pd10', name: '剑琅护发精油', price: 158, category: '护理', kind: 'product', spec: '50ml' },
    { id: 'pd11', name: '剑琅哑光发泥', price: 78, category: '造型', kind: 'product', spec: '100g' },
    { id: 'pd12', name: '剑琅定型喷雾', price: 88, category: '造型', kind: 'product', spec: '300ml' },
    { id: 'pd13', name: '剑琅漂后修护乳', price: 138, category: '烫染', kind: 'product', spec: '250ml' },
    { id: 'pd14', name: '剑琅护色洗发水', price: 138, category: '烫染', kind: 'product', spec: '500ml' },
    { id: 'pd15', name: '剑琅儿童护发素', price: 68, category: '洗护', kind: 'product', spec: '250ml' },
    { id: 'pd16', name: '剑琅头皮清洁泥', price: 128, category: '护理', kind: 'product', spec: '120g' },
    { id: 'pd17', name: '剑琅旅行装洗护套', price: 88, category: '洗护', kind: 'product', hidden: true },
    { id: 'pd18', name: '剑琅烫后还原霜', price: 118, category: '烫染', kind: 'product', spec: '200ml' },
    { id: 'pd19', name: '剑琅玻尿酸精华液', price: 198, category: '美容', kind: 'product', spec: '30ml' },
    { id: 'pd20', name: '剑琅补水面膜', price: 88, category: '美容', kind: 'product', spec: '5片' },
    { id: 'pd21', name: '剑琅甲油胶套装', price: 168, category: '美甲', kind: 'product', spec: '12色' },
    { id: 'pd22', name: '剑琅指缘护理油', price: 58, category: '美甲', kind: 'product', spec: '15ml' },
    { id: 'pd23', name: '剑琅睫毛胶水', price: 78, category: '美睫', kind: 'product', spec: '5ml' },
    { id: 'pd24', name: '剑琅美睫卸除液', price: 48, category: '美睫', kind: 'product', spec: '50ml' }
  ],
  catalogGroups: {
    project: [
      { id: 'g_proj_all', name: '全部', itemIds: null },
      { id: 'g_proj_wash', name: '洗吹', itemIds: ['p1', 'p3', 'p19'] },
      { id: 'g_proj_tang', name: '烫染', itemIds: ['p6', 'p7', 'p8', 'p9', 'p10', 'p16', 'p18'] },
      { id: 'g_proj_care', name: '护理', itemIds: ['p11', 'p12', 'p13', 'p15'] },
      { id: 'g_proj_cut', name: '剪发造型', itemIds: ['p2', 'p4', 'p5', 'p14', 'p17'] },
      { id: 'g_proj_beauty', name: '美容', itemIds: ['p20', 'p21', 'p22'] },
      { id: 'g_proj_nail', name: '美甲', itemIds: ['p23', 'p24', 'p25'] },
      { id: 'g_proj_lash', name: '美睫', itemIds: ['p26', 'p27'] }
    ],
    product: [
      { id: 'g_prod_all', name: '全部', itemIds: null },
      { id: 'g_prod_wash', name: '洗护', itemIds: ['pd1', 'pd2', 'pd7', 'pd8', 'pd14', 'pd15', 'pd17'] },
      { id: 'g_prod_care', name: '头皮护理', itemIds: ['pd3', 'pd6', 'pd9', 'pd10', 'pd16'] },
      { id: 'g_prod_style', name: '造型', itemIds: ['pd4', 'pd11', 'pd12'] },
      { id: 'g_prod_color', name: '烫染护理', itemIds: ['pd5', 'pd13', 'pd14', 'pd18'] },
      { id: 'g_prod_beauty', name: '美容', itemIds: ['pd19', 'pd20'] },
      { id: 'g_prod_nail', name: '美甲', itemIds: ['pd21', 'pd22'] },
      { id: 'g_prod_lash', name: '美睫', itemIds: ['pd23', 'pd24'] },
      { id: 'g_prod_kids', name: '儿童专区', itemIds: ['pd7', 'pd15'] }
    ]
  },
  /* 团购券无事先价目映射；仅手工匹配 + 会话记忆（按平台分演示券） */
  couponDemos: {
    default: { name: '深层补水护理 · 单次体验', price: 268, code: 'dy9182-ABCD-7781' },
    mismatch: { name: '抖音专享护理 · 单次体验', price: 199, code: 'dy9900-MM00-1122' },
    multi: { name: '护理组合体验券', price: 436, code: 'dy8800-MT00-5566' },
    meituanDefault: { name: '深层补水护理 · 美团专享', price: 258, code: 'mt7182-ABCD-9901' },
    meituanMismatch: { name: '美团专享护理 · 单次体验', price: 189, code: 'mt9900-MM00-2233' },
    meituanMulti: { name: '美团护理组合券', price: 426, code: 'mt8800-MT00-7788' }
  }
};

(function () {
  var s = window.DySeed;
  s.products = s.projects.filter(function (p) { return !p.hidden; });
})();
