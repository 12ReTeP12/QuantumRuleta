/**
 * Balík 7E — audit veľkosti workspace + detekcia duplicít / build artefaktov.
 * Spustenie: npm run audit:disk
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const reportDir = path.join(__dirname, 'tests', 'reports');
const reportPath = path.join(reportDir, 'audit-disk-usage.json');

function dirSizeMB(abs) {
  if (!fs.existsSync(abs)) return 0;
  let sum = 0;
  const stack = [abs];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    for (const ent of entries) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else {
        try {
          sum += fs.statSync(p).size;
        } catch (_) {}
      }
    }
  }
  return Math.round((sum / 1024 / 1024) * 100) / 100;
}

function scanRoot() {
  const dirs = [];
  const files = [];
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (ent.name === '.' || ent.name === '..') continue;
    const abs = path.join(root, ent.name);
    if (ent.isDirectory()) {
      dirs.push({ name: ent.name, mb: dirSizeMB(abs) });
    } else {
      try {
        files.push({ name: ent.name, mb: Math.round((fs.statSync(abs).size / 1024 / 1024) * 1000) / 1000 });
      } catch (_) {}
    }
  }
  dirs.sort((a, b) => b.mb - a.mb);
  return { dirs, files };
}

const FAIL = [];
const WARN = [];
const PASS = [];

function fail(msg) {
  FAIL.push(msg);
}
function warn(msg) {
  WARN.push(msg);
}
function pass(msg) {
  PASS.push(msg);
}

const { dirs, files } = scanRoot();
const totalMB = dirs.reduce((s, d) => s + d.mb, 0) + files.reduce((s, f) => s + f.mb, 0);

console.log('\n=== BALÍK 7E — AUDIT DISKU ===\n');
console.log('Celkom (odhad):', Math.round(totalMB * 100) / 100, 'MB (~' + (totalMB / 1024).toFixed(2) + ' GB)\n');
console.log('Top zložky:');
dirs.slice(0, 12).forEach((d) => console.log('  ', String(d.mb).padStart(8), 'MB', d.name));

const forbiddenDirs = dirs.filter((d) =>
  d.name.startsWith('.build-') ||
  d.name.startsWith('dist-') ||
  d.name === 'win-unpacked' ||
  d.name === '.build-out' ||
  d.name === '.build-temp' ||
  d.name.includes('ZMaz') ||
  d.name === '_gh_push' ||
  d.name === '_gh_clone'
);
if (forbiddenDirs.length) forbiddenDirs.forEach((d) => fail('Build/duplicitný klon: ' + d.name + ' (' + d.mb + ' MB)'));
else pass('Žiadne .build-* / win-unpacked / _gh_* v koreni');

if (files.some((f) => f.name === 'index-NOVY-V1.html' || f.name === 'index-NOVY-V4.html')) {
  fail('Legacy HTML v koreni (V1/V4)');
} else pass('Žiadne index-NOVY-V1/V4 v koreni');

if (files.some((f) => f.name === 'RULETA.exe')) fail('Portable RULETA.exe v koreni');
else pass('Žiadny portable RULETA.exe v koreni');

if (!fs.existsSync(path.join(root, 'index-NOVY-V2.html'))) fail('Chýba index-NOVY-V2.html');
else pass('V2 zdroj prítomný');

const hasNm = fs.existsSync(path.join(root, 'node_modules', 'electron'));
const hasApp = fs.existsSync(path.join(root, 'app', 'RULETA.exe'));
if (hasNm && hasApp) {
  warn('Duplicitný Electron runtime: node_modules/electron + app/ (očakávané ak DEV+PLAYER na jednom PC)');
} else if (hasNm) pass('Len DEV runtime (node_modules)');
  else if (hasApp) pass('Len PLAYER runtime (app/)');
  else fail('Chýba electron aj app/RULETA.exe');

if (totalMB > 1200) warn('Workspace > 1.2 GB — zváž DEV bez app/ alebo audit duplicít');
else pass('Veľkosť workspace v normálnom rozsahu');

console.log('\n--- Výsledok ---');
PASS.forEach((m) => console.log('  PASS:', m));
WARN.forEach((m) => console.warn('  WARN:', m));
FAIL.forEach((m) => console.error('  FAIL:', m));

const report = {
  measuredAt: new Date().toISOString(),
  totalMB: Math.round(totalMB * 100) / 100,
  dirs,
  files: files.filter((f) => f.mb > 0.05),
  pass: PASS,
  warn: WARN,
  fail: FAIL,
};
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log('\nReport:', reportPath, '\n');

if (FAIL.length) process.exit(1);
