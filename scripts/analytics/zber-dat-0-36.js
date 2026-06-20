/* zber-dat-0-36.js — ZBER DÁT ČÍSEL 0–36 (dátový archivátor, nie predikcia)
 * SPIN → ČÍSLO → ČO SA DIALO PO ŇOM
 * Izolovaný modul — nezasahuje do AI / SPO / SBPO / live hry.
 */
'use strict';

var ZDC_VERSION = 1;
var ZDC_MIN_SPINS = 120;
var ZDC_MAX_SESSIONS = 12;
var ZDC_STORAGE_KEY = 'zdcStore_v1';
var ZDC_HOT_MIN = 4;
var ZDC_COLD_MAX = 1;

var ZDC_CONF_LOW = 10;
var ZDC_CONF_MID = 30;
var ZDC_BOND_STRONG = 55;
var ZDC_BOND_WEAK = 15;
var ZDC_BOND_RARE = 5;
var ZDC_PATTERN_MIN_REPEAT = 2;
var ZDC_SHORT_RETURN_MAX = 3;

/* ── Identifikátory a metadata ── */

function zdcNewId() {
  return 'zdc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function zdcNowIso() {
  return new Date().toISOString();
}

function zdcSampleQualityLabel(spinCount) {
  if (spinCount >= 400) return 'vysoká kvalita dát';
  if (spinCount >= 250) return 'veľmi dobrá vzorka';
  if (spinCount >= 120) return 'dobrá vzorka';
  return 'neúplná vzorka';
}

function zdcFormatDateSk(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('sk-SK');
  } catch (e) {
    return iso;
  }
}

function zdcBondPct(row, label) {
  var map = {
    'červená': row.redPct, 'čierna': row.blackPct, 'nula': row.zeroPct,
    'párne': row.evenPct, 'nepárne': row.oddPct,
    'malé': row.lowPct, 'veľké': row.highPct,
    '1. tucet': row.dozen1Pct, '2. tucet': row.dozen2Pct, '3. tucet': row.dozen3Pct,
    '1. stĺpec': row.col1Pct, '2. stĺpec': row.col2Pct, '3. stĺpec': row.col3Pct
  };
  return map[label] || 0;
}

function zdcSampleConfidence(followCount) {
  if (!followCount || followCount <= 0) return 'žiadna';
  if (followCount >= ZDC_CONF_MID) return 'vysoká';
  if (followCount >= ZDC_CONF_LOW) return 'stredná';
  return 'nízka';
}

function zdcSessionTier(spinCount) {
  if (spinCount < ZDC_MIN_SPINS) return null;
  if (spinCount === ZDC_MIN_SPINS) return 'standard';
  return 'extended';
}

/* ── Klasifikácia čísla (read-only helpers z constants/helpers) ── */

function zdcProps(n) {
  if (n === 0) {
    return {
      color: 'ZELENÁ',
      size: 'NULA',
      parity: 'NULA',
      dozen: 'NULA',
      column: 'NULA'
    };
  }
  var cr = typeof reds !== 'undefined' && reds.includes(n);
  var col = typeof getColor === 'function' ? getColor(n) : (cr ? 0 : 1);
  var dz = typeof getDozen === 'function' ? getDozen(n) : (n <= 12 ? 0 : n <= 24 ? 1 : 2);
  var cl = typeof getColumn === 'function' ? getColumn(n) : ((n - 1) % 3);
  return {
    color: col === -1 ? 'ZELENÁ' : col === 0 ? 'ČERVENÁ' : 'ČIERNA',
    size: n <= 18 ? 'MALÉ' : 'VEĽKÉ',
    parity: n % 2 === 0 ? 'PÁRNE' : 'NEPÁRNE',
    dozen: dz === 0 ? '1. TUCET' : dz === 1 ? '2. TUCET' : '3. TUCET',
    column: cl === 0 ? '1. STĹPEC' : cl === 1 ? '2. STĹPEC' : '3. STĹPEC'
  };
}

/* ── Krok 1: dátový model ── */

function zdcEmptyTriggerRow(number) {
  return {
    number: number,
    hitCount: 0,
    followCount: 0,
    sampleConfidence: 'žiadna',
    nextNumbers: {},
    nextNumbersText: '—',
    topNext: null,
    top3Next: [],
    redPct: 0,
    blackPct: 0,
    zeroPct: 0,
    evenPct: 0,
    oddPct: 0,
    lowPct: 0,
    highPct: 0,
    dozen1Pct: 0,
    dozen2Pct: 0,
    dozen3Pct: 0,
    col1Pct: 0,
    col2Pct: 0,
    col3Pct: 0,
    strongBonds: [],
    weakBonds: [],
    rareAfter: [],
    repeatedFollows: [],
    rowAnomalies: [],
    humanComment: ''
  };
}

function zdcEmptyReturnRow(number) {
  return {
    number: number,
    hitCount: 0,
    avgReturn: null,
    fastestReturn: null,
    longestAbsence: 0,
    humanNote: ''
  };
}

function zdcNewSession(store) {
  var cycleId = store ? store.cycleId : 1;
  var num = store ? (store.sessionsInCycle + 1) : 1;
  if (num > ZDC_MAX_SESSIONS) num = 1;
  return {
    id: zdcNewId(),
    cycleId: cycleId,
    number: num,
    status: 'collecting',
    spins: [],
    createdAt: zdcNowIso(),
    closedAt: null,
    reportGeneratedAt: null,
    spinCount: 0,
    tier: null,
    sampleQuality: null,
    report: null
  };
}

function zdcNewStore() {
  return {
    version: ZDC_VERSION,
    cycleId: 1,
    sessionCounter: 0,
    sessionsInCycle: 0,
    active: zdcNewSession(null),
    closed: [],
    master: null,
    masterArchive: []
  };
}

function zdcValidateSpin(n) {
  return typeof n === 'number' && !isNaN(n) && n >= 0 && n <= 36;
}

/* ── Raw spiny (priorita #1) ── */

function zdcRawRowsFromSessions(closed, active) {
  var rows = [];
  var list = (closed || []).slice();
  if (active && active.spins && active.spins.length) list.push(active);
  list.forEach(function (sess) {
    (sess.spins || []).forEach(function (num, idx) {
      rows.push({
        sessionId: sess.id,
        cycleId: sess.cycleId,
        sessionNumber: sess.number,
        order: idx + 1,
        number: num
      });
    });
  });
  return rows;
}

function zdcSpinsToText(spins) {
  return (spins || []).join(', ');
}

/* ── Krok 2: pamäť session ── */

function zdcLoadStore(storage) {
  var raw = null;
  try {
    if (storage && typeof storage.getItem === 'function') raw = storage.getItem(ZDC_STORAGE_KEY);
    else if (typeof localStorage !== 'undefined') raw = localStorage.getItem(ZDC_STORAGE_KEY);
  } catch (e) { /* ignore */ }
  if (!raw) return zdcNewStore();
  try {
    var parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== ZDC_VERSION) return zdcNewStore();
    if (!parsed.active) parsed.active = zdcNewSession(parsed);
    if (!Array.isArray(parsed.closed)) parsed.closed = [];
    if (!Array.isArray(parsed.masterArchive)) parsed.masterArchive = [];
    if (parsed.master && !parsed.master.sourceSessionIds && parsed.closed.length) {
      parsed.master.sourceSessionIds = parsed.closed
        .filter(function (s) { return s.cycleId === parsed.master.cycleId; })
        .map(function (s) { return s.id; });
    }
    return parsed;
  } catch (e2) {
    return zdcNewStore();
  }
}

function zdcSaveStore(store, storage) {
  var json = JSON.stringify(store);
  try {
    if (storage && typeof storage.setItem === 'function') storage.setItem(ZDC_STORAGE_KEY, json);
    else if (typeof localStorage !== 'undefined') localStorage.setItem(ZDC_STORAGE_KEY, json);
    return true;
  } catch (e) {
    return false;
  }
}

function zdcOnSpin(store, number) {
  if (!store || !store.active) return { ok: false, reason: 'no_active' };
  var s = store.active;
  if (s.status !== 'collecting') return { ok: false, reason: 'closed' };
  if (!zdcValidateSpin(number)) return { ok: false, reason: 'invalid' };
  s.spins.push(number);
  s.spinCount = s.spins.length;
  return { ok: true, spinCount: s.spinCount };
}

function zdcUndoLastSpin(store) {
  if (!store || !store.active) return { ok: false, reason: 'no_active' };
  var s = store.active;
  if (s.status !== 'collecting') return { ok: false, reason: 'closed' };
  if (!s.spins || !s.spins.length) return { ok: false, reason: 'empty' };
  var removed = s.spins.pop();
  s.spinCount = s.spins.length;
  return { ok: true, spinCount: s.spinCount, removed: removed };
}

function zdcCanCloseSession(session) {
  return session && session.spins && session.spins.length >= ZDC_MIN_SPINS;
}

function zdcGetFifoDropCandidate(store) {
  if (!store || !store.closed || store.closed.length < ZDC_MAX_SESSIONS) return null;
  return store.closed[0];
}

function zdcWillFifoDropOnClose(store) {
  return !!zdcGetFifoDropCandidate(store);
}

function zdcArchiveClosed(store, session) {
  var dropped = null;
  if (store.closed.length >= ZDC_MAX_SESSIONS) dropped = store.closed.shift();
  store.closed.push(session);
  return dropped;
}

function zdcCloseSession(store) {
  if (!store || !store.active) return { ok: false, reason: 'no_active' };
  var s = store.active;
  if (!zdcCanCloseSession(s)) return { ok: false, reason: 'min_spins', need: ZDC_MIN_SPINS, have: s.spins.length };

  var now = zdcNowIso();
  s.status = 'closed';
  s.closedAt = now;
  s.tier = zdcSessionTier(s.spins.length);
  s.sampleQuality = zdcSampleQualityLabel(s.spins.length);
  s.reportGeneratedAt = now;
  s.spinCount = s.spins.length;
  s.report = zdcBuildSessionReport(s);

  store.sessionsInCycle++;
  s.number = store.sessionsInCycle;
  s.cycleId = store.cycleId;

  var fifoCandidate = zdcGetFifoDropCandidate(store);
  var dropped = zdcArchiveClosed(store, s);
  store.sessionCounter++;
  store.active = null;

  var cycleComplete = store.sessionsInCycle >= ZDC_MAX_SESSIONS;
  if (cycleComplete) {
    var completedCycleId = store.cycleId;
    if (store.master) {
      store.masterArchive = store.masterArchive || [];
      store.masterArchive.push(store.master);
    }
    store.master = zdcBuildMasterReport(store.closed, completedCycleId);
    store.cycleId++;
    store.sessionsInCycle = 0;
  }

  store.active = zdcNewSession(store);
  return {
    ok: true,
    dropped: dropped,
    droppedSession: dropped,
    fifoCandidate: fifoCandidate,
    cycleComplete: cycleComplete,
    sessionId: s.id
  };
}

/* ── Krok 3: výpočty — čísla 0–36 a následnosti ── */

function zdcHitCounts(spins) {
  var c = [];
  var i;
  for (i = 0; i <= 36; i++) c[i] = 0;
  (spins || []).forEach(function (n) {
    if (zdcValidateSpin(n)) c[n]++;
  });
  return c;
}

function zdcFollowNextNumbers(spins, triggerNum) {
  var map = {};
  var follows = 0;
  var i;
  for (i = 0; i < spins.length - 1; i++) {
    if (spins[i] !== triggerNum) continue;
    var next = spins[i + 1];
    map[next] = (map[next] || 0) + 1;
    follows++;
  }
  return { map: map, followCount: follows };
}

function zdcTopFromMap(map, k) {
  var arr = Object.keys(map).map(function (key) {
    return { n: +key, c: map[key] };
  });
  arr.sort(function (a, b) { return b.c - a.c || a.n - b.n; });
  return arr.slice(0, k);
}

function zdcFormatNextMap(map) {
  var tops = zdcTopFromMap(map, 99);
  if (!tops.length) return '—';
  return tops.map(function (x) { return x.n + '×' + x.c; }).join(', ');
}

function zdcPct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function zdcFollowCategoryCounts(followSpins) {
  var o = {
    red: 0, black: 0, zero: 0,
    even: 0, odd: 0,
    low: 0, high: 0,
    d1: 0, d2: 0, d3: 0,
    c1: 0, c2: 0, c3: 0
  };
  followSpins.forEach(function (n) {
    if (n === 0) { o.zero++; return; }
    if (reds.includes(n)) o.red++; else o.black++;
    if (n % 2 === 0) o.even++; else o.odd++;
    if (n >= 1 && n <= 18) o.low++; else if (n >= 19 && n <= 36) o.high++;
    var dz = getDozen(n);
    if (dz === 0) o.d1++; else if (dz === 1) o.d2++; else if (dz === 2) o.d3++;
    var cl = getColumn(n);
    if (cl === 0) o.c1++; else if (cl === 1) o.c2++; else if (cl === 2) o.c3++;
  });
  return o;
}

function zdcBondAnalysis(row) {
  var fc = row.followCount;
  var strong = [];
  var weak = [];
  var rare = [];
  if (fc <= 0) return { strongBonds: strong, weakBonds: weak, rareAfter: rare };

  function bond(label, pct, count) {
    if (fc >= 5 && pct >= ZDC_BOND_STRONG) strong.push(label);
    else if (fc >= 5 && pct <= ZDC_BOND_WEAK && count > 0) weak.push(label);
    else if (fc >= 3 && (count === 0 || pct <= ZDC_BOND_RARE)) rare.push(label);
  }

  bond('červená', row.redPct, Math.round(row.redPct * fc / 100));
  bond('čierna', row.blackPct, Math.round(row.blackPct * fc / 100));
  bond('nula', row.zeroPct, Math.round(row.zeroPct * fc / 100));
  bond('párne', row.evenPct, Math.round(row.evenPct * fc / 100));
  bond('nepárne', row.oddPct, Math.round(row.oddPct * fc / 100));
  bond('malé', row.lowPct, Math.round(row.lowPct * fc / 100));
  bond('veľké', row.highPct, Math.round(row.highPct * fc / 100));
  bond('1. tucet', row.dozen1Pct, Math.round(row.dozen1Pct * fc / 100));
  bond('2. tucet', row.dozen2Pct, Math.round(row.dozen2Pct * fc / 100));
  bond('3. tucet', row.dozen3Pct, Math.round(row.dozen3Pct * fc / 100));
  bond('1. stĺpec', row.col1Pct, Math.round(row.col1Pct * fc / 100));
  bond('2. stĺpec', row.col2Pct, Math.round(row.col2Pct * fc / 100));
  bond('3. stĺpec', row.col3Pct, Math.round(row.col3Pct * fc / 100));

  return { strongBonds: strong, weakBonds: weak, rareAfter: rare };
}

function zdcHumanTriggerComment(row) {
  if (row.hitCount === 0) return 'Číslo ' + row.number + ' v tejto session nepadlo.';
  if (row.followCount === 0) return 'Číslo ' + row.number + ' padlo ' + row.hitCount + '×, ale bez následného spinu na konci session.';
  var parts = ['Po čísle ' + row.number + ' bolo ' + row.followCount + ' pozorovaní (spoľahlivosť ' + row.sampleConfidence + ').'];
  if (row.strongBonds.length) parts.push('Silné väzby: ' + row.strongBonds.join(', ') + '.');
  if (row.weakBonds.length) parts.push('Slabé väzby: ' + row.weakBonds.join(', ') + '.');
  if (row.rareAfter.length) parts.push('Takmer sa nevyskytovalo: ' + row.rareAfter.join(', ') + '.');
  if (row.topNext !== null) parts.push('Najčastejšie nasledovalo číslo ' + row.topNext + '.');
  if (row.repeatedFollows && row.repeatedFollows.length) {
    parts.push('Opakované následnosti: ' + row.repeatedFollows.join(', ') + '.');
  }
  return parts.join(' ');
}

function zdcBuildTriggerRow(spins, number) {
  var row = zdcEmptyTriggerRow(number);
  var hits = zdcHitCounts(spins)[number];
  row.hitCount = hits;

  var fol = zdcFollowNextNumbers(spins, number);
  row.followCount = fol.followCount;
  row.nextNumbers = fol.map;
  row.nextNumbersText = zdcFormatNextMap(fol.map);
  row.sampleConfidence = zdcSampleConfidence(fol.followCount);

  var top = zdcTopFromMap(fol.map, 3);
  row.top3Next = top.map(function (x) { return x.n; });
  row.topNext = top.length ? top[0].n : null;

  var followSpins = [];
  for (var i = 0; i < spins.length - 1; i++) {
    if (spins[i] === number) followSpins.push(spins[i + 1]);
  }

  var cat = zdcFollowCategoryCounts(followSpins);
  var fc = fol.followCount;
  row.redPct = zdcPct(cat.red, fc);
  row.blackPct = zdcPct(cat.black, fc);
  row.zeroPct = zdcPct(cat.zero, fc);
  row.evenPct = zdcPct(cat.even, fc);
  row.oddPct = zdcPct(cat.odd, fc);
  row.lowPct = zdcPct(cat.low, fc);
  row.highPct = zdcPct(cat.high, fc);
  row.dozen1Pct = zdcPct(cat.d1, fc);
  row.dozen2Pct = zdcPct(cat.d2, fc);
  row.dozen3Pct = zdcPct(cat.d3, fc);
  row.col1Pct = zdcPct(cat.c1, fc);
  row.col2Pct = zdcPct(cat.c2, fc);
  row.col3Pct = zdcPct(cat.c3, fc);

  var bonds = zdcBondAnalysis(row);
  row.strongBonds = bonds.strongBonds;
  row.weakBonds = bonds.weakBonds;
  row.rareAfter = bonds.rareAfter;
  row.rowAnomalies = [];
  if (row.strongBonds.length) row.rowAnomalies.push('Silné: ' + row.strongBonds.join(', '));
  if (row.weakBonds.length) row.rowAnomalies.push('Slabé: ' + row.weakBonds.join(', '));
  if (row.rareAfter.length) row.rowAnomalies.push('Takmer nikdy: ' + row.rareAfter.join(', '));
  row.repeatedFollows = zdcRepeatedFollowsForTrigger(spins, number);
  if (row.repeatedFollows.length) row.rowAnomalies.push('Opakované následnosti: ' + row.repeatedFollows.join(', '));
  row.humanComment = zdcHumanTriggerComment(row);

  return row;
}

function zdcBuildTriggerTable(spins) {
  var table = [];
  var n;
  for (n = 0; n <= 36; n++) table.push(zdcBuildTriggerRow(spins, n));
  return table;
}

function zdcBuildReturnRow(spins, number) {
  var row = zdcEmptyReturnRow(number);
  var idxs = [];
  var i;
  for (i = 0; i < spins.length; i++) if (spins[i] === number) idxs.push(i);
  row.hitCount = idxs.length;
  if (!idxs.length) {
    row.longestAbsence = spins.length;
    row.humanNote = 'Číslo ' + number + ' nepadlo — najdlhšie chýbalo počas celej session (' + spins.length + ' spinov).';
    return row;
  }
  var gaps = [];
  gaps.push(idxs[0]);
  for (i = 1; i < idxs.length; i++) gaps.push(idxs[i] - idxs[i - 1] - 1);
  gaps.push(spins.length - 1 - idxs[idxs.length - 1]);
  row.longestAbsence = gaps.reduce(function (m, g) { return g > m ? g : m; }, 0);
  if (idxs.length >= 2) {
    var intervals = [];
    for (i = 1; i < idxs.length; i++) intervals.push(idxs[i] - idxs[i - 1]);
    row.fastestReturn = intervals.reduce(function (m, g) { return g < m ? g : m; }, intervals[0]);
    row.avgReturn = Math.round(intervals.reduce(function (a, b) { return a + b; }, 0) / intervals.length);
  }
  row.humanNote = 'Číslo ' + number + ': priemerný návrat ' + (row.avgReturn != null ? row.avgReturn : '—') +
    ' spinov, najrýchlejší ' + (row.fastestReturn != null ? row.fastestReturn : '—') +
    ', najdlhšie chýbalo ' + row.longestAbsence + ' spinov.';
  return row;
}

function zdcBuildReturnTable(spins) {
  var table = [];
  var n;
  for (n = 0; n <= 36; n++) table.push(zdcBuildReturnRow(spins, n));
  return table;
}

function zdcBuildReturnHighlights(returnTable) {
  var fastest = (returnTable || []).filter(function (r) {
    return r.hitCount >= 2 && r.fastestReturn != null;
  }).slice().sort(function (a, b) {
    return a.fastestReturn - b.fastestReturn || a.number - b.number;
  }).slice(0, 8);
  var longest = (returnTable || []).slice().sort(function (a, b) {
    return b.longestAbsence - a.longestAbsence || a.number - b.number;
  }).slice(0, 8);
  return { topFastestReturns: fastest, topLongestAbsences: longest };
}

function zdcMasterArchiveIntegrity(store, master) {
  if (!master) {
    return { complete: true, presentCount: 0, expectedCount: 0, missingCount: 0, missingIds: [] };
  }
  var ids = master.sourceSessionIds || [];
  if (!ids.length) {
    return { complete: true, presentCount: 0, expectedCount: 0, missingCount: 0, missingIds: [] };
  }
  var closedIds = {};
  (store.closed || []).forEach(function (s) { closedIds[s.id] = true; });
  var missing = ids.filter(function (id) { return !closedIds[id]; });
  return {
    complete: missing.length === 0,
    presentCount: ids.length - missing.length,
    expectedCount: ids.length,
    missingCount: missing.length,
    missingIds: missing
  };
}

function zdcIsMasterArchival(store, master) {
  if (!master || !store) return false;
  var latestCycle = store.cycleId - 1;
  if (master.cycleId < latestCycle) return true;
  return !zdcMasterArchiveIntegrity(store, master).complete;
}

function zdcMasterTitle(store, master) {
  if (!master) return '';
  if (zdcIsMasterArchival(store, master)) {
    return 'Archívny Master Report pre cyklus #' + master.cycleId;
  }
  return 'Master Report pre cyklus #' + master.cycleId;
}

/* ── Krok 5: patterny a opakované následnosti ── */

function zdcRepeatedFollowsForTrigger(spins, triggerNum) {
  var map = {};
  var i;
  for (i = 0; i < spins.length - 1; i++) {
    if (spins[i] === triggerNum) {
      var next = spins[i + 1];
      map[next] = (map[next] || 0) + 1;
    }
  }
  var out = [];
  Object.keys(map).forEach(function (k) {
    var c = map[k];
    if (c >= ZDC_PATTERN_MIN_REPEAT) out.push('číslo ' + k + ' (' + c + '×)');
  });
  out.sort();
  return out;
}

function zdcDetectRepeatedPairs(spins) {
  var counts = {};
  var i, key, out = [];
  for (i = 0; i < spins.length - 1; i++) {
    key = spins[i] + '\u2192' + spins[i + 1];
    counts[key] = (counts[key] || 0) + 1;
  }
  Object.keys(counts).forEach(function (k) {
    if (counts[k] >= ZDC_PATTERN_MIN_REPEAT) {
      var p = k.split('\u2192');
      out.push({
        count: counts[k],
        text: 'Dvojica ' + p[0] + ' \u2192 ' + p[1] + ' sa v session opakovala ' + counts[k] + '\xD7'
      });
    }
  });
  out.sort(function (a, b) { return b.count - a.count; });
  return out.map(function (x) { return x.text; });
}

function zdcDetectRepeatedTriples(spins) {
  var counts = {};
  var i, key, out = [];
  for (i = 0; i < spins.length - 2; i++) {
    key = spins[i] + '\u2192' + spins[i + 1] + '\u2192' + spins[i + 2];
    counts[key] = (counts[key] || 0) + 1;
  }
  Object.keys(counts).forEach(function (k) {
    if (counts[k] >= ZDC_PATTERN_MIN_REPEAT) {
      var p = k.split('\u2192');
      out.push({
        count: counts[k],
        text: 'Trojica ' + p[0] + ' \u2192 ' + p[1] + ' \u2192 ' + p[2] + ' sa v session opakovala ' + counts[k] + '\xD7'
      });
    }
  });
  out.sort(function (a, b) { return b.count - a.count; });
  return out.map(function (x) { return x.text; });
}

function zdcDetectShortReturns(spins, maxInterval) {
  maxInterval = maxInterval == null ? ZDC_SHORT_RETURN_MAX : maxInterval;
  var table = zdcBuildReturnTable(spins);
  var out = [];
  table.forEach(function (row) {
    if (row.hitCount >= 2 && row.fastestReturn != null && row.fastestReturn <= maxInterval) {
      out.push('Číslo ' + row.number + ' sa vrátilo po krátkom intervale — najkratšia medzera ' + row.fastestReturn + ' spinov medzi výskytmi.');
    }
  });
  out.sort(function (a, b) {
    var na = parseInt(a.match(/Číslo (\d+)/)[1], 10);
    var nb = parseInt(b.match(/Číslo (\d+)/)[1], 10);
    return na - nb;
  });
  return out;
}

function zdcBuildSessionPatterns(spins) {
  var pairs = zdcDetectRepeatedPairs(spins);
  var triples = zdcDetectRepeatedTriples(spins);
  var shortReturns = zdcDetectShortReturns(spins);
  var repeatedFollowNotes = [];
  var n, rf;
  for (n = 0; n <= 36; n++) {
    rf = zdcRepeatedFollowsForTrigger(spins, n);
    if (rf.length) {
      repeatedFollowNotes.push('Po čísle ' + n + ' sa opakovali následnosti: ' + rf.join(', ') + '.');
    }
  }
  var all = repeatedFollowNotes.concat(pairs).concat(triples).concat(shortReturns);
  return {
    repeatedPairs: pairs,
    repeatedTriples: triples,
    shortReturns: shortReturns,
    repeatedFollowNotes: repeatedFollowNotes,
    patterns: all
  };
}

function zdcMaxStreak(spins, matchFn) {
  var best = 0, cur = 0, i;
  for (i = 0; i < spins.length; i++) {
    if (matchFn(spins[i])) { cur++; if (cur > best) best = cur; }
    else cur = 0;
  }
  return best;
}

function zdcAggregateSpinProps(spins) {
  var o = { red: 0, black: 0, green: 0, even: 0, odd: 0, low: 0, high: 0, d1: 0, d2: 0, d3: 0, c1: 0, c2: 0, c3: 0 };
  spins.forEach(function (n) {
    if (n === 0) { o.green++; return; }
    if (reds.includes(n)) o.red++; else o.black++;
    if (n % 2 === 0) o.even++; else o.odd++;
    if (n >= 1 && n <= 18) o.low++; else if (n >= 19 && n <= 36) o.high++;
    var dz = getDozen(n);
    if (dz === 0) o.d1++; else if (dz === 1) o.d2++; else o.d3++;
    var cl = getColumn(n);
    if (cl === 0) o.c1++; else if (cl === 1) o.c2++; else o.c3++;
  });
  return o;
}

function zdcBuildOverview(spins) {
  var counts = zdcHitCounts(spins);
  var hot = [], cold = [], missing = [], ranked = [], n;
  for (n = 0; n <= 36; n++) {
    if (counts[n] >= ZDC_HOT_MIN) hot.push(n);
    if (counts[n] <= ZDC_COLD_MAX) cold.push(n);
    if (!counts[n]) missing.push(n);
    if (counts[n] > 0) ranked.push({ n: n, count: counts[n] });
  }
  ranked.sort(function (a, b) { return b.count - a.count || a.n - b.n; });
  var streakDefs = [
    { label: 'červená', fn: function (x) { return x !== 0 && reds.includes(x); } },
    { label: 'čierna', fn: function (x) { return x !== 0 && !reds.includes(x); } },
    { label: 'malé', fn: function (x) { return x >= 1 && x <= 18; } },
    { label: 'veľké', fn: function (x) { return x >= 19 && x <= 36; } },
    { label: 'párne', fn: function (x) { return x !== 0 && x % 2 === 0; } },
    { label: 'nepárne', fn: function (x) { return x !== 0 && x % 2 === 1; } },
    { label: '1. tucet', fn: function (x) { return x !== 0 && getDozen(x) === 0; } },
    { label: '2. tucet', fn: function (x) { return x !== 0 && getDozen(x) === 1; } },
    { label: '3. tucet', fn: function (x) { return x !== 0 && getDozen(x) === 2; } },
    { label: '1. stĺpec', fn: function (x) { return x !== 0 && getColumn(x) === 0; } },
    { label: '2. stĺpec', fn: function (x) { return x !== 0 && getColumn(x) === 1; } },
    { label: '3. stĺpec', fn: function (x) { return x !== 0 && getColumn(x) === 2; } }
  ];
  var maxStreaks = streakDefs.map(function (d) {
    return { label: d.label, length: zdcMaxStreak(spins, d.fn) };
  }).filter(function (s) { return s.length >= 2; });
  return {
    hotNumbers: hot,
    coldNumbers: cold,
    topNumbers: ranked.slice(0, 8),
    rareNumbers: ranked.filter(function (r) { return r.count <= ZDC_COLD_MAX; }).map(function (r) { return r.n; }),
    missing: missing,
    colors: zdcAggregateSpinProps(spins),
    maxStreaks: maxStreaks
  };
}

function zdcRankTop5Anomalies(spins, table, overview) {
  var cand = [], i;
  overview.maxStreaks.forEach(function (s) {
    if (s.length >= 6) cand.push({ score: s.length * 3, text: s.length + '× ' + s.label + ' po sebe' });
  });
  overview.missing.forEach(function (n) {
    cand.push({ score: 85, text: 'Číslo ' + n + ' nepadlo ani raz (' + spins.length + ' spinov)' });
  });
  table.forEach(function (row) {
    if (row.followCount >= 5 && row.strongBonds.length) {
      row.strongBonds.forEach(function (b) {
        var pct = b === 'červená' ? row.redPct : b === 'čierna' ? row.blackPct : b === 'malé' ? row.lowPct : b === 'veľké' ? row.highPct : 0;
        cand.push({ score: 60 + pct / 2, text: 'Po čísle ' + row.number + ' išlo často ' + b + ' (' + pct + ' %, pozorovaní ' + row.followCount + ')' });
      });
    }
  });
  var eligible = spins.length - spins.filter(function (x) { return x === 0; }).length;
  [['1. tucet', overview.colors.d1], ['2. tucet', overview.colors.d2], ['3. tucet', overview.colors.d3]].forEach(function (pair) {
    var exp = eligible / 3;
    if (exp > 5 && pair[1] < exp * 0.5) cand.push({ score: 55, text: pair[0] + ' bol v session výrazne podpriemerný' });
  });
  cand.sort(function (a, b) { return b.score - a.score; });
  var out = [], seen = {};
  for (i = 0; i < cand.length && out.length < 5; i++) {
    if (seen[cand[i].text]) continue;
    seen[cand[i].text] = 1;
    out.push(cand[i].text);
  }
  return out;
}

function zdcSessionCharacter(overview, top5) {
  var maxS = 0, dom = overview.maxStreaks[0];
  overview.maxStreaks.forEach(function (s) { if (s.length > maxS) { maxS = s.length; dom = s; } });
  var n = overview.colors.red + overview.colors.black + overview.colors.green;
  var redPct = n ? overview.colors.red / n * 100 : 0;
  var char = 'Vyrovnaná session', detail = 'Rozloženie spinov pôsobilo relatívne rovnomerne.';
  if (maxS >= 10) { char = 'Trendová session'; detail = 'V session sa objavila dlhá séria (' + dom.label + ', ' + maxS + '× po sebe).'; }
  else if (top5.length >= 4) { char = 'Extrémna session'; detail = 'Session mala viac výrazných odchýlok naraz.'; }
  else if (maxS >= 6) { char = 'Trendová session'; detail = 'Niekoľko delších sérií ovplyvnilo charakter session.'; }
  if (redPct > 58 || (100 - redPct - overview.colors.green / n * 100) > 58) {
    if (char === 'Vyrovnaná session') { char = 'Session s dominanciou farieb'; detail = 'Farba mala v session výraznejšiu váhu.'; }
  }
  return { sessionCharacter: char, sessionCharacterDetail: detail };
}

function zdcHumanSessionSummary(session, overview, top5, char) {
  var tier = session.tier === 'extended' ? 'rozšírená' : 'plnohodnotná';
  var parts = [
    'Session ' + session.number + ' (' + tier + ', ' + session.spinCount + ' spinov, ' + session.sampleQuality + ').'
  ];
  if (overview.topNumbers.length) parts.push('Najčastejšie padalo číslo ' + overview.topNumbers[0].n + ' (' + overview.topNumbers[0].count + '×).');
  if (top5.length) parts.push('Výrazné: ' + top5[0] + '.');
  parts.push(char.sessionCharacterDetail);
  return parts.join(' ');
}

function zdcMergeTriggerTables(sessions) {
  var merged = [];
  var n, si, sess, row, m, key;
  for (n = 0; n <= 36; n++) {
    m = zdcEmptyTriggerRow(n);
    var totalFollow = 0;
    var nextAgg = {};
    var redT = 0, blackT = 0, zeroT = 0;
    sessions.forEach(function (s) {
      if (!s.report || !s.report.triggerTable) return;
      row = s.report.triggerTable[n];
      m.hitCount += row.hitCount;
      m.followCount += row.followCount;
      totalFollow += row.followCount;
      Object.keys(row.nextNumbers).forEach(function (k) {
        nextAgg[k] = (nextAgg[k] || 0) + row.nextNumbers[k];
      });
      redT += row.redPct * row.followCount / 100;
      blackT += row.blackPct * row.followCount / 100;
      zeroT += row.zeroPct * row.followCount / 100;
    });
    m.nextNumbers = nextAgg;
    m.nextNumbersText = zdcFormatNextMap(nextAgg);
    var top = zdcTopFromMap(nextAgg, 3);
    m.top3Next = top.map(function (x) { return x.n; });
    m.topNext = top.length ? top[0].n : null;
    if (totalFollow > 0) {
      m.redPct = zdcPct(redT, totalFollow);
      m.blackPct = zdcPct(blackT, totalFollow);
      m.zeroPct = zdcPct(zeroT, totalFollow);
    }
    m.sampleConfidence = zdcSampleConfidence(m.followCount);
    var bonds = zdcBondAnalysis(m);
    m.strongBonds = bonds.strongBonds;
    m.weakBonds = bonds.weakBonds;
    m.rareAfter = bonds.rareAfter;
    m.humanComment = zdcHumanTriggerComment(m);
    merged.push(m);
  }
  return merged;
}

function zdcBuildMasterHighlights(sessions, masterTable) {
  var cand = [], n, i;
  masterTable.forEach(function (row) {
    if (row.followCount < 6) return;
    row.strongBonds.forEach(function (b) {
      var pct = zdcBondPct(row, b);
      if (pct >= 55) {
        cand.push({
          score: pct + row.followCount * 0.4,
          text: 'Po čísle ' + row.number + ' išlo ' + b + ' v ' + pct + ' % prípadov naprieč celým zberom (' + row.followCount + ' pozorovaní).'
        });
      }
    });
    if (row.followCount >= 10) {
      [['3. tucet', row.dozen3Pct], ['2. tucet', row.dozen2Pct], ['1. tucet', row.dozen1Pct],
        ['veľké', row.highPct], ['malé', row.lowPct], ['čierna', row.blackPct], ['červená', row.redPct]].forEach(function (pair) {
        if (pair[1] >= 58) {
          cand.push({ score: pair[1] + 15, text: 'Číslo ' + row.number + ' najčastejšie otváralo ' + pair[0] + ' (' + pair[1] + ' %).' });
        }
      });
    }
  });
  sessions.forEach(function (s) {
    if (!s.report || !s.report.summary) return;
    (s.report.summary.maxStreaks || []).forEach(function (st) {
      if (st.length >= 6) {
        cand.push({ score: st.length * 5, text: 'Session ' + s.number + ' obsahovala ' + st.length + '× ' + st.label + ' po sebe.' });
      }
    });
    if (s.report.top5Anomalies && s.report.top5Anomalies[0]) {
      cand.push({ score: 48, text: 'Session ' + s.number + ': ' + s.report.top5Anomalies[0] });
    }
  });
  var hits = [];
  for (n = 0; n <= 36; n++) hits[n] = 0;
  sessions.forEach(function (s) {
    var c = zdcHitCounts(s.spins || []);
    for (n = 0; n <= 36; n++) hits[n] += c[n];
  });
  var minN = null, minC = Infinity;
  for (n = 0; n <= 36; n++) {
    if (hits[n] < minC) { minC = hits[n]; minN = n; }
  }
  if (minN !== null && sessions.length >= 2) {
    cand.push({ score: 90 - minC * 2, text: 'Číslo ' + minN + ' bolo najväčší spáč zberu (celkom ' + minC + '× za ' + sessions.length + ' session).' });
  }
  cand.sort(function (a, b) { return b.score - a.score; });
  var out = [], seen = {};
  for (i = 0; i < cand.length && out.length < 10; i++) {
    if (seen[cand[i].text]) continue;
    seen[cand[i].text] = 1;
    out.push(cand[i].text);
  }
  return out;
}

function zdcBuildSessionComparison(sessions) {
  return sessions.slice().sort(function (a, b) { return a.number - b.number; }).map(function (s) {
    var rep = s.report || {};
    var sum = rep.summary || {};
    var topN = sum.topNumbers && sum.topNumbers[0] ? sum.topNumbers[0].n : '—';
    return {
      number: s.number,
      spinCount: s.spinCount,
      sampleQuality: (rep.metadata && rep.metadata.sampleQuality) || s.sampleQuality || '',
      sessionCharacter: rep.sessionCharacter || '',
      topNumber: topN,
      patternCount: (rep.patterns || []).length
    };
  });
}

function zdcBuildStabilityRanking(sessions) {
  var ranking = [], n, sessWithData, topCounts, best, bestNext, score;
  for (n = 0; n <= 36; n++) {
    topCounts = {};
    sessWithData = 0;
    sessions.forEach(function (s) {
      if (!s.report || !s.report.triggerTable) return;
      var row = s.report.triggerTable[n];
      if (!row || row.followCount < 3) return;
      sessWithData++;
      if (row.topNext != null) topCounts[row.topNext] = (topCounts[row.topNext] || 0) + 1;
    });
    if (sessWithData < 2) continue;
    best = 0;
    bestNext = null;
    Object.keys(topCounts).forEach(function (k) {
      if (topCounts[k] > best) { best = topCounts[k]; bestNext = +k; }
    });
    score = Math.round((best / sessWithData) * 100);
    ranking.push({
      number: n,
      stabilityScore: score,
      sessionsWithData: sessWithData,
      dominantNext: bestNext,
      text: 'Po čísle ' + n + ' bolo v ' + score + ' % session rovnaké top následné číslo (' + bestNext + ').'
    });
  }
  ranking.sort(function (a, b) { return b.stabilityScore - a.stabilityScore || b.sessionsWithData - a.sessionsWithData; });
  return ranking.slice(0, 12);
}

function zdcBuildCrossSessionBonds(masterTable) {
  var strong = [], weak = [];
  masterTable.forEach(function (row) {
    if (row.followCount < 8) return;
    if (row.strongBonds && row.strongBonds.length) {
      strong.push('Po čísle ' + row.number + ': ' + row.strongBonds.join(', '));
    }
    if (row.weakBonds && row.weakBonds.length) {
      weak.push('Po čísle ' + row.number + ' slabé: ' + row.weakBonds.join(', '));
    }
  });
  return { crossSessionStrong: strong.slice(0, 15), crossSessionWeak: weak.slice(0, 10) };
}

function zdcHumanMasterSummary(sessions, masterTable, highlights, comparison, stability, bonds, cycleId) {
  var totalSpins = 0;
  sessions.forEach(function (s) { totalSpins += s.spinCount || 0; });
  var parts = [
    'Master Report pre cyklus #' + cycleId + ' — finálne vyhodnotenie ' + sessions.length + ' session, spolu ' + totalSpins + ' spinov z reálnej rulety.'
  ];
  if (stability.length) {
    parts.push('Najstabilnejšie následné správanie malo číslo ' + stability[0].number + ' (rovnaké top následné číslo v ' + stability[0].stabilityScore + ' % session).');
  }
  if (bonds.crossSessionStrong.length) {
    parts.push('Silné väzby naprieč zberom: ' + bonds.crossSessionStrong.slice(0, 2).join('; ') + '.');
  }
  if (highlights.length) parts.push('Najvýraznejšie: ' + highlights[0]);
  if (comparison.length) {
    var chars = {};
    comparison.forEach(function (c) { if (c.sessionCharacter) chars[c.sessionCharacter] = (chars[c.sessionCharacter] || 0) + 1; });
    var domChar = Object.keys(chars).sort(function (a, b) { return chars[b] - chars[a]; })[0];
    if (domChar) parts.push('Prevaha session typu „' + domChar + '“.');
  }
  parts.push('Toto je súhrn minulosti — nie predikcia ďalšieho spinu.');
  return parts.join(' ');
}

function zdcBuildMasterReport(closedSessions, cycleId) {
  var sessions = closedSessions.slice(-ZDC_MAX_SESSIONS);
  var totalSpins = 0;
  sessions.forEach(function (s) { totalSpins += s.spinCount || 0; });
  var resolvedCycleId = cycleId != null ? cycleId : (sessions[0] ? sessions[0].cycleId : 1);
  var masterTable = zdcMergeTriggerTables(sessions);
  var highlights = zdcBuildMasterHighlights(sessions, masterTable);
  var sessionComparison = zdcBuildSessionComparison(sessions);
  var stabilityRanking = zdcBuildStabilityRanking(sessions);
  var bonds = zdcBuildCrossSessionBonds(masterTable);
  return {
    cycleId: resolvedCycleId,
    title: 'Master Report pre cyklus #' + resolvedCycleId,
    generatedAt: zdcNowIso(),
    sessionCount: sessions.length,
    totalSpins: totalSpins,
    sourceSessionIds: sessions.map(function (s) { return s.id; }),
    sourceSessionNumbers: sessions.map(function (s) { return s.number; }),
    masterTriggerTable: masterTable,
    top10Highlights: highlights,
    sessionComparison: sessionComparison,
    stabilityRanking: stabilityRanking,
    crossSessionStrong: bonds.crossSessionStrong,
    crossSessionWeak: bonds.crossSessionWeak,
    humanSummary: zdcHumanMasterSummary(sessions, masterTable, highlights, sessionComparison, stabilityRanking, bonds, resolvedCycleId)
  };
}

function zdcBuildSessionReport(session) {
  var spins = session.spins.slice();
  var overview = zdcBuildOverview(spins);
  var triggerTable = zdcBuildTriggerTable(spins);
  var top5 = zdcRankTop5Anomalies(spins, triggerTable, overview);
  var char = zdcSessionCharacter(overview, top5);
  var patternData = zdcBuildSessionPatterns(spins);
  var returnTable = zdcBuildReturnTable(spins);
  return {
    sessionId: session.id,
    generatedAt: zdcNowIso(),
    metadata: {
      sessionId: session.id,
      sessionNumber: session.number,
      createdAt: session.createdAt,
      closedAt: session.closedAt,
      reportGeneratedAt: session.reportGeneratedAt || zdcNowIso(),
      spinCount: spins.length,
      sampleQuality: session.sampleQuality || zdcSampleQualityLabel(spins.length),
      tier: session.tier
    },
    summary: {
      spinCount: spins.length,
      tier: session.tier,
      sampleQuality: session.sampleQuality,
      spinListText: zdcSpinsToText(spins),
      hotNumbers: overview.hotNumbers,
      coldNumbers: overview.coldNumbers,
      topNumbers: overview.topNumbers,
      rareNumbers: overview.rareNumbers,
      missing: overview.missing,
      colors: overview.colors,
      maxStreaks: overview.maxStreaks
    },
    triggerTable: triggerTable,
    returnTable: returnTable,
    returnHighlights: zdcBuildReturnHighlights(returnTable),
    patterns: patternData.patterns,
    repeatedPairs: patternData.repeatedPairs,
    repeatedTriples: patternData.repeatedTriples,
    shortReturns: patternData.shortReturns,
    repeatedFollowNotes: patternData.repeatedFollowNotes,
    top5Anomalies: top5,
    sessionCharacter: char.sessionCharacter,
    sessionCharacterDetail: char.sessionCharacterDetail,
    humanSummary: zdcHumanSessionSummary(session, overview, top5, char)
  };
}

/* ── Export pre testy a neskorší UI hook ── */

if (typeof window !== 'undefined') {
  window.zdcNewStore = zdcNewStore;
  window.zdcLoadStore = zdcLoadStore;
  window.zdcSaveStore = zdcSaveStore;
  window.zdcOnSpin = zdcOnSpin;
  window.zdcUndoLastSpin = zdcUndoLastSpin;
  window.zdcCloseSession = zdcCloseSession;
  window.zdcMasterArchiveIntegrity = zdcMasterArchiveIntegrity;
  window.zdcIsMasterArchival = zdcIsMasterArchival;
  window.zdcMasterTitle = zdcMasterTitle;
  window.zdcBuildReturnHighlights = zdcBuildReturnHighlights;
  window.zdcCanCloseSession = zdcCanCloseSession;
  window.zdcGetFifoDropCandidate = zdcGetFifoDropCandidate;
  window.zdcWillFifoDropOnClose = zdcWillFifoDropOnClose;
  window.zdcBuildTriggerTable = zdcBuildTriggerTable;
  window.zdcBuildReturnTable = zdcBuildReturnTable;
  window.zdcBuildSessionReport = zdcBuildSessionReport;
  window.zdcBuildMasterReport = zdcBuildMasterReport;
  window.zdcRawRowsFromSessions = zdcRawRowsFromSessions;
  window.zdcHitCounts = zdcHitCounts;
  window.zdcSampleQualityLabel = zdcSampleQualityLabel;
  window.zdcFormatDateSk = zdcFormatDateSk;
  window.zdcSpinsToText = zdcSpinsToText;
  window.ZDC_MIN_SPINS = ZDC_MIN_SPINS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ZDC_MIN_SPINS: ZDC_MIN_SPINS,
    ZDC_MAX_SESSIONS: ZDC_MAX_SESSIONS,
    zdcNewStore: zdcNewStore,
    zdcNewSession: zdcNewSession,
    zdcLoadStore: zdcLoadStore,
    zdcSaveStore: zdcSaveStore,
    zdcOnSpin: zdcOnSpin,
    zdcUndoLastSpin: zdcUndoLastSpin,
    zdcCloseSession: zdcCloseSession,
    zdcMasterArchiveIntegrity: zdcMasterArchiveIntegrity,
    zdcIsMasterArchival: zdcIsMasterArchival,
    zdcMasterTitle: zdcMasterTitle,
    zdcBuildReturnHighlights: zdcBuildReturnHighlights,
    zdcGetFifoDropCandidate: zdcGetFifoDropCandidate,
    zdcWillFifoDropOnClose: zdcWillFifoDropOnClose,
    zdcBuildStabilityRanking: zdcBuildStabilityRanking,
    zdcBuildSessionComparison: zdcBuildSessionComparison,
    zdcBuildCrossSessionBonds: zdcBuildCrossSessionBonds,
    zdcCanCloseSession: zdcCanCloseSession,
    zdcBuildTriggerTable: zdcBuildTriggerTable,
    zdcBuildTriggerRow: zdcBuildTriggerRow,
    zdcBuildReturnTable: zdcBuildReturnTable,
    zdcRepeatedFollowsForTrigger: zdcRepeatedFollowsForTrigger,
    zdcDetectRepeatedPairs: zdcDetectRepeatedPairs,
    zdcDetectRepeatedTriples: zdcDetectRepeatedTriples,
    zdcDetectShortReturns: zdcDetectShortReturns,
    zdcBuildSessionPatterns: zdcBuildSessionPatterns,
    zdcBuildSessionReport: zdcBuildSessionReport,
    zdcBuildMasterReport: zdcBuildMasterReport,
    zdcSampleQualityLabel: zdcSampleQualityLabel,
    zdcBuildMasterHighlights: zdcBuildMasterHighlights,
    zdcFormatDateSk: zdcFormatDateSk,
    zdcSampleConfidence: zdcSampleConfidence,
    zdcRawRowsFromSessions: zdcRawRowsFromSessions,
    zdcHitCounts: zdcHitCounts
  };
}
