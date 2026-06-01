const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'index-NOVY-V2.html');
const dest = path.join(root, 'index.html');

if (!fs.existsSync(src)) {
  console.error('[sync-v2] Chýba index-NOVY-V2.html');
  process.exit(1);
}
fs.copyFileSync(src, dest);
const size = fs.statSync(dest).size;
console.log('[sync-v2] index.html ← index-NOVY-V2.html (' + size + ' B)');
console.log('[sync-v2] Spustenie: SPUSTIT-RULETA.bat alebo npm start alebo app\\RULETA.exe');
