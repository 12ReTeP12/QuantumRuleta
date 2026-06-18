'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const v2Path = path.join(root, 'index-NOVY-V2.html');
const v2 = fs.readFileSync(v2Path, 'utf8');
const lines = v2.split(/\r?\n/);

const inlineStart = lines.findIndex((l) => l.includes('/* QRP7-V2 · ANALYZÉR TOKU'));
const inlineEnd = lines.findIndex((l, i) => i > inlineStart && l.trim() === '</script>');
const inline = lines.slice(inlineStart, inlineEnd);
const inlineText = inline.join('\n');

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

const spans = fnSpans(inline);
const allScripts = [...v2.matchAll(/<script\s+src="([^"?]+)/g)].map((m) => m[1]);

function countCallers(name, text) {
  const defRe = new RegExp('function\\s+' + name + '\\s*\\(');
  const callRe = new RegExp('\\b' + name + '\\s*\\(', 'g');
  const matches = text.match(callRe) || [];
  const defs = (text.match(defRe) || []).length;
  return Math.max(0, matches.length - defs);
}

const TARGETS = [
  'renderLight', 'renderHeavy', 'onNewSpin', 'onUndoSpin',
  'computeSpinCore', 'computeVisualCore', 'computeTimingCore',
  'computeWheelPressureEngine', 'computeWheelFlowEngine',
  'computeStrategyEngine', 'computeAIPredictionEngine',
  'pipelineScorePreviousSpin', 'invalidatePredCache',
  'collectEngineTelemetrySignals', 'computeTelemetryEngine',
  'scheduleWheelRender', 'flushWheelRender',
  'getWheelMigrationDirection', 'computeRiskChaosEngine',
  'runSpinsEnginePipeline', 'scoreCluster',
];

const targetReport = TARGETS.map((name) => {
  const sp = spans.find((s) => s.name === name);
  return {
    name,
    loc: sp ? sp.loc : 0,
    found: !!sp,
    callers: countCallers(name, inlineText + '\n' + fs.readFileSync(path.join(root, 'scripts/ai/pred-dashboard.js'), 'utf8')),
  };
});

const bigBlocks = spans.filter((s) => s.loc >= 100).sort((a, b) => b.loc - a.loc);

// Section heuristics by comment markers
const markers = [];
inline.forEach((l, i) => {
  if (/^\/\* ={3,}/.test(l.trim()) || /^\/\* [A-Z0-9]/.test(l.trim())) markers.push({ line: i + 1, text: l.trim().slice(0, 80) });
});

const modBytes = allScripts.reduce((sum, rel) => {
  const p = path.join(root, rel.replace(/\//g, path.sep));
  return sum + (fs.existsSync(p) ? fs.statSync(p).size : 0);
}, 0);

const report = {
  v2Bytes: v2.length,
  v2Lines: lines.length,
  inlineLines: inline.length,
  inlineFunctions: spans.length,
  externalModuleCount: allScripts.length,
  externalModulesBytes: modBytes,
  modularizationPct: Math.round((modBytes / (modBytes + inlineText.length)) * 1000) / 10,
  inlinePct: Math.round((inlineText.length / (modBytes + inlineText.length)) * 1000) / 10,
  targets: targetReport,
  top15Functions: bigBlocks.slice(0, 15).map((s) => ({
    name: s.name,
    loc: s.loc,
    startLine: inlineStart + s.start,
    callers: countCallers(s.name, inlineText),
  })),
  allOver100: bigBlocks.length,
};

const outPath = path.join(__dirname, 'reports', 'audit-10h5-monolith.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
