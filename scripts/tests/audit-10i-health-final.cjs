'use strict';
const fs = require('fs');
const path = require('path');
const { extractV2InlineFromRoot } = require('./v2-inline-extract.cjs');

const root = path.join(__dirname, '..', '..');
const v2Path = path.join(root, 'index-NOVY-V2.html');
const v2 = fs.readFileSync(v2Path, 'utf8');
const inlineJs = extractV2InlineFromRoot(root);
const inlineLines = inlineJs.split(/\r?\n/);

function fnSpans(srcLines) {
  const spans = [];
  for (let i = 0; i < srcLines.length; i++) {
    const m = srcLines[i].match(/^function\s+([a-zA-Z0-9_$]+)\s*\(/);
    if (m) spans.push({ name: m[1], start: i + 1, end: null });
  }
  for (let s = 0; s < spans.length; s++) {
    const startIdx = spans[s].start - 1;
    const endIdx = s + 1 < spans.length ? spans[s + 1].start - 2 : srcLines.length - 1;
    spans[s].end = endIdx + 1;
    spans[s].loc = endIdx - startIdx + 1;
  }
  return spans;
}

const spans = fnSpans(inlineLines);
const scripts = [...v2.matchAll(/<script\s+src="([^"?]+)/g)].map((m) => m[1]);

const modBytes = scripts.reduce((sum, rel) => {
  const p = path.join(root, rel.replace(/\//g, path.sep));
  return sum + (fs.existsSync(p) ? fs.statSync(p).size : 0);
}, 0);

const allScripts = fs.readdirSync(path.join(root, 'scripts'), { recursive: true })
  .filter((f) => typeof f === 'string' && f.endsWith('.js') && !f.includes('_test') && !f.includes('_legacy'))
  .map((f) => 'scripts/' + f.replace(/\\/g, '/'));
const loaded = new Set(scripts.map((s) => s.split('?')[0]));
const notLoaded = allScripts.filter((s) => !loaded.has(s));

const legacyFiles = [];
function walkLegacy(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkLegacy(p);
    else if (ent.name.endsWith('.js')) legacyFiles.push(p.replace(/\\/g, '/'));
  }
}
walkLegacy(path.join(root, 'scripts/_legacy'));

// duplicate authority checks
const dupes = [];
if (/function computeHotColdEngine\s*\(/.test(fs.readFileSync(path.join(root, 'scripts/ai/ai-engine.js'), 'utf8'))
  && /function getWeightedNumberScores\s*\(/.test(fs.readFileSync(path.join(root, 'scripts/ai/pred-dashboard.js'), 'utf8')))
  dupes.push('HOT/COLD: computeHotColdEngine (ai-engine) + helpers/cache (pred-dashboard) + inline hotColdForWindow/renderHotCold');
if (/function computeRiskChaosCore\s*\(/.test(fs.readFileSync(path.join(root, 'scripts/ai/ai-engine.js'), 'utf8'))
  && /function computeRiskChaosEngine\s*\(/.test(inlineJs))
  dupes.push('Risk/Chaos: computeRiskChaosCore (ai-engine/gate) + computeRiskChaosEngine facade (V2 inline)');
if (/function runSpinsEnginePipeline\s*\(/.test(fs.readFileSync(path.join(root, 'scripts/ai/ai-engine.js'), 'utf8')))
  dupes.push('Spins pipeline: runSpinsEnginePipeline (ai-engine) + onNewSpin orchestrator (V2 inline)');

// possibly dead inline functions (only definition in inline, no call in full bundle)
let bundle = inlineJs;
for (const rel of scripts) {
  const p = path.join(root, rel.replace(/\//g, path.sep));
  if (fs.existsSync(p)) bundle += '\n' + fs.readFileSync(p, 'utf8');
}
const deadCandidates = [];
for (const sp of spans) {
  const defRe = new RegExp('function\\s+' + sp.name + '\\s*\\(');
  const callRe = new RegExp('\\b' + sp.name + '\\s*\\(', 'g');
  const calls = (bundle.match(callRe) || []).length - (bundle.match(defRe) || []).length;
  if (calls <= 0 && !['onNewSpin', 'onUndoSpin', 'renderLight', 'renderHeavy', 'bindUi', 'spin'].includes(sp.name))
    deadCandidates.push({ name: sp.name, loc: sp.loc });
}

const authorities = [
  'Gate', 'TRUE VALID', 'Wheel brain', 'Wheel canvas', 'Wheel sector intel', 'Wheel HUD',
  'Wheel flow (inline)', 'Pattern Observer', 'Keyboard Flow', 'Session Fatigue', 'Bootstrap',
  'Engine Hub', 'Strategy', 'Pressure', 'Visual Heat', 'Telemetry', 'Pred dashboard',
  'AI prediction', 'Risk/Chaos facade (inline)', 'Risk core (ai-engine)', 'HOT/COLD split',
  'Spin orchestrator (inline)', 'Render orchestrator (inline)', 'DEBUG shell (inline)',
];

const report = {
  timestamp: new Date().toISOString(),
  v2: { bytes: v2.length, lines: v2.split(/\n/).length, htmlOnly: true },
  inlineJs: { bytes: inlineJs.length, lines: inlineLines.length, functions: spans.length },
  externalModules: { count: scripts.length, bytes: modBytes, list: scripts },
  modularizationPct: Math.round((modBytes / (modBytes + inlineJs.length)) * 1000) / 10,
  techDebtPct: Math.round((inlineJs.length / (modBytes + inlineJs.length)) * 1000) / 10,
  legacyModuleCount: legacyFiles.length,
  legacyFiles,
  notLoadedProductionJs: notLoaded.filter((s) => !s.includes('extract-10h') && !s.endsWith('.cjs')),
  runtimeAuthorityCount: authorities.length,
  runtimeAuthorities: authorities,
  top20InlineFunctions: spans.sort((a, b) => b.loc - a.loc).slice(0, 20).map((s) => ({ name: s.name, loc: s.loc })),
  duplicateAuthorities: dupes,
  deadCodeCandidates: deadCandidates.sort((a, b) => b.loc - a.loc).slice(0, 25),
  spinPipelineSectionLines: (() => {
    const htmlLines = v2.split(/\r?\n/);
    const a = htmlLines.findIndex((l) => l.includes('EVENT + LIVE SPIN PIPELINE'));
    const b = htmlLines.findIndex((l, i) => i > a && /^function clearSessionData/.test(l));
    return b > a ? b - a : 0;
  })(),
};

const out = path.join(__dirname, 'reports', 'audit-10i-health-final.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
