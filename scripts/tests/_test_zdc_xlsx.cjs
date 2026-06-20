/**
 * Testy natívneho .xlsx exportu ZBER DÁT 0–36
 * Spustenie: node scripts/tests/_test_zdc_xlsx.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..', '..');
let failed = 0;
const ok = (m) => console.log('OK:', m);
const fail = (m) => { console.error('FAIL:', m); failed++; };

function mockStorage() {
  const map = {};
  return {
    getItem(k) { return map[k] != null ? map[k] : null; },
    setItem(k, v) { map[k] = v; }
  };
}

function loadZdc() {
  const ctx = { console, localStorage: mockStorage() };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/core/constants.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/core/helpers.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/analytics/zber-dat-0-36.js'), 'utf8'), ctx);
  return ctx;
}

function sheetText(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return '';
  return XLSX.utils.sheet_to_csv(ws);
}

console.log('\n=== ZDC XLSX EXPORT ===\n');

const xlsxApi = require(path.join(root, 'scripts/analytics/zber-dat-0-36-xlsx.js'));
if (xlsxApi.buildWorkbook && xlsxApi.exportFull) ok('X1: modul zber-dat-0-36-xlsx.js');
else fail('X1: modul');

const ctx = loadZdc();
let store = ctx.zdcNewStore();
for (let c = 0; c < 3; c++) {
  for (let i = 0; i < 120; i++) ctx.zdcOnSpin(store, (i + c * 3) % 37);
  ctx.zdcCloseSession(store);
}

/* Full export workbook */
const wbFull = xlsxApi.buildWorkbook(store, { exportType: 'full' });
const names = wbFull.SheetNames;
if (names.includes('META') && names.includes('RAW')) ok('X2: full — META + RAW listy');
else fail('X2: META/RAW: ' + names.join(', '));

if (names.includes('SESSION_01') && names.includes('SESSION_02') && names.includes('SESSION_03')) ok('X2: full — SESSION_01..03');
else fail('X2: session listy: ' + names.join(', '));

const rawCsv = sheetText(wbFull, 'RAW');
if (/session_id/.test(rawCsv) && /poradie/.test(rawCsv) && rawCsv.split('\n').length > 120) ok('X2: RAW obsahuje spiny');
else fail('X2: RAW obsah');

const s1 = sheetText(wbFull, 'SESSION_01');
if (/METADATA SESSION/.test(s1) && /ĽUDSKÝ ZÁVER SESSION/.test(s1) && /TABUĽKA ČÍSEL 0–36/.test(s1)) ok('X2: SESSION_01 report + tabuľka');
else fail('X2: SESSION_01 obsah');

if (/Silné väzby/.test(s1) && /Komentár/.test(s1)) ok('X2: trigger stĺpce v session sheet');
else fail('X2: trigger stĺpce');

if (/PATTERNY A OPAKOVANIA/.test(s1)) ok('X2: session sheet — sekcia patterny');
else fail('X2: patterns section');

if (/NÁVRATY ČÍSEL/.test(s1) && /TOP NAJRÝCHLEJŠIE NÁVRATY/.test(s1)) ok('X2: session sheet — návraty čísel');
else fail('X2: return section');

/* Single session export */
const sess2 = store.closed.find(function (s) { return s.number === 2; });
const wbOne = xlsxApi.buildWorkbook(store, { exportType: 'session', session: sess2 });
if (wbOne.SheetNames.includes('META') && wbOne.SheetNames.includes('RAW') && wbOne.SheetNames.includes('SESSION_02')) ok('X3: export jednej session — 3 listy');
else fail('X3: single session listy: ' + wbOne.SheetNames.join(', '));

const rawOne = sheetText(wbOne, 'RAW');
const rawLines = rawOne.trim().split('\n').filter(Boolean);
if (rawLines.length === 121) ok('X3: RAW jednej session = 120 spinov + header');
else fail('X3: raw lines=' + rawLines.length);

/* Raw-only export */
const wbRaw = xlsxApi.buildWorkbook(store, { exportType: 'raw' });
if (wbRaw.SheetNames.length === 1 && wbRaw.SheetNames[0] === 'RAW') ok('X4: export iba RAW — 1 list');
else fail('X4: raw only');

/* Master after 12 sessions */
store = ctx.zdcNewStore();
for (let c = 0; c < 12; c++) {
  for (let i = 0; i < 120; i++) ctx.zdcOnSpin(store, (i + c) % 37);
  ctx.zdcCloseSession(store);
}
const wbMaster = xlsxApi.buildWorkbook(store, { exportType: 'full' });
if (wbMaster.SheetNames.includes('MASTER')) ok('X5: MASTER list po 12 session');
else fail('X5: MASTER chýba');

const masterTxt = sheetText(wbMaster, 'MASTER');
if (/TOP 10 ZAUJÍMAVOSTÍ/.test(masterTxt) && /AGREGOVANÁ TABUĽKA/.test(masterTxt)) ok('X5: MASTER TOP10 + tabuľka');
else fail('X5: MASTER obsah');

if (/POROVNANIE SESSION/.test(masterTxt) && /STABILITA NÁSLEDNOSTÍ/.test(masterTxt)) ok('X5: MASTER porovnanie + stabilita');
else fail('X5: MASTER comparison/stability');

if (/SILNÉ VÄZBY NAPRIEČ SESSION/.test(masterTxt)) ok('X5: MASTER cross-session bonds');
else fail('X5: MASTER bonds');

if (/Cyklus #/.test(masterTxt) && /Počet session v reporte/.test(masterTxt)) ok('X5: MASTER cycle metadata');
else fail('X5: MASTER cycle metadata');

if (wbMaster.SheetNames.filter(function (n) { return /^SESSION_/.test(n); }).length === 12) ok('X5: 12 session listov');
else fail('X5: session count');

/* Write binary smoke */
const buf = xlsxApi.workbookToArrayBuffer(wbFull);
if (buf && buf.byteLength > 5000) ok('X6: .xlsx buffer > 5KB');
else fail('X6: buffer size');

const tmp = path.join(root, 'scripts', 'tests', '_tmp_zdc_export.xlsx');
fs.writeFileSync(tmp, Buffer.from(buf));
const readBack = XLSX.readFile(tmp);
if (readBack.SheetNames.includes('SESSION_01')) ok('X6: súbor .xlsx otvárateľný');
else fail('X6: read back');
try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ }

/* Izolácia — compute súbor bez xlsx importu */
const computeSrc = fs.readFileSync(path.join(root, 'scripts/analytics/zber-dat-0-36.js'), 'utf8');
if (!/require\s*\(\s*['"]xlsx['"]/.test(computeSrc)) ok('X7: compute bez xlsx závislosti');
else fail('X7: compute izolácia');

console.log(failed ? '\nZDC XLSX TEST: FAIL\n' : '\nZDC XLSX TEST: OK\n');
process.exit(failed ? 1 : 0);
