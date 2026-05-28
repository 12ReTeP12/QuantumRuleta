/* Timing analytics — extracted from index-NOVY-V4.html */
'use strict';

function spinIntervals(){
if(spinTimes.length<2)return [];
const iv=[];
for(let i=1;i<spinTimes.length;i++){
iv.push((spinTimes[i]-spinTimes[i-1])/1000);
}
return iv;
}

function scoreTimingRhythm(){
const iv=spinIntervals();
if(iv.length<2)return 50;
const avg=iv.reduce((a,b)=>a+b,0)/iv.length;
const std=Math.sqrt(iv.reduce((s,t)=>s+Math.pow(t-avg,2),0)/iv.length);
return clamp(100-std*14);
}

function scoreTimingPace(){
const iv=spinIntervals();
if(!iv.length)return 50;
const avg=iv.reduce((a,b)=>a+b,0)/iv.length;
if(avg>=1.5&&avg<=8)return clamp(90-(Math.abs(avg-4)*8));
return clamp(70-Math.abs(avg-4)*10);
}

function scoreTimingTrend(){
const iv=spinIntervals();
if(iv.length<4)return 50;
const recent=iv.slice(-5);
const all=iv;
const rAvg=recent.reduce((a,b)=>a+b,0)/recent.length;
const aAvg=all.reduce((a,b)=>a+b,0)/all.length;
const diff=Math.abs(rAvg-aAvg);
return clamp(100-diff*18);
}

function scoreTimingFlow(){
if(!hasMinSpins()||spinTimes.length<2)return 50;
const span=(spinTimes[spinTimes.length-1]-spinTimes[0])/1000;
if(span<=0)return 50;
const perMin=(spins.length/span)*60;
return clamp(Math.min(100,perMin*8));
}

function scoreTimingStability(){
const iv=spinIntervals();
if(iv.length<3)return 50;
const last=iv.slice(-8);
const avg=last.reduce((a,b)=>a+b,0)/last.length;
const maxDev=Math.max(...last.map(t=>Math.abs(t-avg)));
return clamp(100-maxDev*22);
}

function analyzeSpinCadence(){
const breakdown={
rhythm:scoreTimingRhythm(),
pace:scoreTimingPace(),
trend:scoreTimingTrend(),
flow:scoreTimingFlow(),
stability:scoreTimingStability()
};
const total=Math.round(
breakdown.rhythm*TIMING_SIGNAL.rhythm+
breakdown.pace*TIMING_SIGNAL.pace+
breakdown.trend*TIMING_SIGNAL.trend+
breakdown.flow*TIMING_SIGNAL.flow+
breakdown.stability*TIMING_SIGNAL.stability
);
lastTimingBreakdown={...breakdown,total:clamp(total)};
return lastTimingBreakdown.total;
}

function getTimingPillarGrade(){
if(spinIntervals().length<3){
return{score:'—',tag:'MALO SPINOV'};
}
const core=analyzeSpinCadence();
const of10=+(core/10).toFixed(1);
let tag='ROZVÍJAJÚCE';
if(core>=85)tag='10/10 ELITE';
else if(core>=75)tag='SILNÉ';
else if(core>=62)tag='DOBRÉ';
else if(core>=48)tag='STREDNÉ';
return{score:of10+'/10',tag};
}

function normalizeBallTimingRecords(){
if(!ballTimingRecords.length&&ballTimingHistory.length){
ballTimingHistory.forEach(sec=>ballTimingRecords.push({sec,num:-1,ts:0,dozen:-1,column:-1}));
}
}

function computeTimingEngine(){
normalizeBallTimingRecords();
const records=ballTimingRecords.filter(r=>r.num>=0&&r.num<=36);
const n=records.length;
const empty={ready:false,profileReady:false,confidence:'LOW',confidenceLabel:'—',chaos:0,deviation:0,rhythmStability:0,avgSec:0,
dozens:'—',columns:'—',color:'—',size:'—',parity:'—',explain:'ŠTART → STOP → zadaj číslo. Min. 3 záznamy.',
recordCount:n,target:TIMING_PROFILE_FULL,pending:pendingBallTimingSec!=null,historyNums:'',sectorNote:''};
if(n<TIMING_PROFILE_MIN)return empty;
const samples=records.map(r=>r.sec);
if(pendingBallTimingSec!=null)samples.push(pendingBallTimingSec);
const st=ballTimingAvgStd(samples);
const deviation=+st.std.toFixed(2);
const chaos=clamp(Math.round(st.std*22+(n<TIMING_PROFILE_FULL?12:0)));
const rhythmStability=Math.round(ballTimingStability(samples));
let confidence='LOW';
if(n>=TIMING_PROFILE_FULL&&st.std<1.4&&rhythmStability>=62)confidence='HIGH';
else if(n>=6&&st.std<2.2)confidence='MEDIUM';
const dozenW=[0,0,0],colW=[0,0,0];
let redW=0,blackW=0,lowW=0,highW=0,evenW=0,oddW=0;
const sectorFast={},sectorSlow={};
const avgSec=st.avg||5;
records.forEach((r,i)=>{
const w=Math.pow(1.1,i);
if(r.dozen>=0)dozenW[r.dozen]+=w;
if(r.column>=0)colW[r.column]+=w;
if(r.num>0){if(r.isRed)redW+=w;else blackW+=w;if(r.isLow)lowW+=w;else highW+=w;if(r.isEven)evenW+=w;else oddW+=w;}
const seg=r.wheelIdx>=0?Math.floor(r.wheelIdx/5):-1;
if(seg>=0){if(r.sec<avgSec-0.25)sectorFast[seg]=(sectorFast[seg]||0)+w;if(r.sec>avgSec+0.25)sectorSlow[seg]=(sectorSlow[seg]||0)+w;}
});
const dozenNames=['1. tucet (1–12)','2. tucet (13–24)','3. tucet (25–36)'];
const colNames=['Stĺpec 1 (2:1)','Stĺpec 2 (2:1)','Stĺpec 3 (2:1)'];
function top2(arr,names){return arr.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v).filter(x=>x.v>0).slice(0,2).map(x=>names[x.i]).join(' · ')||'—';}
let nextSec=avgSec;
if(n>=3){const last3=records.slice(-3).map(r=>r.sec);nextSec=avgSec+(last3[2]-last3[0])*0.18;}
const expectFast=nextSec<avgSec-0.2,expectSlow=nextSec>avgSec+0.2;
let sectorNote='';
if(expectFast||expectSlow){const pool=expectFast?sectorFast:sectorSlow;let best=-1,bestV=0;Object.keys(pool).forEach(k=>{if(pool[k]>bestV){bestV=pool[k];best=+k;}});if(best>=0)sectorNote='Sektorová tendencia pri '+(expectFast?'rýchlom':'pomalom')+' tempe.';}
let colorPick=redW>=blackW?'ČERVENÁ':'ČIERNA';
const last2=records.slice(-2).filter(r=>r.num>0);
if(last2.length===2){if(last2[0].isRed&&last2[1].isRed&&redW>blackW*1.25)colorPick='ČIERNA (korekcia)';if(last2[0].isBlack&&last2[1].isBlack&&blackW>redW*1.25)colorPick='ČERVENÁ (korekcia)';}
if(records[records.length-1].num===0)colorPick='0 · chaos segment';
const confLabel=confidence==='HIGH'?'Vysoká · stabilný rhythm':confidence==='MEDIUM'?'Stredná · čiastočný rytmus':'Nízka · chaos / málo dát';
return{ready:true,profileReady:n>=TIMING_PROFILE_FULL,confidence,confidenceLabel:confLabel,chaos,deviation,rhythmStability,avgSec:+avgSec.toFixed(2),
dozens:top2(dozenW,dozenNames),columns:top2(colW,colNames),color:colorPick,size:lowW>=highW?'MALÉ (1–18)':'VEĽKÉ (19–36)',parity:evenW>=oddW?'PÁRNE':'NEPÁRNE',
explain:'Analytický odhad · timing-flow ('+n+'/'+TIMING_PROFILE_FULL+'). Nie istota.',recordCount:n,target:TIMING_PROFILE_FULL,pending:pendingBallTimingSec!=null,
historyNums:records.slice(-8).map(r=>r.num).join(' → '),sectorNote,nextSecEst:+nextSec.toFixed(2)};
}

function getBallTimingSamples(){
const list=ballTimingRecords.length?ballTimingRecords.map(r=>r.sec):ballTimingHistory.slice();
if(pendingBallTimingSec!=null)list.push(pendingBallTimingSec);
else if(timingRunning&&timingStartAt)list.push((Date.now()-timingStartAt)/1000);
return list;
}

function ballTimingAvgStd(samples){
if(!samples.length)return{avg:0,std:0};
const avg=samples.reduce((a,b)=>a+b,0)/samples.length;
if(samples.length<2)return{avg,std:0};
const std=Math.sqrt(samples.reduce((s,t)=>s+Math.pow(t-avg,2),0)/samples.length);
return{avg,std};
}

function ballTimingFlow(sec){
if(sec>=2&&sec<=10)return clamp(100-Math.abs(sec-5.5)*12);
return clamp(70-Math.abs(sec-5.5)*8);
}

function ballTimingStability(samples){
if(!samples.length)return 50;
if(samples.length<2)return clamp(88-Math.abs(samples[0]-5.5)*6);
const std=ballTimingAvgStd(samples).std;
return clamp(100-std*15);
}

function ballTimingRhythm(samples){
if(samples.length<2)return 50;
return clamp(100-ballTimingAvgStd(samples).std*18);
}

function ballTimingPace(sec){
return ballTimingFlow(sec);
}

function ballTimingTrend(samples){
if(samples.length<4)return 50;
const recent=samples.slice(-3);
const allAvg=samples.reduce((a,b)=>a+b,0)/samples.length;
const rAvg=recent.reduce((a,b)=>a+b,0)/recent.length;
return clamp(100-Math.abs(rAvg-allAvg)*20);
}

function computeBallTimingCore(samples){
const sec=samples.length?samples[samples.length-1]:0;
const breakdown={
rhythm:Math.round(ballTimingRhythm(samples)),
pace:Math.round(ballTimingPace(sec)),
trend:Math.round(ballTimingTrend(samples)),
flow:Math.round(ballTimingFlow(sec)),
stability:Math.round(ballTimingStability(samples))
};
const total=Math.round(
breakdown.rhythm*TIMING_SIGNAL.rhythm+
breakdown.pace*TIMING_SIGNAL.pace+
breakdown.trend*TIMING_SIGNAL.trend+
breakdown.flow*TIMING_SIGNAL.flow+
breakdown.stability*TIMING_SIGNAL.stability
);
lastTimingBreakdown={...breakdown,total:clamp(total)};
return lastTimingBreakdown.total;
}

function getBallTimingPillarGrade(samples){
if(!samples.length){
return{score:'—',tag:'Čakám ŠTART'};
}
const core=computeBallTimingCore(samples);
const of10=+(core/10).toFixed(1);
let tag='ROZVÍJAJÚCE';
if(core>=85)tag='10/10 ELITE';
else if(core>=75)tag='SILNÉ';
else if(core>=62)tag='DOBRÉ';
else if(core>=48)tag='STREDNÉ';
return{score:of10+'/10',tag};
}

function getTimingPressure(){
const samples=getBallTimingSamples();
if(samples.length){
const st=ballTimingAvgStd(samples);
const core=computeBallTimingCore(samples);
const P=computeTimingEngine();
return{
pressure:P.ready?P.chaos:clamp(Math.round(st.std*22)),
chaos:P.ready?P.chaos:clamp(Math.round(st.std*22)),
deviation:P.ready?P.deviation:+st.std.toFixed(2),
core,rhythm:lastTimingBreakdown.rhythm,
stability:lastTimingBreakdown.stability,
pace:lastTimingBreakdown.pace,
trend:lastTimingBreakdown.trend
};
}
const iv=spinIntervals();
if(iv.length<2){
const core=analyzeSpinCadence();
return{pressure:50,chaos:50,deviation:0,core,rhythm:lastTimingBreakdown.rhythm,stability:lastTimingBreakdown.stability,pace:lastTimingBreakdown.pace,trend:lastTimingBreakdown.trend};
}
const avg=iv.reduce((a,b)=>a+b,0)/iv.length;
const std=Math.sqrt(iv.reduce((s,t)=>s+Math.pow(t-avg,2),0)/iv.length);
const core=analyzeSpinCadence();
return{
pressure:clamp(Math.round(std*12)),
chaos:clamp(Math.round(std*12)),
deviation:+std.toFixed(2),
core,rhythm:lastTimingBreakdown.rhythm,stability:lastTimingBreakdown.stability,pace:lastTimingBreakdown.pace,trend:lastTimingBreakdown.trend
};
}

function buildTimingHTML(){
const samples=getBallTimingSamples();
const tg=getBallTimingPillarGrade(samples);
const tb=lastTimingBreakdown;
lastCoreValues.timingCore=tb.total;
const st=ballTimingAvgStd(samples);
const avg=st.avg.toFixed(2);
const stdVal=st.std.toFixed(2);
let ball='0.00';
if(timingRunning&&timingStartAt){
ball=((Date.now()-timingStartAt)/1000).toFixed(2);
}else if(lastBallTimingSec!=null){
ball=lastBallTimingSec.toFixed(2);
}
const p=timingBallPick;
return '<div class="panel-line"><span>TIMING PILIER</span><b class="greenTxt">'+tg.score+'</b></div>'
+'<div class="panel-line"><span>STAV</span><b class="yellowTxt">'+tg.tag+'</b></div>'
+'<div class="panel-line"><span>PRIEMER / σ (gulička)</span><b class="blueTxt">'+avg+'s / '+stdVal+'s</b></div>'
+'<div class="panel-line"><span>Rytmus · Pace · Trend</span><b class="blueTxt">'+tb.rhythm+' · '+tb.pace+' · '+tb.trend+'</b></div>'
+'<div class="panel-line"><span>Flow · Stabilita</span><b class="blueTxt">'+tb.flow+' · '+tb.stability+'</b></div>'
+'<div class="panel-line"><span>Čas guličky</span><b class="greenTxt">'+ball+' s</b></div>'
+'<div class="panel-line"><span>Časovač</span><b class="yellowTxt">'+(timingRunning?'AKTÍVNY':'STOP')+'</b></div>'
+'<div class="panel-line"><span>TIMING CORE → 20%</span><b class="yellowTxt">'+lastCoreValues.timingCore+'%</b></div>'
+'<div class="panel-line"><span>Spoľahlivosť timingu</span><b class="yellowTxt">'+(lastTimingProfileCache&&lastTimingProfileCache.confidence?lastTimingProfileCache.confidence+' · '+sk(lastTimingProfileCache.confidenceLabel):'—')+'</b></div>'
+'<div class="panel-line"><span>Chaos timingu · σ</span><b class="blueTxt">'+(lastTimingProfileCache?lastTimingProfileCache.chaos+' · '+lastTimingProfileCache.deviation+'s':'—')+'</b></div>'
+'<div class="panel-line"><span>Profil · záznamy</span><b class="greenTxt">'+(lastTimingProfileCache?lastTimingProfileCache.recordCount+' / '+lastTimingProfileCache.target:'0 / 12')+'</b></div>'
+(pendingBallTimingSec!=null?'<div class="panel-line"><span>Čakám číslo</span><b class="yellowTxt">STOP '+pendingBallTimingSec.toFixed(2)+'s → zadaj 0–36</b></div>':'')
+(lastTimingProfileCache&&lastTimingProfileCache.historyNums?'<div class="panel-line"><span>Timing história</span><b style="font-size:11px">'+lastTimingProfileCache.historyNums+'</b></div>':'')
+(lastTimingProfileCache&&lastTimingProfileCache.sectorNote?'<div class="panel-line"><span>Sektor · tempo</span><b class="blueTxt">'+lastTimingProfileCache.sectorNote+'</b></div>':'')
+'<div class="section-label">Z času guličky · analytický odhad</div>'+'<div class="timing-hint">Nie istota · profil toku z času guličky</div>'
+'<div class="panel-line"><span>Odporúčané 2 TUCTY (Trend)</span><b class="greenTxt">'+p.dozens+'</b></div>'
+'<div class="panel-line"><span>Odporúčané 2 STĹPCE (Trend)</span><b class="greenTxt">'+p.columns+'</b></div>'
+'<div class="panel-line"><span>Očakávaná FARBA (Korekcia)</span><b class="redTxt">'+p.color+'</b></div>'
+'<div class="panel-line"><span>Veľkosť (MALÉ / VEĽKÉ)</span><b class="blueTxt">'+p.size+'</b></div>'
+'<div class="panel-line"><span>Párnosť (PÁRNE / NEPÁRNE)</span><b class="yellowTxt">'+p.parity+'</b></div>';
}

function renderTimingPanel(){
const timingEl=document.getElementById('timing');
if(!timingEl)return;
timingEl.innerHTML=buildTimingHTML();
const numIn=document.getElementById('timingResultNum');
const btnUndo=document.getElementById('btnTimingUndo');
const p=timingBallPick;
if(numIn){numIn.classList.toggle('pending',pendingBallTimingSec!=null);numIn.placeholder=pendingBallTimingSec!=null?('Číslo · '+pendingBallTimingSec.toFixed(1)+'s'):'Číslo 0–36';}
if(btnUndo)btnUndo.disabled=!pendingBallTimingSec&&!ballTimingRecords.length;
if(typeof applyTimingBallPickFromProfile==='function')applyTimingBallPickFromProfile();
}

var computeTimingCore=analyzeSpinCadence;
var computeTimingProfileEngine=computeTimingEngine;
var renderTiming=renderTimingPanel;
