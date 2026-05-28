const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore', windowsHide: true });
  } catch (_) {}
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function quarantine(name) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return;
  try {
    fs.rmSync(p, { recursive: true, force: true, maxRetries: 4, retryDelay: 400 });
  } catch (_) {
    const bak = name + '-ZMaz-' + Date.now();
    try {
      fs.renameSync(p, path.join(root, bak));
      console.log('[pre-dist] premenované:', name, '→', bak);
    } catch (_) {}
  }
}

console.log('[pre-dist] Ukončujem RULETA / Electron / builder…');
run('taskkill /F /IM RULETA.exe /T');
run('taskkill /F /IM quantum-app.exe /T');
run('taskkill /F /IM electron.exe /T');
run('taskkill /F /IM "KVANTOVÁ RULETA PRO V4.exe" /T');
run('taskkill /F /IM app-builder.exe /T');
sleep(1500);

['.build-temp', 'dist-latest', 'win-unpacked'].forEach(quarantine);
fs.readdirSync(root).filter((n) => n.startsWith('.build-')).forEach(quarantine);

console.log('[pre-dist] OK — build pôjde do nového .build-<čas>');
