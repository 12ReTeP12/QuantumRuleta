/**
 * Kompletný hĺbkový test V2 — syntax, importy, moduly, UI, integrácia
 * Spustenie: npm run test:v2:master
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { app, BrowserWindow } = require('electron');
const { extractV2InlineFromRoot } = require('./v2-inline-extract.cjs');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V2.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const STYLES = ['styles/main.css', 'styles/ai.css', 'styles/wheel.css'];
const MODULES = [
  'scripts/core/constants.js',
  'scripts/core/state.js',
  'scripts/core/helpers.js',
  'scripts/wheel/quantum-wheel.js',
  'scripts/wheel/wheel-canvas.js',
  'scripts/wheel/wheel-hud.js',
  'scripts/wheel/wheel-flow-panel.js',
  'scripts/ai/ai-engine.js',
  'scripts/ai/confidence-engine.js',
  'scripts/valid-true/valid-true-v0.js',
  'scripts/ai/lfp-engine.js',
  'scripts/ai/pred-flow-engine.js',
  'scripts/ai/pred-dashboard.js',
  'scripts/wheel/wheel-sector-intel.js',
  'scripts/wheel/wheel-brain.js',
  'scripts/ai/ai-prediction.js',
  'scripts/strategy/strategy-engine.js',
  'scripts/analytics/pressure-engine.js',
  'scripts/analytics/visual-heat-engine.js',
  'scripts/analytics/telemetry-engine.js',
  'scripts/debug/engine-hub.js',
  'scripts/analytics/bah-engine.js',
  'scripts/analytics/hot-cold-engine.js',
  'scripts/analytics/raw-stats-engine.js',
  'scripts/analytics/statistics-panel.js',
  'scripts/analytics/session-stats.js',
  'scripts/analytics/patterns-panel.js',
  'scripts/analytics/risk-chaos-panel.js',
  'scripts/analytics/persistence-engine-panel.js',
  'scripts/analytics/roulette-analytics.js',
  'scripts/ui/ui-alerts.js',
  'scripts/ui/session-fatigue.js',
  'scripts/ui/keyboard-live-ai-flow.js',
  'scripts/bootstrap/app-boot.js',
  'scripts/pattern/spin-pattern-observer.js',
  'scripts/pattern/spin-binary-pattern-observer.js',
  'scripts/analytics/timing-engine.js',
  'scripts/board/board-events.js',
  'scripts/board/board-ui.js',
  'scripts/analytics/zber-dat-0-36.js',
  'scripts/analytics/zber-dat-0-36-xlsx.js',
  'scripts/analytics/zber-dat-0-36-ui.js',
];

const MODULE_EXPORTS = {
  'scripts/core/constants.js': ['wheel', 'reds', 'RED_NUMBERS', 'DOZENS', 'COLUMNS'],
  'scripts/core/state.js': ['spins', 'sessionState', 'spinTimes'],
  'scripts/core/helpers.js': ['getColor', 'getDozen', 'getColumn', 'normalize', 'clamp', 'average'],
  'scripts/wheel/quantum-wheel.js': ['qwAnalyzeWheelFlow', 'qwResolvePriority', 'qwFlowStateSimple'],
  'scripts/wheel/wheel-brain.js': [
    'computeQuantumWheelBrain',
    'computeQwFlowScanner',
    'invalidateQuantumWheelBrainCache',
    'resetQwWheelSessionState',
  ],
  'scripts/ai/ai-engine.js': ['computeLiveFlowPredictionAI', 'lfpInvalidate', 'buildAIPredictionPanelHTML'],
  'scripts/ai/lfp-engine.js': ['lfpFlowStabilityScore', 'lfpExplainSignal'],
  'scripts/ai/pred-flow-engine.js': [
    'predCoreBehaviorEngine',
    'computeFollowUpFlowEngine',
    'computeCoreAnalysis',
    'MODEL',
  ],
  'scripts/ai/pred-dashboard.js': ['invalidatePredCache', 'computeHotColdEngine', 'computeInvisibleEngines', 'invalidateWheelCache'],
  'scripts/wheel/wheel-sector-intel.js': [
    'computeWheelSectorIntel',
    'getSectorAnalysis',
    'invalidateWheelSectorIntelCache',
    'getWheelSectorStats',
    'scoreWheelSectorSpinCore',
  ],
  'scripts/ai/ai-prediction.js': ['computeAIPrediction'],
  'scripts/strategy/strategy-engine.js': [
    'computeStrategyEngine',
    'invalidateStrategyCache',
    'renderStrategy',
    'renderAccuracy',
    'skStrategyMode',
  ],
  'scripts/analytics/pressure-engine.js': [
    'computeWheelPressureEngine',
    'invalidateWheelPressureCache',
    'renderPressure',
  ],
  'scripts/analytics/visual-heat-engine.js': [
    'computeVisualHeatEngine',
    'invalidateVisualHeatCache',
    'renderHeatmap',
  ],
  'scripts/analytics/telemetry-engine.js': [
    'collectEngineTelemetrySignals',
    'computeTelemetryEngine',
    'invalidateTelemetryCache',
    'renderTelemetry',
    'computeEngineSynchronization',
    'computeSignalQuality',
    'computeConfidenceStability',
    'computeLiveAIState',
    'skEngineName',
  ],
  'scripts/analytics/bah-engine.js': ['computeBehaviorAlerts', 'computeAlertHub', 'bahResetSession'],
  'scripts/analytics/hot-cold-engine.js': [
    'renderHotCold',
    'hcBuildFromSpins',
    'hcCountSpins',
    'hcRebuildSpinRecordsFromHistory',
    'hcHumanHotHint',
  ],
  'scripts/analytics/raw-stats-engine.js': [
    'computeRawStatsEngine',
    'buildComboMixStatsHTML',
    'rawSpinCounts',
    'computeComboMixStats',
    'countColorStats',
    'countEvenOdd',
    'countHighLow',
  ],
  'scripts/analytics/statistics-panel.js': ['renderStatsPanel', 'computeStatsRetroEngine', 'bindStatsExportBtn'],
  'scripts/analytics/session-stats.js': ['entropy', 'getClusters', 'updateStats', 'computePatternEngine'],
  'scripts/analytics/patterns-panel.js': ['renderPatterny', 'renderClusters', 'renderNeighbors'],
  'scripts/analytics/risk-chaos-panel.js': ['renderRiskChaos', 'renderPersistence', 'renderChaos'],
  'scripts/analytics/persistence-engine-panel.js': ['renderPersistencePanel', 'computePersistenceEnginePanel'],
  'scripts/analytics/roulette-analytics.js': ['computeRouletteObserverUI'],
  'scripts/analytics/timing-engine.js': ['computeTimingEngine', 'renderTimingPanel'],
  'scripts/ui/ui-alerts.js': ['renderAlerts', 'renderAlertSystem', 'buildAlertsHTML'],
  'scripts/ui/session-fatigue.js': ['computeSessionFatigueAnalysis', 'renderSessionFatigue'],
  'scripts/ui/keyboard-live-ai-flow.js': ['renderKeyboardLiveAIFlow', 'computeKeyboardLiveAIFlow'],
  'scripts/pattern/spin-pattern-observer.js': [
    'computeSpinPatternObserver',
    'renderSpinPatternObserver',
    'renderTuctyStlpceTip',
    'tsModuleScoreSpin',
    'tsModuleUpdateRecommendation',
  ],
  'scripts/pattern/spin-binary-pattern-observer.js': [
    'computeSpinBinaryPattern',
    'renderSpinBinaryPatternObserver',
    'bindSbpoTabs',
  ],
  'scripts/board/board-ui.js': ['renderBoard', 'renderKeyboard', 'buildBoardHTML'],
  'scripts/board/board-events.js': ['bindBoardEvents', 'handleBoardClick'],
  'scripts/bootstrap/app-boot.js': [
    'bootApp',
    'initBoard',
    'initWheel',
    'initAI',
    'bindSpinEventBusListeners',
    'createBoard',
  ],
  'scripts/wheel/wheel-canvas.js': [
    'renderCanvasWheel',
    'qwSyncWheelStageSize',
    'qwBindWheelResize',
    'qwStartCanvasAnim',
    'qwStopCanvasAnim',
    'drawQwVzorWheelInner',
  ],
  'scripts/debug/engine-hub.js': [
    'getClusterSuccessRatePct',
    'renderEngineHub',
    'buildEngineHub',
    'computeEngineHubState',
    'featureHtml',
  ],
  'scripts/wheel/wheel-hud.js': [
    'renderWheelRadar',
    'buildQuantumWheelLeftHTML',
    'buildQuantumWheelRightHTML',
    'buildQuantumWheelBottomHTML',
    'buildQuantumWheelModelFootHTML',
    'qwHudShort',
    'ensureQuantumWheelDashboardDOM',
    'qwResolveHudCopy',
    'qwColorState',
    'qwEdgeHeroStatus',
    'skQw',
    'skWheelUserText',
    'qwColDozStats',
    'qwPlayerVoice',
    'buildQwLiveOutputHTML',
    'buildQwTrailHTML',
    'qwHeroMetric',
    'qwMetric',
  ],
  'scripts/wheel/wheel-flow-panel.js': ['renderWheelFlow', 'renderMigration', 'renderMomentum'],
};

const V2_INLINE_SYMBOLS = [];

let failed = 0;
let warned = 0;
const errors = [];
const warnings = [];

const ok = (m) => console.log('OK:', m);
const fail = (m) => { console.error('FAIL:', m); failed++; errors.push(m); };
const warn = (m) => { console.warn('WARN:', m); warned++; warnings.push(m); };

function checkCssBraces(file) {
  const css = fs.readFileSync(path.join(root, file), 'utf8');
  let depth = 0;
  let inStr = false;
  let ch = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (!inStr && (c === '"' || c === "'")) { inStr = c; continue; }
    if (inStr) { if (c === inStr && css[i - 1] !== '\\') inStr = false; continue; }
    if (c === '{') depth++;
    if (c === '}') depth--;
    if (depth < 0) return 'extra }';
  }
  if (depth !== 0) return 'unbalanced braces depth=' + depth;
  return null;
}

console.log('\n=== SYNTAX ===\n');
MODULES.forEach((rel) => {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) { fail('chýba súbor: ' + rel); return; }
  try {
    execSync('node --check "' + p + '"', { stdio: 'pipe' });
    ok('JS syntax: ' + rel);
  } catch (e) {
    fail('JS syntax: ' + rel + ' — ' + (e.stderr || e.message));
  }
});

const inlineJs = extractV2InlineFromRoot(root);
if (!inlineJs) fail('inline <script> bloky nenájdené');
else {
  const tmp = path.join(root, '_test_master_inline.js');
  fs.writeFileSync(tmp, inlineJs);
  try {
    execSync('node --check "' + tmp + '"', { stdio: 'pipe' });
    ok('JS syntax: index-NOVY-V2.html (inline)');
  } catch (e) {
    fail('JS syntax inline — ' + (e.stderr || e.message));
  }
  fs.unlinkSync(tmp);
}

STYLES.forEach((rel) => {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) { fail('chýba CSS: ' + rel); return; }
  const err = checkCssBraces(rel);
  if (err) fail('CSS ' + rel + ': ' + err);
  else ok('CSS braces OK: ' + rel);
});

console.log('\n=== HTML / IMPORTY ===\n');
if (!/<!DOCTYPE html>/i.test(html)) warn('HTML: chýba DOCTYPE');
else ok('HTML DOCTYPE');
if (!html.includes('<html lang="sk"')) warn('HTML: lang sk');
else ok('HTML lang=sk');

const scriptSrcs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);
scriptSrcs.forEach((src) => {
  const clean = src.split('?')[0];
  const p = path.join(root, clean.replace(/\//g, path.sep));
  if (!fs.existsSync(p)) fail('import chýba na disku: ' + src);
  else ok('script src: ' + src);
});
MODULES.forEach((rel) => {
  const norm = rel.replace(/\\/g, '/');
  if (!scriptSrcs.some((s) => s.split('?')[0] === norm)) fail('modul nie je v HTML: ' + norm);
});

STYLES.forEach((rel) => {
  if (!html.includes(rel)) fail('stylesheet nie je v HTML: ' + rel);
  else ok('link css: ' + rel);
});

console.log('\n=== MODULY (súbory + symboly v kóde) ===\n');
const codeBundle = MODULES.map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n')
  + inlineJs;
Object.entries(MODULE_EXPORTS).forEach(([rel, syms]) => {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  syms.forEach((s) => {
    const inMod = new RegExp('(?:function\\s+' + s + '|(?:var|let|const)\\s+' + s + '\\s*=)').test(src)
      || src.includes(s + '=');
    const inApp = codeBundle.includes(s);
    if (!inMod && !inApp) fail(rel + ': chýba symbol ' + s);
    else ok(rel + ' · ' + s);
  });
});
if (inlineJs) {
  if (/function\s+bootApp\s*\(/.test(inlineJs)) fail('V2 inline: bootApp má byť v scripts/bootstrap/app-boot.js');
  else ok('V2 inline: bootApp nie je duplicitný');
  if (/function\s+renderWheelRadar\s*\(/.test(inlineJs))
    fail('V2 inline: renderWheelRadar má byť v scripts/wheel/wheel-hud.js');
  else ok('V2 inline: renderWheelRadar nie je duplicitný');
  if (/function\s+computeQuantumWheelBrain\s*\(/.test(inlineJs))
    fail('V2 inline: computeQuantumWheelBrain má byť v scripts/wheel/wheel-brain.js');
  else ok('V2 inline: computeQuantumWheelBrain nie je duplicitný');
  if (/function\s+computeQwFlowScanner\s*\(/.test(inlineJs))
    fail('V2 inline: computeQwFlowScanner má byť v scripts/wheel/wheel-brain.js');
  else ok('V2 inline: computeQwFlowScanner nie je duplicitný');
  if (/function\s+renderCanvasWheel\s*\(/.test(inlineJs))
    fail('V2 inline: renderCanvasWheel má byť v scripts/wheel/wheel-canvas.js');
  else ok('V2 inline: renderCanvasWheel nie je duplicitný');
  if (/function\s+qwSyncWheelStageSize\s*\(/.test(inlineJs))
    fail('V2 inline: qwSyncWheelStageSize má byť v scripts/wheel/wheel-canvas.js');
  else ok('V2 inline: qwSyncWheelStageSize nie je duplicitný');
  if (/function\s+renderEngineHub\s*\(/.test(inlineJs))
    fail('V2 inline: renderEngineHub má byť v scripts/debug/engine-hub.js');
  else ok('V2 inline: renderEngineHub nie je duplicitný');
  if (/function\s+getClusterSuccessRatePct\s*\(/.test(inlineJs))
    fail('V2 inline: getClusterSuccessRatePct má byť v scripts/debug/engine-hub.js');
  else ok('V2 inline: getClusterSuccessRatePct nie je duplicitný');
  if (/function\s+predCoreBehaviorEngine\s*\(/.test(inlineJs))
    fail('V2 inline: predCoreBehaviorEngine má byť v scripts/ai/pred-flow-engine.js');
  else ok('V2 inline: predCoreBehaviorEngine nie je duplicitný');
  if (/function\s+computeFollowUpFlowEngine\s*\(/.test(inlineJs))
    fail('V2 inline: computeFollowUpFlowEngine má byť v scripts/ai/pred-flow-engine.js');
  else ok('V2 inline: computeFollowUpFlowEngine nie je duplicitný');
  if (/function\s+invalidatePredCache\s*\(/.test(inlineJs))
    fail('V2 inline: invalidatePredCache má byť v scripts/ai/pred-dashboard.js');
  else ok('V2 inline: invalidatePredCache nie je duplicitný');
  if (/function\s+computeBehaviorAlerts\s*\(/.test(inlineJs))
    fail('V2 inline: computeBehaviorAlerts má byť v scripts/analytics/bah-engine.js');
  else ok('V2 inline: computeBehaviorAlerts nie je duplicitný');
  if (/function\s+renderStatsPanel\s*\(/.test(inlineJs))
    fail('V2 inline: renderStatsPanel má byť v scripts/analytics/statistics-panel.js');
  else ok('V2 inline: renderStatsPanel nie je duplicitný');
  if (/function\s+computeRawStatsEngine\s*\(/.test(inlineJs))
    fail('V2 inline: computeRawStatsEngine má byť v scripts/analytics/raw-stats-engine.js');
  else ok('V2 inline: computeRawStatsEngine nie je duplicitný');
  if (/function\s+rawSpinCounts\s*\(/.test(inlineJs))
    fail('V2 inline: rawSpinCounts má byť v scripts/analytics/raw-stats-engine.js');
  else ok('V2 inline: rawSpinCounts nie je duplicitný');
  if (/function\s+countColorStats\s*\(/.test(inlineJs))
    fail('V2 inline: countColorStats má byť v scripts/analytics/raw-stats-engine.js');
  else ok('V2 inline: countColorStats nie je duplicitný');
  if (/function\s+countEvenOdd\s*\(/.test(inlineJs))
    fail('V2 inline: countEvenOdd má byť v scripts/analytics/raw-stats-engine.js');
  else ok('V2 inline: countEvenOdd nie je duplicitný');
  if (/function\s+countHighLow\s*\(/.test(inlineJs))
    fail('V2 inline: countHighLow má byť v scripts/analytics/raw-stats-engine.js');
  else ok('V2 inline: countHighLow nie je duplicitný');
  if (/function\s+renderHotCold\s*\(/.test(inlineJs))
    fail('V2 inline: renderHotCold má byť v scripts/analytics/hot-cold-engine.js');
  else ok('V2 inline: renderHotCold nie je duplicitný');
  if (/function\s+hcBuildFromSpins\s*\(/.test(inlineJs))
    fail('V2 inline: hcBuildFromSpins má byť v scripts/analytics/hot-cold-engine.js');
  else ok('V2 inline: hcBuildFromSpins nie je duplicitný');
  if (/function\s+renderPatterny\s*\(/.test(inlineJs))
    fail('V2 inline: renderPatterny má byť v scripts/analytics/patterns-panel.js');
  else ok('V2 inline: renderPatterny nie je duplicitný');
  if (/function\s+renderWheelFlow\s*\(/.test(inlineJs))
    fail('V2 inline: renderWheelFlow má byť v scripts/wheel/wheel-flow-panel.js');
  else ok('V2 inline: renderWheelFlow nie je duplicitný');
  if (/function\s+renderRiskChaos\s*\(/.test(inlineJs))
    fail('V2 inline: renderRiskChaos má byť v scripts/analytics/risk-chaos-panel.js');
  else ok('V2 inline: renderRiskChaos nie je duplicitný');
  if (/function\s+renderPersistencePanel\s*\(/.test(inlineJs))
    fail('V2 inline: renderPersistencePanel má byť v scripts/analytics/persistence-engine-panel.js');
  else ok('V2 inline: renderPersistencePanel nie je duplicitný');
  if (/function\s+computePersistenceEnginePanel\s*\(/.test(inlineJs))
    fail('V2 inline: computePersistenceEnginePanel má byť v scripts/analytics/persistence-engine-panel.js');
  else ok('V2 inline: computePersistenceEnginePanel nie je duplicitný');
  [
    ['ensureQuantumWheelDashboardDOM', 'scripts/wheel/wheel-hud.js'],
    ['qwResolveHudCopy', 'scripts/wheel/wheel-hud.js'],
    ['qwColorState', 'scripts/wheel/wheel-hud.js'],
    ['skQw', 'scripts/wheel/wheel-hud.js'],
    ['skWheelUserText', 'scripts/wheel/wheel-hud.js'],
    ['qwColDozStats', 'scripts/wheel/wheel-hud.js'],
    ['buildQwLiveOutputHTML', 'scripts/wheel/wheel-hud.js'],
  ].forEach(([sym, mod]) => {
    if (new RegExp('function\\s+' + sym + '\\s*\\(').test(inlineJs))
      fail('V2 inline: ' + sym + ' má byť v ' + mod + ' (10H-4A)');
    else ok('V2 inline: ' + sym + ' nie je duplicitný (10H-4A)');
  });
  [
    ['computeWheelSectorIntel', 'scripts/wheel/wheel-sector-intel.js'],
    ['getSectorAnalysis', 'scripts/wheel/wheel-sector-intel.js'],
    ['getWheelSectorStats', 'scripts/wheel/wheel-sector-intel.js'],
    ['scoreWheelSectorSpinCore', 'scripts/wheel/wheel-sector-intel.js'],
  ].forEach(([sym, mod]) => {
    if (new RegExp('function\\s+' + sym + '\\s*\\(').test(inlineJs))
      fail('V2 inline: ' + sym + ' má byť v ' + mod + ' (10H-4B)');
    else ok('V2 inline: ' + sym + ' nie je duplicitný (10H-4B)');
  });
  if (/let lastWheelIntel=/.test(inlineJs))
    fail('V2 inline: lastWheelIntel má byť v scripts/wheel/wheel-sector-intel.js (10H-4B)');
  else ok('V2 inline: lastWheelIntel nie je duplicitný (10H-4B)');
  [
    ['computeStrategyEngine', 'scripts/strategy/strategy-engine.js'],
    ['invalidateStrategyCache', 'scripts/strategy/strategy-engine.js'],
    ['renderStrategy', 'scripts/strategy/strategy-engine.js'],
    ['renderAccuracy', 'scripts/strategy/strategy-engine.js'],
    ['skStrategyMode', 'scripts/strategy/strategy-engine.js'],
  ].forEach(([sym, mod]) => {
    if (new RegExp('function\\s+' + sym + '\\s*\\(').test(inlineJs))
      fail('V2 inline: ' + sym + ' má byť v ' + mod + ' (10H-5)');
    else ok('V2 inline: ' + sym + ' nie je duplicitný (10H-5)');
  });
  if (/let lastStrategyEngine=/.test(inlineJs))
    fail('V2 inline: lastStrategyEngine má byť v scripts/strategy/strategy-engine.js (10H-5)');
  else ok('V2 inline: lastStrategyEngine nie je duplicitný (10H-5)');
  [
    ['computeWheelPressureEngine', 'scripts/analytics/pressure-engine.js'],
    ['invalidateWheelPressureCache', 'scripts/analytics/pressure-engine.js'],
    ['renderPressure', 'scripts/analytics/pressure-engine.js'],
    ['computeVisualHeatEngine', 'scripts/analytics/visual-heat-engine.js'],
    ['invalidateVisualHeatCache', 'scripts/analytics/visual-heat-engine.js'],
    ['renderHeatmap', 'scripts/analytics/visual-heat-engine.js'],
    ['collectEngineTelemetrySignals', 'scripts/analytics/telemetry-engine.js'],
    ['computeTelemetryEngine', 'scripts/analytics/telemetry-engine.js'],
    ['invalidateTelemetryCache', 'scripts/analytics/telemetry-engine.js'],
    ['renderTelemetry', 'scripts/analytics/telemetry-engine.js'],
    ['skEngineName', 'scripts/analytics/telemetry-engine.js'],
  ].forEach(([sym, mod]) => {
    if (new RegExp('function\\s+' + sym + '\\s*\\(').test(inlineJs))
      fail('V2 inline: ' + sym + ' má byť v ' + mod + ' (10H-6)');
    else ok('V2 inline: ' + sym + ' nie je duplicitný (10H-6)');
  });
  if (/let lastWheelPressureEngine=/.test(inlineJs))
    fail('V2 inline: lastWheelPressureEngine má byť v scripts/analytics/pressure-engine.js (10H-6)');
  else ok('V2 inline: lastWheelPressureEngine nie je duplicitný (10H-6)');
  if (/let lastVisualHeatEngine=/.test(inlineJs))
    fail('V2 inline: lastVisualHeatEngine má byť v scripts/analytics/visual-heat-engine.js (10H-6)');
  else ok('V2 inline: lastVisualHeatEngine nie je duplicitný (10H-6)');
  if (/let lastTelemetryEngine=/.test(inlineJs))
    fail('V2 inline: lastTelemetryEngine má byť v scripts/analytics/telemetry-engine.js (10H-6)');
  else ok('V2 inline: lastTelemetryEngine nie je duplicitný (10H-6)');
  V2_INLINE_SYMBOLS.forEach((s) => {
    const okSym = new RegExp('(?:function\\s+' + s + '|(?:var|let|const)\\s+' + s + '\\s*=)').test(inlineJs)
      || inlineJs.includes(s + '=');
    if (!okSym) fail('V2 inline: chýba symbol ' + s);
    else ok('V2 inline · ' + s);
  });
}

app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  console.log('\n=== RUNTIME / UI / INTEGRÁCIA ===\n');
  const win = new BrowserWindow({
    show: false,
    width: 1680,
    height: 1050,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  await win.loadFile(htmlPath);
  await new Promise((r) => setTimeout(r, 2200));

  const report = await win.webContents.executeJavaScript(`(function(){
    const out = [];
    function check(name, fn, level) {
      try {
        const r = fn();
        out.push({ name, ok: !!r.ok, msg: r.msg || '', level: level || 'error' });
      } catch (e) {
        out.push({ name, ok: false, msg: e.message, level: level || 'error' });
      }
    }
    const $ = (id) => document.getElementById(id);

    check('board #board + klávesnica', () => {
      const b = document.getElementById('board');
      return b && b.querySelectorAll('.bet.num').length >= 36
        ? { ok: true, msg: b.querySelectorAll('.bet.num').length + ' čísel' }
        : { ok: false, msg: 'board' };
    });

    check('AI predikcia panel', () => {
      if (typeof clearSessionData === 'function') clearSessionData();
      [32,15,19,4,21,2,25,17,34,6,11,8].forEach(n => spin(n));
      renderCorePrediction && renderCorePrediction();
      const h = ($('corePrediction') || {}).innerHTML || '';
      const ok1 = h.includes('lfp-human') || h.includes('panel-line');
      const ok2 = h.includes('FLOW') || h.includes('CHAOS') || h.includes('STABILITA');
      return ok1 && ok2 && h.length > 200 ? { ok: true, msg: h.length + ' zn' } : { ok: false, msg: h.slice(0,80) };
    });

    check('Ruletový analytik', () => {
      renderAlerts();
      const h = ($('alerts') || {}).innerHTML || '';
      return h.includes('ro-observer') && h.includes('FARBA')
        ? { ok: true, msg: h.length + ' zn' } : { ok: false, msg: 'observer' };
    });

    check('Kvantové koleso + radar V1', () => {
      renderLight({ wheelImmediate: true });
      const left = ($('qwPanelLeft') || {}).innerHTML || '';
      const right = ($('qwPanelRight') || {}).innerHTML || '';
      const bottom = ($('qwPanelBottom') || {}).innerHTML || '';
      const all = left + right + bottom;
      const n = document.querySelectorAll('.qw-metric, .qw-hero-metric').length;
      const okUi = $('wheelCanvas') && all.includes('FLOW STAV')
        && (all.includes('FLOW OBSERVER') || all.includes('HLAVNÝ FLOW INSIGHT'))
        && all.includes('STOPA TOKU')
        && (all.includes('SYSTÉMOVÝ HLAS') || all.includes('LIVE KOMENTÁR'))
        && all.includes('ODPORÚČANIE') && all.includes('RIZIKO FLOW')
        && n >= 10 && !!$('qwStatusBanner');
      return okUi ? { ok: true, msg: n + ' metrík · dashboard OK' } : { ok: false, msg: 'L'+left.length+' R'+right.length+' B'+bottom.length };
    });

    check('Klávesnica Live AI Flow', () => {
      renderKeyboardLiveAIFlow();
      const p = $('kbLiveFlowPanel');
      return p ? { ok: true, msg: (p.innerHTML||'').length + ' zn' } : { ok: false, msg: 'panel' };
    });

    check('Timing panel', () => {
      renderTiming();
      const h = ($('timing') || {}).innerHTML || '';
      return h.length > 30 ? { ok: true, msg: h.length + ' zn' } : { ok: false, msg: 'timing' };
    });

    check('RNG analýza', () => {
      renderRngBehavior();
      const h = ($('rngBehaviorPanel') || {}).innerHTML || '';
      return h.length > 20 ? { ok: true, msg: h.length + ' zn' } : { ok: false, msg: 'rng' };
    });

    check('Čistý random', () => {
      if (typeof renderRandomSessionPick !== 'function') return { ok: false, msg: 'fn' };
      renderRandomSessionPick();
      return { ok: true, msg: 'OK' };
    });

    check('12 spinov — integrácia', () => {
      clearSessionData();
      const seq = [32,15,19,4,21,2,25,17,34,6,27,13];
      seq.forEach(n => spin(n));
      renderLight({ wheelImmediate: true });
      if (spins.length !== 12) return { ok: false, msg: 'spins=' + spins.length };
      const pr = computeAIPrediction();
      const O = computeRouletteObserverUI();
      const Q = computeQuantumWheelBrain();
      return pr && O && Q.ready
        ? { ok: true, msg: 'AI+observer+wheel' } : { ok: false, msg: 'engine' };
    });

    check('EventBus emit spin:add', () => {
      if (typeof EventBus === 'undefined') return { ok: false, msg: 'chýba EventBus' };
      let got = null;
      const fn = (n) => { got = n; };
      EventBus.on('spin:add', fn);
      EventBus.emit('spin:add', 17);
      EventBus.off('spin:add', fn);
      return got === 17 ? { ok: true, msg: 'emit/listen OK' } : { ok: false, msg: 'got=' + got };
    });

    check('EventBus — bez duplicitných render listenerov (2A)', () => {
      if (typeof EventBus === 'undefined') return { ok: false, msg: 'chýba EventBus' };
      if (typeof bindSpinEventBusListeners === 'function') bindSpinEventBusListeners();
      const n = (EventBus.listeners['spin:add'] || []).length;
      return n === 0
        ? { ok: true, msg: '0 built-in spin:add render listenerov' }
        : { ok: false, msg: n + ' listenerov (očak. 0 po 2A)' };
    });

    check('Confidence engine chaos prahy', () => {
      if (typeof computeConfidenceEngine !== 'function') return { ok: false, msg: 'chýba engine' };
      const orig = computeRiskChaosCore;
      const cases = [
        { c: 71, status: 'ČAKAJ', conf: 0 },
        { c: 70, status: 'ČAKAJ', conf: 0 },
        { c: 55, status: 'OPATRNE' },
        { c: 30, status: 'HRAŤ' },
      ];
      for (const tc of cases) {
        computeRiskChaosCore = function() {
          return { chaosLevel: tc.c, patternReliability: 50 };
        };
        const r = computeConfidenceEngine({ spinCount: 15, flowScore: 55, patternStrength: 50 });
        if (r.status !== tc.status) {
          computeRiskChaosCore = orig;
          return { ok: false, msg: 'chaos ' + tc.c + ' → ' + r.status + ' (očak. ' + tc.status + ')' };
        }
        if (tc.conf !== undefined && r.confidence !== tc.conf) {
          computeRiskChaosCore = orig;
          return { ok: false, msg: 'chaos ' + tc.c + ' conf=' + r.confidence };
        }
      }
      computeRiskChaosCore = orig;
      return { ok: true, msg: '≥70 ČAKAJ · 50–69 OPATRNE · <50 HRAŤ' };
    });

    check('Chaos logika ČAKAJ/OPATRNE/HRAŤ', () => {
      const dec = typeof computeDecisionAction === 'function' ? computeDecisionAction() : null;
      if (!dec || !dec.label) return { ok: false, msg: 'computeDecisionAction' };
      const okL = /ČAKAJ|OPATRNE|HRAŤ|HRÁŤ|WAIT|NEHRAŤ|SLEDUJ|VÝHODA|POZORUJ|ROZCVIČKA|BEZ HRANIA/i.test(dec.label);
      return okL ? { ok: true, msg: dec.label } : { ok: false, msg: dec.label };
    });

    check('Tucty a stĺpce výstupy', () => {
      if (typeof clearSessionData === 'function') clearSessionData();
      [32,15,19,4,21,2,25,17,34,6,27,13,8,30,1].forEach(n => spin(n));
      renderAlerts();
      const O = computeRouletteObserverUI();
      const h = ($('alerts') || {}).innerHTML || '';
      const okT = O.ready && O.mainDirections && O.mainDirections.some(d => /TUCTY|TUCET|STĹPEC/i.test(d.label));
      return okT && h.includes('TUCTY') ? { ok: true, msg: 'OK' } : { ok: false, msg: (O.ready?'':'!ready ') + (h.includes('TUCTY')?'':'no TUCTY ') };
    });

    check('Flow memory / LFP', () => {
      lfpInvalidate && lfpInvalidate();
      const L = computeLiveFlowPredictionAI();
      return L && L.flowIntel ? { ok: true, msg: L.flow.state } : { ok: false, msg: 'LFP' };
    });

    check('SBPO Farba panel', () => {
      if (typeof computeSpinBinaryPattern !== 'function') return { ok: false, msg: 'computeSpinBinaryPattern' };
      [1,3,5,7,9,12].forEach(n => spin(n));
      const R = computeSpinBinaryPattern('color');
      if (!R.ready) return { ok: false, msg: '!ready' };
      sbpoActiveTab = 'color';
      renderSpinBinaryPatternObserver();
      const p = $('sbpoPanelColor');
      const h = (p || {}).innerHTML || '';
      const okGlance = h.includes('Zhrnutie — FARBA') && h.includes('Kto dominuje');
      const okPanels = h.includes('spo-step') && h.includes('Posledných 6 krokov') && h.includes('Šanca zmeny lídra');
      const spo = ($('spinPatternObserver') || {}).innerHTML || '';
      const spoOk = spo.includes('Tucty') || spo.includes('spo-wait');
      return okGlance && okPanels && spoOk ? { ok: true, msg: 'Farba F1–F11 + SPO OK' } : { ok: false, msg: 'panel HTML' };
    });

    check('SBPO Malé/Veľké panel', () => {
      if (typeof computeSpinBinaryPattern !== 'function') return { ok: false, msg: 'computeSpinBinaryPattern' };
      const R = computeSpinBinaryPattern('size');
      if (!R.ready) return { ok: false, msg: '!ready size' };
      sbpoActiveTab = 'size';
      renderSpinBinaryPatternObserver();
      const p = $('sbpoPanelSize');
      const h = (p || {}).innerHTML || '';
      const okGlance = h.includes('Zhrnutie — MALÉ A VEĽKÉ') && h.includes('Malé');
      const okPanels = h.includes('spo-step') && h.includes('Posledných 6 krokov') && h.includes('Počty v celej histórii');
      const colorP = $('sbpoPanelColor');
      const colorStill = colorP && (colorP.innerHTML || '').includes('Zhrnutie — FARBA');
      return okGlance && okPanels && colorStill ? { ok: true, msg: 'Size F1–F11 + Farba panel intact' } : { ok: false, msg: 'size panel' };
    });

    check('SBPO Párne/Nepárne panel', () => {
      if (typeof computeSpinBinaryPattern !== 'function') return { ok: false, msg: 'computeSpinBinaryPattern' };
      const R = computeSpinBinaryPattern('parity');
      if (!R.ready) return { ok: false, msg: '!ready parity' };
      sbpoActiveTab = 'parity';
      renderSpinBinaryPatternObserver();
      const p = $('sbpoPanelParity');
      const h = (p || {}).innerHTML || '';
      const okGlance = h.includes('Zhrnutie — PÁRNE A NEPÁRNE') && /Párne|Nepárne|párne|nepárne/.test(h);
      const okPanels = h.includes('spo-step') && h.includes('Šanca zmeny lídra') && h.includes('Podobný sled v minulosti');
      sbpoActiveTab = 'color';
      renderSpinBinaryPatternObserver();
      const colorOk = (($('sbpoPanelColor') || {}).innerHTML || '').includes('Zhrnutie — FARBA');
      sbpoActiveTab = 'size';
      renderSpinBinaryPatternObserver();
      const sizeOk = (($('sbpoPanelSize') || {}).innerHTML || '').includes('Zhrnutie — MALÉ A VEĽKÉ');
      return okGlance && okPanels && colorOk && sizeOk ? { ok: true, msg: 'Parity F1–F11 + Color + Size OK' } : { ok: false, msg: 'parity:'+(!okGlance?'glance ':'')+(!okPanels?'panels ':'')+(!colorOk?'color ':'')+(!sizeOk?'size':'') };
    });

    check('board click delegácia', () => {
      const btn = document.getElementById('num-17');
      if (!btn) return { ok: false, msg: 'chýba num-17' };
      const before = spins.length;
      btn.click();
      return spins.length === before + 1 ? { ok: true, msg: 'spin 17' } : { ok: false, msg: 'click' };
    });

    check('ZBER DÁT 0–36 smoke', () => {
      if (typeof zdcNewStore !== 'function' || typeof zdcOnSpin !== 'function' || typeof zdcCloseSession !== 'function') {
        return { ok: false, msg: 'chýba zdc API' };
      }
      var st = zdcNewStore();
      var i;
      for (i = 0; i < 120; i++) zdcOnSpin(st, i % 37);
      var cr = zdcCloseSession(st);
      if (!cr.ok) return { ok: false, msg: 'close fail ' + (cr.reason || '') };
      if (!st.closed.length || !st.closed[0].report) return { ok: false, msg: 'no report' };
      if (!st.closed[0].report.returnTable || !st.closed[0].report.returnHighlights) return { ok: false, msg: 'no returnTable' };
      try {
        localStorage.setItem('zdcStore_v1', JSON.stringify(st));
      } catch (e) { return { ok: false, msg: 'persist fail' }; }
      if (typeof zdcRefreshUI === 'function') zdcRefreshUI();
      if (typeof showSession === 'function') showSession();
      var rep = ($('saResultsWrap') || {}).innerHTML || '';
      var okRep = rep.includes('Návraty čísel') || rep.includes('Report session') || rep.length > 200;
      var okXlsx = typeof zdcXlsxExport !== 'undefined' && zdcXlsxExport.buildWorkbook;
      var wbOk = false;
      if (okXlsx) {
        var wb = zdcXlsxExport.buildWorkbook(st, { exportType: 'session', session: st.closed[0] });
        wbOk = wb && wb.SheetNames && wb.SheetNames.indexOf('SESSION_01') >= 0;
      }
      var undoOk = typeof zdcUndoLastSpin === 'function';
      if (undoOk) {
        zdcOnSpin(st, 0);
        var u = zdcUndoLastSpin(st);
        undoOk = u.ok && u.removed === 0;
      }
      return okRep && wbOk && undoOk
        ? { ok: true, msg: 'session+report+xlsx+undo OK' }
        : { ok: false, msg: 'rep=' + okRep + ' xlsx=' + wbOk + ' undo=' + undoOk };
    });

    return out;
  })()`);

  for (const r of report) {
    if (r.ok) ok('runtime: ' + r.name + ' — ' + r.msg);
    else if (r.level === 'warn') warn('runtime: ' + r.name + ' — ' + r.msg);
    else fail('runtime: ' + r.name + ' — ' + r.msg);
  }

  await win.destroy();

  console.log('\n=== SÚHRN ===\n');
  console.log('Chyby (' + errors.length + '):');
  errors.forEach((e) => console.log('  • ' + e));
  console.log('Varovania (' + warnings.length + '):');
  warnings.forEach((w) => console.log('  • ' + w));
  console.log('\n' + (failed ? 'MASTER TEST: ZLYHANIE' : 'MASTER TEST: OK') + ' (warn=' + warned + ')\n');
  app.exit(failed ? 1 : 0);
});

setTimeout(() => {
  console.error('FAIL: timeout');
  app.exit(1);
}, 60000);
