/**
 * Build do jednej zložky app\ — žiadny portable (žiadne rozbaliovanie do Temp, menej exe pre Avast).
 * Spustenie: app\RULETA.exe alebo odkaz RULETA.lnk v koreni.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const APP_DIR = 'app';
const LAUNCHER = 'RULETA.exe';
const appAbs = path.join(root, APP_DIR);

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: root, windowsHide: true });
}

function killApps() {
  [
    'taskkill /F /IM RULETA.exe /T',
    'taskkill /F /IM quantum-app.exe /T',
    'taskkill /F /IM electron.exe /T',
    'taskkill /F /IM "KVANTOVÁ RULETA PRO V4.exe" /T',
    'taskkill /F /IM app-builder.exe /T',
  ].forEach((c) => {
    try {
      execSync(c, { stdio: 'ignore', windowsHide: true });
    } catch (_) {}
  });
  sleep(2500);
}

function quarantineDir(name) {
  const abs = path.join(root, name);
  if (!fs.existsSync(abs)) return;
  try {
    fs.rmSync(abs, { recursive: true, force: true, maxRetries: 8, retryDelay: 500 });
    console.log('[dist] zmazané:', name);
  } catch (_) {
    const bak = name + '-ZMaz-' + Date.now();
    try {
      fs.renameSync(abs, path.join(root, bak));
      console.log('[dist] zamknuté →', bak);
    } catch (_) {
      console.warn('[dist] nepodarilo sa odstrániť:', name);
    }
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function copyTreeFiltered(srcDir, destDir, skipDirNames) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (ent.isDirectory() && skipDirNames.includes(ent.name)) continue;
    const s = path.join(srcDir, ent.name);
    const d = path.join(destDir, ent.name);
    if (ent.isDirectory()) copyTreeFiltered(s, d, skipDirNames);
    else fs.copyFileSync(s, d);
  }
}

function createRootShortcut() {
  const lnk = path.join(root, 'RULETA.lnk').replace(/'/g, "''");
  const target = path.join(appAbs, LAUNCHER).replace(/'/g, "''");
  const workDir = appAbs.replace(/'/g, "''");
  const cmd =
    "$ws=New-Object -ComObject WScript.Shell;" +
    "$s=$ws.CreateShortcut('" + lnk + "');" +
    "$s.TargetPath='" + target + "';" +
    "$s.WorkingDirectory='" + workDir + "';" +
    "$s.Description='Kvantova ruleta';" +
    '$s.Save()';
  try {
    execSync('powershell -NoProfile -Command "' + cmd + '"', { stdio: 'ignore', windowsHide: true });
    console.log('[dist] Odkaz v koreni: RULETA.lnk → app\\RULETA.exe');
  } catch (_) {
    console.warn('[dist] RULETA.lnk sa nevytvoril — spúšťaj app\\RULETA.exe');
  }
}

killApps();

fs.readdirSync(root)
  .filter(
    (n) =>
      n.startsWith('.build-') ||
      n.startsWith('dist-') ||
      n.startsWith('_build') ||
      n === 'win-unpacked' ||
      n === '.build-temp' ||
      n === '.build-out' ||
      (n.includes('ZMaz') && fs.statSync(path.join(root, n)).isDirectory())
  )
  .forEach(quarantineDir);

const BUILD_DIR = '.build-' + Date.now();
const unpacked = path.join(root, BUILD_DIR, 'win-unpacked');

console.log('[dist] Build (dir, nie portable) do', BUILD_DIR);
run('npx electron-builder --win dir --config.directories.output=' + BUILD_DIR);

if (!fs.existsSync(unpacked)) {
  console.error('[dist] Chýba win-unpacked v', BUILD_DIR);
  process.exit(1);
}

let gameExe = path.join(unpacked, LAUNCHER);
if (!fs.existsSync(gameExe)) {
  const alt = fs.readdirSync(unpacked).find((f) => f.endsWith('.exe') && !/uninstall/i.test(f));
  if (!alt) {
    console.error('[dist] Nenašiel som RULETA.exe v build-e');
    process.exit(1);
  }
  gameExe = path.join(unpacked, alt);
}

async function patchAppAsar() {
  const liveIndex = path.join(root, 'index.html');
  const liveMain = path.join(root, 'main.js');
  const appIndex = path.join(appAbs, 'resources', 'app.asar');
  if (!fs.existsSync(liveIndex) || !fs.existsSync(liveMain) || !fs.existsSync(appIndex)) return;
  const asar = require('@electron/asar');
  const extractDir = path.join(appAbs, 'resources', 'app-live-patch');
  if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
  asar.extractAll(appIndex, extractDir);
  fs.copyFileSync(liveIndex, path.join(extractDir, 'index.html'));
  fs.copyFileSync(liveMain, path.join(extractDir, 'main.js'));
  copyTreeFiltered(path.join(root, 'styles'), path.join(extractDir, 'styles'), []);
  copyTreeFiltered(path.join(root, 'scripts'), path.join(extractDir, 'scripts'), ['tests']);
  await asar.createPackage(extractDir, appIndex);
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 300 });
  }
  console.log('[dist] app.asar: index.html, main.js, styles/, scripts/ (bez tests/)');
}

(async function distFinish() {
  killApps();
  quarantineDir(APP_DIR);
  copyDir(unpacked, appAbs);

  try {
    await patchAppAsar();
  } catch (e) {
    console.warn('[dist] app.asar patch preskočený:', e.message);
  }

  const rootPortable = path.join(root, LAUNCHER);
  if (fs.existsSync(rootPortable)) {
    try {
      fs.unlinkSync(rootPortable);
      console.log('[dist] Zmazaný starý portable', LAUNCHER, 'v koreni (spôsoboval Avast)');
    } catch (_) {
      try {
        fs.renameSync(rootPortable, path.join(root, 'RULETA-portable-STARÝ-' + Date.now() + '.exe'));
      } catch (_) {}
    }
  }

  fs.readdirSync(root).forEach((n) => {
    if (!n.endsWith('.exe')) return;
    try {
      fs.unlinkSync(path.join(root, n));
      console.log('[dist] zmazaný .exe v koreni:', n);
    } catch (_) {}
  });

  killApps();
  quarantineDir(BUILD_DIR);
  createRootShortcut();

  console.log('\n[dist] HRA: dvojklik na  app\\RULETA.exe');
  console.log('[dist]      alebo      RULETA.lnk  v koreni');
  console.log('[dist] Avast: npm run avast  → výnimka pre celý priečinok QuantumApp\n');

  require('./upratat-vsetko.cjs');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
