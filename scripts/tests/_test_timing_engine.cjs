/**
 * Smoke test timing-engine.js
 */
const path = require('path');
const { app, BrowserWindow } = require('electron');

const htmlPath = path.join(__dirname, '..', '..', 'index-NOVY-V4.html');

app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  await win.loadFile(htmlPath);
  await new Promise((r) => setTimeout(r, 2500));

  const report = await win.webContents.executeJavaScript(`(function(){
    const out = [];
    function check(name, fn) {
      try {
        const r = fn();
        out.push({ name, ok: !!r.ok, msg: r.msg || '' });
      } catch (e) {
        out.push({ name, ok: false, msg: e.message });
      }
    }
    check('API timing', () => {
      const ok =
        typeof computeTimingEngine === 'function' &&
        typeof analyzeSpinCadence === 'function' &&
        typeof getTimingPressure === 'function' &&
        typeof buildTimingHTML === 'function' &&
        typeof renderTimingPanel === 'function' &&
        typeof renderTiming === 'function';
      return { ok, msg: '5+ alias' };
    });
    check('renderTiming panel', () => {
      clearSessionData();
      renderTimingPanel();
      const h = (document.getElementById('timing') || {}).innerHTML;
      if (!h.includes('TIMING PILIER')) return { ok: false, msg: 'prázdny panel' };
      return { ok: true, msg: h.length + ' zn' };
    });
    check('getTimingPressure', () => {
      const p = getTimingPressure();
      if (typeof p.pressure !== 'number') return { ok: false, msg: 'no pressure' };
      return { ok: true, msg: 'pressure=' + p.pressure };
    });
    return out;
  })()`);

  let failed = 0;
  report.forEach((r) => {
    if (r.ok) console.log('OK:', r.name, '—', r.msg);
    else {
      console.error('FAIL:', r.name, '—', r.msg);
      failed++;
    }
  });
  app.quit();
  process.exit(failed ? 1 : 0);
});
