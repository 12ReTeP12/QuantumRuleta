/**
 * Hĺbkový test V4 — syntax, LFP logika, UI panel, layout
 * Spustenie: npm run test:v4:deep
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V4.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const EXTERNAL_JS = [
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

const inlineStart = html.indexOf('<script>\n/* QRP7-V4');
const inlineEnd = html.indexOf('</script>\n<script src="scripts/analytics/roulette-analytics.js"');
const inlineJs = inlineStart >= 0 && inlineEnd > inlineStart
  ? html.slice(inlineStart + '<script>'.length, inlineEnd)
  : '';
const jsPath = path.join(root, '_test_v4_deep_extract.js');
const syntaxBundle = inlineJs + EXTERNAL_JS.map((rel) => {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}).join('\n');
fs.writeFileSync(jsPath, syntaxBundle);
try {
  execSync('node --check "' + jsPath + '"', { stdio: 'pipe' });
  ok('JS syntax (inline + moduly)');
} catch (e) {
  fail('JS syntax: ' + (e.stderr || e.message));
}
fs.unlinkSync(jsPath);

const codeBundle = readCodeBundle();
const mustHave = [
  'computeLiveFlowPredictionAI',
  'buildAIPredictionPanelHTML',
  'lfpFlowStabilityScore',
  'lfpExplainSignal',
  'lfp-human-status',
  'STABILITA FLOW',
  'SILA SIGNÁLU',
  'REŽIM',
  'OD NULY',
  'LIVE FLOW ENGINE',
];
mustHave.forEach((s) => {
  if (!codeBundle.includes(s)) fail('chýba: ' + s);
  else ok('kód obsahuje: ' + s);
});

ok('V4 autoritatívny (index.html sa nesynchronizuje)');

const englishUi = [
  'LEARNING MODE ·',
  'EARLY FLOW MODE ·',
  'ACTIVE PREDICTION ·',
  'RED / BLACK SWITCHING',
  'LOW CONFIDENCE',
  'CHAOS LEVEL:',
  'REPEAT FLOW:',
  'DOMINANT:',
  'ZERO PRESSURE:',
  'DEBUG MODE ·',
  'Pure Random Picker',
];
englishUi.forEach((s) => {
  if (html.includes(s)) fail('zostáva angličtina v UI: ' + s);
});
ok('kontrola anglických UI reťazcov');

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
  await new Promise((r) => setTimeout(r, 1800));

  const report = await win.webContents.executeJavaScript(`(function(){
    const out = [];
    function check(name, fn) {
      try { const r = fn(); out.push({ name, ok: !!r.ok, msg: r.msg || '' }); }
      catch (e) { out.push({ name, ok: false, msg: e.message }); }
    }
    const $ = (id) => document.getElementById(id);

    check('LFP engine null', () => {
      const L = computeLiveFlowPredictionAI();
      return L === null ? { ok: false, msg: 'null pri 0 spinoch' } : { ok: true, msg: 'OK' };
    });

    [32,15,19,4,21,2,25,17,34,6].forEach(n => spin(n));
    renderLight({ wheelImmediate: true });

    check('LFP po spinoch', () => {
      const L = computeLiveFlowPredictionAI();
      if (!L) return { ok: false, msg: 'null' };
      if (!L.signalIntel || !L.flowIntel || !L.modeIntel || !L.zeroIntel)
        return { ok: false, msg: 'chýbajú intel objekty' };
      return { ok: true, msg: 'signal=' + L.signal + ' flow=' + L.flow.state };
    });

    check('panel — ľudský AI výstup SK', () => {
      const h = ($('corePrediction') || {}).innerHTML || '';
      const ok1 = h.includes('lfp-human') && (h.includes('FARBA') || h.includes('PARITA'));
      const ok2 = h.includes('panel-line') && (h.includes('CHAOS') || h.includes('FLOW') || h.includes('Stabilita'));
      return ok1 && ok2 ? { ok: true, msg: h.length + ' zn' } : { ok: false, msg: 'panel' };
    });

    check('panel — metriky flow/chaos', () => {
      const h = ($('corePrediction') || {}).innerHTML || '';
      const okM = h.includes('FLOW') && (h.includes('CHAOS') || h.includes('chaos'));
      const okZ = h.includes('Od nuly') || h.includes('lfp-zero') || h.includes('REŽIM');
      return okM && okZ ? { ok: true, msg: 'meta OK' } : { ok: false, msg: 'meta' };
    });

    check('chaotický flow → WAIT', () => {
      spins.length = 0;
      [1,2,3,1,2,3,1,2].forEach(n => spin(n));
      lfpInvalidate && lfpInvalidate();
      const L = computeLiveFlowPredictionAI();
      const wait = L && (L.noPredict || L.mode === 'WAIT');
      [32,15,19].forEach(n => spin(n));
      renderLight({ wheelImmediate: true });
      return wait ? { ok: true, msg: 'konzervatívna AI' } : { ok: false, msg: 'malo by čakať' };
    });

    check('predikcia engine', () => {
      const pr = computeAIPrediction();
      return pr && pr.lfp ? { ok: true, msg: 'lfp napojené' } : { ok: false, msg: 'bez lfp' };
    });

    check('layout poradie', () => {
      const board = document.querySelector('.v6-board-top') || document.querySelector('.v6-board-ref');
      const wheel = document.querySelector('.v6-radar-v1');
      const hub = document.querySelector('.v6-hub-two');
      const okOrder = board && wheel && hub
        && (board.compareDocumentPosition(wheel) & 4)
        && (wheel.compareDocumentPosition(hub) & 4);
      return okOrder ? { ok: true, msg: 'klávesnica→koleso→hub' } : { ok: false, msg: 'layout' };
    });

    check('koleso + radar V1 panely', () => {
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
      return okUi ? { ok: true, msg: n + ' metrík' } : { ok: false, msg: left.length + ' · ' + right.length + ' · ' + bottom.length };
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
}, 35000);
