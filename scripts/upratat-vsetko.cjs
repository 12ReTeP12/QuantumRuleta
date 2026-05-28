/**
 * Vyčistí koreň — jediná hra je v app\RULETA.exe, žiadne win-unpacked v koreni.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const KEEP_FILES = new Set([
  'index.html',
  'index-NOVY-V1.html',
  'index-NOVY-V4.html',
  'main.js',
  'package.json',
  'package-lock.json',
  'SPUSTENIE.txt',
  'RULETA.lnk',
  '.gitignore',
]);
const KEEP_DIRS = new Set(['node_modules', 'scripts', 'app', '.cursor', '.vscode']);

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore', windowsHide: true });
  } catch (_) {}
}

function rmPath(abs, label) {
  if (!fs.existsSync(abs)) return;
  try {
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      fs.rmSync(abs, { recursive: true, force: true, maxRetries: 8, retryDelay: 500 });
    } else {
      fs.unlinkSync(abs);
    }
    console.log('[upratat] zmazané:', label || path.basename(abs));
  } catch (e) {
    const base = path.basename(abs);
    const bak = base + '-ZMaz-' + Date.now();
    try {
      fs.renameSync(abs, path.join(root, bak));
      console.log('[upratat] zamknuté →', bak);
    } catch (_) {
      console.warn('[upratat] preskočené:', label || base);
    }
  }
}

console.log('[upratat] Ukončujem procesy…');
run('taskkill /F /IM RULETA.exe /T');
run('taskkill /F /IM quantum-app.exe /T');
run('taskkill /F /IM electron.exe /T');
run('taskkill /F /IM "KVANTOVÁ RULETA PRO V4.exe" /T');
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);

fs.readdirSync(root, { withFileTypes: true }).forEach((ent) => {
  if (!ent.isDirectory()) return;
  const n = ent.name;
  if (KEEP_DIRS.has(n)) return;
  if (
    n.startsWith('.build-') ||
    n.startsWith('_build') ||
    n.startsWith('dist-') ||
    n === 'win-unpacked' ||
    n === '.build-temp' ||
    n === '.build-out' ||
    n.includes('ZMaz')
  ) {
    rmPath(path.join(root, n), n);
  }
});

fs.readdirSync(root, { withFileTypes: true }).forEach((ent) => {
  if (ent.isDirectory()) return;
  const n = ent.name;
  if (KEEP_FILES.has(n)) return;
  if (n.endsWith('.exe')) {
    rmPath(path.join(root, n), n);
    return;
  }
  if (n.endsWith('.blockmap') || n === 'builder-debug.yml' || n === 'builder-effective-config.yaml') {
    rmPath(path.join(root, n), n);
  }
});

console.log('[upratat] Hotovo. Spúšťaj: app\\RULETA.exe alebo RULETA.lnk');
