/**
 * Komplexný hĺbkový audit V4 — syntax, funkcie, SK UI, engine panely
 * Spustenie: npm run test:v2:audit
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { app, BrowserWindow } = require('electron');
const { extractV2InlineFromRoot } = require('./v2-inline-extract.cjs');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V2.html');
const html = fs.readFileSync(htmlPath, 'utf8');
/* Balík 9A/10D/10F: moduly načítané V2; wheel HUD → wheel-hud.js; boot → app-boot.js */
const EXTERNAL_JS = [
  'scripts/core/constants.js',
  'scripts/core/event-bus.js',
  'scripts/core/state.js',
  'scripts/core/helpers.js',
  'scripts/wheel/wheel-sector-intel.js',
  'scripts/wheel/wheel-brain.js',
  'scripts/wheel/quantum-wheel.js',
  'scripts/wheel/wheel-canvas.js',
  'scripts/wheel/wheel-hud.js',
  'scripts/ai/ai-engine.js',
  'scripts/ai/confidence-engine.js',
  'scripts/valid-true/valid-true-v0.js',
  'scripts/ai/lfp-engine.js',
  'scripts/ai/pred-flow-engine.js',
  'scripts/ai/pred-dashboard.js',
  'scripts/ai/ai-prediction.js',
  'scripts/strategy/strategy-engine.js',
  'scripts/analytics/pressure-engine.js',
  'scripts/analytics/visual-heat-engine.js',
  'scripts/analytics/telemetry-engine.js',
  'scripts/debug/engine-hub.js',
  'scripts/analytics/bah-engine.js',
  'scripts/analytics/session-stats.js',
  'scripts/analytics/roulette-analytics.js',
  'scripts/ui/ui-alerts.js',
  'scripts/pattern/spin-pattern-observer.js',
  'scripts/ui/session-fatigue.js',
  'scripts/ui/keyboard-live-ai-flow.js',
  'scripts/analytics/timing-engine.js',
  'scripts/board/board-events.js',
  'scripts/board/board-ui.js',
  'scripts/bootstrap/app-boot.js',
];
let failed = 0;
const ok = (m) => console.log('OK:', m);
const fail = (m) => { console.error('FAIL:', m); failed++; };

const inlineJs = extractV2InlineFromRoot(root);
const syntaxBundle = inlineJs + EXTERNAL_JS.map((rel) => {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}).join('\n');
const jsPath = path.join(root, '_test_v4_audit_extract.js');
fs.writeFileSync(jsPath, syntaxBundle);
try {
  execSync('node --check "' + jsPath + '"', { stdio: 'pipe' });
  ok('JS syntax (inline + moduly)');
} catch (e) {
  fail('JS syntax: ' + (e.stderr || e.message));
}
fs.unlinkSync(jsPath);

const codeBundle = inlineJs + EXTERNAL_JS.map((rel) => {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}).join('\n');

const mustFns = [
  'computeLiveFlowPredictionAI', 'computeAIPrediction', 'computeBehaviorAlerts',
  'computeComboMixStats', 'renderEngineAdvancedPanels', 'renderStatsPanel',
  'renderTiming', 'renderWheelRadar', 'computeQwFlowScanner', 'skUiLabel', 'skFlow',
  'buildAIPredictionPanelHTML', 'computeRawStatsEngine', 'computeRiskChaosEngine',
  'computeVisualHeatEngine', 'computeWheelPressureEngine', 'computeHotColdEngine',
  'ensureQuantumWheelDashboardDOM', 'qwResolveHudCopy', 'qwColorState', 'skQw', 'skWheelUserText',
];
mustFns.forEach((fn) => {
  if (!codeBundle.includes('function ' + fn) && !codeBundle.includes(fn + '='))
    fail('chýba funkcia: ' + fn);
  else ok('funkcia: ' + fn);
});
const HUD_10H4A_NO_INLINE = [
  'ensureQuantumWheelDashboardDOM', 'qwResolveHudCopy', 'qwColorState', 'skQw', 'skWheelUserText',
];
HUD_10H4A_NO_INLINE.forEach((fn) => {
  if (/function\s+/.test(inlineJs) && new RegExp('function\\s+' + fn + '\\s*\\(').test(inlineJs))
    fail('V2 inline duplicita (10H-4A): ' + fn);
  else ok('10H-4A inline OK: ' + fn);
});
const SECTOR_10H4B_NO_INLINE = [
  'computeWheelSectorIntel', 'getSectorAnalysis', 'getWheelSectorStats', 'scoreWheelSectorSpinCore',
];
SECTOR_10H4B_NO_INLINE.forEach((fn) => {
  if (new RegExp('function\\s+' + fn + '\\s*\\(').test(inlineJs))
    fail('V2 inline duplicita (10H-4B): ' + fn);
  else ok('10H-4B inline OK: ' + fn);
});
const STRATEGY_10H5_NO_INLINE = [
  'computeStrategyEngine', 'invalidateStrategyCache', 'renderStrategy', 'renderAccuracy', 'skStrategyMode',
];
STRATEGY_10H5_NO_INLINE.forEach((fn) => {
  if (new RegExp('function\\s+' + fn + '\\s*\\(').test(inlineJs))
    fail('V2 inline duplicita (10H-5): ' + fn);
  else ok('10H-5 inline OK: ' + fn);
});
const DIAG_10H6_NO_INLINE = [
  'computeWheelPressureEngine', 'invalidateWheelPressureCache', 'renderPressure',
  'computeVisualHeatEngine', 'invalidateVisualHeatCache', 'renderHeatmap',
  'collectEngineTelemetrySignals', 'computeTelemetryEngine', 'invalidateTelemetryCache',
  'renderTelemetry', 'computeEngineSynchronization', 'computeSignalQuality',
  'computeConfidenceStability', 'computeLiveAIState', 'skEngineName',
];
DIAG_10H6_NO_INLINE.forEach((fn) => {
  if (new RegExp('function\\s+' + fn + '\\s*\\(').test(inlineJs))
    fail('V2 inline duplicita (10H-6): ' + fn);
  else ok('10H-6 inline OK: ' + fn);
});

const mustDom = [
  'engineAdvancedPanel', 'btnEngineAdvanced', 'statsPanel',
  'timing', 'corePrediction', 'alerts', 'warning', 'wheelRadarData', 'masterAIState',
];
mustDom.forEach((id) => {
  if (!html.includes('id="' + id + '"') && !html.includes("id='" + id + "'"))
    fail('chýba DOM: ' + id);
  else ok('DOM #' + id);
});
if (!html.includes('v6-essential-strip')) fail('chýba trieda v6-essential-strip');
else ok('CSS trieda v6-essential-strip');

const forbiddenUi = [
  'LEARNING MODE ·', 'EARLY FLOW MODE ·', 'ACTIVE PREDICTION ·',
  'RED / BLACK SWITCHING', 'LOW CONFIDENCE', 'CHAOS LEVEL:',
  'REPEAT FLOW:', 'DOMINANT:', 'ZERO PRESSURE:',
  'btnDetailModules', 'advancedDiagnostics',
  'DEBUG MODE ·', 'Pure Random Picker',
];
forbiddenUi.forEach((s) => {
  if (html.includes(s)) fail('starý UI v HTML: ' + s);
});
ok('statická kontrola zakázaných reťazcov');

const skMust = ['skUiLabel', 'LADIACI REŽIM', 'KOMBINAČNÉ % ŠTATISTIKY', 'História čísel', 'ČISTÝ RANDOM VÝBER', 'renderRandomSessionPick'];
skMust.forEach((s) => {
  if (!codeBundle.includes(s) && !html.includes(s)) fail('chýba SK: ' + s);
  else ok('SK: ' + s);
});

app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1680,
    height: 1050,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  await win.loadFile(htmlPath);
  await new Promise((r) => setTimeout(r, 2000));

  const report = await win.webContents.executeJavaScript(`(function(){
    const out = [];
    function check(name, fn) {
      try { const r = fn(); out.push({ name, ok: !!r.ok, msg: r.msg || '' }); }
      catch (e) { out.push({ name, ok: false, msg: e.message }); }
    }
    const $ = (id) => document.getElementById(id);
    const badEn = /\\b(LEARNING MODE|EARLY FLOW|AI State Machine|Live Spin Pipeline|Health engine|Spin count|Active zones|HLAVNÝ INSIGHT)\\b/;

    check('LFP engine', () => {
      if (typeof clearSessionData === 'function') clearSessionData();
      else spins.length = 0;
      lfpInvalidate && lfpInvalidate();
      const L0 = computeLiveFlowPredictionAI();
      if (L0 !== null) return { ok: false, msg: 'mal by byť null bez spinov' };
      [32,15,19,4,21,2,25,17,34,6,11,8].forEach(n => spin(n));
      lfpInvalidate && lfpInvalidate();
      const L = computeLiveFlowPredictionAI();
      return L && L.signalIntel ? { ok: true, msg: 'signal ' + L.signal + ' flow ' + L.flow.state } : { ok: false, msg: 'LFP' };
    });

    renderLight({ wheelImmediate: true });

    check('všetky compute enginy', () => {
      const fns = [
        () => computeAIPrediction(),
        () => computeBehaviorAlerts(),
        () => computeRawStatsEngine(),
        () => computeRiskChaosEngine(),
        () => computeVisualHeatEngine(),
        () => computeWheelPressureEngine(),
        () => computeHotColdEngine(),
        () => computePatternEngine && computePatternEngine(),
        () => { if (spins.length >= 2 && typeof computeQuantumWheelBrain === 'function') return computeQuantumWheelBrain(); return {}; },
      ];
      for (const fn of fns) {
        const r = fn();
        if (r === undefined) return { ok: false, msg: 'undefined výsledok' };
      }
      return { ok: true, msg: fns.length + ' engine volaní' };
    });

    check('render panely (innerHTML)', () => {
      const ids = ['statsPanel','timing','corePrediction','alerts','alertSystem','hotCold','history'];
      for (const id of ids) {
        const el = $(id);
        if (!el) return { ok: false, msg: 'chýba #' + id };
        if ((el.innerHTML || '').length < 5) return { ok: false, msg: id + ' prázdny' };
      }
      engineAdvancedOpen = true;
      renderEngineAdvancedPanels();
      const adv = ['telemetry','heatmap','clusters'];
      for (const id of adv) {
        const el = $(id);
        if (!el) return { ok: false, msg: 'chýba #' + id };
        if ((el.innerHTML || '').length < 5) return { ok: false, msg: id + ' prázdny (advanced)' };
      }
      engineAdvancedOpen = false;
      return { ok: true, msg: ids.length + adv.length + ' panelov' };
    });

    check('pokročilá sekcia + SK tlačidlo', () => {
      const p = $('engineAdvancedPanel');
      const b = $('btnEngineAdvanced');
      const skBtn = b && b.textContent.includes('LADIACI REŽIM');
      return p && p.classList.contains('collapsed') && skBtn
        ? { ok: true, msg: 'zatvorené · DEBUG label' } : { ok: false, msg: 'advanced UI' };
    });

    check('žiadna angličtina v hlavných paneloch', () => {
      const parts = ['corePrediction','alerts','timing','statsPanel'].map(id => ($(id)||{}).innerHTML||'').join(' ');
      return badEn.test(parts) ? { ok: false, msg: 'EN v paneloch' } : { ok: true, msg: 'SK hlavné panely' };
    });

    check('rozbalenie pokročilej sekcie', () => {
      const b = $('btnEngineAdvanced');
      if (!b) return { ok: false, msg: 'btn' };
      b.click();
      renderEngineAdvancedPanels();
      const tel = ($('telemetry')||{}).innerHTML||'';
      b.click();
      engineAdvancedOpen = false;
      return tel.length > 20 ? { ok: true, msg: 'toggle + SK telemetria' } : { ok: false, msg: 'telemetry' };
    });

    check('combo % + timing essential', () => {
      renderStatsPanel();
      renderTiming();
      const s = ($('statsPanel')||{}).innerHTML||'';
      const t = ($('timing')||{}).innerHTML||'';
      return s.length > 30 && t.length > 30
        ? { ok: true, msg: 'essential strip OK' } : { ok: false, msg: 'strip' };
    });

    check('behavior alerty', () => {
      renderAlertSystem();
      const h = ($('alertSystem')||{}).innerHTML||'';
      return h.length > 10 ? { ok: true, msg: 'alert engine' } : { ok: false, msg: 'alert' };
    });

    check('koleso canvas + live output', () => {
      renderLight({ wheelImmediate: true });
      const c = $('wheelCanvas');
      const left = ($('qwPanelLeft')||{}).innerHTML||'';
      const bottom = ($('qwPanelBottom')||{}).innerHTML||'';
      const all = left + bottom + (($('qwPanelRight')||{}).innerHTML||'');
      const okW = c && c.width > 0 && all.includes('FLOW STAV') && all.includes('ODPORÚČANIE');
      return okW ? { ok: true, msg: c.width + 'px · dashboard' } : { ok: false, msg: 'wheel' };
    });

    return out;
  })()`);

  for (const r of report) {
    if (r.ok) ok('runtime: ' + r.name + ' — ' + r.msg);
    else fail('runtime: ' + r.name + ' — ' + r.msg);
  }

  await win.destroy();
  console.log(failed ? '\nAUDIT: ZLYHANIE (' + failed + ')' : '\nAUDIT: OK');
  app.exit(failed ? 1 : 0);
});

setTimeout(() => {
  console.error('FAIL: timeout');
  app.exit(1);
}, 45000);
