# Dependency map — KVANTOVÁ RULETA PRO V2

**Stav:** Balík **10J** — architektúra uzatvorená.  
**Produkčných externých modulov:** **32** (`<script src>` vo V2).  
**Uzatvorenie:** `ARCHITECTURE-CLOSURE-10J.md`

---

## CURRENT RUNTIME AUTHORITIES

| Oblasť | Autorita | Poznámka |
|--------|----------|----------|
| **Gate** | `scripts/ai/confidence-engine.js` | `readOfficialPlayGate()` jediný reader; chaos z V2 `computeRiskChaosCore()` |
| **TRUE VALID** | `scripts/valid-true/valid-true-v0.js` | `ValidTrueV0.*`; nie gate |
| **Wheel** | Brain: **`wheel-brain.js`**; sector intel: **`wheel-sector-intel.js`**; canvas: **`wheel-canvas.js`**; HUD: **`wheel-hud.js`**; flow: `quantum-wheel.js` | Flow engine + schedule = **V2 inline** |
| **Pattern Observer** | **`scripts/pattern/spin-pattern-observer.js`** | EXTERNAL (9F); HTML vo V2 |
| **Keyboard Flow** | **`scripts/ui/keyboard-live-ai-flow.js`** | EXTERNAL (9C); `kbFlowBoxHTML` vo V2 |
| **Session Fatigue** | **`scripts/ui/session-fatigue.js`** | EXTERNAL (9B); pred cache vo V2 |
| **Bootstrap** | **`scripts/bootstrap/app-boot.js`** | **EXTERNAL MODULE** (10D); `DOMContentLoaded` hook vo V2; archív `_legacy/bootstrap/` |
| **Strategy** | **`scripts/strategy/strategy-engine.js`** | EXTERNAL (10H-5); cache hub `invalidatePredCache` vo `pred-dashboard.js` |
| **Diagnostics** | **`pressure-engine.js`**, **`visual-heat-engine.js`**, **`telemetry-engine.js`** | EXTERNAL (10H-6); `#pressure`, `#heatmap`, `#telemetry`; Engine Hub collector |

---

## Gate

| | |
|---|---|
| **Autorita** | `scripts/ai/confidence-engine.js` |
| **Vstupy** | `spins`, `spinTimes`, `adaptiveWeights.failStreak`; volá inline `computeRiskChaosCore()`, prípadne overrides |
| **Výstupy** | `{ chaosPct, gateChaosPct, play, label, cls, reason, … }` |
| **Závislosti** | V2 inline: `computeRiskChaosCore`, globálny stav; consumer: `readOfficialPlayGate()` |
| **Konzumenti** | `resolvePlayState`, master AI panel, tucty/stĺpce tip, keyboard flow banner, UI badge |
| **Legacy** | Žiadny externý legacy modul; duplicitné inline volania `readOfficialPlayGate()` |

---

## TRUE VALID

| | |
|---|---|
| **Autorita** | `scripts/valid-true/valid-true-v0.js` (`ValidTrueV0`) |
| **Vstupy** | Spin udalosti cez `onSpinScored(number)`; undo cez `onUndoSpin()`; reset cez `resetSession()` |
| **Výstupy** | Panel HTML (`renderPanel`), export JSON, COLUMN_ONLY hit rate |
| **Závislosti** | `pipelineScorePreviousSpin` volá `onSpinScored`; `readLegacyCombinedHit()` → `lastSpinScoreMetrics.hitCluster` (report only) |
| **Konzumenti** | `#validTruePanel`, export; **nie** gate rozhodovanie |
| **Legacy** | `legacyCombined` v exporte (diagnostika, duplicita cluster hit) |

---

## Pattern Observer

| | |
|---|---|
| **Autorita** | **`scripts/pattern/spin-pattern-observer.js`** — **EXTERNAL MODULE** |
| **Vstupy** | `spins[]`, `reds`, `getDozen`/`getColumn` (helpers), voliteľne `chaosState.chaosLevel`; runtime `kbFlowBoxHTML` (V2 inline) pre strip |
| **Výstupy** | Objekt R (doz/col sekvencie, dominancia, radar, notice); DOM `#spinPatternObserver`, `#tsPoBanner` / `#tsPoPrimary` |
| **Závislosti** | `state.js`, `constants.js`, `helpers.js`; hooky: `onNewSpin` → `tsModuleScoreSpin` / `tsModuleUpdateRecommendation`; `renderHeavy` → `renderSpinPatternObserver`; `renderLight` → `renderTuctyStlpceTip` |
| **Konzumenti** | `#spinPatternSection`, `#tuctyStlpceTipStrip` (HTML vo V2) |
| **Legacy** | `scripts/_legacy/pattern/spin-pattern-observer.js` (archív pred 9F, neprodukčný) |

---

## Wheel HUD

| | |
|---|---|
| **Typ (brain)** | **EXTERNAL MODULE** — `scripts/wheel/wheel-brain.js` (10F2) |
| **Autorita (brain)** | `computeQuantumWheelBrain()`, `computeQwFlowScanner()`, stav, cache hooky |
| **Typ (HUD)** | **EXTERNAL MODULE** — `scripts/wheel/wheel-hud.js` (10F + **10H-4A**) |
| **Autorita (HUD presentation)** | `ensureQuantumWheelDashboardDOM`, `qwResolveHudCopy`, `qwColorState`, `skQw`/`skWheelUserText`, `qwMetric*`/`qwHeroMetric`, `buildQwLiveOutputHTML`, `buildQwTrailHTML`, flow display helpery |
| **Autorita (HUD render)** | `renderWheelRadar()`, `buildQuantumWheel*HTML`, `qwHudShort` |
| **Typ (canvas)** | **EXTERNAL MODULE** — `scripts/wheel/wheel-canvas.js` (10F3) |
| **Autorita (canvas)** | `renderCanvasWheel()`, `drawQw*`, SVG overlay, animácia, `qwSyncWheelStageSize`, `qwBindWheelResize` |
| **Autorita (flow modul)** | `scripts/wheel/quantum-wheel.js` — `qwAnalyzeWheelFlow` (mutuje `qwFlowState`) |
| **Autorita (sector intel)** | **EXTERNAL MODULE** — `scripts/wheel/wheel-sector-intel.js` (10H-4B) |
| **Autorita (sector intel API)** | `computeWheelSectorIntel()`, `getSectorAnalysis()`, `invalidateWheelSectorIntelCache()` |
| **Cache hook** | `pred-dashboard.js` → `invalidateWheelCache()` volá `invalidateWheelSectorIntelCache()` |
| **Autorita (gate copy)** | `qwResolveHudCopy`, `qwAiPlayGateBlocksHud`, `qwUseMockupPresentation` — **`wheel-hud.js`** (10H-4A) |
| **Autorita (schedule / layout)** | **V2 inline** — `scheduleWheelRender`, `flushWheelRender`, `qwEnsureBoardOutsideWheel` |
| **Vstupy** | `wheel-brain.js` → Q; `spins`; `readOfficialPlayGate()` (confidence-engine) |
| **Výstupy** | `#wheelRadarData`, `#wheelCanvas`, panely `#qwPanel*` |
| **Závislosti** | `wheel-sector-intel.js`, `wheel-brain.js`, `wheel-canvas.js`, `wheel-hud.js`, `quantum-wheel.js`, V2 inline (flow engine, scoring, schedule) |
| **Konzumenti** | `renderHeavy`, `renderLight`, ValidTrueV0 snapshot |
| **Legacy** | — (10F3 hotové) |

---

## Bootstrap

| | |
|---|---|
| **Typ** | **EXTERNAL MODULE** — `scripts/bootstrap/app-boot.js` |
| **Autorita** | `bootApp()`, `initBoard`, `initWheel`, `initAI`, `bindSpinEventBusListeners`, `qwSeedStrongFlowDemo`, `createBoard` |
| **Vstupy** | DOM ready (V2 hook), IndexedDB session (`loadSessionIDB` inline), URL `?demoFlow=strong` |
| **Výstupy** | Inicializované panely, obnovená relácia, EventBus listeners flag |
| **Závislosti** | V2 inline: `bindUi`, `loadSessionIDB`, `renderLight`/`renderHeavy`, `updateStats`, `onNewSpin`; `board-ui`, `keyboard-live-ai-flow`, `quantum-wheel` |
| **Konzumenti** | Celá aplikácia pri štarte (`DOMContentLoaded` → `bootApp` vo V2) |
| **Legacy** | `scripts/_legacy/bootstrap/app-init.js` (archív, zastaraný) |

---

## Keyboard Flow

| | |
|---|---|
| **Typ** | **EXTERNAL MODULE** — `scripts/ui/keyboard-live-ai-flow.js` |
| **Autorita** | `renderKeyboardLiveAIFlow()`, `computeKeyboardLiveAIFlow()` (+ hook `kbFlowResetState`) |
| **Vstupy** | `spins`, gate (`computeConfidenceEngine`), clusters, hot/cold, migration |
| **Výstupy** | DOM `#kbLiveFlowPanel` (banner, learn bar, signal boxes) |
| **Závislosti** | `confidence-engine.js`, `roulette-analytics.js` (`rbaWeightedBins`), V2 inline (`kbFlowBoxHTML`, `getClusters`, …) |
| **Konzumenti** | `renderLight()` → `renderKeyboardLiveAIFlow()`; `initAI()`; undo cez `EVENT.RENDER` |
| **Legacy** | `scripts/_legacy/ui/ui-panels.js` (archív, neaktívny) |

---

## Session Fatigue

| | |
|---|---|
| **Typ** | **EXTERNAL MODULE** — `scripts/ui/session-fatigue.js` |
| **Autorita** | `computeSessionFatigueAnalysis()`, `renderSessionFatigue()` (+ hooky: `sessionFatigueOnSpin`, `sfaTrimAfterUndo`, `resetSessionFatigueEngine`, `sfaReplayFromSpinHistory`) |
| **Vstupy** | `spins`, `spinTimes`, `aiState`, `lastAIPredictionCache`, `predCacheKey()` |
| **Výstupy** | Analýza F (risk level, metrics, live warnings); DOM `#sessionFatiguePanel` |
| **Závislosti** | `state.js`, `helpers.js` (clamp); V2 inline predikčný cache |
| **Konzumenti** | `renderLight()` volá `renderSessionFatigue()`; `onNewSpin` → `sessionFatigueOnSpin`; undo → `sfaTrimAfterUndo` |
| **Legacy** | Žiadny (inline implementácia odstránená v 9B) |

---

## Strategy Engine

| | |
|---|---|
| **Typ** | **EXTERNAL MODULE** — `scripts/strategy/strategy-engine.js` (10H-5) |
| **Autorita** | `computeStrategyEngine()`, `invalidateStrategyCache()`, `renderStrategy()`, `renderAccuracy()`, `skStrategyMode()` |
| **Vstupy** | `spins`, `predCacheKey()`, predikčný cache, `getUnifiedConfidence()`, `getInvisibleLayer()`, `computeRiskChaosEngine()` (inline), `computeTimingCore()` (timing-engine), hit counters |
| **Výstupy** | Objekt režimu (SAFE/MEDIUM/AGGRESSIVE); DOM `#accuracy`, `#memory` |
| **Závislosti** | `pred-dashboard.js`, `ai-prediction.js`, `timing-engine.js` (runtime); V2 inline risk chaos, scoring counters |
| **Konzumenti** | `renderHeavy` → `renderStrategy()`; `pred-dashboard` → `computeStrategyEngine().mode`; `invalidatePredCache` → `invalidateStrategyCache()` |
| **Legacy** | — (10H-5 hotové) |

---

## Diagnostic Engines (10H-6)

| | |
|---|---|
| **Typ** | **EXTERNAL MODULES** — `scripts/analytics/pressure-engine.js`, `visual-heat-engine.js`, `telemetry-engine.js` |
| **Autorita (pressure)** | `computeWheelPressureEngine()`, `invalidateWheelPressureCache()`, `renderPressure()` |
| **Autorita (visual heat)** | `computeVisualHeatEngine()`, `invalidateVisualHeatCache()`, `renderHeatmap()` |
| **Autorita (telemetry)** | `collectEngineTelemetrySignals()`, `computeTelemetryEngine()`, helpery, `renderTelemetry()`, `skEngineName()` |
| **Vstupy** | wheel-sector-intel, session-stats, strategy, bah-engine, hot/cold (ai-engine), V2 inline (risk/flow/visual core) |
| **Výstupy** | DEBUG panely `#pressure`, `#heatmap`, `#telemetry`; Engine Hub pulz |
| **Závislosti** | `pred-dashboard.js` → `invalidatePredCache()` volá tri `invalidate*Cache()`; load order: pressure → visual-heat → telemetry → engine-hub |
| **Konzumenti** | `renderEngineAdvancedPanels()` (inline); `roulette-analytics.js` (pressure read-only) |
| **Legacy** | — (10H-6 hotové) |

---

## Engine Hub

| | |
|---|---|
| **Typ** | **EXTERNAL MODULE** — `scripts/debug/engine-hub.js` (10G) |
| **Autorita (hub)** | `ENGINE_CATALOG`, `renderEngineHub()`, `getClusterSuccessRatePct()`, `buildEngineHub`, `computeEngineHubState` |
| **Autorita (DEBUG shell)** | **V2 inline** — `renderEngineAdvancedPanels`, `engineAdvancedOpen`, `#engineAdvancedPanel` HTML |
| **Vstupy** | `lastSpinBreakdown`, `lastCoreValues`, `adaptiveWeights`, `successfulPredictions`/`totalPredictions`, entropy, timing; `collectEngineTelemetrySignals`, `computeRiskChaosEngine` (inline) |
| **Výstupy** | DEBUG panel `#enginePanels`, `#engineHubSummary`, `#grid-{id}` (14 tabov) |
| **Závislosti** | V2 inline scoring/telemetry; `skUiLabel`, `clamp`; panel otvorený len pri `engineAdvancedOpen` |
| **Konzumenti** | `renderEngineAdvancedPanels()` (inline) |
| **Legacy** | — (10G hotové) |

---

## Render orchestrátor (cross-cutting)

| | |
|---|---|
| **Autorita** | V2 inline — `onNewSpin`, `scheduleRender`, `renderLight`, `renderHeavy` |
| **Vstupy** | Spin udalosti, `EVENT.RENDER`, opts (`wheelImmediate`, `heavy`) |
| **Výstupy** | Aktualizácia všetkých panelov podľa light/heavy režimu |
| **Závislosti** | Všetky moduly vyššie + board, timing, alerts, AI prediction |
| **Poznámka** | Posledný kandidát na extrakciu — najvyššie previazaný |

---

## Externé moduly — rýchla mapa

| Modul | Vstupy (typicky) | Výstupy | Závisí na |
|-------|------------------|---------|-----------|
| `constants.js` | — | wheel, DOZENS, COLUMNS, reds | — |
| `state.js` | mutácie spinov | `spins`, `sessionState` | — |
| `helpers.js` | čísla | getDozen, getColumn, clamp… | constants |
| `event-bus.js` | emit/on | EventBus | — |
| `quantum-wheel.js` | spins, clusters | flow helpery | constants, helpers |
| `wheel-canvas.js` | brain Q, DOM | canvas, animácia | wheel-brain |
| `wheel-brain.js` | spins, sector intel | Q, flow scanner | sector-intel, inline |
| `wheel-sector-intel.js` | spins, hot/cold | sector stats, intel | pred-dashboard, session-stats |
| `wheel-hud.js` | Q, gate copy | radar HTML, HUD DOM | wheel-brain, confidence-engine |
| `ai-engine.js` | spins, LFP | live flow AI, hot/cold engine, risk core | lfp-engine, inline |
| `confidence-engine.js` | spins, chaos core | gate objekt | ai-engine risk core |
| `valid-true-v0.js` | spin/undo events | panel + export | inline score metrics |
| `lfp-engine.js` | flow state | LFP scores | ai-engine |
| `pred-flow-engine.js` | spins, MODEL | core analysis, follow-up | session-stats |
| `pred-dashboard.js` | spins, cache key | invisible layer, hot/cold cache, pickery | ai-engine, session-stats |
| `ai-prediction.js` | flow + dashboard | `computeAIPrediction` | pred-flow, pred-dashboard |
| `strategy-engine.js` | confidence, risk, timing | SAFE/MEDIUM/AGGRESSIVE | pred-dashboard, inline risk |
| `pressure-engine.js` | sector intel, clusters | wheel pressure DOM | wheel-sector-intel |
| `visual-heat-engine.js` | visual core, pressure | heatmap DOM | pressure-engine, hot/cold |
| `telemetry-engine.js` | všetky engine pulzy | telemetry DOM | strategy, engine-hub |
| `engine-hub.js` | telemetry signals | DEBUG hub tabs | telemetry-engine, inline |
| `spin-pattern-observer.js` | spins, helpers | PO panel, tucty/stĺpce | state, helpers, V2 `kbFlowBoxHTML` |
| `bah-engine.js` | behavior state | alerts hub | session-stats |
| `session-stats.js` | spins | clusters, entropy, pattern | state |
| `roulette-analytics.js` | spins | observer UI, pressure read | helpers, pressure-engine |
| `timing-engine.js` | spinTimes | timing panel | state |
| `ui-alerts.js` | behavior state | alerts DOM | bah-engine |
| `session-fatigue.js` | spins, aiState | fatigue panel | state, pred cache |
| `keyboard-live-ai-flow.js` | spins, gate | kb flow panel | confidence-engine, inline |
| `board-*` | clicks | board DOM | state, helpers |
| `app-boot.js` | DOM ready | init, EventBus | board, wheel, inline bindUi |

---

## Test bundle (audit)

`_test_v4_audit.cjs` a `_test_v4_wheel_deep.cjs` skladajú syntax bundle z:

1. V2 inline (`v2-inline-extract.cjs`)
2. **Rovnakých 32 modulov** ako produkčné `<script src>` (bez `_legacy/`)

Zoznam = poradie v `scripts/tests/_test_v4_audit.cjs` (`EXTERNAL_JS`) a `_test_v4_master.cjs` (`MODULES`).

Boot autorita v testoch = **`scripts/bootstrap/app-boot.js`**, nie archivovaný `app-init.js`.
