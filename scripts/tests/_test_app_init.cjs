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
    check('boot funkcie', () => {
      const ok =
        typeof bootApp === 'function' &&
        typeof initBoard === 'function' &&
        typeof initWheel === 'function' &&
        typeof initAI === 'function' &&
        typeof createBoard === 'function';
      return { ok, msg: 'init API' };
    });
    check('board DOM', () => {
      const b = document.getElementById('board');
      const nums = b ? b.querySelectorAll('.bet.num').length : 0;
      return nums >= 37 ? { ok: true, msg: nums + ' polí' } : { ok: false, msg: 'nums=' + nums };
    });
    check('wheel canvas', () => {
      const c = document.getElementById('wheelCanvas');
      return c && c.width >= 100 ? { ok: true, msg: c.width + 'px' } : { ok: false, msg: 'no canvas' };
    });
    check('spin funguje', () => {
      const before = spins.length;
      spin(7);
      renderLight({ wheelImmediate: true });
      return spins.length === before + 1 ? { ok: true, msg: 'spins=' + spins.length } : { ok: false, msg: 'spin fail' };
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
