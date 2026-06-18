# Architektúra — KVANTOVÁ RULETA PRO V2

**Stav:** Balík **10J** — architektúra **uzatvorená** (po 10H-6 + finálny audit 10I).  
**Zdroj pravdy:** `index-NOVY-V2.html` → `npm run sync-v2` → `index.html` → Electron.  
**Uzatvorenie:** pozri **`ARCHITECTURE-CLOSURE-10J.md`**

---

## Pipeline build / runtime

```
index-NOVY-V2.html  →  sync-v2.cjs  →  index.html  →  main.js / RULETA.exe
```

Produkcia načítava **32 externých modulov** (`<script src>`) + inline JS v HTML.

---

## CURRENT RUNTIME AUTHORITIES

Jediný zdroj pravdy pre rozhodnutia „kde žije logika“ (Balík 10C). **Nemení** gate / TRUE VALID / wheel algoritmus.

| Oblasť | Autorita (produkcia) | Súbor / umiestnenie |
|--------|----------------------|---------------------|
| **Gate (PLAY)** | `computeConfidenceEngine()`, `readOfficialPlayGate()` | `scripts/ai/confidence-engine.js` |
| **TRUE VALID** | `ValidTrueV0.*` (COLUMN_ONLY) | `scripts/valid-true/valid-true-v0.js` |
| **Wheel — brain / scanner** | `computeQuantumWheelBrain()`, `computeQwFlowScanner()`, stav, `invalidateQuantumWheelBrainCache()` | **`scripts/wheel/wheel-brain.js`** — **EXTERNAL MODULE** (10F2) |
| **Wheel — canvas** | `renderCanvasWheel()`, `drawQw*`, `qwSyncWheelStageSize`, animácia, SVG overlay | **`scripts/wheel/wheel-canvas.js`** — **EXTERNAL MODULE** (10F3) |
| **Wheel — flow helpery** | `qwAnalyzeWheelFlow`, `qwFlowStateSimple`, `qwChaosSession`, … | `scripts/wheel/quantum-wheel.js` |
| **Wheel — layout sync** | `qwSyncWheelStageSize`, `qwBindWheelResize` | **`wheel-canvas.js`** (10F3; predtým V2 inline 10F1) |
| **Wheel — sector intel** | `computeWheelSectorIntel()`, `getSectorAnalysis()`, `invalidateWheelSectorIntelCache()` | **`scripts/wheel/wheel-sector-intel.js`** — **EXTERNAL MODULE** (10H-4B) |
| **Wheel — HUD presentation** | `ensureQuantumWheelDashboardDOM`, `qwResolveHudCopy`, `qwColorState`, `skQw`/`skWheelUserText`, `qwMetric*`/`qwHeroMetric`, trail/live HTML, flow display helpery | **`scripts/wheel/wheel-hud.js`** — **EXTERNAL MODULE** (10F + **10H-4A**) |
| **Wheel — HUD render** | `renderWheelRadar()`, `buildQuantumWheel*HTML`, `qwHudShort` | **`scripts/wheel/wheel-hud.js`** (10F) |
| **Wheel — schedule** | `scheduleWheelRender`, `flushWheelRender`, `qwEnsureBoardOutsideWheel` | **V2 inline** (`renderLight` / `renderHeavy`) |
| **Pattern Observer** | `computeSpinPatternObserver()`, `renderSpinPatternObserver()`, `renderTuctyStlpceTip()`, `tsModule*` | **`scripts/pattern/spin-pattern-observer.js`** — **EXTERNAL MODULE** |
| **Keyboard Flow** | `renderKeyboardLiveAIFlow()`, `computeKeyboardLiveAIFlow()` | **`scripts/ui/keyboard-live-ai-flow.js`** — **EXTERNAL MODULE** |
| **Session Fatigue** | `computeSessionFatigueAnalysis()`, `renderSessionFatigue()`, hooky `sessionFatigue*` | **`scripts/ui/session-fatigue.js`** — **EXTERNAL MODULE** |
| **Bootstrap** | `bootApp()`, `initBoard`, `initWheel`, `initAI`, `bindSpinEventBusListeners`, `qwSeedStrongFlowDemo` | **`scripts/bootstrap/app-boot.js`** — **EXTERNAL MODULE**; `loadSessionIDB`, `bindUi`, `DOMContentLoaded` hook vo V2 |
| **Engine Hub (DEBUG)** | `ENGINE_CATALOG`, `renderEngineHub()`, `getClusterSuccessRatePct()` | **`scripts/debug/engine-hub.js`** — **EXTERNAL MODULE** (10G) |
| **Strategy Engine** | `computeStrategyEngine()`, `invalidateStrategyCache()`, `renderStrategy()`, `renderAccuracy()`, `skStrategyMode()` | **`scripts/strategy/strategy-engine.js`** — **EXTERNAL MODULE** (10H-5) |
| **Pressure Engine** | `computeWheelPressureEngine()`, `invalidateWheelPressureCache()`, `renderPressure()` | **`scripts/analytics/pressure-engine.js`** — **EXTERNAL MODULE** (10H-6) |
| **Visual Heat Engine** | `computeVisualHeatEngine()`, `invalidateVisualHeatCache()`, `renderHeatmap()` | **`scripts/analytics/visual-heat-engine.js`** — **EXTERNAL MODULE** (10H-6) |
| **Telemetry Engine** | `collectEngineTelemetrySignals()`, `computeTelemetryEngine()`, `renderTelemetry()`, helpery | **`scripts/analytics/telemetry-engine.js`** — **EXTERNAL MODULE** (10H-6) |
| **DEBUG shell** | `renderEngineAdvancedPanels`, `engineAdvancedOpen`, `#engineAdvancedPanel` | **V2 inline** |
| **Render orchestrátor** | `onNewSpin`, `onEvent(EVENT.RENDER)`, `renderLight`, `renderHeavy` | **V2 inline** |

---

## Runtime autority (prehľad)

| Oblasť | Autorita | Súbor / umiestnenie |
|--------|----------|---------------------|
| **Gate (PLAY)** | `computeConfidenceEngine()`, `readOfficialPlayGate()` | `scripts/ai/confidence-engine.js` |
| **TRUE VALID** | `ValidTrueV0.*`, COLUMN_ONLY scoring | `scripts/valid-true/valid-true-v0.js` |
| **Pattern Observer** | `computeSpinPatternObserver()`, `renderSpinPatternObserver()`, `renderTuctyStlpceTip()` | **`scripts/pattern/spin-pattern-observer.js`** — **EXTERNAL MODULE** → `#spinPatternSection`, `#tuctyStlpceTipStrip` |
| **Keyboard Flow** | `renderKeyboardLiveAIFlow()`, `computeKeyboardLiveAIFlow()` | **`scripts/ui/keyboard-live-ai-flow.js`** — **EXTERNAL MODULE** → `#kbLiveFlowPanel` |
| **Session Fatigue** | `computeSessionFatigueAnalysis()`, `renderSessionFatigue()` | **`scripts/ui/session-fatigue.js`** — **EXTERNAL MODULE** → `#sessionFatiguePanel` |
| **Wheel HUD** | Pozri CURRENT RUNTIME AUTHORITIES | **`wheel-sector-intel.js`** + **`wheel-brain.js`** + **`wheel-canvas.js`** + **`wheel-hud.js`** + **`quantum-wheel.js`** + **V2 inline** (schedule, flow engine, scoring) |
| **Bootstrap** | `bootApp()`, `bindSpinEventBusListeners()`, IDB session | **`scripts/bootstrap/app-boot.js`** — **EXTERNAL MODULE** (10D) |
| **Engine Hub** | Pozri CURRENT RUNTIME AUTHORITIES | **`scripts/debug/engine-hub.js`** (10G) + V2 DEBUG shell |
| **Pred flow (70/20/10)** | `predCoreBehaviorEngine`, `computeFollowUpFlowEngine`, `computeCoreAnalysis`, `MODEL` | **`scripts/ai/pred-flow-engine.js`** (10H-1) |
| **AI dashboard / cache** | `invalidatePredCache`, `computeHotColdEngine`, `computeInvisibleEngines`, dashboard pickery | **`scripts/ai/pred-dashboard.js`** (10H-2) |
| **BAH / alert hub** | `computeBehaviorAlerts`, `computeAlertHub`, `bahResetSession` | **`scripts/analytics/bah-engine.js`** (10H-3) |
| **Session stats** | `entropy`, `getClusters`, `updateStats`, `computePatternEngine` | **`scripts/analytics/session-stats.js`** (10H-3) |
| **Scoring pipeline** | `pipelineScorePreviousSpin`, counters, adaptive learning | **V2 inline** |
| **Stratégia (režim)** | `computeStrategyEngine()`, `renderStrategy()` | **`scripts/strategy/strategy-engine.js`** (10H-5) |
| **Board / klávesnica** | `renderBoard`, `renderKeyboard`, `board-events` | `scripts/board/*` |
| **AI predikcia panel** | `computeAIPrediction`, `buildAIPredictionPanelHTML` | `ai-prediction.js`, `ai-engine.js` + inline |
| **Timing** | `computeTimingEngine`, `renderTimingPanel` | `scripts/analytics/timing-engine.js` |
| **Alerts** | `renderAlerts`, `renderAlertSystem` | `scripts/ui/ui-alerts.js` |
| **Globálny stav** | `spins`, `sessionState`, konštanty | `state.js`, `constants.js`, `helpers.js` |

---

## Legacy moduly (archív)

Presunuté do `scripts/_legacy/` — **nie sú `<script src>` v produkcii**:

| Archív | Pôvodná cesta | Produkcia (po 9B/9C/9F) |
|--------|---------------|-------------------------|
| `scripts/_legacy/pattern/spin-pattern-observer.js` | starý `scripts/pattern/` | **`scripts/pattern/spin-pattern-observer.js`** |
| `scripts/_legacy/bootstrap/app-init.js` | `scripts/bootstrap/app-boot.js` | **Produkcia:** `app-boot.js` (10D) |
| `scripts/_legacy/ui/ui-panels.js` | `scripts/ui/` | **`scripts/ui/keyboard-live-ai-flow.js`** |

Detail: `scripts/_legacy/README.md`.

---

## Render pipeline

### Spin → DOM

```
onNewSpin(number)
  → pipelineScorePreviousSpin / ValidTrueV0.onSpinScored
  → emitEvent(EVENT.RENDER)
  → scheduleRender() / requestAnimationFrame
  → renderLight(opts)     [každý spin]
  → renderHeavy()         [každý HEAVY_RENDER_INTERVAL spin, default 5]
```

### `renderLight()` — hlavný layout

Volá mimo iného: board, stats, timing, core prediction, alerts, **keyboard flow** (external), **session fatigue** (external), **TRUE VALID panel**, wheel schedule, engine advanced (ak otvorené), **tucty/stĺpce tip** (external PO).

### `renderHeavy()` — ťažšie panely

Volá: hot/cold, **wheel radar**, **pattern observer** (external), engine advanced panels.

### EventBus

Balík 2A: render **iba** cez `EVENT.RENDER` → `renderLight`/`renderHeavy`. Žiadne duplicitné `spin:add` render listenery v `bindSpinEventBusListeners` (telo prázdne, len `_done` flag).

---

## Gate pipeline

```
spins, spinTimes, adaptiveWeights, chaos …
  → computeRiskChaosCore()          [V2 inline]
  → computeConfidenceEngine()       [confidence-engine.js]
  → readOfficialPlayGate()          [confidence-engine.js — jediný reader]
  → UI: masterAIState, tucty/stĺpce tip, keyboard flow banner
```

Gate **nerozhoduje** TRUE VALID COLUMN_ONLY — paralelné systémy.

---

## TRUE VALID pipeline

```
onNewSpin → pipelineScorePreviousSpin
  → ValidTrueV0.onSpinScored(number)   [valid-true-v0.js]
undo      → ValidTrueV0.onUndoSpin + renderPanel

renderLight → ValidTrueV0.renderPanel()  [#validTruePanel]

Export: COLUMN_ONLY hit rate (oficiálna metrika)
Diagnostika: legacyCombined (= cluster hit snapshot, nie gate)
```

Detail metrík: `scripts/METRICS-SUCCESS-8.4A.md`.

---

## Externé moduly načítané V2 (32)

Poradie = produkčný `<script src>` vo V2 (pred inline blokom + druhý blok):

```
scripts/core/constants.js
scripts/core/event-bus.js
scripts/core/state.js
scripts/core/helpers.js
scripts/wheel/quantum-wheel.js
scripts/wheel/wheel-canvas.js
scripts/ai/ai-engine.js
scripts/ai/confidence-engine.js
scripts/valid-true/valid-true-v0.js
scripts/ai/lfp-engine.js
scripts/ai/pred-flow-engine.js
scripts/ai/pred-dashboard.js
scripts/wheel/wheel-sector-intel.js
scripts/wheel/wheel-brain.js
scripts/ai/ai-prediction.js
scripts/strategy/strategy-engine.js
scripts/analytics/pressure-engine.js
scripts/analytics/visual-heat-engine.js
scripts/analytics/telemetry-engine.js
scripts/debug/engine-hub.js
scripts/pattern/spin-pattern-observer.js
scripts/analytics/bah-engine.js
scripts/analytics/session-stats.js
scripts/analytics/roulette-analytics.js
scripts/wheel/wheel-hud.js
scripts/ui/ui-alerts.js
scripts/analytics/timing-engine.js
scripts/board/board-events.js
scripts/board/board-ui.js
scripts/ui/session-fatigue.js
scripts/ui/keyboard-live-ai-flow.js
scripts/bootstrap/app-boot.js
```

**Modularizácia:** ~**80,3 %** bytes (moduly / moduly + inline JS). **Inline:** ~**131 KB**, 2 827 riadkov.

---

## História extrakcie (uzavreté — 10J)

| Fáza | Modul | Stav |
|------|-------|------|
| **9B–9F** | Session Fatigue, Keyboard Flow, Pattern Observer | **Hotové** |
| **10D** | Bootstrap → `app-boot.js` | **Hotové** |
| **10F / 10H-4A–4B** | Wheel HUD, brain, canvas, sector intel | **Hotové** |
| **10G** | Engine Hub | **Hotové** |
| **10H-1–3** | Pred Flow, pred-dashboard, BAH, session-stats | **Hotové** |
| **10H-5** | Strategy Engine | **Hotové** |
| **10H-6** | Pressure, Visual Heat, Telemetry | **Hotové** |
| **10I** | Finálny health audit | **Hotové** (audit only) |
| **10J** | Architektúrne uzatvorenie | **Hotové** (docs only) |

**Ďalšia extrakcia monolitu** — iba po **novom audite** (pozri `ARCHITECTURE-CLOSURE-10J.md` → NESMIE refaktorovať).

**Bez zmeny bez auditu:** gate logika, TRUE VALID scoring, wheel algoritmus, spin pipeline, HOT/COLD, Risk/Chaos core.

---

## Súvisiace dokumenty

- `ARCHITECTURE-CLOSURE-10J.md` — **uzatvorenie architektúry**, roadmap, zákazy refaktoru
- `DEPENDENCY-MAP.md` — vstupy/výstupy modulov + CURRENT RUNTIME AUTHORITIES
- `PROJECT-HEALTH-REPORT.md` — zdravotný stav (10I/10J)
- `scripts/METRICS-SUCCESS-8.4A.md` — metriky úspechu
- `scripts/_legacy/README.md` — archivované súbory
