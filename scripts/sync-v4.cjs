const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'index-NOVY-V4.html');
const dest = path.join(root, 'index.html');

if (!fs.existsSync(src)) {
  console.error('[sync-v4] Chýba index-NOVY-V4.html');
  process.exit(1);
}
fs.copyFileSync(src, dest);
const size = fs.statSync(dest).size;
console.log('[sync-v4] index.html ← index-NOVY-V4.html (' + size + ' B)');
console.log('[sync-v4] Spustenie: SPUSTIT-V4.bat alebo app\\RULETA.exe (po oprave main.js berie tento index.html)');
