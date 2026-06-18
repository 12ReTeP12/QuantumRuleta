/**
 * Balík 8.4A — undo konzistencia successfulPredictions / successRate
 * Spustenie: npx electron scripts/tests/audit-metrics-undo-8.4a.cjs
 */
const path = require('path');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..', '..');
let failed = 0;

function pass(id, msg) { console.log('PASS', id + ':', msg); }
function fail(id, msg) { console.error('FAIL', id + ':', msg); failed++; }

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
  await win.loadFile(path.join(root, 'index-NOVY-V2.html'));
  const R = await win.webContents.executeJavaScript(`(async function(){
    function rate(){ return totalPredictions>0?+(successfulPredictions/totalPredictions*100).toFixed(1):50; }
    clearSessionData();
    lastFlowFocus={nums:[1,2,3,4,5,6],center:3,label:'test'};
    lastPrediction=[1,2,3];
    lastPick={col:0,doz:0};
    predLastPick={col:0,doz:0};
    onNewSpin(2);
    const afterHit={tp:totalPredictions,sp:successfulPredictions,rate:rate(),metrics:lastSpinScoreMetrics};
    onUndoSpin();
    const afterUndo={tp:totalPredictions,sp:successfulPredictions,rate:rate(),metrics:lastSpinScoreMetrics};
    onNewSpin(99);
    onUndoSpin();
    const missUndo={tp:totalPredictions,sp:successfulPredictions,rate:rate()};
    return {afterHit,afterUndo,missUndo};
  })()`);
  await win.destroy();
  app.quit();

  if (R.afterHit.sp === 1 && R.afterHit.tp === 1) pass('hit-count', 'cluster hit scored 1/1');
  else fail('hit-count', JSON.stringify(R.afterHit));

  if (R.afterUndo.sp === 0 && R.afterUndo.tp === 0 && R.afterUndo.rate === 50) {
    pass('undo-hit', 'successfulPredictions/totalPredictions/successRate reverted');
  } else fail('undo-hit', JSON.stringify(R.afterUndo));

  if (R.missUndo.sp === 0 && R.missUndo.tp === 0) pass('undo-miss', 'miss undo keeps sp=0');
  else fail('undo-miss', JSON.stringify(R.missUndo));

  console.log('\n=== BALÍK 8.4A METRICS UNDO ===');
  console.log(failed ? 'VERDICT: FAIL (' + failed + ')' : 'VERDICT: PASS');
  process.exit(failed ? 1 : 0);
});
