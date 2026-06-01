'use strict';
/**
 * Hĺbkový audit — pattern observer z index-NOVY-V2.html
 * node scripts/pattern/audit-v2-pattern.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const v2 = fs.readFileSync(path.join(root, 'index-NOVY-V2.html'), 'utf8');
const m = v2.match(/<script>\/\* Patterny a opakovateľnosť[\s\S]*?<\/script>/);
if (!m) {
  console.error('Nepodarilo sa extrahovať inline pattern skript z V2');
  process.exit(1);
}
let observer = m[0].replace(/^<script>/, '').replace(/<\/script>$/, '');
const helpers = fs.readFileSync(path.join(root, 'scripts', 'core', 'helpers.js'), 'utf8');

const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const spins = [];
const chaosState = { chaosLevel: 0 };
const ctx = { spins, reds, chaosState, console, document: { getElementById: () => null } };
vm.createContext(ctx);
vm.runInContext(helpers + '\n' + observer, ctx);

const bugs = [];
const potential = [];
const illogical = [];
const ux = [];

function bug(id, where, why, effect, fix) {
  bugs.push({ id, where, why, effect, fix });
}
function pot(id, where, why) {
  potential.push({ id, where, why });
}
function ill(id, where, why) {
  illogical.push({ id, where, why });
}

function setSpins(arr) {
  spins.length = 0;
  spins.push(...arr);
}

function R() {
  return ctx.computeSpinPatternObserver();
}

function dozenNums(d) {
  if (d === 0) return [1, 4, 7, 10];
  if (d === 1) return [13, 16, 19, 22];
  return [25, 28, 31, 34];
}
function colNums(c) {
  const base = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return base.filter((n) => (n - 1) % 3 === c);
}

function onlyDozen(d, n) {
  const pool = dozenNums(d);
  return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
}
function onlyCol(c, n) {
  const pool = colNums(c);
  return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
}

function assert(cond, msg, meta) {
  if (!cond) bugs.push({ id: 'ASSERT', where: meta || '', why: msg, effect: '', fix: '' });
}

// --- invariant battery ---
function invariants(label) {
  const data = R();
  for (const field of ['doz', 'col']) {
    const seq = field === 'doz' ? data.dozSeq : data.colSeq;
    const counts = field === 'doz' ? data.dozCounts : data.colCounts;
    const dom = field === 'doz' ? data.dozDom : data.colDom;
    const stab = field === 'doz' ? data.dozStab : data.colStab;
    const risk = field === 'doz' ? data.dozBreakRisk : data.colBreakRisk;
    const rep10 = field === 'doz' ? data.dozRepeat10 : data.colRepeat10;

    assert(counts[0] + counts[1] + counts[2] === seq.length, field + ' counts sum', label);
    assert(dom.count === counts[dom.idx], field + ' dom.count', label);
    assert(rep10.domIdx === dom.idx, field + ' repeat10.domIdx', label);
    const slice10 = seq.slice(-10);
    const hits = slice10.filter((s) => +s - 1 === dom.idx).length;
    assert(rep10.count === hits, field + ' repeat10.count', label);

    const ratio = seq.length ? counts[dom.idx] / seq.length : 0;
    let expRisk = 'NÍZKE';
    if (dom.age >= 14 && ratio >= 0.42) expRisk = 'VYSOKÉ';
    else if (dom.age >= 15 && stab < 55) expRisk = 'VYSOKÉ';
    else if (dom.age >= 15) expRisk = 'STREDNÉ';
    else if (dom.age >= 8 && stab >= 55) expRisk = 'STREDNÉ';
    assert(risk === expRisk, field + ' risk ' + risk + ' vs ' + expRisk, label);

    const fv = {
      field,
      dom,
      stab,
      age: dom.age,
      strengthLabel:
        stab >= 68 && dom.age >= 4 && ratio >= 0.38
          ? 'Silná'
          : stab >= 42 || dom.age >= 2
            ? 'Stredná'
            : 'Slabá',
    };
    const pat = ctx.spoPatternState(data, fv);
    const riskHero = ctx.spoDomBreakRisk(data, field);
    const glanceRisk = ctx.spoRiskHuman(riskHero).short;
    assert(
      ctx.spoRiskHuman(risk).short === glanceRisk,
      field + ' risk text match',
      label
    );
    if (data.ready) {
      const domView = ctx.spoPickDominantView(data);
      if (data.domField === field) {
        assert(
          domView.dom.idx === dom.idx,
          'global domView matches field dom',
          label
        );
      }
    }
  }
  return data;
}

const counts = [0, 1, 2, 5, 10, 20, 50, 100];
for (const n of counts) {
  setSpins(onlyDozen(0, n));
  invariants('onlyD1 n=' + n);
  setSpins(onlyCol(2, n));
  invariants('onlyC3 n=' + n);
}

// extremes
setSpins([]);
assert(!R().ready, '0 spins not ready', 'reset');
setSpins([0]);
assert(!R().ready, '1 spin not ready', '1');
setSpins([0, 0]);
const r00 = R();
if (r00.ready && r00.dozSeq.length === 0) {
  bug(
    'B1',
    'computeSpinPatternObserver ready',
    'ready=true pri 2× nula, prázdna sekvencia',
    'Zobrazí sa dominancia tuctov/stĺpcov bez dát',
    'ready: spoNumsOnly(spins).length>=2'
  );
} else if (!r00.ready) {
  /* B1 fixed */
}

setSpins([1, 2]);
invariants('2 mixed');

// chaos
chaosState.chaosLevel = 70;
setSpins(onlyDozen(1, 30));
const rCh = R();
assert(rCh.radar.includes('striedajú'), 'chaos radar', 'chaos');
chaosState.chaosLevel = 0;

// behavior change alternating
setSpins([1, 13, 1, 13, 1, 13, 1, 13, 1, 13].map((x, i) => (i % 2 ? 13 : 1)));
const rAlt = R();
if (!rAlt.behaviorChange) {
  pot('P1', 'behaviorChange', 'pri rýchlych zmenách nemusí vždy zachytiť (age<=6)');
}

// long dominance
setSpins(onlyDozen(2, 40));
const rLong = R();
if (rLong.dozDom.age < 10) {
  pot('P2', 'spoDominanceRun', 'dlhá homogénna séria — vek môže byť nižší ako intuícia (okno 15)');
}

// reset
setSpins(onlyDozen(0, 20));
setSpins([]);
assert(!R().ready, 'after reset', 'reset');

// text vs data: repeat sentence
setSpins(onlyDozen(1, 15));
const d15 = R();
const sent = ctx.spoRepeatSentence('doz', d15.dozDom.idx, d15.dozRepeat10);
assert(
  sent.includes(String(d15.dozRepeat10.count)),
  'repeat sentence contains count',
  'text'
);

console.log('Automatické assert chyby:', bugs.filter((b) => b.id === 'ASSERT').length);
console.log('Špecifické bugy:', bugs.filter((b) => b.id !== 'ASSERT').length);
bugs.forEach((b) => console.log(' ', b.id, b.where, '-', b.why));

if (!bugs.some((b) => b.id === 'B1')) {
  console.log('B1: už opravené alebo nenastalo');
}

process.exit(bugs.some((b) => b.id === 'ASSERT' || b.id === 'B1') ? 1 : 0);
