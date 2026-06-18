'use strict';
const fs = require('fs');
const path = require('path');
const { extractV2InlineFromRoot } = require('./v2-inline-extract.cjs');

const root = path.join(__dirname, '..', '..');
const inline = extractV2InlineFromRoot(root);
const lines = inline.split(/\n/);
const v2 = fs.readFileSync(path.join(root, 'index-NOVY-V2.html'), 'utf8');
const allScripts = [...v2.matchAll(/<script\s+src="([^"?]+)/g)].map((m) => m[1]);

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

function countCallers(name, text) {
  const callRe = new RegExp('\\b' + name + '\\s*\\(', 'g');
  const defRe = new RegExp('function\\s+' + name + '\\s*\\(');
  return Math.max(0, (text.match(callRe) || []).length - (text.match(defRe) || []).length);
}

const spans = fnSpans(lines);
const modBytes = allScripts.reduce((sum, rel) => {
  const p = path.join(root, rel.replace(/\//g, path.sep));
  return sum + (fs.existsSync(p) ? fs.statSync(p).size : 0);
}, 0);

const extra = ['scripts/bootstrap/app-boot.js', 'scripts/ai/pred-dashboard.js', 'scripts/board/board-events.js']
  .map((rel) => fs.readFileSync(path.join(root, rel), 'utf8'))
  .join('\n');
const bundle = inline + '\n' + extra;

const TARGETS = [
  'renderLight', 'renderHeavy', 'onNewSpin', 'onUndoSpin',
  'computeSpinCore', 'computeVisualCore', 'computeTimingCore',
  'computeWheelPressureEngine', 'computeWheelFlowEngine',
  'computeStrategyEngine', 'computeAIPredictionEngine',
  'pipelineScorePreviousSpin', 'collectEngineTelemetrySignals',
  'computeTelemetryEngine', 'scheduleWheelRender', 'flushWheelRender',
  'getWheelMigrationDirection', 'computeRiskChaosEngine',
  'runSpinsEnginePipeline', 'renderEngineAdvancedPanels',
  'renderCorePrediction', 'renderSpinEngine', 'bindUi', 'clearSessionData',
  'computeSpinAIComment', 'computeFlowAnalyzer', 'renderRiskChaos',
];

const report = {
  v2Bytes: v2.length,
  inlineBytes: inline.length,
  inlineLines: lines.length,
  inlineFunctions: spans.length,
  externalModuleCount: allScripts.length,
  externalModulesBytes: modBytes,
  modularizationPct: Math.round((modBytes / (modBytes + inline.length)) * 1000) / 10,
  inlinePct: Math.round((inline.length / (modBytes + inline.length)) * 1000) / 10,
  targets: TARGETS.map((name) => {
    const sp = spans.find((s) => s.name === name);
    return { name, loc: sp ? sp.loc : 0, callers: countCallers(name, bundle) };
  }),
  top15: spans.filter((s) => s.loc >= 100).sort((a, b) => b.loc - a.loc).slice(0, 15)
    .map((s) => ({ name: s.name, loc: s.loc, callers: countCallers(s.name, bundle) })),
  over100Count: spans.filter((s) => s.loc >= 100).length,
};

console.log(JSON.stringify(report, null, 2));
