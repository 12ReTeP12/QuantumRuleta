/**
 * Kompletný hĺbkový test V4 — syntax, importy, moduly, UI, integrácia
 * Spustenie: npm run test:v4:master
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V4.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const STYLES = ['styles/main.css', 'styles/ai.css', 'styles/wheel.css'];
const MODULES = [
  'scripts/core/constants.js',
  'scripts/core/state.js',
  'scripts/core/helpers.js',
  'scripts/wheel/quantum-wheel.js',
  'scripts/ai/ai-engine.js',
  'scripts/ai/lfp-engine.js',
  'scripts/ai/ai-prediction.js',
  'scripts/analytics/roulette-analytics.js',
  'scripts/ui/ui-panels.js',
  'scripts/ui/ui-alerts.js',
  'scripts/analytics/timing-engine.js',
  'scripts/board/board-events.js',
  'scripts/board/board-ui.js',
  'scripts/bootstrap/app-init.js',
];

const MODULE_EXPORTS = {
  'scripts/core/constants.js': ['wheel', 'reds', 'RED_NUMBERS', 'DOZENS', 'COLUMNS'],
  'scripts/core/state.js': ['spins', 'sessionState', 'spinTimes'],
  'scripts/core/helpers.js': ['getColor', 'getDozen', 'getColumn', 'normalize', 'clamp', 'average'],
  'scripts/wheel/quantum-wheel.js': ['computeQuantumWheelBrain', 'computeQwFlowScanner', 'invalidateWheelCache'],
  'scripts/ai/ai-engine.js': ['computeLiveFlowPredictionAI', 'lfpInvalidate', 'buildAIPredictionPanelHTML'],
  'scripts/ai/lfp-engine.js': ['lfpFlowStabilityScore', 'lfpExplainSignal'],
  'scripts/ai/ai-prediction.js': ['computeAIPrediction'],
  'scripts/analytics/roulette-analytics.js': ['computeRouletteObserverUI', 'computeBehaviorAlerts'],
  'scripts/analytics/timing-engine.js': ['computeTimingEngine', 'renderTimingPanel'],
  'scripts/ui/ui-panels.js': ['renderWheelRadar', 'renderKeyboardLiveAIFlow'],
  'scripts/ui/ui-alerts.js': ['renderAlerts', 'renderAlertSystem', 'buildAlertsHTML'],
  'scripts/board/board-ui.js': ['renderBoard', 'renderKeyboard', 'buildBoardHTML'],
  'scripts/board/board-events.js': ['bindBoardEvents', 'handleBoardClick'],
  'scripts/bootstrap/app-init.js': ['bootApp'],
};

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

const inlineStart = html.indexOf('<script>\n/* QRP7-V4');
const inlineEnd = html.indexOf('</script>\n<script src="scripts/analytics/roulette-analytics.js"');
if (inlineStart < 0 || inlineEnd <= inlineStart) fail('inline <script> blok nenájdený');
else {
  const inlineJs = html.slice(inlineStart + '<script>'.length, inlineEnd);
  const tmp = path.join(root, '_test_master_inline.js');
  fs.writeFileSync(tmp, inlineJs);
  try {
    execSync('node --check "' + tmp + '"', { stdio: 'pipe' });
    ok('JS syntax: index-NOVY-V4.html (inline)');
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
  const p = path.join(root, src.replace(/\//g, path.sep));
  if (!fs.existsSync(p)) fail('import chýba na disku: ' + src);
  else ok('script src: ' + src);
});
MODULES.forEach((rel) => {
  const norm = rel.replace(/\\/g, '/');
  if (!scriptSrcs.includes(norm)) fail('modul nie je v HTML: ' + norm);
});

STYLES.forEach((rel) => {
  if (!html.includes('href="' + rel + '"')) fail('stylesheet nie je v HTML: ' + rel);
  else ok('link css: ' + rel);
});

console.log('\n=== MODULY (súbory + symboly v kóde) ===\n');
const codeBundle = MODULES.map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n')
  + html.slice(inlineStart, inlineEnd);
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
      const n = document.querySelectorAll('.qw-metric').length;
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

    check('EventBus — 5 engine listenerov', () => {
      if (typeof EventBus === 'undefined') return { ok: false, msg: 'chýba EventBus' };
      if (typeof bindSpinEventBusListeners === 'function' && !bindSpinEventBusListeners._done) {
        bindSpinEventBusListeners();
      }
      const n = (EventBus.listeners['spin:add'] || []).length;
      return n >= 5 ? { ok: true, msg: n + ' listenerov' } : { ok: false, msg: n + ' listenerov' };
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

    check('board click delegácia', () => {
      const btn = document.getElementById('num-17');
      if (!btn) return { ok: false, msg: 'chýba num-17' };
      const before = spins.length;
      btn.click();
      return spins.length === before + 1 ? { ok: true, msg: 'spin 17' } : { ok: false, msg: 'click' };
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
