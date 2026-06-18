# Metriky úspešnosti — Balík 8.4A + 8.4B

**Stav:** 8.4A implementované (undo fix) · **8.4B implementované** (Engine Hub zlúčenie).  
**Bez** zmeny TRUE VALID scoringu, gate, `computeStrategyEngine`, wheel, Pattern Observer.

---

## 1. Oprava undo (`successfulPredictions`) — 8.4A

### Problém (potvrdený)

`onUndoSpin` dekrementoval `successfulPredictions` len ak `removed === prevPred.number` z `predictionHistory`.
Hit sa ale počíta v `pipelineScorePreviousSpin` ako **cluster/sektor** (`lastSpinScoreMetrics.hitCluster`).

### Oprava

Undo reverzuje `successfulPredictions` cez `lastSpinScoreMetrics.hitCluster`.
Po undo sa volá `invalidateStrategyCache()`.

---

## 2. Engine Hub — zlúčenie duplicít (8.4B)

### Pred zlúčením (8.4A)

| Položka | Modul TELEMETRY / SAMOUCENIE AI | Vzorec |
|---------|--------------------------------|--------|
| Index spoľahlivosti predikcie | TELEMETRY | `getClusterSuccessRatePct()` |
| Sledovanie úspechu patternov | SAMOUCENIE AI | `getClusterSuccessRatePct()` |
| Vyváženie úspech/neúspech | SAMOUCENIE AI | `getClusterSuccessRatePct()` |

### Po zlúčení (8.4B)

| Akcia | Položka | Modul | Zobrazenie |
|-------|---------|-------|------------|
| **Zostáva** | **História cluster hitov** | SAMOUCENIE AI (`learn`) | Engine Hub → tab 🤖 SAMOUCENIE AI |
| **Odstránené** | Vyváženie úspech/neúspech | SAMOUCENIE AI | — |
| **Nahradené** | Rezervované · slot metriky (`—`, bez výpočtu) | TELEMETRY | Engine Hub → tab 📊 TELEMETRY (miesto Index spoľahlivosti) |

**Autoritatívny vzorec (jediný v Engine Hub):**

```
getClusterSuccessRatePct() = successfulPredictions / totalPredictions × 100  (default 50)
```

**Zdroj dát:** `pipelineScorePreviousSpin` → cluster/sektor hit (interná stratégia, **nie** TRUE VALID COLUMN_ONLY).

**Nezmenené mimo Engine Hub:**

- `computeStrategyEngine().successRate` — panel `#memory` (DEBUG)
- TRUE VALID `column.hitRatePct` — `#validTruePanel`
- Gate `computeConfidenceEngine()` / `readOfficialPlayGate()`

---

## 3. Audit `legacyCombined` (TRUE VALID)

| Otázka | Odpoveď |
|--------|---------|
| Kde sa počíta? | `readLegacyCombinedHit()` → `lastSpinScoreMetrics.hitCluster` |
| Runtime referencie | **Len** `scripts/valid-true/valid-true-v0.js` |
| Rozhodovanie? | **Nie** — len report + export |
| Duplicita? | **Áno** — numericky = cluster hit |
| Odstránenie? | Možné neskôr; nič iné na to nezávisí |

---

## Tabuľka metrík

| Metrika | Autorita | Používa sa | Duplicitná | Akcia |
|---------|----------|------------|------------|-------|
| TRUE VALID Column hit (PLAY) | ValidTrueV0 / COLUMN_ONLY | `#validTruePanel`, export | Nie (oficiálna) | Ponechať |
| successRate / História úspechov | `computeStrategyEngine` | Stratégia, `#memory` | Interná | Ponechať |
| **História cluster hitov** | `getClusterSuccessRatePct()` | Engine Hub SAMOUCENIE AI | **Jediná v Hub** | **8.4B autorita Hub** |
| successfulPredictions | `pipelineScorePreviousSpin` | Counters, strategy | Zdroj cluster % | Undo opravené 8.4A |
| performanceEngine.accuracy | `predictionArchive` | `#performancePanel` | = cluster hit | DEBUG |
| memorySuccess | `adaptiveLearning` | `#adaptiveLearning` | Vlastný counter | Interná |
| legacyCombined | cluster snapshot | TRUE VALID report | Áno | Neskôr odstrániť |

### A) Oficiálne

- TRUE VALID Column hit pri `PLAY` (`outcome.column` vs baseline 12/37).

### B) Interné

- `successRate`, `successfulPredictions`, `memorySuccess`, archive accuracy.

### C) Legacy / diagnostické

- `legacyCombined`, Engine Hub rezervovaný slot v TELEMETRY.

---

## Overenie 8.4B (nedotknuté)

| Oblasť | Stav |
|--------|------|
| TRUE VALID scoring / export / COLUMN_ONLY | **Nedotknuté** |
| `computeStrategyEngine().successRate` | **Nedotknuté** |
| `computeConfidenceEngine()` / gate | **Nedotknuté** |
| Wheel / Pattern Observer | **Nedotknuté** |
