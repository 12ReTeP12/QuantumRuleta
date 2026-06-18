'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'index-NOVY-V2.html');
const outPath = path.join(root, 'scripts/strategy/strategy-engine.js');
const MARK = '/* Strategy engine → scripts/strategy/strategy-engine.js (10H-5) */';
const SCRIPT = '<script src="scripts/strategy/strategy-engine.js"></script>';
const INSERT_AFTER = '<script src="scripts/ai/ai-prediction.js"></script>';

if (!fs.existsSync(srcPath)) throw new Error('missing index-NOVY-V2.html');
let htmlLines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

function htmlSlice(htmlStart, htmlEndInclusive) {
  return htmlLines.slice(htmlStart - 1, htmlEndInclusive).join('\n');
}

function spliceHtml(htmlStart, htmlEndInclusive, marker) {
  htmlLines = htmlLines.slice(0, htmlStart - 1).concat([marker], htmlLines.slice(htmlEndInclusive));
}

const skIdx = htmlLines.findIndex((l) => /^function skStrategyMode/.test(l));
if (skIdx < 0) throw new Error('skStrategyMode not found');

const mainSlice = htmlSlice(3462, 3607);
const skSlice = htmlLines[skIdx];

const moduleSrc =
  "/**\n * Strategy Engine — Balík 10H-5 z index-NOVY-V2.html\n" +
  ' * Závisí na: pred-dashboard, ai-prediction, timing-engine (runtime), V2 inline (risk chaos)\n' +
  " */\n'use strict';\n\n" +
  skSlice +
  '\n\n' +
  mainSlice +
  '\n';

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, moduleSrc, 'utf8');

spliceHtml(3462, 3607, MARK);
htmlLines.splice(skIdx, 1, MARK);

let html = htmlLines.join('\n');
if (!html.includes(SCRIPT)) {
  html = html.replace(INSERT_AFTER, INSERT_AFTER + '\n' + SCRIPT);
}
fs.writeFileSync(srcPath, html, 'utf8');
console.log('[write]', outPath, fs.statSync(outPath).size, 'bytes');
console.log('[write]', srcPath, html.split(/\n/).length, 'lines');
