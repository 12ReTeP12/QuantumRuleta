/* App bootstrap — extracted from index-NOVY-V4.html */
'use strict';

function initBoard(){
renderKeyboard();
}

function initWheel(){
qwEnsureBoardOutsideWheel();
if(typeof qwBindWheelResize==='function')qwBindWheelResize();
}

function initAI(){
if(typeof renderKeyboardLiveAIFlow==='function')renderKeyboardLiveAIFlow();
}

function bootApp(){
initWheel();
function applyBootUI(restored){
updateStats();
updateSessionStatus();
renderLight({wheelImmediate:true});
renderHeavy();
initV6ZoneScroll();
if(restored&&spins.length)showSessionToast('Relácia obnovená · '+spins.length+' spinov');
}
initBoard();
bindUi();
initV6ZoneScroll();
initAI();
applyBootUI(false);
loadSessionIDB().then(function(restored){
if(restored)applyBootUI(true);
}).catch(function(){});
}

var createBoard=initBoard;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootApp);
else bootApp();
