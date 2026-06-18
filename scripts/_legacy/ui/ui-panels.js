/**
 * ARCHÍV (Balík 9A) — scripts/_legacy/ui/ui-panels.js
 * Produkcia V2 nenačítava tento súbor.
 * Autorita: index-NOVY-V2.html inline (renderKeyboardLiveAIFlow, kbLiveFlowPanel).
 * Budúca extrakcia: Balík 9B — sync inline → modul.
 */
'use strict';

function renderKeyboardLiveAIFlow(){
const root=document.getElementById('kbLiveFlowPanel');
if(!root)return;
const R=computeKeyboardLiveAIFlow();
const learnEl=document.getElementById('kbFlowLearn');
const bannerEl=document.getElementById('kbFlowBanner');
const rowEl=document.getElementById('kbFlowRow');
const primEl=document.getElementById('kbFlowPrimary');
const secEl=document.getElementById('kbFlowSecondary');
const metaEl=document.getElementById('kbFlowMeta');
root.classList.toggle('kb-flow-has-anomaly',!!R.anomaly&&R.active);
const showSignals=!!R.active;
if(learnEl){
if(R.learn){
const pct=Math.round(R.progress/R.need*100);
learnEl.innerHTML='Učenie <b>'+R.progress+'/'+R.need+'</b>'
+'<div class="kb-flow-learn-bar"><i style="width:'+pct+'%"></i></div>';
learnEl.hidden=false;
}else learnEl.hidden=true;
}
if(rowEl)rowEl.hidden=!showSignals;
if(bannerEl){
bannerEl.textContent=R.banner.txt;
bannerEl.className='kb-flow-banner '+R.banner.cls;
bannerEl.hidden=false;
}
if(metaEl){
metaEl.textContent='Chaos '+R.chaos+'% · '+R.meta.mig+' · kliky '+R.meta.clicks;
}
if(showSignals){
if(primEl){
primEl.innerHTML=
kbFlowBoxHTML('TUCET',R.doz,true,false)
+kbFlowBoxHTML('STĹPEC',R.col,true,false);
}
if(secEl){
secEl.innerHTML=
kbFlowBoxHTML('FARBA',R.color,false,false)
+kbFlowBoxHTML('P/N',R.parity,false,false)
+kbFlowBoxHTML('RANGE',R.range,false,false);
}
}else{
if(primEl)primEl.innerHTML='';
if(secEl)secEl.innerHTML='';
}
}
