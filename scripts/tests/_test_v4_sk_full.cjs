/**
 * Komplexná kontrola slovenčiny + všetky V4 testy (súhrn)
 * Spustenie: npm run test:v4:all  (volá test:v4, test:v4:audit, test:v4:wheel)
 */
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V4.html');
const indexPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
let failed = 0;
const ok = (m) => console.log('OK:', m);
const fail = (m) => { console.error('FAIL:', m); failed++; };

if (fs.readFileSync(indexPath, 'utf8').length !== html.length) {
  fail('index.html nie je sync — spusti: npm run sync-v4');
} else ok('sync index.html ↔ V4');

const m = html.match(/<script>([\s\S]*)<\/script>/);
const jsPath = path.join(root, '_test_sk_extract.js');
fs.writeFileSync(jsPath, m[1]);
try {
  execSync('node --check "' + jsPath + '"', { stdio: 'pipe' });
  ok('JS syntax');
} catch (e) {
  fail('JS syntax');
}
fs.unlinkSync(jsPath);

const forbiddenStatic = [
  'LEARNING MODE ·',
  'DEBUG MODE ·',
  'Pure Random Picker',
  'WHEEL FLOW SCANNER<small>live behavior',
  'LIVE FLOW OUTPUT ·',
  'behavior observera',
];
const htmlBody = html.split('<script>')[0];
forbiddenStatic.forEach((s) => {
  if (htmlBody.includes(s)) fail('angličtina v HTML: ' + s);
});
const scriptOnly = (m && m[1]) || '';
function enOnlyInSkMap(src, needle) {
  if (!src.includes(needle)) return false;
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stripped = src.replace(new RegExp("'"+esc+"'\\s*:", 'g'), '');
  return stripped.includes(needle);
}
const forbiddenScript = [
  'LEARNING MODE ·', 'DEBUG MODE ·', 'Pure Random Picker',
  'RNG behavior analysis.</div>', 'Ball timing</span>', 'Flow score</span>',
  'invisible engine)</div>', 'ŽIVÝ WHEEL FLOW SCANNER',
];
forbiddenScript.forEach((s) => {
  if (enOnlyInSkMap(scriptOnly, s)) fail('angličtina v UI výstupe: ' + s);
});
ok('statická kontrola zakázaných EN reťazcov');

const mustSk = ['function sk(', 'REŽIM ČAKANIA', 'ŽIVÝ RADAR TOKU KOLESA', 'skUiLabel', 'ČISTÝ RANDOM VÝBER'];
mustSk.forEach((s) => {
  if (!html.includes(s)) fail('chýba SK prvok: ' + s);
  else ok('SK: ' + s);
});

function runNpmScript(name) {
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', name], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    shell: true,
  });
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0) {
    fail(name + ' exit ' + r.status + '\n' + out.slice(-800));
    return false;
  }
  ok('npm run ' + name);
  return true;
}

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
    const badEn = /\\b(LEARNING MODE|EARLY FLOW MODE|AI State Machine|Live Spin Pipeline|Ball timing|Flow score|Fokus pas|RNG behavior|DEBUG MODE|Pure Random|EDGE AKTÍVNY|invisible engine|behavior analysis)\\b/i;

    [32,15,19,4,21,2,25,17,34,6,11,8,20,7,18].forEach(n => spin(n));
    renderLight({ wheelImmediate: true });

    check('sk() preklad', () => {
      const t = typeof sk === 'function' ? sk('HIGH RISK') : 'HIGH RISK';
      return t === 'VYSOKÉ RIZIKO' ? { ok: true, msg: t } : { ok: false, msg: t };
    });

    check('hlavné panely SK', () => {
      const parts = [
        $('corePrediction'), $('statsPanel'), $('alerts'), $('warning'),
        $('wheelRadarData'), document.querySelector('.v6-rng-behavior'),
        $('timing'), document.querySelector('.v6-essential-strip')
      ].filter(Boolean).map(el => el.innerText || el.textContent || '').join(' ');
      return badEn.test(parts) ? { ok: false, msg: 'nájdená EN' } : { ok: true, msg: parts.length + ' zn' };
    });

    check('koleso badge SK', () => {
      const b = $('qwScannerBadge');
      const t = b ? b.textContent : '';
      return t && !/WAIT MODE/.test(t) ? { ok: true, msg: t } : { ok: false, msg: t || '—' };
    });

    check('všetky enginy', () => {
      const fns = [
        () => computeAIPrediction(),
        () => computeBehaviorAlerts(),
        () => computeQuantumWheelBrain(),
        () => computeRawStatsEngine(),
        () => computeRiskChaosEngine(),
        () => { renderRandomSessionPick(); return true; },
      ];
      for (const fn of fns) {
        const r = fn();
        if (r === undefined) return { ok: false, msg: 'undefined z ' + fn };
      }
      return { ok: true, msg: fns.length + ' OK' };
    });

    check('undo + render', () => {
      const n = spins.length;
      undoLastSpin();
      renderLight();
      return spins.length === n - 1 ? { ok: true, msg: 'undo OK' } : { ok: false, msg: 'undo' };
    });

    return out;
  })()`);

  for (const r of report) {
    if (r.ok) ok('runtime: ' + r.name + ' — ' + r.msg);
    else fail('runtime: ' + r.name + ' — ' + r.msg);
  }

  await win.destroy();

  if (failed === 0) {
    runNpmScript('test:v4');
    runNpmScript('test:v4:audit');
    runNpmScript('test:v4:wheel');
  }

  console.log(failed ? '\\nSK FULL: ZLYHANIE (' + failed + ')' : '\\nSK FULL: VŠETKO OK');
  app.exit(failed ? 1 : 0);
});

setTimeout(() => { console.error('FAIL: timeout'); app.exit(1); }, 180000);
