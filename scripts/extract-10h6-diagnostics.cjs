'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'index-NOVY-V2.html');

const SLICES = [
  {
    id: '10H-6-pressure',
    out: 'scripts/analytics/pressure-engine.js',
    mark: '/* Pressure engine → scripts/analytics/pressure-engine.js (10H-6) */',
    htmlStart: 3372,
    htmlEnd: 3461,
    header:
      "/**\n * Pressure Engine — Balík 10H-6 z index-NOVY-V2.html\n" +
      ' * Závisí na: wheel-sector-intel, session-stats, V2 inline (weightedTotal, lastVisualBreakdown)\n' +
      " */\n'use strict';\n\n",
  },
  {
    id: '10H-6-telemetry',
    out: 'scripts/analytics/telemetry-engine.js',
    mark: '/* Telemetry engine → scripts/analytics/telemetry-engine.js (10H-6) */',
    htmlStart: 3164,
    htmlEnd: 3310,
    header:
      "/**\n * Telemetry Engine — Balík 10H-6 z index-NOVY-V2.html\n" +
      ' * Závisí na: strategy, wheel-sector-intel, session-stats, bah-engine, V2 inline (risk/flow)\n' +
      " */\n'use strict';\n\n",
    extraFromLine: 1252,
  },
  {
    id: '10H-6-visual-heat',
    out: 'scripts/analytics/visual-heat-engine.js',
    mark: '/* Visual heat engine → scripts/analytics/visual-heat-engine.js (10H-6) */',
    htmlStart: 2923,
    htmlEnd: 3043,
    header:
      "/**\n * Visual Heat Engine — Balík 10H-6 z index-NOVY-V2.html\n" +
      ' * Závisí na: pressure-engine, ai-engine (hot/cold), session-stats, V2 inline (visual core)\n' +
      " */\n'use strict';\n\n",
  },
];

const SCRIPTS = [
  '<script src="scripts/analytics/pressure-engine.js"></script>',
  '<script src="scripts/analytics/visual-heat-engine.js"></script>',
  '<script src="scripts/analytics/telemetry-engine.js"></script>',
];
const INSERT_AFTER = '<script src="scripts/strategy/strategy-engine.js"></script>';

if (!fs.existsSync(srcPath)) throw new Error('missing index-NOVY-V2.html');
let htmlLines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

function htmlSlice(htmlStart, htmlEndInclusive) {
  return htmlLines.slice(htmlStart - 1, htmlEndInclusive).join('\n');
}

function spliceHtml(htmlStart, htmlEndInclusive, marker) {
  htmlLines = htmlLines.slice(0, htmlStart - 1).concat([marker], htmlLines.slice(htmlEndInclusive));
}

for (const s of SLICES) {
  let body = htmlSlice(s.htmlStart, s.htmlEnd);
  if (s.extraFromLine) {
    const skLine = htmlLines[s.extraFromLine - 1];
    if (!/^function skEngineName/.test(skLine)) throw new Error('skEngineName not at line ' + s.extraFromLine);
    body = skLine + '\n\n' + body;
  }
  const outPath = path.join(root, s.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, s.header + body + '\n', 'utf8');
  console.log('[write]', outPath, fs.statSync(outPath).size, 'bytes');
}

[...SLICES].sort((a, b) => b.htmlStart - a.htmlStart).forEach((s) => {
  spliceHtml(s.htmlStart, s.htmlEnd, s.mark);
});

const skIdx = htmlLines.findIndex((l) => /^function skEngineName/.test(l));
if (skIdx >= 0) {
  htmlLines.splice(skIdx, 1);
}

let html = htmlLines.join('\n');
if (!html.includes(SCRIPTS[0])) {
  html = html.replace(INSERT_AFTER, INSERT_AFTER + '\n' + SCRIPTS.join('\n'));
}
fs.writeFileSync(srcPath, html, 'utf8');
console.log('[write]', srcPath, html.split(/\n/).length, 'lines');
