'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const v2Path = path.join(root, 'index-NOVY-V2.html');
const v2 = fs.readFileSync(v2Path, 'utf8');

const htmlIds = [...v2.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
const getIds = [...v2.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map((m) => m[1]);
const queryIds = [...v2.matchAll(/querySelector\(["']#([^"']+)["']\)/g)].map((m) => m[1]);
const used = new Set([...getIds, ...queryIds]);
const htmlSet = new Set(htmlIds);
const dynamicOk = (id) => id.startsWith('grid-') || id.startsWith('qw');
const missingInHtml = [...used].filter((id) => !htmlSet.has(id) && !dynamicOk(id));
const neverReferenced = [...htmlSet].filter(
  (id) => !used.has(id) && !['wheelCanvas', 'qwFlowRadarSvg', 'qwFlowBeams', 'qwFlowSectorLabels', 'qwFlowGlow', 'v2-layout-last', 'kbFlowAnomaly'].includes(id)
);

const scripts = [...v2.matchAll(/<script src=["']([^"']+)["']/g)].map((m) => m[1]);
const inlineBlocks = v2.split(/<script(?:\s[^>]*)?>/).length - 1;

const funcs = [...v2.matchAll(/^function ([a-zA-Z0-9_$]+)/gm)].map((m) => m[1]);
const funcCalls = new Set();
for (const f of funcs) {
  const re = new RegExp('\\b' + f.replace(/\$/g, '\\$') + '\\s*\\(', 'g');
  const matches = v2.match(re) || [];
  if (matches.length <= 1) funcCalls.add(f); // only definition
}

const hiddenEls = [...v2.matchAll(/id=["']([^"']+)["'][^>]*style=["']display:\s*none/gi)].map((m) => m[1]);

// External modules not loaded by V2
const allScripts = fs.readdirSync(path.join(root, 'scripts'), { recursive: true })
  .filter((f) => typeof f === 'string' && f.endsWith('.js') && !f.includes('_test'))
  .map((f) => 'scripts/' + f.replace(/\\/g, '/'));
const loaded = new Set(scripts);
const notLoaded = allScripts.filter((s) => !loaded.has(s) && !s.includes('tests'));

// Compare spin-pattern-observer.js vs inline
const spoFile = fs.readFileSync(path.join(root, 'scripts/pattern/spin-pattern-observer.js'), 'utf8');
const spoInline = v2.match(/function computeSpinPatternObserver\(\)\{[\s\S]*?\n\}/);
const spoFileFns = [...spoFile.matchAll(/^function ([a-zA-Z0-9_]+)/gm)].map((m) => m[1]);

// V4 sync
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const mainJs = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

const report = {
  file: { bytes: v2.length, lines: v2.split(/\n/).length },
  htmlIds: htmlIds.length,
  getElementById: getIds.length,
  inlineFunctions: funcs.length,
  possiblyUnusedFunctions: [...funcCalls].filter((f) => !f.startsWith('boot') && f !== 'createBoard').slice(0, 80),
  possiblyUnusedCount: funcCalls.size,
  missingDomIds: missingInHtml,
  htmlIdsNeverReferenced: neverReferenced,
  hiddenInDom: hiddenEls,
  externalScriptsLoaded: scripts,
  externalScriptsNotLoaded: notLoaded,
  inlineScriptBlocks: inlineBlocks,
  patternObserver: {
    inlineInV2: !!spoInline,
    externalFileFunctions: spoFileFns.length,
    duplicateRisk: 'computeSpinPatternObserver is INLINE in V2; scripts/pattern/spin-pattern-observer.js NOT loaded',
  },
  electron: {
    packageMain: pkg.main,
    packageDesc: pkg.description,
    mainLoadsIndexHtml: mainJs.includes('index.html'),
    mainMentionsV2: mainJs.includes('V2') || mainJs.includes('NOVY-V2'),
  },
  renderHeavy: v2.includes('function renderHeavy(){') && v2.includes('renderEngineAdvancedPanels();'),
  heavyInterval: (v2.match(/HEAVY_RENDER_INTERVAL=(\d+)/) || [])[1],
};

console.log(JSON.stringify(report, null, 2));
