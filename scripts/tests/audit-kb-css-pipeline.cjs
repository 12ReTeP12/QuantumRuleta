/**
 * Overí, že keyboard CSS z main.css je v pipeline V2 → index.html → Electron.
 * Spustenie: node scripts/tests/audit-kb-css-pipeline.cjs
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'index-NOVY-V2.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'main.css'), 'utf8');
const index = fs.existsSync(path.join(root, 'index.html'))
  ? fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  : '';

const markers = [
  '--kb-row-macro:minmax(48px',
  '--kb-pct-col:',
  '--kb-label-macro:',
  'grid-template-columns:clamp(40px,3.4%,56px) repeat(12,minmax(0,1fr)) clamp(58px',
  '-webkit-line-clamp:2',
  'Flow pásy — vizuálna hierarchia',
];

const report = { ok: true, checks: [] };
for (const m of markers) {
  const inCss = css.includes(m);
  report.checks.push({ marker: m, mainCss: inCss });
  if (!inCss) report.ok = false;
}
report.checks.push({
  marker: 'index-NOVY-V2 link main.css',
  v2: /href="styles\/main\.css"/.test(html),
});
report.checks.push({
  marker: 'v6-keyboard-section in V2',
  v2: html.includes('v6-keyboard-section'),
});
report.checks.push({
  marker: 'index.html synced & has keyboard',
  index: index.includes('v6-keyboard-section') && index.includes('styles/main.css'),
});

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
