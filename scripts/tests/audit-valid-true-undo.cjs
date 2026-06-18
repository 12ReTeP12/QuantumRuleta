/**
 * Balík 8.3 — audit TRUE VALID undo (JSONL, localStorage, export, UI panel).
 * Spustenie: npm run audit:valid-true-undo
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V2.html');
const reportPath = path.join(__dirname, 'reports', 'audit-valid-true-undo.json');
const LS_KEY = 'validTrueV0Buffer';

const results = [];

function verdict(area, status, detail) {
  results.push({ area, status, detail });
  const fn = status === 'PASS' ? console.log : status === 'WARN' ? console.warn : console.error;
  fn(status + ' [' + area + ']:', detail);
}

app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1400,
    height: 900,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });

  try {
    await win.loadFile(htmlPath);
    await new Promise((r) => setTimeout(r, 2500));

    const R = await win.webContents.executeJavaScript(`(async function(){
      const out = { areas: {} };
      if (typeof ValidTrueV0 === 'undefined' || !ValidTrueV0.onUndoSpin) {
        out.error = 'ValidTrueV0.onUndoSpin missing';
        return out;
      }
      if (typeof clearSessionData === 'function') clearSessionData();
      ValidTrueV0.resetSession();

      const origCE = typeof computeConfidenceEngine === 'function' ? computeConfidenceEngine : null;
      let gateOverride = null;
      if (origCE) {
        window.computeConfidenceEngine = function () {
          return gateOverride || origCE();
        };
      }
      gateOverride = {
        status: 'HRAŤ',
        playMode: 'HRAŤ',
        playHead: 'HRAŤ',
        chaosPct: 30,
        learn: false,
        allowPlay: true
      };
      window.predLastPick = { col: 0, doz: 0, colPick: '1st', dozPick: '1st' };

      onNewSpin(17);
      onNewSpin(32);
      const n2 = ValidTrueV0.getSpinRecords().length;
      const jsonl2 = ValidTrueV0.exportJsonl().split('\\n').filter(Boolean).length;
      const ls2raw = localStorage.getItem('${LS_KEY}');
      const ls2 = ls2raw ? JSON.parse(ls2raw).filter(function (r) { return r && r.type === 'spin'; }).length : -1;
      const rep2 = ValidTrueV0.buildReport();
      ValidTrueV0.renderPanel();
      const ui2 = (document.getElementById('validTruePanel') || {}).innerText || '';

      onUndoSpin();
      const n1 = ValidTrueV0.getSpinRecords().length;
      const jsonl1 = ValidTrueV0.exportJsonl().split('\\n').filter(Boolean).length;
      const ls1raw = localStorage.getItem('${LS_KEY}');
      const ls1 = ls1raw ? JSON.parse(ls1raw).filter(function (r) { return r && r.type === 'spin'; }).length : -1;
      const rep1 = ValidTrueV0.buildReport();
      ValidTrueV0.renderPanel();
      const ui1 = (document.getElementById('validTruePanel') || {}).innerText || '';
      const spinsLen = typeof spins !== 'undefined' ? spins.length : -1;

      return {
        spinsLen: spinsLen,
        buffer: { before: n2, after: n1, delta: n1 - n2 },
        jsonl: { before: jsonl2, after: jsonl1, spinLinesBefore: n2, spinLinesAfter: n1 },
        localStorage: { before: ls2, after: ls1 },
        report: { nSpinsBefore: rep2.aggregates.nSpins, nSpinsAfter: rep1.aggregates.nSpins },
        ui: { nSpinsTextBefore: (ui2.match(/Spiny v logu[\\s\\S]*?(\\d+)/) || [])[1], nSpinsTextAfter: (ui1.match(/Spiny v logu[\\s\\S]*?(\\d+)/) || [])[1] }
      };
    })()`);

    if (R.error) {
      verdict('bootstrap', 'FAIL', R.error);
    } else {
      const b = R.buffer;
      if (b.before === 2 && b.after === 1 && b.delta === -1) {
        verdict('buffer', 'PASS', 'getSpinRecords 2→1 po jednom undo');
      } else {
        verdict('buffer', 'FAIL', 'očak. 2→1, got ' + b.before + '→' + b.after);
      }

      if (R.jsonl.spinLinesAfter === R.buffer.after && R.jsonl.after < R.jsonl.before) {
        verdict('jsonl-export', 'PASS', 'exportJsonl spin lines ' + R.jsonl.before + '→' + R.jsonl.after);
      } else {
        verdict('jsonl-export', 'FAIL', JSON.stringify(R.jsonl));
      }

      if (R.localStorage.after === R.buffer.after && R.localStorage.before === 2 && R.localStorage.after === 1) {
        verdict('localStorage', 'PASS', 'LS spin rows 2→1, sync s bufferom');
      } else {
        verdict('localStorage', 'FAIL', JSON.stringify(R.localStorage) + ' buffer=' + R.buffer.after);
      }

      if (R.report.nSpinsAfter === R.buffer.after && R.report.nSpinsBefore === 2 && R.report.nSpinsAfter === 1) {
        verdict('export-report', 'PASS', 'buildReport nSpins 2→1');
      } else {
        verdict('export-report', 'FAIL', JSON.stringify(R.report));
      }

      if (R.ui.nSpinsTextAfter === '1' && R.ui.nSpinsTextBefore === '2') {
        verdict('ui-panel', 'PASS', 'panel Spiny v logu 2→1');
      } else {
        verdict('ui-panel', 'FAIL', 'UI text: before=' + R.ui.nSpinsTextBefore + ' after=' + R.ui.nSpinsTextAfter);
      }

      if (R.spinsLen === 1) {
        verdict('ui-spins-array', 'PASS', 'spins.length=1 po undo');
      } else {
        verdict('ui-spins-array', 'FAIL', 'spins.length=' + R.spinsLen);
      }
    }

    const failN = results.filter((x) => x.status === 'FAIL').length;
    const summary = { measuredAt: new Date().toISOString(), results, fail: failN, pass: results.filter((x) => x.status === 'PASS').length };
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ ...summary, detail: R }, null, 2), 'utf8');

    console.log('\n=== BALÍK 8.3 — TRUE VALID UNDO AUDIT ===\n');
    console.log('Report:', reportPath);
    console.log('PASS:', summary.pass, 'FAIL:', summary.fail, '\n');

    win.destroy();
    app.quit();
    process.exit(failN > 0 ? 1 : 0);
  } catch (e) {
    console.error('FAIL: audit crash', e.message || e);
    try { win.destroy(); } catch (_) {}
    app.quit();
    process.exit(1);
  }
});

app.on('window-all-closed', () => {});
