/**
 * Manuálny audit — ukážková session + master (bez nových funkcií)
 * node scripts/tests/_audit_zdc_manual_demo.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..', '..');
const outPath = path.join(root, 'docs', 'ZBER-DAT-AUDIT-UKAZKA.md');

function loadZdc() {
  const ctx = { console, localStorage: { _m: {}, getItem(k) { return this._m[k] || null; }, setItem(k, v) { this._m[k] = v; } } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/core/constants.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/core/helpers.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/analytics/zber-dat-0-36.js'), 'utf8'), ctx);
  return ctx;
}

/* Realistic-ish 132 spins — repeats, short returns, color streaks */
const DEMO_SPINS = [
  32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 8, 17, 8, 0, 32, 8, 17, 8,
  11, 30, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
  8, 17, 8, 17, 5, 1, 2, 3, 1, 2, 3, 5, 10, 23, 36, 8, 17, 32, 15, 19,
  4, 21, 2, 25, 17, 34, 6, 27, 13, 8, 0, 11, 30, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26, 10, 23, 36, 19, 4, 21, 2, 25, 17,
  34, 6, 27, 13, 8, 17, 8, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 8,
  17, 8, 5, 1, 2, 3, 1, 2, 3, 5, 10, 23, 36, 0, 32, 15
];

const lines = [];
const w = (s) => lines.push(s);
const hr = () => w('\n---\n');

function fmtTriggerOverview(table) {
  return table.filter(r => r.hitCount > 0 || r.followCount > 0)
    .sort((a, b) => b.hitCount - a.hitCount || a.number - b.number)
    .slice(0, 12)
    .map(r => `| ${r.number} | ${r.hitCount} | ${r.followCount} | ${r.topNext ?? '—'} | ${(r.strongBonds || []).join(', ') || '—'} | ${(r.humanComment || '').slice(0, 70)}… |`)
    .join('\n');
}

function fmtReturns(returnTable, highlights) {
  const top = (highlights.topFastestReturns || []).slice(0, 5)
    .map(r => `- **${r.number}** — najkratšia medzera **${r.fastestReturn}** spinov (priemer ${r.avgReturn ?? '—'})`);
  const long = (highlights.topLongestAbsences || []).slice(0, 5)
    .map(r => `- **${r.number}** — chýbalo **${r.longestAbsence}** spinov (${r.hitCount}× padlo)`);
  return { top, long };
}

const ctx = loadZdc();
const xlsxApi = require(path.join(root, 'scripts/analytics/zber-dat-0-36-xlsx.js'));

w('# ZBER DÁT 0–36 — Manuálny audit (ukážkový výstup)');
w('');
w('> Generované: ' + new Date().toISOString());
w('> Demo session: **132 spinov** (rozšírená session, min. 120)');
w('> Master: **12 session** po 120 spinoch (cyklus #1)');
hr();

/* ── Single demo session (132 spins) ── */
const store1 = ctx.zdcNewStore();
DEMO_SPINS.forEach(n => ctx.zdcOnSpin(store1, n));
const closed1 = ctx.zdcCloseSession(store1);
const sess = store1.closed[0];
const rep = sess.report;

w('## 1. RAW SPINY (Session 1 · 132 spinov)');
w('');
w('```');
w(rep.summary.spinListText);
w('```');
w('');
w('Počet: **' + rep.summary.spinCount + '** · Kvalita: **' + rep.summary.sampleQuality + '** · Tier: **' + sess.tier + '**');

hr();
w('## 2. TABUĽKA 0–36 — Prehľad (TOP riadky podľa výskytu)');
w('');
w('| Číslo | Výskytov | Pozorovaní | Top | Silné väzby | Komentár (skrátený) |');
w('|------:|---------:|-----------:|----:|-------------|---------------------|');
w(fmtTriggerOverview(rep.triggerTable));

hr();
w('## 3. SESSION REPORT');
w('');
w('### Ľudský záver');
w(rep.humanSummary);
w('');
w('### Charakter');
w(`**${rep.sessionCharacter}** — ${rep.sessionCharacterDetail}`);
w('');
w('### Hot / Cold / Nepadlo');
w(`- Hot: ${(rep.summary.hotNumbers || []).join(', ') || '—'}`);
w(`- Cold: ${(rep.summary.coldNumbers || []).join(', ') || '—'}`);
w(`- Nepadlo: ${(rep.summary.missing || []).join(', ') || '—'}`);
w('');
w('### Výrazné zvláštnosti (TOP 5)');
(rep.top5Anomalies || []).forEach((t, i) => w(`${i + 1}. ${t}`));

hr();
w('## 4. NÁVRATY ČÍSEL');
w('');
const retFmt = fmtReturns(rep.returnTable, rep.returnHighlights);
w('### TOP najrýchlejšie návraty');
retFmt.top.forEach(t => w(t));
w('');
w('### TOP najdlhšie absencie');
retFmt.long.forEach(t => w(t));
w('');
w('### Ukážka tabuľky (čísla s aspoň 2 výskytmi)');
w('| Číslo | Výskytov | Priemerný návrat | Najrýchlejší | Najdlhšia absencia |');
w('|------:|---------:|-----------------:|-------------:|-------------------:|');
rep.returnTable.filter(r => r.hitCount >= 2).slice(0, 10).forEach(r => {
  w(`| ${r.number} | ${r.hitCount} | ${r.avgReturn ?? '—'} | ${r.fastestReturn ?? '—'} | ${r.longestAbsence} |`);
});

hr();
w('## 5. PATTERNY A OPAKOVANIA');
w('');
(rep.patterns || []).forEach((t, i) => w(`${i + 1}. ${t}`));

hr();
w('## 6. MASTER REPORT (cyklus #1 · 12 × 120 spinov)');
w('');

const storeM = ctx.zdcNewStore();
for (let c = 0; c < 12; c++) {
  for (let i = 0; i < 120; i++) ctx.zdcOnSpin(storeM, (DEMO_SPINS[i % DEMO_SPINS.length] + c) % 37);
  ctx.zdcCloseSession(storeM);
}
const m = storeM.master;

w(`### ${m.title}`);
w(`- **Cyklus:** #${m.cycleId}`);
w(`- **Vytvorený:** ${m.generatedAt}`);
w(`- **Session v reporte:** ${m.sessionCount}`);
w(`- **Spiny spolu:** ${m.totalSpins}`);
w('');
w('### Ľudský záver Master');
w(m.humanSummary);
w('');
w('### TOP 10 zaujímavostí');
(m.top10Highlights || []).filter(t => t && t !== '—').slice(0, 10).forEach((t, i) => w(`${i + 1}. ${t}`));
w('');
w('### Porovnanie session (skrátene)');
w('| Session | Spiny | Charakter |');
w('|--------:|------:|-----------|');
(m.sessionComparison || []).slice(0, 6).forEach(c => {
  w(`| ${c.number} | ${c.spinCount} | ${c.sessionCharacter} |`);
});
w('| … | … | … (+ ďalších ' + Math.max(0, (m.sessionComparison || []).length - 6) + ' session) |');

hr();
w('## 7. EXCEL EXPORT (.xlsx)');
w('');

const wbSession = xlsxApi.buildWorkbook(store1, { exportType: 'session', session: sess });
const wbFull = xlsxApi.buildWorkbook(storeM, { exportType: 'full' });
const demoXlsx = path.join(root, 'docs', '_audit_zdc_ukazka_session.xlsx');
const demoFull = path.join(root, 'docs', '_audit_zdc_ukazka_full.xlsx');
fs.writeFileSync(demoXlsx, Buffer.from(xlsxApi.workbookToArrayBuffer(wbSession)));
fs.writeFileSync(demoFull, Buffer.from(xlsxApi.workbookToArrayBuffer(wbFull)));

w('### Export jednej session (132 spinov)');
w('- Listy: `' + wbSession.SheetNames.join('`, `') + '`');
w('- Súbor: `docs/_audit_zdc_ukazka_session.xlsx`');
w('');
w('**SESSION_01 — úryvok (METADATA + NÁVRATY):**');
w('```');
const s1csv = XLSX.utils.sheet_to_csv(wbSession.Sheets['SESSION_01']).split('\n').slice(0, 35).join('\n');
w(s1csv);
w('…');
w('```');

w('');
w('### Full export (12 session + MASTER)');
w('- Listy: `' + wbFull.SheetNames.join('`, `') + '`');
w('- Súbor: `docs/_audit_zdc_ukazka_full.xlsx`');
w('');
w('**MASTER — hlavička:**');
w('```');
const mcsv = XLSX.utils.sheet_to_csv(wbFull.Sheets['MASTER']).split('\n').slice(0, 25).join('\n');
w(mcsv);
w('…');
w('```');

hr();
w('## Hodnotenie čitateľnosti (automatický súhrn)');
w('');
w('| Sekcia | Počet položiek | Poznámka |');
w('|--------|----------------|----------|');
w(`| Raw spiny | ${rep.summary.spinCount} | Kompletný reťazec, kopírovateľný |`);
w(`| Trigger riadky s dátami | ${rep.triggerTable.filter(r => r.hitCount > 0).length}/37 | Prehľad stačí na TOP čísla |`);
w(`| Patterny | ${(rep.patterns || []).length} | Ľudské vety, nie kódy |`);
w(`| Return TOP | ${(rep.returnHighlights.topFastestReturns || []).length} / ${(rep.returnHighlights.topLongestAbsences || []).length} | Rýchle vs. dlho chýbajúce |`);
w(`| Master highlights | ${(m.top10Highlights || []).filter(t => t && t !== '—').length} | Naprieč 1440 spinmi |`);

fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('OK: ' + outPath);
console.log('OK: ' + demoXlsx);
console.log('OK: ' + demoFull);
