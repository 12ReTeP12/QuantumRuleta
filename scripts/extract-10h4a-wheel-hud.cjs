'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'index-NOVY-V2.html');
const hudPath = path.join(root, 'scripts/wheel/wheel-hud.js');
const MARK = '/* Wheel HUD presentation → scripts/wheel/wheel-hud.js (10H-4A) */';

if (!fs.existsSync(srcPath)) throw new Error('missing index-NOVY-V2.html');
let htmlLines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

function htmlSlice(htmlStart, htmlEndInclusive) {
  return htmlLines.slice(htmlStart - 1, htmlEndInclusive).join('\n');
}

function spliceHtml(htmlStart, htmlEndInclusive, marker) {
  htmlLines = htmlLines.slice(0, htmlStart - 1).concat([marker], htmlLines.slice(htmlEndInclusive));
}

const slices = [
  { id: '10H-4A-d', htmlStart: 4539, htmlEnd: 4605 },
  { id: '10H-4A-c', htmlStart: 3880, htmlEnd: 4249 },
  { id: '10H-4A-b', htmlStart: 3564, htmlEnd: 3868 },
  { id: '10H-4A-a', htmlStart: 2468, htmlEnd: 2542 },
];

const existingHud = fs.readFileSync(hudPath, 'utf8');
const headerEnd = existingHud.indexOf("'use strict';");
const existingBody = existingHud.replace(/^[\s\S]*?'use strict';\s*\n/, '').trim();

let extracted = '';
for (const s of slices) {
  const body = htmlSlice(s.htmlStart, s.htmlEnd);
  const first = body.split('\n')[0].trim().slice(0, 50);
  if (!/^function\s/.test(body.trim()) && !body.includes('function ')) {
    throw new Error(s.id + ' unexpected slice head: ' + first);
  }
  extracted += '\n\n/* --- ' + s.id + ' --- */\n' + body;
  console.log('[slice]', s.id, s.htmlEnd - s.htmlStart + 1, 'lines', first);
}

const newHud =
  "/**\n * Wheel HUD — Balík 10F + 10H-4A (prezentačná vrstva) z index-NOVY-V2.html\n" +
  ' * Závisí na: wheel-brain.js, wheel-canvas.js (qwFlowRadarSvgShell), quantum-wheel.js, styles/wheel.css\n' +
  " */\n'use strict';\n" +
  extracted +
  '\n\n/* --- 10F HUD render (existing) --- */\n' +
  existingBody +
  '\n';

fs.writeFileSync(hudPath, newHud, 'utf8');

[...slices].sort((a, b) => b.htmlStart - a.htmlStart).forEach((s) => {
  spliceHtml(s.htmlStart, s.htmlEnd, MARK);
});

const outHtml = srcPath;
fs.writeFileSync(outHtml, htmlLines.join('\n'), 'utf8');
console.log('[write]', outHtml, 'lines', htmlLines.length);
console.log('[write]', hudPath, 'bytes', fs.statSync(hudPath).size);
