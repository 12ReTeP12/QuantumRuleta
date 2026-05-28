/**
 * AI PREDIKCIA — testy 1–4
 * npm: npx electron scripts/tests/_test_v4_ai_pred.cjs
 */
const path = require('path');
const { app, BrowserWindow } = require('electron');

const htmlPath = path.join(__dirname, '..', '..', 'index-NOVY-V4.html');
let failed = 0;
const ok = (m) => console.log('OK:', m);
const fail = (m) => { console.error('FAIL:', m); failed++; };

const TEST_JS = `(async function(){
  function panelHtml() {
    renderCorePrediction();
    return (document.getElementById('corePrediction') || {}).innerHTML || '';
  }
  function B() {
    const pr = computeAIPrediction();
    return (pr && pr.lfp && pr.lfp.behavior) || predCoreBehaviorEngine();
  }
  const out = [];

  clearSessionData();
  renderLight();
  let b = B();
  const html0 = panelHtml();
  const t1 = b.learn && b.columns === '—' && b.dozens === '—'
    && (b.playSub.indexOf('AI sa učí flow session') >= 0 || html0.indexOf('AI sa učí flow session') >= 0);
  out.push({ name: 'TEST 1: 0 spinov — učenie, tucty skryté', ok: t1,
    msg: b.playSub + ' | html=' + (html0.indexOf('AI sa učí') >= 0) });

  clearSessionData();
  [32,15,19,4,21,2,25,17,34,6,27,13].forEach(n => spin(n));
  renderLight();
  b = B();
  const html12 = panelHtml();
  const t2 = b.active && b.columns.indexOf('+') >= 0 && b.dozens.indexOf('+') >= 0
    && html12.indexOf('—') < html12.indexOf('TUCTY') || html12.match(/TUCTY[\\s\\S]*?\\d\\s*\\+\\s*\\d/);
  out.push({ name: 'TEST 2: 12 spinov — 2 tucty + 2 stĺpce', ok: !!t2,
    msg: b.columns + ' | ' + b.dozens });

  clearSessionData();
  [1,2,3,4,5,6,7,8,9,10,11,12].forEach(n => spin(n));
  spin(30); spin(30); spin(30);
  renderLight();
  b = B();
  const p30 = predAINumProps(30);
  const t3 = b.anomalyActive && b.antiCopy
    && b.color === 'ČIERNA' && b.parity === 'NEPÁRNE' && b.range === '1–18'
    && b.columns.indexOf('+') >= 0 && b.dozens.indexOf('+') >= 0
    && (b.anomalyMsg.indexOf('ANOMÁLIA') >= 0 || (computeLiveFlowPredictionAI().detections || []).join(' ').indexOf('ANOMÁLIA') >= 0);
  out.push({ name: 'TEST 3: 3×30 — anomália, anti-copy, opačné páry', ok: !!t3,
    msg: 'anom=' + b.anomalyActive + ' ' + b.color + '/' + b.parity + '/' + b.range + ' | ' + b.columns + ' | ' + b.anomalyMsg });

  clearSessionData();
  const altSeq = [1,3,4,6,7,9,10,12,1,3,4,6];
  altSeq.forEach(n => spin(n));
  renderLight();
  b = B();
  const L = computeLiveFlowPredictionAI();
  const det = (L && L.detections) ? L.detections.join(' ') : '';
  const alt = (b.patterns && b.patterns.alternating) || {};
  const t4 = b.alternatingRhythm && (alt.col || det.indexOf('ALTERNATING') >= 0)
    && (L.flow && L.flow.state === 'ALTERNATING' || det.indexOf('striebenie') >= 0 || (b.alternatingLabel || '').indexOf('ALTERNATING') >= 0);
  out.push({ name: 'TEST 4: 1↔3 alternating — rhythm', ok: !!t4,
    msg: 'alt=' + b.alternatingRhythm + ' col=' + alt.col + ' flow=' + (L.flow && L.flow.state) + ' | ' + (b.alternatingLabel || det.slice(0,60)) });

  return out;
})()`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1400,
    height: 900,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  await win.loadFile(htmlPath);
  await new Promise((r) => setTimeout(r, 2200));

  const report = await win.webContents.executeJavaScript(TEST_JS);
  for (const r of report) {
    if (r.ok) ok(r.name + ' — ' + r.msg);
    else fail(r.name + ' — ' + r.msg);
  }

  app.quit();
  process.exit(failed ? 1 : 0);
});
