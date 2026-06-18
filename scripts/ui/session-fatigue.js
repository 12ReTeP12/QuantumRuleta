/**
 * Session Fatigue — Balík 9B extrakcia z index-NOVY-V2.html
 * Závisí na: state.js (spins, spinTimes, aiState), helpers.js (clamp),
 * V2 inline (predCacheKey, lastAIPredictionCache, lastAIPredictionKey).
 */
'use strict';

/* Únava relácie + živé varovania — behaviorálna analytika */
let sessionFatigueEngine={
sessionStartAt:0,lastClickAt:0,clickIntervals:[],
chaosIgnoreStreak:0,badPlayStreak:0,overrideStreak:0,
stateHistory:[],aggressionHistory:[],playStateHistory:[],
confidenceHistory:[],chaosHistory:[],tiltEvents:0,breaksSuggested:0
};
let lastSessionFatigueCache=null,lastSessionFatigueKey='';
let liveWarningHistory=[];
let liveWarningCooldowns={};
const LIVE_WARN_COOLDOWN_MS=12000;
const LIVE_WARN_MAX=16;

function skSeverity(s){const m={HIGH:'VYSOKÁ',MEDIUM:'STREDNÁ',LOW:'NÍZKA',CRITICAL:'KRITICKÁ'};return m[s]||s;}
function skFatigueLvl(l){const m={LOW:'NÍZKA',MEDIUM:'STREDNÁ',HIGH:'VYSOKÁ'};return m[l]||l;}
function skTempo(t){const m={STABLE:'STABILNÝ',ACCELERATING:'ZRÝCHĽUJÚCI',SLOWING:'SPOMALUJÚCI'};return m[t]||t;}
function skChaosRes(c){const m={GOOD:'DOBRÁ',WEAK:'SLABÁ',OVERRIDE:'IGNOROVANIE FILTRA'};return m[c]||c;}
function skEscalation(e){const m={STABLE:'STABILNÉ',RISING:'RASTÚCE'};return m[e]||e;}
function skCognitive(c){const m={LOW:'NÍZKE',MEDIUM:'STREDNÉ',HIGH:'VYSOKÉ'};return m[c]||c;}
function skStability(s){const m={HIGH:'VYSOKÁ',MEDIUM:'STREDNÁ',LOW:'NÍZKA'};return m[s]||s;}

function resetSessionFatigueEngine(){
sessionFatigueEngine={
sessionStartAt:0,lastClickAt:0,clickIntervals:[],
chaosIgnoreStreak:0,badPlayStreak:0,overrideStreak:0,
stateHistory:[],aggressionHistory:[],playStateHistory:[],
confidenceHistory:[],chaosHistory:[],tiltEvents:0,breaksSuggested:0
};
lastSessionFatigueCache=null;lastSessionFatigueKey='';
liveWarningHistory=[];liveWarningCooldowns={};
}
function sfaFirstSpinTime(){
return spins.length&&spinTimes.length?spinTimes[0]:0;
}
function sfaRebuildIntervalsFromSpinTimes(){
sessionFatigueEngine.clickIntervals=[];
for(let i=1;i<spinTimes.length;i++){
const dt=spinTimes[i]-spinTimes[i-1];
if(dt>80&&dt<120000)sessionFatigueEngine.clickIntervals.push(dt);
}
if(sessionFatigueEngine.clickIntervals.length>48){
sessionFatigueEngine.clickIntervals=sessionFatigueEngine.clickIntervals.slice(-48);
}
}
function sessionFatigueAccumulateMetrics(){
let chaos=50,conf=50,suppressed=false,noEdge=false,playState='OBSERVE',aggr=0.55;
if(spins.length>=2){
const pr=lastAIPredictionCache&&lastAIPredictionKey===predCacheKey()?lastAIPredictionCache:null;
const CA=pr&&pr.coreAnalysis?pr.coreAnalysis:null;
if(CA){
chaos=CA.chaosLevel||50;conf=CA.confidence||50;suppressed=!!CA.suppressed;noEdge=!!CA.noEdge;playState=CA.state||'OBSERVE';
}else if(pr){conf=pr.confidence||50;playState=pr.state||'OBSERVE';chaos=pr.chaosPenalty?58:45;}
}
aggr=aiState.aggression||0.55;
sessionFatigueEngine.chaosHistory.push(chaos);
sessionFatigueEngine.confidenceHistory.push(conf);
sessionFatigueEngine.stateHistory.push(playState);
sessionFatigueEngine.aggressionHistory.push(aggr);
sessionFatigueEngine.playStateHistory.push(playState);
const badPlay=suppressed||noEdge||playState==='CHAOS'||playState==='SAFE'||playState==='WAIT'||chaos>=68;
if(badPlay){sessionFatigueEngine.badPlayStreak++;sessionFatigueEngine.chaosIgnoreStreak++;}
else{sessionFatigueEngine.badPlayStreak=Math.max(0,sessionFatigueEngine.badPlayStreak-1);sessionFatigueEngine.chaosIgnoreStreak=Math.max(0,sessionFatigueEngine.chaosIgnoreStreak-1);}
if(conf<42&&aggr>0.62)sessionFatigueEngine.overrideStreak++;
else sessionFatigueEngine.overrideStreak=Math.max(0,sessionFatigueEngine.overrideStreak-1);
const iv=sessionFatigueEngine.clickIntervals;
if(iv.length>=6){
const recent=iv.slice(-3),base=iv.slice(0,-3);
const rAvg=recent.reduce((a,b)=>a+b,0)/recent.length;
const bAvg=base.length?base.reduce((a,b)=>a+b,0)/base.length:rAvg;
if(bAvg>0&&rAvg<bAvg*0.72&&(badPlay||sessionFatigueEngine.badPlayStreak>=2))sessionFatigueEngine.tiltEvents++;
}
['chaosHistory','confidenceHistory','stateHistory','aggressionHistory','playStateHistory'].forEach(k=>{
while(sessionFatigueEngine[k].length>spins.length)sessionFatigueEngine[k].shift();
if(sessionFatigueEngine[k].length>36)sessionFatigueEngine[k].shift();
});
}
function sfaReplayFromSpinHistory(){
resetSessionFatigueEngine();
if(!spins.length)return;
sessionFatigueEngine.sessionStartAt=sfaFirstSpinTime()||Date.now();
sfaRebuildIntervalsFromSpinTimes();
sessionFatigueEngine.lastClickAt=spinTimes[spinTimes.length-1]||sessionFatigueEngine.sessionStartAt;
for(let i=0;i<spins.length;i++)sessionFatigueAccumulateMetrics();
lastSessionFatigueCache=null;
}
function sfaTrimAfterUndo(){
['chaosHistory','confidenceHistory','stateHistory','aggressionHistory','playStateHistory'].forEach(k=>{
if(sessionFatigueEngine[k].length>spins.length)sessionFatigueEngine[k].length=spins.length;
});
if(!spins.length){
resetSessionFatigueEngine();
return;
}
sessionFatigueEngine.sessionStartAt=sfaFirstSpinTime();
sfaRebuildIntervalsFromSpinTimes();
sessionFatigueEngine.lastClickAt=spinTimes[spinTimes.length-1]||sessionFatigueEngine.sessionStartAt;
lastSessionFatigueCache=null;
}

function sfaLvlCls(level){
if(level==='LOW'||level==='STABLE'||level==='HIGH'||level==='GOOD'||level==='COOLING')return'f-green';
if(level==='MEDIUM'||level==='MODERATE'||level==='SLOWING'||level==='WEAK')return'f-yellow';
return'f-red';
}

function lwSevCls(sev){
return sev==='HIGH'?'lw-high':sev==='MEDIUM'?'lw-med':'lw-low';
}

function pushLiveWarning(list,text,reason,severity,icon,cooldownKey){
const key=cooldownKey||text.slice(0,32);
const now=Date.now();
if(liveWarningCooldowns[key]&&now-liveWarningCooldowns[key]<LIVE_WARN_COOLDOWN_MS)return;
const id=key+'|'+severity;
if(list.find(w=>w.id===id))return;
const w={id,text,reason,severity,icon:icon||'info',ts:now,cls:lwSevCls(severity)};
list.push(w);
liveWarningCooldowns[key]=now;
liveWarningHistory.unshift(w);
if(liveWarningHistory.length>LIVE_WARN_MAX)liveWarningHistory.pop();
}

function sessionFatigueOnSpin(now){
if(spins.length===1)sessionFatigueEngine.sessionStartAt=spinTimes[0]||now;
else if(spins.length>=2){
const dt=now-(spinTimes[spins.length-2]||now);
if(dt>80&&dt<120000){
sessionFatigueEngine.clickIntervals.push(dt);
if(sessionFatigueEngine.clickIntervals.length>48)sessionFatigueEngine.clickIntervals.shift();
}
}
sessionFatigueEngine.sessionStartAt=sfaFirstSpinTime()||sessionFatigueEngine.sessionStartAt||now;
sessionFatigueEngine.lastClickAt=now;
sessionFatigueAccumulateMetrics();
lastSessionFatigueCache=null;
}

function computeSessionFatigueAnalysis(){
const key=spins.length+'|'+spinTimes.length+'|'+sessionFatigueEngine.clickIntervals.length+'|'+predCacheKey();
const empty={
ready:false,modelLabel:'Analýza únavy relácie',
explain:'Čakám na spiny — sleduje správanie hráča (nie wheel).',
sessionMinutes:0,fatigueLevel:'—',emotionalRisk:'—',decisionStability:'—',tiltRisk:'—',
disciplineScore:0,sessionQuality:0,cognitiveLoad:'—',reactionTempo:'—',riskEscalation:'—',
chaosResistance:'—',analysisTrust:0,sessionRiskLevel:'LOW',breakText:'',metrics:[],
liveWarnings:[],liveWarningExplain:'',warningHistory:[]
};
if(!spins.length||!spinTimes.length){lastSessionFatigueCache=empty;lastSessionFatigueKey=key;return empty;}
if(lastSessionFatigueCache&&lastSessionFatigueKey===key)return lastSessionFatigueCache;
const now=Date.now();
const start=sfaFirstSpinTime();
const sessionMinutes=start?Math.max(0,Math.round((now-start)/60000)):0;
if(spins.length<2){
const partial={
ready:true,partial:true,
modelLabel:'ÚNAVA RELÁCIE · LIVE VAROVANIA',
explain:'Čas beží od prvého spinu · plná analýza po 2. spine.',
explains:['Relácia začala prvým spinom v histórii.'],
sessionMinutes,fatigueLevel:sessionMinutes>=90?'HIGH':sessionMinutes>=30?'MEDIUM':'LOW',
emotionalRisk:'—',decisionStability:'—',tiltRisk:'—',
disciplineScore:0,sessionQuality:0,cognitiveLoad:'—',reactionTempo:'—',riskEscalation:'—',
chaosResistance:'—',analysisTrust:50,sessionRiskLevel:'LOW',breakText:'',
tempoScore:50,stabilityScore:50,chaosResScore:50,emoScore:50,tiltScore:50,cogScore:50,chaosNow:50,confNow:50,
metrics:[
{lbl:'Čas relácie',val:sessionMinutes+' min',cls:'f-green'},
{lbl:'Spiny v histórii',val:String(spins.length),cls:'f-green'},
{lbl:'Únava',val:'čaká na 2. spin',cls:'f-yellow'}
],
liveWarnings:[],liveWarningExplain:'Čas relácie = od prvého zadaného čísla v histórii.',
warningHistory:liveWarningHistory.slice(0,8)
};
lastSessionFatigueCache=partial;lastSessionFatigueKey=key;return partial;
}
let fatigueLevel='LOW';
if(sessionMinutes>=90)fatigueLevel='HIGH';
else if(sessionMinutes>=30)fatigueLevel='MEDIUM';
const iv=sessionFatigueEngine.clickIntervals;
let reactionTempo='STABLE',tempoScore=70;
if(iv.length>=4){
const avg=iv.reduce((a,b)=>a+b,0)/iv.length;
const recent=iv.slice(-4),rAvg=recent.reduce((a,b)=>a+b,0)/recent.length;
if(rAvg<avg*0.75){reactionTempo='ACCELERATING';tempoScore=35;}
else if(rAvg>avg*1.35){reactionTempo='SLOWING';tempoScore=55;}
}
let decisionStability='HIGH',stabilityScore=80;
if(sessionFatigueEngine.stateHistory.length>=4){
const st=sessionFatigueEngine.stateHistory;
let changes=0;
for(let i=1;i<st.length;i++)if(st[i]!==st[i-1])changes++;
const rate=changes/Math.max(1,st.length-1);
if(rate>=0.55){decisionStability='LOW';stabilityScore=28;}
else if(rate>=0.32){decisionStability='MEDIUM';stabilityScore=52;}
}
let chaosResistance='GOOD',chaosResScore=75;
if(sessionFatigueEngine.chaosIgnoreStreak>=8)chaosResistance='OVERRIDE',chaosResScore=18;
else if(sessionFatigueEngine.chaosIgnoreStreak>=4){chaosResistance='WEAK';chaosResScore=42;}
let emotionalRisk='LOW',emoScore=82;
const ag=sessionFatigueEngine.aggressionHistory;
if(ag.length>=3){
const tail=ag.slice(-5),head=ag.slice(0,Math.max(1,ag.length-5));
if(tail.reduce((a,b)=>a+b,0)/tail.length>head.reduce((a,b)=>a+b,0)/head.length+0.12)emoScore-=22;
}
if(sessionFatigueEngine.overrideStreak>=4)emoScore-=25;
if(sessionFatigueEngine.tiltEvents>=2)emoScore-=20;
if(sessionFatigueEngine.badPlayStreak>=5)emoScore-=18;
emoScore=clamp(emoScore);
if(emoScore>=68)emotionalRisk='LOW';
else if(emoScore>=42)emotionalRisk='MEDIUM';
else emotionalRisk='HIGH';
let riskEscalation='STABLE',riskEscScore=72;
if(ag.length>=4&&ag[ag.length-1]>ag[0]+0.15){riskEscalation='RISING';riskEscScore=32;}
let tiltRisk='LOW',tiltScore=88;
if(sessionFatigueEngine.tiltEvents>=3||(reactionTempo==='ACCELERATING'&&emotionalRisk==='HIGH')){tiltRisk='HIGH';tiltScore=22;}
else if(sessionFatigueEngine.tiltEvents>=1||reactionTempo==='ACCELERATING'){tiltRisk='MEDIUM';tiltScore=48;}
let cognitiveLoad='LOW',cogScore=78;
if(decisionStability==='LOW'&&reactionTempo==='ACCELERATING'){cognitiveLoad='HIGH';cogScore=25;}
else if(decisionStability==='MEDIUM'||reactionTempo==='ACCELERATING'){cognitiveLoad='MEDIUM';cogScore=48;}
let analysisTrust=clamp(100-sessionFatigueEngine.overrideStreak*8-(sessionFatigueEngine.chaosIgnoreStreak/spins.length)*140-sessionFatigueEngine.tiltEvents*6);
let disciplineScore=clamp(Math.round(stabilityScore*0.22+chaosResScore*0.2+tempoScore*0.16+emoScore*0.18+analysisTrust*0.14+(fatigueLevel==='LOW'?18:fatigueLevel==='MEDIUM'?8:0)));
let sessionQuality=clamp(Math.round(disciplineScore*0.35+stabilityScore*0.2+chaosResScore*0.15+emoScore*0.15+tiltScore*0.15));
let chaosNow=sessionFatigueEngine.chaosHistory.length?sessionFatigueEngine.chaosHistory[sessionFatigueEngine.chaosHistory.length-1]:50;
let confNow=sessionFatigueEngine.confidenceHistory.length?sessionFatigueEngine.confidenceHistory[sessionFatigueEngine.confidenceHistory.length-1]:50;
const liveWarnings=[];
if(fatigueLevel==='MEDIUM')pushLiveWarning(liveWarnings,'Rastúca únava relácie.','Dlhšia relácia ('+sessionMinutes+' min) — sleduj prestávky.','MEDIUM','clock','fatigue|med');
if(fatigueLevel==='HIGH')pushLiveWarning(liveWarnings,'Vysoká únava relácie.','Hra bez prestávky — rastie mentálna záťaž.','HIGH','clock','fatigue|high');
if(reactionTempo==='ACCELERATING')pushLiveWarning(liveWarnings,'Tempo reakcií sa zrýchľuje.','Kratšie intervaly klikov — možný impulzívny tlak.','MEDIUM','pulse','tempo|fast');
if(decisionStability==='LOW')pushLiveWarning(liveWarnings,'Klesá stabilita rozhodnutí.','Časté zmeny stratégie / stavu počas relácie.','MEDIUM','brain','dec|low');
else if(decisionStability==='MEDIUM')pushLiveWarning(liveWarnings,'Nižšia konzistentnosť rozhodnutí.','Mierna nestabilita v rozhodnutiach.','LOW','brain','dec|med');
if(emotionalRisk==='HIGH')pushLiveWarning(liveWarnings,'Vysoké emočné riziko.','Agresívne tempo alebo override po nestabilite.','HIGH','heart','emo|high');
else if(emotionalRisk==='MEDIUM')pushLiveWarning(liveWarnings,'Vyššie impulzívne správanie.','Emočný drift v tempe alebo agresii.','MEDIUM','heart','emo|med');
if(chaosResistance==='OVERRIDE'||chaosResistance==='WEAK')pushLiveWarning(liveWarnings,'Vysoká interakcia s chaotom.','Hráč aktívny, hoci filtre chaos/výhoda odporúčajú opatrnosť.','HIGH','chaos','chaos|ignore');
if(sessionFatigueEngine.overrideStreak>=3)pushLiveWarning(liveWarnings,'Spoľahlivosť opakovane ignorovaná.','Nízka spoľahlivosť, ale pokračuje agresívna hra.','MEDIUM','warn','conf|ignore');
if(riskEscalation==='RISING')pushLiveWarning(liveWarnings,'Aktívny vzor eskalácie rizika.','Rast agresie počas relácie.','MEDIUM','risk','risk|up');
if(tiltRisk==='HIGH')pushLiveWarning(liveWarnings,'Zvýšená pravdepodobnosť tiltu.','Rýchle rozhodnutia po stratách / chaose.','HIGH','tilt','tilt|high');
if(cognitiveLoad==='HIGH')pushLiveWarning(liveWarnings,'Vysoká kognitívna záťaž.','Rýchle prepínanie + nestabilné rozhodnutia.','MEDIUM','load','cog|high');
if(sessionQuality<45)pushLiveWarning(liveWarnings,'Klesá kvalita relácie.','Únava, disciplína a stabilita pod tlakom.','MEDIUM','quality','qual|low');
if(chaosNow>=68&&confNow<40)pushLiveWarning(liveWarnings,'Slabne spoľahlivosť patternov.','Vysoký chaos · nízka spoľahlivosť — menší edge.','MEDIUM','flow','an|weak');
let sessionRiskLevel='LOW';
const highN=liveWarnings.filter(w=>w.severity==='HIGH').length;
const medN=liveWarnings.filter(w=>w.severity==='MEDIUM').length;
if(highN>=2||(highN>=1&&medN>=2))sessionRiskLevel='HIGH';
else if(highN>=1||medN>=2||disciplineScore<42)sessionRiskLevel='MEDIUM';
if(fatigueLevel==='HIGH'||tiltRisk==='HIGH'||disciplineScore<38){
pushLiveWarning(liveWarnings,'Odporúčaná krátka pauza.','Dosiahnutý limit stability alebo únavy.','MEDIUM','pause','break|short');
}
const explains=[];
if(liveWarnings[0])explains.push(liveWarnings[0].reason);
else if(reactionTempo==='ACCELERATING')explains.push('Detekované zrýchlenie klikov a nestabilné tempo reakcií.');
else if(sessionFatigueEngine.chaosIgnoreStreak>=6)explains.push('Hráč ignoruje vysoký chaos '+sessionFatigueEngine.chaosIgnoreStreak+' spinov po sebe.');
else explains.push('Správanie relácie v normálnych analytických hraniciach.');
let breakText='';
if(fatigueLevel==='HIGH'||tiltRisk==='HIGH'||disciplineScore<38)breakText='Odporúčaná pauza: 15 min · reset koncentrácie.';
else if(fatigueLevel==='MEDIUM'&&disciplineScore<52)breakText='Krátka pauza: 5–10 min · decision stability klesá.';
const result={
ready:true,
modelLabel:'ÚNAVA RELÁCIE · LIVE VAROVANIA',
explain:explains[0],
explains,
sessionMinutes,fatigueLevel,emotionalRisk,decisionStability,tiltRisk,
disciplineScore,sessionQuality,cognitiveLoad,reactionTempo,riskEscalation,chaosResistance,
analysisTrust,sessionRiskLevel,breakText,
tempoScore,stabilityScore,chaosResScore,emoScore,tiltScore,cogScore,chaosNow,confNow,
metrics:[
{lbl:'Čas relácie',val:sessionMinutes+' min',cls:sfaLvlCls(fatigueLevel)},
{lbl:'Únava',val:skFatigueLvl(fatigueLevel),cls:sfaLvlCls(fatigueLevel)},
{lbl:'Emočné riziko',val:skFatigueLvl(emotionalRisk),cls:sfaLvlCls(emotionalRisk)},
{lbl:'Stabilita rozhodnutí',val:skStability(decisionStability),cls:sfaLvlCls(decisionStability==='HIGH'?'LOW':decisionStability)},
{lbl:'Riziko tiltu',val:skFatigueLvl(tiltRisk),cls:sfaLvlCls(tiltRisk)},
{lbl:'Disciplína',val:disciplineScore+'%',cls:disciplineScore>=62?'f-green':disciplineScore>=42?'f-yellow':'f-red'},
{lbl:'Kvalita relácie',val:sessionQuality+'%',cls:sessionQuality>=62?'f-green':sessionQuality>=42?'f-yellow':'f-red'},
{lbl:'Kognitívna záťaž',val:skCognitive(cognitiveLoad),cls:sfaLvlCls(cognitiveLoad)},
{lbl:'Tempo reakcií',val:skTempo(reactionTempo),cls:sfaLvlCls(reactionTempo==='STABLE'?'LOW':reactionTempo)},
{lbl:'Eskalácia rizika',val:skEscalation(riskEscalation),cls:sfaLvlCls(riskEscalation==='RISING'?'HIGH':riskEscalation)},
{lbl:'Odolnosť voči chaosu',val:skChaosRes(chaosResistance),cls:sfaLvlCls(chaosResistance==='GOOD'?'LOW':chaosResistance)},
{lbl:'Dôvera analýzy',val:analysisTrust+'%',cls:analysisTrust>=62?'f-green':analysisTrust>=42?'f-yellow':'f-red'},
{lbl:'Riziko relácie',val:skFatigueLvl(sessionRiskLevel),cls:sfaLvlCls(sessionRiskLevel)}
],
liveWarnings:liveWarnings.slice(0,5),
liveWarningExplain:liveWarnings[0]?liveWarnings[0].text+' — '+liveWarnings[0].reason:'Relácia stabilná — žiadne aktívne varovania.',
warningHistory:liveWarningHistory.slice(0,6)
};
lastSessionFatigueCache=result;lastSessionFatigueKey=key;return result;
}

function renderSessionFatigue(){
const el=document.getElementById('sessionFatiguePanel');
if(!el)return;
const F=computeSessionFatigueAnalysis();
if(!F.ready){
el.innerHTML='<h3>Analýza únavy relácie</h3><p class="sfa-hint">Čas a metriky len od prvého spinu v histórii čísel</p><div class="alert">'+F.explain+'</div>';
return;
}
const riskCls=F.sessionRiskLevel==='HIGH'?'sfa-risk-high':F.sessionRiskLevel==='MEDIUM'?'sfa-risk-med':'sfa-risk-low';
let h='<h3>Analýza únavy relácie</h3><p class="sfa-hint">Od prvého spinu v histórii · reset pri vymazaní histórie</p>';
h+='<div class="sfa-risk-bar '+riskCls+'">Riziko relácie · '+skFatigueLvl(F.sessionRiskLevel)+'</div>';
h+='<div class="sfa-grid">';
F.metrics.forEach(m=>{h+='<div class="sfa-metric '+m.cls+'"><div class="lbl">'+m.lbl+'</div><div class="val">'+m.val+'</div></div>';});
h+='<div class="sfa-metric" style="grid-column:1/-1"><div class="lbl">Disciplína</div><div class="sfa-bar"><div class="fill" style="width:'+F.disciplineScore+'%"></div></div></div>';
h+='<div class="sfa-metric" style="grid-column:1/-1"><div class="lbl">Kvalita relácie</div><div class="sfa-bar"><div class="fill" style="width:'+F.sessionQuality+'%;opacity:.85"></div></div></div></div>';
if(F.breakText)h+='<div class="sfa-break">'+F.breakText+'</div>';
h+='<div class="lw-panel'+(F.liveWarnings.length?' lw-active':'')+'"><div class="lw-head"><span class="lw-dot"></span> LIVE VAROVANIA</div>';
if(!F.liveWarnings.length)h+='<p class="lw-quiet">Relácia stabilná — monitoring aktívny.</p>';
else F.liveWarnings.forEach(w=>{h+='<div class="lw-item '+w.cls+'"><div class="lw-row"><span class="lw-sev">'+skSeverity(w.severity)+'</span><span class="lw-text">'+w.text+'</span></div><div class="lw-reason">'+w.reason+'</div></div>';});
h+='</div>';
if(F.warningHistory&&F.warningHistory.length>1){
h+='<details class="lw-history"><summary>História varovaní</summary><ul>';
F.warningHistory.forEach(w=>{const t=new Date(w.ts).toLocaleTimeString('sk-SK',{hour:'2-digit',minute:'2-digit'});h+='<li><span class="'+w.cls+'">'+skSeverity(w.severity)+'</span> '+w.text+' <em>'+t+'</em></li>';});
h+='</ul></details>';
}
h+='<div class="sfa-ai">'+F.liveWarningExplain+'</div>';
el.innerHTML=h;
}
