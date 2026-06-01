'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..', '..');
const v2 = fs.readFileSync(path.join(root, 'index-NOVY-V2.html'), 'utf8');
const m = v2.match(/<script>\/\* Patterny a opakovateľnosť[\s\S]*?<\/script>/);
const observer = m[0].replace(/^<script>/, '').replace(/<\/script>$/, '');
const helpers = fs.readFileSync(path.join(root, 'scripts', 'core', 'helpers.js'), 'utf8');
const spins = [];
const chaosState = { chaosLevel: 0 };
const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const ctx = { spins, reds, chaosState, console };
vm.createContext(ctx);
vm.runInContext(helpers + '\n' + observer, ctx);

function set(a) {
  spins.length = 0;
  spins.push(...a);
}
function R() {
  return ctx.computeSpinPatternObserver();
}
function colNums(c) {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((n) => (n - 1) % 3 === c);
}
function onlyDozen(d, n) {
  const p = [[1, 4, 7], [13, 16, 19], [25, 28, 31]][d];
  return Array.from({ length: n }, (_, i) => p[i % p.length]);
}
function onlyCol(c, n) {
  const p = colNums(c);
  return Array.from({ length: n }, (_, i) => p[i % p.length]);
}

const issues = [];
function check(name, fn) {
  try {
    fn();
  } catch (e) {
    issues.push({ name, msg: e.message });
  }
}

const scenarios = [
  ['0', () => set([])],
  ['1', () => set([5])],
  ['2', () => set([5, 8])],
  ['10', () => set(onlyDozen(0, 10))],
  ['20', () => set(onlyDozen(1, 20))],
  ['50', () => set(onlyDozen(2, 50))],
  ['100', () => set(onlyCol(0, 100))],
  ['d1', () => set(onlyDozen(0, 30))],
  ['d2', () => set(onlyDozen(1, 30))],
  ['d3', () => set(onlyDozen(2, 30))],
  ['c1', () => set(onlyCol(0, 30))],
  ['c2', () => set(onlyCol(1, 30))],
  ['c3', () => set(onlyCol(2, 30))],
  ['tie', () => set([...onlyDozen(0, 5), ...onlyDozen(1, 5)])],
  ['chaos', () => {
    chaosState.chaosLevel = 70;
    set(Array.from({ length: 25 }, (_, i) => 1 + ((i * 7) % 36)));
  }],
  ['breaks', () => {
    const s = [];
    for (let i = 0; i < 40; i++) s.push(onlyDozen(i % 3, 1)[0]);
    set(s);
  }],
  ['long', () => set(onlyDozen(0, 60))],
  ['reset', () => {
    set(onlyDozen(0, 10));
    set([]);
  }],
];

for (const [name, fn] of scenarios) {
  check(name, () => {
    fn();
    const r = R();
    if (name === '0' || name === '1') {
      if (r.ready) issues.push({ name, msg: 'ready should be false' });
      return;
    }
    if (name === 'reset') {
      if (R().ready) issues.push({ name, msg: 'after reset ready' });
      chaosState.chaosLevel = 0;
      return;
    }
    if (!r.ready && name !== '2') issues.push({ name, msg: 'expected ready' });
    const html = ctx.spoRenderFieldColumn(r, 'doz');
    if (r.ready && html.includes('undefined')) issues.push({ name, msg: 'undefined in html' });
    if (r.ready && html.includes('NaN')) issues.push({ name, msg: 'NaN in html' });
    chaosState.chaosLevel = 0;
  });
}

console.log('Scenáre:', scenarios.length, '| Problémy:', issues.length);
issues.forEach((i) => console.log(' -', i.name, i.msg));
process.exit(issues.length ? 1 : 0);
