/* 演示数据：复用「提成设置」原型中的员工与价目项目 */
window.DySeed = {
  staff: [
    { id: 'st0', name: '顾清扬', short: '顾', role: '店主' },
    { id: 'st1', name: '林屿森', short: '森', role: '美容师' },
    { id: 'st2', name: '何苏叶', short: '叶', role: '店长' },
    { id: 'st3', name: '阿Ken', short: 'Ken', role: '美容师' },
    { id: 'st4', name: 'Lisa', short: 'Lisa', role: '美甲师' }
  ],
  products: [
    { id: 'p1', name: '时尚洗吹', price: 58, category: '洗吹' },
    { id: 'p3', name: '洗剪吹', price: 68, category: '洗吹' },
    { id: 'p6', name: '染发', price: 358, category: '烫染' },
    { id: 'p15', name: '头皮护理', price: 168, category: '护理' },
    { id: 'p21', name: '深层补水护理', price: 268, category: '美容' },
    { id: 'p22', name: '美白淡斑护理', price: 398, category: '美容' },
    { id: 'p23', name: '手部基础美甲', price: 98, category: '美甲' }
  ],
  /* 平台券名 → 本地价目；null 表示未匹配，需手选 */
  couponMap: {
    '深层补水护理 · 单次体验': 'p21',
    '时尚洗剪吹': 'p3',
    '头皮护理套餐': 'p15',
    '未匹配演示券 · 抖音专享护理': null
  }
};
