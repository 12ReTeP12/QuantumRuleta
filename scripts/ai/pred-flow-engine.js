'use strict';
/* 10H-1 pred-flow-engine.js — Balík 10H */

/* QRP7-V2 · ANALYZÉR TOKU · SK */

/* ═══ AI PREDIKCIA · SAMOSTATNÝ FLOW ENGINE (nezávislý od Ruletového analytika) ═══ */
const MODEL={SPINS:0.70,TIMING:0.20,VISUAL:0.10};
/* LIVE FLOW + ANOMALY PREDICTION AI — 70/20/10 */

/* ═══ AI PREDIKCIA · behavior engine (logika only, 70/20/10 base) ═══ */
const PRED_AI_MIN=12;
const PRED_AI_PAIRS=[[0,1],[0,2],[1,2]];
let predAIPersist={dozKey:'',colKey:'',lastMode:'learn'};
function predAIResetState(){
predAIPersist={dozKey:'',colKey:'',lastMode:'learn'};
}
function predAIInvalidate(){predAIResetState();}
function predAILabel(kind,pair){
const n=['1','2','3'];
return n[pair[0]]+' + '+n[pair[1]]+(kind==='doz'?' · TUCET':' · STĹPEC');
}
function predAIWeightedWindow(maxLen){
const col=[0,0,0],doz=[0,0,0],color={r:0,b:0},parity={e:0,o:0},rng={lo:0,hi:0};
const slice=spins.slice(-maxLen);
const n=slice.length;
let totalW=0;
slice.forEach((num,idx)=>{
const age=n-1-idx;
const wt=Math.pow(1.14,-age);
if(num===0){totalW+=wt;return;}
totalW+=wt;
const c=getColumn(num),d=getDozen(num);
if(c>=0)col[c]+=wt;
if(d>=0)doz[d]+=wt;
if(reds.includes(num))color.r+=wt;else color.b+=wt;
if(num%2===0)parity.e+=wt;else parity.o+=wt;
if(num<=18)rng.lo+=wt;else rng.hi+=wt;
});
if(spins.length&&spins[spins.length-1]===0){
rng.hi*=1.35;rng.lo*=0.88;
if(doz[2]!=null)doz[2]*=1.28;
}
return{col,doz,color,parity,range:rng,total:totalW};
}
function predAIMergeBins(short,long,field){
const out=[0,0,0];
for(let i=0;i<3;i++){
const a=short.total>0?(field==='col'?short.col[i]/short.total:short.doz[i]/short.total):0;
const b=long.total>0?(field==='col'?long.col[i]/long.total:long.doz[i]/long.total):0;
out[i]=a*0.62+b*0.38;
}
return out;
}
function predAIDetectNumberRepeat(){
const tail=spins.slice(-3);
if(tail.length<2)return{active:false,len:0,num:null};
const last=tail[tail.length-1];
let len=1;
for(let i=tail.length-2;i>=0;i--){
if(tail[i]===last)len++;else break;
}
return len>=2?{active:true,len,num:last}:{active:false,len:0,num:null};
}
function predAIDetectAlternating(getter,minLen){
const raw=spins.slice(-12).filter(n=>n>0);
const seq=raw.map(getter).filter(v=>v>=0);
if(seq.length<minLen)return false;
let alt=0;
for(let i=1;i<seq.length;i++)if(seq[i]!==seq[i-1])alt++;
return alt>=seq.length-1;
}
function predAIDetectSeries(getter){
const raw=spins.slice(-8).filter(n=>n>0);
const seq=raw.map(getter).filter(v=>v>=0);
return lfpStreakRun(seq)>=3;
}
function predAINeglectedPressure(getter){
const absent=lfpSinceAbsent(getter,50);
return[0,1,2].map(i=>({i,spins:absent[i],pressure:clamp(absent[i]*7,0,100)}));
}
function predAINumProps(num){
if(num==null||num===0)return null;
return{
red:reds.includes(num),
even:num%2===0,
high:num>=19,
col:getColumn(num),
doz:getDozen(num)
};
}
function predAIFlipSecondaryFromRepeat(num){
const p=predAINumProps(num);
if(!p)return{color:'—',parity:'—',range:'—'};
return{
color:p.red?'ČIERNA':'ČERVENÁ',
parity:p.even?'NEPÁRNE':'PÁRNE',
range:p.high?'1–18':'19–36'
};
}
function predAIOppositePair(bins,kind,signals){
const scores=PRED_AI_PAIRS.map(p=>({p,s:bins[p[0]]+bins[p[1]],key:p[0]+'-'+p[1]}));
scores.sort((a,b)=>a.s-b.s);
const pick=scores[0];
let conf=clamp(Math.round(38+pick.s*40),10,55);
if(signals.numberRepeat.active)conf=clamp(conf-10,8,48);
if(signals.chaosPct>50)conf=clamp(conf-Math.round((signals.chaosPct-48)*0.3),8,50);
return{label:predAILabel(kind,pick.p),conf,key:pick.key};
}
function predAIScorePairs(bins,kind,signals){
const neglected=signals.neglected[kind]||[];
const scores=PRED_AI_PAIRS.map(p=>{
let s=bins[p[0]]+bins[p[1]];
neglected.forEach(z=>{if(p.includes(z.i)&&z.pressure>=28)s+=z.pressure*0.014;});
if(signals.alternating[kind])s+=0.09;
if(signals.overheat[kind])s*=0.7;
return{p,s,key:p[0]+'-'+p[1]};
});
scores.sort((a,b)=>b.s-a.s);
let pick=scores[0];
const prevKey=kind==='doz'?predAIPersist.dozKey:predAIPersist.colKey;
if(prevKey){
const prev=scores.find(x=>x.key===prevKey);
if(prev&&pick.s-prev.s<0.06)pick=prev;
}
if(kind==='doz')predAIPersist.dozKey=pick.key;
else predAIPersist.colKey=pick.key;
const spread=pick.s-(scores[1]?scores[1].s:0);
let conf=clamp(Math.round(Math.min(1,pick.s*2.2)*55+spread*110),12,96);
if(signals.overheat[kind])conf=clamp(conf-16,10,72);
if(signals.numberRepeat.active)conf=clamp(conf-12,10,75);
if(signals.chaosPct>=50)conf=clamp(conf-Math.round((signals.chaosPct-46)*0.32),10,88);
return{label:predAILabel(kind,pick.p),conf,key:pick.key};
}
function predCoreBehaviorEngine(){
const n=spins.length;
const conf=computeConfidenceEngine();
const chaosPct=conf.chaosPct;
const playMode=conf.playMode,playHead=conf.playHead,playSub=conf.playSub,playCls=conf.playCls;
if(conf.learn){
return{
learn:true,active:false,chaosPct,playMode,playHead,playSub,playCls,allowPlay:conf.allowPlay,
columns:'—',dozens:'—',color:'—',parity:'—',range:'—',confidence:conf.confidence,
colPair:{label:'—',conf:0},dozPair:{label:'—',conf:0},
noPredict:true,noReason:'REŽIM UČENIA',
alternatingRhythm:false,numberRepeat:{active:false},patterns:{}
};
}
const short=predAIWeightedWindow(12);
const long=predAIWeightedWindow(50);
let colBins=predAIMergeBins(short,long,'col');
let dozBins=predAIMergeBins(short,long,'doz');
if(spins.length>=8){
const rbaC=rbaWeightedBins('col');
const rbaD=rbaWeightedBins('doz');
const sumC=rbaC.reduce((a,b)=>a+b,0)||1;
const sumD=rbaD.reduce((a,b)=>a+b,0)||1;
colBins=colBins.map((v,i)=>v*0.72+(rbaC[i]/sumC)*0.28);
dozBins=dozBins.map((v,i)=>v*0.72+(rbaD[i]/sumD)*0.28);
}
const numberRepeat=predAIDetectNumberRepeat();
const alternating={
col:predAIDetectAlternating(getColumn,5),
doz:predAIDetectAlternating(getDozen,5),
color:predAIDetectAlternating(n=>reds.includes(n)?1:0,5)
};
const overheat={
col:predAIDetectSeries(getColumn)||numberRepeat.active,
doz:predAIDetectSeries(getDozen)||numberRepeat.active
};
const neglected={col:predAINeglectedPressure(getColumn),doz:predAINeglectedPressure(getDozen)};
const signals={chaosPct,numberRepeat,alternating,overheat,neglected};
let colPick,dozPick;
let color,parity,range,anomalyActive=false,anomalyMsg='';
if(numberRepeat.active&&numberRepeat.num>0){
anomalyActive=true;
anomalyMsg='ANOMÁLIA — číslo '+numberRepeat.num+' ×'+numberRepeat.len+' (anti-repeat)';
colPick=predAIOppositePair(colBins,'col',signals);
dozPick=predAIOppositePair(dozBins,'doz',signals);
const flip=predAIFlipSecondaryFromRepeat(numberRepeat.num);
color=flip.color;parity=flip.parity;range=flip.range;
}else if(overheat.col&&!alternating.col){
colPick=predAIOppositePair(colBins,'col',signals);
dozPick=overheat.doz&&!alternating.doz?predAIOppositePair(dozBins,'doz',signals):predAIScorePairs(dozBins,'doz',signals);
}else{
colPick=predAIScorePairs(colBins,'col',signals);
dozPick=predAIScorePairs(dozBins,'doz',signals);
const cr=short.color.r+long.color.r*0.35,cb=short.color.b+long.color.b*0.35;
const pe=short.parity.e+long.parity.e*0.35,po=short.parity.o+long.parity.o*0.35;
const rl=short.range.lo+long.range.lo*0.35,rh=short.range.hi+long.range.hi*0.35;
color=cr>=cb?'ČERVENÁ':'ČIERNA';
parity=pe>=po?'PÁRNE':'NEPÁRNE';
range=rh>=rl?'19–36':'1–18';
}
const confidence=conf.confidence;
const altRhythm=alternating.col||alternating.doz||alternating.color;
let altLabel='';
if(alternating.col)altLabel='ALTERNATING RHYTHM · stĺpce 1↔3';
else if(alternating.doz)altLabel='ALTERNATING RHYTHM · tucty';
else if(alternating.color)altLabel='ALTERNATING RHYTHM · farba';
predAIPersist.lastMode=playMode;
return{
learn:false,active:true,chaosPct,playMode,playHead,playSub,playCls,allowPlay:conf.allowPlay,
columns:colPick.label,dozens:dozPick.label,color,parity,range,
confidence,colPair:colPick,dozPair:dozPick,
noPredict:false,noReason:conf.status==='ČAKAJ'?'CHAOS / WAIT MODE':conf.status==='OPATRNE'?'OPATRNE':'',
alternatingRhythm:altRhythm,alternatingLabel:altLabel,
anomalyActive,anomalyMsg,antiCopy:anomalyActive,
numberRepeat,patterns:{alternating,overheat,neglected,numberRepeat}
};
}


let rngBehaviorCache=null,rngBehaviorKey='';
function rngInvalidate(){rngBehaviorCache=null;rngBehaviorKey='';}

const RNG_OBS_DECAY=0.22;
const RNG_OBS_WINS=[6,12,24,50];
const RNG_OBS_W=[0.40,0.30,0.20,0.10];

function rngObsCacheKey(){
return 'rngobs|'+spins.length+'|'+(spins[spins.length-1]??'');
}
function rngObsDecayW(age){return Math.exp(-age*RNG_OBS_DECAY);}
function rngObsSlice(win){return spins.slice(-win).filter(n=>n!==0);}
function rngObsScoresForSlice(slice){
const cols=[0,0,0],doz=[0,0,0];
let red=0,black=0,low=0,high=0,even=0,odd=0,tot=0;
const L=slice.length;
slice.forEach((n,i)=>{
const w=rngObsDecayW(L-1-i);
tot+=w;
const c=getColumn(n),d=getDozen(n);
if(c>=0)cols[c]+=w;
if(d>=0)doz[d]+=w;
if(reds.includes(n))red+=w;else black+=w;
if(n>=1&&n<=18)low+=w;else if(n>=19)high+=w;
if(n%2===0)even+=w;else odd+=w;
});
const k=tot>0?100/tot:0;
return{cols:cols.map(v=>v*k),dozens:doz.map(v=>v*k),red:red*k,black:black*k,low:low*k,high:high*k,even:even*k,odd:odd*k,tot};
}
function rngObsBlend(kind){
const isVec=kind==='cols'||kind==='dozens';
let out=isVec?[0,0,0]:0,t=0;
RNG_OBS_WINS.forEach((win,wi)=>{
const sc=rngObsScoresForSlice(rngObsSlice(win));
if(!sc.tot)return;
const w=RNG_OBS_W[wi];
if(isVec)sc[kind].forEach((v,i)=>{out[i]+=v*w;});
else out+=sc[kind]*w;
t+=w;
});
if(t){
if(isVec)out=out.map(v=>v/t);
else out=out/t;
}
if(spins.length>=4){
const micro=rngObsScoresForSlice(rngObsSlice(4));
if(micro.tot){
const live=0.82;
if(isVec)out=out.map((v,i)=>v*live+micro[kind][i]*0.18);
else out=out*live+micro[kind]*0.18;
}
}
if(isVec)return out.map(v=>v||33.3);
return out||50;
}
function rngObsTopTwo(arr){
const r=arr.map((p,i)=>({i,p})).sort((a,b)=>b.p-a.p);
return{first:r[0],second:r[1]||r[0]};
}
function rngObsSinceAbsent(getter,maxN){
const absent=[0,0,0];
for(let t=0;t<3;t++){
let s=0;
for(let i=spins.length-1;i>=0;i--){
const n=spins[i];
if(n===0){s++;if(s>maxN)break;continue;}
if(getter(n)===t)break;
s++;
}
absent[t]=s;
}
return absent;
}
function rngObsStreakRun(seq){
if(!seq.length)return 0;
let run=1,maxRun=1;
for(let i=1;i<seq.length;i++){
if(seq[i]===seq[i-1]){run++;maxRun=Math.max(maxRun,run);}else run=1;
}
return maxRun;
}
function rngObsStrictAlt(seq){
if(seq.length<5)return false;
let alt=0;
for(let i=1;i<seq.length;i++)if(seq[i]!==seq[i-1])alt++;
return alt>=seq.length-1;
}
function rngObsSuppression(cols,dozens){
const colAbs=rngObsSinceAbsent(getColumn,50);
const dozAbs=rngObsSinceAbsent(getDozen,50);
const items=[];
colAbs.forEach((s,i)=>{if(s>=8)items.push({type:'column',i:i+1,spins:s});});
dozAbs.forEach((s,i)=>{if(s>=8)items.push({type:'dozen',i:i+1,spins:s});});
const avg=cols.reduce((a,b)=>a+b,0)/3;
const deadCol=cols.map((p,i)=>({i,p,abs:colAbs[i]})).filter(x=>x.p<avg*0.5||x.abs>=8);
const deadDoz=dozens.map((p,i)=>({i,p,abs:dozAbs[i]})).filter(x=>x.p<avg*0.5||x.abs>=8);
const topItem=items.length?items.reduce((a,b)=>b.spins>a.spins?b:a):null;
let text='';
if(topItem){
const typ=topItem.type==='column'?'Stĺpec':'Tucet';
text=typ+' '+topItem.i+' absent '+topItem.spins+' spinov';
}
return{active:items.length>0||deadCol.length>0||deadDoz.length>0,items,deadCol,deadDoz,text,
rising:!!(topItem&&topItem.spins>=12),colAbs,dozAbs};
}
function rngObsAnomaly(cols,dozens,colTop,dozTop){
const raw=spins.slice(-8).filter(n=>n!==0);
const colSeq=raw.map(getColumn).filter(c=>c>=0);
const colors=raw.map(n=>reds.includes(n)?'R':'B');
const colStreak=rngObsStreakRun(colSeq);
const colorStreak=rngObsStreakRun(colors);
const colGap=colTop.first.p-colTop.second.p;
const dozGap=dozTop.first.p-dozTop.second.p;
const repeatStrong=colStreak>=4||colorStreak>=6||(colStreak>=3&&colGap>=18);
return{colStreak,colorStreak,repeatStrong,colGap,dozGap,
dominanceStrong:colGap>=22&&dozGap>=15};
}
function rngObsFlowState(anomaly){
const live=spins.slice(-8).filter(n=>n!==0);
const micro=live.slice(-4);
if(live.length<3)return{state:'NORMAL',lowConf:true};
const cols=live.map(getColumn).filter(c=>c>=0);
const mcols=micro.map(getColumn).filter(c=>c>=0);
const colors=micro.map(n=>reds.includes(n)?'R':'B');
const colStreak=rngObsStreakRun(mcols.length?mcols:cols);
if(rngObsStrictAlt(colors)||(mcols.length>=5&&rngObsStrictAlt(mcols))){
return{state:'ALTERNATING',lowConf:true};
}
if(anomaly.repeatStrong&&colStreak>=3)return{state:'REPEAT',lowConf:false};
let alt=0;
for(let i=1;i<mcols.length;i++)if(mcols[i]!==mcols[i-1])alt++;
const uniqC=new Set(mcols.length?mcols:cols).size;
if(uniqC>=3&&colStreak<2)return{state:'CHAOTIC',lowConf:true};
if(cols.length>=6){
const early=cols.slice(0,Math.max(2,cols.length-3));
const late=cols.slice(-3);
const eMode=early.length?early[0]:-1;
const lDom=late[late.length-1];
const lateHits=late.filter(c=>c===lDom).length;
const earlyHits=early.filter(c=>c===eMode).length;
if(eMode>=0&&lDom>=0&&eMode!==lDom&&lateHits>=2&&earlyHits>=2&&!late.includes(eMode)){
return{state:'REVERSAL',lowConf:false};
}
}
if(uniqC>=3&&alt>=3)return{state:'MIGRATING',lowConf:false};
return{state:'NORMAL',lowConf:false};
}
function rngObsStability(flow,anomaly,cols,dozens,colTop,dozTop){
const colGap=colTop.first.p-colTop.second.p;
const dozGap=dozTop.first.p-dozTop.second.p;
let score=52;
if(flow.state==='REPEAT'&&anomaly.repeatStrong)score=84;
else if(flow.state==='NORMAL'&&colGap>=20&&dozGap>=12)score=76;
else if(flow.state==='NORMAL'&&colGap>=14)score=64;
else if(flow.state==='MIGRATING')score=44;
else if(flow.state==='REVERSAL')score=38;
else if(flow.state==='ALTERNATING')score=22;
else if(flow.state==='CHAOTIC')score=14;
return clamp(Math.round(score),0,100);
}
function rngObsEntropyTrend(){
const entNow=parseFloat(entropy())||0;
if(spins.length<8)return{now:entNow,delta:0,rising:false};
let tOld=0;
const old=spins.slice(-16,-8);
for(let i=1;i<old.length;i++){
if(reds.includes(old[i])!==reds.includes(old[i-1]))tOld++;
}
const entOld=old.length>1?(tOld/old.length)*10:entNow;
const delta=entNow-entOld;
return{now:entNow,delta,rising:delta>=0.35};
}
function rngObsFlowShift(flow,anomaly,sup,colTop){
const raw=spins.slice(-10).filter(n=>n!==0);
const colSeq=raw.map(getColumn).filter(c=>c>=0);
const recent4=colSeq.slice(-4),prev4=colSeq.slice(-8,-4);
const colGap=colTop.first.p-colTop.second.p;
const signals=[];
if(rngObsStreakRun(prev4)>=3&&rngObsStreakRun(recent4)<=1)signals.push('momentum weakening');
if(colGap<14)signals.push('dominance weakening');
let alt=0;
for(let i=1;i<recent4.length;i++)if(recent4[i]!==recent4[i-1])alt++;
if(alt>=3)signals.push('alternation increase');
if(sup.rising)signals.push('suppression pressure shift');
if(flow.state==='MIGRATING')signals.push('migration shift');
return{active:signals.length>=2||(signals.length>=1&&flow.state!=='REPEAT'),signals};
}
function rngObsReadability(flow,stability,entropyTrend,repeat,sup,phase){
let score=stability;
const ent=entropyTrend.now;
if(ent>5.6)score-=clamp((ent-5.6)*12,0,28);
else if(ent<4.1)score+=8;
if(entropyTrend.rising)score-=10;
if(repeat>42&&flow.state==='REPEAT')score+=6;
if(flow.state==='CHAOTIC')score=Math.min(score,22);
if(flow.state==='ALTERNATING')score=Math.min(score,28);
if(sup.active)score-=6;
if(phase.phase==='LEARNING')score=Math.min(score,phase.maxRead);
return clamp(Math.round(score),0,phase.maxRead);
}
function rngObsPhase(){
const n=spins.length;
if(n<=5)return{phase:'LEARNING',label:'REŽIM UČENIA',maxRead:38};
if(n<=8)return{phase:'EARLY',label:'SKORÝ POZOR',maxRead:55};
if(n<=11)return{phase:'ACTIVE',label:'AKTÍVNY POZOR',maxRead:72};
return{phase:'FULL',label:'PLNÝ POZOR RNG',maxRead:88};
}
function rngObsPickMode(readability,flow,phase,lowRead){
if(lowRead||phase.phase==='LEARNING')return'WAIT';
if(flow.state==='CHAOTIC'||flow.state==='ALTERNATING'||readability<32)return'WAIT';
if(readability<48)return'CAUTION';
if(readability>=68&&flow.state==='REPEAT')return'ANALYZA';
if(readability>=56)return'OBSERVE';
return'CAUTION';
}
function rngObsPickColor(red,black){
return red>=black?'ČERVENÁ':'ČIERNA';
}
function rngObsPickPair(top,phase){
const minP=phase.phase==='FULL'?30:26;
if(!top||top.first.p<minP)return'—';
const a=top.first.i+1,b=top.second.i+1;
if(top.first.p>=40&&top.second.p>=20&&a!==b)return a+' + '+b;
if(top.first.p>=32)return String(a);
return a+' + '+b;
}
function rngObsRowParity(flow,even,odd){
if(flow.state==='ALTERNATING')return'SWITCHING · nestabilný';
if(Math.abs(even-odd)<8)return'PÁRNOSŤ · vyrovnaná';
const dom=even>=odd?'PÁRNE':'NEPÁRNE';
return dom+' · tlak okna';
}
function rngObsRowRange(flow,low,high){
if(flow.state==='CHAOTIC')return'RANGE · nestabilný';
if(Math.abs(low-high)<10)return'1–18 / 19–36 · rovnomerne';
return low>=high?'TLAK 1–18 · okno':'TLAK 19–36 · okno';
}
function rngObsLowReadReason(flow,stability,readability,phase,colGap,dozGap,shift,anomaly){
if(phase.phase==='LEARNING')return'REŽIM UČENIA';
if(flow.state==='CHAOTIC')return'CHAOS RNG';
if(flow.state==='ALTERNATING')return'STRIEBRENIE';
if(readability<30)return'NEČITATEĽNÉ RNG';
if(colGap<14&&dozGap<14)return'BEZ DOMINANCIE';
if(shift.active&&stability<42&&!anomaly.repeatStrong)return'FLOW SA OTÁČA';
if(stability<26&&!anomaly.repeatStrong)return'ROZPAD FLOW';
return'POZOR · čakaj dáta';
}
function rngActivationLabel(n){
if(n<=5)return'REŽIM UČENIA · 0–5 spinov';
if(n<=8)return'SKORÝ POZOR · 6–8 spinov';
if(n<=11)return'AKTÍVNY POZOR · 9–11 spinov';
return'PLNÝ POZOR RNG · 12+ spinov';
}
function rngObsFlowHuman(state){
const m={
NORMAL:{short:'Bežný tok',hint:'Ruleta ide pokojne — žiadna silná vlna ani chaos.'},
REPEAT:{short:'Opakovanie',hint:'RNG drží rovnaký smer alebo číslo v krátkom okne.'},
ALTERNATING:{short:'Striebenie',hint:'Často sa prepína — ťažko držať jeden smer.'},
REVERSAL:{short:'Obrat smeru',hint:'Dominantný smer sa práve mení na opačný.'},
CHAOTIC:{short:'Chaos',hint:'Výsledky sú rozptýlené — správanie RNG je nečitateľné.'},
MIGRATING:{short:'Presun tlaku',hint:'Tlak sa presúva medzi tucty/stĺpcami na kolese.'}
};
return m[state]||{short:state||'—',hint:''};
}
function rngObsModeHuman(mode){
const m={
WAIT:{short:'Čakaj',hint:'Teraz nie je jasné správanie — radšej len sleduj ďalšie spiny.'},
CAUTION:{short:'Opatrne',hint:'Signál je slabší — pozoruj, ale nič neuponáhľaj.'},
OBSERVE:{short:'Sleduj',hint:'RNG je čitateľné — môžeš sledovať farbu/tucty/stĺpce v paneli.'},
ANALYZA:{short:'Silný vzor',hint:'V okne je výrazné opakovanie — observer vidí jasný vzor.'}
};
return m[mode]||{short:mode||'—',hint:''};
}
function rngObserverBuildComment(O){
if(!O)return'Zadaj spiny — observer sleduje surovú históriu.';
if(O.wait)return'RNG správanie nečitateľné — '+O.lowReadReason+'. Sleduj ďalšie spiny (bez tipu).';
const p=[];
const f=O.flow.state;
if(f==='REPEAT'||O.anomaly.repeatStrong)p.push('Repeat pressure v krátkom okne — RNG drží vzor.');
if(O.sup.active&&O.sup.text)p.push('Potlačenie: '+O.sup.text+' — RNG ignoruje sektor.');
if(f==='ALTERNATING')p.push('Switching je nestabilný — časté prepínanie.');
if(f==='CHAOTIC')p.push('Chaos sa zvyšuje — distribúcia je nečitateľná.');
if(f==='MIGRATING')p.push('Migrácia chaos — tlak sa presúva medzi sekormi.');
if(O.shift.active)p.push('Flow sa rozpadá — dominancia slabne.');
if(f==='REVERSAL')p.push('RNG mení rytmus — reversal v live okne.');
if(O.entTrend.rising)p.push('Entropia rastie — stabilita flow slabne.');
if(O.repeatNoise)p.push('Repeat noise — opakovanie bez čistej dominancie.');
if(!p.length)p.push('RNG správanie čitateľné — pozor z okien 6/12/24/50 (surová história).');
return p.slice(0,3).join(' ');
}
function computeRngBehaviorObserverEngine(){
const cols=rngObsBlend('cols');
const dozens=rngObsBlend('dozens');
const colTop=rngObsTopTwo(cols);
const dozTop=rngObsTopTwo(dozens);
const red=rngObsBlend('red');
const black=rngObsBlend('black');
const low=rngObsBlend('low');
const high=rngObsBlend('high');
const even=rngObsBlend('even');
const odd=rngObsBlend('odd');
const anomaly=rngObsAnomaly(cols,dozens,colTop,dozTop);
const flow=rngObsFlowState(anomaly);
const sup=rngObsSuppression(cols,dozens);
const phase=rngObsPhase();
const stability=rngObsStability(flow,anomaly,cols,dozens,colTop,dozTop);
const entTrend=rngObsEntropyTrend();
const rep=repeatRate();
const shift=rngObsFlowShift(flow,anomaly,sup,colTop);
const colGap=colTop.first.p-colTop.second.p;
const dozGap=dozTop.first.p-dozTop.second.p;
const readability=rngObsReadability(flow,stability,entTrend,rep,sup,phase);
const deadFlow=flow.state==='CHAOTIC'||flow.state==='ALTERNATING'||(stability<26&&!anomaly.repeatStrong);
let lowRead=deadFlow||readability<32||(colGap<14&&dozGap<14&&readability<52)||phase.phase==='LEARNING';
if(shift.active&&stability<42&&!anomaly.repeatStrong)lowRead=true;
const repeatNoise=rep>=28&&rep<48&&!anomaly.repeatStrong;
const mode=rngObsPickMode(readability,flow,phase,lowRead);
const flowState=flow.state;
const layers=[
{key:'repeat',label:'Repeat',on:flowState==='REPEAT'||anomaly.repeatStrong},
{key:'sup',label:'Suppression',on:sup.active},
{key:'alt',label:'Alternating',on:flowState==='ALTERNATING'},
{key:'dom',label:'Dominance',on:colGap>=14&&dozGap>=12},
{key:'mom',label:'Momentum',on:rngObsStreakRun(spins.slice(-6).filter(n=>n!==0).map(getColumn).filter(c=>c>=0))>=2||flowState==='REPEAT'},
{key:'rev',label:'Reversal',on:flowState==='REVERSAL'||shift.active},
{key:'chaos',label:'Chaos',on:flowState==='CHAOTIC'},
{key:'mig',label:'Migrating',on:flowState==='MIGRATING'}
];
return{
phase,flow,anomaly,sup,shift,entTrend,stability,readability,repeatNoise,layers,
wait:lowRead,lowReadReason:rngObsLowReadReason(flow,stability,readability,phase,colGap,dozGap,shift,anomaly),
color:rngObsPickColor(red,black),
parity:lowRead?'—':rngObsRowParity(flow,even,odd),
range:lowRead?'—':rngObsRowRange(flow,low,high),
dozens:rngObsPickPair(dozTop,phase),
columns:rngObsPickPair(colTop,phase),
signal:readability,confidence:readability,flowState,mode,
odNuly:computeOdNuly(),
memNote:'Pozorovateľ · okná 6/12/24/50 · váhy 40/30/20/10 + decay'
};
}

function computeRngBehaviorAnalysis(){
const key=rngObsCacheKey();
if(rngBehaviorCache&&rngBehaviorKey===key)return rngBehaviorCache;
if(spins.length<2){rngBehaviorCache=null;rngBehaviorKey=key;return null;}
const O=computeRngBehaviorObserverEngine();
const n=spins.length;
const result={
ready:true,wait:O.wait,n,
activation:rngActivationLabel(n),
phaseLabel:O.phase.label,
color:O.color,parity:O.parity,range:O.range,dozens:O.dozens,columns:O.columns,
signal:O.signal,confidence:O.confidence,flowState:O.flowState,mode:O.mode,
flowHuman:rngObsFlowHuman(O.flowState),modeHuman:rngObsModeHuman(O.mode),
odNuly:O.odNuly,
comment:rngObserverBuildComment(O),layers:O.layers,
memNote:O.memNote
};
rngBehaviorCache=result;rngBehaviorKey=key;return result;
}

function buildRngBehaviorHTML(R){
if(!R){
if(spins.length<2)return'<div class="alert">Zadaj 2+ spiny — analýza RNG správania.</div>';
return'<div class="alert">Načítavam…</div>';
}
const dash='—';
const v=(x)=>R.wait?dash:(x||dash);
const sigCls=R.confidence>=70?'':R.confidence>=50?'warn':'bad';
const modeCls=R.mode==='WAIT'?'bad':R.mode==='CAUTION'?'warn':'';
const flowH=R.flowHuman||rngObsFlowHuman(R.flowState);
const modeH=R.modeHuman||rngObsModeHuman(R.mode);
const hintAttr=(t)=>t?' title="'+String(t).replace(/"/g,'&quot;')+'"':'';
const vPred=(x)=>x||dash;
let h='<div class="rng-pred-grid">';
h+='<div class="rng-pred-row"><span>🔥 FARBA</span><b>'+vPred(R.color)+'</b></div>';
h+='<div class="rng-pred-row"><span>⚡ PÁRNE / NEPÁRNE</span><b class="'+(R.wait?'wait':'')+'">'+v(R.parity)+'</b></div>';
h+='<div class="rng-pred-row"><span>🎯 RANGE</span><b class="'+(R.wait?'wait':'')+'">'+v(R.range)+'</b></div>';
h+='<div class="rng-pred-row"><span>📊 TUCTY</span><b>'+vPred(R.dozens)+'</b></div>';
h+='<div class="rng-pred-row"><span>📈 STĹPCE</span><b>'+vPred(R.columns)+'</b></div>';
h+='</div>';
h+='<div class="rng-meta-strip" role="group" aria-label="Signál, flow a režim">';
h+='<div class="rng-meta-item"><span class="lbl">Sila signálu</span><span class="val '+sigCls+'">'+R.signal+'%</span></div>';
h+='<div class="rng-meta-item"><span class="lbl">Tok RNG</span><span class="val"'+hintAttr(flowH.hint)+'>'+flowH.short+'</span></div>';
h+='<div class="rng-meta-item"><span class="lbl">Režim</span><span class="val '+modeCls+'"'+hintAttr(modeH.hint)+'>'+modeH.short+'</span></div>';
h+='</div>';
h+='<div class="rng-comment'+(R.wait?' wait':'')+'">'+R.comment+'</div>';
h+='<div class="rng-layers">';
R.layers.forEach(l=>{
h+='<span class="rng-layer-pill'+(l.on?' on':'')+'">'+l.label+'</span>';
});
h+='</div>';
const odNote=(!R.wait&&R.odNuly!=null&&R.odNuly!=='—')?' · od nuly '+R.odNuly:'';
h+='<div class="rng-activation">'+R.activation+odNote+' · '+R.memNote+'</div>';
return h;
}

/* ═══ RANDOM SESSION PICK · pure random mini picker (100% izolovaný modul) ═══
 * Žiadna história, žiadne čítanie spinov, refresh len pri novom spine.
 */
const RSP_DOZEN_PAIRS=[[1,2],[1,3],[2,3]];
const RSP_COL_PAIRS=[[1,2],[1,3],[2,3]];
let rspEpoch=-1;
let rspNow=null;
let rspRenderedEpoch=-2;
function rspRand01(){
if(typeof crypto!=='undefined'&&crypto.getRandomValues){
const u=new Uint32Array(1);crypto.getRandomValues(u);return u[0]/4294967295;
}
return Math.random();
}
function rspPickPair(pairs){
const p=pairs[Math.floor(rspRand01()*pairs.length)];
return p[0]<p[1]?[p[0],p[1]]:[p[1],p[0]];
}
function rspRollIndependent(){
return{
dozens:rspPickPair(RSP_DOZEN_PAIRS),
columns:rspPickPair(RSP_COL_PAIRS),
color:rspRand01()<0.5?'ČERVENÁ':'ČIERNA',
size:rspRand01()<0.5?'MALÉ':'VEĽKÉ',
parity:rspRand01()<0.5?'PÁRNE':'NEPÁRNE'
};
}
function rspFormatPair(d){return d[0]+' + '+d[1];}
function rspLine(label,val){
const short=String(label).replace(/^[^\s]+\s+/,'');
return'<div class="rsp-line"><span class="rsp-k">'+short+'</span><span class="rsp-v" title="'+val+'">'+val+'</span></div>';
}
function rspResetSessionPick(){rspEpoch=-1;rspNow=null;rspRenderedEpoch=-2;}
function rspInstantPick(){
const epoch=spins.length;
if(rspEpoch!==epoch){rspEpoch=epoch;rspNow=rspRollIndependent();}
else if(!rspNow)rspNow=rspRollIndependent();
return rspNow;
}
function buildRandomSessionPickHTML(s){
return rspLine('📊 RANDOM TUCTY',rspFormatPair(s.dozens))
+rspLine('📈 RANDOM STĹPCE',rspFormatPair(s.columns))
+rspLine('🔥 RANDOM FARBA',s.color)
+rspLine('⚪ RANDOM VEĽKOSŤ',s.size)
+rspLine('⚡ RANDOM PÁRNOSŤ',s.parity);
}
function rspSyncQuietFromPage(){
const zone=document.getElementById('randomPickZone');
if(!zone)return;
const wheel=document.getElementById('wheelRadarData');
const cautious=!!(wheel&&(
wheel.classList.contains('qw-chaos-session')||
wheel.classList.contains('qw-state-danger')||
wheel.classList.contains('qw-atmos-warning')||
wheel.classList.contains('qw-breathe-nervous')
));
zone.classList.toggle('rsp-under-ai',cautious);
}
function renderRandomSessionPick(){
const el=document.getElementById('randomSessionPick');
if(!el)return;
const prevEpoch=rspEpoch;
const pick=rspInstantPick();
if(rspRenderedEpoch===rspEpoch&&el.childElementCount>0){
rspSyncQuietFromPage();
return;
}
const refreshed=prevEpoch!==-1&&rspEpoch!==prevEpoch;
rspRenderedEpoch=rspEpoch;
el.innerHTML=buildRandomSessionPickHTML(pick);
if(refreshed){
el.classList.remove('rsp-refresh');
void el.offsetWidth;
el.classList.add('rsp-refresh');
}
rspSyncQuietFromPage();
}

function renderRngBehavior(){
const el=document.getElementById('rngBehaviorPanel');
if(!el)return;
el.innerHTML=buildRngBehaviorHTML(computeRngBehaviorAnalysis());
}

const SPINS_FLOW_WEIGHT={FOLLOW:0.40,PATTERNS:0.20,MEMORY:0.10};
const PRED_PLAY_PRIORITY={COL_DOZ:0.80,FILTER:0.20};
let predFlowEngineCache=null,predFlowEngineKey='';
let predFlowPrevSnapshot=null;
let predLastPick=null;
let predStableState={mainCol:null,mainDoz:null,mainMode:null,col:null,doz:null,tier:'MEDIUM',weakStreak:0,confirmStreak:0,candidateCol:null,candidateStreak:0,holdSpins:0,prevRezim:null};
const PRED_FLOW_WEIGHTS={SHORT:0.78,LONG:0.14,MICRO:0.08};
const PRED_SHORT_WIN=5;
const PRED_MICRO_WIN=3;
const PRED_LONG_WIN=20;
const PRED_ADAPT_WIN=15;
const PRED_CONFIRM_SPINS=2;
const PRED_MIN_HOLD_SPINS=3;

function predFlowCacheKey(){return spins.length+'|'+(spins[spins.length-1]??'');}

function predCountTransitionsToTarget(slice,target,field){
let score=0;
if(field==='col'){
for(let i=1;i<slice.length;i++){
const p=getColumn(slice[i-1]),c=getColumn(slice[i]);
if(p>=0&&c===target&&p!==target)score+=2;
}
for(let i=2;i<slice.length;i++){
const a=getColumn(slice[i-2]),b=getColumn(slice[i-1]),c=getColumn(slice[i]);
if(a>=0&&b>=0&&c>=0&&b!==a&&c===target)score+=3;
}
}else{
for(let i=1;i<slice.length;i++){
const p=getDozen(slice[i-1]),c=getDozen(slice[i]);
if(p>=0&&c===target&&p!==target)score+=2;
}
for(let i=2;i<slice.length;i++){
const a=getDozen(slice[i-2]),b=getDozen(slice[i-1]),c=getDozen(slice[i]);
if(a>=0&&b>=0&&c>=0&&b!==a&&c===target)score+=3;
}
}
return score;
}

function predFollowUpEdgeScores(slice,field){
const edges={};
const idx=n=>field==='col'?getColumn(n):getDozen(n);
for(let i=1;i<slice.length;i++){
const p=idx(slice[i-1]),c=idx(slice[i]);
if(p<0||c<0||p===0&&c===0)continue;
const k=p+'>'+c;
edges[k]=(edges[k]||0)+1;
}
const targetScores=[0,0,0];
const edgeHits=[];
Object.keys(edges).forEach(k=>{
const cnt=edges[k];
if(cnt<1)return;
const parts=k.split('>');
const tr=+parts[0],tg=+parts[1];
if(tr>=0&&tr<=2&&tg>=0&&tg<=2){
targetScores[tg]+=cnt*2+(cnt>=2?4:0);
edgeHits.push({from:tr,to:tg,cnt});
}
});
const dominantEdges=edgeHits.filter(e=>e.cnt>=2).sort((a,b)=>b.cnt-a.cnt);
return{targetScores,edges,dominantEdges,repeatEdges:dominantEdges.length};
}

function predAnalyzeFlowWindow(slice,field){
const targets=field==='col'?[0,1,2]:[0,1,2];
const edge=predFollowUpEdgeScores(slice,field);
const ranked=targets.map(t=>{
let score=predCountTransitionsToTarget(slice,t,field);
score+=edge.targetScores[t]||0;
return{t,score};
}).sort((a,b)=>b.score-a.score);
const best=ranked[0],second=ranked[1]||{t:best.t===0?1:0,score:0};
let repeatTo=0;
for(let i=1;i<slice.length;i++){
const p=field==='col'?getColumn(slice[i-1]):getDozen(slice[i-1]);
const c=field==='col'?getColumn(slice[i]):getDozen(slice[i]);
if(p>=0&&c===best.t&&p!==c)repeatTo++;
}
if(edge.dominantEdges.length>=2&&edge.dominantEdges.every(e=>e.to===best.t))repeatTo=Math.max(repeatTo,edge.dominantEdges.length);
return{bestCol:best.t,bestDoz:best.t,score:best.score,second:second.t,repeatTo,secondScore:second.score,ranked,edgeHits:edge.dominantEdges};
}

function predFormatLivePick(shortA,longA,liveIdx,field){
const n=liveIdx+1;
const shortName=field==='col'?n+'. stĺpec':n+'. tucet';
if(shortA.bestCol===longA.bestCol||(field==='col'?shortA.bestCol:shortA.bestDoz)===(field==='col'?longA.bestCol:longA.bestDoz)){
if(shortA.secondScore>=2&&(field==='col'?shortA.second:shortA.second)!==liveIdx){
return n+' + '+(shortA.second+1);
}
return String(n);
}
if(shortA.score>=3&&shortA.score>=longA.score*0.45){
return String(n);
}
return n+' <span class="ra-dim">(krátko · '+shortName+')</span>';
}

function predFlowSelfCorrection(liveCol,liveDoz){
if(!predLastPick||spins.length<=predLastPick.spinLen)return{penalty:0,msg:'',aggressive:1,modeHint:null,flowChanged:false};
const last=spins[spins.length-1];
if(last===0)return{penalty:0,msg:'',aggressive:1,modeHint:null,flowChanged:false};
const ci=getColumn(last),di=getDozen(last);
const colHit=ci===predLastPick.col,dozHit=di===predLastPick.doz;
const hit=colHit||dozHit;
if(hit){
return{penalty:0,msg:'',aggressive:1,modeHint:null,flowChanged:false};
}
const fs=adaptiveWeights.failStreak;
const penalty=clamp(0.1+fs*0.06,0,0.4);
let msg='',modeHint=null;
const flowChanged=ci!==predLastPick.col;
if(fs>=2){
msg='Flow sa zmenil — prediction znížila agresivitu, prepína do pozorovania a čaká na nový follow-up.';
modeHint='WARNING';
}else if(fs===1){
msg='Posledný tip nesedel s follow-up — AI prepočítava dominantný smer z posledných '+PRED_SHORT_WIN+' spinov.';
modeHint='OBSERVATION';
}else if(flowChanged){
msg='Realita ukázala iný stĺpec — prediction prispôsobuje flow, nie starý model.';
}
return{penalty,msg,aggressive:clamp(1-penalty*2.2,0.5,1),modeHint,flowChanged};
}

function predComputeFlowMomentum(shortCol,microCol,longCol,flowFlip,repeatTo,corr){
if(corr&&corr.penalty>=0.12)return{code:'ROZPAD',label:'Rozpadá sa',cls:'redTxt'};
if(corr&&corr.penalty>=0.06)return{code:'SLABNE',label:'Slabne',cls:'redTxt'};
let prevS=0;
if(predFlowPrevSnapshot&&predFlowPrevSnapshot.spinLen===spins.length-1)prevS=predFlowPrevSnapshot.shortScore||0;
if(shortCol.score>prevS+1)return{code:'RASTIE',label:'Rastie',cls:'greenTxt'};
if(shortCol.score<prevS-1)return{code:'SLABNE',label:'Slabne',cls:'redTxt'};
if(flowFlip&&microCol.score>=shortCol.score)return{code:'RASTIE',label:'Rastie',cls:'greenTxt'};
if(repeatTo>=2&&shortCol.score>=3)return{code:'DRZI',label:'Drží',cls:'greenTxt'};
if(repeatTo<1&&shortCol.score<2&&microCol.score<2)return{code:'BEZ',label:'Bez follow-up flow',cls:'yellowTxt'};
if(shortCol.score<=prevS&&longCol.score>shortCol.score*1.2)return{code:'STAGNUJE',label:'Stagnuje',cls:'yellowTxt'};
return{code:'DRZI',label:'Drží',cls:'greenTxt'};
}

function predComputeFlowTrust(th,fu,momentum){
if(th.tier==='VERY_STRONG'&&(momentum.code==='RASTIE'||momentum.code==='DRZI')&&fu.repeatToTarget>=2)return{label:'SILNÝ',cls:'greenTxt'};
if(th.tier==='WEAK'||momentum.code==='ROZPAD')return{label:'ROZPADÁ SA',cls:'redTxt'};
if(momentum.code==='SLABNE')return{label:'SLABNE',cls:'redTxt'};
if(fu.flowFlip||th.tier==='MEDIUM'||momentum.code==='STAGNUJE')return{label:'NESTABILNÝ',cls:'yellowTxt'};
if(th.tier==='VERY_STRONG')return{label:'SILNÝ',cls:'greenTxt'};
return{label:'STREDNÝ',cls:'yellowTxt'};
}

function predAssessSignalPriority(fu,shortCol,adaptCol,longCol,colorSig){
const strong=[],weak=[];
if(fu.repeatToTarget>=2)strong.push('opakované follow-up návraty');
if(adaptCol.edgeHits&&adaptCol.edgeHits.length>=2)strong.push('viacnásobný rebound pattern');
if(shortCol.score>=4)strong.push('dominantný stĺpec v krátkom okne');
if(shortCol.bestCol===longCol.bestCol&&shortCol.score>=3)strong.push('stabilný dlhodobý návrat');
if(fu.shortDoz===fu.bestDoz&&fu.shortScore>=3)strong.push('tucet drží follow-up');
if(colorSig.strong)strong.push('farba s follow-up (vedľajší)');
if(fu.priorityWeak>=2)weak.push('krátka séria bez opakovania');
if(fu.colorWeak)weak.push('farba bez follow-up — skôr šum');
if(fu.flowFlip&&fu.shortScore<longCol.score)weak.push('krátkodobý rozpor s dlhším oknom');
if(fu.repeatToTarget<1)weak.push('žiadny opakovaný návrat');
return{strong,weak,noise:weak.length>=2&&strong.length<2};
}

function predBuildHumanReasons(liveCol,liveDoz,shortCol,adaptCol,shortDoz,flowFlip,colorSig,repeatTo,fc){
const colN=liveCol+1,dozN=liveDoz+1;
let stlpce=(colN)+'. stĺpec absorbuje návraty flow.';
if(repeatTo>=3)stlpce=(colN)+'. stĺpec drží stabilný opakovaný follow-up (×'+repeatTo+').';
else if(flowFlip)stlpce='Nový flow: '+(shortCol.bestCol+1)+'. stĺpec tlačí TERAZ — starší '+(adaptCol.bestCol!==liveCol?(adaptCol.bestCol+1):'?')+' ustupuje.';
else if(repeatTo>=2)stlpce=(colN)+'. stĺpec opakovane prijíma návraty po iných stĺpcoch.';
let tucty=(dozN)+'. tucet drží stabilný follow-up.';
if(shortDoz.repeatTo>=2)tucty=(dozN)+'. tucet absorbuje návraty v posledných '+PRED_SHORT_WIN+' spinoch.';
else if(flowFlip)tucty='Tucet sa prispôsobuje krátkodobému flow — '+(shortDoz.bestCol+1)+'. tucet je aktívnejší.';
let farba=colorSig.strong?(colorSig.color==='červená'?'Červená zatiaľ nepôsobí vyčerpane — drží krátky follow-up.':'Čierna drží krátky follow-up bez vyčerpania.'):'Farba je skôr šum — nie jadro rozhodnutia.';
if(fc&&fc.color&&fc.color.state==='CONFIRMED')farba='Farba potvrdená follow-up flow.';
return{stlpce,tucty,farba,range:'Range ber len ako doplnok k stĺpcom a tuctom.',parity:'Párne/nepárne — vedľajší filter, nie hlavný flow.'};
}

function predColorSignalStrength(shortSlice){
if(shortSlice.length<3)return{strong:false,rate:50,color:'—'};
let cont=0,n=0,lastC=null;
for(let i=1;i<shortSlice.length;i++){
const p=shortSlice[i-1],c=shortSlice[i];
if(p===0||c===0)continue;
n++;
if(reds.includes(p)===reds.includes(c))cont++;
lastC=reds.includes(c)?'červená':'čierna';
}
const rate=n?Math.round(cont/n*100):50;
const strong=n>=3&&rate>=70;
return{strong,rate,color:lastC||'červená'};
}

function computeFollowUpFlowEngine(){
const key=predFlowCacheKey();
if(predFlowEngineCache&&predFlowEngineKey===key)return predFlowEngineCache;
const empty={followScore:50,bestCol:0,bestDoz:0,colPick:'—',dozPick:'—',repeatToTarget:0,colorContRate:50,dominantColor:'—',sizePick:'—',parityPick:'—',reasons:{},patterns:[],flowMomentum:'BEZ',flowMomentumLabel:'Bez follow-up flow',flowMomentumCls:'yellowTxt',liveWeightShort:78,liveWeightLong:14,selfCorrection:'',flowFlip:false,shortCol:0,longCol:0,priorityStrong:0,priorityWeak:0};
if(spins.length<3){predFlowEngineCache=empty;predFlowEngineKey=key;return empty;}
const microSlice=spins.slice(-PRED_MICRO_WIN);
const shortSlice=spins.slice(-PRED_SHORT_WIN);
const longSlice=spins.slice(-Math.min(PRED_LONG_WIN,spins.length));
const shortCol=predAnalyzeFlowWindow(shortSlice,'col');
const adaptCol=predAnalyzeFlowWindow(spins.slice(-Math.min(PRED_ADAPT_WIN,spins.length)),'col');
const longCol=predAnalyzeFlowWindow(longSlice.length>=8?longSlice:spins.slice(-12),'col');
const shortDoz=predAnalyzeFlowWindow(shortSlice,'doz');
const adaptDoz=predAnalyzeFlowWindow(spins.slice(-Math.min(PRED_ADAPT_WIN,spins.length)),'doz');
const longDoz=predAnalyzeFlowWindow(longSlice.length>=8?longSlice:spins.slice(-12),'doz');
const microCol=predAnalyzeFlowWindow(microSlice.length>=2?microSlice:shortSlice,'col');
const microDoz=predAnalyzeFlowWindow(microSlice.length>=2?microSlice:shortSlice,'doz');
let liveCol=microCol.score>=2?microCol.bestCol:shortCol.bestCol;
let liveDoz=microDoz.score>=2?microDoz.bestCol:shortDoz.bestCol;
let flowFlip=shortCol.bestCol!==longCol.bestCol||microCol.bestCol!==longCol.bestCol;
const shortW=PRED_FLOW_WEIGHTS.SHORT,longW=PRED_FLOW_WEIGHTS.LONG,microW=PRED_FLOW_WEIGHTS.MICRO;
if(microCol.score>=shortCol.score)liveCol=microCol.bestCol;
else if(shortCol.score>=longCol.score*0.32)liveCol=shortCol.bestCol;
if(microDoz.score>=shortDoz.score)liveDoz=microDoz.bestCol;
else if(shortDoz.score>=longDoz.score*0.32)liveDoz=shortDoz.bestCol;
if(adaptCol.score>=longCol.score*0.38||adaptCol.repeatTo>=2){
liveCol=adaptCol.bestCol;
liveDoz=adaptDoz.bestCol;
flowFlip=adaptCol.bestCol!==longCol.bestCol;
}else if(flowFlip){
if(shortCol.score>=2||microCol.score>=2){
liveCol=microCol.score>=shortCol.score?microCol.bestCol:shortCol.bestCol;
liveDoz=shortDoz.score>=longDoz.score?shortDoz.bestCol:longDoz.bestCol;
}else if(longCol.score>shortCol.score*1.8&&microCol.score<2){
liveCol=longCol.bestCol;
liveDoz=longDoz.bestCol;
}
}
if(microCol.score>=3)liveCol=microCol.bestCol;
if(shortCol.repeatTo>=2||adaptCol.repeatTo>=2)liveCol=shortCol.bestCol>=adaptCol.bestCol?shortCol.bestCol:adaptCol.bestCol;
if(shortDoz.repeatTo>=2||adaptDoz.repeatTo>=2)liveDoz=shortDoz.bestCol>=adaptDoz.bestCol?shortDoz.bestCol:adaptDoz.bestCol;
if(adaptCol.edgeHits&&adaptCol.edgeHits.length>=2){
const adaptTarget=adaptCol.bestCol;
if(adaptCol.edgeHits.filter(e=>e.to===adaptTarget).length>=2){
liveCol=adaptTarget;
flowFlip=adaptTarget!==longCol.bestCol;
}
}
const realitySnap=predMeasureSessionReality(adaptCol,shortCol,longCol);
if(realitySnap.strong)liveCol=realitySnap.col;
else if(adaptCol.bestCol===shortCol.bestCol&&adaptCol.repeatTo>=2)liveCol=adaptCol.bestCol;
let repeatToTarget=Math.max(shortCol.repeatTo,adaptCol.repeatTo);
const colPick=predFormatLivePick(shortCol,longCol,liveCol,'col');
const dozPick=predFormatLivePick(shortDoz,longDoz,liveDoz,'doz');
const liveScore=clamp(Math.round(shortCol.score*shortW*14+longCol.score*longW*8+microCol.score*microW*10+repeatToTarget*5),0,100);
const colorSig=predColorSignalStrength(shortSlice);
const colorWeak=!colorSig.strong;
const dominantColor=colorSig.strong?colorSig.color:(shortSlice.length?((reds.includes(shortSlice[shortSlice.length-1])?'červená':'čierna')):'červená');
let priorityStrong=0,priorityWeak=0;
if(shortCol.repeatTo>=2)priorityStrong+=3;
if(shortCol.score>=4)priorityStrong+=2;
if(longCol.score>=5&&shortCol.bestCol===longCol.bestCol)priorityStrong+=2;
if(colorWeak)priorityWeak+=3;
if(shortSlice.length<4)priorityWeak+=1;
const corr=predFlowSelfCorrection(liveCol,liveDoz);
if(corr.flowChanged&&corr.penalty>=0.06){
liveCol=shortCol.score>=microCol.score?shortCol.bestCol:microCol.bestCol;
liveDoz=shortDoz.bestCol;
flowFlip=true;
}
const momentum=predComputeFlowMomentum(shortCol,microCol,longCol,flowFlip,repeatToTarget,corr);
const flowMomentum=momentum.code;
if(momentum.code==='BEZ')priorityWeak+=2;
const sigPri=predAssessSignalPriority({repeatToTarget,shortCol:shortCol.bestCol,shortDoz:shortDoz.bestCol,bestCol:liveCol,bestDoz:liveDoz,shortScore:shortCol.score,priorityWeak,priorityStrong,flowFlip},shortCol,adaptCol,longCol,colorSig);
if(sigPri.noise)priorityWeak+=2;
const humanWhy=predBuildHumanReasons(liveCol,liveDoz,shortCol,adaptCol,shortDoz,flowFlip,colorSig,repeatToTarget,null);
let balanceNote='';
if(flowFlip){
balanceNote='Krátkodobo: '+(shortCol.bestCol+1)+'. stĺpec zosilňuje · Dlhodobo: '+(longCol.bestCol+1)+'. stĺpec ešte drží — živá váha ide na posledných '+PRED_SHORT_WIN+' spinov.';
}else{
balanceNote='Krátko aj dlho súhlasia: '+(liveCol+1)+'. stĺpec dominuje follow-up.';
}
let hiReb=0,hiTri=0,loReb=0,loTri=0;
const sizeSlice=spins.slice(-12);
for(let i=2;i<sizeSlice.length;i++){
const a=sizeSlice[i-2],b=sizeSlice[i-1],c=sizeSlice[i];
if(a===0||b===0||c===0)continue;
if(a>=19&&b>=19){hiTri++;if(c>=1&&c<=18)hiReb++;}
if(a>=1&&a<=18&&b<=18){loTri++;if(c>=19)loReb++;}
}
let sizePick='1-18',sizeReason='Range — slabší signál, ber ako doplnok.';
if(hiTri>=2&&hiReb>=2){sizePick='1-18';sizeReason='SILNÝ signál: po HIGH rebound do LOW.';}
else if(loTri>=2&&loReb>=2){sizePick='19-36';sizeReason='SILNÝ signál: po LOW rebound do HIGH.';}
const recent=shortSlice.filter(n=>n!==0);
let e=0,o=0;
recent.forEach(n=>{if(n%2===0)e++;else o++;});
const parityPick=e>=o?'párne':'nepárne';
const result={
followScore:clamp(Math.round(liveScore*(1-corr.penalty)),0,100),
bestCol:liveCol,bestDoz:liveDoz,
colPick,dozPick,repeatToTarget,colorContRate:colorSig.rate,dominantColor,
sizePick,parityPick,colorWeak,
shortCol:shortCol.bestCol,longCol:longCol.bestCol,shortDoz:shortDoz.bestCol,longDoz:longDoz.bestCol,
adaptBestCol:adaptCol.bestCol,adaptRepeatTo:adaptCol.repeatTo,adaptScore:adaptCol.score,adaptEdgeHits:adaptCol.edgeHits,
realityCol:realitySnap.col,realityStrong:realitySnap.strong,realityReason:realitySnap.reason,
secondCol:shortCol.second,secondDoz:shortDoz.second,secondScore:shortCol.secondScore,
shortScore:shortCol.score,longScore:longCol.score,
flowMomentum,flowMomentumLabel:momentum.label,flowMomentumCls:momentum.cls,flowFlip,liveWeightShort:Math.round(shortW*100),liveWeightLong:Math.round(longW*100),
balanceNote,selfCorrection:corr.msg,corrPenalty:corr.penalty,corrAggressive:corr.aggressive,corrModeHint:corr.modeHint,
priorityStrong,priorityWeak,sigPri,patterns:[],
reasons:{
farba:humanWhy.farba,
tucty:humanWhy.tucty,
stlpce:humanWhy.stlpce,
range:humanWhy.range,
parity:humanWhy.parity,
momentum:'Momentum: '+momentum.label+'.'
},
colReturnCount:shortCol.score,longColReturn:longCol.score
};
predFlowEngineCache=result;predFlowEngineKey=key;
predLastPick={spinLen:spins.length,col:liveCol,doz:liveDoz,colPick,dozPick};
predFlowPrevSnapshot={spinLen:spins.length,repeatToTarget:shortCol.repeatTo,bestCol:liveCol,bestDoz:liveDoz,followScore:result.followScore,shortScore:shortCol.score,longScore:longCol.score};
return result;
}

function computeFlowPatternsScore(){
if(spins.length<4)return 50;
const slice=spins.slice(-20);
const colRet=raReturnHits(slice,'col');
const dozRet=raReturnHits(slice,'doz');
const osc=raOscillationScore(slice,'col');
let s=50;
if(colRet.trials>=4)s+=colRet.rate*0.35;
if(dozRet.trials>=4)s+=dozRet.rate*0.2;
s+=Math.max(0,45-osc*0.4);
return clamp(Math.round(s),0,100);
}

function computeLongMemoryBias(){
if(spins.length<12)return{score:50,bias:0};
const s10=raSliceStats(Math.min(10,spins.length));
const s25=raSliceStats(Math.min(25,spins.length));
if(!s10||!s25)return{score:50,bias:0};
let bias=0;
if(s10.topCol===s25.topCol)bias+=6;
if(s10.topDoz===s25.topDoz)bias+=4;
if(Math.abs(s10.redPct-s25.redPct)>=30)bias-=8;
return{score:clamp(50+bias,35,65),bias};
}

function computeSpinsFlowCore(){
const fu=computeFollowUpFlowEngine();
const fp=computeFlowPatternsScore();
const lm=computeLongMemoryBias();
const w=SPINS_FLOW_WEIGHT;
const total=w.FOLLOW+w.PATTERNS+w.MEMORY;
let core=clamp(Math.round(
fu.followScore*(w.FOLLOW/total)+
fp*(w.PATTERNS/total)+
lm.score*(w.MEMORY/total)*(fu.realityStrong?0.2:fu.flowFlip?0.35:0.65)
),0,100);
if(fu.flowFlip&&fu.shortScore>=3)core=clamp(core+(fu.flowMomentum==='RASTIE'?10:5),0,100);
if(fu.corrPenalty)core=clamp(Math.round(core*(1-fu.corrPenalty)),0,100);
if(fu.flowMomentum==='SLABNE')core=clamp(core-6,0,100);
return core;
}

function computePredictionTrustHierarchy(fu,patScore,timing){
const t=timing||{label:'NEUTRÁL',factor:1,core:50};
const timingOk=t.label==='POTVRDENIE'||(t.core>=56&&t.factor>=1);
const colDozAgree=!fu.flowFlip&&(fu.shortCol===fu.shortDoz||(fu.shortCol===fu.longCol&&fu.shortDoz===fu.longDoz));
const followRepeat=fu.repeatToTarget>=3||(fu.repeatToTarget>=2&&fu.shortScore>=4);
const returnsStable=!fu.flowFlip&&fu.shortCol===fu.longCol&&patScore>=55;
const returnsOk=patScore>=52&&fu.shortScore>=3;
let score=0;
if(followRepeat)score+=3;
if(returnsStable)score+=3;
else if(returnsOk)score+=1;
if(colDozAgree)score+=2;
else if(!fu.flowFlip)score+=1;
if(timingOk)score+=2;
if(fu.flowMomentum==='RASTIE'||fu.flowMomentum==='DRŽÍ')score+=1;
if(fu.priorityStrong>=4)score+=1;
if(fu.corrPenalty>=0.1)score-=4;
if(fu.flowMomentum==='SLABNE')score-=2;
if(fu.priorityWeak>=3)score-=2;
if(fu.followScore<40||fu.shortScore<2)score-=3;
if(fu.repeatToTarget<2&&fu.shortScore<3)score-=2;
let tier='MEDIUM',label='STREDNÁ PREDIKCIA',flow='NESTABILNÝ',trust='STREDNÁ',cls='pred-tier-mid',aggression=0.65,showStrong=true;
let sub='Flow existuje, no ešte nie je uzavretý — pozoruj a čakaj potvrdenie.';
if(score>=9){
tier='VERY_STRONG';label='VEĽMI SILNÁ PREDIKCIA';flow='SILNÝ';trust='VEĽMI SILNÁ';cls='pred-tier-very';aggression=0.92;showStrong=true;
sub='Silný pattern: follow-up návraty · tucty aj stĺpce · nie len krátky šum.';
}else if(score<=2||fu.corrPenalty>=0.12||fu.followScore<38||fu.flowMomentum==='ROZPAD'){
tier='WEAK';label='SLABÁ PREDIKCIA';flow='ROZPADÁ SA';trust='SLABÁ';cls='pred-tier-weak';aggression=0.35;showStrong=false;
sub='Flow sa rozpadá — prediction znižuje agresivitu a viac pozoruje.';
}else if(fu.flowMomentum==='SLABNE'){
tier='MEDIUM';flow='SLABNE';aggression=0.48;showStrong=false;
sub='Flow slabne — krátkodobý signál nestačí na silný tip.';
}else{
aggression=0.58;
sub='Stredný flow — čitateľný, no bez plného potvrdenia.';
}
return{tier,label,flow,trust,cls,aggression,showStrong,sub,score,timingOk,colDozAgree,followRepeat,returnsStable};
}

function predIsQuietPeriod(fu){
if(spins.length<5)return false;
const noise=fu.sigPri&&fu.sigPri.noise;
return(fu.shortScore<2&&fu.repeatToTarget<1&&fu.priorityWeak>=2)||(noise&&fu.followScore<45)||(fu.flowMomentum==='BEZ'&&fu.priorityWeak>=3);
}
function predDetectFlowBreak(fu,st,adaptCol,shortCol){
if(st.mainCol==null||st.holdSpins<2)return{broken:false,reason:''};
const t=st.mainCol;
const recent=spins.slice(-4).filter(n=>n!==0);
let hits=0;
recent.forEach(n=>{if(getColumn(n)===t)hits++;});
if(adaptCol.bestCol!==t&&adaptCol.repeatTo>=2&&adaptCol.score>=Math.max(3,shortCol.score*0.85)){
return{broken:true,reason:'Stĺpec '+(t+1)+' prestal absorbovať návraty — follow-up ide na '+(adaptCol.bestCol+1)+'.'};
}
if(hits===0&&recent.length>=3)return{broken:true,reason:'Rebound flow zmizol — posledné spiny netrafili hlavný smer.'};
if(fu.corrPenalty>=0.14||fu.flowMomentum==='ROZPAD')return{broken:true,reason:'Návratový rytmus sa prerušil — follow-up sa rozpadol.'};
return{broken:false,reason:''};
}
function predMeasureSessionReality(adaptCol,shortCol,longCol){
const slice=spins.slice(-Math.min(20,spins.length));
const col=adaptCol.bestCol;
let returnHits=0,transitions=0;
for(let i=1;i<slice.length;i++){
const p=getColumn(slice[i-1]),c=getColumn(slice[i]);
if(p<0||c<0)continue;
transitions++;
if(c===col&&p!==col)returnHits++;
}
const agreeShort=col===shortCol.bestCol;
const agreeLong=col===longCol.bestCol;
const edgesTo=adaptCol.edgeHits?adaptCol.edgeHits.filter(e=>e.to===col).length:0;
let strong=false;
if(adaptCol.repeatTo>=3&&agreeShort)strong=true;
if(adaptCol.repeatTo>=2&&edgesTo>=2&&agreeShort)strong=true;
if(slice.length>=10&&returnHits>=4&&agreeShort)strong=true;
if(agreeShort&&agreeLong&&adaptCol.repeatTo>=2)strong=true;
if(shortCol.score>=4&&adaptCol.score>=shortCol.score*0.9)strong=true;
const reason=strong
?('Posledných '+slice.length+' spinov: opakované návraty do '+(col+1)+'. stĺpca (×'+adaptCol.repeatTo+' follow-up).')
:('Náznak '+(col+1)+'. stĺpca — ešte čaká potvrdenie.');
return{col,strong,agreeShort,agreeLong,returnHits,repeatTo:adaptCol.repeatTo,reason};
}
function predRealityWantsCol(liveCol,fu,adaptCol){
const r=predMeasureSessionReality(adaptCol,{bestCol:fu.shortCol,score:fu.shortScore,repeatTo:fu.repeatToTarget},{bestCol:fu.longCol,score:fu.longScore,repeatTo:0});
return r.strong&&(r.col===liveCol||adaptCol.bestCol===liveCol);
}
function predBumpCandidate(st,liveCol,liveDoz,fu,adaptCol){
if(liveCol===st.candidateCol)st.candidateStreak++;
else{st.candidateCol=liveCol;st.candidateStreak=1;}
if(st.candidateStreak>=PRED_CONFIRM_SPINS&&(fu.repeatToTarget>=2||fu.shortScore>=3)||predRealityWantsCol(liveCol,fu,adaptCol)){
st.mainCol=liveCol;
st.mainDoz=liveDoz;
st.mainMode=fu.repeatToTarget>=2?'RETURN':fu.flowFlip?'BREAKOUT':'OBSERVE';
st.holdSpins=1;
st.candidateCol=null;
st.candidateStreak=0;
st.confirmStreak=Math.max(st.confirmStreak,1);
return true;
}
return false;
}
function predBuildMainFlowOpinion(displayCol,displayDoz,fu,confirmed,quiet,breakInfo,pending){
if(quiet)return{headline:'AI momentálne nevidí stabilný flow.',sub:'Session neukazuje stabilný follow-up — nehraj náhodný tip.',pick:null,doz:null,mode:'QUIET',cls:'quiet'};
if(displayCol==null)return{headline:'Čakám na čitateľný flow.',sub:'',pick:null,doz:null,mode:'WAIT',cls:''};
const cn=displayCol+1;
let pick=String(cn);
if(fu.secondCol!=null&&fu.secondCol!==displayCol&&fu.secondScore>=2)pick=cn+' + '+(fu.secondCol+1);
const doz=displayDoz!=null?String(displayDoz+1):'—';
if(breakInfo&&breakInfo.broken&&!pending){
return{headline:'Flow sa práve zlomil.',sub:breakInfo.reason,pick,doz,mode:'BREAK',cls:'break'};
}
if(pending||!confirmed){
return{headline:'Hlavný flow: návraty do '+cn+'. stĺpca — zatiaľ nepotvrdené.',sub:'Nový flow ešte nie je potvrdený — sleduj ďalší follow-up.',pick,doz,mode:'PENDING',cls:'pending'};
}
const sub=(fu.reasons&&fu.reasons.stlpce)||'Opakovaný follow-up v posledných '+PRED_SHORT_WIN+' spinoch.';
return{headline:'Hlavný flow: návraty do '+cn+'. stĺpca.',sub,pick,doz,mode:'RETURN',cls:''};
}
function predFlowTransitionLabel(prevRez,newRez){
if(!prevRez||prevRez===newRez)return null;
const sk={OBSERVATION:'pozorovania',WARNING:'výstrahy','FLOW ACTIVE':'aktívneho follow-up',REVERSAL:'návratového',BREAKOUT:'prerazenia','DEAD SPINS':'mŕtvej session'};
return'Flow sa presúva z '+(sk[prevRez]||prevRez)+' do '+(sk[newRez]||newRez)+' režimu.';
}
function predResolveMainFlowEngine(liveCol,liveDoz,fu,rawTier,adaptCol,shortCol){
const st=predStableState;
if(rawTier==='VERY_STRONG'){st.tier='VERY_STRONG';st.weakStreak=0;}
else if(rawTier==='MEDIUM'){if(st.tier==='WEAK')st.tier='MEDIUM';else if(st.tier!=='VERY_STRONG')st.tier='MEDIUM';st.weakStreak=0;}
else if(rawTier==='WEAK'){st.weakStreak++;if(st.weakStreak>=2)st.tier='WEAK';}else st.weakStreak=0;
const quiet=predIsQuietPeriod(fu);
const longShim={bestCol:fu.longCol,score:fu.longScore,repeatTo:0};
const reality=predMeasureSessionReality(adaptCol,shortCol,longShim);
const realityCol=reality.col;
const realityDoz=liveDoz;
let br=predDetectFlowBreak(fu,st,adaptCol,shortCol);
let pending=false;
if(!quiet&&reality.strong&&st.mainCol!=null&&st.mainCol!==realityCol){
br={broken:true,reason:'Session ukazuje '+(realityCol+1)+'. stĺpec — starý flow ustupuje realite spinov.'};
st.holdSpins=0;
}
if(!quiet){
if(reality.strong){
st.mainCol=realityCol;
st.mainDoz=realityDoz;
st.holdSpins=Math.max(st.holdSpins,1);
st.confirmStreak=Math.max(st.confirmStreak,PRED_CONFIRM_SPINS);
st.candidateCol=null;
st.candidateStreak=0;
pending=false;
}else if(br.broken){
st.holdSpins=0;
if(!predBumpCandidate(st,realityCol,liveDoz,fu,adaptCol))pending=true;
}else if(st.mainCol==null){
if(!predBumpCandidate(st,realityCol,liveDoz,fu,adaptCol))pending=true;
}else if(realityCol===st.mainCol){
st.holdSpins++;
st.candidateCol=null;
st.candidateStreak=0;
if(fu.repeatToTarget>=2)st.confirmStreak++;
}else{
const canHold=st.holdSpins<PRED_MIN_HOLD_SPINS&&!reality.strong;
if(canHold){
}else if(!predBumpCandidate(st,realityCol,liveDoz,fu,adaptCol))pending=st.mainCol!==realityCol;
}
if(fu.repeatToTarget<1&&!reality.strong)st.confirmStreak=Math.max(0,st.confirmStreak-1);
}
const displayCol=quiet?null:(reality.strong?realityCol:(st.mainCol!=null?st.mainCol:realityCol));
const displayDoz=quiet?null:(st.mainDoz!=null?st.mainDoz:realityDoz);
const confirmed=!quiet&&!pending&&displayCol!=null&&(reality.strong||(st.confirmStreak>=PRED_CONFIRM_SPINS&&fu.repeatToTarget>=2))&&!br.broken;
if(fu.reasons&&reality.reason)fu.reasons.stlpce=reality.reason;
const mainOpinion=predBuildMainFlowOpinion(displayCol,displayDoz,fu,confirmed,quiet,br,pending);
return{displayCol,displayDoz,quiet,quietMsg:mainOpinion.headline,mainOpinion,breakDetected:br.broken,breakMsg:br.reason,confirmed,pending,reality,realityOverride:reality.strong,stableTier:st.tier,confirmStreak:st.confirmStreak,weakStreak:st.weakStreak,disciplineHold:st.mainCol!=null&&realityCol!==st.mainCol&&st.holdSpins<PRED_MIN_HOLD_SPINS&&!reality.strong,fastShift:reality.strong||st.mainCol!==realityCol};
}

function computeFlowConfirmation(fu,th,timing,stab){
const t=timing||{label:'NEUTRÁL',factor:1,core:50};
const timingOk=t.label==='POTVRDENIE'||(t.core>=56&&t.factor>=1);
const st=stab||{};
const colConfirmed=!!st.confirmed||((th.tier==='VERY_STRONG')||(fu.repeatToTarget>=3&&!fu.flowFlip)||(fu.repeatToTarget>=2&&fu.shortCol===fu.longCol&&fu.shortScore>=4));
const colPending=!colConfirmed&&(fu.repeatToTarget>=1||fu.shortScore>=2||fu.flowFlip);
const dozConfirmed=colConfirmed&&(fu.shortDoz===fu.shortCol||fu.shortDoz===fu.longDoz);
const dozPending=colPending;
const colorConfirmed=fu.colorContRate>=68&&!fu.colorWeak&&timingOk;
const colorPending=!colorConfirmed&&!fu.colorWeak&&fu.colorContRate>=50;
function pack(state,label){
return{state,label};
}
return{
col:colConfirmed?pack('CONFIRMED',fu.reasons.stlpce||'Stabilný návratový flow'):colPending?pack('PENDING',fu.reasons.stlpce||'Čaká na potvrdenie follow-up.'):pack('WAIT',fu.reasons.stlpce||''),
doz:dozConfirmed?pack('CONFIRMED',fu.reasons.tucty||'Stabilný follow-up v tuctoch'):dozPending?pack('PENDING',fu.reasons.tucty||''):pack('WAIT',fu.reasons.tucty||''),
color:colorConfirmed?pack('CONFIRMED',fu.reasons.farba||''):colorPending?pack('PENDING',fu.reasons.farba||''):pack('WAIT',fu.reasons.farba||''),
timingOk
};
}

function predFormatPickWithConfirm(val,conf){
if(!val||val==='—')return'—';
const clean=String(val).replace(/<[^>]+>/g,'');
if(!conf||conf.state==='WAIT')return clean;
if(conf.state==='CONFIRMED')return clean;
return clean;
}

function predExplainOpinionChange(fu,liveCol,liveDoz){
if(!predFlowPrevSnapshot||predFlowPrevSnapshot.spinLen>=spins.length)return null;
const prevC=predFlowPrevSnapshot.bestCol;
if(prevC===liveCol)return null;
const pick=String(fu.colPick||'').replace(/<[^>]+>/g,'').trim()||(liveCol+1);
if(prevC>=0&&prevC!==liveCol){
return'Z <b>'+(prevC+1)+'. stĺpca</b> na <b>'+pick+'</b> — posledné spiny ukazujú návraty sem.';
}
return'Nový dominantný smer: <b>'+pick+'</b> podľa follow-up.';
}
function predPlainText(s){return String(s||'').replace(/<[^>]+>/g,'').trim();}
function predBuildLivePanelMeta(fu,E,th,ft,rezim,dec){
const mo=E.mainOpinion||{};
const quiet=!!E.quiet;
const heroPick=quiet?'—':(mo.pick?'📈 '+mo.pick+(mo.doz&&mo.doz!=='—'?' · 📊 '+mo.doz:''):'pozoruj');
const flowChanging=!!(E.flowChanging||E.flowTransition);
let shiftBody='';
if(E.flowTransition)shiftBody=E.flowTransition;
else if(E.stability&&E.stability.breakDetected&&E.stability.breakMsg)shiftBody=E.stability.breakMsg;
else if(E.opinionChange)shiftBody=predPlainText(E.opinionChange);
else if(fu.flowFlip)shiftBody='Posledné spiny menia hlavný flow — čaká sa potvrdenie.';
const tierTag=quiet?'Tiché obdobie':th.tier==='VERY_STRONG'?'Silná predikcia':th.tier==='WEAK'?'Slabá predikcia':'Stredná predikcia';
const rezSk=skPredRezim(rezim);
return{heroPick,flowChanging,shiftBody,tierTag,mainHeadline:mo.headline||'',mainSub:mo.sub||'',mainCls:mo.cls||'',supplement:!quiet&&mo.doz?'Doplnok · tucet '+mo.doz+' · filter podľa toku':'' ,status:[['🧠 '+ft.label,ft.cls],['🌀 '+(fu.flowMomentumLabel||'—'),fu.flowMomentumCls||'yellowTxt'],['⚠️ '+rezSk,rezim==='FLOW ACTIVE'?'greenTxt':rezim==='WARNING'||rezim==='DEAD SPINS'?'redTxt':'yellowTxt']],action:dec.label,actionCls:dec.cls};
}

function computePredictionFlowStatus(fu,patScore,timing){
const h=computePredictionTrustHierarchy(fu,patScore,timing);
return{flow:h.flow,trust:h.trust,cls:h.tier==='VERY_STRONG'?'ra-fs-strong':h.tier==='WEAK'?'ra-fs-weak':'ra-fs-mid',hierarchy:h};
}

function computePredictionRezim(fu,flowStatus,trustHierarchy){
if(spins.length<2)return'OBSERVATION';
const h=trustHierarchy||flowStatus.hierarchy||{};
const pat=raPatternReliability();
if(pat.samples>=6&&pat.rate<60)return'DEAD SPINS';
if(fu.corrModeHint==='WARNING'||h.tier==='WEAK'||fu.corrPenalty>=0.15||fu.flowMomentum==='ROZPAD')return'WARNING';
if(fu.selfCorrection||fu.corrModeHint==='OBSERVATION')return'OBSERVATION';
if(h.tier==='VERY_STRONG'&&fu.repeatToTarget>=2&&(fu.flowMomentum==='RASTIE'||fu.flowMomentum==='DRZI'))return'FLOW ACTIVE';
if(h.tier==='MEDIUM'&&fu.flowFlip&&fu.shortScore>=2)return'BREAKOUT';
if(h.tier!=='WEAK'&&fu.repeatToTarget>=3&&fu.shortScore>=3)return'REVERSAL';
if(fu.flowMomentum==='BEZ'||fu.sigPri&&fu.sigPri.noise)return'OBSERVATION';
return'OBSERVATION';
}

function computeModelBlend(spinCore,timingCore,visualCore){
const sc=clamp(spinCore||0),tc=clamp(timingCore||0),vc=clamp(visualCore||0);
const spinPart=sc*MODEL.SPINS,timingPart=tc*MODEL.TIMING,visualPart=vc*MODEL.VISUAL;
const weighted=clamp(Math.round(spinPart+timingPart+visualPart));
return{
spinCore:Math.round(sc),timingCore:Math.round(tc),visualCore:Math.round(vc),
spinPart:+spinPart.toFixed(1),timingPart:+timingPart.toFixed(1),visualPart:+visualPart.toFixed(1),
weighted,modelLabel:'AI predikcia · 70% SPINY · 20% TIMING · 10% VIZUÁL'
};
}

function formatDominantFlow(mig){
if(!mig)mig=getWheelMigrationDirection();
if(mig.dir==='CW')return'TOK CW';
if(mig.dir==='CCW')return'TOK CCW';
return'ZMIEŠANÝ TOK';
}
function formatDominantTarget(){
const di=spinMemoryEngine.dominantSectors.dozen;
if(di>=0)return['1. TUCET','2. TUCET','3. TUCET'][di]||'—';
const ci=spinMemoryEngine.dominantSectors.column;
if(ci>=0)return['STĹPEC 1','STĹPEC 2','STĹPEC 3'][ci]||'—';
return'—';
}
function formatRiskChaosLabel(inv){
if(!inv)return'—';
const chaos=Math.round(inv.diagnostics?.chaos||50);
return skRisk(inv.risk)+' CHAOS · '+chaos+'%';
}
function getPredictionVisualSupportSector(){
const core=computeVisualCore();
const cluster=getClusters()[0];
let factor=1;
if(cluster&&cluster.pressure>=55)factor+=0.04;
if(scoreVisualAlign()>68)factor+=0.03;
if(scoreVisualPressure()>60)factor+=0.02;
return{factor:clamp(factor,1,1.1),core};
}
function computeCoreAnalysis(){return computeAIPredictionEngine();}
