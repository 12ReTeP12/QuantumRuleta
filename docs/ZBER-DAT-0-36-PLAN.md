# ZBER DÁT ČÍSEL 0–36 — audit a implementačný plán

**Dátum:** 2026-05-31  
**Stav:** audit + plán schválený ako špecifikácia (implementácia ešte nezačala)  
**Modul:** nahrádza „Hlboká analýzu relácií“ na `#peterViewSession`  
**Súbor logiky:** `scripts/analytics/zber-dat-0-36.js` (prefix `zdc`)

---

## 0. AUTORITATÍVNA ŠPECIFIKÁCIA (QuantumApp)

### Hlavný cieľ

**Dátový archivátor a analytik čísel — nie predikčný engine.**

| NIE (zakázané) | ÁNO (ciele) |
|----------------|-------------|
| AI predikcia | reálne spiny |
| HRAŤ / NEHRAŤ | čísla 0–36 |
| odporúčania na stávky | čo sa dialo **po** čísle |
| nové AI skóre | session + master report + Excel |

**Filozofia:** `SPIN → ČÍSLO → ČO SA DIALO PO ŇOM`

**Metafora:** digitálna kniha rulety — dokumentovať a vysvetliť **minulosť** reálnych spinov, **nie predpovedať** budúcnosť.

### Priorita projektu (presné poradie)

1. **Raw spiny** — vždy kompletné, v pôvodnom poradí, exportovateľné, kopírovateľné
2. **Čísla 0–36**
3. **Následnosti po číslach** (+ silné/slabé väzby)
4. **Session report**
5. **Master report** po 12 session
6. **Excel export**

### Session systém

- min. **120** spinov · viac ako 120 povolené (rozšírená session)
- max **12** session v pamäti · 13. → FIFO drop najstaršej
- pred dropom **povinná možnosť Excel exportu**
- cyklus: Session 1…12 → vyhodnotenie každej → **MASTER REPORT** = **13 vyhodnotení**

### Obmedzenia — nemení sa

AI predikcia · SPO · SBPO · Patterny · Wheel · HUD · Radar · Klávesnica · Live hra

### Stav dokumentácie pred implementáciou

| # | Deliverable | Sekcia v tomto dokumente | Stav |
|---|-------------|--------------------------|------|
| 1 | Audit existujúceho SA | §1 | ✓ hotovo |
| 2 | Návrh dátového modelu | §2 + **§12** | ✓ hotovo |
| 3 | Návrh Excel exportu | §4 + **§13** | ✓ hotovo |
| 4 | Návrh UI | §3 + **§14** | ✓ hotovo |
| 5 | Implementácia | §5 (8 fáz) | ⏳ čaká na „schválené“ |

**Implementácia:** po krokoch, po každom kroku ohlásenie výsledku + testy. Žiadny veľký zásah naraz.

---

## ČO JE CIEĽ (technicky)

Samostatný modul počúvajúci `EventBus spin:add` → vlastné pole spinov per session.

> **ČÍSLO → čo padlo po ňom** (pre každé 0–36, vrátane nuly ako následku)

---

## 1. AUDIT — existujúci Session Analyzer

### 1.1 Kde je v kóde

| Vrstva | Umiestnenie | Veľkosť |
|--------|-------------|---------|
| Navigácia | `#saOpenFromHistory` — „📊 Hlboká analýza relácií“ | 1 tlačidlo |
| HTML | `#peterViewSession` v `index-NOVY-V2.html` | ~40 riadkov |
| CSS | inline `.sa-*` v `<style>` | ~80 riadkov |
| JS | inline IIFE `SessionAnalyzerModule` | ~370 riadkov |
| Prepínanie karty | `showSession()` v `bindUi()` | volá `saRefreshUI()` |
| Vstup spinov | wrap `EventBus.emit` → `saOnSpin(n)` | 1 hook |

**Samostatný súbor:** nie — všetko inline v HTML.  
**Testy:** žiadne (`grep` v `scripts/tests` = 0 zhôd).  
**Persistence:** žiadna (refresh stránky = strata dát).

### 1.2 Čo modul dnes robí (presne)

```
spin:add → poleHistorieRelacie.push(n)
         → live UI (status, pás čipov, Hot/Cold mriežka)

Uzavrieť → analyzujUzavretuRelaciu():
           A) Magnety (trigger→target ≥75 %)
           B) Max streak (12 sektorov)
           C) Sleeper (podvýskyt <55 % očakávania, od 10 spinov)

Reboot → text do archívu, nová hra č. N+1
```

**Limity dnes:**
- uzavretie od **1** spinu
- auto-uzavretie pri **100** spinoch (`HARD_LIMIT=100`)
- archív **neobmedzený** (textové riadky)
- **žiadny** Excel, **žiadnych** 12 session, **žiadny** master report

### 1.3 Izolácia — SPLNENÁ ✓

| Systém | Dotknutý? |
|--------|-----------|
| `spins[]` hlavnej hry | Nie — vlastné `poleHistorieRelacie` |
| AI predikcia | Nie |
| SPO / SBPO | Nie |
| Wheel / HUD / radar | Nie |
| Klávesnica (logika klikov) | Nie — len počúva EventBus |

Jediné väzby mimo modul: `EventBus` wrap, `reds`, `getColor`, `getDozen`, `getColumn`, `BOARD_LAYOUT` (read-only).

### 1.4 Kritický rozdiel: nula

| | Starý modul | Nový ZDC |
|---|-------------|----------|
| Následný spin po čísle | Ak padne **0**, preskočí na ďalšie 1–36 (`saNasledujuceMakroCislo`) | **Bezprostredný** nasledujúci spin, **vrátane 0** |
| Stĺpec „nula po tomto čísle“ | neexistuje | **povinný** |

### 1.5 Gap analýza (požiadavka → stav)

| # | Požiadavka | Dnes | Akcia |
|---|------------|------|-------|
| 1 | Názov ZBER DÁT ČÍSEL 0–36 | Hlboká analýza relácií | premenovať UI |
| 2 | Min. 120 spinov / session | min 1 | `ZDC_MIN_SPINS=120` |
| 3 | Rozšírená session >120 | neexistuje | tier `extended` |
| 4 | <120 nie plnohodnotná | uzavrie sa kedykoľvek | blokovať uzavretie |
| 5 | Max 12 session v pamäti | ∞ archív | FIFO + localStorage |
| 6 | 13. session → drop najstaršej | neexistuje | FIFO + export upozornenie |
| 7 | 12 reportov + 1 master | neexistuje | nový agregátor |
| 8 | Tabuľka 0–36 (23 stĺpcov) | neexistuje | `zdcBuildTriggerTable` |
| 9 | Ľudské komentáre | technické magnety | `zdcWriteHumanText` |
| 10 | Session report (prehľad) | 3 algoritmy | `zdcBuildSessionReport` |
| 11 | Zvláštnosti (série, spáči…) | čiastočne streak/sleeper | rozšíriť detekciu |
| 12 | Excel archív | nie | `xlsx` export |
| 13 | Hlavná UI = tabuľka 0–36 | Hot/Cold mriežka | nový layout |
| 14 | Nie predikcia | OK | zachovať |
| 15 | Spoľahlivosť vzorky (confidence) | neexistuje | `zdcSampleConfidence` |
| 16 | Stabilita čísla medzi 12 session | neexistuje | `zdcCrossSessionStability` |
| 17 | TOP 5 anomálií / session | dlhý zoznam | `zdcTop5Anomalies` |
| 18 | Charakter session | neexistuje | `zdcSessionCharacter` |
| 19 | Porovnanie 12 session v masteri | neexistuje | `zdcSessionRanking` |
| 20 | Najzaujímavejšie čísla zberu | neexistuje | `zdcInterestingNumbers` |
| 21 | Návraty čísiel (priemer / min / max absencia) | neexistuje | `zdcBuildReturnStats` |
| 22 | TOP 10 zaujímavostí celého zberu (master) | neexistuje | `zdcTop10Highlights` |

### 1.6 Čo znovu použiť

- `saVlastnostiCisla(n)` → preklopiť na `zdcProps(n)`
- `saPocetVyskyty`, hot/cold prahy (4+/0–1)
- `saBezPrerusenia` → série v reporte
- EventBus hook (rovnaký vzor)
- Hot/Cold mriežka ako **doplnok** pod tabuľkou (voliteľné)
- CSS `.sa-*` rozšíriť o `.zdc-*`

### 1.7 Čo odstrániť

- `analyzujUzavretuRelaciu` (magnet/streak/sleeper ako hlavný výstup)
- `MAGNET_PRAH`, `HARD_LIMIT=100`
- `saNasledujuceMakroCislo` (preskakovanie nuly)
- Textový archív bez štruktúry

---

## 2. CIEĽOVÁ ARCHITEKTÚRA

### 2.1 Extrakcia do súboru

```
scripts/analytics/zber-dat-0-36.js   ← celá logika + render + export
```

V `index-NOVY-V2.html` ostane: HTML karty, CSS, `<script src="...">`, odstránenie inline SA.

**API prefix:** `zdc` (zber dát čísel)

### 2.2 Konštanty

```javascript
const ZDC_MIN_SPINS = 120;
const ZDC_MAX_SESSIONS = 12;
const ZDC_HOT_MIN = 4;      // hot v session
const ZDC_COLD_MAX = 1;     // cold v session
const ZDC_STORAGE_KEY = 'zdcStore_v1';
```

### 2.3 Dátový model

#### ZdcStore (globálny)

```javascript
{
  cycleId: 1,                    // ktorý cyklus 12 session
  sessionCounter: 0,             // celkový počítadlo session
  active: ZdcSession | null,     // práve zbierame
  closed: ZdcSession[],          // max 12, FIFO
  master: ZdcMasterReport | null // po uzavretí 12. v cykle
}
```

#### ZdcSession

```javascript
{
  id: string,                    // Session ID (UUID) — reprodukovateľnosť
  number: 1,                     // poradie v cykle 1..12
  spins: number[],               // RAW — kompletný zoznam, nikdy skrátený
  status: 'collecting' | 'closed',
  tier: null | 'standard' | 'extended',
  createdAt: string,             // ISO dátum vytvorenia session
  closedAt: string | null,       // ISO dátum ukončenia
  reportGeneratedAt: string | null, // ISO čas vygenerovania reportu
  spinCount: number,             // = spins.length
  sampleQuality: string | null,  // ľudský label kvality vzorky (po uzavretí)
  report: ZdcSessionReport | null
}
```

**Kvalita vzorky session** (`zdcSampleQualityLabel(spinCount)` — nie predikcia):

| Spinov | Label |
|--------|-------|
| 120–199 | dobrá vzorka |
| 200–349 | veľmi dobrá vzorka |
| ≥350 | vysoká kvalita dát |
| 120 presne (standard) | dobrá vzorka (plnohodnotná session) |

Zobraziť v status bare a session reporte vedľa počtu spinov.

#### ZdcTriggerRow — jeden riadok tabuľky (číslo N)

Mapovanie na stĺpce z požiadavky:

| Stĺpec UI | Pole |
|-----------|------|
| číslo | `number` |
| koľkokrát padlo | `hitCount` |
| koľkokrát malo následný spin | `followCount` |
| ktoré čísla padli po ňom | `nextNumbersText` (napr. „17×2, 0×1“) |
| najčastejšie nasledujúce | `topNext` |
| top 3 nasledujúce | `top3Next[]` |
| farba v % | `colorPctSummary` |
| červená / čierna / nula | `redPct`, `blackPct`, `zeroPct` |
| párne / nepárne v % | `evenPct`, `oddPct` |
| malé / veľké v % | `lowPct`, `highPct` |
| 1./2./3. tucet v % | `dozen1Pct`, `dozen2Pct`, `dozen3Pct` |
| 1./2./3. stĺpec v % | `col1Pct`, `col2Pct`, `col3Pct` |
| opakované následnosti | `repeatedFollows[]` |
| zvláštnosti | `anomalies[]` (interné; v UI len TOP 5 session) |
| ľudský komentár | `humanComment` |
| **spoľahlivosť vzorky** | `sampleConfidence` — `'nízka'` \| `'stredná'` \| `'vysoká'` |
| **pozorovaní (follow)** | `followCount` (duplicitne v UI pri % — vždy viditeľné) |
| **výskytov v session** | `hitCount` (duplicitne v UI pri % — vždy viditeľné) |
| **silné väzby** | `strongBonds[]` — vlastnosti/čísla nad prahom (napr. ≥55 % pri follow ≥5) |
| **slabé väzby** | `weakBonds[]` — vlastnosti/čísla pod prahom (napr. ≤15 %) |
| **takmer sa nevyskytovalo** | `rareAfter[]` — 0–5 % alebo 0× pri follow ≥3 |

**Výpočet follow:** pre každý index `i` kde `spins[i]===N` a existuje `spins[i+1]` → jeden follow. Posledný spin v session nemá follow.

**Percentá:** z `followCount` validných nasledovníkov (0 je platný nasledovník).

**Spoľahlivosť vzorky (nie predikcia):** informuje, či je `followCount` dostatočne veľký na interpretáciu percent.

```javascript
function zdcSampleConfidence(followCount) {
  if (followCount >= 30) return 'vysoká';
  if (followCount >= 10) return 'stredná';
  return 'nízka';
}
```

V UI pri každom čísle (a pri dominantných % v komentári) vždy trojica:
> Čierna = 80 % · Pozorovaní = 5 · Spoľahlivosť = nízka

Pri `followCount === 0`: percentá „—“ , spoľahlivosť „žiadna vzorka“.

#### ZdcReturnRow — návraty čísla v session (pre každé 0–36)

```javascript
{
  number: 8,
  hitCount: 4,              // koľkokrát padlo (0 = špeciálny prípad absencie)
  avgReturn: 28,            // priemerný interval medzi výskytmi (spiny)
  fastestReturn: 1,         // najkratšia medzera medzi dvoma výskytmi
  longestAbsence: 97,       // max spinov bez tohto čísla
  humanNote: string         // napr. „Priemerný návrat 28 spinov, najdlhšie chýbalo 97 spinov.“
}
```

**Výpočet `zdcBuildReturnStats(spins)`:**

- Zaznamenať indexy každého výskytu čísla N.
- **fastestReturn:** min(`idx[k+1] - idx[k]`) pre k≥0; ak len 1 výskyt → `null` / „—“
- **avgReturn:** priemer medzier; ak len 1 výskyt → „—“
- **longestAbsence:** max vzdialenosť medzi susednými výskytmi **a** od začiatku/konca session (prefix/suffix)
- Ak **hitCount === 0:** longestAbsence = `spins.length`, avg/fastest = „nepadol“

V tabuľke 0–36: stĺpce návratov alebo rozbaľovací detail riadku. V Exceli list `Session N Navraty`.

#### ZdcSessionReport

```javascript
{
  spinList: number[],
  spinCount: number,
  tier: 'standard' | 'extended',
  overview: {
    hotNumbers, coldNumbers,
    topNumbers, rareNumbers,
    colors, parity, size, dozens, columns,
    maxStreaks: [{ label, length }],
    repeats, shortReturns, patterns,
    deviations, repeatedThemes, unusual, missing,
    anomalies: string[]
  },
  triggerTable: ZdcTriggerRow[37],  // index 0..36
  returnTable: ZdcReturnRow[37],    // návraty per číslo
  top5Anomalies: string[],          // max 5, zoradené podľa „závažnosti“
  sessionCharacter: string,         // napr. „Trendová session“
  sessionCharacterDetail: string,   // 1–2 vety ľudskou rečou
  humanSummary: string              // hlavný ľudský záver session
}
```

#### ZdcMasterReport (po 12 session)

```javascript
{
  sessionCount: 12,
  totalSpins: number,
  sessionComparison: [{ number, spinCount, tier, character, highlights }],
  masterTriggerTable: ZdcTriggerRow[37],  // agregácia cez 12 session
  crossSessionStability: [{
    number: 0..36,
    metric: string,           // napr. „Veľké po 0“
    sessionPcts: number[],    // % v každej session kde bolo follow
    stability: 'vysoká' | 'stredná' | 'nízka' | 'nestabilné',
    humanNote: string         // napr. „Session 1–4: 69–73 % veľké“
  }],
  unstableNumbers: [],        // vysoký rozptyl medzi session
  sessionRanking: {
    mostChaotic: { sessionNumber, reason },
    mostTrending: { sessionNumber, reason },
    mostStreaks: { sessionNumber, reason },
    mostAnomalies: { sessionNumber, reason },
    mostBalanced: { sessionNumber, reason },
    strongestColorDominance: { sessionNumber, reason },
    strongestDozenDominance: { sessionNumber, reason },
    strongestColumnDominance: { sessionNumber, reason }
  },
  interestingNumbers: ZdcInterestingNumber[],  // detail per číslo
  top10Highlights: string[],       // TOP 10 zaujímavostí celého zberu (ľudskou rečou)
  topOpeners: { red, black, low, high, even, odd, dozen1..3, col1..3 },
  topFollowNumbers: [],
  globalAnomalies: string[],       // najväčšie anomálie zo všetkých session
  longestStreaks: [],
  biggestSleepers: [],             // najväčší spáči naprieč zberom
  hotColdGlobal: { hot, cold },
  repeatedPatterns: [],
  masterReturnSummary: ZdcReturnRow[37],  // agregované návraty (voliteľne)
  humanSummary: string
}
```

### 2.4 Pipeline výpočtu

```
zdcOnSpin(n)
  → active.spins.push(n)
  → zdcRenderLive()

zdcCloseSession()  [povolené len ak spins.length >= 120]
  → tier = (length === 120) ? 'standard' : 'extended'
  → report = zdcBuildSessionReport(spins)
  → closed.push(session); FIFO if closed.length > 12
  → if closed.length === 12 → master = zdcBuildMasterReport(closed)
  → active = new session (number++)

zdcBuildSessionReport:
  1. zdcBuildTriggerTable(spins)        ← priorita #1–2
  2. zdcBuildReturnStats(spins)         ← návraty 0–36
  3. zdcBuildOverview(spins)
  4. zdcDetectAnomalies → zdcRankAnomalies → top5
  5. zdcSessionCharacter(overview, top5)
  6. zdcHumanCommentPerRow(row)
  7. zdcHumanSessionSummary(report)

zdcBuildMasterReport(closed[12]):
  1. masterTriggerTable (agregácia)
  2. zdcCrossSessionStability(closed)
  3. zdcSessionRanking(closed)          ← 8 kategórií
  4. zdcInterestingNumbers + zdcTop10Highlights
  5. zdcHumanMasterSummary(...)
```

---

## 2.5 DOPLNKOVÉ FUNKCIE (rozšírenie zadania)

### A) Spoľahlivosť vzorky (CONFIDENCE)

- **Nie predikcia** — len informácia o veľkosti vzorky.
- Pri každom čísle 0–36 v tabuľke: `hitCount`, `followCount`, `sampleConfidence`.
- V ľudskom komentári pri dominantnom % vždy uviesť aj pozorovaní + spoľahlivosť.
- Prahy: `<10` nízka, `10–29` stredná, `≥30` vysoká (konfigurovateľné konštanty).

### B) Stabilita správania medzi 12 session

Funkcia `zdcCrossSessionStability(closedSessions)`:

- Pre každé číslo 0–36 a kľúčové metriky (veľké, čierna, 2. tucet …) zober % z každej session (kde `followCount > 0`).
- Vypočítaj rozptyl (std dev alebo max−min).
- **Vysoká stabilita:** rozptyl ≤ 8 p.b. v ≥ 4 session s follow ≥ 5.
- **Nestabilné:** rozptyl > 20 p.b. alebo protichodné smery medzi session.
- V master reporte tabuľka + ľudské vety (príklad číslo 0 → veľké 69–73 %).

### C) TOP 5 anomálií session

- `zdcDetectAnomalies` generuje kandidátov (série, spáči, extrémne % po triggri, chýbajúce číslo…).
- `zdcRankAnomalies` skóre: dĺžka série × 2, nulový výskyt čísla = max, extrémny podpriemer tucetu = vysoké.
- Do UI a Excelu len **`top5Anomalies`** (5 bodov, ľudskou rečou).
- Príklady:
  - „14× malé po sebe“
  - „Číslo 23 nepadlo počas celej session“
  - „Po 0 išlo veľké v 82 % prípadov (pozorovaní: 11, spoľahlivosť: stredná)“

### D) Charakter session

`zdcSessionCharacter(overview, top5)` — pravidlový klasifikátor (nie AI):

| Podmienka | Charakter |
|-----------|-----------|
| Najdlhšia séria ≥ 10 alebo dominancia jednej vlastnosti ≥ 65 % | **Trendová session** |
| Veľa krátkych striedaní, nízke max série | **Chaotická session** |
| Rozptyl počtov čísel blízko rovnomerného | **Vyrovnaná session** |
| ≥ 4 z top5 anomálií alebo extrémna séria ≥ 15 | **Extrémna session** |
| Dominancia červená/čierna > 58 % | **Session s dominanciou farieb** |
| Jeden tucet > 40 % | **Session s dominanciou tuctov** |
| Jeden stĺpec > 40 % | **Session s dominanciou stĺpcov** |

Výstup: `sessionCharacter` (hlavný štítok) + `sessionCharacterDetail` (1–2 vety).

### E) Porovnanie všetkých 12 session (master)

`zdcSessionRanking` — pre každú kategóriu vyber session # + ľudský dôvod:

- najchaotickejšia · najtrendovejšia · najviac sérií · najviac anomálií
- najvyrovnanejšia · najväčšia dominancia farby / tucetu / stĺpca

Zobrazenie: prehľadná tabuľka 8 riadkov v master paneli.

### F) Najzaujímavejšie čísla + TOP 10 zaujímavostí

**Sekcia A — per číslo:** „NAJZAUJÍMAVEJŠIE ČÍSLA ZBERU“ (detail pre vybrané čísla)

**Sekcia B — TOP 10 zaujímavostí celého zberu** (`top10Highlights`):

Presne 10 bodov ľudskou rečou, napr.:
- „Po čísle 0 išlo veľké podobne v 10 z 12 session.“
- „Číslo 23 bolo extrémny spáč v session 4 a 7.“
- „Najdlhšia séria celého zberu: 14× malé (session 3).“

Skóre zaujímavosti = stabilita + dominancia follow + opakovanie v ≥ 3 session + extrémne návraty/absencie.

### G) Ľudská reč — pravidlá pre všetky generátory textov

```
zdcHumanTone:
- krátke vety, slovenčina, bez skratiek enginu
- zakázané: „trigger“, „followCount“, „idx“, „pct“, „dom.idx“
- povolené: „po čísle 8“, „v tejto session“, „pozorovaní“, „spoľahlivosť“
- formát: správa z analýzy, nie debug log
- max ~3 vety na komentár riadku, ~5 viet na session záver
```

Review checklist pred merge: žiadny technický žargón v UI reťazcoch.

### I) Návraty čísiel

Pre každé 0–36 v session reporte (tabuľka alebo pod-tabuľka):

| Metrika | Význam |
|---------|--------|
| Priemerný návrat | priemerná medzera medzi výskytmi |
| Najrýchlejší návrat | min medzera (napr. 1 spin) |
| Najdlhšia absencia | max spinov bez čísla |

Príklad UI: *„Číslo 8 · priemerný návrat 28 · najrýchlejší 1 · najdlhšie chýbalo 97 spinov“*

V masteri: agregácia naprieč session (priemer priemerov, max absencia).

### H) Excel — rozšírený obsah

Každý export musí obsahovať **kompletný archív**:

| List | Obsah |
|------|-------|
| `Spiny` | všetky session, poradie, číslo |
| `Session N` | prehľad, charakter, TOP 5, ľudský záver, spinCount, tier |
| `Session N Tabulka` | 37 riadkov vrátane hitCount, followCount, sampleConfidence, všetky % |
| `Session N Komentare` | humanComment pre každé 0–36 |
| `Session N Anomalie` | presne 5 riadkov |
| `Session N Navraty` | 37 riadkov: avgReturn, fastestReturn, longestAbsence |
| `Master Prehlad` | porovnanie 12 session, ranking 8 kategórií, TOP 10 |
| `Master Tabulka` | agregovaná 0–36 |
| `Master Stabilita` | cross-session stabilita per číslo |
| `Master Zaujimave` | najzaujímavejšie čísla + odseky |
| `Master Anomalie` | globálne TOP anomálie |
| `Master Zaver` | finálny ľudský text |

Súbor pomenovanie: `ZDC-cyklus-{cycleId}-{datum}.xlsx`

---

## 3. UI — prehľadný layout

### 3.1 Premenovanie

- Tlačidlo: **„📊 ZBER DÁT ČÍSEL 0–36“**
- Titulok karty: **ZBER DÁT ČÍSEL 0–36**
- Intro: jednoduchý text pre bežného používateľa (nie technický)

### 3.2 Štruktúra zhora nadol

1. **Status bar** — Session 3/12 · Spiny 87/120 · Zber dát  
   Po 120: „Plnohodnotná — môžeš uzavrieť“ / nad 120: „Rozšírená session“
2. **Akcie** — `[ Uzavrieť session ]` (disabled <120) · `[ Export Excel ]` · `[ Nová session ]` (po uzavretí)
3. **★ Hlavná tabuľka 0–36** — horizontálny scroll, sticky stĺpec „Číslo“  
   Stĺpce navyše: **Výskytov**, **Pozorovaní**, **Spoľahlivosť** (pri percentách)
4. **Session report**
   - **Charakter session** (štítok + 1–2 vety)
   - **TOP 5 ANOMÁLIÍ SESSION** (nie dlhý zoznam)
   - ľudský záver + zoznam spinov (rozbaľovací)
5. **Archív** — max 12 kariet session
6. **Master panel** (po 12. session)
   - porovnanie 12 session (8 kategórií)
   - stabilita čísel medzi session
   - **NAJZAUJÍMAVEJŠIE ČÍSLA ZBERU**
   - finálny ľudský záver
7. Hot/Cold mriežka — voliteľný doplnok

### 3.3 UX pravidlá

- Pod 120: tlačidlo uzavrieť **disabled** + „Ešte X spinov do plnohodnotnej session“
- Žiadne debug reťazce, žiadny chaos
- Komentáre = ľudská slovenčina

---

## 4. EXCEL EXPORT

**Technológia:** `xlsx` (SheetJS) — pridať do `package.json`.

Kompletný zoznam listov — pozri **§ 2.5 H) Excel**. Povinný obsah:

1. každá session samostatne (prehľad + tabuľka + komentáre + TOP 5)
2. finálny master report (všetky sekcie)
3. všetky spiny v poradí
4. všetky čísla 0–36 so všetkými stĺpcami a spoľahlivosťou

**Kedy export:**
- manuálne kedykoľvek (tlačidlo)
- automatická ponuka pred FIFO zmazaním 13. session
- odporúčanie po uzavretí 12. session (pred novým cyklom)

---

## 5. FÁZOVANÁ IMPLEMENTÁCIA

Každá fáza = samostatný krok, po každej testy. **Nemení sa nič mimo Session Analyzer / zdc modul.**

### Priorita implementácie

Zosúladené s projektom — pozri **§0 Priorita projektu** (raw spiny ako #1).

### Fáza 1 — Dátový model + RAW + trigger + návraty (priorita 1–3)
- Súbor `scripts/analytics/zber-dat-0-36.js` (compute only)
- `ZdcSession` s metadata (id, dates), `spins[]` immutable source
- `zdcProps`, `zdcBuildTriggerTable`, `zdcBondAnalysis`, `zdcBuildReturnStats`
- `zdcSampleQualityLabel`, `zdcSampleConfidence`
- Test: `scripts/tests/_test_zdc_compute.cjs` + `npm run test:v2:zdc`
- **Bez zmeny UI**

### Fáza 2 — Session lifecycle
- `ZdcStore`, `zdcOnSpin`, `zdcCloseSession`, min 120, tier standard/extended
- Nahradiť starý EventBus hook
- Testy: uzavretie blocked <120, tier pri 120 vs 150

### Fáza 3 — UI tabuľka 0–36
- HTML/CSS premenovanie karty
- Render hlavnej tabuľky (live hitCount počas zberu, plná po uzavretí)
- Smoke v `test:v2:master`

### Fáza 4 — Session report + ľudské texty
- `zdcBuildOverview`, `zdcDetectAnomalies`, `zdcRankAnomalies` → **TOP 5**
- `zdcSessionCharacter`, `zdcSampleConfidence` v tabuľke
- `zdcHumanComment` (s pozorovaniami + spoľahlivosťou), `zdcHumanSummary`
- Panel: charakter + TOP 5 + záver
- Odstrániť starý magnet/streak/sleeper výstup

### Fáza 5 — Pamäť 12 session + FIFO
- `localStorage` persist
- Archív UI, upozornenie pred dropom

### Fáza 6 — Master report
- `zdcBuildMasterReport` po 12. uzavretí v cykle
- `zdcCrossSessionStability`, `zdcSessionRanking`, `zdcInterestingNumbers`
- Master panel v UI (porovnanie 12, stabilita, zaujímavé čísla)

### Fáza 7 — Excel export
- `xlsx` dependency
- `zdcExportExcel(store)` — všetky listy z § 2.5 H (session + master + spiny + tabuľky + komentáre + anomálie)

### Fáza 8 — Cleanup
- Odstrániť inline `SessionAnalyzerModule`
- `npm run sync-v2`
- `test:v2:master`, `test:v2:layout`, `test:v2:audit`

---

## 6. TESTOVACIA STRATÉGIA

```javascript
// _test_zdc_compute.cjs
✓ trigger: [8,17,8,0,32] → po 8 follows {17:1, 0:1}, followCount=2
✓ zeroPct po čísle kde nasleduje 0
✓ percentá sčítajú ~100 % pri followCount >= 1
✓ hitCount vs followCount (posledný výskyt bez follow)
✓ close blocked pri 119 spinoch
✓ tier standard @120, extended @121+
✓ FIFO: 13. closed → length 12
✓ master null until 12 closed
✓ SPO/SBPO súbory bez 'zdc' referencií
✓ sampleConfidence: 5→nízka, 42→vysoká
✓ top5Anomalies.length <= 5
✓ sessionCharacter jeden z definovaných typov
✓ crossSessionStability: nízky rozptyl → vysoká
✓ sessionRanking: 8 kategórií vyplnených pri 12 session
✓ humanComment neobsahuje zakázané tokeny (trigger, followCount…)
✓ returnStats: číslo 8 s výskytmi na idx [5,33,61] → avgReturn 28, fastest 1
✓ returnStats: číslo 23 nepadlo → longestAbsence = spinCount
✓ top10Highlights.length === 10 (pri 12 session)
```

Po každej fáze: `npm run test:v2:zdc && npm run test:v2:master`

---

## 7. SÚBORY (výhradne ZDC scope)

| Súbor | Zmena |
|-------|-------|
| `scripts/analytics/zber-dat-0-36.js` | **NOVÝ** |
| `index-NOVY-V2.html` | HTML karty, CSS, script tag, zmazať inline SA |
| `index.html` | sync-v2 |
| `scripts/tests/_test_zdc_compute.cjs` | **NOVÝ** |
| `scripts/tests/_test_v4_master.cjs` | smoke: karta + izolácia |
| `package.json` | `test:v2:zdc`, `xlsx` (fáza 7) |

**Bez zmeny:** `spin-pattern-observer.js`, `spin-binary-pattern-observer.js`, AI, wheel, HUD, klávesnica.

---

## 8. ROZHODNUTIA (predvolené — na potvrdenie)

| Otázka | Predvolená odpoveď |
|--------|-------------------|
| <120 spinov | **nemožno uzavrieť** — len pokračovať v zbere alebo „Zrušiť session“ bez archívu |
| Nula | **počíta sa** ako nasledujúci spin |
| >120 | **rozšírená session**, manuálne uzavretie, bez horného limitu |
| 13. session | FIFO drop + **ponuka exportu** pred zmazaním |
| Po 12. session | master report + **nový cyklus** session 1–12 (cycleId++) |
| Excel | knižnica `xlsx` |

---

## 9. ODPORÚČANÝ COMMIT (po celom projekte)

```
feat(zdc): ZBER DÁT ČÍSEL 0–36 — session 120+, tabuľka trigger, 12 archív, master report, Excel
```

---

## 10. ĎALŠÍ KROK

**Schválenie plánu + dizajnov §12–14** → spustiť **Fázu 1** (raw + trigger compute + testy, bez UI).

---

## 12. NÁVRH DÁTOVÉHO MODELU (pred implementáciou)

### 12.1 Raw dáta — najvyššia priorita

```
ZdcSession.spins[]  ← jediný zdroj pravdy pre session
```

Pravidlá:
- **Nikdy** neodstraňovať, neagregovať namiesto originálu, neskrývať v UI (aspoň collapsible, vždy dostupné).
- Každý report sa **prepočíta** zo `spins[]`, nie naopak.
- Export raw: tlačidlo **„Exportovať iba raw spiny“** (CSV/Excel list `Raw` alebo clipboard).
- Kopírovanie: **„Kopírovať spiny“** → `17, 8, 0, 32, …` alebo jeden spin na riadok.

### 12.2 Reprodukovateľnosť (metadata)

Každá uzavretá session v archíve zobrazí:

| Pole | Príklad |
|------|---------|
| Session ID | `zdc-a1b2c3d4-…` |
| Vytvorená | `2026-05-31 14:22` |
| Ukončená | `2026-05-31 16:05` |
| Spinov | `142` |
| Report vygenerovaný | `2026-05-31 16:05:03` |
| Kvalita vzorky | `veľmi dobrá vzorka` |

Master report: `cycleId`, `masterGeneratedAt`, zoznam Session ID všetkých 12.

### 12.3 Silné a slabé väzby (`zdcBondAnalysis(row)`)

Pre každé číslo N po výpočte percent:

**Silná väzba:** podiel ≥ **55 %** a `followCount ≥ 5` (konfigurovateľné)  
**Slabá väzba:** podiel ≤ **15 %** pri `followCount ≥ 5`  
**Takmer sa nevyskytovalo:** 0× alebo ≤ **5 %** pri `followCount ≥ 3`

Kategórie: farba, tucet, stĺpec, párne/nepárne, malé/veľké, konkrétne nasledujúce číslo.

Príklad v riadku tabuľky / komentári:
```
Po čísle 8:
  silné: čierna, 2. tucet
  slabé: 1. tucet, 3. stĺpec
  takmer chýbalo: nula
```

### 12.4 Entitný diagram (zjednodušený)

```
ZdcStore
 ├── active: ZdcSession
 ├── closed[0..11]: ZdcSession
 └── master: ZdcMasterReport

ZdcSession
 ├── spins[]          ← RAW
 ├── metadata         ← id, dates, sampleQuality
 └── report: ZdcSessionReport
      ├── triggerTable[37]
      ├── returnTable[37]
      ├── top5Anomalies[5]
      ├── sessionCharacter
      └── humanSummary

ZdcMasterReport
 ├── masterTriggerTable[37]
 ├── crossSessionStability[]
 ├── sessionRanking (8)
 ├── top10Highlights[10]
 └── humanSummary
```

---

## 13. NÁVRH EXCEL EXPORTU (pred implementáciou)

**Technológia:** `xlsx` (SheetJS) · súbor: `ZDC-cyklus-{cycleId}-{YYYY-MM-DD}.xlsx`

### 13.1 Režimy exportu (3 tlačidlá v UI)

| Tlačidlo | Obsah |
|----------|-------|
| **Export iba raw spiny** | List `Raw` — sessionId, session#, poradie, číslo, dátum session |
| **Export aktuálnej / vybranej session** | Raw + Tabulka + Navraty + Komentáre + Anomálie + Report |
| **Export celého zberu** | Všetko nižšie + Master |

### 13.2 Povinné listy (celý zber)

| List | Obsah |
|------|-------|
| `Raw` | **všetky** spiny všetkých session — sessionId, #, poradie, číslo |
| `Meta` | Session ID, vytvorená, ukončená, spinov, kvalita, reportGeneratedAt |
| `Session N` | ľudský prehľad, charakter, kvalita vzorky, TOP 5, záver |
| `S{N} Tabulka` | 37 riadkov + silné/slabé väzby stĺpce |
| `S{N} Navraty` | avg / fastest / longest absence |
| `S{N} Raw` | spiny tejto session (duplicita zámerná — ľahká navigácia) |
| `Master` | TOP 10, ranking 8, finálny záver |
| `Master Tabulka` | agregácia 0–36 |
| `Master Stabilita` | cross-session |
| `Master TOP10` | presne 10 zaujímavostí |

### 13.3 Pravidlá archívu

- Excel musí byť **samostatne čitateľný** bez aplikácie.
- Pred FIFO dropom session → modal: *„Najstaršia session bude odstránená. Exportovať teraz?“*
- Raw list **vždy** prvý alebo druhý — ľahký prístup pre dlhodobú archiváciu.

---

## 14. NÁVRH UI (pred implementáciou)

### 14.1 Vizuálna hierarchia (žiadny chaos)

```
┌─────────────────────────────────────────────────────────┐
│ ZBER DÁT ČÍSEL 0–36                                      │
│ Digitálna kniha rulety — zber minulých spinov, nie predikcia │
├─────────────────────────────────────────────────────────┤
│ Session 3/12 · 142 spinov · veľmi dobrá vzorka · Zber    │
│ ID: zdc-… · Vytvorená: …                                │
├─────────────────────────────────────────────────────────┤
│ [Uzavrieť session] [Kopírovať spiny] [Export raw] [Excel]│
├─────────────────────────────────────────────────────────┤
│ ★ TABUĽKA 0–36 (hlavná, sticky stĺpec Číslo)             │
│   číslo | výskytov | pozorovaní | spoľahlivosť | …      │
│   silné väzby | slabé väzby | komentár                   │
├─────────────────────────────────────────────────────────┤
│ RAW SPINY (vždy viditeľné, scroll)                       │
│ 17 · 8 · 0 · 32 · …  [Kopírovať]                         │
├─────────────────────────────────────────────────────────┤
│ SESSION REPORT (po uzavretí)                             │
│   Charakter: Trendová session                            │
│   TOP 5 ANOMÁLIÍ                                         │
│   Hlavný záver (ľudskou rečou)                           │
├─────────────────────────────────────────────────────────┤
│ ARCHÍV (max 12 kariet — ID, dátumy, spinov, kvalita)     │
├─────────────────────────────────────────────────────────┤
│ MASTER REPORT (po 12. session)                           │
│   TOP 10 ZAUJÍMAVOSTÍ CELÉHO ZBERU DÁT                   │
│   Porovnanie 12 session · Stabilita · Záver              │
└─────────────────────────────────────────────────────────┘
```

### 14.2 UX pravidlá

- **Žiadne** HRAŤ/NEHRAŤ, žiadne AI skóre, žiadne „odporúčame staviť“.
- Farby: neutrálna analytická paleta (existujúce `.sa-*` / nové `.zdc-*`).
- Tabuľka: horizontálny scroll, na mobile zbaliteľné riadky (detail po kliknutí na číslo).
- Raw pás: vždy prístupný aj počas zberu (live append).
- Po uzavretí: metadata (ID, dátumy, kvalita vzorky) v hlavičke session.

### 14.3 Detail riadku čísla (expand / modal)

Po kliknutí na riadok **8**:
- percentá + pozorovaní + spoľahlivosť
- silné / slabé / takmer chýbajúce väzby
- top 3 nasledujúce čísla
- návraty (priemer, najrýchlejší, najdlhšia absencia)
- ľudský komentár (max 3 vety)

---

## 11. CHANGELOG PLÁNU

| Dátum | Zmena |
|-------|-------|
| 2026-05-31 | Pôvodný audit + 8 fáz |
| 2026-05-31 | Doplnok: confidence, stabilita, TOP 5, charakter, ranking 12, zaujímavé čísla, ľudská reč, Excel |
| 2026-05-31 | Finálna špecifikácia: autoritatívna sekcia §0, návraty, TOP 10, priority |
| 2026-05-31 | Doplnenie: raw priorita #1, reprodukovateľnosť, silné/slabé väzby, kvalita vzorky, §12–14 dizajn pred kódom |
