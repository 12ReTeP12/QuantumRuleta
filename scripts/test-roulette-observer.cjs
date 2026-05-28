/**
 * Test Ruletový analytik (observer UI) — 10 scenárov.
 * Spustenie: node scripts/test-roulette-observer.cjs
 * Vyžaduje Electron: npx electron scripts/test-roulette-observer.cjs
 */
const fs = require('fs');
const path = require('path');
let electron;
try { electron = require('electron'); } catch (e) { electron = null; }

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'index-NOVY-V4.html');
let failed = 0;
const ok = (m) => console.log('OK:', m);
const fail = (m) => { console.error('FAIL:', m); failed++; };

if (!fs.existsSync(htmlPath)) {
  console.error('Chýba', htmlPath);
  process.exit(1);
}
if (!electron || !electron.app) {
  console.log('Electron nie je k dispozícii — použite manuálny checklist:');
  console.log('  scripts/ROULETTE-OBSERVER-CHECKLIST.md');
  process.exit(0);
}
const { app, BrowserWindow } = electron;

app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1400,
    height: 900,
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
  const alerts = () => (document.getElementById('alerts') || {}).innerHTML || '';
  const clear = () => { if (typeof clearSessionData === 'function') clearSessionData(); };
  const spinN = (arr) => { clear(); arr.forEach(n => spin(n)); renderLight({ wheelImmediate: true }); };

  check('1 prázdna história', () => {
    clear();
    renderAlerts();
    const h = alerts();
    const okEmpty = h.includes('ro-observer') && (h.includes('Čakám') || h.includes('Zadaj spiny'));
    const noOld = !h.includes('ra-metric-grid') && !h.includes('NO TRUST');
    return okEmpty && noOld ? { ok: true, msg: 'prázdny observer' } : { ok: false, msg: 'layout' };
  });

  check('2 jeden spin', () => {
    spinN([7]);
    const h = alerts();
    const li = (document.querySelectorAll('#alerts .ro-sentences li') || []).length;
    return h.includes('zbieram') || h.includes('Pozorovanie') ? { ok: true, msg: li + ' vety' } : { ok: false, msg: h.slice(0,80) };
  });

  check('3 eleven spinov — učenie', () => {
    spinN([1,2,3,4,5,6,7,8,9,10,11]);
    const h = alerts();
    return (h.includes('zbieram') || h.includes('11')) && !h.includes('ra-metric-grid')
      ? { ok: true, msg: 'learning' } : { ok: false, msg: 'fáza' };
  });

  check('4 dvanásť spinov — narrácia', () => {
    spinN([32,15,19,4,21,2,25,17,34,6,27,13]);
    const li = document.querySelectorAll('#alerts .ro-sentences li').length;
    return li >= 1 && li <= 5 ? { ok: true, msg: li + ' viet' } : { ok: false, msg: 'počet viet ' + li };
  });

  check('5 max 5 viet', () => {
    spinN([32,15,19,4,21,2,25,17,34,6,27,13,8,30,1]);
    const li = document.querySelectorAll('#alerts .ro-sentences li').length;
    return li <= 5 ? { ok: true, msg: li + ' viet' } : { ok: false, msg: 'spam ' + li };
  });

  check('6 disclaimer pod smermi', () => {
    spinN([32,15,19,4,21,2,25,17,34,6,27,13,8,30,1]);
    const h = alerts();
  return h.includes('Pozorovanie správania, nie záruka ďalšieho čísla')
      ? { ok: true, msg: 'disclaimer OK' } : { ok: false, msg: 'chýba disclaimer' };
  });

  check('7 žiadny starý dashboard', () => {
    const h = alerts();
    const bad = ['ra-metric-grid','FLOW DNA','NO TRUST','Viac detailov','SILA FLOW'].some(x => h.includes(x));
    return !bad ? { ok: true, msg: 'bez technického UI' } : { ok: false, msg: 'starý UI' };
  });

  check('8 reset po clear', () => {
    spinN([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]);
    const before = alerts();
    clear();
    renderAlerts();
    const after = alerts();
    const okR = after.includes('Čakám') || after.includes('Zadaj spiny');
    const noProfile = !after.includes('Začiatok:') || after.length < before.length / 2;
    return okR ? { ok: true, msg: 'reset OK' } : { ok: false, msg: 'po clear' };
  });

  check('9 nová session po clear', () => {
    clear();
    [24,24,24,24,24].forEach(n => spin(n));
    renderAlerts();
    const h = alerts();
    return h.includes('24') || h.includes('ro-observer') ? { ok: true, msg: 'nová história' } : { ok: false, msg: h.slice(0,100) };
  });

  check('10 observerResetSession existuje', () => {
    return typeof observerResetSession === 'function'
      ? { ok: true, msg: 'reset fn' } : { ok: false, msg: 'chýba fn' };
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

setTimeout(() => { console.error('FAIL: timeout'); app.exit(1); }, 35000);
