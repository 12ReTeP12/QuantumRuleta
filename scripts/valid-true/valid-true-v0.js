/* TRUE VALID V0 — read-only meracia vrstva (nemení AI / wheel / enginy). */
'use strict';

(function (global) {
  const SCHEMA = 'valid-true-v0';
  const BASELINE_COLUMN = 12 / 37;
  const MAX_LINES = 10000;
  const LS_KEY = 'validTrueV0Buffer';

  let sessionId = null;
  let seq = 0;
  let lines = [];
  let aggregates = null;

  function uuid() {
    return 'vt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function isEnabled() {
    if (global.__validTrueDisabled) return false;
    try {
      const p = new URLSearchParams(global.location.search);
      if (p.get('validTrue') === '0') return false;
    } catch (e) { /* ignore */ }
    return true;
  }

  function readPlayGate() {
    if (typeof computeConfidenceEngine !== 'function') return null;
    try {
      return computeConfidenceEngine();
    } catch (e) {
      return null;
    }
  }

  function readPick() {
    return typeof predLastPick !== 'undefined' ? predLastPick : null;
  }

  /** Len cache / globály — nikdy nevolá computeQuantumWheelBrain ani render. */
  function readWheelContextSnapshot() {
    try {
      if (typeof lastQuantumWheelBrain !== 'undefined' && lastQuantumWheelBrain && lastQuantumWheelBrain.ready) {
        const Q = lastQuantumWheelBrain;
        return {
          waitMode: !!(Q.scanner && Q.scanner.waitMode),
          phase: Q.flowLife && Q.flowLife.phase ? Q.flowLife.phase : null,
          chaosLevel: Q.chaosLevel != null ? Q.chaosLevel : null
        };
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function readLegacyCombinedHit() {
    if (typeof lastSpinScoreMetrics !== 'undefined' && lastSpinScoreMetrics) {
      return lastSpinScoreMetrics.hitCluster ? 'hit' : 'miss';
    }
    return null;
  }

  function classifySignal(gate, pick) {
    if (!gate) return { code: 'UNKNOWN', officialPlay: false };
    if (gate.learn) return { code: 'LEARN', officialPlay: false };
    if (gate.status === 'ČAKAJ') return { code: 'WAIT', officialPlay: false };
    if (gate.status === 'OPATRNE') return { code: 'CAUTION', officialPlay: false };
    if (gate.status === 'HRAŤ' && pick && pick.col >= 0) return { code: 'PLAY', officialPlay: true };
    if (gate.status === 'HRAŤ') return { code: 'PLAY_NO_PICK', officialPlay: false };
    return { code: 'OTHER', officialPlay: false };
  }

  function labelHit(hit, scored) {
    if (!scored) return 'excluded';
    return hit ? 'hit' : 'miss';
  }

  function initSession(force) {
    if (sessionId && !force) return;
    sessionId = uuid();
    seq = 0;
    lines = [];
    aggregates = null;
    const meta = {
      type: 'meta',
      schemaVersion: SCHEMA,
      sessionId: sessionId,
      startedAt: new Date().toISOString(),
      sourceFile: 'index-NOVY-V2.html',
      officialVerdict: 'COLUMN_ONLY',
      officialHit: 'COLUMN_ONLY',
      supplementaryMetrics: ['DOZEN', 'CLUSTER', 'SECTOR'],
      baselineColumnPct: +(BASELINE_COLUMN * 100).toFixed(2)
    };
    try {
      const el = global.document && global.document.querySelector('[data-qw-file]');
      if (el) meta.dataQwFile = el.getAttribute('data-qw-file');
      const rd = global.document.getElementById('wheelRadarData');
      if (rd && rd.dataset && rd.dataset.qwDomBuild) meta.appBuild = rd.dataset.qwDomBuild;
    } catch (e) { /* ignore */ }
    lines.push(meta);
  }

  function pushSpin(record) {
    if (lines.length >= MAX_LINES) lines.shift();
    lines.push(record);
    aggregates = null;
    try {
      global.localStorage.setItem(LS_KEY, JSON.stringify(lines.slice(-500)));
    } catch (e) { /* ignore */ }
  }

  function resetSession() {
    initSession(true);
  }

  function onSpinScored(spinNumber) {
    if (!isEnabled()) return null;
    if (spinNumber == null || spinNumber < 0) return null;
    initSession(false);

    const gate = readPlayGate();
    const pick = readPick();
    const signal = classifySignal(gate, pick);
    const focus = typeof lastFlowFocus !== 'undefined' ? lastFlowFocus : null;
    const clusterNums = typeof lastPrediction !== 'undefined' && Array.isArray(lastPrediction) ? lastPrediction : [];

    const ci = typeof getColumn === 'function' ? getColumn(spinNumber) : -1;
    const di = typeof getDozen === 'function' ? getDozen(spinNumber) : -1;

    const scoredColumn = signal.officialPlay && pick && pick.col >= 0 && spinNumber > 0;
    const columnHit = scoredColumn && ci >= 0 && ci === pick.col;

    const scoredDozen = pick && pick.doz >= 0 && spinNumber > 0;
    const dozenHit = scoredDozen && di >= 0 && di === pick.doz;

    const scoredCluster = clusterNums.length > 0 && spinNumber > 0;
    const clusterHit = scoredCluster && clusterNums.indexOf(spinNumber) >= 0;

    const scoredSector = !!(focus && focus.nums && focus.nums.length && spinNumber > 0);
    const sectorHit =
      scoredSector &&
      typeof flowSectorHit === 'function' &&
      flowSectorHit(spinNumber, focus);

    let chaosLevel = null;
    let noEdge = null;
    if (typeof analyzeChaosFromSpins === 'function' && typeof spins !== 'undefined' && spins.length >= 2) {
      try {
        const c = analyzeChaosFromSpins();
        chaosLevel = c.chaosLevel;
        noEdge = !!c.noEdge;
      } catch (e) { /* ignore */ }
    }

    const legacyHit = readLegacyCombinedHit();
    const wheelCtx = readWheelContextSnapshot();

    seq += 1;
    const record = {
      type: 'spin',
      schemaVersion: SCHEMA,
      sessionId: sessionId,
      seq: seq,
      ts: new Date().toISOString(),
      spin: {
        number: spinNumber,
        column: ci,
        dozen: di
      },
      signal: {
        code: signal.code,
        playGate: gate
          ? {
              status: gate.status,
              playMode: gate.playMode,
              chaosPct: gate.chaosPct,
              learn: !!gate.learn,
              allowPlay: !!gate.allowPlay
            }
          : null,
        primary: pick
          ? { col: pick.col, doz: pick.doz, colLabel: pick.colPick || null, dozLabel: pick.dozPick || null }
          : null
      },
      outcome: {
        column: labelHit(columnHit, scoredColumn),
        dozen: labelHit(dozenHit, scoredDozen),
        cluster: labelHit(clusterHit, scoredCluster),
        sector: labelHit(sectorHit, scoredSector),
        legacyCombined: legacyHit != null ? legacyHit : 'excluded'
      },
      context: {
        totalSpinsBefore: typeof spins !== 'undefined' ? spins.length : null,
        entropy: typeof entropy === 'function' ? parseFloat(entropy()) || null : null,
        chaosLevel: chaosLevel,
        noEdge: noEdge,
        clusterSize: clusterNums.length,
        sectorSize: focus && focus.nums ? focus.nums.length : 0,
        wheel: wheelCtx
      }
    };

    pushSpin(record);
    return record;
  }

  function getSpinRecords() {
    return lines.filter(function (r) {
      return r && r.type === 'spin';
    });
  }

  function rate(hits, n) {
    if (!n) return null;
    return +(hits / n * 100).toFixed(2);
  }

  function wilsonInterval(hits, n, z) {
    z = z || 1.96;
    if (!n) return null;
    const p = hits / n;
    const den = 1 + (z * z) / n;
    const centre = p + (z * z) / (2 * n);
    const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
    return {
      low: +(((centre - margin) / den) * 100).toFixed(2),
      high: +(((centre + margin) / den) * 100).toFixed(2)
    };
  }

  function buildReport() {
    const spins = getSpinRecords();
    const agg = {
      schemaVersion: SCHEMA,
      sessionId: sessionId,
      officialHit: 'COLUMN_ONLY',
      baselineColumnPct: +(BASELINE_COLUMN * 100).toFixed(2),
      nSpins: spins.length,
      column: { hits: 0, misses: 0, excluded: 0 },
      dozen: { hits: 0, misses: 0, excluded: 0 },
      cluster: { hits: 0, misses: 0, excluded: 0 },
      sector: { hits: 0, misses: 0, excluded: 0 },
      bySignal: {},
      byChaosBucket: { low: { n: 0, colHits: 0, colScored: 0 }, mid: { n: 0, colHits: 0, colScored: 0 }, high: { n: 0, colHits: 0, colScored: 0 } },
      legacy: { hits: 0, misses: 0 },
      falsePositive: { playMiss: 0, playScored: 0 }
    };

    spins.forEach(function (r) {
      const sc = r.signal.code;
      if (!agg.bySignal[sc]) agg.bySignal[sc] = { n: 0, columnHits: 0, columnScored: 0 };
      agg.bySignal[sc].n += 1;
      if (r.outcome.column === 'hit') {
        agg.bySignal[sc].columnHits += 1;
        agg.bySignal[sc].columnScored += 1;
      } else if (r.outcome.column === 'miss') {
        agg.bySignal[sc].columnScored += 1;
      }

      const chaos = r.context.chaosLevel != null ? r.context.chaosLevel : 50;
      const bucket = chaos >= 70 ? 'high' : chaos >= 50 ? 'mid' : 'low';
      agg.byChaosBucket[bucket].n += 1;
      if (r.outcome.column === 'hit') {
        agg.byChaosBucket[bucket].colHits += 1;
        agg.byChaosBucket[bucket].colScored += 1;
      } else if (r.outcome.column === 'miss') {
        agg.byChaosBucket[bucket].colScored += 1;
      }

      if (r.outcome.legacyCombined === 'hit') agg.legacy.hits += 1;
      else if (r.outcome.legacyCombined === 'miss') agg.legacy.misses += 1;

      ['column', 'dozen', 'cluster', 'sector'].forEach(function (k) {
        const o = r.outcome[k];
        if (o === 'hit') agg[k].hits += 1;
        else if (o === 'miss') agg[k].misses += 1;
        else agg[k].excluded += 1;
      });
    });

    spins.forEach(function (r) {
      if (r.signal.code === 'PLAY' && (r.outcome.column === 'hit' || r.outcome.column === 'miss')) {
        agg.falsePositive.playScored += 1;
        if (r.outcome.column === 'miss') agg.falsePositive.playMiss += 1;
      }
    });
    agg.falsePositive.ratePct =
      agg.falsePositive.playScored > 0
        ? +((agg.falsePositive.playMiss / agg.falsePositive.playScored) * 100).toFixed(2)
        : null;

    const nLegacy = agg.legacy.hits + agg.legacy.misses;

    const nCol = agg.column.hits + agg.column.misses;
    const colRate = rate(agg.column.hits, nCol);
    const colWilson = wilsonInterval(agg.column.hits, nCol);
    const edgePp = colRate != null ? +(colRate - BASELINE_COLUMN * 100).toFixed(2) : null;

    let edgeVerdict = 'unknown';
    if (nCol < 100) edgeVerdict = 'unknown';
    else if (edgePp != null && edgePp < 2) edgeVerdict = 'unlikely';
    else if (edgePp != null && edgePp >= 5 && colWilson && colWilson.low > BASELINE_COLUMN * 100) edgeVerdict = 'possible';
    else if (edgePp != null && edgePp >= 8 && nCol >= 300) edgeVerdict = 'likely';

    const report = {
      generatedAt: new Date().toISOString(),
      officialVerdict: 'COLUMN_ONLY',
      aggregates: agg,
      rates: {
        column: {
          hitRatePct: colRate,
          nScored: nCol,
          wilson95: colWilson,
          vsBaselinePp: edgePp
        },
        dozen: {
          hitRatePct: rate(agg.dozen.hits, agg.dozen.hits + agg.dozen.misses),
          nScored: agg.dozen.hits + agg.dozen.misses
        },
        cluster: {
          hitRatePct: rate(agg.cluster.hits, agg.cluster.hits + agg.cluster.misses),
          nScored: agg.cluster.hits + agg.cluster.misses
        },
        sector: {
          hitRatePct: rate(agg.sector.hits, agg.sector.hits + agg.sector.misses),
          nScored: agg.sector.hits + agg.sector.misses
        },
        legacyCombined: {
          hitRatePct: rate(agg.legacy.hits, nLegacy),
          nScored: nLegacy
        }
      },
      falsePositiveRatePct: agg.falsePositive.ratePct,
      hitRateColumnBySignal: agg.bySignal,
      hitRateColumnByChaos: agg.byChaosBucket,
      edgePrimary: edgeVerdict,
      note: 'Read-only TRUE VALID V0 — loguje, vyhodnocuje, reportuje. Nemení enginy ani UI.'
    };
    aggregates = report;
    return report;
  }

  function exportJsonl() {
    buildReport();
    return lines.map(function (r) {
      return JSON.stringify(r);
    }).join('\n');
  }

  function exportCsv() {
    const spins = getSpinRecords();
    const header =
      'seq,ts,number,col,dozen,signal,play_status,play_mode,chaos_pct,learn,' +
      'primary_col,primary_doz,outcome_column,outcome_dozen,outcome_cluster,outcome_sector';
    const rows = spins.map(function (r) {
      const g = r.signal.playGate || {};
      const p = r.signal.primary || {};
      return [
        r.seq,
        r.ts,
        r.spin.number,
        r.spin.column,
        r.spin.dozen,
        r.signal.code,
        g.status || '',
        g.playMode || '',
        g.chaosPct != null ? g.chaosPct : '',
        g.learn ? 1 : 0,
        p.col != null ? p.col : '',
        p.doz != null ? p.doz : '',
        r.outcome.column,
        r.outcome.dozen,
        r.outcome.cluster,
        r.outcome.sector
      ].join(',');
    });
    return header + '\n' + rows.join('\n');
  }

  function downloadText(filename, text, mime) {
    try {
      const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      const a = global.document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.warn('[ValidTrueV0] download failed', e);
    }
  }

  function exportJsonlFile() {
    downloadText('valid-true-' + (sessionId || 'session') + '.jsonl', exportJsonl(), 'application/jsonl');
  }

  function exportCsvFile() {
    downloadText('valid-true-' + (sessionId || 'session') + '.csv', exportCsv(), 'text/csv');
  }

  function exportSummaryFile() {
    const summary = buildReport();
    downloadText('valid-true-summary-' + (sessionId || 'session') + '.json', JSON.stringify(summary, null, 2), 'application/json');
  }

  function renderPanel() {
    if (!isEnabled()) return;
    const el = global.document.getElementById('validTruePanel');
    if (!el) return;
    const rep = buildReport();
    const col = rep.rates.column;
    let h = '<div class="section-label">TRUE VALID V0 · read-only</div>';
    h += '<p class="timing-hint">Oficiálny hit: <b>COLUMN ONLY</b> · doplnok: DOZEN, CLUSTER, SECTOR · baseline stĺpec ' + rep.baselineColumnPct + '%</p>';
    h += '<div class="panel-line"><span>Spiny v logu</span><b class="blueTxt">' + rep.aggregates.nSpins + '</b></div>';
    h += '<div class="panel-line"><span>Column hit (PLAY)</span><b class="greenTxt">' + (col.hitRatePct != null ? col.hitRatePct + '%' : '—') + ' · n=' + col.nScored + '</b></div>';
    if (col.vsBaselinePp != null) {
      h += '<div class="panel-line"><span>vs baseline</span><b class="yellowTxt">' + (col.vsBaselinePp >= 0 ? '+' : '') + col.vsBaselinePp + ' pp · ' + rep.edgePrimary + '</b></div>';
    }
    h += '<div class="panel-line"><span>False positive (PLAY miss)</span><b class="redTxt">' +
      (rep.falsePositiveRatePct != null ? rep.falsePositiveRatePct + '%' : '—') + '</b></div>';
    h += '<div class="panel-line"><span>Legacy combined</span><b class="yellowTxt">' +
      (rep.rates.legacyCombined.hitRatePct != null ? rep.rates.legacyCombined.hitRatePct + '%' : '—') +
      ' · n=' + rep.rates.legacyCombined.nScored + '</b></div>';
    h += '<div class="panel-line"><span>Dozen / cluster / sector</span><b class="blueTxt">' +
      (rep.rates.dozen.hitRatePct != null ? rep.rates.dozen.hitRatePct : '—') + '% · ' +
      (rep.rates.cluster.hitRatePct != null ? rep.rates.cluster.hitRatePct : '—') + '% · ' +
      (rep.rates.sector.hitRatePct != null ? rep.rates.sector.hitRatePct : '—') + '%</b></div>';
    h += '<div class="valid-true-actions" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">';
    h += '<button type="button" class="btn-icon-sm" id="validTrueExportJsonl">Export JSONL</button>';
    h += '<button type="button" class="btn-icon-sm" id="validTrueExportCsv">Export CSV</button>';
    h += '<button type="button" class="btn-icon-sm" id="validTrueExportSummary">Export report JSON</button>';
    h += '</div>';
    el.innerHTML = h;
    const bj = global.document.getElementById('validTrueExportJsonl');
    const bc = global.document.getElementById('validTrueExportCsv');
    const bs = global.document.getElementById('validTrueExportSummary');
    if (bj) bj.onclick = exportJsonlFile;
    if (bc) bc.onclick = exportCsvFile;
    if (bs) bs.onclick = exportSummaryFile;
  }

  function restoreFromStorage() {
    try {
      const raw = global.localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) lines = parsed;
      const meta = lines.find(function (r) {
        return r && r.type === 'meta';
      });
      if (meta && meta.sessionId) sessionId = meta.sessionId;
      const last = lines.filter(function (r) {
        return r && r.type === 'spin';
      }).pop();
      if (last) seq = last.seq;
    } catch (e) { /* ignore */ }
  }

  restoreFromStorage();

  global.ValidTrueV0 = {
    SCHEMA: SCHEMA,
    BASELINE_COLUMN: BASELINE_COLUMN,
    isEnabled: isEnabled,
    resetSession: resetSession,
    onSpinScored: onSpinScored,
    buildReport: buildReport,
    exportJsonl: exportJsonl,
    exportCsv: exportCsv,
    exportJsonlFile: exportJsonlFile,
    exportCsvFile: exportCsvFile,
    exportSummaryFile: exportSummaryFile,
    renderPanel: renderPanel,
    getSpinRecords: getSpinRecords
  };
})(typeof window !== 'undefined' ? window : global);
