/* zber-dat-0-36-ui.js — UI pre ZBER DÁT 0–36 (izolovaný modul) */
'use strict';

(function ZdcUiModule() {
  var store = null;
  var viewSessionId = null;
  var tableViewMode = 'overview';

  function zdcPersist() {
    if (typeof zdcSaveStore === 'function' && store) zdcSaveStore(store);
  }

  function zdcEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function zdcChipClass(n) {
    if (n === 0) return 'green';
    return typeof reds !== 'undefined' && reds.includes(n) ? 'red' : 'black';
  }

  function zdcHotColdClass(cnt) {
    if (cnt >= 4) return 'hot';
    if (cnt <= 1) return 'cold';
    return 'neutral';
  }

  function zdcTierLabel(tier, spinCount) {
    if (!spinCount || spinCount < ZDC_MIN_SPINS) return 'neúplná (' + (spinCount || 0) + ' / ' + ZDC_MIN_SPINS + ')';
    return tier === 'extended' ? 'rozšírená' : 'plnohodnotná';
  }

  function zdcFindSession(id) {
    var i;
    if (store.active && store.active.id === id) return store.active;
    for (i = 0; i < store.closed.length; i++) {
      if (store.closed[i].id === id) return store.closed[i];
    }
    return null;
  }

  function zdcCurrentSpinContext() {
    var sess = null;
    if (viewSessionId) sess = zdcFindSession(viewSessionId);
    if (sess && sess.status === 'closed') {
      return { spins: sess.spins || [], sess: sess, label: 'Session ' + sess.number };
    }
    if (store.active && store.active.spins && store.active.spins.length) {
      return { spins: store.active.spins, sess: store.active, label: 'Aktívna session ' + store.active.number };
    }
    return { spins: [], sess: store.active, label: 'Session' };
  }

  function zdcCopyText(text, btn) {
    function ok() {
      zdcToast('Spiny skopírované do schránky.');
      if (btn) { btn.classList.add('copied'); var orig = btn.textContent; btn.textContent = '[ OK ]'; setTimeout(function () { btn.classList.remove('copied'); btn.textContent = orig; }, 1400); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); ok(); } catch (e) { zdcToast('Kopírovanie zlyhalo.'); }
        document.body.removeChild(ta);
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { zdcToast('Kopírovanie zlyhalo.'); }
      document.body.removeChild(ta);
    }
  }

  function zdcRenderRawPanel() {
    var ctx = zdcCurrentSpinContext();
    var textEl = document.getElementById('zdcRawText');
    var metaEl = document.getElementById('zdcRawMeta');
    var spins = ctx.spins;
    var text = typeof zdcSpinsToText === 'function' ? zdcSpinsToText(spins) : spins.join(', ');
    if (textEl) textEl.textContent = spins.length ? text : 'Zatiaľ žiadne spiny — zadávaj z klávesnice.';
    if (metaEl && ctx.sess) {
      var q = spins.length && typeof zdcSampleQualityLabel === 'function' ? zdcSampleQualityLabel(spins.length) : '—';
      var parts = ['Počet: ' + spins.length];
      if (ctx.sess.id) parts.push('ID: ' + ctx.sess.id);
      if (ctx.sess.createdAt) parts.push('Vytvorená: ' + (typeof zdcFormatDateSk === 'function' ? zdcFormatDateSk(ctx.sess.createdAt) : ctx.sess.createdAt));
      if (spins.length >= ZDC_MIN_SPINS) parts.push('Kvalita: ' + q);
      metaEl.textContent = parts.join(' · ');
    }
  }

  function zdcCopyRawSpins(btn) {
    var ctx = zdcCurrentSpinContext();
    if (!ctx.spins.length) { zdcToast('Nie sú žiadne spiny na kopírovanie.'); return; }
    zdcCopyText(typeof zdcSpinsToText === 'function' ? zdcSpinsToText(ctx.spins) : ctx.spins.join(', '), btn);
  }

  function zdcRenderHotCold(spins) {
    var wrap = document.getElementById('saHotColdGrid');
    var note = document.getElementById('saHotColdNote');
    if (!wrap) return;
    var counts = typeof zdcHitCounts === 'function' ? zdcHitCounts(spins) : [];
    var hotN = 0, coldN = 0, i;
    for (i = 0; i <= 36; i++) {
      var t = zdcHotColdClass(counts[i] || 0);
      if (t === 'hot') hotN++;
      if (t === 'cold') coldN++;
    }
    function cellHtml(n) {
      var cnt = counts[n] || 0;
      var cls = 'sa-hc-cell ' + zdcChipClass(n) + ' ' + zdcHotColdClass(cnt);
      return '<div class="' + cls + '" data-n="' + n + '"><span class="sa-hc-num">' + n + '</span><span class="sa-hc-cnt">' + cnt + '×</span></div>';
    }
    var zeroHtml = '<div class="sa-hc-zero-col">' + cellHtml(0).replace('class="sa-hc-cell', 'class="sa-hc-zero sa-hc-cell') + '</div>';
    var matrixHtml = '<div class="sa-hc-matrix">';
    if (typeof BOARD_LAYOUT !== 'undefined') {
      BOARD_LAYOUT.forEach(function (row) {
        row.forEach(function (n) { matrixHtml += cellHtml(n); });
      });
    } else {
      for (i = 1; i <= 36; i++) matrixHtml += cellHtml(i);
    }
    matrixHtml += '</div>';
    wrap.innerHTML = zeroHtml + matrixHtml;
    if (note) {
      if (!spins.length) note.textContent = 'Zatiaľ žiadne spiny v tejto session.';
      else note.textContent = 'Hot: ' + hotN + ' · Cold: ' + coldN + ' · (4+ = oranžová, 0–1 = fialová/modrá).';
    }
  }

  function zdcRenderTriggerRowCells(row, mode) {
    var strong = (row.strongBonds && row.strongBonds.length) ? row.strongBonds.join(', ') : '—';
    var weak = (row.weakBonds && row.weakBonds.length) ? row.weakBonds.join(', ') : '—';
    var rare = (row.rareAfter && row.rareAfter.length) ? row.rareAfter.join(', ') : '—';
    var rep = (row.repeatedFollows && row.repeatedFollows.length) ? row.repeatedFollows.join(', ') : '—';
    if (mode === 'overview') {
      return '<td class="zdc-num">' + row.number + '</td>' +
        '<td>' + row.hitCount + '</td>' +
        '<td>' + row.followCount + '</td>' +
        '<td>' + (row.topNext != null ? row.topNext : '—') + '</td>' +
        '<td class="zdc-next">' + zdcEsc(row.nextNumbersText) + '</td>' +
        '<td class="zdc-bond-strong">' + zdcEsc(strong) + '</td>' +
        '<td class="zdc-comment">' + zdcEsc(row.humanComment || '—') + '</td>';
    }
    return '<td class="zdc-num">' + row.number + '</td>' +
      '<td>' + row.hitCount + '</td>' +
      '<td>' + row.followCount + '</td>' +
      '<td>' + zdcEsc(row.sampleConfidence) + '</td>' +
      '<td class="zdc-next">' + zdcEsc(row.nextNumbersText) + '</td>' +
      '<td>' + (row.topNext != null ? row.topNext : '—') + '</td>' +
      '<td>' + (row.top3Next && row.top3Next.length ? row.top3Next.join(', ') : '—') + '</td>' +
      '<td>' + row.redPct + '</td><td>' + row.blackPct + '</td><td>' + row.zeroPct + '</td>' +
      '<td>' + row.evenPct + '</td><td>' + row.oddPct + '</td>' +
      '<td>' + row.lowPct + '</td><td>' + row.highPct + '</td>' +
      '<td>' + row.dozen1Pct + '</td><td>' + row.dozen2Pct + '</td><td>' + row.dozen3Pct + '</td>' +
      '<td>' + row.col1Pct + '</td><td>' + row.col2Pct + '</td><td>' + row.col3Pct + '</td>' +
      '<td class="zdc-bond-strong">' + zdcEsc(strong) + '</td>' +
      '<td class="zdc-bond-weak">' + zdcEsc(weak) + '</td>' +
      '<td class="zdc-bond-rare">' + zdcEsc(rare) + '</td>' +
      '<td>' + zdcEsc(rep) + '</td>' +
      '<td class="zdc-comment">' + zdcEsc(row.humanComment || '—') + '</td>';
  }

  function zdcTriggerTableHeader(mode) {
    if (mode === 'overview') {
      return '<th>Číslo</th><th>Výskytov</th><th>Pozorovaní</th><th>Top</th><th>Nasledujúce</th><th>Silné väzby</th><th>Komentár</th>';
    }
    return '<th>Číslo</th><th>Výskytov</th><th>Pozorovaní</th><th>Spoľahlivosť</th>' +
      '<th>Nasledujúce čísla</th><th>Top</th><th>Top 3</th>' +
      '<th>Červená %</th><th>Čierna %</th><th>Nula %</th>' +
      '<th>Párne %</th><th>Nepárne %</th><th>Malé %</th><th>Veľké %</th>' +
      '<th>1. tucet %</th><th>2. tucet %</th><th>3. tucet %</th>' +
      '<th>1. stĺpec %</th><th>2. stĺpec %</th><th>3. stĺpec %</th>' +
      '<th>Silné</th><th>Slabé</th><th>Takmer nikdy</th><th>Opakovania</th><th>Komentár</th>';
  }

  function zdcUpdateViewToggle() {
    document.querySelectorAll('.zdc-view-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-view') === tableViewMode);
    });
  }

  function zdcRenderTriggerTable(table, targetId, mode) {
    var wrap = document.getElementById(targetId || 'zdcTriggerTableWrap');
    if (!wrap) return;
    mode = mode || tableViewMode;
    if (!table || !table.length) {
      wrap.innerHTML = '<p class="sa-empty">Tabuľka sa zobrazí po prvých spinoch. Po uzavretí session (min. ' + ZDC_MIN_SPINS + ') bude report kompletný.</p>';
      return;
    }
    var html = '<div class="zdc-table-scroll"><table class="zdc-trigger-table zdc-table-' + mode + '"><thead><tr>' +
      zdcTriggerTableHeader(mode) + '</tr></thead><tbody>';
    table.forEach(function (row) {
      html += '<tr class="zdc-row-' + zdcChipClass(row.number) + '">' + zdcRenderTriggerRowCells(row, mode) + '</tr>';
    });
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
    zdcUpdateViewToggle();
  }

  function zdcRenderReturnSection(returnTable, highlights, isPreview) {
    if (!returnTable || !returnTable.length) return '';
    var hl = highlights || (typeof zdcBuildReturnHighlights === 'function' ? zdcBuildReturnHighlights(returnTable) : null);
    var html = '<h3 class="zdc-report-h3">Návraty čísel' + (isPreview ? ' (predbežné)' : '') + '</h3>';
    html += '<div class="zdc-table-scroll"><table class="zdc-mini-table zdc-return-table"><thead><tr>' +
      '<th>Číslo</th><th>Výskytov</th><th>Priemerný návrat</th><th>Najrýchlejší</th><th>Najdlhšia absencia</th></tr></thead><tbody>';
    returnTable.forEach(function (row) {
      if (!row.hitCount && !row.longestAbsence) return;
      html += '<tr><td class="zdc-num">' + row.number + '</td><td>' + row.hitCount + '</td><td>' +
        (row.avgReturn != null ? row.avgReturn : '—') + '</td><td>' +
        (row.fastestReturn != null ? row.fastestReturn : '—') + '</td><td>' + row.longestAbsence + '</td></tr>';
    });
    html += '</tbody></table></div>';
    if (hl && hl.topFastestReturns && hl.topFastestReturns.length) {
      html += '<h4 class="zdc-report-h4">TOP najrýchlejšie návraty</h4><ul class="zdc-report-list">';
      hl.topFastestReturns.forEach(function (r) {
        html += '<li>Číslo ' + r.number + ' — najkratšia medzera ' + r.fastestReturn + ' spinov (priemer ' +
          (r.avgReturn != null ? r.avgReturn : '—') + ')</li>';
      });
      html += '</ul>';
    }
    if (hl && hl.topLongestAbsences && hl.topLongestAbsences.length) {
      html += '<h4 class="zdc-report-h4">TOP najdlhšie absencie</h4><ul class="zdc-report-list">';
      hl.topLongestAbsences.slice(0, 6).forEach(function (r) {
        html += '<li>Číslo ' + r.number + ' — najdlhšie chýbalo ' + r.longestAbsence + ' spinov' +
          (r.hitCount ? ' (' + r.hitCount + '× padlo)' : ' (nepadlo)') + '</li>';
      });
      html += '</ul>';
    }
    return html;
  }

  function zdcRenderSessionReport(sess, liveSpins) {
    var wrap = document.getElementById('saResultsWrap');
    if (!wrap) return;
    if (!sess || !sess.report) {
      if (liveSpins && liveSpins.length && typeof zdcBuildReturnTable === 'function') {
        var rtLive = zdcBuildReturnTable(liveSpins);
        wrap.innerHTML = '<div class="zdc-report"><p class="sa-empty">Session ešte nebola uzavretá — nižšie predbežné návraty z aktuálnych spinov.</p>' +
          zdcRenderReturnSection(rtLive, null, true) + '</div>';
        return;
      }
      wrap.innerHTML = '<p class="sa-empty">Session ešte nebola uzavretá. Zadávaj spiny z klávesnice alebo ju uzavri po dosiahnutí minima ' + ZDC_MIN_SPINS + ' spinov.</p>';
      return;
    }
    var r = sess.report;
    var sum = r.summary || {};
    var meta = r.metadata || {};
    var html = '<div class="zdc-report">';
    html += '<p class="zdc-report-lead">' + zdcEsc(r.humanSummary) + '</p>';
    html += '<div class="zdc-meta-block">';
    html += '<p class="zdc-report-meta"><strong>Session ID:</strong> ' + zdcEsc(meta.sessionId || sess.id) + '</p>';
    html += '<p class="zdc-report-meta"><strong>Vytvorená:</strong> ' + zdcEsc(typeof zdcFormatDateSk === 'function' ? zdcFormatDateSk(meta.createdAt || sess.createdAt) : '—') + '</p>';
    html += '<p class="zdc-report-meta"><strong>Uzavretá:</strong> ' + zdcEsc(typeof zdcFormatDateSk === 'function' ? zdcFormatDateSk(meta.closedAt || sess.closedAt) : '—') + '</p>';
    html += '<p class="zdc-report-meta"><strong>Report vygenerovaný:</strong> ' + zdcEsc(typeof zdcFormatDateSk === 'function' ? zdcFormatDateSk(meta.reportGeneratedAt || r.generatedAt) : '—') + '</p>';
    html += '<p class="zdc-report-meta"><strong>Spiny:</strong> ' + (meta.spinCount || sum.spinCount) + ' · <strong>Stav:</strong> ' + zdcTierLabel(meta.tier || sum.tier, meta.spinCount || sum.spinCount) + ' · <strong>Kvalita vzorky:</strong> ' + zdcEsc(meta.sampleQuality || sum.sampleQuality) + '</p>';
    html += '</div>';
    if (sum.hotNumbers && sum.hotNumbers.length) html += '<p class="zdc-report-meta"><strong>Hot:</strong> ' + sum.hotNumbers.join(', ') + '</p>';
    if (sum.coldNumbers && sum.coldNumbers.length) html += '<p class="zdc-report-meta"><strong>Cold:</strong> ' + sum.coldNumbers.join(', ') + '</p>';
    if (sum.missing && sum.missing.length) html += '<p class="zdc-report-meta"><strong>Nepadlo:</strong> ' + sum.missing.join(', ') + '</p>';
    html += '<p class="zdc-report-meta"><strong>Charakter:</strong> ' + zdcEsc(r.sessionCharacter) + ' — ' + zdcEsc(r.sessionCharacterDetail) + '</p>';
    if (r.top5Anomalies && r.top5Anomalies.length) {
      html += '<h3 class="zdc-report-h3">Výrazné zvláštnosti</h3><ul class="zdc-report-list">';
      r.top5Anomalies.forEach(function (t) { html += '<li>' + zdcEsc(t) + '</li>'; });
      html += '</ul>';
    }
    if (sum.maxStreaks && sum.maxStreaks.length) {
      html += '<h3 class="zdc-report-h3">Najdlhšie série</h3><ul class="zdc-report-list">';
      sum.maxStreaks.sort(function (a, b) { return b.length - a.length; }).slice(0, 6).forEach(function (s) {
        html += '<li>' + s.length + '× ' + zdcEsc(s.label) + ' po sebe</li>';
      });
      html += '</ul>';
    }
    if (r.patterns && r.patterns.length) {
      html += '<h3 class="zdc-report-h3">Patterny a opakovania</h3><ul class="zdc-report-list">';
      r.patterns.slice(0, 8).forEach(function (t) { html += '<li>' + zdcEsc(t) + '</li>'; });
      html += '</ul>';
    }
    if (r.returnTable && r.returnTable.length) {
      html += zdcRenderReturnSection(r.returnTable, r.returnHighlights, false);
    }
    html += '<p class="zdc-raw-visible"><strong>Všetky spiny v poradí:</strong> ' + zdcEsc(sum.spinListText) + '</p>';
    html += '<details class="zdc-raw-details" open><summary>Raw spiny — kompletný zoznam (' + sum.spinCount + ')</summary><p class="zdc-raw-text" id="zdcClosedRawText">' + zdcEsc(sum.spinListText) + '</p></details>';
    html += '</div>';
    wrap.innerHTML = html;
  }

  function zdcRenderMaster() {
    var panel = document.getElementById('zdcMasterPanel');
    var wrap = document.getElementById('zdcMasterWrap');
    var titleEl = document.getElementById('zdcMasterTitle');
    if (!panel || !wrap) return;
    if (!store.master) {
      panel.style.display = 'none';
      return;
    }
    var m = store.master;
    var integrity = typeof zdcMasterArchiveIntegrity === 'function' ? zdcMasterArchiveIntegrity(store, m) : { complete: true };
    var isArchival = typeof zdcIsMasterArchival === 'function' ? zdcIsMasterArchival(store, m) : false;
    var title = typeof zdcMasterTitle === 'function' ? zdcMasterTitle(store, m) : ('Master Report pre cyklus #' + m.cycleId);
    panel.style.display = '';
    if (titleEl) titleEl.textContent = title;
    var html = '<div class="zdc-master-head">';
    html += '<p class="zdc-report-meta"><strong>Cyklus:</strong> #' + m.cycleId + '</p>';
    html += '<p class="zdc-report-meta"><strong>Vytvorený:</strong> ' + zdcEsc(typeof zdcFormatDateSk === 'function' ? zdcFormatDateSk(m.generatedAt) : m.generatedAt) + '</p>';
    html += '<p class="zdc-report-meta"><strong>Session v reporte:</strong> ' + (m.sessionCount || 0) + ' · <strong>Spiny spolu:</strong> ' + (m.totalSpins || 0) + '</p>';
    if (isArchival) {
      html += '<p class="zdc-master-warn">Toto je archívny Master Report — patrí cyklu #' + m.cycleId + '. Aktuálny zber beží v cykle #' + store.cycleId + '.</p>';
    }
    if (!integrity.complete) {
      html += '<p class="zdc-master-warn">Upozornenie: v archíve chýba ' + integrity.missingCount + ' z ' + integrity.expectedCount +
        ' session použitých pri tomto Master reporte (FIFO export). Report ostáva platný pre cyklus #' + m.cycleId + ', ale niektoré session už nie sú v pamäti.</p>';
    }
    html += '</div>';
    html += '<p class="zdc-report-lead">' + zdcEsc(m.humanSummary) + '</p>';
    html += '<h3 class="zdc-report-h3">TOP 10 ZAUJÍMAVOSTÍ CELÉHO ZBERU DÁT</h3><ol class="zdc-report-list">';
    var hl = (m.top10Highlights || []).filter(function (t) { return t && t !== '—'; });
    if (!hl.length) html += '<li>Zatiaľ nie sú dostatočné dáta pre zaujímavosti.</li>';
    else hl.forEach(function (t) { html += '<li>' + zdcEsc(t) + '</li>'; });
    html += '</ol>';
    if (m.sessionComparison && m.sessionComparison.length) {
      html += '<h3 class="zdc-report-h3">Porovnanie session</h3><table class="zdc-mini-table"><thead><tr><th>Session</th><th>Spiny</th><th>Kvalita</th><th>Charakter</th></tr></thead><tbody>';
      m.sessionComparison.forEach(function (c) {
        html += '<tr><td>' + c.number + '</td><td>' + c.spinCount + '</td><td>' + zdcEsc(c.sampleQuality) + '</td><td>' + zdcEsc(c.sessionCharacter) + '</td></tr>';
      });
      html += '</tbody></table>';
    }
    if (m.stabilityRanking && m.stabilityRanking.length) {
      html += '<h3 class="zdc-report-h3">Najstabilnejšie následnosti</h3><ul class="zdc-report-list">';
      m.stabilityRanking.slice(0, 6).forEach(function (st) { html += '<li>' + zdcEsc(st.text) + '</li>'; });
      html += '</ul>';
    }
    if (m.crossSessionStrong && m.crossSessionStrong.length) {
      html += '<h3 class="zdc-report-h3">Silné väzby naprieč session</h3><ul class="zdc-report-list">';
      m.crossSessionStrong.slice(0, 6).forEach(function (t) { html += '<li>' + zdcEsc(t) + '</li>'; });
      html += '</ul>';
    }
    if (m.crossSessionWeak && m.crossSessionWeak.length) {
      html += '<h3 class="zdc-report-h3">Slabé väzby naprieč session</h3><ul class="zdc-report-list">';
      m.crossSessionWeak.slice(0, 4).forEach(function (t) { html += '<li>' + zdcEsc(t) + '</li>'; });
      html += '</ul>';
    }
    if (store.masterArchive && store.masterArchive.length) {
      html += '<h3 class="zdc-report-h3">Predchádzajúce Master reporty</h3><ul class="zdc-report-list">';
      store.masterArchive.slice().reverse().forEach(function (am) {
        html += '<li>Archívny Master Report pre cyklus #' + am.cycleId + ' · ' +
          zdcEsc(typeof zdcFormatDateSk === 'function' ? zdcFormatDateSk(am.generatedAt) : am.generatedAt) +
          ' · ' + (am.sessionCount || 0) + ' session</li>';
      });
      html += '</ul>';
    }
    wrap.innerHTML = html;
    zdcRenderTriggerTable(m.masterTriggerTable, 'zdcMasterTableWrap', tableViewMode);
  }

  function zdcRenderArchive() {
    var box = document.getElementById('saArchiveLog');
    if (!box) return;
    if (!store.closed.length) {
      box.innerHTML = '<p class="sa-empty">Zatiaľ žiadna uzavretá session.</p>';
      return;
    }
    var html = '';
    store.closed.slice().reverse().forEach(function (s) {
      var tier = zdcTierLabel(s.tier, s.spinCount);
      var sel = viewSessionId === s.id ? ' zdc-archive-active' : '';
      html += '<div class="sa-archive-row' + sel + '" data-id="' + zdcEsc(s.id) + '">' +
        '<p class="sa-archive-item">Session ' + s.number + ' · ' + s.spinCount + ' spinov · ' + tier + '</p>' +
        '<button type="button" class="sa-btn-copy zdc-btn-view" data-id="' + zdcEsc(s.id) + '">[ Report ]</button>' +
        '<button type="button" class="sa-btn-copy zdc-btn-xlsx" data-id="' + zdcEsc(s.id) + '">[ Excel ]</button>' +
        '</div>';
    });
    box.innerHTML = html;
  }

  function zdcDisplaySession() {
    var sess = null;
    if (viewSessionId) sess = zdcFindSession(viewSessionId);
    if (!sess && store.closed.length) sess = store.closed[store.closed.length - 1];
    if (sess && sess.status === 'closed') {
      zdcRenderSessionReport(sess);
      if (sess.report && sess.report.triggerTable) zdcRenderTriggerTable(sess.report.triggerTable, 'zdcTriggerTableWrap');
      zdcRenderHotCold(sess.spins || []);
      return;
    }
    var active = store.active;
    var spins = active && active.spins ? active.spins : [];
    zdcRenderSessionReport(null, spins);
    if (spins.length) zdcRenderTriggerTable(zdcBuildTriggerTable(spins), 'zdcTriggerTableWrap');
    else zdcRenderTriggerTable(null, 'zdcTriggerTableWrap');
    zdcRenderHotCold(spins);
  }

  function zdcRefreshUI() {
    if (!store) store = typeof zdcLoadStore === 'function' ? zdcLoadStore() : null;
    if (!store) return;
    var active = store.active;
    var spins = active && active.spins ? active.spins : [];
    var g = document.getElementById('saStatusGame');
    var s = document.getElementById('saStatusSpins');
    var m = document.getElementById('saStatusMode');
    var strip = document.getElementById('saLiveStrip');
    var btnClose = document.getElementById('saBtnCloseAnalyze');
    var minNote = document.getElementById('zdcMinNote');
    if (g) {
      var cycleLabel = store.cycleId ? ' · Cyklus #' + store.cycleId : '';
      g.innerHTML = 'AKTUÁLNA SESSION: <strong>SESSION č. ' + (active ? active.number : '—') + '</strong>' + cycleLabel;
    }
    if (s) {
      var qLabel = spins.length && typeof zdcSampleQualityLabel === 'function' ? zdcSampleQualityLabel(spins.length) : '';
      s.innerHTML = 'ZADANÝCH SPINU: <strong>' + spins.length + '</strong>' + (qLabel && spins.length >= ZDC_MIN_SPINS ? ' · <span class="zdc-quality">' + qLabel + '</span>' : '');
    }
    if (m) {
      var canClose = typeof zdcCanCloseSession === 'function' && zdcCanCloseSession(active);
      if (canClose) m.innerHTML = 'STAV: <strong class="locked">Pripravená na uzavretie (' + zdcTierLabel(active.tier, spins.length) + ')</strong>';
      else m.innerHTML = 'STAV: <strong>Zber dát</strong> · minimum ' + ZDC_MIN_SPINS + ' spinov';
    }
    if (minNote) {
      var left = Math.max(0, ZDC_MIN_SPINS - spins.length);
      var fifoWarn = typeof zdcWillFifoDropOnClose === 'function' && zdcWillFifoDropOnClose(store);
      minNote.textContent = left > 0
        ? 'Do plnohodnotnej session chýba ešte ' + left + ' spinov.'
        : (fifoWarn
          ? 'Session pripravená na uzavretie. Pozor: archív je plný (12) — pri uzavretí sa najstaršia session automaticky exportuje do Excelu a odstráni.'
          : 'Session má dosť spinov — môžeš ju uzavrieť a vygenerovať report.');
    }
    if (btnClose) btnClose.disabled = !(typeof zdcCanCloseSession === 'function' && zdcCanCloseSession(active));
    var btnUndo = document.getElementById('zdcBtnUndoSpin');
    if (btnUndo) btnUndo.disabled = !(active && active.status === 'collecting' && spins.length > 0);
    var cycleInfo = document.getElementById('zdcCycleInfo');
    if (cycleInfo) {
      var closedInCycle = store.sessionsInCycle || 0;
      var activeNote = active && active.status === 'collecting' ? ' · aktívna session ' + active.number : '';
      cycleInfo.textContent = 'Cyklus #' + store.cycleId + ' · ' + closedInCycle + ' / 12 session uzavretých v tomto cykle' + activeNote +
        ' · archív max. 12 v pamäti · po 12. uzavretí vznikne Master Report pre cyklus #' + store.cycleId;
    }
    if (strip) {
      strip.innerHTML = spins.map(function (n) {
        return '<span class="sa-live-chip ' + zdcChipClass(n) + '">' + n + '</span>';
      }).join('');
    }
    zdcDisplaySession();
    zdcRenderRawPanel();
    zdcRenderArchive();
    zdcRenderMaster();
  }

  function zdcToast(msg) {
    if (typeof showSessionToast === 'function') showSessionToast(msg);
  }

  function zdcUndoUi() {
    if (!store || typeof zdcUndoLastSpin !== 'function') return;
    var r = zdcUndoLastSpin(store);
    if (!r.ok) {
      if (r.reason === 'empty') zdcToast('Nie je čo vrátiť — žiadne spiny v session.');
      else if (r.reason === 'closed') zdcToast('Undo funguje len v aktívnej session.');
      return;
    }
    zdcPersist();
    if (viewSessionId) viewSessionId = null;
    zdcToast('Posledný spin (' + r.removed + ') bol zrušený.');
    zdcRefreshUI();
  }

  function zdcOnSpinUi(number) {
    if (!store) return;
    if (store.active && store.active.status !== 'collecting') return;
    var r = zdcOnSpin(store, number);
    if (r.ok) {
      zdcPersist();
      if (viewSessionId && store.active) viewSessionId = null;
      zdcRefreshUI();
    }
  }

  function zdcCloseUi() {
    if (!store) return;
    var fifoCand = typeof zdcGetFifoDropCandidate === 'function' ? zdcGetFifoDropCandidate(store) : null;
    if (fifoCand && typeof zdcXlsxExport !== 'undefined' && zdcXlsxExport.exportDroppedSession) {
      try {
        zdcXlsxExport.exportDroppedSession(store, fifoCand);
        zdcToast('Archív plný — Session ' + fifoCand.number + ' bola exportovaná do Excelu pred odstránením z pamäte.');
      } catch (e) {
        zdcToast('FIFO export zlyhal — uzavretie zrušené. Skús exportovať Session ' + fifoCand.number + ' ručne.');
        return;
      }
    } else if (fifoCand) {
      zdcToast('Archív plný — pred uzavretím exportuj Session ' + fifoCand.number + ' cez [ Excel ] v archíve.');
      return;
    }
    var r = zdcCloseSession(store);
    if (!r.ok) {
      if (r.reason === 'min_spins') zdcToast('Session potrebuje minimálne ' + ZDC_MIN_SPINS + ' spinov (máš ' + (r.have || 0) + ').');
      return;
    }
    viewSessionId = r.sessionId;
    if (r.dropped) zdcToast('Session ' + r.dropped.number + ' odstránená z pamäte (máš export v Exceli).');
    if (r.cycleComplete) zdcToast('Cyklus 12 session dokončený — master report je pripravený.');
    else if (!r.dropped) zdcToast('Session uzavretá — report je nižšie.');
    zdcPersist();
    zdcRefreshUI();
  }

  function zdcExportXlsxFull() {
    if (!store || typeof zdcXlsxExport === 'undefined') {
      zdcToast('Excel knižnica nie je pripravená.');
      return;
    }
    try {
      zdcXlsxExport.exportFull(store);
      zdcToast('Excel export (.xlsx) stiahnutý.');
    } catch (e) {
      zdcToast('Export zlyhal: ' + (e.message || e));
    }
  }

  function zdcExportXlsxSession(sessionId) {
    if (!store || typeof zdcXlsxExport === 'undefined') return;
    var sess = zdcFindSession(sessionId);
    if (!sess || !sess.report) {
      zdcToast('Session nemá report — export len uzavretých session.');
      return;
    }
    try {
      zdcXlsxExport.exportSession(store, sess);
      zdcToast('Excel Session ' + sess.number + ' stiahnutý.');
    } catch (e) {
      zdcToast('Export session zlyhal: ' + (e.message || e));
    }
  }

  function zdcExportXlsxRaw() {
    if (!store || typeof zdcXlsxExport === 'undefined') {
      zdcToast('Excel knižnica nie je pripravená.');
      return;
    }
    try {
      zdcXlsxExport.exportRaw(store);
      zdcToast('Raw Excel (.xlsx) stiahnutý.');
    } catch (e) {
      zdcToast('Raw export zlyhal: ' + (e.message || e));
    }
  }

  function zdcBind() {
    var btnClose = document.getElementById('saBtnCloseAnalyze');
    var btnExport = document.getElementById('zdcBtnExport');
    var btnExportRaw = document.getElementById('zdcBtnExportRaw');
    var btnCopyRaw = document.getElementById('zdcBtnCopyRaw');
    var btnUndo = document.getElementById('zdcBtnUndoSpin');
    var archBox = document.getElementById('saArchiveLog');
    if (btnClose) btnClose.addEventListener('click', zdcCloseUi);
    if (btnUndo) btnUndo.addEventListener('click', zdcUndoUi);
    if (btnExport) btnExport.addEventListener('click', zdcExportXlsxFull);
    if (btnExportRaw) btnExportRaw.addEventListener('click', zdcExportXlsxRaw);
    if (btnCopyRaw) btnCopyRaw.addEventListener('click', function () { zdcCopyRawSpins(btnCopyRaw); });
    document.querySelectorAll('.zdc-view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tableViewMode = btn.getAttribute('data-view') || 'overview';
        zdcDisplaySession();
        if (store.master && store.master.masterTriggerTable) {
          zdcRenderTriggerTable(store.master.masterTriggerTable, 'zdcMasterTableWrap', tableViewMode);
        }
      });
    });
    if (archBox) {
      archBox.addEventListener('click', function (e) {
        var btnView = e.target.closest('.zdc-btn-view');
        if (btnView) {
          viewSessionId = btnView.getAttribute('data-id');
          zdcRefreshUI();
          return;
        }
        var btnXlsx = e.target.closest('.zdc-btn-xlsx');
        if (btnXlsx) {
          zdcExportXlsxSession(btnXlsx.getAttribute('data-id'));
        }
      });
    }
    if (typeof EventBus !== 'undefined' && !EventBus.__zdcEmitWrapped) {
      var origEmit = EventBus.emit.bind(EventBus);
      EventBus.emit = function (ev, data) {
        origEmit(ev, data);
        if (ev === 'spin:add') zdcOnSpinUi(data);
      };
      EventBus.__zdcEmitWrapped = true;
    }
    store = zdcLoadStore();
    zdcRefreshUI();
  }

  window.zdcRefreshUI = zdcRefreshUI;
  window.saRefreshUI = zdcRefreshUI;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', zdcBind);
  else zdcBind();
})();
