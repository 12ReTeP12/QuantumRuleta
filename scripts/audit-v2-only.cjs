'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const v2Path = path.join(root, 'index-NOVY-V2.html');
const v2 = fs.readFileSync(v2Path, 'utf8');

const htmlIds = [...v2.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
const getIds = [...v2.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map((m) => m[1]);
const queryIds = [...v2.matchAll(/querySelector\(["']#([^"']+)["']\)/g)].map((m) => m[1]);
const used = new Set([...getIds, ...queryIds]);
const htmlSet = new Set(htmlIds);
const dynamicOk = (id) => id.startsWith('grid-') || id.startsWith('qw');
const missingInHtml = [...used].filter((id) => !htmlSet.has(id) && !dynamicOk(id));
const neverReferenced = [...htmlSet].filter(
  (id) => !used.has(id) && !['wheelCanvas', 'qwFlowRadarSvg', 'qwFlowBeams', 'qwFlowSectorLabels', 'qwFlowGlow', 'v2-layout-last', 'kbFlowAnomaly'].includes(id)
);

const scripts = [...v2.matchAll(/<script src=["']([^"']+)["']/g)].map((m) => m[1]);
const inlineBlocks = v2.split(/<script(?:\s[^>]*)?>/).length - 1;

const funcs = [...v2.matchAll(/^function ([a-zA-Z0-9_$]+)/gm)].map((m) => m[1]);
const funcCalls = new Set();
for (const f of funcs) {
  const re = new RegExp('\\b' + f.replace(/\$/g, '\\$') + '\\s*\\(', 'g');
  const matches = v2.match(re) || [];
  if (matches.length <= 1) funcCalls.add(f); // only definition
}

const hiddenEls = [...v2.matchAll(/id=["']([^"']+)["'][^>]*style=["']display:\s*none/gi)].map((m) => m[1]);

const PRODUCTION_EXTERNAL = [
  'scripts/pattern/spin-pattern-observer.js',
  'scripts/ui/keyboard-live-ai-flow.js',
  'scripts/ui/session-fatigue.js',
  'scripts/bootstrap/app-boot.js',
  'scripts/wheel/wheel-hud.js',
  'scripts/wheel/wheel-sector-intel.js',
  'scripts/wheel/wheel-brain.js',
  'scripts/wheel/wheel-canvas.js',
  'scripts/strategy/strategy-engine.js',
  'scripts/analytics/pressure-engine.js',
  'scripts/analytics/visual-heat-engine.js',
  'scripts/analytics/telemetry-engine.js',
  'scripts/debug/engine-hub.js',
];

function moduleLoadedInV2(rel) {
  const base = rel.split('?')[0];
  return scripts.some((s) => s.split('?')[0] === base);
}

function symbolInFile(filePath, symbol) {
  if (!fs.existsSync(filePath)) return false;
  const src = fs.readFileSync(filePath, 'utf8');
  return new RegExp('(?:function\\s+' + symbol + '|(?:var|let|const)\\s+' + symbol + '\\s*=)').test(src);
}

// External modules not loaded by V2
const allScripts = fs.readdirSync(path.join(root, 'scripts'), { recursive: true })
  .filter((f) => typeof f === 'string' && f.endsWith('.js') && !f.includes('_test'))
  .map((f) => 'scripts/' + f.replace(/\\/g, '/'));
const loaded = new Set(scripts.map((s) => s.split('?')[0]));
const notLoaded = allScripts.filter((s) => !loaded.has(s) && !s.includes('tests'));

const spoProdPath = path.join(root, 'scripts/pattern/spin-pattern-observer.js');
const spoLegacyPath = path.join(root, 'scripts/_legacy/pattern/spin-pattern-observer.js');
const spoInlineInV2 = /function computeSpinPatternObserver\s*\(/.test(v2);
const spoInProduction = symbolInFile(spoProdPath, 'computeSpinPatternObserver');

const kbProdPath = path.join(root, 'scripts/ui/keyboard-live-ai-flow.js');
const kbInlineInV2 = /function renderKeyboardLiveAIFlow\s*\(/.test(v2);
const kbInProduction = symbolInFile(kbProdPath, 'renderKeyboardLiveAIFlow');

const sfProdPath = path.join(root, 'scripts/ui/session-fatigue.js');
const sfInlineInV2 = /function renderSessionFatigue\s*\(/.test(v2);
const sfInProduction = symbolInFile(sfProdPath, 'renderSessionFatigue');

const bootProdPath = path.join(root, 'scripts/bootstrap/app-boot.js');
const bootInlineInV2 = /function bootApp\s*\(/.test(v2);
const bootInProduction = symbolInFile(bootProdPath, 'bootApp');

const whProdPath = path.join(root, 'scripts/wheel/wheel-hud.js');
const whInlineInV2 = /function renderWheelRadar\s*\(/.test(v2);
const whInProduction = symbolInFile(whProdPath, 'renderWheelRadar');
const HUD_10H4A_SYMBOLS = [
  'ensureQuantumWheelDashboardDOM',
  'qwResolveHudCopy',
  'qwColorState',
  'skQw',
  'skWheelUserText',
  'qwColDozStats',
  'buildQwLiveOutputHTML',
];
const hud4aInlineInV2 = HUD_10H4A_SYMBOLS.some((s) => new RegExp('function\\s+' + s + '\\s*\\(').test(v2));
const hud4aInModule = HUD_10H4A_SYMBOLS.every((s) => symbolInFile(whProdPath, s));

const wsiProdPath = path.join(root, 'scripts/wheel/wheel-sector-intel.js');
const sectorIntelInline = /function computeWheelSectorIntel\s*\(/.test(v2);
const sectorIntelInModule = symbolInFile(wsiProdPath, 'computeWheelSectorIntel');
const SECTOR_10H4B_SYMBOLS = [
  'getSectorAnalysis',
  'getWheelSectorStats',
  'scoreWheelSectorSpinCore',
  'invalidateWheelSectorIntelCache',
];
const sector4bInlineInV2 = SECTOR_10H4B_SYMBOLS.some((s) => new RegExp('function\\s+' + s + '\\s*\\(').test(v2))
  || /let lastWheelIntel=/.test(v2);
const sector4bInModule = SECTOR_10H4B_SYMBOLS.every((s) => symbolInFile(wsiProdPath, s))
  && symbolInFile(wsiProdPath, 'computeWheelSectorIntel');

const seProdPath = path.join(root, 'scripts/strategy/strategy-engine.js');
const strategyInline = /function computeStrategyEngine\s*\(/.test(v2);
const strategyInModule = symbolInFile(seProdPath, 'computeStrategyEngine');
const STRATEGY_10H5_SYMBOLS = [
  'invalidateStrategyCache',
  'renderStrategy',
  'renderAccuracy',
  'skStrategyMode',
];
const strategy5InlineInV2 = STRATEGY_10H5_SYMBOLS.some((s) => new RegExp('function\\s+' + s + '\\s*\\(').test(v2))
  || /let lastStrategyEngine=/.test(v2);
const strategy5InModule = STRATEGY_10H5_SYMBOLS.every((s) => symbolInFile(seProdPath, s))
  && symbolInFile(seProdPath, 'computeStrategyEngine');

const peProdPath = path.join(root, 'scripts/analytics/pressure-engine.js');
const pressureInline = /function computeWheelPressureEngine\s*\(/.test(v2);
const pressureInModule = symbolInFile(peProdPath, 'computeWheelPressureEngine');
const PRESSURE_10H6_SYMBOLS = ['invalidateWheelPressureCache', 'renderPressure'];
const pressure6InlineInV2 = PRESSURE_10H6_SYMBOLS.some((s) => new RegExp('function\\s+' + s + '\\s*\\(').test(v2))
  || /let lastWheelPressureEngine=/.test(v2);
const pressure6InModule = PRESSURE_10H6_SYMBOLS.every((s) => symbolInFile(peProdPath, s))
  && symbolInFile(peProdPath, 'computeWheelPressureEngine');

const vhProdPath = path.join(root, 'scripts/analytics/visual-heat-engine.js');
const visualHeatInline = /function computeVisualHeatEngine\s*\(/.test(v2);
const visualHeatInModule = symbolInFile(vhProdPath, 'computeVisualHeatEngine');
const VISUAL_10H6_SYMBOLS = ['invalidateVisualHeatCache', 'renderHeatmap'];
const visual6InlineInV2 = VISUAL_10H6_SYMBOLS.some((s) => new RegExp('function\\s+' + s + '\\s*\\(').test(v2))
  || /let lastVisualHeatEngine=/.test(v2);
const visual6InModule = VISUAL_10H6_SYMBOLS.every((s) => symbolInFile(vhProdPath, s))
  && symbolInFile(vhProdPath, 'computeVisualHeatEngine');

const teProdPath = path.join(root, 'scripts/analytics/telemetry-engine.js');
const telemetryInline = /function collectEngineTelemetrySignals\s*\(/.test(v2);
const telemetryInModule = symbolInFile(teProdPath, 'collectEngineTelemetrySignals');
const TELEMETRY_10H6_SYMBOLS = [
  'invalidateTelemetryCache',
  'computeTelemetryEngine',
  'renderTelemetry',
  'computeEngineSynchronization',
  'computeSignalQuality',
  'computeConfidenceStability',
  'computeLiveAIState',
  'skEngineName',
];
const telemetry6InlineInV2 = TELEMETRY_10H6_SYMBOLS.some((s) => new RegExp('function\\s+' + s + '\\s*\\(').test(v2))
  || /let lastTelemetryEngine=/.test(v2);
const telemetry6InModule = TELEMETRY_10H6_SYMBOLS.every((s) => symbolInFile(teProdPath, s))
  && symbolInFile(teProdPath, 'collectEngineTelemetrySignals');

const wbProdPath = path.join(root, 'scripts/wheel/wheel-brain.js');
const wheelBrainInline = /function computeQuantumWheelBrain\s*\(/.test(v2);
const wheelBrainInModule = symbolInFile(wbProdPath, 'computeQuantumWheelBrain');

const wcProdPath = path.join(root, 'scripts/wheel/wheel-canvas.js');
const wheelCanvasInline = /function renderCanvasWheel\s*\(/.test(v2);
const wheelCanvasInModule = symbolInFile(wcProdPath, 'renderCanvasWheel');

const ehProdPath = path.join(root, 'scripts/debug/engine-hub.js');
const engineHubInline = /function renderEngineHub\s*\(/.test(v2);
const engineHubInModule = symbolInFile(ehProdPath, 'renderEngineHub');

// V4 sync
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const mainJs = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

const report = {
  file: { bytes: v2.length, lines: v2.split(/\n/).length },
  htmlIds: htmlIds.length,
  getElementById: getIds.length,
  inlineFunctions: funcs.length,
  possiblyUnusedFunctions: [...funcCalls].filter((f) => !f.startsWith('boot') && f !== 'createBoard').slice(0, 80),
  possiblyUnusedCount: funcCalls.size,
  missingDomIds: missingInHtml,
  htmlIdsNeverReferenced: neverReferenced,
  hiddenInDom: hiddenEls,
  externalScriptsLoaded: scripts,
  externalScriptCount: scripts.length,
  externalScriptsNotLoaded: notLoaded,
  inlineScriptBlocks: inlineBlocks,
  extractedModules: {
    patternObserver: {
      production: 'scripts/pattern/spin-pattern-observer.js',
      loadedInV2: moduleLoadedInV2('scripts/pattern/spin-pattern-observer.js'),
      symbolInProductionFile: spoInProduction,
      inlineDefinitionInV2: spoInlineInV2,
      authority: spoInProduction && !spoInlineInV2 ? 'EXTERNAL (9F)' : 'CHECK',
      archivedAt: 'scripts/_legacy/pattern/spin-pattern-observer.js',
    },
    keyboardFlow: {
      production: 'scripts/ui/keyboard-live-ai-flow.js',
      loadedInV2: moduleLoadedInV2('scripts/ui/keyboard-live-ai-flow.js'),
      symbolInProductionFile: kbInProduction,
      inlineDefinitionInV2: kbInlineInV2,
      authority: kbInProduction && !kbInlineInV2 ? 'EXTERNAL (9C)' : 'CHECK',
      archivedAt: 'scripts/_legacy/ui/ui-panels.js',
    },
    sessionFatigue: {
      production: 'scripts/ui/session-fatigue.js',
      loadedInV2: moduleLoadedInV2('scripts/ui/session-fatigue.js'),
      symbolInProductionFile: sfInProduction,
      inlineDefinitionInV2: sfInlineInV2,
      authority: sfInProduction && !sfInlineInV2 ? 'EXTERNAL (9B)' : 'CHECK',
    },
    bootstrap: {
      production: 'scripts/bootstrap/app-boot.js',
      loadedInV2: moduleLoadedInV2('scripts/bootstrap/app-boot.js'),
      symbolInProductionFile: bootInProduction,
      inlineDefinitionInV2: bootInlineInV2,
      authority: bootInProduction && !bootInlineInV2 ? 'EXTERNAL (10D)' : 'CHECK',
      archivedAt: 'scripts/_legacy/bootstrap/app-init.js',
    },
    wheelHud: {
      production: 'scripts/wheel/wheel-hud.js',
      loadedInV2: moduleLoadedInV2('scripts/wheel/wheel-hud.js'),
      symbolInProductionFile: whInProduction,
      inlineDefinitionInV2: whInlineInV2,
      authority: whInProduction && !whInlineInV2 ? 'EXTERNAL (10F + 10H-4A)' : 'CHECK',
      presentation10H4A: {
        symbolsInModule: hud4aInModule,
        anyInlineDuplicateInV2: hud4aInlineInV2,
        authority: hud4aInModule && !hud4aInlineInV2 ? 'EXTERNAL (10H-4A)' : 'CHECK',
      },
    },
    wheelSectorIntel: {
      production: 'scripts/wheel/wheel-sector-intel.js',
      loadedInV2: moduleLoadedInV2('scripts/wheel/wheel-sector-intel.js'),
      symbolInProductionFile: sectorIntelInModule,
      inlineDefinitionInV2: sectorIntelInline,
      authority: sectorIntelInModule && !sectorIntelInline ? 'EXTERNAL (10H-4B)' : 'CHECK',
      sector10H4B: {
        symbolsInModule: sector4bInModule,
        anyInlineDuplicateInV2: sector4bInlineInV2,
        authority: sector4bInModule && !sector4bInlineInV2 ? 'EXTERNAL (10H-4B)' : 'CHECK',
      },
    },
    strategyEngine: {
      production: 'scripts/strategy/strategy-engine.js',
      loadedInV2: moduleLoadedInV2('scripts/strategy/strategy-engine.js'),
      symbolInProductionFile: strategyInModule,
      inlineDefinitionInV2: strategyInline,
      authority: strategyInModule && !strategyInline ? 'EXTERNAL (10H-5)' : 'CHECK',
      strategy10H5: {
        symbolsInModule: strategy5InModule,
        anyInlineDuplicateInV2: strategy5InlineInV2,
        authority: strategy5InModule && !strategy5InlineInV2 ? 'EXTERNAL (10H-5)' : 'CHECK',
      },
    },
    pressureEngine: {
      production: 'scripts/analytics/pressure-engine.js',
      loadedInV2: moduleLoadedInV2('scripts/analytics/pressure-engine.js'),
      symbolInProductionFile: pressureInModule,
      inlineDefinitionInV2: pressureInline,
      authority: pressureInModule && !pressureInline ? 'EXTERNAL (10H-6)' : 'CHECK',
      pressure10H6: {
        symbolsInModule: pressure6InModule,
        anyInlineDuplicateInV2: pressure6InlineInV2,
        authority: pressure6InModule && !pressure6InlineInV2 ? 'EXTERNAL (10H-6)' : 'CHECK',
      },
    },
    visualHeatEngine: {
      production: 'scripts/analytics/visual-heat-engine.js',
      loadedInV2: moduleLoadedInV2('scripts/analytics/visual-heat-engine.js'),
      symbolInProductionFile: visualHeatInModule,
      inlineDefinitionInV2: visualHeatInline,
      authority: visualHeatInModule && !visualHeatInline ? 'EXTERNAL (10H-6)' : 'CHECK',
      visualHeat10H6: {
        symbolsInModule: visual6InModule,
        anyInlineDuplicateInV2: visual6InlineInV2,
        authority: visual6InModule && !visual6InlineInV2 ? 'EXTERNAL (10H-6)' : 'CHECK',
      },
    },
    telemetryEngine: {
      production: 'scripts/analytics/telemetry-engine.js',
      loadedInV2: moduleLoadedInV2('scripts/analytics/telemetry-engine.js'),
      symbolInProductionFile: telemetryInModule,
      inlineDefinitionInV2: telemetryInline,
      authority: telemetryInModule && !telemetryInline ? 'EXTERNAL (10H-6)' : 'CHECK',
      telemetry10H6: {
        symbolsInModule: telemetry6InModule,
        anyInlineDuplicateInV2: telemetry6InlineInV2,
        authority: telemetry6InModule && !telemetry6InlineInV2 ? 'EXTERNAL (10H-6)' : 'CHECK',
      },
    },
    wheelBrain: {
      production: 'scripts/wheel/wheel-brain.js',
      loadedInV2: moduleLoadedInV2('scripts/wheel/wheel-brain.js'),
      symbolInProductionFile: wheelBrainInModule,
      inlineDefinitionInV2: wheelBrainInline,
      authority: wheelBrainInModule && !wheelBrainInline ? 'EXTERNAL (10F2)' : 'CHECK',
    },
    wheelCanvas: {
      production: 'scripts/wheel/wheel-canvas.js',
      loadedInV2: moduleLoadedInV2('scripts/wheel/wheel-canvas.js'),
      symbolInProductionFile: wheelCanvasInModule,
      inlineDefinitionInV2: wheelCanvasInline,
      authority: wheelCanvasInModule && !wheelCanvasInline ? 'EXTERNAL (10F3)' : 'CHECK',
    },
    engineHub: {
      production: 'scripts/debug/engine-hub.js',
      loadedInV2: moduleLoadedInV2('scripts/debug/engine-hub.js'),
      symbolInProductionFile: engineHubInModule,
      inlineDefinitionInV2: engineHubInline,
      authority: engineHubInModule && !engineHubInline ? 'EXTERNAL (10G)' : 'CHECK',
    },
  },
  wheelBrain: {
    inlineInV2: wheelBrainInline,
    inWheelBrainModule: wheelBrainInModule,
    authority: wheelBrainInModule && !wheelBrainInline ? 'EXTERNAL MODULE (10F2)' : 'CHECK',
  },
  wheelCanvas: {
    inlineInV2: wheelCanvasInline,
    inWheelCanvasModule: wheelCanvasInModule,
    authority: wheelCanvasInModule && !wheelCanvasInline ? 'EXTERNAL MODULE (10F3)' : 'CHECK',
  },
  engineHub: {
    inlineInV2: engineHubInline,
    inEngineHubModule: engineHubInModule,
    authority: engineHubInModule && !engineHubInline ? 'EXTERNAL MODULE (10G)' : 'CHECK',
  },
  electron: {
    packageMain: pkg.main,
    packageDesc: pkg.description,
    mainLoadsIndexHtml: mainJs.includes('index.html'),
    mainMentionsV2: mainJs.includes('V2') || mainJs.includes('NOVY-V2'),
  },
  renderHeavy: v2.includes('function renderHeavy(){') && v2.includes('renderEngineAdvancedPanels();'),
  heavyInterval: (v2.match(/HEAVY_RENDER_INTERVAL=(\d+)/) || [])[1],
  bootAppLine: fs.existsSync(bootProdPath)
    ? fs.readFileSync(bootProdPath, 'utf8').split('\n').findIndex((line) => /function bootApp\s*\(/.test(line)) + 1
    : 0,
  bootAppInlineInV2: bootInlineInV2,
  wheelBrainLine: fs.existsSync(wbProdPath)
    ? fs.readFileSync(wbProdPath, 'utf8').split('\n').findIndex((line) => /function computeQuantumWheelBrain\s*\(/.test(line)) + 1
    : 0,
};

console.log(JSON.stringify(report, null, 2));
