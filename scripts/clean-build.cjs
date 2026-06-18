/**
 * Balík 7C — build hygiene: upratá koreň + kontrola zakázaných artefaktov.
 * Spustenie: npm run clean:build
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');

function isForbiddenDir(name) {
  return (
    name.startsWith('.build-') ||
    name.startsWith('_build') ||
    name.startsWith('dist-') ||
    name === 'win-unpacked' ||
    name === '.build-temp' ||
    name === '.build-out' ||
    name.includes('ZMaz') ||
    name === '_gh_push' ||
    name === '_gh_clone'
  );
}

function isForbiddenFile(name) {
  if (name.endsWith('.exe') && name !== 'RULETA.exe') return true;
  if (name.endsWith('.blockmap')) return true;
  if (name === 'builder-debug.yml' || name === 'builder-effective-config.yaml') return true;
  if (name === 'index-NOVY-V1.html' || name === 'index-NOVY-V4.html') return true;
  return false;
}

function scanForbidden() {
  const found = [];
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    const n = ent.name;
    if (ent.isDirectory()) {
      if (isForbiddenDir(n)) found.push({ type: 'dir', name: n });
    } else if (isForbiddenFile(n)) {
      found.push({ type: 'file', name: n });
    }
  }
  const rootExe = path.join(root, 'RULETA.exe');
  if (fs.existsSync(rootExe)) found.push({ type: 'file', name: 'RULETA.exe (portable v koreni)' });
  return found;
}

console.log('[clean:build] Spúšťam upratat…');
execSync('node scripts/upratat-vsetko.cjs', { cwd: root, stdio: 'inherit' });

const left = scanForbidden();
if (left.length) {
  console.error('[clean:build] FAIL — zostávajú zakázané položky:');
  left.forEach((x) => console.error('  ', x.type, x.name));
  process.exit(1);
}

if (!fs.existsSync(path.join(root, 'app', 'RULETA.exe'))) {
  console.warn('[clean:build] WARN — app\\RULETA.exe chýba (spusti npm run dist pre PLAYER režim)');
} else {
  console.log('[clean:build] OK — app\\RULETA.exe je jediný produkčný build');
}

console.log('[clean:build] OK — žiadne .build-* / win-unpacked / dist-* v koreni');
