'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const v2 = fs.readFileSync(path.join(root, 'index-NOVY-V2.html'), 'utf8').split(/\r?\n/);

const INLINE_START = v2.findIndex((l) => l.includes('/* QRP7-V2 · ANALYZÉR TOKU')) + 1;
const INLINE_END = v2.findIndex((l, i) => i > INLINE_START && l.trim() === '</script>');
const inline = v2.slice(INLINE_START, INLINE_END);
const inlineText = inline.join('\n');

const TARGETS = [
  'computeWheelSectorIntel',
  'qwResolveHudCopy',
  'qwColorState',
  'qwEdgeHeroStatus',
  'ensureQuantumWheelDashboardDOM',
  'qwComputePlayerIntel',
  'qwBuildIntelChips',
  'qwAtmosphereUiClass',
];

const modules = {
  'wheel-hud.js': fs.readFileSync(path.join(root, 'scripts/wheel/wheel-hud.js'), 'utf8'),
  'wheel-brain.js': fs.readFileSync(path.join(root, 'scripts/wheel/wheel-brain.js'), 'utf8'),
  'wheel-canvas.js': fs.readFileSync(path.join(root, 'scripts/wheel/wheel-canvas.js'), 'utf8'),
};

function fnSpans(lines) {
  const names = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^function\s+(\w+)/);
    if (m) names.push({ name: m[1], line: i + 1 });
  }
  names.push({ name: 'END', line: lines.length + 1 });
  const spans = [];
  for (let i = 0; i < names.length - 1; i++) {
    spans.push({ name: names[i].name, start: names[i].line, lines: names[i + 1].line - names[i].line });
  }
  return spans;
}

const spans = fnSpans(inline);
const qwFns = spans.filter((s) => s.name.startsWith('qw') || s.name === 'computeWheelSectorIntel' || s.name.startsWith('getWheel') || s.name.startsWith('scoreWheel') || s.name.startsWith('applyWheel') || s.name.startsWith('invalidateWheel') || s.name === 'scheduleWheelRender' || s.name === 'flushWheelRender' || s.name === 'ensureQuantumWheelDashboardDOM');

function countRefs(name, text) {
  const re = new RegExp('\\b' + name + '\\b', 'g');
  const m = text.match(re);
  return m ? m.length : 0;
}

function hasDef(name, text) {
  return new RegExp('function\\s+' + name + '\\s*\\(').test(text);
}

const wheelMarkers = [];
inline.forEach((l, i) => {
  if (/KVANTOVÉ KOLESO|Wheel brain|Wheel canvas|CANVAS WHEEL/.test(l)) wheelMarkers.push({ line: i + 1, text: l.trim().slice(0, 72) });
});

let wheelBlockStart = inline.findIndex((l) => l.includes('KVANTOVÉ KOLESO'));
let wheelBlockEnd = inline.findIndex((l) => l.includes('CANVAS WHEEL — presunuté'));
if (wheelBlockEnd < 0) wheelBlockEnd = inline.findIndex((l) => l.includes('Wheel canvas →'));
const qwHudStart = inline.findIndex((l) => l.includes('function qwColDozStats'));
const qwHudEnd = wheelBlockEnd > 0 ? wheelBlockEnd : inline.length;

const report = {
  inlineTotalLines: inline.length,
  wheelQwBlockLines: wheelBlockStart >= 0 ? (qwHudEnd > wheelBlockStart ? qwHudEnd - wheelBlockStart : inline.length - wheelBlockStart) : 0,
  sectorIntelClusterLines: 0,
  targets: [],
  allQwCount: qwFns.length,
  allQwLines: qwFns.reduce((s, f) => s + f.lines, 0),
  topQw: qwFns.sort((a, b) => b.lines - a.lines).slice(0, 15),
};

const secStart = spans.find((s) => s.name === 'getWheelSectorStats');
const secEnd = spans.find((s) => s.name === 'getSectorAnalysis');
if (secStart && secEnd) report.sectorIntelClusterLines = secEnd.start + secEnd.lines - secStart.start;

TARGETS.forEach((name) => {
  const sp = spans.find((s) => s.name === name);
  const defInline = !!sp;
  const refsInline = countRefs(name, inlineText) - (defInline ? 1 : 0);
  const inHud = hasDef(name, modules['wheel-hud.js']);
  const inBrain = hasDef(name, modules['wheel-brain.js']);
  const inCanvas = hasDef(name, modules['wheel-canvas.js']);
  const refsHud = countRefs(name, modules['wheel-hud.js']);
  const refsBrain = countRefs(name, modules['wheel-brain.js']);
  const refsCanvas = countRefs(name, modules['wheel-canvas.js']);
  report.targets.push({
    name,
    lines: sp ? sp.lines : 0,
    startLine: sp ? sp.start : null,
    refsInline,
    defHud: inHud,
    defBrain: inBrain,
    defCanvas: inCanvas,
    refsHud,
    refsBrain,
    refsCanvas,
  });
});

const allQw = spans.filter((s) => s.name.startsWith('qw'));
console.log(JSON.stringify(report, null, 2));
console.log('\n--- ALL qw* in V2 inline (' + allQw.length + ') ---');
allQw.sort((a, b) => b.lines - a.lines).forEach((s) => console.log(s.lines + '\t' + s.name));
