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

function bindSpinEventBusListeners(){
if(bindSpinEventBusListeners._done||typeof EventBus==='undefined')return;
bindSpinEventBusListeners._done=true;
EventBus.on('spin:add',function(){
if(typeof renderCorePrediction==='function')renderCorePrediction();
});
EventBus.on('spin:add',function(){
if(typeof renderAlerts==='function')renderAlerts();
});
EventBus.on('spin:add',function(){
if(typeof scheduleWheelRender==='function')scheduleWheelRender();
else if(typeof renderWheelRadar==='function')renderWheelRadar();
});
EventBus.on('spin:add',function(){
if(typeof rngInvalidate==='function')rngInvalidate();
if(typeof renderRngBehavior==='function')renderRngBehavior();
});
EventBus.on('spin:add',function(){
if(typeof renderKeyboardLiveAIFlow==='function')renderKeyboardLiveAIFlow();
});
}

function qwSeedStrongFlowDemo(){
if(typeof clearSessionData!=='function'||typeof onNewSpin!=='function')return false;
try{
var p=new URLSearchParams(location.search);
if(p.get('demoFlow')!=='strong')return false;
clearSessionData();
var seq=[20,14,31,9,22,18,29,7,28,12,20,14,31,9,22,18,29,20,14,31,9,20,14,31,9,22,18,20,14,31,9,20,14,31,9,22,18,29,7,20,14,31,9];
for(var i=0;i<seq.length;i++)onNewSpin(seq[i]);
return true;
}catch(e){return false;}
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
bindSpinEventBusListeners();
initAI();
applyBootUI(false);
loadSessionIDB().then(function(restored){
if(qwSeedStrongFlowDemo()){applyBootUI(true);return;}
if(restored)applyBootUI(true);
}).catch(function(){});
}

var createBoard=initBoard;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootApp);
else bootApp();
