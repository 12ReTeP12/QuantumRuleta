'use strict';
/**
 * Testovacia fáza — pattern observer (50/100/200/500 spinov).
 * node scripts/pattern/test-spin-pattern-observer.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const helpers = fs.readFileSync(path.join(root, 'scripts', 'core', 'helpers.js'), 'utf8');
const observer = fs.readFileSync(
  path.join(root, 'scripts', 'pattern', 'spin-pattern-observer.js'),
  'utf8'
);

const reds = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];
let spins = [];
const chaosState = { chaosLevel: 0 };

function loadCtx() {
  const ctx = { spins, reds, chaosState, console };
  vm.createContext(ctx);
  vm.runInContext(helpers + '\n' + observer, ctx);
  return ctx;
}

function randSpin() {
  const r = Math.random();
  if (r < 0.03) return 0;
  return 1 + Math.floor(Math.random() * 36);
}

function buildSpins(n, seed) {
  let s = seed;
  const out = [];
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    if ((s % 100) < 3) out.push(0);
    else out.push(1 + (s % 36));
  }
  return out;
}

const issues = [];

function fail(msg, meta) {
  issues.push({ msg, ...meta });
}

function assertInvariants(R, n, seed, label) {
  const ctx = { n, seed, label };

  if (!R.dozSeq.every((x) => /^[123]$/.test(x))) {
    fail('dozSeq obsahuje neplatné hodnoty', ctx);
  }
  if (!R.colSeq.every((x) => /^[123]$/.test(x))) {
    fail('colSeq obsahuje neplatné hodnoty', ctx);
  }
  if (R.dozSeq.length !== R.colSeq.length) {
    fail('dozSeq a colSeq rôzna dĺžka', ctx);
  }
  const nonZero = spins.filter((x) => x > 0).length;
  if (n >= 20 && R.dozSeq.length < Math.min(n, nonZero) * 0.85) {
    fail('dozSeq príliš krátka oproti spinom (>0)', { ...ctx, seqLen: R.dozSeq.length, nonZero });
  }

  for (const field of ['doz', 'col']) {
    const seq = field === 'doz' ? R.dozSeq : R.colSeq;
    const counts = field === 'doz' ? R.dozCounts : R.colCounts;
    const dom = field === 'doz' ? R.dozDom : R.colDom;
    const stab = field === 'doz' ? R.dozStab : R.colStab;
    const risk = field === 'doz' ? R.dozBreakRisk : R.colBreakRisk;

    const sum = counts[0] + counts[1] + counts[2];
    if (sum !== seq.length) {
      fail(field + ': súčet countov ≠ dĺžka sekvencie', ctx);
    }

    if (dom.count !== counts[dom.idx]) {
      fail(
        field + ': dom.count (' + dom.count + ') ≠ counts[dom.idx] (' + counts[dom.idx] + ')',
        ctx
      );
    }

    const ratio = seq.length ? counts[dom.idx] / seq.length : 0;
    const expectedRisk = (function () {
      if (dom.age >= 14 && ratio >= 0.42) return 'VYSOKÉ';
      if (dom.age >= 15 && stab < 55) return 'VYSOKÉ';
      if (dom.age >= 15) return 'STREDNÉ';
      if (dom.age >= 8 && stab >= 55) return 'STREDNÉ';
      return 'NÍZKE';
    })();
    if (risk !== expectedRisk) {
      fail(field + ': break risk ' + risk + ' ≠ očakávané ' + expectedRisk + ' (age=' + dom.age + ')', ctx);
    }

    if (dom.age >= 15 && risk === 'NÍZKE') {
      fail(field + ': age≥15 ale riziko NÍZKE', ctx);
    }

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
      sila: '',
      fs: {},
      risk,
    };
    let sila =
      fv.strengthLabel === 'Silná'
        ? 'Vysoká'
        : fv.strengthLabel === 'Stredná'
          ? 'Stredná'
          : 'Nízka';
    if (risk === 'VYSOKÉ') sila = 'Nízka';
    else if (risk === 'STREDNÉ' && sila === 'Vysoká') sila = 'Stredná';
    fv.sila = sila;

    if (risk === 'VYSOKÉ' && sila === 'Vysoká') {
      fail(field + ': VYSOKÉ riziko + sila Vysoká', ctx);
    }

    const slice10 = seq.slice(-10);
    const repDom = slice10.filter((s) => +s - 1 === dom.idx).length;
    const rep10 = field === 'doz' ? R.dozRepeat10 : R.colRepeat10;
    if (rep10.domIdx !== dom.idx) {
      fail(
        field + ': repeat10.domIdx (' + rep10.domIdx + ') ≠ rolling dom.idx (' + dom.idx + ')',
        ctx
      );
    }
    if (rep10.count !== repDom) {
      fail(field + ': repeat10.count ≠ výskyty rolling dom v okne 10', ctx);
    }
  }

  const domView = (function pick(d) {
    const field = d.domField;
    const dom = field === 'doz' ? d.dozDom : d.colDom;
    const stab = field === 'doz' ? d.dozStab : d.colStab;
    const risk = field === 'doz' ? d.dozBreakRisk : d.colBreakRisk;
    const seqLen = field === 'doz' ? d.dozSeq.length : d.colSeq.length;
    const counts = field === 'doz' ? d.dozCounts : d.colCounts;
    const ratio = seqLen ? counts[dom.idx] / seqLen : 0;
    const str =
      stab >= 68 && dom.age >= 4 && ratio >= 0.38
        ? 'Silná'
        : stab >= 42 || dom.age >= 2
          ? 'Stredná'
          : 'Slabá';
    let sila = str === 'Silná' ? 'Vysoká' : str === 'Stredná' ? 'Stredná' : 'Nízka';
    if (risk === 'VYSOKÉ') sila = 'Nízka';
    else if (risk === 'STREDNÉ' && sila === 'Vysoká') sila = 'Stredná';
    return { field, dom, stab, sila, strengthLabel: str, risk };
  })(R);

  if (domView.stab !== (R.domField === 'doz' ? R.dozStab : R.colStab)) {
    fail('hero stabilita ≠ dominantné pole', ctx);
  }

  if (n >= 10 && (!R.notice || R.notice.length < 8)) {
    fail('observer notice príliš krátky pri n≥10', ctx);
  }
  if (n >= 3 && (!R.radar || R.radar.length < 10)) {
    fail('radar prázdny pri n≥3', ctx);
  }

  if (R.behaviorChange) {
    const bc = R.behaviorChange;
    if (bc.age > 6) fail('behaviorChange age > 6', ctx);
    const dom = bc.field === 'doz' ? R.dozDom : R.colDom;
    if (dom.idx !== bc.next) fail('behaviorChange.next ≠ aktuálny dom.idx', ctx);
  }
}

const MILESTONES = [50, 100, 200, 500];
const SEEDS = [42, 123, 999, 2024, 7777];

// B1: 2× nula nesmie byť ready
spins.length = 0;
spins.push(0, 0);
const ctx0 = loadCtx();
const r00 = ctx0.computeSpinPatternObserver();
if (r00.ready || r00.dozSeq.length > 0) {
  fail('2× nula: ready alebo sekvencia', { label: 'B1', n: 2 });
}

console.log('=== Pattern observer — testovacia fáza ===\n');

for (const seed of SEEDS) {
  const all = buildSpins(500, seed);
  const ctx = loadCtx();
  for (const n of MILESTONES) {
    spins.length = 0;
    spins.push(...all.slice(0, n));
    const R = ctx.computeSpinPatternObserver();
    assertInvariants(R, n, seed, 'seed' + seed + '@' + n);
  }
}

// náhodné sekvencie
for (let t = 0; t < 20; t++) {
  spins.length = 0;
  const ctx = loadCtx();
  for (let i = 0; i < 500; i++) {
    spins.push(randSpin());
    if (MILESTONES.includes(spins.filter((x) => x > 0).length)) {
      const n = spins.filter((x) => x > 0).length;
      if ([50, 100, 200, 500].includes(n)) {
        const R = ctx.computeSpinPatternObserver();
        assertInvariants(R, n, 'rand' + t, 'rand@' + n);
      }
    }
  }
}

if (issues.length) {
  console.log('ZLYHANIA:', issues.length);
  const uniq = new Map();
  issues.forEach((i) => {
    const k = i.msg;
    if (!uniq.has(k)) uniq.set(k, []);
    uniq.get(k).push(i);
  });
  for (const [msg, arr] of uniq) {
    console.log('\n•', msg);
    console.log('  príklady:', arr.slice(0, 3).map((x) => x.label + ' n=' + x.n).join(', '));
  }
  process.exit(1);
}

console.log('OK — všetky invarianty pre 50/100/200/500 spinov (' + SEEDS.length + ' seedov + náhodné).');
console.log('Sekcia pripravená na manuálne overenie v prehliadači (Ctrl+Shift+R).');
process.exit(0);
