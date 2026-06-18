'use strict';
const fs = require('fs');
const path = require('path');
const { extractV2InlineFromRoot } = require('./v2-inline-extract.cjs');

const root = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'index-NOVY-V2.html'), 'utf8');
const htmlLines = html.split(/\r?\n/);
const inline = extractV2InlineFromRoot(root);
const inlineLines = inline.split(/\r?\n/);
const inlineBytes = Buffer.byteLength(inline, 'utf8');

const EXTERNAL = [
  'scripts/core/constants.js', 'scripts/core/event-bus.js', 'scripts/core/state.js', 'scripts/core/helpers.js',
  'scripts/wheel/wheel-brain.js', 'scripts/wheel/quantum-wheel.js', 'scripts/wheel/wheel-canvas.js', 'scripts/wheel/wheel-hud.js',
  'scripts/ai/ai-engine.js', 'scripts/ai/confidence-engine.js', 'scripts/valid-true/valid-true-v0.js',
  'scripts/ai/lfp-engine.js', 'scripts/ai/ai-prediction.js', 'scripts/debug/engine-hub.js',
  'scripts/pattern/spin-pattern-observer.js', 'scripts/analytics/roulette-analytics.js',
  'scripts/ui/ui-alerts.js', 'scripts/ui/session-fatigue.js', 'scripts/ui/keyboard-live-ai-flow.js',
  'scripts/analytics/timing-engine.js', 'scripts/board/board-events.js', 'scripts/board/board-ui.js',
  'scripts/bootstrap/app-boot.js',
];
let extBytes = 0;
EXTERNAL.forEach((rel) => {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) extBytes += fs.statSync(p).size;
});

function lineOf(pattern) {
  for (let i = 0; i < htmlLines.length; i++) {
    if (pattern.test(htmlLines[i])) return i + 1;
  }
  return -1;
}

function span(startPat, endPat) {
  const a = lineOf(startPat);
  const b = lineOf(endPat);
  if (a < 0 || b < 0 || b <= a) return null;
  return { start: a, end: b, lines: b - a + 1 };
}

const blocks = [
  ['Predikčný flow engine (predAI + follow-up)', /^\/\* LIVE FLOW/, /^\/\* Keyboard Live AI Flow/],
  ['RNG behavior observer', /^function predCoreBehaviorEngine/, /^const SPINS_FLOW_WEIGHT/],
  ['RNG observer + render', /^const RSP_DOZEN_PAIRS/, /^function renderRngBehavior/],
  ['Pred flow engine (computeFollowUp…)', /^function predCountTransitions/, /^function computeCoreAnalysis/],
  ['Flow analyzer + komentár + AI cache', /^const COMMENT_MODEL/, /^\/\* ========== EVENT/],
  ['Event bus + spin pipeline meta', /^\/\* ========== EVENT \+ LIVE/, /^\/\* ========== SPINS ENGINE/],
  ['Spins engine (70% jadro)', /^\/\* ========== SPINS ENGINE/, /^\/\* Session Fatigue/],
  ['pipelineScore + onNewSpin + undo', /^function pipelineScorePreviousSpin/, /^\/\* AI PREDIKCIA/],
  ['Cache invalidation + pred helpers', /^let lastHotColdEngine/, /^function spin\(number\)/],
  ['AI predikcia + hot/cold + board AI', /^\/\* AI PREDIKCIA/, /^\/\* Engine Hub/],
  ['Behavior Alert Engine (BAH)', /^\/\* BEHAVIOR ALERT/, /^\/\* FLOW PRESSURE/],
  ['Flow pressure + board scoring', /^\/\* FLOW PRESSURE/, /^\/\* =====.*PATTERN/],
  ['Pattern / clusters / entropy stats', /^\/\* =====.*ENTROPY|^function entropy/, /^\/\* KVANTOVÉ KOLESO/],
  ['Wheel HUD copy inline (qw*)', /^\/\* Wheel brain/, /^\/\* =====.*VISUAL/],
  ['Risk/Chaos + telemetry + strategy', /^function computeRiskChaosEngine/, /^\/\* Wheel canvas/],
  ['Strategy + accuracy render', /^\/\* =====.*ACCURACY/, /^\/\* Wheel canvas/],
  ['DEBUG renderEngineAdvancedPanels shell', /^let engineAdvancedOpen/, /^function renderLight/],
  ['renderLight + renderHeavy', /^function renderLight/, /^let clockTimer/],
  ['bindUi + boot hook', /^function bindUi/, /^<\/script>/],
];

const measured = [];
blocks.forEach(([name, s, e]) => {
  const sp = span(s, e);
  if (sp) measured.push({ name, ...sp });
});

// Key singles
const singles = [
  ['renderLight', /^function renderLight/, /^function renderHeavy/],
  ['renderHeavy', /^function renderHeavy/, /^let clockTimer/],
  ['renderEngineAdvancedPanels', /^function renderEngineAdvancedPanels/, /^function computeLiveDataState/],
  ['pipelineScorePreviousSpin', /^function pipelineScorePreviousSpin/, /^function onNewSpin/],
  ['onNewSpin', /^function onNewSpin/, /^function onUndoSpin/],
  ['invalidatePredCache', /^function invalidatePredCache/, /^function invalidateWheelCache/],
  ['computeStrategyEngine', /^function computeStrategyEngine/, /^function renderStrategy/],
  ['scheduleWheelRender block', /^function scheduleWheelRender/, /^\/\* =====.*CACHE/],
];
singles.forEach(([name, s, e]) => {
  const sp = span(s, e);
  if (sp) measured.push({ name: '→ ' + name, ...sp });
});

measured.sort((a, b) => b.lines - a.lines);

console.log(JSON.stringify({
  v2Bytes: fs.statSync(path.join(root, 'index-NOVY-V2.html')).size,
  inlineLines: inlineLines.length,
  inlineBytes,
  extBytes,
  extCount: EXTERNAL.length,
  modularPct: Math.round((extBytes / (extBytes + inlineBytes)) * 1000) / 10,
  top: measured.slice(0, 15),
}, null, 2));
