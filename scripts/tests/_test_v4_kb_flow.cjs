/**
 * KLÁVESNICA · LIVE AI FLOW — 3 scenáre
 * Spustenie: node scripts/tests/_test_v4_kb_flow.cjs  (cez electron)
 */
const path = require('path');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V4.html');
let failed = 0;
const ok = (m) => console.log('OK:', m);
const fail = (m) => { console.error('FAIL:', m); failed++; };

app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();

const TEST_JS = `(async function(){
  function panelState() {
    renderKeyboardLiveAIFlow();
    const banner = document.getElementById('kbFlowBanner');
    const row = document.getElementById('kbFlowRow');
    const prim = document.getElementById('kbFlowPrimary');
    const sec = document.getElementById('kbFlowSecondary');
    const R = computeKeyboardLiveAIFlow();
    return {
      bannerTxt: (banner && banner.textContent) || '',
      bannerCls: (banner && banner.className) || '',
      rowHidden: !!(row && row.hidden),
      primCount: prim ? prim.querySelectorAll('.kb-flow-box').length : 0,
      secCount: sec ? sec.querySelectorAll('.kb-flow-box').length : 0,
      primText: (prim && prim.textContent) || '',
      R
    };
  }
  function expectChaosBanner(R) {
    const c = R.chaos;
    if (c < 50) return R.banner.txt.indexOf('HRÁŤ') >= 0 || R.banner.txt.indexOf('HRAŤ') >= 0;
    if (c <= 70) return R.banner.txt.indexOf('OPATRNE') >= 0;
    return R.banner.txt.indexOf('ČAKAJ') >= 0;
  }
  const out = [];

  clearSessionData();
  renderLight();
  let s = panelState();
  const t1ok = s.R.learn && !s.R.active && s.bannerTxt.indexOf('ČAKAJ') >= 0
    && s.rowHidden && s.primCount === 0;
  out.push({ name: 'TEST 1: 0 spinov — ČAKAJ, tucty skryté', ok: t1ok,
    msg: 'spins=' + spins.length + ' rowHidden=' + s.rowHidden + ' prim=' + s.primCount + ' banner=' + s.bannerTxt });

  clearSessionData();
  [32,15,19,4,21,2,25,17,34,6,27,13].forEach(n => spin(n));
  renderLight();
  s = panelState();
  const t2ok = s.R.active && !s.rowHidden && s.primCount >= 2 && s.secCount >= 3
    && s.primText.indexOf('TUCET') >= 0 && s.primText.indexOf('STĹPEC') >= 0;
  out.push({ name: 'TEST 2: 12 spinov — tucty + stĺpce viditeľné', ok: t2ok,
    msg: 'spins=' + spins.length + ' prim=' + s.primCount + ' sec=' + s.secCount });

  const savedSpins = spins.slice();
  const origChaos = computeRiskChaosCore;
  const chaosCases = [
    { chaos: 30, expect: 'HRAŤ' },
    { chaos: 49, expect: 'HRAŤ' },
    { chaos: 50, expect: 'OPATRNE' },
    { chaos: 70, expect: 'OPATRNE' },
    { chaos: 71, expect: 'ČAKAJ' },
  ];
  let t3all = true;
  let t3msg = [];
  for (const tc of chaosCases) {
    spins = savedSpins.slice();
    computeRiskChaosCore = function() { return { chaosLevel: tc.chaos }; };
    const R = computeKeyboardLiveAIFlow();
    renderKeyboardLiveAIFlow();
    const row = document.getElementById('kbFlowRow');
    const prim = document.getElementById('kbFlowPrimary');
    const match = R.banner.txt.indexOf(tc.expect) >= 0;
    const visible = R.active && !row.hidden && prim.querySelectorAll('.kb-flow-box').length >= 2;
    const okC = match && visible && expectChaosBanner(R);
    if (!okC) t3all = false;
    t3msg.push('chaos' + tc.chaos + '→' + R.banner.txt + (visible ? ' boxesOK' : ' NOboxes'));
  }
  computeRiskChaosCore = origChaos;
  spins = savedSpins.slice();
  renderKeyboardLiveAIFlow();

  clearSessionData();
  for (let i = 0; i < 136; i++) spin((i * 7 + 3) % 37);
  renderLight();
  const R136 = computeKeyboardLiveAIFlow();
  s = panelState();
  const t3b = R136.active && !s.rowHidden && s.primCount >= 2
    && expectChaosBanner(R136);
  out.push({ name: 'TEST 3: chaos prahy + tucty vždy po 12+', ok: t3all, msg: t3msg.join(' | ') });
  out.push({ name: 'TEST 3b: 136 spinov — banner vs chaos', ok: t3b,
    msg: 'chaos=' + R136.chaos + '% banner=' + R136.banner.txt + ' prim=' + s.primCount });

  clearSessionData();
  renderLight();
  const B0 = predCoreBehaviorEngine();
  const aiOk = B0 && B0.learn && B0.columns === '—' && B0.playHead.indexOf('ČAKAJ') >= 0;
  out.push({ name: 'AI PRED: 0 spinov — ČAKAJ, bez tuctov', ok: aiOk, msg: B0 ? B0.playHead + ' cols=' + B0.columns : 'no B' });

  clearSessionData();
  for (let i = 0; i < 12; i++) spin((i * 5 + 7) % 37);
  renderLight();
  const pr12 = computeAIPrediction();
  const B12 = pr12 && pr12.lfp && pr12.lfp.behavior;
  const ai12 = B12 && B12.active && B12.columns.indexOf('+') >= 0 && B12.dozens.indexOf('+') >= 0;
  out.push({ name: 'AI PRED: 12+ — vždy 2 tucty + 2 stĺpce', ok: ai12,
    msg: (B12 ? B12.columns + ' | ' + B12.dozens + ' · ' + B12.playHead : 'missing') });

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
  await new Promise((r) => setTimeout(r, 2000));

  const report = await win.webContents.executeJavaScript(TEST_JS);
  for (const r of report) {
    if (r.ok) ok(r.name + ' — ' + r.msg);
    else fail(r.name + ' — ' + r.msg);
  }

  app.quit();
  process.exit(failed ? 1 : 0);
});
