/**
 * Balík 2A — audit duplicitných render volaní (iba meranie, nemení produkciu).
 *
 * Spustenie:
 *   node scripts/tests/audit-b2a-render-duplicates.cjs
 *   electron scripts/tests/audit-b2a-render-duplicates.cjs
 *
 * Výstup: konzola + scripts/tests/reports/audit-b2a-render-duplicates.json
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V2.html');
const reportDir = path.join(__dirname, 'reports');
const reportPath = path.join(reportDir, 'audit-b2a-render-duplicates.json');

const TARGETS = [
  'renderCorePrediction',
  'renderWheelRadar',
  'renderKeyboardLiveAIFlow',
  'renderAlerts',
];

/** Pomocné — wheel cesta mimo priameho renderWheelRadar (scheduleWheelRender bez arg = len canvas). */
const AUX_TARGETS = ['renderHeavy', 'scheduleWheelRender', 'renderLight'];

const SPIN_ONE = 17;
const SPIN_SEQ_50 = [
  32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
  27, 13, 0, 20, 14, 31, 9, 22, 18, 29,
  7, 28, 12, 3, 35, 11, 8, 23, 10, 5,
  24, 16, 33, 1, 36, 30, 26, 32, 15, 19,
  4, 21, 2, 25, 17, 34, 6, 27, 13, 0,
];

function printReport(report) {
  const line = (s) => console.log(s);
  line('');
  line('=== BALÍK 2A — AUDIT RENDER DUPLICÍT (meranie) ===');
  line('');
  line('Metóda: Electron load index-NOVY-V2.html, wrap funkcií po boote, bez zmeny zdrojákov.');
  line('');

  line('--- 1. Počet volaní na 1 spin (onNewSpin po clearSession) ---');
  TARGETS.forEach((name) => {
    const n = report.perSpin[name];
    line(`  ${name}: ${n == null ? 'N/A' : n}`);
  });
  line('');

  line('--- 2. Počet volaní na 50 spinov ---');
  line(`  Režim: ${report.mode50 || 'paced (settle po každom spinoch)'}`);
  if (report.totals50Burst) {
    line('  2a) Burst (50× onNewSpin bez čakania — renderQueued zahodí väčšinu EVENT.RENDER):');
    TARGETS.forEach((name) => {
      const n = report.totals50Burst[name];
      line(`      ${name}: ${n == null ? 'N/A' : n}`);
    });
  }
  line('  2b) Paced (realistické tempo — platné pre wheel + heavy):');
  TARGETS.forEach((name) => {
    const n = report.totals50[name];
    line(`      ${name}: ${n == null ? 'N/A' : n}`);
  });
  line('  Priemer na spin (50 paced):');
  TARGETS.forEach((name) => {
    const t = report.totals50[name];
    line(`      ${name}: ${t == null ? 'N/A' : (t / 50).toFixed(2)}`);
  });
  if (report.aux50) {
    line('  Pomocné (paced):');
    Object.keys(report.aux50).forEach((name) => {
      line(`      ${name}: ${report.aux50[name]}`);
    });
  }
  line('');

  line('--- 3. Odhad duplicít (aktuálny stav) ---');
  (report.duplicateEstimate || []).forEach((row) => line('  ' + row));
  line('');

  line('--- 4. Čo zmizne po 2A (plán, nie implementované) ---');
  (report.after2A || []).forEach((row) => line('  ' + row));
  line('');

  line('Kontext: spins.length po 1 = ' + report.context.afterOneSpinCount);
  line('         spins.length po 50 = ' + report.context.after50SpinCount);
  line('         heavy interval HEAVY_RENDER_INTERVAL = ' + report.context.heavyInterval);
  line('         renderHeavy počas 50 spinov (očak. ~10): ' + report.context.expectedHeavyRenders);
  line('');
  line('Report JSON: ' + reportPath);
  line('');
}

app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  if (!fs.existsSync(htmlPath)) {
    console.error('FAIL: chýba', htmlPath);
    process.exit(1);
  }

  const win = new BrowserWindow({
    show: false,
    width: 1400,
    height: 900,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });

  try {
    await win.loadFile(htmlPath);
    await new Promise((r) => setTimeout(r, 2800));

    const report = await win.webContents.executeJavaScript(`(async function(){
      const TARGETS = ${JSON.stringify(TARGETS)};
      const AUX_TARGETS = ${JSON.stringify(AUX_TARGETS)};
      const SPIN_ONE = ${SPIN_ONE};
      const SPIN_SEQ_50 = ${JSON.stringify(SPIN_SEQ_50)};
      const WHEEL_DEBOUNCE_MS = 130;
      const SETTLE_EXTRA_MS = 40;

      function waitMs(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
      async function waitRenderSettle(){
        await new Promise(function(r){
          requestAnimationFrame(function(){
            requestAnimationFrame(r);
          });
        });
        await waitMs(WHEEL_DEBOUNCE_MS + SETTLE_EXTRA_MS);
      }

      const audit = {
        wrapped: {},
        perSpin: {},
        totals50: {},
        perSpinBreakdown: [],
        context: {},
        duplicateEstimate: [],
        after2A: [],
      };

      function wrapName(name){
          var fn = window[name];
          if(typeof fn !== 'function'){
            audit.wrapped[name] = false;
            return;
          }
          audit.wrapped[name] = true;
          var orig = fn;
          var tally = { n: 0 };
          window['__b2aOrig_' + name] = orig;
          window[name] = function(){
            tally.n++;
            return orig.apply(this, arguments);
          };
          window['__b2aTally_' + name] = tally;
      }

      function installWrap(){
        audit.wrapped = {};
        TARGETS.forEach(wrapName);
        AUX_TARGETS.forEach(wrapName);
      }

      function resetTallies(names){
        (names || TARGETS.concat(AUX_TARGETS)).forEach(function(name){
          var t = window['__b2aTally_' + name];
          if(t) t.n = 0;
        });
      }

      function readTallies(names){
        var o = {};
        (names || TARGETS).forEach(function(name){
          var t = window['__b2aTally_' + name];
          o[name] = t ? t.n : null;
        });
        return o;
      }

      function readAux(){
        return readTallies(AUX_TARGETS);
      }

      installWrap();

      if(typeof clearSessionData === 'function') clearSessionData();
      await waitRenderSettle();
      resetTallies();

      if(typeof onNewSpin !== 'function'){
        audit.error = 'onNewSpin missing';
        return audit;
      }

      onNewSpin(SPIN_ONE);
      await waitRenderSettle();
      audit.perSpin = readTallies();
      audit.context.afterOneSpinCount = typeof spins !== 'undefined' ? spins.length : null;

      if(typeof clearSessionData === 'function') clearSessionData();
      await waitRenderSettle();
      resetTallies();

      for(var i = 0; i < SPIN_SEQ_50.length; i++){
        onNewSpin(SPIN_SEQ_50[i]);
      }
      await waitRenderSettle();
      audit.totals50Burst = readTallies();
      audit.noteBurst = 'Burst: EVENT.RENDER sa zlučuje cez renderQueued — neplatí pre wheel/heavy.';

      if(typeof clearSessionData === 'function') clearSessionData();
      await waitRenderSettle();
      resetTallies();

      audit.mode50 = 'paced';
      for(var k = 0; k < SPIN_SEQ_50.length; k++){
        onNewSpin(SPIN_SEQ_50[k]);
        await waitRenderSettle();
      }
      audit.totals50 = readTallies();
      audit.aux50 = readAux();
      audit.context.after50SpinCount = typeof spins !== 'undefined' ? spins.length : null;

      var heavyInt = typeof HEAVY_RENDER_INTERVAL !== 'undefined' ? HEAVY_RENDER_INTERVAL : 5;
      audit.context.heavyInterval = heavyInt;
      audit.context.expectedHeavyRenders = Math.floor(50 / heavyInt);

      function dupLines(per, name){
        var n = per[name];
        if(n == null) return;
        if(n === 2) audit.duplicateEstimate.push(name + ': typicky 2× na spin (EventBus spin:add + renderLight v EVENT.RENDER).');
        else if(n === 1) audit.duplicateEstimate.push(name + ': 1× na spin — bez zjavnej duplicity v tomto meraní.');
        else if(n > 2) audit.duplicateEstimate.push(name + ': ' + n + '× na spin — viac ako dvojnásobok (pozri renderHeavy / wheel debounce).');
      }
      TARGETS.forEach(function(n){ dupLines(audit.perSpin, n); });

      var w = audit.perSpin.renderWheelRadar;
      var w50 = audit.totals50 && audit.totals50.renderWheelRadar;
      if(w != null && w >= 2){
        audit.duplicateEstimate.push('renderWheelRadar (1 spin): ' + w + '× — EventBus scheduleWheelRender + renderLight/renderHeavy.');
      } else if(w === 1){
        audit.duplicateEstimate.push('renderWheelRadar (1 spin): 1× — typicky len renderLight alebo heavy, nie EventBus (scheduleWheelRender() bez includeRadar).');
      } else if(w === 0){
        audit.duplicateEstimate.push('renderWheelRadar (1 spin): 0× — prvý spin bez heavy; wheel len renderCanvasWheel cez scheduleWheelRender().');
      }
      if(w50 != null && w50 > 50){
        audit.duplicateEstimate.push('renderWheelRadar (50 paced): ' + w50 + ' celkom (' + (w50/50).toFixed(2) + '/spin) — duplicita EventBus + renderLight/heavy.');
      }
      if(audit.totals50Burst){
        audit.duplicateEstimate.push('Burst 50: renderLight/renderHeavy takmer chýbajú (renderQueued) — používaj paced režim.');
      }

      audit.after2A = [
        'Odstránenie telies listenerov bindSpinEventBusListeners pre renderCorePrediction, renderAlerts, renderKeyboardLiveAIFlow a scheduleWheelRender/renderWheelRadar.',
        'Zachovanie onNewSpin → emitEvent(EVENT.RENDER) → renderLight/renderHeavy — finálny DOM by mal zostať rovnaký po jednom rAF cykle.',
        'Očakávaný pokles na ~1×/spin pre: renderCorePrediction, renderAlerts, renderKeyboardLiveAIFlow (z ~2×).',
        'renderWheelRadar: z ~2–3×/spin na ~1× (+ 1 extra len na každý 5. spin cez renderHeavy, nie duplicitný EventBus).',
        'EventBus.emit(\\'spin:add\\') môže zostať bez listenerov alebo sa odstráni emit — logika výpočtov sa nemení.',
      ];

      audit.method = {
        settle: 'double rAF + ' + (WHEEL_DEBOUNCE_MS + SETTLE_EXTRA_MS) + 'ms (wheel debounce 120ms)',
        spinEntry: 'onNewSpin(number)',
        noProductionPatch: true,
      };

      return audit;
    })()`);

    report.measuredAt = new Date().toISOString();
    report.html = path.basename(htmlPath);

    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    const missing = TARGETS.filter((n) => report.wrapped && report.wrapped[n] === false);
    if (missing.length) {
      console.warn('WARN: neboli zabalené funkcie:', missing.join(', '));
    }
    if (report.error) {
      console.error('FAIL:', report.error);
      process.exit(1);
    }

    printReport(report);
    win.destroy();
    app.quit();
  } catch (e) {
    console.error('FAIL:', e.message || e);
    try { win.destroy(); } catch (_) {}
    app.quit();
    process.exit(1);
  }
});

app.on('window-all-closed', () => {});
