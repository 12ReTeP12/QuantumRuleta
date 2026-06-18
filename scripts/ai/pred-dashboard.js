'use strict';
/* 10H-2 pred-dashboard.js — Balík 10H */

/* AI PREDIKCIA — zber z dashboardu · 70% SPINS · 20% TIMING · 10% VISUAL */
let lastHotColdEngine=null;
let lastHotColdKey='';
const HC_DECAY_POW=2.15;
function invalidateHotColdCache(){
lastHotColdEngine=null;
lastHotColdKey='';
}
let lastAlertHub=null;
let lastAlertHubKey='';
function invalidateAlertHub(){
lastAlertHub=null;
lastAlertHubKey='';
bahAlertPrev=null;
bahPendingConfirm={};
bahDisplayedId=null;
bahDisplayedSince=0;
bahLastSwitchTs=0;
}
let lastBoardAIScores=null;
let lastBoardAIKey='';
let lastMacroFlowSmooth=null;
function invalidateBoardAICache(){
lastBoardAIScores=null;
lastBoardAIKey='';
lastMacroFlowSmooth=null;
}
function invalidatePredCache(){
lfpInvalidate();
lastAIPredictionCache=null;
lastFlowAnalyzerCache=null;
lastFlowAnalyzerKey='';
invalidateInvisibleCache();
lastAIPredictionKey='';
invalidateBoardAICache();
invalidateWheelCache();
invalidateHotColdCache();
invalidateAlertHub();
invalidatePatternCache();
invalidateRiskChaosCache();
invalidateWheelFlowCache();
invalidateStrategyCache();
invalidateTelemetryCache();
invalidateWheelPressureCache();
invalidateVisualHeatCache();
invalidateSpinsEngine();
rouletteAnalystCache=null;rouletteAnalystKey='';
rouletteAnalystPrevSnapshot=null;rouletteAnalystSessionBaseline=null;rouletteAnalystSessionProfile=null;
rouletteObserverCache=null;rouletteObserverKey='';
rbaSessionLog=[];rbaSelfEvalHits=[];
rbaFlowMemoryPatterns=[];rbaEvolutionTrack=[];rbaPrevBehaviorSnap=null;
qwWheelMemory=[];
invalidateQuantumWheelBrainCache();
predFlowEngineCache=null;predFlowEngineKey='';
}
function invalidateWheelCache(){
if(typeof invalidateWheelSectorIntelCache==='function')invalidateWheelSectorIntelCache();
}
function getWeightedNumberScores(){
const scores={};
for(let i=0;i<=36;i++)scores[i]=0;
if(!spins.length)return scores;
spins.forEach((n,idx)=>{
const w=Math.pow((idx+1)/spins.length,HC_DECAY_POW);
scores[n]+=w;
});
return scores;
}
function getRecentWeightedHits(n,windowSize){
const w=Math.min(windowSize,spins.length);
let t=0;
for(let i=spins.length-w;i<spins.length;i++){
if(spins[i]===n){
const wgt=Math.pow((i+1)/spins.length,HC_DECAY_POW);
t+=wgt;
}
}
return t;
}
function predCacheKey(){
return spins.length+'|'+ballTimingHistory.length+'|'+(timingRunning?1:0);
}
function getHotColdLists(){
const H=hcBuildFromSpins();
const raw=rawSpinCounts();
return{
hot:H.active.slice(0,12),
cold:H.inactive.slice(0,12),
recovering:H.recovering.slice(0,8),
overheated:H.overheated.slice(0,8),
sectorHeat:H.sectors.map(s=>({
center:s.center,nums:s.nums,hits:s.hits,heat:s.hits,
heatPct:H.winRecent?(s.hits/H.winRecent)*100:0
})),
weighted:raw,
counts:raw,
engine:H
};
}
function scoreNumHistory(n){
let s=aiSpinScore([n],12,2.35);
if(hasMinSpins()&&spins[spins.length-1]===n)s+=repeatRate()>20?6:2;
let run=1;
for(let i=spins.length-2;i>=0;i--){if(spins[i]===n)run++;else break;}
if(run>=2)s+=run*4;
return s;
}
function scoreNumHotCold(n){
const e=computeHotColdEngine();
const item=e.all.find(x=>x.n===n);
if(!item)return 0;
let s=item.wShare*1.8;
const hi=e.hot.findIndex(x=>x.n===n);
const ci=e.cold.findIndex(x=>x.n===n);
if(hi>=0)s+=22-hi*1.2;
if(ci>=0)s+=clamp(8+item.since*1.05+item.recoveryScore*0.35,8,30);
const ri=e.recovering.findIndex(x=>x.n===n);
if(ri>=0)s+=14-ri*1.4;
const oi=e.overheated.findIndex(x=>x.n===n);
if(oi>=0)s-=6-oi*0.4;
return s;
}
function scoreNumWheel(n){
const sec=getSectorAnalysis();
const clusters=getClusters();
let s=0;
if(sec.dominant&&sec.dominant.nums.includes(n))s+=sec.dominant.pct*0.85;
if(sec.potential&&sec.potential.nums.includes(n))s+=14+spinsSince(n)*0.35;
if(sec.weak&&sec.weak.nums.includes(n))s-=4;
clusters.slice(0,2).forEach((c,i)=>{if(c.nums.includes(n))s+=(c.score||0)*(i===0?0.35:0.18);});
const last=lastSpinNum();
if(last!=null){
const d=Math.abs(wheelStep(last,n));
if(d<=2)s+=14-d*3;
}
return s;
}
function scoreNumPatterns(n){
const c=getClusters()[0];
let s=0;
if(c.nums.includes(n))s+=28+(c.score||0)*0.4;
if(neighborChain()>=4&&lastSpinNum()!=null){
const last=lastSpinNum();
if(Math.abs(wheelStep(last,n))<=3)s+=neighborChain()*1.8;
}
s+=lastSpinBreakdown.gap*0.08;
s+=lastSpinBreakdown.cluster*0.12;
return s;
}
function scoreNumWheelFlow(n){
const recent=spins.slice(-8);
if(recent.length<2)return 5;
let cw=0,ccw=0;
for(let i=1;i<recent.length;i++){
const st=wheelStep(recent[i-1],recent[i]);
if(st>0)cw++;else if(st<0)ccw++;
}
const dir=cw>=ccw?1:-1;
const last=lastSpinNum();
if(last==null)return 5;
const step=wheelStep(last,n);
if(dir>0&&step>0&&step<=5)return 18-step*2;
if(dir<0&&step<0&&step>=-5)return 18-Math.abs(step)*2;
return 4;
}
function scoreNumberDashboard(n){
if(!spins.length)return 0;
computeSpinCore();
const h=scoreNumHistory(n);
const hc=scoreNumHotCold(n);
const wh=scoreNumWheel(n);
const p=scoreNumPatterns(n);
const f=scoreNumWheelFlow(n);
const t=PRED_SPIN_SOURCE;
const base=h*t.history+hc*t.hotCold+wh*t.wheel+p*t.patterns+f*t.wheelFlow;
const learnW=0.82+getNumLearnWeight(n)/120;
return base*learnW*getSectorLearnBoost(n)*getPatternSurvivalBoost();
}
function pickDashboardPrimaryTip(){
let bestN=0,bestS=-1;
for(let n=0;n<=36;n++){
const sc=scoreNumberDashboard(n);
if(sc>bestS){bestS=sc;bestN=n;}
}
return bestN;
}
function scoreAreaDashboard(nums){
if(!nums.length)return 0;
let t=0;
nums.forEach(n=>{t+=scoreNumberDashboard(n);});
return t/nums.length;
}
function pickDozensDashboard(){
const fu=computeFollowUpFlowEngine();
if(fu.dozPick&&fu.dozPick!=='—')return fu.dozPick;
const scored=DOZENS.map((nums,i)=>({
label:(i+1)+'. tucet ('+nums[0]+'–'+nums[nums.length-1]+')',
score:scoreAreaDashboard(nums)
})).sort((a,b)=>b.score-a.score);
return scored.slice(0,2).map(x=>x.label).join(' · ');
}
function pickColumnsDashboard(){
const fu=computeFollowUpFlowEngine();
if(fu.colPick&&fu.colPick!=='—')return fu.colPick;
const scored=AI_COLUMNS.map((nums,i)=>({
label:'Stĺpec '+(i+1)+' (2:1)',
score:scoreAreaDashboard(nums)
})).sort((a,b)=>b.score-a.score);
return scored.slice(0,2).map(x=>x.label).join(' · ');
}
function pickColorDashboard(){
const fu=computeFollowUpFlowEngine();
if(fu.dominantColor)return fu.dominantColor==='červená'?'ČERVENÁ':'ČIERNA';
const cluster=getClusters()[0];
let cr=0,cb=0;
cluster.nums.forEach(n=>{if(n===0)return;if(reds.includes(n))cr++;else cb++;});
let color=cr>=cb?'ČERVENÁ':'ČIERNA';
const recent=spins.slice(-15);
let r=0,b=0;
recent.forEach(n=>{if(n===0)return;if(reds.includes(n))r++;else b++;});
if(r>b+1)color='ČERVENÁ';
else if(b>r+1)color='ČIERNA';
return color;
}
function pickParityDashboard(){
const recent=spins.slice(-12).filter(n=>n!==0);
let e=0,o=0;
recent.forEach(n=>{if(n%2===0)e++;else o++;});
let pick=e>=o?'PÁRNE':'NEPÁRNE';
const last=spins[spins.length-1];
if(lastSpinBreakdown.streak>65&&last){
pick=last%2===0?'NEPÁRNE':'PÁRNE';
}
return pick;
}
function pickSizeDashboard(){
const recent=spins.slice(-10).filter(n=>n!==0);
let hi=0,lo=0;
recent.forEach(n=>{if(n>=19)hi++;else lo++;});
const pick=hi>=lo?'VEĽKÉ':'MALÉ';
return pick==='VEĽKÉ'?'VEĽKÉ (19–36)':'MALÉ (1–18)';
}
function computeSpinDashboardCore(){
computeSpinCore();
const sec=getSectorAnalysis();
const hist=clamp(45+Math.min(25,spins.length*1.2)+(repeatRate()>30?8:0));
const hc=lastSpinBreakdown.hotCold;
const wh=clamp((sec.dominant?.pct||0)*1.1+scoreCluster()*0.35);
const pat=clamp(lastSpinBreakdown.cluster*0.35+lastSpinBreakdown.chain*0.25+neighborChain()*7);
const flow=wheelDirectionScore();
const chaos=scoreEntropyStability();
const t=PRED_SPIN_SOURCE;
return clamp(
hist*t.history*2.2+
hc*t.hotCold*2.2+
wh*t.wheel*2.2+
pat*t.patterns*2.2+
flow*t.wheelFlow*2.2+
chaos*0.08
);
}
function getPredictionTimingFactor(){
const samples=getBallTimingSamples();
const core=samples.length?computeBallTimingCore(samples):computeTimingCore();
let factor=1;
let label='NEUTRÁL';
if(core>=72){factor=1+((core-72)/280);label='POTVRDENIE';}
else if(core<=48){factor=0.82+(core/240);label='OSLABENIE';}
return{factor:clamp(factor,0.82,1.1),label,core};
}
function getPredictionVisualSupport(tip){
const core=computeVisualCore();
const cluster=getClusters()[0];
let factor=1;
if(cluster.nums.includes(tip))factor+=0.05;
if(scoreVisualAlign()>68)factor+=0.04;
if(scoreVisualPressure()>60)factor+=0.03;
return{factor:clamp(factor,1,1.12),core};
}
let lastInvisibleLayer=null;
let lastInvisibleKey='';
function invalidateInvisibleCache(){lastInvisibleLayer=null;lastInvisibleKey='';}
function buildInvisibleCommentHints(inv){
const H=[];
if(inv.diagnostics.clusterConflict>42)H.push('Dominantný sektor stráca stabilitu kvôli konfliktu susedných clusterov.');
if(inv.diagnostics.decayFactor<0.92)H.push('Starší trend kolesa postupne slabne.');
if(inv.diagnostics.noiseLevel>40)H.push('Filter falošných patternov potichu potlačil šum v signáloch.');
if(inv.flowState==='COLLAPSING')H.push('Stav toku: kolaps — chaos prekračuje prah.');
else if(inv.flowState==='RANDOM')H.push('Stav toku: náhodný režim — slabšia čitateľnosť patternov.');
else if(inv.flowState==='MIGRATING')H.push('Stav toku: migrácia — kole drží smer.');
if(inv.suppress.hideWeakSignals)H.push('Potlačenie: slabé signály skryté (vysoký chaos).');
return H;
}
function computeInvisibleEngines(baseConfidence){
const key='pred|'+predCacheKey()+'|'+baseConfidence;
if(lastInvisibleLayer&&lastInvisibleKey===key)return lastInvisibleLayer;
const ent=parseFloat(entropy())||0;
const riskCore=spins.length>=2?computeRiskChaosCore():{chaosLevel:50,score:50,clusterConflict:0};
const chaos=riskCore.chaosLevel;
const clusterConflict=riskCore.clusterConflict||0;
const noiseLevel=clamp(repeatRate()*0.35+clusterConflict*0.35+(ent>5.5?18:0));
const falsePatternMult=noiseLevel>45?clamp(1-noiseLevel/220):1;
const decayFactor=clamp(1-Math.max(0,spins.length-22)*0.011);
const conflictMult=clusterConflict>38?clamp(0.9-clusterConflict/500):1;
let confMult=falsePatternMult*decayFactor*conflictMult;
if(adaptiveWeights.failStreak>=2)confMult*=0.93;
const filteredConfidence=clamp(Math.round(baseConfidence*confMult));
let flowState='STABLE';
if(chaos>=72)flowState='COLLAPSING';
else if(chaos>=52||ent>5.5)flowState='RANDOM';
else if(spins.length>=4){const mig=getWheelMigrationDirection();if(mig.dir==='CW'||mig.dir==='CCW')flowState='MIGRATING';}
let signalQuality='MEDIUM';
if(filteredConfidence>=72)signalQuality='STRONG';
else if(filteredConfidence<48)signalQuality='WEAK';
let risk='MEDIUM';
const riskScore=riskCore.score;
if(riskScore<38)risk='LOW';else if(riskScore>=62)risk='HIGH';
let edge='LOW EDGE';
if(signalQuality==='STRONG'&&risk!=='HIGH')edge='CLEAR EDGE';
else if(signalQuality==='WEAK'||risk==='HIGH'||chaos>70)edge='NO EDGE';
const stateLabel=flowState==='STABLE'?'STABLE FLOW':flowState==='MIGRATING'?'MIGRATING FLOW':flowState;
const suppress={hideWeakSignals:chaos>75||filteredConfidence<42,hideAggressivePred:chaos>75||risk==='HIGH',hideLowConfidence:chaos>75||filteredConfidence<45,hideSecondaryPanels:chaos>65};
const layer={flowState,signalQuality,risk,edge,stateLabel,filteredConfidence,confidenceMultiplier:confMult,suppress,master:{stateLabel,confidence:filteredConfidence,risk,signalQuality,edge,flowState},diagnostics:{noiseLevel,decayFactor,clusterConflict,chaos,ent},commentHints:[]};
layer.commentHints=buildInvisibleCommentHints(layer);
lastInvisibleLayer=layer;lastInvisibleKey=key;return layer;
}
function normalizeInvisibleLayer(inv){
if(!inv)return null;
if(inv.master)return inv;
const risk=inv.risk||'MEDIUM';
const conf=inv.filteredConfidence!=null?inv.filteredConfidence:(inv.confidence!=null?inv.confidence:50);
const flow=inv.flowState||'STABLE';
const sig=inv.signalQuality||'MEDIUM';
const edge=inv.edge||'NO EDGE';
const stateLabel=inv.stateLabel||flow;
return Object.assign({},inv,{
flowState:flow,signalQuality:sig,risk,edge,stateLabel,filteredConfidence:conf,
master:{stateLabel,confidence:conf,risk,signalQuality:sig,edge,flowState:flow}
});
}
function getInvisibleLayer(){
if(spins.length<2)return null;
const pr=lastAIPredictionCache;
if(pr&&pr.invisible&&lastAIPredictionKey===predCacheKey())return normalizeInvisibleLayer(pr.invisible);
const prefix='pred|'+predCacheKey()+'|';
if(lastInvisibleLayer&&lastInvisibleKey.indexOf(prefix)===0)return lastInvisibleLayer;
if(pr&&pr.rawConfidence!=null)return computeInvisibleEngines(pr.rawConfidence);
return computeInvisibleEngines(calculateAI());
}
function getUnifiedConfidence(){
if(spins.length<2)return 0;
const pr=computeAIPrediction();
if(pr)return pr.confidence;
const inv=getInvisibleLayer();
if(inv)return inv.filteredConfidence;
return clamp(Math.round(calculateAI()));
}

function computeDecisionAction(){
if(spins.length<2){
return{action:'WARMUP',label:skActionLabel('WARMUP'),cls:'yellowTxt',reason:'Zadaj aspoň 2 spiny (klik na board).'};
}
const CA=computeAIPredictionEngine();
if(!CA)return{action:'WATCH',label:skActionLabel('WATCH'),cls:'yellowTxt',reason:'Načítavam flow…'};
const fu=CA.flowEng,re=CA.predRezim,th=CA.trustHierarchy,mo=CA.mainOpinion;
if(CA.quiet){
return{action:'NO_BET',label:'POZORUJ',cls:'yellowTxt',reason:mo&&mo.sub?mo.sub:'AI nevidí stabilný flow.'};
}
if(re==='DEAD SPINS'||th.tier==='WEAK'){
return{action:'NO_BET',label:'POZORUJ',cls:'redTxt',reason:th.sub||'Slabá predikcia — session sa rozpadá, follow-up mizne.'};
}
if(fu.selfCorrection||fu.corrModeHint){
return{action:'WAIT',label:'POZORUJ',cls:'yellowTxt',reason:fu.selfCorrection||'Flow sa mení — pozoruj.'};
}
if(th.tier==='MEDIUM'){
return{action:'WATCH',label:'SLEDUJ',cls:'yellowTxt',reason:(fu.reasons&&fu.reasons.stlpce)||'Stredný flow — čakaj potvrdenie.'};
}
if(th.tier==='VERY_STRONG'&&re==='FLOW ACTIVE'){
return{action:'BET',label:'PREFERUJ',cls:'greenTxt',reason:(fu.reasons&&fu.reasons.stlpce)||String(fu.colPick||'').replace(/<[^>]+>/g,'')};
}
if(re==='BREAKOUT'||re==='REVERSAL'){
return{action:'WATCH',label:'SLEDUJ',cls:'blueTxt',reason:(fu.reasons&&fu.reasons.stlpce)||'Nový návratový flow.'};
}
return{action:'WATCH',label:'SLEDUJ',cls:'yellowTxt',reason:(fu.reasons&&fu.reasons.stlpce)||'Sleduj posledných '+PRED_SHORT_WIN+' spinov.'};
}
function formatInvisibleSystemLine(inv){
if(!inv)return '';
return 'Tok: '+skFlow(inv.flowState)+' · Signál: '+skSignal(inv.signalQuality)+' · Výhoda: '+skEdge(inv.edge);
}
function renderMasterAIState(){
const el=document.getElementById('masterAIState');
if(!el)return;
const dec=computeDecisionAction();
if(spins.length<2){
el.innerHTML='<span class="mai-item mai-action"><span class="mai-label">AKCIA</span><b class="mai-value '+dec.cls+'">'+dec.label+'</b></span>';
updateSessionStatus();
return;
}
const inv=getInvisibleLayer();
if(!inv)return;
const m=inv.master||inv;
if(!m||m.risk==null){el.innerHTML='<span class="mai-item mai-action"><span class="mai-label">AKCIA</span><b class="mai-value '+dec.cls+'">'+dec.label+'</b></span>';updateSessionStatus();return;}
const riskCls=m.risk==='HIGH'?'redTxt':m.risk==='LOW'?'greenTxt':'yellowTxt';
const SE=runSpinsEnginePipeline();
const spinSt=SE.ready?'<span class="mai-item"><span class="mai-label">SPINY 70%</span><b class="mai-value '+SE.playState.cls+'">'+skPlayState(SE.playState.state)+' · '+SE.liveScore+'%</b></span>':'';
el.innerHTML='<span class="mai-item mai-action"><span class="mai-label">AKCIA</span><b class="mai-value '+dec.cls+'">'+dec.label+'</b></span>'
+spinSt
+'<span class="mai-item"><span class="mai-label">STAV AI</span><b class="mai-value greenTxt">'+skFlow(m.stateLabel)+'</b></span>'
+'<span class="mai-item"><span class="mai-label">AI 70·20·10</span><b class="mai-value yellowTxt">'+(function(){const pr=computeAIPrediction();return pr&&pr.modelWeighted!=null?pr.modelWeighted+'% · '+pr.confidence:m.confidence+'%';})()+'</b></span>'
+'<span class="mai-item"><span class="mai-label">RIZIKO</span><b class="mai-value '+riskCls+'">'+skRisk(m.risk)+'</b></span>'
+'<span class="mai-item"><span class="mai-label">RELÁCIA</span><b class="mai-value blueTxt">'+sessionState.label+'</b></span>'
+'<span class="mai-item"><span class="mai-label">AI STAV</span><b class="mai-value greenTxt">'+aiState.label+'</b></span>';
updateSessionStatus();
}
function computeSpinAIPrediction(){
return computeAIPrediction();
}
function formatAreaPickShort(labels){
if(!labels||labels==='—')return '—';
const nums=labels.split('·').map(function(part){
const m=part.trim().match(/^(?:\d+\.\s*tucet|Stĺpec\s+)(\d+)/i)||part.trim().match(/^(\d+)\./);
return m?m[1]:null;
}).filter(Boolean);
return nums.length?nums.join(' + '):'—';
}
function formatRangeLabel(size){
if(!size||size==='—')return '—';
if(/VEĽKÉ|19/i.test(size))return '19-36';
if(/MALÉ|1/i.test(size))return '1-18';
return size.replace(/\s*\([^)]*\)/,'').trim();
}
function computeSeriaLabel(){
if(spins.length<2)return '—';
let colorRun=0;
const last=spins[spins.length-1];
if(last!=null&&last!==0){
const lc=reds.includes(last);
for(let i=spins.length-2;i>=0;i--){
const n=spins[i];
if(n===0)break;
if(reds.includes(n)===lc)colorRun++;else break;
}
}
if(colorRun>=5)return 'DLHÁ FARBA';
if(repeatRate()>=40)return 'OPAKUJÚCI';
if(neighborChain()>=6)return 'SILNÁ REŤAZ';
const rep=computeRepeatChains();
if(rep.length&&rep[0].len>=3)return 'OPAKOVANIE';
return 'NORMÁLNY';
}
function computeOdNuly(){
return spins.length?spinsSince(0):0;
}
function computeRezimPred(){
if(spins.length<2)return '—';
if(coreAnalysisDepth>0){
if(aiState.state==='CHAOS'||aiState.state==='SAFE'||aiState.state==='WAIT')return 'BEZPEČNÝ';
if(aiState.state==='ATTACK')return 'AGRESÍVNY';
return 'STREDNÝ';
}
const m={SAFE:'BEZPEČNÝ',MEDIUM:'STREDNÝ',AGGRESSIVE:'AGRESÍVNY'};
return m[computeStrategyEngine().mode]||'—';
}
function corePredLine(emoji,label,val,cls){
const c=cls?' '+cls:'';
return '<div class="core-pred-line"><span class="cpl-label">'+emoji+' '+label+'</span><b class="cpl-val'+c+'">'+val+'</b></div>';
}
function buildCorePredictionHTML(pr){
const blend=computeModelBlend(pr.spinCore,pr.timingCore,pr.visualCore);
const farba=pr.color||'—';
const par=pr.parity||'—';
const range=formatRangeLabel(pr.size);
const tucty=formatAreaPickShort(pr.dozens);
const stlpce=formatAreaPickShort(pr.columns);
const seria=computeSeriaLabel();
const rezim=computeRezimPred();
const odNuly=computeOdNuly();
const farbaCls=/ČERVENÁ/.test(farba)?'redTxt':/ČIERNA/.test(farba)?'':'greenTxt';
let h='<div class="core-pred-model">'+blend.modelLabel+'</div>';
h+='<div class="core-pred-tip">'+(pr.modelWeighted!=null?pr.modelWeighted:blend.weighted)+'%<small>vážený model 70·20·10</small></div>';
h+=corePredLine('70%','SPINS:',blend.spinCore+'% → '+blend.spinPart,'greenTxt');
h+=corePredLine('20%','TIMING:',blend.timingCore+'% → '+blend.timingPart,'blueTxt');
h+=corePredLine('10%','VISUAL:',blend.visualCore+'% → '+blend.visualPart,'yellowTxt');
h+=corePredLine('🔥','FARBA:',farba,farbaCls);
h+=corePredLine('⚡','PÁRNE/NEPÁRNE:',par,'yellowTxt');
h+=corePredLine('🎯','RANGE:',range,'blueTxt');
h+=corePredLine('📊','TUCTY:',tucty,'greenTxt');
h+=corePredLine('📈','STĹPCE:',stlpce,'greenTxt');
h+=corePredLine('🧠','SPOĽAHLIVOSŤ:',(pr.confidence||0)+'%','yellowTxt');
h+=corePredLine('🌀','SÉRIA:',seria,'blueTxt');
h+=corePredLine('⚠️','REŽIM:',rezim,rezim==='BEZPEČNÝ'?'greenTxt':rezim==='AGRESÍVNY'?'redTxt':'yellowTxt');
h+=corePredLine('⭕','OD NULY:',String(odNuly),'greenTxt');
const confBar=clamp(pr.confidence||0);
h+='<div class="big-bar" style="margin-top:6px"><div class="big-fill" style="width:'+confBar+'%"></div></div>';
return h.replace('<div class="core-pred-model">','<div class="core-pred-model">').replace('</div>','</div>');
}
function gatherCommentDashboardData(){
computeSpinCore();
const sec=getSectorAnalysis();
const cluster=getClusters()[0];
const samples=getBallTimingSamples();
const timingCore=samples.length?computeBallTimingCore(samples):computeTimingCore();
const ent=parseFloat(entropy())||0;
const last=lastSpinNum();
const center=cluster.nums[2];
let colorRun=0;
if(hasMinSpins()&&last!=null&&last!==0){
const lc=reds.includes(last);
for(let i=spins.length-2;i>=0;i--){
const n=spins[i];
if(n===0)break;
if(reds.includes(n)===lc)colorRun++;else break;
}
}
return{
history:{
count:spins.length,
trend:spins.slice(-6).join(' → '),
recent:spins.slice(-8),
repeat:repeatRate()
},
dominant:sec.dominant,
weak:sec.weak,
potential:sec.potential,
entropy:ent,
streaks:{
colorRun,
colorSignal:lastSpinBreakdown.streak,
gap:spinsSince(center),
gapSignal:lastSpinBreakdown.gap
},
wheelFlow:{
direction:wheelDirectionScore(),
chain:neighborChain(),
chainSignal:lastSpinBreakdown.chain,
drift:lastSpinBreakdown.drift
},
hotCold:(function(){
const hc=getHotColdLists();
return{
hot:hc.hot.slice(0,5).map((x,i)=>x.n+' · '+hcHumanHotHint(x,i+1)),
cold:hc.cold.slice(0,5).map(x=>x.n+' · '+hcHumanColdHint(x)),
recovering:hc.recovering.slice(0,4).map(x=>x.n+' · '+hcHumanRecoveryHint(x)),
overheated:hc.overheated.slice(0,4).map(x=>x.n+' · '+hcHumanOverheatHint(x)),
sectorHeat:hc.sectorHeat.slice(0,3).map((s,i)=>s.center+' · '+hcHumanSectorHint(s,i))
};
})(),
timing:{
core:timingCore,
stability:lastTimingBreakdown.stability,
rhythm:lastTimingBreakdown.rhythm,
pace:lastTimingBreakdown.pace
},
chaos:{
entropy:ent,
entropySignal:lastSpinBreakdown.entropy,
stability:scoreEntropyStability()
},
migration:{
sector:cluster.nums,
last,
center,
step:last!=null?Math.abs(wheelStep(last,center)):0,
driftSignal:lastSpinBreakdown.drift
}
};
}
function scoreCommentDataLayer(d){
if(spins.length<2)return 0;
let s=clamp(Math.min(40,spins.length*2));
if(d.dominant)s+=clamp(d.dominant.pct,0,25);
s+=clamp(d.chaos.stability*0.2);
s+=clamp(d.timing.stability*0.15);
s+=clamp(d.wheelFlow.chain*4);
s+=clamp(20-d.entropy*2);
return clamp(s);
}
function scoreCommentReasoningLayer(d){
if(spins.length<2)return 0;
let s=50;
if(d.entropy>5.5)s-=18;
else if(d.entropy<4.2)s+=12;
if(d.timing.stability>=70)s+=10;
else if(d.timing.stability<=45)s-=12;
if(d.chaos.stability>=65)s+=8;
if(d.wheelFlow.chain>=5)s+=8;
if(d.streaks.colorRun>=4)s+=6;
if(d.history.repeat>35)s-=6;
if(d.migration.step<=2)s+=5;
return clamp(s);
}
function buildCommentSpinDataLines(d){
const L=[];
L.push('História: <b>'+d.history.count+'</b> spinov · posledná sekvencia <b>'+d.history.trend+'</b>.');
if(d.dominant){
L.push('Dominantný sektor: <b>'+d.dominant.pct.toFixed(1)+'%</b> · '+d.dominant.nums.join(' · ')+'.');
}else{L.push('Dominantný sektor: <b>—</b> (málo dát).');}
L.push('Entropia: <b>'+d.entropy.toFixed(2)+'</b> · signál stabilita <b>'+d.chaos.stability+'%</b>.');
L.push('Séria farieb: <b>'+d.streaks.colorRun+'×</b> po sebe · medzera stred klastra <b>'+d.streaks.gap+'</b> spinov.');
L.push('Tok kolesa: smer <b>'+d.wheelFlow.direction+'%</b> · reťaz susedov <b>'+d.wheelFlow.chain+'/11</b> · drift <b>'+d.wheelFlow.drift+'%</b>.');
L.push('Aktívne čísla: <b>'+(d.hotCold.hot.length?d.hotCold.hot.join(', '):'—')+'</b> · Neaktívne: <b>'+(d.hotCold.cold.length?d.hotCold.cold.join(', '):'—')+'</b>.');
L.push('Možný návrat: <b>'+(d.hotCold.recovering.length?d.hotCold.recovering.join(', '):'—')+'</b> · Prehriaty flow: <b>'+(d.hotCold.overheated.length?d.hotCold.overheated.join(', '):'—')+'</b>.');
L.push('Aktívny sektor: <b>'+(d.hotCold.sectorHeat.length?d.hotCold.sectorHeat.join(' · '):'—')+'</b>.');
L.push('Timing: jadro <b>'+d.timing.core+'%</b> · stabilita <b>'+d.timing.stability+'%</b> · rytmus <b>'+d.timing.rhythm+'%</b>.');
L.push('Chaos: entropia <b>'+d.chaos.entropy.toFixed(2)+'</b> · chaos signál <b>'+d.chaos.entropySignal+'%</b>.');
L.push('Migrácia: <b>'+(d.migration.last!=null?d.migration.last:'—')+' → '+d.migration.center+'</b> · krok <b>'+d.migration.step+'</b> · pás '+d.migration.sector.join(' · ')+'.');
return L;
}
function buildCommentReasoningLines(d){
const L=[];
if(d.history.repeat>35){
L.push('Opakované čísla v histórii — krátky vzor sa drží, ale nie je to garancia ďalšieho hitu.');
}
if(d.wheelFlow.chain>=5){
L.push('Silné susedstvo na kolese ('+d.wheelFlow.chain+') — rozum odporúča sledovať pás okolo posledných výsledkov, nie náhodný scatter.');
}else if(d.wheelFlow.chain>=3){
L.push('Mierna reťaz na kolese — dá sa čítať smer, ale signál ešte nie je elitný.');
}
if(d.dominant&&d.dominant.pct>=28){
L.push('Dominantný pás je výrazný ('+d.dominant.pct.toFixed(0)+'%) — pozor na preháňané chasing; dáta hovoria o tlaku, nie o istote.');
}
if(d.potential){
L.push('Potenciálny sektor pri <b>'+d.potential.center+'</b> — dlhé ticho môže lákať, ale bez potvrdenia flow je to rizikové.');
}
if(d.entropy>5.5){
L.push('Vysoká entropia — rozptyl, slabá čitateľnosť; komentár upozorňuje na chaos a nižšiu stabilitu rozhodnutia.');
}else if(d.entropy<4.2){
L.push('Nízka entropia — vzory sú čitateľné; reasoning môže spájať históriu s wheel flow s vyššou dôverou.');
}else{
L.push('Entropia v strede — kombinuj históriu s migráciou, bez extrémnych záverov.');
}
if(d.streaks.colorRun>=4){
L.push('Dlhý farebný streak ('+d.streaks.colorRun+'×) — logika zvažuje korekciu farby, nie slepé pokračovanie trendu.');
}
if(d.timing.stability>=72){
L.push('Timing stabilita je dobrá — signál z dashboardu sa dá brať ako potvrdenie (nie výber čísel).');
}else if(d.timing.stability<=48){
L.push('Timing je nestabilný — oslab to, čo vyzerá silné zo spinov; chaos v tempe zvyšuje riziko.');
}
if(d.migration.step<=2){
L.push('Migrácia tesne okolo stredu klastra — wheel flow drží súvislosť, vhodné pre sektorovú logiku.');
}else if(d.migration.step>=5){
L.push('Veľký skok na kolese — drift je silný, pattern sa môže rýchlo meniť.');
}
const cs=countColorStats();
if(cs.rp>58)L.push('Globálne vedie červená ('+cs.rp+'%) — reasoning upozorňuje na možnú korekciu, nie na slepý trend.');
else if(cs.bp>58)L.push('Globálne vedie čierna ('+cs.bp+'%) — pozor na preklopenie na červenú pri ďalších spinoch.');
if(d.chaos.stability<50){
L.push('Riziko: nízka stabilita signálu — zníž agresivitu stávok a čakaj na čitateľnejší vzor.');
}else if(d.chaos.stability>=75){
L.push('Stabilita signálu je vysoká — dáta a reasoning sú v súlade, stále však bez 100% istoty.');
}
if(!L.length)L.push('Málo výrazných vzorov — drž sa faktov z ľavého panelu a nepreháňaj interpretáciu.');
return L;
}
function buildCommentReasoning(){
return buildCommentReasoningLines(gatherCommentDashboardData());
}
function commentPickTwoDozens(){
const scored=DOZENS.map((nums,i)=>({
label:(i+1)+'. tucet (nízke %)',
pct:parseFloat(spinAreaPct(nums))
})).sort((a,b)=>a.pct-b.pct);
return scored.slice(0,2).map(x=>x.label.replace('nízke %',x.pct.toFixed(1)+'%')).join(' · ');
}
function commentPickTwoColumns(){
const scored=AI_COLUMNS.map((nums,i)=>({
label:'Stĺpec '+(i+1),
pct:parseFloat(spinAreaPct(nums))
})).sort((a,b)=>a.pct-b.pct);
return scored.slice(0,2).map(x=>x.label+' ('+x.pct.toFixed(1)+'%)').join(' · ');
}
function commentPickColor(){
const recent=spins.slice(-10).filter(n=>n!==0);
let r=0,b=0;
recent.forEach(n=>{if(reds.includes(n))r++;else b++;});
if(r>b+1)return'ČIERNA (korekcia trendu)';
if(b>r+1)return'ČERVENÁ (korekcia trendu)';
return'ROVNOVÁHA — striedaj opatrne';
}
function commentPickSize(){
const hl=countHighLow();
if(hl.hip>58)return'MALÉ (1–18) — logika: dobehnutie';
if(hl.lop>58)return'VEĽKÉ (19–36) — logika: dobehnutie';
const recent=spins.slice(-8).filter(n=>n!==0);
let hi=0,lo=0;
recent.forEach(n=>{if(n>=19)hi++;else lo++;});
if(hi>lo)return'MALÉ (1–18)';
if(lo>hi)return'VEĽKÉ (19–36)';
return'MALÉ / VEĽKÉ — bez výrazného signálu';
}
function commentPickParity(){
const eo=countEvenOdd();
if(eo.ep>58)return'NEPÁRNE (korekcia)';
if(eo.op>58)return'PÁRNE (korekcia)';
const recent=spins.slice(-8).filter(n=>n!==0);
let e=0,o=0;
recent.forEach(n=>{if(n%2===0)e++;else o++;});
if(e>o)return'NEPÁRNE';
if(o>e)return'PÁRNE';
return'PÁRNE / NEPÁRNE — neutrál';
}

function countMigrationStreak(){
const h=spinMemoryEngine.migrationHistory;
if(!h.length)return 0;
const dir=h[h.length-1].dir;
let n=0;
for(let i=h.length-1;i>=0;i--){if(h[i].dir===dir)n++;else break;}
return n;
}
function repeatRate(){if(spins.length<3)return 0;let r=0;for(let i=1;i<spins.length;i++)if(spins[i]===spins[i-1])r++;return clamp((r/(spins.length-1))*200);}
function wheelDirectionScore(){const recent=spins.slice(-10);if(recent.length<3)return 50;let cw=0,ccw=0;for(let i=1;i<recent.length;i++){const s=wheelStep(recent[i-1],recent[i]);if(s>0)cw++;else if(s<0)ccw++;}return clamp(50+Math.abs(cw-ccw)*8);}
function updateMemoryBank(){memoryBank.short=spins.slice(-5);memoryBank.mid=spins.slice(-20);memoryBank.long=spins.slice(-80);}
function learningAdjust(hit){
if(hit){adaptiveWeights.failStreak=Math.max(0,adaptiveWeights.failStreak-1);adaptiveWeights.spin=clamp(adaptiveWeights.spin+0.02,0.85,1.15);}
else{adaptiveWeights.failStreak++;adaptiveWeights.spin=clamp(adaptiveWeights.spin-0.03,0.85,1.15);}
shiftAutoWeights(hit);
runSelfCorrection(hit);
}
