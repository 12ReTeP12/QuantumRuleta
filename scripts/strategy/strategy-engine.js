/**
 * Strategy Engine — Balík 10H-5 z index-NOVY-V2.html
 * Závisí na: pred-dashboard, ai-prediction, timing-engine (runtime), V2 inline (risk chaos)
 */
'use strict';

function skStrategyMode(m){const x={SAFE:'BEZPEČNÁ',MEDIUM:'STREDNÁ',AGGRESSIVE:'AGRESÍVNA'};return x[m]||m;}

let lastStrategyEngine=null;
let lastStrategyKey='';
function invalidateStrategyCache(){
lastStrategyEngine=null;
lastStrategyKey='';
}
function computeStrategyEngine(){
const key=spins.length+'|'+predCacheKey()+'|'+totalPredictions+'|'+successfulPredictions+'|'+adaptiveWeights.failStreak;
if(lastStrategyEngine&&lastStrategyKey===key)return lastStrategyEngine;
const empty={
mode:'MEDIUM',
label:'MEDIUM',
confidence:0,chaos:0,timingStability:0,successRate:0,
hitPrimaryRate:null,hitPrimaryHits:0,hitPrimaryTotal:0,
hitClusterRate:null,hitClusterHits:0,hitClusterTotal:0,
safeScore:0,aggressiveScore:0,
sources:'jednotná spoľahlivosť (neviditeľná vrstva) · chaos · timing · história úspechov',
reason:'Čakám na spiny'
};
if(spins.length<2){lastStrategyEngine=empty;lastStrategyKey=key;return empty;}
let pr=lastAIPredictionCache&&lastAIPredictionKey===predCacheKey()?lastAIPredictionCache:null;
if(!pr&&coreAnalysisDepth===0)pr=computeAIPrediction();
if(!pr)pr={spinCore:lastCoreValues.spinCore||50,timingCore:lastCoreValues.timingCore||50,visualCore:lastCoreValues.visualCore||50,confidence:clamp(lastCoreValues.spinCore||50)};
const inv=getInvisibleLayer();
const risk=coreAnalysisDepth>0?{chaosLevel:50,stability:50,score:50}:{chaosLevel:50,stability:50,score:50};
if(coreAnalysisDepth===0)Object.assign(risk,computeRiskChaosEngine());
if(spins.length>=2)computeTimingCore();
const confidence=getUnifiedConfidence();
const chaos=inv?inv.diagnostics.chaos:risk.chaosLevel;
const timingStability=lastTimingBreakdown.stability;
const successRate=totalPredictions>0?+(successfulPredictions/totalPredictions*100).toFixed(1):50;
const hitPrimaryRate=totalHitPrimary>0?+(successfulHitPrimary/totalHitPrimary*100).toFixed(1):null;
const hitClusterRate=totalHitCluster>0?+(successfulHitCluster/totalHitCluster*100).toFixed(1):null;
const failStreak=adaptiveWeights.failStreak;
const safeScore=clamp(
confidence*0.34+
(100-chaos)*0.26+
timingStability*0.24+
successRate*0.16-
failStreak*6
);
const aggressiveScore=clamp(
confidence*0.28+
timingStability*0.18+
successRate*0.14+
(100-Math.abs(50-chaos))*0.12+
(pr?pr.spinCore:50)*0.18-
failStreak*8
);
let mode='MEDIUM';
let reason='Vyvážený režim — stredná istota a riziko.';
if(chaos>=68||confidence<42||timingStability<38||failStreak>=4){
mode='SAFE';
reason='Vysoký chaos, nízka istota alebo zlé tipy — konzervatívna stratégia.';
}else if(confidence>=76&&chaos<52&&timingStability>=58&&successRate>=40&&failStreak<=1&&aggressiveScore>=62){
mode='AGGRESSIVE';
reason='Silná predikcia, stabilný timing a dobrá história — agresívny režim.';
}else if(confidence>=68&&chaos<48&&timingStability>=62&&successRate>=45&&failStreak<2&&safeScore>=58){
mode='SAFE';
reason='Vysoká istota, nízky chaos a stabilný timing — bezpečný režim.';
}else if(safeScore>=aggressiveScore+8&&safeScore>=55){
mode='SAFE';
reason='Bezpečný profil prevažuje nad agresívnym.';
}else if(aggressiveScore>=safeScore+10&&aggressiveScore>=58){
mode='AGGRESSIVE';
reason='Agresívny profil — vhodné pri silnom signáli.';
}else{
mode='MEDIUM';
reason='Zmiešané signály — stredná stratégia.';
}
if(inv){
if(inv.suppress.hideAggressivePred||inv.risk==='HIGH'||inv.signalQuality==='WEAK'||inv.edge==='NO EDGE'){
if(mode==='AGGRESSIVE'){mode='MEDIUM';reason='Invisible layer: vysoký risk/chaos — bez AGGRESSIVE.';}
}
if(inv.suppress.hideWeakSignals||inv.flowState==='COLLAPSING'){
if(mode!=='SAFE'){mode='SAFE';reason='Invisible layer: suppression — len SAFE režim.';}
}else if(inv.suppress.hideLowConfidence&&mode==='AGGRESSIVE'){
mode='MEDIUM';reason='Nízka unified confidence — stredná stratégia.';
}
}
const label=skStrategyMode(mode);
const modeCls=mode==='SAFE'?'greenTxt':mode==='AGGRESSIVE'?'redTxt':'yellowTxt';
const result={
mode,
label,
modeCls,
confidence:Math.round(confidence),
chaos:Math.round(chaos),
timingStability:Math.round(timingStability),
successRate,
hitPrimaryRate,hitPrimaryHits:successfulHitPrimary,hitPrimaryTotal:totalHitPrimary,
hitClusterRate,hitClusterHits:successfulHitCluster,hitClusterTotal:totalHitCluster,
hits:successfulPredictions,
total:totalPredictions,
failStreak,
safeScore:Math.round(safeScore),
aggressiveScore:Math.round(aggressiveScore),
sources:'jednotná spoľahlivosť (neviditeľná vrstva) · chaos · timing · história úspechov',
reason,
invisible:inv?{flow:inv.flowState,signal:inv.signalQuality,risk:inv.risk,edge:inv.edge}:null,
prediction:pr?{tip:pr.tip,confidence:confidence}:null
};
lastStrategyEngine=result;
lastStrategyKey=key;
return result;
}

/* ======================================
ACCURACY
====================================== */

function renderStrategy(){
const accuracyEl=document.getElementById('accuracy');
const memoryEl=document.getElementById('memory');
if(!accuracyEl&&!memoryEl)return;
const s=computeStrategyEngine();
if(spins.length<2){
const wait='<div class="alert">Čakám na spiny — stratégia…</div>';
if(accuracyEl)accuracyEl.innerHTML=wait;
if(memoryEl)memoryEl.innerHTML='';
return;
}
if(accuracyEl){
accuracyEl.innerHTML=
'<div class="section-label">Stratégia · '+s.sources+'</div>'
+'<div class="panel-line" style="margin:6px 0"><span>REŽIM</span><b class="'+s.modeCls+'" style="font-size:23px">'+s.label+'</b></div>'
+'<div class="panel-line"><span>BEZPEČNÁ</span><b class="'+(s.mode==='SAFE'?'greenTxt':'')+'">'+(s.mode==='SAFE'?'● ':'')+s.safeScore+'%</b></div>'
+'<div class="panel-line"><span>STREDNÁ</span><b class="'+(s.mode==='MEDIUM'?'yellowTxt':'')+'">'+(s.mode==='MEDIUM'?'● AKTÍVNA':'—')+'</b></div>'
+'<div class="panel-line"><span>AGRESÍVNA</span><b class="'+(s.mode==='AGGRESSIVE'?'redTxt':'')+'">'+(s.mode==='AGGRESSIVE'?'● ':'')+s.aggressiveScore+'%</b></div>'
+'<div class="alert" style="border:1px solid rgba(0,255,191,.15);font-size:10px">'+s.reason+'</div>';
}
if(memoryEl){
memoryEl.innerHTML=
'<div class="section-label">Vstupy</div>'
+(s.invisible?'<div class="panel-line"><span>Neviditeľná vrstva</span><b class="blueTxt">'+s.invisible.flow+' · '+s.invisible.signal+' · Riziko '+skRisk(s.invisible.risk)+'</b></div>':'')
+'<div class="panel-line"><span>Jednotná spoľahlivosť</span><b class="greenTxt">'+s.confidence+'%</b></div>'
+'<div class="panel-line"><span>Chaos</span><b class="'+(s.chaos>=58?'redTxt':'yellowTxt')+'">'+s.chaos+'%</b></div>'
+'<div class="panel-line"><span>Stabilita timingu</span><b class="blueTxt">'+s.timingStability+'%</b></div>'
+'<div class="panel-line"><span>História úspechov</span><b class="yellowTxt">'+s.successRate+'% · '+s.hits+'/'+s.total+'</b></div>'
+'<div class="panel-line"><span>Hit primárny tip</span><b class="blueTxt">'+(s.hitPrimaryRate!=null?s.hitPrimaryRate:'—')+'% · '+s.hitPrimaryHits+'/'+s.hitPrimaryTotal+'</b></div>'
+'<div class="panel-line"><span>Hit klaster/sektor</span><b class="blueTxt">'+(s.hitClusterRate!=null?s.hitClusterRate:'—')+'% · '+s.hitClusterHits+'/'+s.hitClusterTotal+'</b></div>'
+'<div class="panel-line"><span>Rad neúspechov</span><b class="'+(s.failStreak>=2?'redTxt':'greenTxt')+'">'+s.failStreak+'×</b></div>'
+(s.prediction?'<div class="panel-line"><span>Tip</span><b class="blueTxt">'+s.prediction.tip+'</b></div>':'');
}
}
function renderAccuracy(){renderStrategy();}
