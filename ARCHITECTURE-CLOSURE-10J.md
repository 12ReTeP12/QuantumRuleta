# Architektúrne uzatvorenie — Balík 10J

**Dátum:** 2026-06-03  
**Rozsah:** dokumentácia iba — **žiadny refaktor, žiadna extrakcia kódu**  
**Referencia:** finálny health audit **10I** (`scripts/tests/reports/audit-10i-health-final.json`)

---

## Stav projektu po balíkoch 1 → 10I

| Metrika | Hodnota |
|---------|--------|
| **Zdroj pravdy** | `index-NOVY-V2.html` (jediný HTML autorita) |
| **Pipeline** | V2 → `npm run sync-v2` → `index.html` → Electron / `RULETA.exe` |
| **Produkčné moduly** | **32** (`<script src>`) |
| **Legacy moduly (archív)** | **3** (`scripts/_legacy/`, neprodukčné) |
| **Veľkosť V2 HTML** | **~173 KB** (3 275 riadkov) |
| **Inline JS** | **~131 KB** (2 827 riadkov, 247 funkcií) |
| **Externé moduly spolu** | **~534 KB** |
| **Modularizácia** | **~80,3 %** (bytes) |
| **Technický dlh (inline)** | **~19,7 %** — zámerne v orchestrátore |

**Architektúra je uzatvorená.** Ďalšie zmeny kódu = produktové funkcie alebo **nový audit** pred akoukoľvek refaktorizačnou extrakciou.

---

## História refaktoru 1 → 10I

### Pipeline a pravidlá
- Jediný HTML zdroj: **`index-NOVY-V2.html`**
- Sync: **`scripts/sync-v2.cjs`** → `index.html`
- Zakázané: V1/V4 HTML, ručná úprava `index.html`, paralelné sync skripty

### Modularizácia (kumulatívne)
| Balík | Modul / oblasť |
|-------|----------------|
| **9B** | Session Fatigue → `session-fatigue.js` |
| **9C** | Keyboard Live AI Flow → `keyboard-live-ai-flow.js` |
| **9F** | Pattern Observer → `spin-pattern-observer.js` |
| **10D** | Bootstrap → `app-boot.js` |
| **10F / 10H-4A** | Wheel HUD → `wheel-hud.js` (render + presentation) |
| **10F2** | Wheel Brain → `wheel-brain.js` |
| **10F3** | Wheel Canvas → `wheel-canvas.js` |
| **10G** | Engine Hub → `engine-hub.js` |
| **10H-1** | Pred Flow → `pred-flow-engine.js` |
| **10H-2** | Pred Dashboard → `pred-dashboard.js` |
| **10H-3** | BAH + session stats → `bah-engine.js`, `session-stats.js` |
| **10H-4B** | Wheel Sector Intel → `wheel-sector-intel.js` |
| **10H-5** | Strategy Engine → `strategy-engine.js` |
| **10H-6** | Diagnostic Engines → `pressure-engine.js`, `visual-heat-engine.js`, `telemetry-engine.js` |
| **10I** | Finálny health audit — **bez ďalšej extrakcie** |

### Render a stabilita
- **2A:** jedna hlavná render cesta (`onNewSpin` → `EVENT.RENDER` → `renderLight` / `renderHeavy`)
- **Master test:** `npm run test:v2:master` — 0 chýb po 10H-6
- **Disk audit:** PASS (WARN: duplicitný Electron DEV+PLAYER)

---

## Konečný stav architektúry

### V2 ako jediná autorita
- **`index-NOVY-V2.html`** — jediný HTML zdroj pravdy
- **`index.html`** — generovaný cez `npm run sync-v2`; **neprepisovať ručne**
- Electron / `RULETA.exe` načítavajú syncnutý `index.html`

### 32 produkčných modulov
Všetky cez `<script src>` vo V2 — zoznam v `ARCHITECTURE.md` → **Produkčné moduly (32)**.

### 3 legacy moduly (archív)
| Súbor | Umiestnenie |
|-------|-------------|
| pattern observer (starý) | `scripts/_legacy/pattern/` |
| bootstrap (starý) | `scripts/_legacy/bootstrap/` |
| UI panel (starý) | `scripts/_legacy/ui/` |

**Neprodukčné** — nie sú v `<script src>` vo V2.

### Wheel stack — uzavretý (10H-4)
| Vrstva | Modul / umiestnenie |
|--------|---------------------|
| Flow helpery | `scripts/wheel/quantum-wheel.js` |
| Brain / scanner | `scripts/wheel/wheel-brain.js` (10F2) |
| Canvas / animácia | `scripts/wheel/wheel-canvas.js` (10F3) |
| Sector intel | `scripts/wheel/wheel-sector-intel.js` (10H-4B) |
| HUD render + copy | `scripts/wheel/wheel-hud.js` (10F + 10H-4A) |
| Flow engine + schedule | **V2 inline** (`computeWheelFlowEngine`, `scheduleWheelRender`) |

**Uzavreté** — ďalšia extrakcia wheel stacku bez nového auditu **zakázaná**.

### Strategy Engine — uzavretý (10H-5)
- **`scripts/strategy/strategy-engine.js`** — `computeStrategyEngine`, `renderStrategy`, `renderAccuracy`, cache
- Cache invalidácia viazaná na `invalidatePredCache` v `pred-dashboard.js`
- **Uzavreté** — scoring a gate logika sa nemení

### Diagnostic Engines — uzavreté (10H-6)
| Modul | Panel / úloha |
|-------|----------------|
| `scripts/analytics/pressure-engine.js` | `#pressure` |
| `scripts/analytics/visual-heat-engine.js` | `#heatmap` |
| `scripts/analytics/telemetry-engine.js` | `#telemetry` |

Načítané pred `engine-hub.js`; Engine Hub ich agreguje v DEBUG režime. **Uzavreté.**

---

## Zostávajúce inline jadro (V2)

Tieto časti **nie sú chybou** — sú orchestrátor a kritické väzby:

| Oblasť | Prečo inline |
|--------|----------------|
| **`onNewSpin` / `onUndoSpin`** | Side-effect chain (~20+ krokov); poradie je produkčná autorita |
| **`renderLight` / `renderHeavy`** | Render hub volajúci všetky moduly |
| **`renderEngineAdvancedPanels`** | DEBUG shell (HTML + otvorenie panelov) |
| **`pipelineScorePreviousSpin`** | Scoring counters, TRUE VALID hook, adaptive learning |
| **`computeRiskChaosEngine`** (facade) | Cache + AI komentár + render; core v `ai-engine.js` |
| **`computeWheelFlowEngine`** | Wheel flow engine (stack uzavretý 10H-4) |
| **`computeVisualCore` / spin core** | Piliere 70·20·10, tesne viazané na pipeline |
| **HOT/COLD helpers** | `hotColdForWindow`, `renderHotCold`, `hcBuildFromSpins` (engine v ai-engine + pred-dashboard) |
| **`bindUi`, IDB session** | Boot hooky, DOM wiring |
| **`kbFlowBoxHTML`** | Cross-modul helper pre PO / keyboard strip |
| **`skUiLabel` a i18n** | Globálne SK mapovanie pre celú app |

**Spin Pipeline sekcia** (~1 495 riadkov HTML): event bus, session engines, persistence, memory, scoring — **jadro runtime**.

---

## Čo sa NESMIE refaktorovať bez nového auditu

Bez výslovného **nového balíka + audit + test plán** nezasahovať do:

| # | Oblasť | Dôvod |
|---|--------|--------|
| 1 | **Gate** (`confidence-engine.js`, `readOfficialPlayGate`) | PLAY rozhodnutie |
| 2 | **TRUE VALID** (`valid-true-v0.js`, COLUMN_ONLY scoring) | Oficiálna metrika |
| 3 | **Wheel algoritmus** (brain, sector intel, canvas, HUD) | Stack uzavretý 10H-4 |
| 4 | **`onNewSpin` / Spin Pipeline** | Najvyššie previazaný orchestrátor |
| 5 | **`computeRiskChaosCore`** (ai-engine) | Gate vstup |
| 6 | **HOT/COLD doména** (ai-engine + pred-dashboard + inline) | Fragmentovaná, ale stabilná |
| 7 | **Script load order** (blok pred inline) | Runtime závislosti medzi modulmi |
| 8 | **`index.html` ručne** | Vždy cez `sync-v2` z V2 |

Povolené bez auditu: **produktové funkcie**, UX, nové panely (volajú existujúce API), TRUE VALID **reporting** (nie scoring), dokumentácia.

---

## Aktuálne runtime autority (24 domén)

| Doména | Autorita |
|--------|----------|
| Gate | `scripts/ai/confidence-engine.js` |
| TRUE VALID | `scripts/valid-true/valid-true-v0.js` |
| Wheel brain | `scripts/wheel/wheel-brain.js` |
| Wheel canvas | `scripts/wheel/wheel-canvas.js` |
| Wheel sector intel | `scripts/wheel/wheel-sector-intel.js` |
| Wheel HUD | `scripts/wheel/wheel-hud.js` |
| Wheel flow helpery | `scripts/wheel/quantum-wheel.js` |
| Wheel flow engine | **V2 inline** (`computeWheelFlowEngine`) |
| Pattern Observer | `scripts/pattern/spin-pattern-observer.js` |
| Keyboard Flow | `scripts/ui/keyboard-live-ai-flow.js` |
| Session Fatigue | `scripts/ui/session-fatigue.js` |
| Bootstrap | `scripts/bootstrap/app-boot.js` |
| Pred Flow | `scripts/ai/pred-flow-engine.js` |
| Pred Dashboard | `scripts/ai/pred-dashboard.js` |
| AI prediction | `scripts/ai/ai-prediction.js` + `ai-engine.js` |
| Strategy | `scripts/strategy/strategy-engine.js` |
| Pressure | `scripts/analytics/pressure-engine.js` |
| Visual Heat | `scripts/analytics/visual-heat-engine.js` |
| Telemetry | `scripts/analytics/telemetry-engine.js` |
| Engine Hub | `scripts/debug/engine-hub.js` |
| Risk core | `scripts/ai/ai-engine.js` (`computeRiskChaosCore`) |
| Risk facade | **V2 inline** (`computeRiskChaosEngine`) |
| Spin orchestrátor | **V2 inline** (`onNewSpin`, scoring) |
| Render orchestrátor | **V2 inline** (`renderLight`, `renderHeavy`) |

Detail: `ARCHITECTURE.md` → CURRENT RUNTIME AUTHORITIES.

---

## Konečný stav modularizácie

```
┌─────────────────────────────────────────────────────────┐
│  index-NOVY-V2.html (173 KB)                            │
│  ├─ 32 × <script src>  (~534 KB, 80.3 %)               │
│  └─ inline JS          (~131 KB, 19.7 %)               │
│       orchestrátor · scoring · gate väzby · DEBUG     │
└─────────────────────────────────────────────────────────┘
         │ sync-v2
         ▼
    index.html → Electron / RULETA.exe
```

**Legacy (3):** `scripts/_legacy/pattern/`, `bootstrap/`, `ui/` — archív, nie produkcia.

---

## POST-ARCHITECTURE ROADMAP

### A) Produktové funkcie
- Rozšírenie AI predikčného výstupu (copy, vysvetlenie tipu) — volať `computeAIPrediction()`, nemení scoring
- Export relácie / histórie (JSON, CSV) — cez existujúce stavy `spins`, ValidTrueV0 export
- Session profily (ultra / pro / debug) — prepínač viditeľnosti panelov, nie engine logika
- Notifikácie pri gate zmene (HRAŤ ↔ ČAKAJ) — consumer `readOfficialPlayGate()`

### B) UX / UI
- V6 layout polish (typografia, spacing, dark mode konzistencia)
- Mobil / tablet breakpoint pre board + wheel
- Accessibility (ARIA, klávesové skratky dokumentované v UI)
- Zjednodušený „hráčsky“ dashboard — skrytie DEBUG panelov defaultne

### C) TRUE VALID
- Rozšírený panel (trend, segmentácia COLUMN_ONLY) — **bez zmeny** `onSpinScored` scoringu
- Export metrik pre dlhodobú analýzu
- Vizualizácia hit rate v čase (graf v paneli, nie nový algoritmus)

### D) Hráčsky režim
- Režim „jedna obrazovka“ — board + tip + gate badge
- Zjednodušený jazyk (menej engine terminológie)
- Voliteľné skrytie `#engineAdvancedPanel` a telemetrie
- Tutorial / onboarding prvých 12 spinov (WARMUP copy)

### E) Budúce experimenty (iba po novom audite)
- Spin orchestrátor modul (bývalý 10I implementácia) — **vysoké riziko**
- HOT/COLD konsolidácia do jedného modulu
- Risk/Chaos facade extrakcia (core zostáva v ai-engine)
- Module bundler / ES modules migrácia — **architektonická zmena**, nie priorita

---

## Odporúčania pre budúci vývoj

1. **V2 only** — každá zmena do `index-NOVY-V2.html`, potom `npm run sync-v2`.
2. **Test pred merge** — `npm run test:v2:master` minimálne; pri dotyku wheel/gate aj wheel deep test.
3. **Nový modul** — len ak produktová funkcia; nie „ďalšia extrakcia monolitu“ bez auditu.
4. **Dokumentácia** — pri novej runtime autorite aktualizovať `ARCHITECTURE.md` + `DEPENDENCY-MAP.md`.
5. **Git** — commit po väčšej zmene; nie kopírovanie HTML verzií.

---

## Metriky uzatvorenia (10I / 10J)

| Metrika | Hodnota |
|---------|--------|
| **Modularizácia** | **~80,3 %** |
| **Technický dlh (inline)** | **~19,7 %** |
| **Veľkosť V2** | **172 511 B** (~173 KB, 3 275 riadkov) |
| **Počet produkčných modulov** | **32** |
| **Počet legacy modulov** | **3** |
| **Počet runtime autorít (domén)** | **24** |

---

## Potvrdenie uzatvorenia

| Tvrdenie | Odpoveď |
|----------|---------|
| **V2 jediná produkčná autorita** | **ÁNO** |
| **Architektúra uzatvorená** | **ÁNO** |
| **Produkcia stabilná** | **ÁNO** — `test:v2:master` 0 chýb, disk audit PASS |
| **Pripravené na produktový vývoj** | **ÁNO** — POST-ARCHITECTURE ROADMAP nižšie |

---

## Súvisiace dokumenty

- `ARCHITECTURE.md` — runtime autority, pipeline, zoznam 32 modulov
- `DEPENDENCY-MAP.md` — závislosti modulov
- `PROJECT-HEALTH-REPORT.md` — zdravotný stav po 10I/10J
- `scripts/tests/reports/audit-10i-health-final.json` — metriky 10I
- `scripts/_legacy/README.md` — archív

*Vygenerované: Balík 10J — architektúrne uzatvorenie.*
