'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..', '..');
const v2Path = path.join(root, 'index-NOVY-V2.html');
const idxPath = path.join(root, 'index.html');
const v2 = fs.readFileSync(v2Path, 'utf8');
const idx = fs.readFileSync(idxPath, 'utf8');
const master = fs.readFileSync(path.join(root, 'scripts/tests/_test_v4_master.cjs'), 'utf8');

const runtimeScripts = [...v2.matchAll(/<script src=["']([^"']+)["']/g)].map((m) => m[1].split('?')[0]);
const masterMods = (master.match(/const MODULES = \[([\s\S]*?)\];/)?.[1] || '')
  .match(/'scripts\/[^']+'/g)
  .map((s) => s.replace(/'/g, ''));

function has(sym, text) {
  return new RegExp('(?:function\\s+' + sym + '|(?:var|let|const)\\s+' + sym + '\\s*=)').test(text);
}
function loaded(rel) {
  return runtimeScripts.includes(rel);
}
function fileExists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function inMaster(rel) {
  return masterMods.includes(rel);
}
function inlineDef(sym) {
  return new RegExp('function\\s+' + sym + '\\s*\\(').test(v2);
}
function moduleDef(sym, rel) {
  if (!fileExists(rel)) return false;
  return has(sym, fs.readFileSync(path.join(root, rel), 'utf8'));
}

const hashV2 = crypto.createHash('sha256').update(v2).digest('hex');
const hashIdx = crypto.createHash('sha256').update(idx).digest('hex');

const legacyFiles = [];
function walk(d, prefix) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, prefix + e.name + '/');
    else if (e.name.endsWith('.js')) legacyFiles.push('scripts/_legacy/' + prefix + e.name);
  }
}
walk(path.join(root, 'scripts/_legacy'), '');

const allProdJs = [];
function walkScripts(d, base) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory() && e.name !== 'tests' && e.name !== '_legacy') walkScripts(p, base + e.name + '/');
    else if (e.isFile() && e.name.endsWith('.js') && !e.name.startsWith('_test')) {
      allProdJs.push('scripts/' + base + e.name);
    }
  }
}
walkScripts(path.join(root, 'scripts'), '');

const notLoadedProd = allProdJs.filter((s) => !runtimeScripts.includes(s) && !s.includes('tests/'));

const authorities = [
  { id: 'gate', sym: 'readOfficialPlayGate', mod: 'scripts/ai/confidence-engine.js' },
  { id: 'true-valid', sym: 'ValidTrueV0', mod: 'scripts/valid-true/valid-true-v0.js' },
  { id: 'wheel-brain', sym: 'computeQuantumWheelBrain', mod: 'scripts/wheel/wheel-brain.js' },
  { id: 'wheel-canvas', sym: 'renderCanvasWheel', mod: 'scripts/wheel/wheel-canvas.js' },
  { id: 'wheel-hud', sym: 'renderWheelRadar', mod: 'scripts/wheel/wheel-hud.js' },
  { id: 'pred-flow', sym: 'computeFollowUpFlowEngine', mod: 'scripts/ai/pred-flow-engine.js' },
  { id: 'pred-dash', sym: 'invalidatePredCache', mod: 'scripts/ai/pred-dashboard.js' },
  { id: 'bah', sym: 'computeBehaviorAlerts', mod: 'scripts/analytics/bah-engine.js' },
  { id: 'stats', sym: 'getClusters', mod: 'scripts/analytics/session-stats.js' },
  { id: 'boot', sym: 'bootApp', mod: 'scripts/bootstrap/app-boot.js' },
  { id: 'po', sym: 'computeSpinPatternObserver', mod: 'scripts/pattern/spin-pattern-observer.js' },
  { id: 'kb', sym: 'renderKeyboardLiveAIFlow', mod: 'scripts/ui/keyboard-live-ai-flow.js' },
  { id: 'sf', sym: 'renderSessionFatigue', mod: 'scripts/ui/session-fatigue.js' },
  { id: 'eh', sym: 'renderEngineHub', mod: 'scripts/debug/engine-hub.js' },
  { id: 'render', sym: 'renderLight', mod: null },
];

const packs = [
  {
    name: 'Balík 1',
    desc: 'Core modularizácia (constants, state, helpers, event-bus, štýly)',
    checks: [
      { sym: 'wheel', mod: 'scripts/core/constants.js' },
      { sym: 'spins', mod: 'scripts/core/state.js' },
      { sym: 'clamp', mod: 'scripts/core/helpers.js' },
      { file: 'scripts/core/event-bus.js' },
      { css: 'styles/main.css' },
    ],
  },
  {
    name: 'Balík 3',
    desc: 'Board + timing + roulette analytics + ui-alerts moduly',
    checks: [
      { sym: 'renderBoard', mod: 'scripts/board/board-ui.js' },
      { sym: 'bindBoardEvents', mod: 'scripts/board/board-events.js' },
      { sym: 'computeTimingEngine', mod: 'scripts/analytics/timing-engine.js' },
      { sym: 'computeRouletteObserverUI', mod: 'scripts/analytics/roulette-analytics.js' },
      { sym: 'renderAlerts', mod: 'scripts/ui/ui-alerts.js' },
    ],
  },
  {
    name: 'Balík 2A',
    desc: 'Render pipeline cez EVENT.RENDER (bez duplicitných spin:add listenerov)',
    checks: [
      { text: 'onEvent(EVENT.RENDER,function' },
      { text: 'function renderLight' },
      { noInline: 'bindSpinEventBusListeners', mod: 'scripts/bootstrap/app-boot.js' },
    ],
  },
  {
    name: 'Balík 7',
    desc: 'Pipeline V2-only + sync-v2 + audit disk (7E)',
    checks: [
      { file: 'scripts/sync-v2.cjs' },
      { file: 'index-NOVY-V2.html' },
      { file: 'scripts/audit-disk-usage.cjs' },
      { noFile: 'index-NOVY-V4.html' },
    ],
  },
  {
    name: 'Balík 8',
    desc: 'TRUE VALID V0 + confidence gate modul',
    checks: [
      { sym: 'ValidTrueV0', mod: 'scripts/valid-true/valid-true-v0.js' },
      { sym: 'computeConfidenceEngine', mod: 'scripts/ai/confidence-engine.js' },
      { text: 'ValidTrueV0.renderPanel' },
      { text: 'ValidTrueV0.onSpinScored' },
    ],
  },
  {
    name: 'Balík 9',
    desc: '9B Session Fatigue, 9C Keyboard Flow, 9F Pattern Observer',
    checks: [
      { sym: 'renderSessionFatigue', mod: 'scripts/ui/session-fatigue.js', noInline: true },
      { sym: 'renderKeyboardLiveAIFlow', mod: 'scripts/ui/keyboard-live-ai-flow.js', noInline: true },
      { sym: 'computeSpinPatternObserver', mod: 'scripts/pattern/spin-pattern-observer.js', noInline: true },
    ],
  },
  {
    name: 'Balík 10',
    desc: '10D boot, 10F wheel stack, 10G engine hub, 10H-1/2/3 AI extractions',
    checks: [
      { sym: 'bootApp', mod: 'scripts/bootstrap/app-boot.js', noInline: true },
      { sym: 'renderWheelRadar', mod: 'scripts/wheel/wheel-hud.js', noInline: true },
      { sym: 'computeQuantumWheelBrain', mod: 'scripts/wheel/wheel-brain.js', noInline: true },
      { sym: 'renderCanvasWheel', mod: 'scripts/wheel/wheel-canvas.js', noInline: true },
      { sym: 'renderEngineHub', mod: 'scripts/debug/engine-hub.js', noInline: true },
      { sym: 'computeFollowUpFlowEngine', mod: 'scripts/ai/pred-flow-engine.js', noInline: true },
      { sym: 'invalidatePredCache', mod: 'scripts/ai/pred-dashboard.js', noInline: true },
      { sym: 'computeBehaviorAlerts', mod: 'scripts/analytics/bah-engine.js', noInline: true },
      { sym: 'entropy', mod: 'scripts/analytics/session-stats.js', noInline: true },
    ],
  },
];

function evalPack(p) {
  const r = { name: p.name, desc: p.desc, items: [], ok: true };
  for (const c of p.checks) {
    let pass = true;
    let detail = '';
    if (c.sym && c.mod) {
      pass = fileExists(c.mod) && moduleDef(c.sym, c.mod) && loaded(c.mod);
      if (c.noInline) pass = pass && !inlineDef(c.sym);
      detail = c.mod + ' · ' + c.sym;
    } else if (c.file) {
      pass = fileExists(c.file);
      detail = c.file;
    } else if (c.css) {
      pass = v2.includes(c.css);
      detail = c.css;
    } else if (c.text) {
      pass = v2.includes(c.text);
      detail = c.text;
    } else if (c.noFile) {
      pass = !fileExists(c.noFile);
      detail = 'absent ' + c.noFile;
    }
    if (c.noInline && c.mod) {
      const sym = c.sym || c.noInline;
      if (inlineDef(sym)) { pass = false; detail += ' (DUPLICATE INLINE)'; }
    }
    const tested = !c.mod || inMaster(c.mod) || c.mod === 'scripts/core/event-bus.js';
    r.items.push({ detail, pass, tested });
    if (!pass) r.ok = false;
  }
  // master test coverage: all module checks should be in master OR event-bus/core in html import test
  const modChecks = p.checks.filter((x) => x.mod).map((x) => x.mod);
  r.masterAll = modChecks.every((m) => inMaster(m) || m.startsWith('scripts/core/'));
  r.runtimeAll = modChecks.every(loaded);
  r.v2Authority = modChecks.every((m) => fileExists(m) && v2.includes(m.split('/').pop() ? m : m));
  return r;
}

const packResults = packs.map(evalPack);

const authRows = authorities.map((a) => {
  if (!a.mod) {
    return { id: a.id, inline: inlineDef(a.sym), external: false, loaded: true, master: false };
  }
  return {
    id: a.id,
    inline: inlineDef(a.sym),
    external: moduleDef(a.sym, a.mod),
    loaded: loaded(a.mod),
    master: inMaster(a.mod),
  };
});

console.log(JSON.stringify({
  v2EqualsIndex: hashV2 === hashIdx,
  v2Bytes: v2.length,
  runtimeScriptCount: runtimeScripts.length,
  runtimeScripts,
  masterModuleCount: masterMods.length,
  masterNotRuntime: masterMods.filter((m) => !runtimeScripts.includes(m)),
  runtimeNotMaster: runtimeScripts.filter((s) => !masterMods.includes(s) && s !== 'scripts/core/event-bus.js'),
  legacyCount: legacyFiles.length,
  legacyFiles,
  notLoadedProdJs: notLoadedProd,
  packResults,
  authRows,
  inlineHasBoot: inlineDef('bootApp'),
  inlineHasBrain: inlineDef('computeQuantumWheelBrain'),
  pkgStartUsesSync: fs.readFileSync(path.join(root, 'package.json'), 'utf8').includes('sync-v2'),
  mainLoadsIndex: fs.readFileSync(path.join(root, 'main.js'), 'utf8').includes('index.html'),
}, null, 2));
