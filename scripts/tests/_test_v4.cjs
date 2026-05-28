/**
 * Layout V6 + koleso UI (základný)
 * Spustenie: npm run test:v4:layout
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

const inlineStart = html.indexOf('<script>\n/* QRP7-V4');
const inlineEnd = html.indexOf('</script>\n<script src="scripts/analytics/roulette-analytics.js"');
const jsPath = path.join(root, '_test_v4_extract.js');
if (inlineStart < 0 || inlineEnd <= inlineStart) {
  fail('JS syntax — inline blok nenájdený');
} else {
  const inlineJs = html.slice(inlineStart + '<script>'.length, inlineEnd);
  fs.writeFileSync(jsPath, inlineJs);
  try { execSync('node --check "' + jsPath + '"', { stdio: 'pipe' }); ok('JS syntax'); }
  catch (e) { fail('JS syntax'); }
  fs.unlinkSync(jsPath);
}

['v6-block-board', 'v6-block-wheel', 'v6-hub-two'].forEach((s) => {
  if (!html.includes(s)) fail('layout ' + s);
});
ok('layout HTML');

if (fs.existsSync(path.join(root, 'index.html'))) {
  const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  if (idx.length !== html.length) fail('index.html != V4 (spusti: npm run sync-v4)');
  else ok('index.html sync s V4');
} else ok('index.html sync s V4 (iba V4)');

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
  await new Promise((r) => setTimeout(r, 1600));

  const report = await win.webContents.executeJavaScript(`(function(){
    const out = [];
    function check(name, fn) {
      try { const r = fn(); out.push({ name, ok: !!r.ok, msg: r.msg || '' }); }
      catch (e) { out.push({ name, ok: false, msg: e.message }); }
    }
    const $ = (id) => document.getElementById(id);
    [32,15,19,4,21,2].forEach(n => spin(n));
    renderLight({ wheelImmediate: true });
    check('poradie layoutu', () => {
      const board = document.querySelector('.v6-block-board');
      const wheel = document.querySelector('.v6-block-wheel');
      const hub = document.querySelector('.v6-hub-two');
      if (!board || !wheel || !hub) return { ok: false, msg: 'sekcie' };
      const okOrder = board.compareDocumentPosition(wheel) & 4 && wheel.compareDocumentPosition(hub) & 4;
      return okOrder ? { ok: true, msg: 'board→koleso→pred+analytik' } : { ok: false, msg: 'zlé poradie' };
    });
    check('behavior alerty', () => {
      const h = ($('alertSystem') || {}).innerHTML || '';
      const w = ($('warning') || {}).innerHTML || '';
      const okA = !h.includes('LIVE RIZIKO') && !h.includes('nervový') && (h.includes('bah-alert') || h.includes('bah-wait'));
      return okA ? { ok: true, msg: 'OK' } : { ok: false, msg: 'starý alert UI' };
    });
    check('kombinačné % štatistiky', () => {
      const h = ($('statsPanel') || {}).innerHTML || '';
      const okC = h.includes('KOMBINAČNÉ % ŠTATISTIKY') && h.includes('STĹPCE MIX') && h.includes('combo-stat-row');
      const inEss = document.querySelector('.v6-essential-stats #statsPanel');
      return okC && inEss ? { ok: true, msg: 'combo v hlavnom pásme' } : { ok: false, msg: okC ? 'stats mimo essential' : 'chýba combo' };
    });
    check('pokročilá sekcia zatvorená', () => {
      const p = $('engineAdvancedPanel');
      const b = $('btnEngineAdvanced');
      const okE = p && p.classList.contains('collapsed') && b && !b.classList.contains('open');
      const noOld = !document.getElementById('detailModules') && !document.getElementById('advancedDiagnostics');
      const fatLeft = document.querySelector('.col-left-v6 #sessionFatiguePanel');
      const hcRight = document.querySelector('.col-right-v6 #hotCold');
      const fatAdv = document.querySelector('#engineAdvancedPanel #sessionFatiguePanel');
      const okLay = fatLeft && hcRight && !fatAdv;
      return okE && noOld && okLay ? { ok: true, msg: 'zatvorené · únava vľavo · hot vpravo' } : { ok: false, msg: 'layout' };
    });
    check('timing v hlavnom UI', () => {
      const t = document.querySelector('.v6-essential-timing #timing');
      const h = t ? (t.innerHTML || '').length : 0;
      return t && h > 20 ? { ok: true, msg: h + ' zn' } : { ok: false, msg: 'timing nie v essential' };
    });
    check('história', () => {
      const hist = $('history');
      const n = hist ? hist.querySelectorAll('.history-cell').length : 0;
      return n >= 6 ? { ok: true, msg: n + ' buniek' } : { ok: false, msg: n };
    });
    check('koleso radar V1 + canvas', () => {
      const n = document.querySelectorAll('.qw-metric').length;
      const left = ($('qwPanelLeft') || {}).innerHTML || '';
      const okUi = $('wheelCanvas') && $('qwStatusBanner') && left.includes('FLOW STAV') && n >= 8;
      return okUi ? { ok: true, msg: n + ' metrík · radar' } : { ok: false, msg: n + ' · ' + left.length };
    });
    check('AI predikcia', () => {
      const h = ($('corePrediction') || {}).innerHTML || '';
      return h.length > 120 ? { ok: true, msg: h.length + ' zn' } : { ok: false, msg: 'prázdne' };
    });
    check('analytik', () => {
      const h = ($('alerts') || {}).innerHTML || '';
      return h.length > 200 ? { ok: true, msg: h.length + ' zn' } : { ok: false, msg: 'prázdne' };
    });
    check('SPIN 70%', () => {
      const el = $('spinEngine');
      return el && el.style.display !== 'none' && el.innerHTML.length > 50
        ? { ok: true, msg: 'OK' } : { ok: false, msg: 'nie' };
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

setTimeout(() => { console.error('FAIL: timeout'); app.exit(1); }, 25000);
