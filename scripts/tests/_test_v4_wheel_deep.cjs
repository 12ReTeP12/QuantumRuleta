/**
 * Hĺbkový test V2 — kvantové koleso + core moduly
 * Spustenie: npm run test:v2:wheel
 * (súbor: scripts/tests/_test_v4_wheel_deep.cjs — nie v koreni projektu)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { app, BrowserWindow } = require('electron');
const { extractV2InlineFromRoot } = require('./v2-inline-extract.cjs');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V2.html');
const html = fs.readFileSync(htmlPath, 'utf8');
/* Balík 9A: iba moduly načítané V2 (<script src>), boot/HUD z inline — nie legacy app-init.js */
const EXTERNAL_JS = [
  'scripts/core/constants.js',
  'scripts/core/event-bus.js',
  'scripts/core/state.js',
  'scripts/core/helpers.js',
  'scripts/wheel/quantum-wheel.js',
  'scripts/wheel/wheel-canvas.js',
  'scripts/wheel/wheel-hud.js',
  'scripts/ai/ai-engine.js',
  'scripts/ai/confidence-engine.js',
  'scripts/valid-true/valid-true-v0.js',
  'scripts/ai/lfp-engine.js',
  'scripts/ai/pred-flow-engine.js',
  'scripts/ai/pred-dashboard.js',
  'scripts/wheel/wheel-sector-intel.js',
  'scripts/wheel/wheel-brain.js',
  'scripts/ai/ai-prediction.js',
  'scripts/analytics/bah-engine.js',
  'scripts/analytics/session-stats.js',
  'scripts/analytics/roulette-analytics.js',
  'scripts/ui/ui-alerts.js',
  'scripts/ui/session-fatigue.js',
  'scripts/ui/keyboard-live-ai-flow.js',
  'scripts/analytics/timing-engine.js',
  'scripts/board/board-events.js',
  'scripts/board/board-ui.js',
];
let failed = 0;
const ok = (m) => console.log('OK:', m);
const fail = (m) => { console.error('FAIL:', m); failed++; };

function readCodeBundle() {
  let bundle = html;
  EXTERNAL_JS.forEach((rel) => {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) bundle += '\n' + fs.readFileSync(p, 'utf8');
  });
  return bundle;
}

const inlineJs = extractV2InlineFromRoot(root);
const syntaxBundle = inlineJs + EXTERNAL_JS.map((rel) => {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}).join('\n');
const jsPath = path.join(root, '_test_wheel_extract.js');
fs.writeFileSync(jsPath, syntaxBundle);
try {
  execSync('node --check "' + jsPath + '"', { stdio: 'pipe' });
  ok('JS syntax (inline + moduly)');
} catch (e) {
  fail('JS syntax: ' + (e.message || e.stderr));
}
fs.unlinkSync(jsPath);

const codeBundle = readCodeBundle();
const mustFns = [
  'computeQuantumWheelBrain',
  'computeWheelSectorIntel',
  'getSectorAnalysis',
  'invalidateWheelSectorIntelCache',
  'computeQwFlowScanner',
  'computeQwLiveOutput',
  'qwResolvePriority',
  'qwColorState',
  'skQw',
  'buildQwLiveOutputHTML',
  'renderWheelRadar',
  'renderCanvasWheel',
  'computeRbaBehaviorAnalyst',
  'computeLiveFlowPredictionAI',
  'computeAIPrediction',
];
mustFns.forEach((fn) => {
  if (!codeBundle.includes('function ' + fn) && !codeBundle.includes(fn + '=')) fail('chýba funkcia: ' + fn);
  else ok('funkcia: ' + fn);
});

const skText = ['qw-hero-edge', 'KVANTOVÉ KOLESO', 'skQw', 'qwEdgeBanner', 'VÝHODA AKTÍVNA', 'REŽIM ČAKANIA'];
skText.forEach((s) => {
  if (!html.includes(s) && !codeBundle.includes(s)) fail('chýba SK text/kód: ' + s);
  else ok('obsahuje: ' + s);
});
if (!codeBundle.includes('function drawQwVzorWheelInner')) fail('chýba drawQwVzorWheelInner (wheel-canvas.js)');
else ok('wheel-canvas: drawQwVzorWheelInner');
if (!html.includes('scripts/wheel/wheel-canvas.js')) fail('HTML: chýba script wheel-canvas.js');
else ok('HTML: wheel-canvas.js');

const badEn = ['WHEEL FLOW SCANNER<small>live behavior', 'LIVE FLOW OUTPUT ·', '⚠ NO EDGE —', 'DEBUG MODE ·', 'Pure Random Picker'];
badEn.forEach((s) => {
  if (html.includes(s)) fail('zostáva EN v UI: ' + s);
});
ok('kontrola anglických wheel reťazcov');

app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1600,
    height: 1000,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  await win.loadFile(htmlPath);
  await new Promise((r) => setTimeout(r, 2000));

  const report = await win.webContents.executeJavaScript(`(function(){
    const out = [];
    function check(name, fn) {
      try { const r = fn(); out.push({ name, ok: !!r.ok, msg: r.msg || '' }); }
      catch (e) { out.push({ name, ok: false, msg: e.message + (e.stack ? '' : '') }); }
    }
    const $ = (id) => document.getElementById(id);

    check('QW brain <2 spiny', () => {
      spins.length = 0;
      const Q = computeQuantumWheelBrain();
      return !Q.ready ? { ok: true, msg: 'čaká' } : { ok: false, msg: 'mal by čakať' };
    });

    const seq = [32,15,19,4,21,2,25,17,34,6,11,20,7,18,3,26,5,14,9,22,31,8,12];
    seq.forEach(n => spin(n));
    renderLight({ wheelImmediate: true });

    check('QW brain ready', () => {
      const Q = computeQuantumWheelBrain();
      return Q.ready && Q.scanner && Q.scanner.liveOutput
        ? { ok: true, msg: Q.modelLabel } : { ok: false, msg: 'nie ready' };
    });

    check('live output 5 polí', () => {
      const Q = computeQuantumWheelBrain();
      const O = Q.scanner.liveOutput;
      const n = ['color','parity','range','dozens','columns'].filter(k => O[k] && O[k].pick).length;
      return n >= 4 ? { ok: true, msg: n + ' polí' } : { ok: false, msg: n };
    });

    check('scanner engine', () => {
      const Q = computeQuantumWheelBrain();
      const S = Q.scanner;
      const ok1 = S.flowQuality && S.chaosLevel >= 0;
      const ok2 = S.returnForce && S.momentumState;
      return ok1 && ok2 ? { ok: true, msg: S.flowStability + ' · ' + S.momentumState } : { ok: false, msg: 'scanner' };
    });

    check('skQw', () => {
      return skQw('FLOW ALIGNED') === 'FLOW ZLADENÝ'
        ? { ok: true, msg: 'preklad OK' } : { ok: false, msg: skQw('FLOW ALIGNED') };
    });

    check('radar V1 panely', () => {
      renderLight({ wheelImmediate: true });
      const left = ($('qwPanelLeft') || {}).innerHTML || '';
      const bottom = ($('qwPanelBottom') || {}).innerHTML || '';
      const right = ($('qwPanelRight') || {}).innerHTML || '';
      const all = left + right + bottom;
      const n = document.querySelectorAll('.qw-metric, .qw-hero-metric').length;
      const banner = !!document.getElementById('qwStatusBanner');
      return all.includes('FLOW STAV')
        && (all.includes('FLOW OBSERVER') || all.includes('HLAVNÝ FLOW INSIGHT'))
        && all.includes('STOPA TOKU')
        && (all.includes('SYSTÉMOVÝ HLAS') || all.includes('LIVE KOMENTÁR'))
        && all.includes('ODPORÚČANIE') && all.includes('RIZIKO FLOW') && n >= 10 && banner
        ? { ok: true, msg: n + ' metrík · V1 dashboard' } : { ok: false, msg: 'DOM' };
    });

    check('canvas', () => {
      const c = $('wheelCanvas');
      return c && c.width > 0 ? { ok: true, msg: c.width + 'px' } : { ok: false, msg: 'canvas' };
    });

    check('vzor vnútorné koleso', () => {
      const block = document.querySelector('.v6-block-wheel.v6-radar-v1');
      const root = $('wheelRadarData');
      const inVzor = !!(block && root && root.closest('.v6-block-wheel.v6-radar-v1'));
      const hasFn = typeof drawQwVzorWheelInner === 'function' && typeof drawQwVzorLabelsCanvas === 'function';
      const svgBeams = document.getElementById('qwFlowBeams');
      const beamsEmpty = !svgBeams || svgBeams.innerHTML === '';
      return inVzor && hasFn && beamsEmpty
        ? { ok: true, msg: 'V4 vzor · canvas · bez SVG lúčov' }
        : { ok: false, msg: 'vzor=' + inVzor + ' fn=' + hasFn + ' beams=' + (svgBeams ? svgBeams.innerHTML.length : '—') };
    });

    check('analytik', () => {
      const h = ($('alerts') || {}).innerHTML || '';
      return h.length > 200 ? { ok: true, msg: h.length + ' zn' } : { ok: false, msg: 'prázdny' };
    });

    check('predikcia', () => {
      const h = ($('corePrediction') || {}).innerHTML || '';
      return h.length > 120 ? { ok: true, msg: h.length + ' zn' } : { ok: false, msg: 'prázdny' };
    });

    check('LFP engine', () => {
      const L = computeLiveFlowPredictionAI();
      return L && L.signalIntel ? { ok: true, msg: 'signal ' + L.signal } : { ok: false, msg: 'lfp' };
    });

    check('invalidate wheel cache', () => {
      const a = computeQuantumWheelBrain();
      if (typeof invalidateWheelCache === 'function') invalidateWheelCache();
      if (typeof invalidateQuantumWheelBrainCache === 'function') invalidateQuantumWheelBrainCache();
      const b = computeQuantumWheelBrain();
      return a.ready && b.ready ? { ok: true, msg: 'cache OK' } : { ok: false, msg: 'cache' };
    });

    return out;
  })()`);

  for (const r of report) {
    if (r.ok) ok(r.name + ' — ' + r.msg);
    else fail(r.name + ' — ' + r.msg);
  }

  await win.destroy();
  app.exit(failed ? 1 : 0);
});

setTimeout(() => {
  console.error('FAIL: timeout');
  app.exit(1);
}, 45000);
