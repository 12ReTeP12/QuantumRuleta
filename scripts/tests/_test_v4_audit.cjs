/**
 * Komplexný hĺbkový audit V4 — syntax, funkcie, SK UI, engine panely
 * Spustenie: npm run test:v4:audit
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V4.html');
const html = fs.readFileSync(htmlPath, 'utf8');
let failed = 0;
const ok = (m) => console.log('OK:', m);
const fail = (m) => { console.error('FAIL:', m); failed++; };

const m = html.match(/<script>([\s\S]*)<\/script>/);
const jsPath = path.join(root, '_test_v4_audit_extract.js');
fs.writeFileSync(jsPath, m[1]);
try {
  execSync('node --check "' + jsPath + '"', { stdio: 'pipe' });
  ok('JS syntax');
} catch (e) {
  fail('JS syntax');
}
fs.unlinkSync(jsPath);

const mustFns = [
  'computeLiveFlowPredictionAI', 'computeAIPrediction', 'computeBehaviorAlerts',
  'computeComboMixStats', 'renderEngineAdvancedPanels', 'renderStatsPanel',
  'renderTiming', 'renderWheelRadar', 'computeQwFlowScanner', 'skUiLabel', 'skFlow',
  'buildAIPredictionPanelHTML', 'computeRawStatsEngine', 'computeRiskChaosEngine',
  'computeVisualHeatEngine', 'computeWheelPressureEngine', 'computeHotColdEngine',
];
mustFns.forEach((fn) => {
  if (!html.includes('function ' + fn) && !html.includes('function ' + fn.replace('compute', 'render')))
    fail('chýba funkcia: ' + fn);
  else ok('funkcia: ' + fn);
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
  if (!html.includes(s)) fail('chýba SK: ' + s);
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
      const main = [
        ($('corePrediction') || {}).innerHTML,
        ($('statsPanel') || {}).innerHTML,
        ($('warning') || {}).innerHTML,
        ($('alerts') || {}).innerHTML,
      ].join(' ');
      return badEn.test(main) ? { ok: false, msg: 'nájdená angličtina' } : { ok: true, msg: 'SK hlavné panely' };
    });

    check('rozbalenie pokročilej sekcie', () => {
      const p = $('engineAdvancedPanel');
      const b = $('btnEngineAdvanced');
      if (!p || !b) return { ok: false, msg: 'elementy' };
      b.click();
      const open = !p.classList.contains('collapsed');
      renderEngineAdvancedPanels();
      const tel = ($('telemetry') || {}).innerHTML || '';
      const skTel = !tel.includes('AI State Machine') && !tel.includes('Live Spin Pipeline');
      b.click();
      return open && skTel ? { ok: true, msg: 'toggle + SK telemetria' } : { ok: false, msg: 'toggle' };
    });

    check('combo % + timing essential', () => {
      const st = ($('statsPanel') || {}).innerHTML || '';
      const inEss = !!document.querySelector('.v6-essential-stats #statsPanel');
      const tim = !!document.querySelector('.v6-essential-timing #timing');
      const combo = st.includes('KOMBINAČNÉ %');
      return inEss && tim && combo ? { ok: true, msg: 'essential strip OK' } : { ok: false, msg: 'essential' };
    });

    check('behavior alerty', () => {
      const h = ($('alertSystem') || {}).innerHTML || '';
      return h.includes('bah-alert') || h.includes('bah-wait') ? { ok: true, msg: 'alert engine' } : { ok: false, msg: 'alerty' };
    });

    check('koleso canvas + live output', () => {
      const left = ($('qwPanelLeft') || {}).innerHTML || '';
      const right = ($('qwPanelRight') || {}).innerHTML || '';
      const cards = document.querySelectorAll('.qw-metric').length;
      return $('wheelCanvas') && left.includes('ŽIVÝ KOMENTÁR') && left.includes('STOPA TOKU')
        && right.includes('RIZIKO FLOW') && cards >= 11
        ? { ok: true, msg: 'radar V1 · ' + cards + ' metrík · boky' } : { ok: false, msg: 'wheel' };
    });

    return out;
  })()`);

  for (const r of report) {
    if (r.ok) ok('runtime: ' + r.name + ' — ' + r.msg);
    else fail('runtime: ' + r.name + ' — ' + r.msg);
  }

  await win.destroy();
  console.log(failed ? '\\nAUDIT: ZLYHANIE (' + failed + ')' : '\\nAUDIT: VŠETKO OK');
  app.exit(failed ? 1 : 0);
});

setTimeout(() => { console.error('FAIL: timeout'); app.exit(1); }, 35000);
