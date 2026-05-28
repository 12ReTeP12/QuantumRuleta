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
  await new Promise((r) => setTimeout(r, 3000));

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
    check('board API', () => {
      const ok =
        typeof buildBoardHTML === 'function' &&
        typeof renderBoard === 'function' &&
        typeof buildKeyboardHTML === 'function' &&
        typeof renderKeyboard === 'function' &&
        typeof updateBoardNumbers === 'function' &&
        typeof updateBoard === 'function';
      return { ok, msg: '5+ alias' };
    });
    check('klávesnica DOM', () => {
      const b = document.getElementById('board');
      const nums = b ? b.querySelectorAll('.bet.num').length : 0;
      const out = b ? b.querySelectorAll('.bet.outside').length : 0;
      return nums >= 37 && out >= 10
        ? { ok: true, msg: nums + ' čísel, ' + out + ' outside' }
        : { ok: false, msg: 'nums=' + nums + ' out=' + out };
    });
    check('klik číslo', () => {
      const before = spins.length;
      const btn = document.getElementById('num-17');
      if (!btn) return { ok: false, msg: 'chýba num-17' };
      btn.click();
      renderLight({ wheelImmediate: true });
      return spins.length === before + 1 ? { ok: true, msg: 'spin 17 OK' } : { ok: false, msg: 'spin fail' };
    });
    check('updateBoardNumbers', () => {
      [32, 15, 19, 4, 21].forEach((n) => spin(n));
      updateBoardNumbers();
      const el = document.getElementById('num-32');
      const pct = el ? el.getAttribute('data-flow-pressure') : null;
      return pct !== null ? { ok: true, msg: 'num-32 ' + pct + '%' } : { ok: false, msg: 'no pct' };
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
