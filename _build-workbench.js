/**
 * Extract workbench CSS from card/demo.html into 抖音核销 package.
 * Also injects workbench-fragment.html into index.html when missing.
 */
const fs = require('fs');
const path = require('path');

const demoPath = 'd:/RTB优化工程/card/demo.html';
const outDir = __dirname;
const lines = fs.readFileSync(demoPath, 'utf8').split(/\r?\n/);
const cssCore = lines.slice(4619, 4708).join('\n');
const extra = [
  '',
  '/* 四 Tab：与本包首页标签一致 */',
  '.wb-tabbar--four { justify-content: space-around; padding: 0 12px; }',
  '.wb-tabbar--four .wb-tab { flex: 1 1 0; width: auto; max-width: 72px; }',
  '#screen-workbench { position: relative; }',
  '.wb-tab__icon svg { display: block; width: 22px; height: 22px; }',
  '',
].join('\n');

fs.writeFileSync(
  path.join(outDir, 'workbench.css'),
  '/* workbench from card/demo.html */\n' + cssCore + '\n' + extra,
  'utf8'
);
console.log('wrote workbench.css');

const indexPath = path.join(outDir, 'index.html');
let idx = fs.readFileSync(indexPath, 'utf8');
if (!idx.includes('workbench.css')) {
  idx = idx.replace(
    '<link rel="stylesheet" href="app.css">',
    '<link rel="stylesheet" href="app.css">\n<link rel="stylesheet" href="workbench.css">'
  );
  console.log('linked workbench.css');
}
if (!idx.includes('id="screen-workbench"')) {
  const frag = fs.readFileSync(path.join(outDir, 'workbench-fragment.html'), 'utf8');
  const marker = '      <!-- ========== ACCOUNT ========== -->';
  if (!idx.includes(marker)) throw new Error('ACCOUNT marker missing');
  idx = idx.replace(marker, frag + '\n' + marker);
  console.log('injected workbench fragment');
} else {
  console.log('workbench screen already present');
}
fs.writeFileSync(indexPath, idx, 'utf8');
