# Legacy moduly (Balík 9A, dokumentácia 10C)

Tieto súbory **nie sú načítané produkciou**. Runtime autorita je v **externých moduloch** alebo **V2 inline** (pozri `ARCHITECTURE.md` → CURRENT RUNTIME AUTHORITIES).

| Súbor (archív) | Pôvodná cesta | Produkcia (autorita) |
|----------------|---------------|----------------------|
| `pattern/spin-pattern-observer.js` | `scripts/pattern/` (pred 9F) | **`scripts/pattern/spin-pattern-observer.js`** — EXTERNAL |
| `bootstrap/app-init.js` | `scripts/bootstrap/app-boot.js` | Produkcia: **EXTERNAL** `app-boot.js` (10D) |
| `ui/ui-panels.js` | `scripts/ui/` | **`scripts/ui/keyboard-live-ai-flow.js`** — EXTERNAL |

**Nepoužívať** tieto archívne súbory v `<script src>`.

| Modul | Archív | Produkcia |
|-------|--------|-----------|
| Pattern Observer | `_legacy/pattern/…` | `scripts/pattern/spin-pattern-observer.js` |
| Keyboard Flow | `_legacy/ui/ui-panels.js` | `scripts/ui/keyboard-live-ai-flow.js` |
| Session Fatigue | (inline pred 9B) | `scripts/ui/session-fatigue.js` |

Test Pattern Observer: `scripts/pattern/test-spin-pattern-observer.cjs` — načítava **produkčný** `scripts/pattern/spin-pattern-observer.js`, nie tento archív.
