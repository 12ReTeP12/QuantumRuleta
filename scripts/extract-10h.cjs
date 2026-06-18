'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'index.html');
const outHtml = path.join(root, 'index-NOVY-V2.html');

if (!fs.existsSync(srcPath)) throw new Error('missing index.html');
let htmlLines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);
if (!htmlLines.some((l) => /function computeCoreAnalysis/.test(l))) {
  throw new Error('index.html missing computeCoreAnalysis — abort');
}

function htmlSlice(htmlStart, htmlEndInclusive) {
  return htmlLines.slice(htmlStart - 1, htmlEndInclusive).join('\n');
}

function spliceHtml(htmlStart, htmlEndInclusive, marker) {
  htmlLines = htmlLines.slice(0, htmlStart - 1).concat([marker], htmlLines.slice(htmlEndInclusive));
}

const packs = [
  {
    id: '10H-1',
    out: 'scripts/ai/pred-flow-engine.js',
    htmlStart: 402,
    htmlEnd: 1735,
    marker: '/* Pred Flow → scripts/ai/pred-flow-engine.js (10H-1) */',
    script: '<script src="scripts/ai/pred-flow-engine.js"></script>',
    insertBefore: '<script src="scripts/ai/ai-prediction.js"></script>',
  },
  {
    id: '10H-2',
    out: 'scripts/ai/pred-dashboard.js',
    htmlStart: 2634,
    htmlEnd: 3354,
    marker: '/* AI Pred dashboard → scripts/ai/pred-dashboard.js (10H-2) */',
    script: '<script src="scripts/ai/pred-dashboard.js"></script>',
    insertBefore: '<script src="scripts/ai/ai-prediction.js"></script>',
  },
  {
    id: '10H-3a',
    out: 'scripts/analytics/bah-engine.js',
    htmlStart: 3704,
    htmlEnd: 4131,
    marker: '/* BAH → scripts/analytics/bah-engine.js (10H-3) */',
    script: '<script src="scripts/analytics/bah-engine.js"></script>',
    insertBefore: '<script src="scripts/analytics/roulette-analytics.js"></script>',
  },
  {
    id: '10H-3b',
    out: 'scripts/analytics/session-stats.js',
    htmlStart: 4668,
    htmlEnd: 4937,
    marker: '/* Session stats → scripts/analytics/session-stats.js (10H-3) */',
    script: '<script src="scripts/analytics/session-stats.js"></script>',
    insertBefore: '<script src="scripts/analytics/roulette-analytics.js"></script>',
  },
];

for (const p of packs) {
  const body = htmlSlice(p.htmlStart, p.htmlEnd);
  const head = body.split('\n')[0].slice(0, 60);
  const tail = body.split('\n').slice(-3).join(' | ').slice(0, 80);
  const content = `'use strict';\n/* ${p.id} ${path.basename(p.out)} — Balík 10H */\n\n${body}\n`;
  fs.mkdirSync(path.dirname(path.join(root, p.out)), { recursive: true });
  fs.writeFileSync(path.join(root, p.out), content, 'utf8');
  console.log('[write]', p.out, p.htmlEnd - p.htmlStart + 1, 'lines', 'head:', head, 'tail:', tail);
}

[...packs].sort((a, b) => b.htmlStart - a.htmlStart).forEach((p) => {
  spliceHtml(p.htmlStart, p.htmlEnd, p.marker);
});

let html = htmlLines.join('\n');
for (const p of packs) {
  if (!html.includes(p.script)) {
    html = html.replace(p.insertBefore, p.script + '\n' + p.insertBefore);
  }
}
if (!html.includes('scripts/debug/engine-hub.js')) {
  throw new Error('engine-hub script tag missing after extract');
}
fs.writeFileSync(outHtml, html, 'utf8');
console.log('[done] index-NOVY-V2.html', fs.statSync(outHtml).size, 'B');
