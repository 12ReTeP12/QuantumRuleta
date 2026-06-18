/**
 * Bootstrap — Balík 10D extrakcia z index-NOVY-V2.html
 * Závisí na: board-ui (renderKeyboard), quantum-wheel (qwEnsureBoardOutsideWheel),
 * keyboard-live-ai-flow (renderKeyboardLiveAIFlow), V2 inline (bindUi, loadSessionIDB,
 * renderLight, renderHeavy, updateStats, onNewSpin, clearSessionData).
 */
'use strict';

function initBoard() {
  renderKeyboard();
}

function initWheel() {
  qwEnsureBoardOutsideWheel();
  if (typeof qwBindWheelResize === 'function') qwBindWheelResize();
}

function initAI() {
  if (typeof renderKeyboardLiveAIFlow === 'function') renderKeyboardLiveAIFlow();
}

function bindSpinEventBusListeners() {
  if (bindSpinEventBusListeners._done || typeof EventBus === 'undefined') return;
  bindSpinEventBusListeners._done = true;
  /* Balík 2A: render len cez onNewSpin → EVENT.RENDER → renderLight/renderHeavy (žiadne spin:add render listenery). */
}

function qwSeedStrongFlowDemo() {
  if (typeof clearSessionData !== 'function' || typeof onNewSpin !== 'function') return false;
  try {
    var p = new URLSearchParams(location.search);
    if (p.get('demoFlow') !== 'strong') return false;
    window.__qwDemoMockup = true;
    clearSessionData();
    var seq = [20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 20, 14, 31, 9, 22, 18, 29, 20, 14, 31, 9, 20, 14, 31, 9, 22, 18, 20, 14, 31, 9, 20, 14, 31, 9, 22, 18, 29, 7, 20, 14, 31, 9];
    for (var i = 0; i < seq.length; i++) onNewSpin(seq[i]);
    return true;
  } catch (e) {
    return false;
  }
}

function bootApp() {
  window.__qwV2HeroTarget = true;
  var rd = document.getElementById('wheelRadarData');
  if (rd) {
    delete rd.dataset.qwDomBuild;
  }
  initWheel();
  function applyBootUI(restored) {
    updateStats();
    updateSessionStatus();
    renderLight({ wheelImmediate: true });
    renderHeavy();
    initV6ZoneScroll();
    if (restored && spins.length) showSessionToast('Relácia obnovená · ' + spins.length + ' spinov');
  }
  initBoard();
  bindUi();
  initV6ZoneScroll();
  bindSpinEventBusListeners();
  initAI();
  applyBootUI(false);
  loadSessionIDB()
    .then(function (restored) {
      if (qwSeedStrongFlowDemo()) {
        applyBootUI(true);
        return;
      }
      if (restored) applyBootUI(true);
    })
    .catch(function () {});
}

var createBoard = initBoard;
