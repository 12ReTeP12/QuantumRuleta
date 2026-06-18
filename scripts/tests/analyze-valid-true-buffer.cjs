/**
 * Analyzuje validTrueV0Buffer z localStorage (Electron, rovnaký origin ako V2).
 * Spustenie: npx electron scripts/tests/analyze-valid-true-buffer.cjs
 */
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..', '..');
const outPath = path.join(root, 'valid-true-export', 'session-signal-analysis.json');

app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  await win.loadFile(path.join(root, 'index-NOVY-V2.html'));
  await new Promise((r) => setTimeout(r, 2500));

  const result = await win.webContents.executeJavaScript(`(function(){
    const raw = localStorage.getItem('validTrueV0Buffer');
    if (!raw) return { error: 'no validTrueV0Buffer' };
    const lines = JSON.parse(raw);
    const spins = lines.filter(x => x && x.type === 'spin');
    const counts = {};
    const playGate = { 'HRAŤ': 0, 'ČAKAJ': 0, 'OPATRNE': 0, other: 0, null: 0 };
    const learnFlag = { true: 0, false: 0 };
    let nCol = 0;
    const chaosAtLog = [];
    spins.forEach(r => {
      const c = (r.signal && r.signal.code) || 'MISSING';
      counts[c] = (counts[c] || 0) + 1;
      const g = r.signal && r.signal.playGate;
      const st = g && g.status;
      if (!st) playGate.null++;
      else if (playGate[st] != null) playGate[st]++;
      else playGate.other++;
      if (g && g.learn) learnFlag.true++; else learnFlag.false++;
      if (r.outcome && (r.outcome.column === 'hit' || r.outcome.column === 'miss')) nCol++;
      if (g && g.chaosPct != null) chaosAtLog.push(g.chaosPct);
    });
    const avgChaos = chaosAtLog.length
      ? +(chaosAtLog.reduce((a, b) => a + b, 0) / chaosAtLog.length).toFixed(1)
      : null;
    const minChaos = chaosAtLog.length ? Math.min(...chaosAtLog) : null;
    const maxChaos = chaosAtLog.length ? Math.max(...chaosAtLog) : null;
    const hratUnder50 = spins.filter(r => {
      const g = r.signal && r.signal.playGate;
      return g && g.status === 'HRAŤ' && g.chaosPct != null && g.chaosPct < 50;
    }).length;
    return {
      bufferTotalLines: lines.length,
      spinRecords: spins.length,
      counts,
      playGateStatus: playGate,
      learnFlag,
      nColScored: nCol,
      chaosPct: { avg: avgChaos, min: minChaos, max: maxChaos },
      hratChaosUnder50: hratUnder50,
      sessionId: (lines.find(x => x.type === 'meta') || {}).sessionId,
      samples: {
        first3: spins.slice(0, 3).map(r => ({
          seq: r.seq,
          code: r.signal.code,
          status: r.signal.playGate && r.signal.playGate.status,
          learn: r.signal.playGate && r.signal.playGate.learn,
          chaosPct: r.signal.playGate && r.signal.playGate.chaosPct,
          primaryCol: r.signal.primary && r.signal.primary.col,
          outcomeColumn: r.outcome.column,
          spinNum: r.spin.number,
        })),
        last3: spins.slice(-3).map(r => ({
          seq: r.seq,
          code: r.signal.code,
          status: r.signal.playGate && r.signal.playGate.status,
          learn: r.signal.playGate && r.signal.playGate.learn,
          chaosPct: r.signal.playGate && r.signal.playGate.chaosPct,
          primaryCol: r.signal.primary && r.signal.primary.col,
          outcomeColumn: r.outcome.column,
          spinNum: r.spin.number,
        })),
      },
    };
  })()`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  app.quit();
  process.exit(result.error ? 1 : 0);
});
