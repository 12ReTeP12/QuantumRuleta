/**
 * Balík 7D — stav workspace (DEV vs PLAYER).
 * Spustenie: npm run check:workspace
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const hasNm = exists('node_modules/electron/package.json');
const hasApp = exists('app/RULETA.exe');
const hasV2 = exists('index-NOVY-V2.html');
const hasIndex = exists('index.html');

console.log('\n=== QuantumApp — režim workspace ===\n');
console.log('  index-NOVY-V2.html (zdroj):', hasV2 ? 'ÁNO' : 'CHÝBA');
console.log('  index.html (runtime):       ', hasIndex ? 'ÁNO' : 'CHÝBA — spusti npm run sync-v2');
console.log('  node_modules (DEV):         ', hasNm ? 'ÁNO' : 'CHÝBA — npm install');
console.log('  app/RULETA.exe (PLAYER):    ', hasApp ? 'ÁNO' : 'CHÝBA — npm run dist');

if (hasNm && hasV2) {
  console.log('\n  DEV:   npm run dev   alebo   npm start');
}
if (hasApp && hasIndex) {
  console.log('  PLAY:  npm run play  alebo   app\\RULETA.exe');
}
if (hasNm && hasApp) {
  console.log('\n  INFO: Máš oba runtime (dev + packaged). Na úsporu miesta môžeš zmazať app\\ ak používaš len npm start.');
}
if (!hasNm && !hasApp) {
  console.log('\n  WARN: Nič na spustenie — npm install + sync-v2 alebo dist');
  process.exit(1);
}
console.log('');
