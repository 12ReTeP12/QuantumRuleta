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
const allScripts = [...v2.matchAll(/<script\s+src="([^"?]+)/g)].map((m) => m[1]);

function readAllJs() {
  let bundle = inlineJs;
  for (const rel of allScripts) {
    const p = path.join(root, rel.replace(/\//g, path.sep));
    if (fs.existsSync(p)) bundle += '\n' + fs.readFileSync(p, 'utf8');
  }
  return bundle;
}
const fullBundle = readAllJs();

function countCallers(name) {
  const defRe = new RegExp('function\\s+' + name + '\\s*\\(');
  const callRe = new RegExp('\\b' + name + '\\s*\\(', 'g');
  const inlineCalls = (inlineJs.match(callRe) || []).length - (inlineJs.match(defRe) || []).length;
  const fullCalls = (fullBundle.match(callRe) || []).length - (fullBundle.match(defRe) || []).length;
  const modCalls = fullCalls - inlineCalls;
  return { inline: Math.max(0, inlineCalls), modules: Math.max(0, modCalls), total: Math.max(0, fullCalls) };
}

function spanLoc(name) {
  const sp = spans.find((s) => s.name === name);
  return sp ? sp.loc : 0;
}

function blockLoc(fromName, toNameExclusive) {
  const a = spans.find((s) => s.name === fromName);
  const b = spans.find((s) => s.name === toNameExclusive);
  if (!a) return 0;
  const end = b ? b.start - 1 : inlineLines.length;
  return end - a.start + 1;
}

// Spin pipeline: pipelineScorePreviousSpin .. onUndoSpin inclusive + helpers in between
const pipelineFns = [
  'pipelineScorePreviousSpin', 'pipelineRecordSpin', 'persistenceEngineOnSpin', 'spinMemoryEngineOnSpin',
  'sessionModeEngineRefresh', 'aiStateRefresh', 'selfCorrectingEngineRefresh', 'futureFlowEngineRefresh',
  'performanceEngineRefresh', 'pipelineArchivePrediction', 'pipelineUpdatePredictions', 'onNewSpin', 'onUndoSpin',
];
const pipelineLoc = pipelineFns.reduce((s, n) => s + spanLoc(n), 0);

// HOT/COLD inline helpers in V2 (not ai-engine computeHotColdEngine)
const hotColdInlineFns = spans.filter((s) =>
  /hotCold|HotCold|weightedNumber|rawSpinCounts|getRecentWeighted|hotColdForWindow|scoreNumHotCold|getHotCold/i.test(s.name)
).map((s) => ({ name: s.name, loc: s.loc }));

const hotColdInlineLoc = hotColdInlineFns.reduce((s, x) => s + x.loc, 0);

// Telemetry block
const telemetryFns = [
  'collectEngineTelemetrySignals', 'computeEngineSynchronization', 'computeSignalQuality',
  'computeConfidenceStability', 'computeLiveAIState', 'computeTelemetryEngine', 'renderTelemetry',
];
const telemetryLoc = telemetryFns.reduce((s, n) => s + spanLoc(n), 0)
  + 3; // cache vars invalidateTelemetryCache

// Risk chaos block
const riskFns = [
  'computeClusterConflict', 'computeRiskChaosEngine', 'computeRiskEngine',
  'computeRiskChaosCore', 'computeSpinAIComment', 'renderRiskChaos', 'renderRisk', 'renderChaos', 'renderPersistence',
];
const riskLoc = riskFns.reduce((s, n) => s + spanLoc(n), 0);

// Predictions + related render
const predRenderLoc = spanLoc('renderPredictions');

const modBytes = allScripts.reduce((sum, rel) => {
  const p = path.join(root, rel.replace(/\//g, path.sep));
  return sum + (fs.existsSync(p) ? fs.statSync(p).size : 0);
}, 0);

const targets = [
  { id: 'Telemetry Engine', anchor: 'collectEngineTelemetrySignals', fns: telemetryFns, extraLoc: 3 },
  { id: 'Pressure Engine', anchor: 'computeWheelPressureEngine', fns: ['computeWheelPressureEngine', 'renderPressure', 'invalidateWheelPressureCache'], extraLoc: 3 },
  { id: 'computeVisualHeatEngine', anchor: 'computeVisualHeatEngine', fns: ['computeVisualHeatEngine', 'renderHeatmap', 'invalidateVisualHeatCache'], extraLoc: 3 },
  { id: 'computeRiskChaosEngine', anchor: 'computeRiskChaosEngine', fns: riskFns, extraLoc: 6 },
  { id: 'HOT/COLD inline vrstva', anchor: null, fns: hotColdInlineFns.map((x) => x.name), extraLoc: 0, customLoc: hotColdInlineLoc },
  { id: 'Predictions render', anchor: 'renderPredictions', fns: ['renderPredictions'], extraLoc: 0 },
  { id: 'Spin Pipeline', anchor: 'onNewSpin', fns: pipelineFns, extraLoc: 0, customLoc: pipelineLoc },
];

const report = {
  v2Bytes: v2.length,
  v2Lines: v2.split(/\r?\n/).length,
  inlineBytes: inlineJs.length,
  inlineLines: inlineLines.length,
  inlineFunctions: spans.length,
  externalModuleCount: allScripts.length,
  externalModulesBytes: modBytes,
  modularizationPct: Math.round((modBytes / (modBytes + inlineJs.length)) * 1000) / 10,
  inlinePct: Math.round((inlineJs.length / (modBytes + inlineJs.length)) * 1000) / 10,
  techDebtPct: Math.round((inlineJs.length / (modBytes + inlineJs.length)) * 1000) / 10,
  targets: targets.map((t) => {
    const loc = t.customLoc != null ? t.customLoc : t.fns.reduce((s, n) => s + spanLoc(n), 0) + (t.extraLoc || 0);
    const callers = {};
    t.fns.forEach((n) => { callers[n] = countCallers(n); });
    const main = t.anchor || t.fns[0];
    return {
      id: t.id,
      loc,
      mainAnchor: main,
      mainLoc: main ? spanLoc(main) : 0,
      functions: t.fns.map((n) => ({ name: n, loc: spanLoc(n), callers: countCallers(n) })),
      totalCallers: countCallers(main || t.fns[0]),
      hotColdInlineDetail: t.id.includes('HOT/COLD') ? hotColdInlineFns : undefined,
    };
  }),
  top20Inline: spans.filter((s) => s.loc >= 50).sort((a, b) => b.loc - a.loc).slice(0, 20).map((s) => ({
    name: s.name, loc: s.loc, callers: countCallers(s.name),
  })),
};

const out = path.join(__dirname, 'reports', 'audit-10h6-candidates.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
