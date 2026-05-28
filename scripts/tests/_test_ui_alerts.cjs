/**
 * Smoke test ui-alerts.js — buildAlertsHTML, upozornenia, updateAlerts
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
    check('funkcie existujú', () => {
      const ok =
        typeof buildAlertsHTML === 'function' &&
        typeof buildUpozorneniaSekcia === 'function' &&
        typeof updateAlerts === 'function' &&
        typeof renderAlerts === 'function';
      return { ok, msg: '4+ render' };
    });
    check('upozornenia max 2 karty', () => {
      clearSessionData();
      [1, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 8, 30, 1].forEach((n) => spin(n));
      updateAlerts();
      const h = (document.getElementById('alertSystem') || {}).innerHTML || '';
      const cards = (h.match(/bah-alert-card/g) || []).length;
      if (cards > 2) return { ok: false, msg: cards + ' kariet' };
      if (!h.includes('bah-') && !h.includes('bah-wait') && !h.includes('bah-neutral'))
        return { ok: false, msg: 'prázdne upozornenia' };
      return { ok: true, msg: cards + ' kariet' };
    });
    check('observer alerts HTML', () => {
      const a = (document.getElementById('alerts') || {}).innerHTML || '';
      if (!a.includes('ro-observer')) return { ok: false, msg: 'chýba ro-observer' };
      const bad = ['ra-metric-grid', 'NO TRUST', 'WAIT MODE'];
      for (const b of bad) if (a.includes(b)) return { ok: false, msg: b };
      return { ok: true, msg: a.length + ' zn' };
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
