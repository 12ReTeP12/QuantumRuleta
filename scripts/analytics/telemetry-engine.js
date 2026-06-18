/**
 * Telemetry Engine — Balík 10H-6 z index-NOVY-V2.html
 * Závisí na: strategy, wheel-sector-intel, session-stats, bah-engine, V2 inline (risk/flow)
 */
'use strict';

function skEngineName(n){const m={'Spin core':'Jadro spinov','Timing core':'Jadro timingu','Visual core':'Jadro vizuálu','Hot/Cold':'Aktivita kolesa',Pattern:'Patterny','Risk/Chaos':'Riziko/Chaos','Wheel flow':'Tok kolesa','Wheel sector':'Sektor kolesa','Koleso flow':'Tok kolesa','Koleso sector':'Sektor kolesa',Persistence:'Perzistencia','Spin Memory':'Pamäť spinov'};return m[n]||n;}

let lastTelemetryEngine=null;
let lastTelemetryKey='';
function invalidateTelemetryCache(){
lastTelemetryEngine=null;
lastTelemetryKey='';
}
function collectEngineTelemetrySignals(){
const signals=[];
if(spins.length>=2){
computeSpinCore();
computeTimingCore();
computeVisualCore();
}
signals.push({id:'spins',name:'Jadro spinov',pct:lastCoreValues.spinCore});
signals.push({id:'timing',name:'Jadro timingu',pct:lastCoreValues.timingCore});
signals.push({id:'visual',name:'Jadro vizuálu',pct:lastCoreValues.visualCore});
if(spins.length<2)return signals;
const hc=computeHotColdEngine();
const hcPct=clamp(48+(hc.hot.length*2)-(hc.overheated.length*3));
signals.push({id:'hotcold',name:'Aktivita wheelu',pct:hcPct});
const pat=computePatternEngine();
signals.push({id:'pattern',name:'Patterny',pct:pat.patternScore});
const risk=computeRiskChaosEngine();
signals.push({id:'risk',name:'Riziko/Chaos',pct:clamp(100-risk.chaosLevel*0.55+risk.stability*0.45)});
const flow=computeWheelFlowEngine();
signals.push({id:'flow',name:'Tok kolesa',pct:flow.momentum});
const wheel=computeWheelSectorIntel();
signals.push({id:'quantum',name:'Quantum wheel',pct:clamp((wheel.spinCore+wheel.timingCore+wheel.visualCore)/3)});
const strat=computeStrategyEngine();
const stratPct=strat.mode==='SAFE'?strat.safeScore:strat.mode==='AGGRESSIVE'?strat.aggressiveScore:clamp((strat.safeScore+strat.aggressiveScore)/2);
signals.push({id:'strategy',name:'Stratégia',pct:stratPct});
const hub=computeAlertHub();
signals.push({id:'alerts',name:'Upozornenia',pct:clamp(100-hub.critical*22)});
const comment=computeSpinAIComment();
signals.push({id:'comment',name:'AI komentár',pct:comment.blendScore});
return signals;
}
function computeEngineSynchronization(signals){
if(signals.length<2)return 50;
const pcts=signals.map(s=>s.pct);
const avg=pcts.reduce((a,b)=>a+b,0)/pcts.length;
const variance=pcts.reduce((s,x)=>s+Math.pow(x-avg,2),0)/pcts.length;
return clamp(100-Math.sqrt(variance)*1.15);
}
function computeSignalQuality(signals,risk,pat){
if(!signals.length)return 0;
const avg=signals.reduce((s,e)=>s+e.pct,0)/signals.length;
return clamp(avg*0.45+pat.patternScore*0.3+risk.stability*0.25);
}
function computeConfidenceStability(){
const ai=calculateAI();
if(spins.length<2)return{score:ai,drift:0};
const comment=computeSpinAIComment();
const pr=computeAIPrediction();
const conf=pr?pr.confidence:ai;
const drift=Math.abs(comment.dataScore-comment.reasoningScore);
return{
score:clamp(100-drift*0.75-Math.abs(ai-conf)*0.25-adaptiveWeights.failStreak*11),
drift:Math.round(drift),
ai:Math.round(ai),
conf:Math.round(conf)
};
}
function computeLiveAIState(ai,sync,signal,confStab){
let state='LIVE';
let cls='greenTxt';
if(adaptiveWeights.failStreak>=3||ai<42||confStab<40){
state='DEGRADED';
cls='redTxt';
}else if(!hasMinSpins()||ai<55){
state='WARMUP';
cls='yellowTxt';
}else if(ai>=70&&sync>=58&&signal>=55&&confStab>=52){
state='STABLE';
cls='greenTxt';
}
return{state,cls};
}
function computeTelemetryEngine(){
const key=spins.length+'|'+totalPredictions+'|'+adaptiveWeights.failStreak+'|'+(spins[spins.length-1]??'');
if(lastTelemetryEngine&&lastTelemetryKey===key)return lastTelemetryEngine;
const empty={
modelLabel:'Telemetria AI · diagnostika · bez predikcií',
liveState:{state:'OFFLINE',cls:'yellowTxt',ai:0},
engineSync:0,
signalQuality:0,
confidenceStability:0,
engines:[],
note:'Čakám na spiny'
};
if(spins.length<2){lastTelemetryEngine=empty;lastTelemetryKey=key;return empty;}
const signals=collectEngineTelemetrySignals();
const risk=computeRiskChaosEngine();
const pat=computePatternEngine();
const conf=computeConfidenceStability();
const engineSync=computeEngineSynchronization(signals);
const signalQuality=computeSignalQuality(signals,risk,pat);
const ai=calculateAI();
const live=computeLiveAIState(ai,engineSync,signalQuality,conf.score);
const result={
modelLabel:'Telemetria AI · všetky engine · bez predikcií',
liveState:{...live,ai:Math.round(ai)},
engineSync:Math.round(engineSync),
signalQuality:Math.round(signalQuality),
confidenceStability:Math.round(conf.score),
confidenceDrift:conf.drift,
engines:signals,
engineCount:signals.length,
pillars:{spin:lastCoreValues.spinCore,timing:lastCoreValues.timingCore,visual:lastCoreValues.visualCore},
note:'Diagnostika — žiadne tipy ani čísla'
};
lastTelemetryEngine=result;
lastTelemetryKey=key;
return result;
}

/* ======================================
TELEMETRY
====================================== */

function renderTelemetry(){
const telemetryEl=document.getElementById('telemetry');
if(!telemetryEl)return;
const t=computeTelemetryEngine();
if(spins.length<2){
telemetryEl.innerHTML='<div class="alert">'+t.note+'</div>';
return;
}
const ls=t.liveState;
let html='<div class="section-label">'+t.modelLabel+'</div>';
const invTel=getInvisibleLayer();
if(invTel){
html+='<div class="panel-line"><span>Neviditeľný systém (pokročilé)</span><b class="blueTxt">'+formatInvisibleSystemLine(invTel)+' · jednotná '+getUnifiedConfidence()+'%</b></div>';
}
html+='<div class="panel-line"><span>Živý stav AI</span><b class="'+ls.cls+'">'+skLiveState(ls.state)+' · '+ls.ai+'%</b></div>'
+'<div class="panel-line"><span>Synchronizácia engineov</span><b class="'+(t.engineSync>=60?'greenTxt':'yellowTxt')+'">'+t.engineSync+'% · '+t.engineCount+' engine</b></div>'
+'<div class="panel-line"><span>Kvalita signálu</span><b class="'+(t.signalQuality>=58?'greenTxt':'yellowTxt')+'">'+t.signalQuality+'%</b></div>'
+'<div class="panel-line"><span>Stabilita spoľahlivosti</span><b class="blueTxt">'+t.confidenceStability+'% · drift '+t.confidenceDrift+'</b></div>'
+'<div class="section-label">Piliere 70·20·10</div>'
+'<div class="panel-line"><span>SPINY · TIMING · VIZUÁL</span><b class="blueTxt">'+t.pillars.spin+' · '+t.pillars.timing+' · '+t.pillars.visual+'</b></div>'
+'<div class="section-label">Pulz engineov (bez predikcie)</div>';
t.engines.forEach(e=>{
html+='<div class="metric"><div class="metric-label"><span>'+skEngineName(e.name)+'</span><b>'+Math.round(e.pct)+'%</b></div><div class="bar"><div class="fill" style="width:'+Math.max(0,Math.min(100,e.pct))+'%"></div></div></div>';
});
html+='<div class="alert" style="border:1px solid rgba(0,255,191,.12);font-size:9px;margin-top:4px">'+t.note+'</div>';
telemetryEl.innerHTML=html;
}
