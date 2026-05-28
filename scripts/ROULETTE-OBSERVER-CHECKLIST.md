# Upozornenia (behavior radar) — rýchly checklist

| # | Scenár | Očakávanie |
|---|--------|------------|
| 1 | 0–4 spiny | Text „zbieram obraz …/5 spinov“, žiadne WAIT MODE |
| 2 | 5+ spinov stabilný stĺpec | 🟢 Dominancia drží + praktická rada |
| 3 | Chaos / mix | 🔴/⛔ slovensky, veta prečo + odporúčanie počkať |
| 4 | Bez signálu | ⚪ Pokojné pozorovanie, nie prázdny panel |
| 5 | Vymazať históriu | Radar od nuly, žiadna stará pamäť |
| 6 | Max 2 karty | Nikdy viac ako 2 upozornenia |
| 7 | Jazyk | Žiadne „CHAOS VYSOKÝ“, „WAIT MODE“, „FLOW KOLAPS“ |

---

# Ruletový analytik — testovací checklist (observer)

Manuálne alebo cez `node scripts/test-roulette-observer.cjs` (Electron).

| # | Scenár | Kroky | Očakávaný výsledok |
|---|--------|--------|-------------------|
| 1 | Prázdna história | Otvor app, žiadne spiny | Hero: čaká na spiny, žiadne smery, žiadna falošná úspešnosť % |
| 2 | 1 spin | Zadaj jedno číslo | Fáza pozorovania, max 2 vety, bez smerov FARBA/TUCTY |
| 3 | 11 spinov | 11× ľubovoľné | Stále „zbieram obraz“, bez alarmov mŕtvych spinov |
| 4 | 12+ spinov | 12. spin | Plné vety (až 3 pri 12–14), môžu sa objaviť smery + disclaimer |
| 5 | Chaos | 15+ spinov s častou zmenou stĺpcov | Nestabilné / chaos v hero, max 5 viet + 1 odporúčanie |
| 6 | Stabilný stĺpec | 15+ spinov do jedného stĺpca | Dominancia / návraty, zelené vety, smery viditeľné |
| 7 | Mŕtve spiny | Veľmi náhodná séria 15+ | Odporúčanie vynechať 2–3 spiny, bez „predikcie“ |
| 8 | Konflikt s AI | Po 12+ spinoch porovnaj s predikciou | Poznámka o súhlase/nesúhlase (ak je predikcia) |
| 9 | Vymazať históriu | Koš → znova 5 spinov | Observer ako nová session, žiadna stará pamäť/profil |
| 10 | Po clear 24× | Vymazať → 15× číslo 24 | Komentáre len o novej histórii (24), nie stará session |

## Kontrola UI

- [ ] Žiadny starý panel: SILA FLOW, NO TRUST, FLOW DNA, „Viac detailov“
- [ ] Pod smermi text: **Pozorovanie správania, nie záruka ďalšieho čísla.**
- [ ] Max 5 viet v zozname + najviac 1 blok odporúčania (⛔)
- [ ] Úspešnosť % len po ≥4 interných hodnoteniach
