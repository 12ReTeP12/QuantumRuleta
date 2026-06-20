/* zber-dat-0-36-xlsx.js — natívny .xlsx export (SheetJS), bez zmeny výpočtov */
'use strict';

(function (root, factory) {
  var api = factory(
    typeof require === 'function' ? require('xlsx') : (root.XLSX || null)
  );
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.zdcXlsxExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (XLSX) {

  function zdcXlsxNeedLib() {
    if (!XLSX || !XLSX.utils) throw new Error('Knižnica XLSX nie je načítaná.');
  }

  function zdcSheetName(name) {
    return String(name).replace(/[:\\/?*\[\]]/g, '-').slice(0, 31);
  }

  function zdcPad2(n) {
    return String(n).padStart(2, '0');
  }

  function zdcTriggerHeader() {
    return [
      'Číslo', 'Výskytov', 'Pozorovaní', 'Spoľahlivosť', 'Nasledujúce čísla', 'Top', 'Top 3',
      'Červená %', 'Čierna %', 'Nula %', 'Párne %', 'Nepárne %', 'Malé %', 'Veľké %',
      '1. tucet %', '2. tucet %', '3. tucet %', '1. stĺpec %', '2. stĺpec %', '3. stĺpec %',
      'Silné väzby', 'Slabé väzby', 'Takmer nikdy', 'Komentár'
    ];
  }

  function zdcTriggerRowToArray(row) {
    return [
      row.number,
      row.hitCount,
      row.followCount,
      row.sampleConfidence,
      row.nextNumbersText,
      row.topNext != null ? row.topNext : '',
      (row.top3Next && row.top3Next.length) ? row.top3Next.join(', ') : '',
      row.redPct, row.blackPct, row.zeroPct,
      row.evenPct, row.oddPct, row.lowPct, row.highPct,
      row.dozen1Pct, row.dozen2Pct, row.dozen3Pct,
      row.col1Pct, row.col2Pct, row.col3Pct,
      (row.strongBonds || []).join(', '),
      (row.weakBonds || []).join(', '),
      (row.rareAfter || []).join(', '),
      row.humanComment || ''
    ];
  }

  function zdcTriggerTableAoA(table) {
    var aoa = [zdcTriggerHeader()];
    (table || []).forEach(function (row) {
      aoa.push(zdcTriggerRowToArray(row));
    });
    return aoa;
  }

  function zdcMetaAoA(store, opts) {
    opts = opts || {};
    return [
      ['ZBER DÁT 0–36 — META'],
      [],
      ['Export dátum', new Date().toISOString()],
      ['Typ exportu', opts.exportType || 'celý zber'],
      ['Verzia modulu', store.version || 1],
      ['Cycle ID', store.cycleId],
      ['Počet uzavretých session', (store.closed || []).length],
      ['Aktívna session č.', store.active ? store.active.number : '—'],
      ['Master report', store.master ? 'áno' : 'nie'],
      [],
      ['Poznámka', 'Toto je archív minulých spinov — nie predikcia ďalšieho spinu.']
    ];
  }

  function zdcRawAoA(store, opts) {
    opts = opts || {};
    var header = ['session_id', 'session_č', 'cycle_id', 'poradie', 'číslo', 'vytvorená', 'uzavretá'];
    var rows = [header];
    var list = (store.closed || []).slice();
    if (!opts.singleSessionId && store.active && store.active.spins && store.active.spins.length) {
      list.push(store.active);
    }
    if (opts.singleSessionId) {
      list = list.filter(function (s) { return s.id === opts.singleSessionId; });
    }
    list.sort(function (a, b) {
      return (a.number || 0) - (b.number || 0) || String(a.id).localeCompare(String(b.id));
    });
    list.forEach(function (sess) {
      (sess.spins || []).forEach(function (num, idx) {
        rows.push([
          sess.id,
          sess.number,
          sess.cycleId,
          idx + 1,
          num,
          sess.createdAt || '',
          sess.closedAt || ''
        ]);
      });
    });
    return rows;
  }

  function zdcReturnTableAoA(returnTable, highlights) {
    var hl = highlights || { topFastestReturns: [], topLongestAbsences: [] };
    var aoa = [
      ['NÁVRATY ČÍSEL'],
      ['Číslo', 'Výskytov', 'Priemerný návrat', 'Najrýchlejší návrat', 'Najdlhšia absencia']
    ];
    (returnTable || []).forEach(function (row) {
      aoa.push([
        row.number,
        row.hitCount,
        row.avgReturn != null ? row.avgReturn : '—',
        row.fastestReturn != null ? row.fastestReturn : '—',
        row.longestAbsence
      ]);
    });
    aoa.push([]);
    aoa.push(['TOP NAJRÝCHLEJŠIE NÁVRATY']);
    (hl.topFastestReturns || []).forEach(function (r, i) {
      aoa.push([(i + 1) + '.', 'Číslo ' + r.number + ' — medzera ' + r.fastestReturn + ' spinov']);
    });
    if (!(hl.topFastestReturns || []).length) aoa.push(['—', 'Žiadne opakované návraty']);
    aoa.push([]);
    aoa.push(['TOP NAJDLHŠIE ABSENCIE']);
    (hl.topLongestAbsences || []).slice(0, 8).forEach(function (r, i) {
      aoa.push([(i + 1) + '.', 'Číslo ' + r.number + ' — chýbalo ' + r.longestAbsence + ' spinov']);
    });
    return aoa;
  }

  function zdcSessionReportAoA(sess) {
    var r = sess.report || {};
    var meta = r.metadata || {};
    var sum = r.summary || {};
    var aoa = [
      ['SESSION ' + sess.number + ' — REPORT'],
      [],
      ['METADATA SESSION'],
      ['Session ID', meta.sessionId || sess.id],
      ['Session číslo', meta.sessionNumber != null ? meta.sessionNumber : sess.number],
      ['Vytvorená', meta.createdAt || sess.createdAt || ''],
      ['Uzavretá', meta.closedAt || sess.closedAt || ''],
      ['Report vygenerovaný', meta.reportGeneratedAt || sess.reportGeneratedAt || r.generatedAt || ''],
      ['Počet spinov', meta.spinCount != null ? meta.spinCount : sess.spinCount],
      ['Kvalita vzorky', meta.sampleQuality || sess.sampleQuality || ''],
      ['Stav session', meta.tier || sess.tier || ''],
      [],
      ['ĽUDSKÝ ZÁVER SESSION'],
      [r.humanSummary || ''],
      [],
      ['Charakter session', r.sessionCharacter || ''],
      ['Detail charakteru', r.sessionCharacterDetail || ''],
      [],
      ['Hot čísla', (sum.hotNumbers || []).join(', ')],
      ['Cold čísla', (sum.coldNumbers || []).join(', ')],
      ['Nepadlo', (sum.missing || []).join(', ')],
      [],
      ['VÝRAZNÉ ZVLÁŠTNOSTI (TOP 5)']
    ];
    (r.top5Anomalies || []).forEach(function (t, i) {
      aoa.push([(i + 1) + '.', t]);
    });
    if (!(r.top5Anomalies || []).length) aoa.push(['—', 'Žiadne výrazné zvláštnosti']);
    aoa.push([]);
    aoa.push(['PATTERNY A OPAKOVANIA']);
    (r.patterns || []).forEach(function (t, i) {
      aoa.push([(i + 1) + '.', t]);
    });
    if (!(r.patterns || []).length) aoa.push(['—', 'Žiadne výrazné patterny']);
    aoa.push([]);
    zdcReturnTableAoA(r.returnTable, r.returnHighlights).forEach(function (row) { aoa.push(row); });
    aoa.push([]);
    aoa.push(['NAJDLOHŠIE SÉRIE']);
    (sum.maxStreaks || []).sort(function (a, b) { return b.length - a.length; }).slice(0, 8).forEach(function (s) {
      aoa.push([s.length + '× ' + s.label + ' po sebe']);
    });
    aoa.push([]);
    aoa.push(['RAW SPINY V PÔVODNOM PORADÍ']);
    aoa.push([sum.spinListText || (sess.spins || []).join(', ')]);
    aoa.push([]);
    aoa.push(['TABUĽKA ČÍSEL 0–36']);
    zdcTriggerTableAoA(r.triggerTable).forEach(function (row) { aoa.push(row); });
    return aoa;
  }

  function zdcMasterIntegrityInline(store, master) {
    var ids = (master && master.sourceSessionIds) || [];
    if (!ids.length) {
      return {
        complete: true,
        presentCount: master ? master.sessionCount || 0 : 0,
        expectedCount: master ? master.sessionCount || 0 : 0,
        missingCount: 0
      };
    }
    var closedIds = {};
    (store.closed || []).forEach(function (s) { closedIds[s.id] = true; });
    var missing = ids.filter(function (id) { return !closedIds[id]; });
    return {
      complete: missing.length === 0,
      presentCount: ids.length - missing.length,
      expectedCount: ids.length,
      missingCount: missing.length
    };
  }

  function zdcMasterAoA(store) {
    var m = store.master;
    if (!m) return [['MASTER REPORT — zatiaľ nie je k dispozícii']];
    var integrity = zdcMasterIntegrityInline(store, m);
    var title = m.title || ('Master Report pre cyklus #' + m.cycleId);
    var aoa = [
      [title.toUpperCase()],
      [],
      ['Cyklus #', m.cycleId],
      ['Vygenerované', m.generatedAt],
      ['Počet session v reporte', m.sessionCount],
      ['Session v archíve', integrity.presentCount + ' / ' + integrity.expectedCount],
      ['Celkový počet spinov', m.totalSpins],
      []
    ];
    if (!integrity.complete) {
      aoa.push(['UPOZORNENIE', 'V archíve chýba ' + integrity.missingCount + ' session použitých pri tomto Master reporte (FIFO).']);
      aoa.push([]);
    }
    aoa.push(['ĽUDSKÝ ZÁVER']);
    aoa.push([m.humanSummary || '']);
    aoa.push([]);
    aoa.push(['TOP 10 ZAUJÍMAVOSTÍ CELÉHO ZBERU DÁT']);
    (m.top10Highlights || []).forEach(function (t, i) {
      if (t && t !== '—') aoa.push([(i + 1) + '.', t]);
    });
    if (!(m.top10Highlights || []).filter(function (t) { return t && t !== '—'; }).length) {
      aoa.push(['—', 'Zatiaľ nie sú dostatočné dáta']);
    }
    aoa.push([]);
    aoa.push(['POROVNANIE SESSION']);
    aoa.push(['Session', 'Spiny', 'Kvalita', 'Charakter', 'Top číslo', 'Patterny']);
    (m.sessionComparison || []).forEach(function (c) {
      aoa.push([c.number, c.spinCount, c.sampleQuality, c.sessionCharacter, c.topNumber, c.patternCount]);
    });
    if (!(m.sessionComparison || []).length) {
      (store.closed || []).slice().sort(function (a, b) { return a.number - b.number; }).forEach(function (s) {
        var rep = s.report || {};
        aoa.push([
          s.number,
          s.spinCount,
          (rep.metadata && rep.metadata.sampleQuality) || s.sampleQuality || '',
          rep.sessionCharacter || '',
          '—',
          (rep.patterns || []).length
        ]);
      });
    }
    aoa.push([]);
    aoa.push(['STABILITA NÁSLEDNOSTÍ (TOP)']);
    (m.stabilityRanking || []).slice(0, 10).forEach(function (st, i) {
      aoa.push([(i + 1) + '.', st.text]);
    });
    aoa.push([]);
    aoa.push(['SILNÉ VÄZBY NAPRIEČ SESSION']);
    (m.crossSessionStrong || []).forEach(function (t) { aoa.push([t]); });
    aoa.push([]);
    aoa.push(['SLABÉ VÄZBY NAPRIEČ SESSION']);
    (m.crossSessionWeak || []).forEach(function (t) { aoa.push([t]); });
    aoa.push([]);
    aoa.push(['AGREGOVANÁ TABUĽKA 0–36 (NAPRIEČ SESSION)']);
    zdcTriggerTableAoA(m.masterTriggerTable).forEach(function (row) { aoa.push(row); });
    return aoa;
  }

  function zdcBuildWorkbook(store, opts) {
    zdcXlsxNeedLib();
    opts = opts || {};
    var wb = XLSX.utils.book_new();
    var exportType = opts.exportType || 'full';

    if (exportType === 'raw') {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(zdcRawAoA(store, opts)), 'RAW');
      return wb;
    }

    if (exportType === 'session') {
      var sess = opts.session;
      if (!sess) throw new Error('Chýba session pre export.');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(zdcMetaAoA(store, { exportType: 'Session ' + sess.number })), 'META');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(zdcRawAoA(store, { singleSessionId: sess.id })), 'RAW');
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(zdcSessionReportAoA(sess)),
        zdcSheetName('SESSION_' + zdcPad2(sess.number))
      );
      return wb;
    }

    /* full export */
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(zdcMetaAoA(store, { exportType: 'celý zber' })), 'META');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(zdcRawAoA(store)), 'RAW');

    var sessions = (store.closed || []).slice().sort(function (a, b) { return a.number - b.number; });
    sessions.forEach(function (sess) {
      if (!sess.report) return;
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(zdcSessionReportAoA(sess)),
        zdcSheetName('SESSION_' + zdcPad2(sess.number))
      );
    });

    if (store.master) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(zdcMasterAoA(store)), 'MASTER');
    }

    return wb;
  }

  function zdcWorkbookToArrayBuffer(wb) {
    zdcXlsxNeedLib();
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  }

  function zdcDownloadWorkbook(wb, filename) {
    zdcXlsxNeedLib();
    var buf = zdcWorkbookToArrayBuffer(wb);
    var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function zdcDateSlug() {
    return new Date().toISOString().slice(0, 10);
  }

  function zdcExportFull(store) {
    var wb = zdcBuildWorkbook(store, { exportType: 'full' });
    zdcDownloadWorkbook(wb, 'zber-dat-0-36-' + zdcDateSlug() + '.xlsx');
    return wb;
  }

  function zdcExportSession(store, sess) {
    if (!sess) throw new Error('Session neexistuje.');
    var wb = zdcBuildWorkbook(store, { exportType: 'session', session: sess });
    zdcDownloadWorkbook(wb, 'zber-dat-session-' + zdcPad2(sess.number) + '-' + zdcDateSlug() + '.xlsx');
    return wb;
  }

  function zdcExportRaw(store) {
    var wb = zdcBuildWorkbook(store, { exportType: 'raw' });
    zdcDownloadWorkbook(wb, 'zber-dat-raw-' + zdcDateSlug() + '.xlsx');
    return wb;
  }

  function zdcExportDroppedSession(store, sess) {
    if (!sess) throw new Error('Chýba session pre FIFO export.');
    var wb = zdcBuildWorkbook(store, { exportType: 'session', session: sess });
    zdcDownloadWorkbook(wb, 'zber-dat-fifo-session-' + zdcPad2(sess.number) + '-' + zdcDateSlug() + '.xlsx');
    return wb;
  }

  return {
    buildWorkbook: zdcBuildWorkbook,
    workbookToArrayBuffer: zdcWorkbookToArrayBuffer,
    downloadWorkbook: zdcDownloadWorkbook,
    exportFull: zdcExportFull,
    exportSession: zdcExportSession,
    exportRaw: zdcExportRaw,
    exportDroppedSession: zdcExportDroppedSession,
    triggerHeader: zdcTriggerHeader,
    metaAoA: zdcMetaAoA,
    rawAoA: zdcRawAoA,
    sessionReportAoA: zdcSessionReportAoA,
    masterAoA: zdcMasterAoA
  };
});
