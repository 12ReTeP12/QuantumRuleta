/**
 * Komplexný runtime test V4 — observer, upozornenia, reset, enginy
 * Spustenie: npm run test:v4
 */
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const htmlPath = path.join(__dirname, '..', '..', 'index-NOVY-V4.html');
const v4Html = fs.readFileSync(htmlPath, 'utf8');
let failed = 0;
const ok = (m) => console.log('OK:', m);
const fail = (m) => { console.error('FAIL:', m); failed++; };
ok('V4 autoritatívny — index-NOVY-V4.html');

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
  await new Promise((r) => setTimeout(r, 2200));

  const report = await win.webContents.executeJavaScript(`(function(){
    const out = [];
    function check(name, fn) {
      try { const r = fn(); out.push({ name, ok: !!r.ok, msg: r.msg || '' }); }
      catch (e) { out.push({ name, ok: false, msg: e.message + (e.stack ? ' @' + e.stack.split('\\n')[1] : '') }); }
    }
    const $ = (id) => document.getElementById(id);

    check('clearSessionData reset', () => {
      [7,7,7,7,7,7,7,7,7,7,7,7].forEach(n => spin(n));
      renderLight({ wheelImmediate: true });
      const before = ($('alerts') || {}).innerHTML;
      clearSessionData();
      renderAlerts();
      renderHotCold();
      if (spins.length !== 0) return { ok: false, msg: 'spins=' + spins.length };
      const after = ($('alerts') || {}).innerHTML;
      const hc = ($('hotCold') || {}).innerHTML;
      if (after.includes('7×') || hc.includes('7×')) return { ok: false, msg: 'stará história v UI' };
      return { ok: true, msg: 'spins=0, UI reset' };
    });

    check('hot/cold len z histórie', () => {
      clearSessionData();
      for (let i = 0; i < 15; i++) spin(24);
      renderHotCold();
      const hc = ($('hotCold') || {}).innerHTML;
      if (!hc.includes('15') || !hc.includes('24')) return { ok: false, msg: hc.slice(0, 120) };
      return { ok: true, msg: '24: 15× v aktívnych' };
    });

    check('observer SK bez technického UI', () => {
      clearSessionData();
      [32,15,19,4,21,2,25,17,34,6,27,13,8,30,1].forEach(n => spin(n));
      renderAlerts();
      const h = ($('alerts') || {}).innerHTML;
      const bad = ['ra-metric-grid','NO TRUST','WAIT MODE','CHAOS VYSOKÝ','FLOW DNA','Viac detailov'];
      for (const b of bad) if (h.includes(b)) return { ok: false, msg: 'nájdené: ' + b };
      if (!h.includes('ro-observer')) return { ok: false, msg: 'chýba observer UI' };
      return { ok: true, msg: h.length + ' zn' };
    });

    check('observer hlavný výstup FARBA/TUCTY', () => {
      clearSessionData();
      [32,15,19,4,21,2,25,17,34,6,27,13,8,30,1].forEach(n => spin(n));
      const O = computeRouletteObserverUI();
      renderAlerts();
      const h = ($('alerts') || {}).innerHTML;
      if (!O.mainDirections || !O.mainDirections.length) return { ok: false, msg: 'chýba mainDirections' };
      if (!h.includes('ro-main-output')) return { ok: false, msg: 'chýba ro-main-output' };
      if (!h.includes('FARBA')) return { ok: false, msg: 'chýba FARBA' };
      if (!h.includes('TUCTY') || !h.includes('STĹPCE')) return { ok: false, msg: 'chýbajú tucty/stĺpce' };
      if (!h.includes(RO_DIR_DISCLAIMER)) return { ok: false, msg: 'chýba disclaimer' };
      return { ok: true, msg: O.mainDirections.map(d => d.label).join(', ') };
    });

    check('upozornenia SK + max 2 karty', () => {
      clearSessionData();
      [1,32,15,19,4,21,2,25,17,34,6,27,13,8,30,1].forEach(n => spin(n));
      renderAlertSystem();
      const h = ($('alertSystem') || {}).innerHTML;
      const bad = ['WAIT MODE','CHAOS VYSOKÝ','FLOW KOLAPS','SYSTEM FAILURE'];
      for (const b of bad) if (h.includes(b)) return { ok: false, msg: b };
      const cards = (h.match(/bah-alert-card/g) || []).length;
      if (cards > 2) return { ok: false, msg: cards + ' kariet' };
      if (!h.includes('bah-alert') && !h.includes('bah-wait') && !h.includes('bah-neutral')) return { ok: false, msg: 'prázdne' };
      return { ok: true, msg: cards + ' kariet, ' + h.length + ' zn' };
    });

    check('únova relácie čas od 1. spinu', () => {
      clearSessionData();
      const t0 = Date.now() - 600000;
      spin(5);
      spinTimes[0] = t0;
      const F = computeSessionFatigueAnalysis();
      if (!F.ready) return { ok: false, msg: F.explain };
      if (F.sessionMinutes < 8) return { ok: false, msg: 'min=' + F.sessionMinutes };
      return { ok: true, msg: F.sessionMinutes + ' min od prvého spinu' };
    });

    check('compute enginy bez výnimky', () => {
      clearSessionData();
      [32,15,19,4,21,2,25,17,34].forEach(n => spin(n));
      const fns = [
        () => computeAIPrediction(),
        () => computeBehaviorAlerts(),
        () => computeRouletteObserverUI(),
        () => computeRouletteAnalyst(),
        () => hcBuildFromSpins(),
        () => computeSessionFatigueAnalysis(),
        () => computeFlowAnalyzer(),
        () => computeHotColdEngine(),
        () => computePatternEngine(),
        () => computeRiskChaosCore(),
        () => computeWheelPressureEngine(),
      ];
      for (let i = 0; i < fns.length; i++) {
        const r = fns[i]();
        if (r === undefined) return { ok: false, msg: 'undefined #' + i };
      }
      return { ok: true, msg: fns.length + ' volaní' };
    });

    check('undo spin', () => {
      clearSessionData();
      [1,2,3].forEach(n => spin(n));
      const len = spins.length;
      undoLastSpin();
      if (spins.length !== len - 1) return { ok: false, msg: 'spins ' + spins.length };
      renderHotCold();
      return { ok: true, msg: 'undo OK' };
    });

    check('renderLight všetky hlavné panely', () => {
      clearSessionData();
      [32,15,19,4,21,2].forEach(n => spin(n));
      renderLight({ wheelImmediate: true });
      const ids = ['history','statsPanel','timing','corePrediction','alerts','hotCold','alertSystem','randomSessionPick','rngBehaviorPanel'];
      for (const id of ids) {
        const el = $(id);
        if (!el) return { ok: false, msg: 'chýba #' + id };
        if (id === 'warning') continue;
        if ((el.innerHTML || '').length < 5) return { ok: false, msg: id + ' prázdny' };
      }
      return { ok: true, msg: 'hlavné panely OK' };
    });

    check('random pick čistá náhodnosť SK', () => {
      clearSessionData();
      spin(5); spin(12);
      renderRandomSessionPick();
      const h = ($('randomSessionPick') || {}).innerHTML;
      if (!h.includes('RANDOM TUCTY') || !h.includes('RANDOM FARBA')) return { ok: false, msg: 'chýbajú riadky' };
      if (h.includes('confidence') || h.includes('WAIT MODE') || h.includes('prediction')) return { ok: false, msg: 'AI slovník v random' };
      const zone = document.getElementById('randomPickZone');
      if (!zone || (!zone.textContent.includes('ČISTÝ RANDOM')&&!zone.textContent.includes('ČISTÁ NÁHODNOSŤ'))) return { ok: false, msg: 'chýba hlavička' };
      return { ok: true, msg: 'random picker OK' };
    });

    return out;
  })()`);

  for (const r of report) {
    if (r.ok) ok(r.name + ' — ' + r.msg);
    else fail(r.name + ' — ' + r.msg);
  }

  await win.destroy();
  console.log(failed ? '\nCOMPREHENSIVE: ZLYHANIE (' + failed + ')' : '\nCOMPREHENSIVE: VŠETKO OK');
  app.exit(failed ? 1 : 0);
});

setTimeout(() => { console.error('FAIL: timeout'); app.exit(1); }, 45000);
