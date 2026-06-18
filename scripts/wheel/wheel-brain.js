/**
 * Wheel Brain + Scanner — Balík 10F2 z index-NOVY-V2.html
 * Závisí na: quantum-wheel.js, V2 inline (sector intel, ra*, layout), ai-prediction.
 */
'use strict';

/* Wheel runtime state — jediná deklarácia (10F1); brain extrakcia 10F2 */
var lastQuantumWheelBrain=null,lastQuantumWheelKey='';
var qwFlowState={prevCol:null,prevSectorKey:null,prevPhase:null,hold:0};
var qwWheelMemory=[];
var qwPrevScannerSnap=null;
function invalidateQuantumWheelBrainCache(){
lastQuantumWheelBrain=null;
lastQuantumWheelKey='';
qwPrevScannerSnap=null;
}
function resetQwWheelSessionState(){
qwFlowState={prevCol:null,prevSectorKey:null,prevPhase:null,hold:0};
qwWheelMemory=[];
}
function buildWheelNumHeatmap(w,chaos,flowColIdx,scanner){
const clusters=getClusters().slice(0,3);
const domNums=new Set((w.dominant&&w.dominant.nums)||[]);
const weakNums=new Set((w.weak&&w.weak.nums)||[]);
const activeNums=new Set((clusters[0]&&clusters[0].nums)||[]);
const hotSet=new Set((scanner&&scanner.hotNums)||[]);
const deadSet=new Set((scanner&&scanner.deadNums)||[]);
const colNums=flowColIdx!=null?new Set(qwNumsForColumn(flowColIdx)):new Set();
const map={};
wheel.forEach(n=>{
let score=0;
if(colNums.has(n))score+=45;
if(activeNums.has(n))score+=40;
if(hotSet.has(n))score+=28;
if(domNums.has(n))score+=22;
if(weakNums.has(n))score-=18;
if(deadSet.has(n))score-=28;
const hits=statsCache[n]||0;
if(spins.length)score+=clamp((hits/spins.length)*100,0,25);
let zone='blue';
if(deadSet.has(n))zone='dead';
else if(chaos.chaosLevel>=68||chaos.noEdge)zone='red';
else if(score>=62)zone='green';
else if(score>=38)zone='yellow';
map[n]={score:clamp(score),zone,active:activeNums.has(n)||colNums.has(n)||hotSet.has(n),dying:weakNums.has(n)||deadSet.has(n),dead:deadSet.has(n),colFlow:colNums.has(n)};
});
return map;
}
function computeWheelHealth(CA,SE,mig,chaos,inv,migRun){
return clamp(Math.round(
(100-chaos.chaosLevel)*0.22+
CA.confidence*0.28+
persistenceEngine.maxLife*7+
migRun*5+
(SE.liveScore||0)*0.15+
(inv.edge==='CLEAR EDGE'?12:0)-
(chaos.noEdge?22:0)-
(CA.suppressed?15:0)
));
}
function qwSectorReturnRate(nums,win){
const slice=spins.slice(-win).filter(n=>n>0);
if(!slice.length)return 0;
let h=0;
slice.forEach(n=>{if(nums.includes(n))h++;});
return Math.round(h/slice.length*100);
}
function qwNumsDead(win){
const slice=spins.slice(-win);
const hit=new Set(slice.filter(n=>n>0));
return wheel.filter(n=>n>0&&!hit.has(n));
}
function qwNumsHot(win){
const map={};
spins.slice(-win).forEach(n=>{if(n>0)map[n]=(map[n]||0)+1;});
return Object.keys(map).map(Number).sort((a,b)=>map[b]-map[a]).slice(0,6);
}
function qwRiskLevel(conf,chaos,aligned){
if(chaos>=68||conf<40)return'HIGH';
if(chaos>=55||conf<52)return'MEDIUM';
if(conf>=62&&aligned)return'LOW';
return'MEDIUM';
}
function qwFieldState(conf,chaos,risk){
if(chaos>=65||risk==='HIGH')return'state-danger';
if(conf>=62&&chaos<50)return'state-green';
return'state-caution';
}
function qwOutField(label,icon,pick,strength,conf,flowSup,momSup,domSup,alignSup,risk,chaosLv){
const c=conf!=null?conf:0;
return{label,icon,pick:pick||'—',strength:strength||'—',confidence:c,
flowSupport:flowSup||'—',momentumSupport:momSup&&momSup!=='—'?momSup:'—',
dominanceSupport:domSup&&domSup!=='—'?domSup:'—',alignmentSupport:alignSup&&alignSup!=='—'?alignSup:'—',
riskLevel:risk||'MEDIUM',state:qwFieldState(c,chaosLv||0,risk)};
}
function computeQwLiveOutput(st,scanner,chaos,flowLife){
const s10=spins.length>=10?raSliceStats(10):null;
const slice=spins.slice(-20);
const colorSt=raColorStreak(slice);
const colBins=rbaWeightedBins('col');
const dozBins=rbaWeightedBins('doz');
const colOrder=[0,1,2].sort((a,b)=>colBins[b]-colBins[a]);
const dozOrder=[0,1,2].sort((a,b)=>dozBins[b]-dozBins[a]);
const cols=raColName(colOrder[0])+' + '+raColName(colOrder[1]);
const dozens=raDozName(dozOrder[0])+' + '+raDozName(dozOrder[1]);
const aligned=scanner&&scanner.alignment.status==='FLOW ALIGNED';
const cLv=chaos?chaos.chaosLevel:50;
let colorPick='—',colorStr='—',colorMom='—';
if(s10){
const dom=s10.redPct>=s10.blackPct?'ČERVENÁ':'ČIERNA';
if(colorSt.len>=4){colorPick=(dom==='ČERVENÁ'?'ČIERNA':'ČERVENÁ');colorStr='KOREKCIA TLAKU';}
else{colorPick=dom;colorStr='PODPORA FLOW';}
colorMom=colorSt.len>=4?'PODPORA MOMENTUM':colorSt.len>=2?'DRŽÍ MOMENTUM':'SLABNÝ MOMENTUM';
}
let parPick='—',parStr='—',parConf=50;
if(s10){
parPick=s10.evenPct>=58?'PÁRNE':s10.oddPct>=58?'NEPÁRNE':'PÁRNE / NEPÁRNE';
parStr=s10.evenPct>=55?'DOMINANCIA PARITY':'TLAK PARITY';
parConf=Math.round(Math.max(s10.evenPct,s10.oddPct));
}
let rangePick='—',rangeStr='—',rangeConf=50;
if(s10){
rangePick=s10.highPct>=58?'19–36':s10.lowPct>=58?'1–18':'1–18 / 19–36';
rangeStr=s10.highPct>=55?'VYSOKÝ TLAK':s10.lowPct>=55?'NÍZKY TLAK':'NEUTRÁLNY RANGE';
rangeConf=Math.round(Math.max(s10.highPct,s10.lowPct));
}
const colConf=scanner?Math.round((scanner.pat.rate+scanner.returnRate)/2):50;
const dozConf=scanner?Math.round(scanner.pat.rate*0.9):50;
const colStr=scanner&&scanner.returnForce.level.indexOf('STRONG')>=0?'SILNÝ NÁVRATOVÝ FLOW':
scanner&&scanner.returnForce.level.indexOf('AGGRESSIVE')>=0?'AGRESÍVNY NÁVRAT':
scanner&&scanner.pressure.dominant.indexOf('REPEAT')>=0?'TLAK OPAKOVANIA':'TLAK NÁVRATU';
const dozStr=scanner&&scanner.pressure.dominant.indexOf('DOMINANCE')>=0?'DOMINANCIA AKTÍVNA':
scanner&&scanner.sync.active?'PODPORA SYNC':'TLAK TUCTOV';
const alignLbl=aligned?'FLOW ZLADENÝ':'ZMIEŠANÝ';
const flowSup=colorStr;
return{
color:qwOutField('FARBA','🔥',colorPick,colorStr,colConf,flowSup,colorMom,'DOM SUPPORT',alignLbl,qwRiskLevel(colConf,cLv,aligned)),
parity:qwOutField('PARITA','⚡',parPick,parStr,parConf,parStr,'—','PARITY',alignLbl,qwRiskLevel(parConf,cLv,aligned)),
range:qwOutField('RANGE','🎯',rangePick,rangeStr,rangeConf,rangeStr,'—','RANGE',alignLbl,qwRiskLevel(rangeConf,cLv,aligned)),
dozens:qwOutField('TUCTY','📊',dozens,dozStr,dozConf,dozStr,scanner&&scanner.sync.active?'REPEAT SUPPORT':'—','DOMINANCE',alignLbl,qwRiskLevel(dozConf,cLv,aligned)),
columns:qwOutField('STĹPCE','📈',cols,colStr,colConf,colStr,colorMom,'RETURN',alignLbl,qwRiskLevel(colConf,cLv,aligned))
};
}
function computeQwFlowScanner(w,mig,chaos,clusters,st,flowLife){
const slice=spins.slice(-50);
const oscCol=slice.length>=6?raOscillationScore(slice.slice(-15),'col'):0;
const pat=spins.length>=8?raPatternReliability():{rate:50,samples:0};
const colSt=rbaColStreak(slice.slice(-12));
const colorSt=raColorStreak(slice);
const migRun=countMigrationStreak();
const domNums=(w.dominant&&w.dominant.nums)||(clusters[0]&&clusters[0].nums)||[];
const domPath=qwFormatSectorTrail(domNums);
const returnRate=qwSectorReturnRate(domNums,Math.min(20,spins.length));
const domStrength=w.dominant?(w.dominant.wheelConfidence||w.dominant.displayPct||w.dominant.pct||0):0;
const hotNums=qwNumsHot(12);
const deadNums=qwNumsDead(18).slice(0,8);
const colRet=raReturnHits(slice,'col');
let chaosIdx=Math.round((oscCol+(chaos.chaosLevel||50))/2);
if(pat.rate<55)chaosIdx+=10;
let rngIdx=clamp(78-chaosIdx+Math.min(18,pat.rate-50)-(colSt.len>=6?12:0),0,100);
let rngLabel='STABLE';
if(rngIdx>=78)rngLabel='VERY STABLE';
else if(rngIdx<38)rngLabel='HIGHLY CHAOTIC';
else if(rngIdx<55)rngLabel='UNSTABLE';
let flowStab='STABLE';
if(rngLabel==='VERY STABLE')flowStab='VERY STABLE';
else if(rngLabel==='HIGHLY CHAOTIC')flowStab='CHAOTIC';
else if(rngLabel==='UNSTABLE')flowStab='UNSTABLE';
let qualityScore=clamp(Math.round(pat.rate*0.35+returnRate*0.25+rngIdx*0.2+(100-chaos.chaosLevel)*0.2),0,100);
let flowQuality='MEDIUM QUALITY';
if(qualityScore>=72)flowQuality='HIGH QUALITY';
else if(qualityScore<48)flowQuality='LOW QUALITY';
let risk='MEDIUM RISK';
if(chaos.noEdge||chaos.chaosLevel>=68||flowLife.breakDetected)risk='HIGH RISK';
else if(qualityScore>=70&&rngLabel==='VERY STABLE')risk='LOW RISK';
let healthPct=computeWheelHealth({confidence:qualityScore,suppressed:false,state:'FLOW'},{liveScore:qualityScore},mig,chaos,{edge:qualityScore>=65?'CLEAR EDGE':'LOW EDGE'},migRun);
let healthLabel='STABLE';
if(healthPct>=72)healthLabel='HEALTHY';
else if(healthPct<42||rngLabel==='HIGHLY CHAOTIC')healthLabel='CHAOTIC';
else if(healthPct<58)healthLabel='UNSTABLE';
const repeatP=clamp((colSt.len+colorSt.len)*11+returnRate*0.3,0,100);
const reversalP=clamp(oscCol+(flowLife.phase==='WEAKENING'?18:0),0,100);
const chaosP=chaos.chaosLevel||50;
const domP=clamp(domStrength,0,100);
const pressures=[
{k:'REPEAT PRESSURE',v:repeatP},
{k:'REVERSAL PRESSURE',v:reversalP},
{k:'CHAOS PRESSURE',v:chaosP},
{k:'DOMINANCE PRESSURE',v:domP},
{k:'SUPPRESSION PRESSURE',v:deadNums.length*12}
].sort((a,b)=>b.v-a.v);
const collapseRisk=chaosP>=65&&reversalP>=55;
let alignment='FLOW ALIGNED',alignLine='Sektory, momentum a návraty idú rovnakým smerom.';
const conflictDetected=(pat.rate>=62&&colSt.len<3)||(flowLife.breakDetected&&pat.rate>=55)||(repeatP>=55&&reversalP>=58);
if(conflictDetected){alignment='FLOW CONFLICT';alignLine='Konflikt flowu — opakovanie a chaos/tlak si odporujú.';}
const syncActive=repeatP>=58&&domP>=55&&chaosP<55&&!conflictDetected;
let fatigueLevel='OK',fatigueLine='';
if(colSt.len>=5||colorSt.len>=6){fatigueLevel='FATIGUED FLOW';fatigueLine=raColName(st.domCol)+' už pôsobí vyčerpane.';}
else if(colSt.len>=4){fatigueLevel='OVERHEATED FLOW';fatigueLine='Dominancia sa prehrieva — momentum slabne.';}
let falseActive=false,falseLine='';
if(pat.rate>=60&&colSt.len<=3&&returnRate<40){falseActive=true;falseLine='Dominancia je príliš krátka na dôveryhodný edge.';}
else if(pat.rate>=62&&repeatP>=50&&colRet.rate<52){falseActive=true;falseLine='Flow nemá dostatočnú momentum podporu.';}
else if(pat.rate>=58&&chaosP>=55){falseActive=true;falseLine='Flow síce vyzerá stabilne, ale chaos podkopáva edge.';}
let recovery={active:false,line:''};
if(qwPrevScannerSnap&&(qwPrevScannerSnap.chaos>=65)&&(chaos.chaosLevel<58)&&pat.rate>=55){
recovery={active:true,line:'Po chaotic phase začína vznikať nový repeat flow.'};
}
let temp='WARM',tempLine='Session je teplá.';
if(chaos.chaosLevel>=75){temp='CHAOTIC';tempLine='RNG je v chaotic teplote.';}
else if(colSt.len>=6){temp='OVERHEATED';tempLine='Session je momentálne prehrievaná.';}
else if(colSt.len>=5){temp='HOT';tempLine='Horúci flow — agresívna dominancia.';}
else if(chaos.chaosLevel<40&&pat.rate>=68){temp='COLD';tempLine='Flow zostáva pokojný a cold.';}
else if(colSt.len>=4&&oscCol<45){temp='BURNING';tempLine='RNG vytvára burning momentum.';}
let noise='MEDIUM NOISE';
if(chaos.chaosLevel>=70)noise='HIGH NOISE';
else if(chaos.chaosLevel<38&&oscCol<42)noise='LOW NOISE';
let returnForce='MEDIUM RETURN';
if(returnRate>=55)returnForce='STRONG RETURN';
else if(returnRate>=42)returnForce='MEDIUM RETURN';
else if(returnRate>=28)returnForce='WEAK RETURN';
else returnForce='WEAK RETURN';
if(returnRate>=62&&colRet.rate>=58)returnForce='AGGRESSIVE RETURN';
let flowSpeed='STABLE FLOW';
if(oscCol>=62)flowSpeed='FAST MIGRATION';
else if(chaos.chaosLevel>=70)flowSpeed='RAPID CHAOS';
else if(migRun>=4&&oscCol<45)flowSpeed='SLOW FLOW';
let sessionId='SWITCHING SESSION',sessionLine='Switching session na wheeli.';
if(chaos.chaosLevel>=65){sessionId='CHAOTIC SESSION';sessionLine='Chaotická session — wheel odmieta štruktúru.';}
else if(colSt.len>=4||returnRate>=45){sessionId='REPEAT SESSION';sessionLine='Repeat session — wheel drží návratový loop.';}
else if(domP>=55){sessionId='DOMINANCE SESSION';sessionLine='Dominance session — jeden sektor vládne.';}
else if(reversalP>=58){sessionId='REVERSAL SESSION';sessionLine='Reversal session — tlak na zlom trendu.';}
const microOsc=spins.length>=5?raOscillationScore(spins.slice(-5).filter(n=>n>0),'col'):oscCol;
let micro={active:false,line:''};
if(microOsc<40&&pat.rate>=60)micro={active:true,line:'RNG momentálne vytvára krátke stabilné repeat window.'};
else if(microOsc<42&&oscCol>=55)micro={active:true,line:'Session krátkodobo stabilizovala switching.'};
const memKey=sessionId+'|'+temp+'|'+st.domCol;
const memHit=qwWheelMemory.find(m=>m.key===memKey);
if(memHit)memHit.n++;else qwWheelMemory.push({key:sessionId+'|'+temp,spin:spins.length,n:1});
if(qwWheelMemory.length>16)qwWheelMemory.shift();
let memLine=memHit&&memHit.n>=2?'Tento chaos/dominance pattern sa počas session už objavil.':'';
if(!memLine&&returnRate>=48)memLine='Koleso sa opakovane vracia do horného sektora flow.';
let trustScore=clamp(Math.round(qualityScore*0.4+rngIdx*0.35+returnRate*0.25-chaos.chaosLevel*0.2-(falseActive?15:0)),0,100);
let trustLevel='MEDIUM TRUST',trustLine='Stredná dôvera v wheel flow.';
if(trustScore>=70)trustLevel='HIGH TRUST';
else if(trustScore<38){trustLevel='NO TRUST';trustLine='Momentálne nemám dôveru v tento wheel flow.';}
else if(trustScore<52){trustLevel='LOW TRUST';trustLine='Momentálne mám nízku dôveru v wheel flow.';}
else if(trustScore>=65)trustLine='Koleso zostáva čitateľný — trust rastie.';
let egoMode='balanced';
if(trustScore>=68&&qualityScore>=65)egoMode='confident';
else if(trustScore<45||falseActive)egoMode='cautious';
else if(flowLife.phase==='DEAD'||collapseRisk)egoMode='passive';
const caution=[];
if(chaos.chaosLevel>=62)caution.push('Session pôsobí nebezpečne chaoticky.');
if(falseActive)caution.push('Flow pôsobí príliš nestabilne na bezpečný vstup.');
if(fatigueLevel!=='OK')caution.push('Momentálne neverím tomuto momentum.');
let psychology='Flow pôsobí pokojne a čitateľne.';
if(chaos.chaosLevel>=60)psychology='Session pôsobí nervózne.';
else if(colSt.len>=4)psychology='RNG tlačí agresívny repeat flow na wheeli.';
else if(fatigueLevel==='FATIGUED FLOW')psychology='Dominancia začína byť emocionálne nestabilná.';
let silence={active:false,msg:''};
if(chaos.chaosLevel>=72||rngLabel==='HIGHLY CHAOTIC')silence={active:true,msg:'🔴 Wheel je príliš chaotický.'};
else if(pat.rate<52&&oscCol>=58)silence={active:true,msg:'🔴 Flow nie je čitateľný — počkaj.'};
else if(trustLevel==='NO TRUST'&&qualityScore<45)silence={active:true,msg:'🔴 REŽIM ČAKANIA — wheel nemá smer.'};
let liveComment='';
if(silence.active)liveComment=silence.msg;
else if(recovery.active)liveComment='🟢 Po chaose sa formuje nový flow.';
else if(falseActive)liveComment='🟠 Dominancia je príliš krátka na hru.';
else if(fatigueLine)liveComment='🟠 Dominancia začína slabnúť.';
else if(st.domCol>=0&&returnRate>=40)liveComment='🟢 '+(st.domCol+1)+'. stĺpec stále drží flow.';
else if(domPath!=='—'&&returnRate>=45)liveComment='🟢 Návraty do sektora '+domPath+' pokračujú.';
else if(chaos.chaosLevel>=58)liveComment='🟠 Chaos prekrýva dominanciu.';
else if(flowLife.momentum&&flowLife.momentum.label==='Slabne')liveComment='🟠 Dominancia začína slabnúť.';
else if(st.domCol>=0)liveComment='🟢 Sleduj '+(st.domCol+1)+'. stĺpec.';
else liveComment='🟠 Flow sa ešte formuje.';
let evolutionStory='Session sa vyvíja.';
if(qwPrevScannerSnap&&qwPrevScannerSnap.sessionId&&sessionId!==qwPrevScannerSnap.sessionId){
evolutionStory='Relácia prešla z '+sk(qwPrevScannerSnap.sessionId)+' do '+sk(sessionId)+'.';
}else if(qwPrevScannerSnap&&qwPrevScannerSnap.chaos>=65&&chaos.chaosLevel<55){
evolutionStory='Po chaose sa wheel pomaly stabilizuje.';
}
let momentumState='STABLE';
if(flowLife.breakDetected||collapseRisk)momentumState='COLLAPSING';
else if(flowLife.momentum&&flowLife.momentum.label==='Rastie')momentumState='GROWING';
else if(flowLife.momentum&&flowLife.momentum.label==='Slabne')momentumState='WEAKENING';
else if(flowLife.phase==='WEAKENING'||fatigueLevel!=='OK')momentumState='WEAKENING';
const scannerCore={
chaosLevel:chaos.chaosLevel,noEdge:!!chaos.noEdge,
oscCol,pat,returnRate,domStrength,domPath,domNums,hotNums,deadNums,
flowStability:flowStab,rngStability:{label:rngLabel,index:rngIdx},
flowQuality:{label:flowQuality,score:qualityScore},
flowRisk:{label:risk},
wheelHealth:{pct:healthPct,label:healthLabel},
pressure:{dominant:pressures[0].k,value:pressures[0].v,lines:pressures.filter(p=>p.v>=52).slice(0,2).map(p=>p.k.replace(' PRESSURE','')+' '+p.v+'%'),collapseRisk},
alignment:{status:alignment,line:alignLine},
conflict:{detected:conflictDetected,line:conflictDetected?alignLine:''},
sync:{active:syncActive,line:syncActive?'Flow zladený — tlak, sektory a návraty idú rovnakým smerom.':''},
fatigue:{level:fatigueLevel,line:fatigueLine},
falseFlow:{active:falseActive,line:falseLine},
recovery,temperature:{level:temp,line:tempLine},
noise:{level:noise},
returnForce:{level:returnForce,line:'Sila návratu: '+sk(returnForce)+' · '+returnRate+'% v dominantnom sektore'},
flowSpeed:{level:flowSpeed},
sessionIdentity:{id:sessionId,line:sessionLine},
microWindow:micro,wheelMemory:{line:memLine},
trust:{level:trustLevel,score:trustScore,line:trustLine},
ego:{mode:egoMode},
caution,psychology,silence,liveComment,
dominantSector:{path:domPath,strength:Math.round(domStrength),returnRate,returns:colRet.rate,
line:'DOMINANTNÝ: '+domPath+' · sila '+Math.round(domStrength)+'% · návrat '+returnRate+'%'},
momentumState
};
const liveOutput=computeQwLiveOutput(st,scannerCore,chaos,flowLife);
const priority=qwResolvePriority(scannerCore,chaos,flowLife,mig);
qwPrevScannerSnap={chaos:chaos.chaosLevel,pat:pat.rate,sessionId,oscCol,returnRate};
return Object.assign(scannerCore,{liveOutput,priority,waitMode:priority.wait});
}
function computeQuantumWheelBrain(){
const key=predCacheKey()+'|qw|'+spins.length+'|'+spinRecords.length;
if(lastQuantumWheelBrain&&lastQuantumWheelKey===key)return lastQuantumWheelBrain;
const empty={
ready:false,modelLabel:'Kvantové koleso · flow radar',
mainFlow:{headline:'Čakám na spiny',sub:'',cls:'quiet'},
flowDirHuman:{main:'—',sub:'—'},flowContinuity:{label:'—',cls:'yellowTxt'},
dominantColumn:'—',dominantDozen:'—',dominantSectorPath:'—',
wheelHealth:0,healthExplain:'',liveComment:'Zadaj 2+ spiny.',
trail:'—',trailNums:[],trailHint:'',confidence:0,
numHeat:{},clusters:[]
};
if(spins.length<2){lastQuantumWheelBrain=empty;lastQuantumWheelKey=key;return empty;}
const pr=computeAIPrediction();
const CA=pr&&pr.coreAnalysis?pr.coreAnalysis:computeAIPredictionEngine();
const w=computeWheelSectorIntel();
const mig=getWheelMigrationDirection();
const chaos=analyzeChaosFromSpins();
const clusters=getClusters().slice(0,3);
const migRun=countMigrationStreak();
const flowCont=qwFlowContinuity(chaos);
const fu=CA&&CA.flowEng;
const flowColIdx=fu!=null?(fu.displayCol!=null?fu.displayCol:fu.bestCol):spinMemoryEngine.dominantSectors.column;
const di=spinMemoryEngine.dominantSectors.dozen;
const predDoz=fu!=null?fu.bestDoz:di;
const dominantDozen=predDoz>=0?String(predDoz+1)+'. tucet':(di>=0?['1.','2.','3.'][di]+' tucet':'—');
const dominantColumn=flowColIdx>=0?String(flowColIdx+1)+'. stĺpec':'—';
const sectorPath=clusters[0]?qwFormatSectorTrail(clusters[0].nums):(w.dominant?qwFormatSectorTrail(w.dominant.nums):'—');
const flowLife=qwAnalyzeWheelFlow(pr,w,mig,chaos,clusters);
const mainFlow=flowLife.mainFlow;
const stQw=qwColDozStats();
const scanner=computeQwFlowScanner(w,mig,chaos,clusters,stQw,flowLife);
const flowDirHuman=qwWheelFlowDirection(mig,chaos,scanner.flowStability);
const wheelHealth=scanner.wheelHealth.pct;
const trailNums=spins.slice(-15);
const trail=trailNums.join(' → ');
const playCls=scanner.flowRisk.label==='HIGH RISK'?'redTxt':scanner.flowQuality.label==='HIGH QUALITY'?'greenTxt':'yellowTxt';
const result={
ready:true,
modelLabel:'ŽIVÝ RADAR TOKU KOLESA',
mainFlow,flowLife,scanner,
flowDir:mig.dir,flowDirHuman,flowContinuity:flowCont,
flowMomentum:flowLife.momentum,flowTransition:flowLife.transition,flowBreak:flowLife.breakDetected,
dominantDozen,dominantColumn,dominantSectorPath:scanner.dominantSector.path,
wheelHealth,
trail,trailNums,
confidence:scanner.trust.score,
predRezim:flowLife.phase==='DEAD'?'DEAD SPINS':flowLife.phase==='STRONG'?'FLOW ACTIVE':'OBSERVATION',
predRezimCls:playCls,
suppressed:CA?CA.suppressed:false,noEdge:chaos.noEdge,
numHeat:buildWheelNumHeatmap(w,chaos,flowColIdx>=0?flowColIdx:null,scanner),
liveComment:scanner.liveComment,
edgeLabel:scanner.flowQuality.label,
state:scanner.wheelHealth.label,
flowLabel:flowDirHuman.main,
chaosLevel:chaos.chaosLevel,
wIntel:w,clusters,pr
};
lastQuantumWheelBrain=result;lastQuantumWheelKey=key;return result;
}