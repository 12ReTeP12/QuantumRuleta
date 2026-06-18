'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'index-NOVY-V2.html');
const outPath = path.join(root, 'scripts/wheel/wheel-sector-intel.js');
const MARK = '/* Wheel sector intel → scripts/wheel/wheel-sector-intel.js (10H-4B) */';

if (!fs.existsSync(srcPath)) throw new Error('missing index-NOVY-V2.html');
let htmlLines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

function htmlSlice(htmlStart, htmlEndInclusive) {
  return htmlLines.slice(htmlStart - 1, htmlEndInclusive).join('\n');
}

function spliceHtml(htmlStart, htmlEndInclusive, marker) {
  htmlLines = htmlLines.slice(0, htmlStart - 1).concat([marker], htmlLines.slice(htmlEndInclusive));
}

const slices = [
  { id: '10H-4B-b', htmlStart: 2355, htmlEnd: 2465 },
  { id: '10H-4B-a', htmlStart: 2193, htmlEnd: 2261 },
];

let body = '';
for (const s of slices) {
  const chunk = htmlSlice(s.htmlStart, s.htmlEnd);
  body += '\n\n/* --- ' + s.id + ' --- */\n' + chunk;
  console.log('[slice]', s.id, s.htmlEnd - s.htmlStart + 1, 'lines');
}

const moduleSrc =
  "/**\n * Wheel Sector Intel — Balík 10H-4B z index-NOVY-V2.html\n" +
  ' * Závisí na: pred-dashboard (computeHotColdEngine), pred-flow-engine (MODEL),\n' +
  ' * session-stats (entropy, getClusters, neighborChain), V2 inline (scoring, migration, hasMinSpins)\n' +
  " */\n'use strict';\n\n" +
  'let lastWheelIntel=null;\n' +
  "let lastWheelIntelKey='';\n" +
  'const WHEEL_SPIN_WEIGHT={history:0.22,neighbors:0.20,cluster:0.18,migration:0.15,hotCold:0.12,streak:0.05,entropy:0.08};\n\n' +
  'function invalidateWheelSectorIntelCache(){\n' +
  'lastWheelIntel=null;\n' +
  "lastWheelIntelKey='';\n" +
  '}\n' +
  body +
  '\n';

fs.writeFileSync(outPath, moduleSrc, 'utf8');

[...slices].sort((a, b) => b.htmlStart - a.htmlStart).forEach((s) => {
  spliceHtml(s.htmlStart, s.htmlEnd, MARK);
});

// Remove cache vars from inline globals (lastWheelIntel block)
const varBlock = htmlLines.findIndex((l) => l.includes('let lastWheelIntel=null'));
if (varBlock >= 0) {
  htmlLines.splice(varBlock, 3, MARK);
}

// Script order: pred-dashboard → wheel-sector-intel → wheel-brain
const brainTag = '<script src="scripts/wheel/wheel-brain.js"></script>';
const sectorTag = '<script src="scripts/wheel/wheel-sector-intel.js"></script>';
const predDash = '<script src="scripts/ai/pred-dashboard.js"></script>';

htmlLines = htmlLines.filter((l) => l.trim() !== brainTag);
let html = htmlLines.join('\n');
if (!html.includes(sectorTag)) {
  html = html.replace(
    predDash,
    predDash + '\n' + sectorTag + '\n' + brainTag
  );
}
fs.writeFileSync(srcPath, html, 'utf8');
console.log('[write]', outPath, fs.statSync(outPath).size, 'bytes');
console.log('[write]', srcPath, 'lines', html.split(/\n/).length);
