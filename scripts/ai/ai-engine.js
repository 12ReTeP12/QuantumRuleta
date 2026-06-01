/* AI engine — extracted from index-NOVY-V4.html
   LEN bezpečné oddelenie (bez refactoru / bez zmeny logiky). */

'use strict';

function lfpDeadFlowDetector(flow,stability,confidence,noClearDominance,anomaly){
const dead=flow.state==='CHAOTIC'||flow.state==='ALTERNATING'
||(stability.score<26&&!anomaly.repeatStrong)
||(noClearDominance&&confidence<36&&flow.state!=='REPEAT')
||(stability.score<32&&noClearDominance);
return{dead,label:dead?'MŔTVY FLOW':null,forceWait:dead,detail:dead?'Žiadny stabilný flow · režim čakania':'Tok živý'};
}

function computeRiskChaosCore(){
if(spins.length<2)return{chaosLevel:0,stability:50,patternReliability:50,randomnessPressure:0,entropy:0,volatility:0,timingInstability:0,clusterConflict:0,score:50,tag:'—'};
computeSpinCore();
computeTimingCore();
const ent=parseFloat(entropy())||0;
const iv=spinIntervals();
const volatility=iv.length>=2?clamp(ivStd(iv)*18):0;
const timingInstability=clamp(100-lastTimingBreakdown.stability);
const clusterConflict=computeClusterConflict();
const chaosLevel=clamp(
ent*12+
volatility*0.45+
timingInstability*0.2+
clusterConflict*0.15+
(100-lastSpinBreakdown.entropy)*0.12
);
const stability=scoreEntropyStability();
const patternReliability=clamp(
lastSpinBreakdown.cluster*0.32+
(100-repeatRate())*0.28+
stability*0.22+
(100-clusterConflict*2)*0.18
);
const randomnessPressure=clamp(
ent*14+
volatility*0.55+
timingInstability*0.12+
(100-lastSpinBreakdown.entropy)*0.1
);
const score=clamp(
chaosLevel*0.34+
(100-stability)*0.24+
(100-patternReliability)*0.22+
randomnessPressure*0.2
);
let tag='MID';
if(score<38)tag='LOW';
else if(score>=62)tag='HIGH';
return{
chaosLevel:Math.round(chaosLevel),
stability:Math.round(stability),
patternReliability:Math.round(patternReliability),
randomnessPressure:Math.round(randomnessPressure),
entropy:ent,
volatility:Math.round(volatility),
timingInstability:Math.round(timingInstability),
clusterConflict:Math.round(clusterConflict),
entropySignal:lastSpinBreakdown.entropy,
score:Math.round(score),
tag
};
}

function analyzeChaosFromSpins(){
const risk=spins.length>=2?computeRiskChaosCore():{chaosLevel:50};
const ent=parseFloat(entropy())||0;
const rep=repeatRate();
const mig=analyzeMigrationFlow();
const dead=mig.dir==='MIX'&&ent>5.4&&rep<20;
return{chaosLevel:risk.chaosLevel,entropy:ent,repeat:rep,deadFlow:dead,noEdge:risk.chaosLevel>=68||ent>5.75||dead,tag:dead?'RANDOM':risk.chaosLevel>=65?'CHAOS':'STABLE'};
}

function computeHotColdEngine(){
const key=spins.length+'|'+spins.join(',');
if(lastHotColdEngine&&lastHotColdKey===key)return lastHotColdEngine;
const empty={
hot:[],cold:[],recovering:[],overheated:[],sectorHeat:[],
weighted:{},raw:{},meanWeight:0,totalWeight:0
};
if(!spins.length){
lastHotColdEngine=empty;
lastHotColdKey=key;
return empty;
}
const weighted=getWeightedNumberScores();
const raw=rawSpinCounts();
const totalW=weightedTotal();
const meanW=Object.values(weighted).reduce((a,b)=>a+b,0)/37;
const all=[];
for(let n=0;n<=36;n++){
const since=spinsSince(n);
const w=weighted[n]||0;
const c=raw[n]||0;
const freqPct=spins.length?(c/spins.length)*100:0;
const wShare=totalW>0?(w/totalW)*100:0;
const recentW=getRecentWeightedHits(n,8);
const recoveryScore=since>=5?clamp(since*2.2+(meanW-w)*8-recentW*3,0,55):clamp(since*0.8,0,12);
const overheatScore=w>meanW*1.25&&since<=4?clamp((w/meanW)*28-since*2.5+recentW*4,0,60):0;
all.push({n,c,w,wShare,freqPct,since,recentW,recoveryScore,overheatScore});
}
const hot=[...all].sort((a,b)=>b.w-a.w||b.c-a.c||a.n-b.n);
const cold=[...all].sort((a,b)=>a.w-b.w||a.since-b.since||a.n-b.n);
const recovering=[...all].filter(x=>x.recoveryScore>=14).sort((a,b)=>b.recoveryScore-a.recoveryScore);
const overheated=[...all].filter(x=>x.overheatScore>=12).sort((a,b)=>b.overheatScore-a.overheatScore);
const sectorHeat=[];
for(let i=0;i<wheel.length;i++){
const nums=[];
for(let j=-2;j<=2;j++)nums.push(wheel[(i+j+wheel.length)%wheel.length]);
let heat=0,hits=0;
nums.forEach(n=>{heat+=weighted[n]||0;if(raw[n])hits+=raw[n];});
const heatPct=totalW>0?(heat/(totalW*5))*100:0;
sectorHeat.push({index:i,center:nums[2],nums,heat,heatPct,hits});
}
sectorHeat.sort((a,b)=>b.heat-a.heat);
const result={
hot,cold,recovering,overheated,sectorHeat,
weighted,raw,meanWeight:meanW,totalWeight:totalW,all
};
lastHotColdEngine=result;
lastHotColdKey=key;
return result;
}

function runSpinsEnginePipeline(){
const key=spins.length+'|'+spinRecords.length+'|'+predCacheKey();
if(spinsEngineCache&&spinsEngineCacheKey===key)return spinsEngineCache;
if(spinsEngineDepth>0){
return spinsEngineCache||{ready:false,timing:{core:lastTimingBreakdown.total||50},visual:{core:lastVisualBreakdown.total||50}};
}
if(!spins.length){spinsEngineCache={ready:false};spinsEngineCacheKey=key;return spinsEngineCache;}
spinsEngineDepth++;
let result;
try{
updateStats();
const hot10=hotColdForWindow(10),hot20=hotColdForWindow(20),hot30=hotColdForWindow(30),hot50=hotColdForWindow(50);
const neighbors=analyzeWheelNeighborChain();
const cluster=analyzeClusterPressure();
const migration=analyzeMigrationFlow();
const chaos=analyzeChaosFromSpins();
computeSpinCore();
const liveScore=computeLiveAIScore(cluster,migration,chaos,neighbors);
const inv=spins.length>=2?computeInvisibleEngines(liveScore):null;
const playState=resolvePlayState(liveScore,chaos,inv);
const timing=runTimingEngineSupport();
const visual=runVisualFromSpins({cluster,migration,chaos,neighbors,hotCold10:hot10,playState});
const aiConfidence=clamp(Math.round(liveScore*MODEL.SPINS+timing.core*MODEL.TIMING+visual.core*MODEL.VISUAL));
lastCoreValues={spinCore:liveScore,timingCore:timing.core,visualCore:visual.core};
result={
ready:true,role:'SPINS ENGINE 70%',liveScore,aiConfidence,playState,cluster,migration,chaos,neighbors,
hotWindows:{w10:hot10,w20:hot20,w30:hot30,w50:hot50},
patterns:{active:spinMemoryEngine.activePatterns.slice(0,5),dying:spinMemoryEngine.dyingPatterns.slice(0,3)},
timing,visual,breakdown:lastSpinBreakdown,
suppressRecommendation:playState.state==='CHAOS'||playState.state==='SAFE'||playState.state==='WAIT'||chaos.noEdge
};
spinsEngineCache=result;spinsEngineCacheKey=key;
aiStateMachine.state=playState.state;aiStateMachine.label=skAIState(playState.state);
}finally{spinsEngineDepth=Math.max(0,spinsEngineDepth-1);}
return result;
}

function buildAIPredictionPanelHTML(pr,E){
const L=(pr&&pr.lfp)||computeLiveFlowPredictionAI();
if(!L){
if(spins.length<2)return '<div class="alert">Zadaj 2+ spiny.</div>';
return '<div class="alert">Načítavam…</div>';
}
const wait=L.behavior?L.behavior.learn:(L.noPredict||(L.know&&L.know.knowsUnknown));
const dash='—';
const v=(x)=>wait?dash:(x||dash);
const play=lfpHumanPlayStatus(L);
const ctx=lfpGatherBehaviorContext(L);
const flowH=lfpHumanFlowScore(ctx.flowScore);
const chaosH=lfpHumanChaos(ctx.chaosLevel,ctx.noEdge);
const migH=lfpHumanMigration(ctx.migDir);
const clH=lfpHumanCluster(ctx.clusterPct);
const secH=lfpHumanSector(ctx.sectorNums,ctx.neighborPath);
const comment=lfpBuildHumanLiveComment(L,ctx);
const playCls=play.cls==='ok'?'greenTxt':play.cls==='bad'?'redTxt':'yellowTxt';
let h='<div class="lfp-panel lfp-human lfp-panel-dash">';
h+='<div class="lfp-human-status '+play.cls+'"><div class="panel-line"><span>Stav</span><b class="'+playCls+'">'+play.head+'</b></div></div>';
if(play.sub)h+='<p class="timing-hint">'+play.sub+'</p>';
h+='<div class="section-label">Smer · flow engine</div>';
h+=lfpPanelRow('🔥','FARBA',v(L.color));
h+=lfpPanelRow('⚡','PARITA',v(L.parity));
h+=lfpPanelRow('🎯','RANGE',v(L.range));
h+=lfpPanelRow('📊','TUCTY',v(L.dozens));
h+=lfpPanelRow('📈','STĹPCE',v(L.columns));
h+='<div class="section-label">Správanie kolesa</div>';
h+='<div class="lfp-human-metrics">';
h+=lfpHumanMetricHtml('🌀',flowH);
h+=lfpHumanMetricHtml('🌪️',chaosH);
h+=lfpHumanMetricHtml('🔄',migH);
h+=lfpHumanMetricHtml('📊',clH);
h+=lfpHumanMetricHtml('🧲',secH);
h+='</div>';
h+='<p class="timing-hint lfp-human-comment">'+comment+'</p>';
if(L.odNuly!=null&&!wait)h+='<div class="panel-line"><span>Od nuly</span><b class="greenTxt">'+L.odNuly+' spinov</b></div>';
h+='</div>';
return h;
}
