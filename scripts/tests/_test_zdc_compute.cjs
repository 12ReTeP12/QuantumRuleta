/**
 * Unit testy ZBER DÁT ČÍSEL 0–36 — kroky 1–3 (dátový model, pamäť, trigger)
 * Spustenie: node scripts/tests/_test_zdc_compute.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

function loadZdc(storage) {
  const ctx = {
    console,
    localStorage: storage || mockStorage(),
    spins: [],
    chaosState: null
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/core/constants.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/core/helpers.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/analytics/zber-dat-0-36.js'), 'utf8'), ctx);
  return ctx;
}

function fillSpins(ctx, count, fn) {
  const store = ctx.zdcNewStore();
  for (let i = 0; i < count; i++) {
    const n = typeof fn === 'function' ? fn(i) : (i % 37);
    ctx.zdcOnSpin(store, n);
  }
  return store;
}

console.log('\n=== ZDC — KROK 1–3 (model, pamäť, číslo→číslo) ===\n');

/* Izolácia */
const spo = fs.readFileSync(path.join(root, 'scripts/pattern/spin-pattern-observer.js'), 'utf8');
const sbpo = fs.readFileSync(path.join(root, 'scripts/pattern/spin-binary-pattern-observer.js'), 'utf8');
if (/zdc|zber-dat-0-36/.test(spo)) fail('SPO obsahuje zdc referencie');
else ok('SPO bez zdc referencií');
if (/zdc|ZdcStore/.test(sbpo)) fail('SBPO obsahuje zdc referencie');
else ok('SBPO bez zdc referencií');

let ctx = loadZdc();

/* Krok 1 — model */
const store = ctx.zdcNewStore();
if (store.version === 1 && store.active && store.active.spins.length === 0) ok('K1: zdcNewStore');
else fail('K1: newStore');

if (ctx.zdcSampleQualityLabel(120) === 'dobrá vzorka') ok('K1: kvalita 120 = dobrá vzorka');
else fail('K1: kvalita 120');

if (ctx.zdcSampleQualityLabel(250) === 'veľmi dobrá vzorka') ok('K1: kvalita 250');
else fail('K1: kvalita 250');

if (ctx.zdcSampleQualityLabel(400) === 'vysoká kvalita dát') ok('K1: kvalita 400');
else fail('K1: kvalita 400');

if (ctx.zdcSampleConfidence(5) === 'nízka' && ctx.zdcSampleConfidence(42) === 'vysoká') ok('K1: spoľahlivosť 5=nízka, 42=vysoká');
else fail('K1: spoľahlivosť');

if (store.active.id && store.active.createdAt) ok('K1: Session ID + createdAt');
else fail('K1: metadata session');

/* Krok 2 — pamäť */
const st = mockStorage();
ctx = loadZdc(st);
let s = ctx.zdcNewStore();
ctx.zdcOnSpin(s, 17);
ctx.zdcOnSpin(s, 8);
if (s.active.spins.join(',') === '17,8') ok('K2: raw spiny v active.spins[]');
else fail('K2: raw spiny');

ctx.zdcSaveStore(s, st);
const loaded = ctx.zdcLoadStore(st);
if (loaded.active.spins.length === 2) ok('K2: localStorage persist');
else fail('K2: persist');

const closeEarly = ctx.zdcCloseSession(s);
if (!closeEarly.ok && closeEarly.reason === 'min_spins') ok('K2: uzavretie blocked <120');
else fail('K2: min 120');

s = fillSpins(ctx, 120, (i) => (i % 3 === 0 ? 8 : (i % 5) + 1));
const closed = ctx.zdcCloseSession(s);
if (closed.ok && s.closed.length === 1 && s.closed[0].tier === 'standard') ok('K2: uzavretie 120 = standard');
else fail('K2: close 120');

for (let c = 0; c < 11; c++) {
  for (let i = 0; i < 120; i++) ctx.zdcOnSpin(s, 1);
  ctx.zdcCloseSession(s);
}
if (s.closed.length === 12) ok('K2: max 12 closed v pamäti');
else fail('K2: 12 closed=' + s.closed.length);

for (let i = 0; i < 120; i++) ctx.zdcOnSpin(s, 2);
const r13 = ctx.zdcCloseSession(s);
if (r13.ok && r13.dropped && s.closed.length === 12) ok('K2: FIFO drop pri 13. archive');
else fail('K2: FIFO');

const rawRows = ctx.zdcRawRowsFromSessions(s.closed, s.active);
if (rawRows.length > 0 && rawRows[0].sessionId && rawRows[0].order === 1) ok('K2: raw export rows');
else fail('K2: raw rows');

/* Krok 3 — trigger číslo→číslo */
ctx = loadZdc();
const spins = [8, 17, 8, 0, 32, 8, 17];
const table = ctx.zdcBuildTriggerTable(spins);
const row8 = table[8];
if (row8.hitCount === 3 && row8.followCount === 3) ok('K3: po 8 → hit 3, follow 3');
else fail('K3: hit/follow 8: hit=' + row8.hitCount + ' follow=' + row8.followCount);

if (row8.nextNumbers[17] === 2 && row8.nextNumbers[0] === 1) ok('K3: následníci 17×2 a 0×1 (nula sa nepreskakuje)');
else fail('K3: next map');

if (row8.zeroPct > 0) ok('K3: zeroPct po 8');
else fail('K3: zeroPct');

if (row8.humanComment && !/followCount|trigger|idx/.test(row8.humanComment)) ok('K3: ľudský komentár bez debug');
else fail('K3: humanComment');

const row17 = table[17];
if (ctx.zdcSampleConfidence(42) === 'vysoká') ok('K3: confidence prahy');
if (row17.followCount === 1 && row17.sampleConfidence === 'nízka') ok('K3: 1 pozorovanie = nízka spoľahlivosť');

const rep = ctx.zdcBuildSessionReport({ id: 't', number: 1, spinCount: spins.length, spins: spins, tier: 'standard', sampleQuality: 'dobrá vzorka' });
if (rep.triggerTable.length === 37 && rep.returnTable.length === 37 && rep.summary.spinListText) ok('K3: session report + trigger + return');
else fail('K3: session report');

if (rep.humanSummary && !/followCount|trigger|idx/.test(rep.humanSummary)) ok('K4: ľudský záver session');
else fail('K4: humanSummary');

if (rep.sessionCharacter && rep.top5Anomalies) ok('K4: charakter + top5 anomálie');
else fail('K4: sessionCharacter/top5');

/* Krok 6 — master report */
let sMaster = ctx.zdcNewStore();
for (let c = 0; c < 12; c++) {
  for (let i = 0; i < 120; i++) ctx.zdcOnSpin(sMaster, (i + c) % 37);
  const cr = ctx.zdcCloseSession(sMaster);
  if (!cr.ok) fail('K6: close session ' + c);
}
if (sMaster.master && sMaster.master.sessionCount === 12 && sMaster.master.masterTriggerTable.length === 37) ok('K6: master report po 12 session');
else fail('K6: master report');

if (sMaster.master.cycleId === 1 && sMaster.master.sourceSessionIds && sMaster.master.sourceSessionIds.length === 12) ok('K8: master cycleId + sourceSessionIds');
else fail('K8: master cycle metadata');

if (sMaster.master.title && /cyklus #1/i.test(sMaster.master.title)) ok('K8: master title cyklus');
else fail('K8: master title');

if (sMaster.cycleId === 2) ok('K8: store cycleId po master = 2');
else fail('K8: store cycleId=' + sMaster.cycleId);

if (sMaster.master.generatedAt) ok('K8: master generatedAt');
else fail('K8: generatedAt');

if (sMaster.master.humanSummary && sMaster.master.top10Highlights.length >= 1) ok('K6: master humanSummary + TOP10');
else fail('K6: master highlights');

if (!sMaster.master.top10Highlights.includes('—')) ok('K6: TOP10 bez placeholderov');
else fail('K6: TOP10 placeholders');

if (sMaster.master.sessionComparison && sMaster.master.sessionComparison.length === 12) ok('K6: sessionComparison 12 riadkov');
else fail('K6: sessionComparison');

if (sMaster.master.stabilityRanking && sMaster.master.stabilityRanking.length >= 1) ok('K6: stabilityRanking');
else fail('K6: stabilityRanking');

if (Array.isArray(sMaster.master.crossSessionStrong) && Array.isArray(sMaster.master.crossSessionWeak)) ok('K6: crossSession bonds');
else fail('K6: crossSession bonds');

if (/session/.test(sMaster.master.humanSummary) && /predikcia/.test(sMaster.master.humanSummary)) ok('K6: humanSummary rozšírený');
else fail('K6: humanSummary extended');

/* Krok 7 — FIFO helpery */
console.log('\n--- Krok 7: FIFO ochrana ---\n');

let sFifo = ctx.zdcNewStore();
for (let c = 0; c < 11; c++) {
  for (let i = 0; i < 120; i++) ctx.zdcOnSpin(sFifo, 1);
  ctx.zdcCloseSession(sFifo);
}
if (!ctx.zdcGetFifoDropCandidate(sFifo)) ok('K7: bez kandidáta pri 11 closed');
else fail('K7: predčasný fifo kandidát');

for (let i = 0; i < 120; i++) ctx.zdcOnSpin(sFifo, 1);
ctx.zdcCloseSession(sFifo);
if (sFifo.closed.length === 12 && ctx.zdcGetFifoDropCandidate(sFifo)) ok('K7: fifo kandidát pri 12 closed');
else fail('K7: fifo candidate at 12');

if (ctx.zdcWillFifoDropOnClose(sFifo)) ok('K7: willFifoDrop pri plnom archíve');
else fail('K7: willFifoDrop');

var cand = ctx.zdcGetFifoDropCandidate(sFifo);
if (cand && cand.number === 1) ok('K7: fifo kandidát = najstaršia session (č. 1)');
else fail('K7: fifo candidate number=' + (cand && cand.number));

for (let i = 0; i < 120; i++) ctx.zdcOnSpin(sFifo, 2);
var closeFifo = ctx.zdcCloseSession(sFifo);
if (closeFifo.ok && closeFifo.dropped && closeFifo.dropped.number === 1 && sFifo.closed.length === 12) ok('K7: close vracia dropped session');
else fail('K7: dropped on close');

if (closeFifo.fifoCandidate && closeFifo.fifoCandidate.number === 1) ok('K7: fifoCandidate pred drop');
else fail('K7: fifoCandidate field');

var integ = ctx.zdcMasterArchiveIntegrity(sFifo, sFifo.master);
if (sFifo.master && integ.missingCount >= 1 && !integ.complete) ok('K8: master integrity po FIFO — chýbajúce session');
else fail('K8: integrity missing=' + (integ && integ.missingCount));

/* K9 — undo posledného spinu */
console.log('\n--- K9: undo spin ---\n');

let sUndo = ctx.zdcNewStore();
ctx.zdcOnSpin(sUndo, 8);
ctx.zdcOnSpin(sUndo, 17);
var u1 = ctx.zdcUndoLastSpin(sUndo);
if (u1.ok && u1.removed === 17 && sUndo.active.spins.join(',') === '8') ok('K9: undo odstráni posledný spin');
else fail('K9: undo spins=' + sUndo.active.spins.join(','));

var uEmpty = ctx.zdcUndoLastSpin(sUndo);
if (uEmpty.ok && sUndo.active.spins.length === 0) ok('K9: undo druhý raz → prázdne');
else fail('K9: undo empty');

var uFail = ctx.zdcUndoLastSpin(sUndo);
if (!uFail.ok && uFail.reason === 'empty') ok('K9: undo na prázdnom blocked');
else fail('K9: undo fail empty');

if (/cyklus #1/i.test(sMaster.master.humanSummary)) ok('K8: humanSummary obsahuje cyklus');
else fail('K8: humanSummary cycle');

const repMeta = ctx.zdcBuildSessionReport({
  id: 'meta-t', number: 3, spinCount: 120, spins: spins,
  tier: 'standard', sampleQuality: 'dobrá vzorka',
  createdAt: '2026-01-01T10:00:00.000Z', closedAt: '2026-01-01T12:00:00.000Z',
  reportGeneratedAt: '2026-01-01T12:00:01.000Z'
});
if (repMeta.metadata && repMeta.metadata.sessionId === 'meta-t' && repMeta.metadata.spinCount === 7) ok('K4: metadata session reprodukovateľnosť');
else fail('K4: metadata');

const rowBond = repMeta.triggerTable[8];
if (rowBond.strongBonds !== undefined && rowBond.weakBonds !== undefined && rowBond.rareAfter !== undefined) ok('K4: silné/slabé/takmer nikdy väzby');
else fail('K4: bonds');

const ret23 = rep.returnTable[23];
if (ret23.hitCount === 0 && ret23.longestAbsence === spins.length) ok('K3: návraty — nepadlé číslo');
else fail('K3: return 23');

/* Krok 5 — patterny a opakované následnosti */
console.log('\n--- Krok 5: patterny ---\n');

const patSpins = [8, 17, 8, 17, 8, 32, 1, 2, 3, 1, 2, 3, 5, 1, 2, 5];
const rf8 = ctx.zdcRepeatedFollowsForTrigger(patSpins, 8);
if (rf8.includes('číslo 17 (2×)')) ok('K5: repeatedFollows po 8 → 17 (2×)');
else fail('K5: repeatedFollows 8=' + JSON.stringify(rf8));

const row8pat = ctx.zdcBuildTriggerTable(patSpins)[8];
if (row8pat.repeatedFollows && row8pat.repeatedFollows.includes('číslo 17 (2×)')) ok('K5: trigger row repeatedFollows');
else fail('K5: trigger row repeatedFollows');

const pairs = ctx.zdcDetectRepeatedPairs(patSpins);
if (pairs.some(function (t) { return /Dvojica 8 → 17/.test(t) && /2×/.test(t); })) ok('K5: opakovaná dvojica 8→17');
else fail('K5: pairs=' + JSON.stringify(pairs));

if (pairs.some(function (t) { return /Dvojica 1 → 2/.test(t); })) ok('K5: opakovaná dvojica 1→2');
else fail('K5: pair 1→2');

const triples = ctx.zdcDetectRepeatedTriples(patSpins);
if (triples.some(function (t) { return /Trojica 1 → 2 → 3/.test(t) && /2×/.test(t); })) ok('K5: opakovaná trojica 1→2→3');
else fail('K5: triples=' + JSON.stringify(triples));

const shortR = ctx.zdcDetectShortReturns(patSpins);
if (shortR.some(function (t) { return /Číslo 5/.test(t) && /krátkom intervale/.test(t); })) ok('K5: návrat čísla 5 po krátkom intervale');
else fail('K5: shortReturns=' + JSON.stringify(shortR));

const repPat = ctx.zdcBuildSessionReport({
  id: 'pat', number: 1, spinCount: patSpins.length, spins: patSpins,
  tier: 'standard', sampleQuality: 'neúplná vzorka'
});
if (repPat.patterns && repPat.patterns.length >= 3) ok('K5: session report patterns.length >= 3');
else fail('K5: patterns=' + JSON.stringify(repPat.patterns));

if (repPat.repeatedPairs && repPat.repeatedTriples && repPat.shortReturns) ok('K5: report repeatedPairs/triples/shortReturns');
else fail('K5: report pattern fields');

if (repPat.repeatedFollowNotes && repPat.repeatedFollowNotes.some(function (t) { return /Po čísle 8/.test(t); })) ok('K5: repeatedFollowNotes v reporte');
else fail('K5: repeatedFollowNotes');

if (row8pat.humanComment && /Opakované následnosti/.test(row8pat.humanComment)) ok('K5: humanComment obsahuje opakované následnosti');
else fail('K5: humanComment pattern');

/* K10 — return highlights */
console.log('\n--- K10: return table ---\n');

if (repPat.returnHighlights && repPat.returnTable && repPat.returnTable.length === 37) ok('K10: report returnTable + highlights');
else fail('K10: report return fields');

const retSpins = [1, 5, 2, 5, 3, 5, 10, 20];
const retHl = ctx.zdcBuildReturnHighlights(ctx.zdcBuildReturnTable(retSpins));
if (retHl.topFastestReturns.some(function (r) { return r.number === 5; })) ok('K10: TOP fastest — číslo 5');
else fail('K10: fastest=' + JSON.stringify(retHl.topFastestReturns));

if (retHl.topLongestAbsences.length >= 1) ok('K10: TOP longest absences');
else fail('K10: longest');

console.log(failed ? '\nZDC TEST: FAIL\n' : '\nZDC TEST: OK\n');
process.exit(failed ? 1 : 0);
