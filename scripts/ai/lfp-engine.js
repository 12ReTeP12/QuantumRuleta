/* LFP engine — extracted from index-NOVY-V4.html */
'use strict';

const LFP_WIN={W6:0.55,W12:0.28,W24:0.12,W50:0.05};
const LFP_MICRO=0.38;
const LFP_CAT={COL:0.40,DOZ:0.35,CLR:0.15,PAR:0.05,RNG:0.05};
const LFP_DECAY=0.24;
let lfpCache=null,lfpCacheKey='';

function lfpInvalidate(){lfpCache=null;lfpCacheKey='';rngInvalidate();lastAIPredictionCache=null;lastAIPredictionKey='';}

function lfpDecayW(age){return Math.exp(-age*LFP_DECAY);}

function lfpSliceNums(win){
return spins.slice(-win).filter(n=>n!==0);
}

function lfpActivationPhase(){
const n=spins.length;
if(n<=5)return{phase:'LEARNING',label:'REŽIM UČENIA',maxConf:38};
if(n<=8)return{phase:'EARLY',label:'SKORÝ LIVE FLOW',maxConf:55};
if(n<=11)return{phase:'ACTIVE',label:'AKTÍVNA PREDIKCIA',maxConf:72};
return{phase:'FULL',label:'PLNÁ LIVE ANALÝZA',maxConf:88};
}

function lfpScoresForSlice(slice){
const cols=[0,0,0],doz=[0,0,0];
let red=0,black=0,low=0,high=0,even=0,odd=0,tot=0;
const L=slice.length;
slice.forEach((n,i)=>{
const w=lfpDecayW(L-1-i);
tot+=w;
const c=columnIndexForNum(n),d=dozenIndexForNum(n);
if(c>=0)cols[c]+=w;
if(d>=0)doz[d]+=w;
if(reds.includes(n))red+=w;else black+=w;
if(n>=1&&n<=18)low+=w;else if(n>=19)high+=w;
if(n%2===0)even+=w;else odd+=w;
});
const k=tot>0?100/tot:0;
return{
cols:cols.map(v=>v*k),dozens:doz.map(v=>v*k),
red:red*k,black:black*k,low:low*k,high:high*k,even:even*k,odd:odd*k,tot
};
}

function lfpBlendCategory(kind){
const isVec=kind==='cols'||kind==='dozens';
let out=isVec?[0,0,0]:0,t=0;
[[lfpSliceNums(6),LFP_WIN.W6],[lfpSliceNums(12),LFP_WIN.W12],[lfpSliceNums(24),LFP_WIN.W24],[lfpSliceNums(50),LFP_WIN.W50]].forEach(([sl,w])=>{
const sc=lfpScoresForSlice(sl);
if(!sc.tot)return;
if(isVec)sc[kind].forEach((v,i)=>{out[i]+=v*w;});
else out+=sc[kind]*w;
t+=w;
});
if(t){
if(isVec)out=out.map(v=>v/t);
else out=out/t;
}
if(spins.length>=4){
const micro=lfpScoresForSlice(lfpSliceNums(4));
if(micro.tot){
const live=1-LFP_MICRO;
if(isVec)out=out.map((v,i)=>v*live+micro[kind][i]*LFP_MICRO);
else out=out*live+micro[kind]*LFP_MICRO;
}
}
if(isVec)return out.map(v=>v||33.3);
return out||50;
}

function lfpTopTwo(arr){
const r=arr.map((p,i)=>({i,p})).sort((a,b)=>b.p-a.p);
return{first:r[0],second:r[1]||r[0]};
}

function lfpPickPair(top,minP){
if(!top||top.first.p<minP)return '—';
const a=top.first.i+1,b=top.second.i+1;
if(top.first.p>=40&&top.second.p>=20&&a!==b)return a+' + '+b;
if(top.first.p>=32)return String(a);
return a+' + '+b;
}

function lfpSinceAbsent(getter,maxN){
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

function lfpSuppressionPressure(cols,dozens){
const colAbs=lfpSinceAbsent(columnIndexForNum,50);
const dozAbs=lfpSinceAbsent(dozenIndexForNum,50);
const parAbs=lfpSinceAbsent(n=>n%2===0?0:1,50);
const rngAbs=lfpSinceAbsent(n=>n>=1&&n<=18?0:1,50);
const items=[];
colAbs.forEach((s,i)=>{if(s>=8)items.push({type:'column',i:i+1,spins:s,rising:s>=12});});
dozAbs.forEach((s,i)=>{if(s>=8)items.push({type:'dozen',i:i+1,spins:s,rising:s>=10});});
if(parAbs[0]>=10)items.push({type:'parity',i:'párne',spins:parAbs[0],rising:parAbs[0]>=12});
if(parAbs[1]>=10)items.push({type:'parity',i:'nepárne',spins:parAbs[1],rising:parAbs[1]>=12});
if(rngAbs[0]>=10)items.push({type:'range',i:'1-18',spins:rngAbs[0],rising:false});
if(rngAbs[1]>=10)items.push({type:'range',i:'19-36',spins:rngAbs[1],rising:false});
const avgCol=cols.reduce((a,b)=>a+b,0)/3;
const deadCol=cols.map((p,i)=>({i,p,abs:colAbs[i]})).filter(x=>x.p<avgCol*0.5||x.abs>=8);
const deadDoz=dozens.map((p,i)=>({i,p,abs:dozAbs[i]})).filter(x=>x.p<avgCol*0.5||x.abs>=8);
const active=items.length>0||deadCol.length>0;
const topItem=items.length?items.reduce((a,b)=>b.spins>a.spins?b:a):null;
const rising=!!(topItem&&topItem.rising)||(deadCol[0]&&deadCol[0].abs>=10);
let text='';
if(topItem){
const typ=topItem.type==='column'?'Stĺpec':topItem.type==='dozen'?'Tucet':topItem.type;
text=typ+' '+topItem.i+' absent '+topItem.spins+' spinov';
if(rising)text+=' · tlak potlačenia rastie';
}else if(deadCol.length){
text='Stĺpec '+deadCol[0].i+' absent '+deadCol[0].abs+' · tlak rastie';
}
return{active,items,deadCol,deadDoz,text,rising,pressure:Math.min(100,items.length*18+deadCol.length*12+(rising?14:0))};
}

function lfpFlowMemory(){
const raw=spins.filter(n=>n!==0).slice(-48);
if(raw.length<10)return{ready:false,arc:'—',label:'Flow memory',detail:'Čakám na viac live spinov.',phases:[]};
const seg=6,phases=[];
for(let i=0;i+seg<=raw.length;i+=seg){
const sl=raw.slice(i,i+seg);
const cnt=[0,0,0];
sl.forEach(n=>{const c=columnIndexForNum(n);if(c>=0)cnt[c]++;});
const r=cnt.map((c,i)=>({i,c})).sort((a,b)=>b.c-a.c);
const domPct=Math.round(r[0].c/seg*100);
const gap=Math.round((r[0].c-r[1].c)/seg*100);
const pair=(r[0].i+1)+'+'+(r[1].i+1);
phases.push({dom:r[0].i,pair,domPct,gap,strong:domPct>=55&&gap>=22});
}
let arc='FLAT',label='Rovnomerný live tok',detail='Bez výraznej dominance v pamäti.';
if(phases.length>=3){
const a=phases[phases.length-3],b=phases[phases.length-2],c=phases[phases.length-1];
if(a.strong&&(!b.strong||b.dom!==a.dom)&&c.strong&&c.dom===a.dom){
arc='DOM→BREAK→RETURN';label='Návrat dominance '+a.pair;
detail='Pamäť: '+a.pair+' dominance → break → návrat '+c.pair+' (live flow, nie história).';
}else if(a.strong&&b.strong&&a.dom===b.dom){
arc='DOMINANCE_HOLD';label='Dominancia '+a.pair+' drží';
detail='Flow memory: opakovaná dominance '+a.pair+'.';
}else if(a.strong&&!b.strong&&!c.strong){
arc='DOM→BREAK';label='Break po dominancii '+a.pair;
detail='Dominancia '+a.pair+' sa rozbila — čakaj na potvrdenie nového flow.';
}
}
return{ready:true,arc,label,detail,phases};
}

function lfpSpinsVsVisual(colTop){
const spinDom=colTop.first.i;
const cl=getClusters()[0];
let visDom=-1;
if(cl&&cl.nums&&cl.nums.length){
const cnt=[0,0,0];
cl.nums.forEach(n=>{const c=columnIndexForNum(n);if(c>=0)cnt[c]++;});
visDom=cnt.indexOf(Math.max(...cnt));
}
const conflict=visDom>=0&&visDom!==spinDom;
return{conflict,spinDom:spinDom+1,visDom:visDom>=0?visDom+1:null,note:conflict?'Priorita: SPINY (70%) > vizuál — live flow.':null};
}

function lfpSpinsPriorityBlend(spinCore,timingCore,visualCore,sv){
const sc=clamp(spinCore||0),tc=clamp(timingCore||0);
let vc=clamp(visualCore||0);
if(sv&&sv.conflict)vc=Math.round(sc*0.12);
const weighted=clamp(Math.round(sc*MODEL.SPINS+tc*MODEL.TIMING+vc*MODEL.VISUAL));
return{
spinCore:Math.round(sc),timingCore:Math.round(tc),visualCore:Math.round(vc),
spinPart:+(sc*MODEL.SPINS).toFixed(1),timingPart:+(tc*MODEL.TIMING).toFixed(1),visualPart:+(vc*MODEL.VISUAL).toFixed(1),
weighted,visualMuted:!!(sv&&sv.conflict),modelLabel:'ŽIVÝ FLOW ENGINE · SPINY > vizuál'
};
}

function lfpAssessKnowledge(flow,confidence,noClearDominance,lowEdgeFlow,noPredict,noReason,mode){
if(noPredict){
const map={
'CHAOTIC FLOW':{emoji:'🌀',headline:'CHAOTICKÝ FLOW',cls:'chaos'},
'ALTERNATING — LOW EDGE':{emoji:'🌀',headline:'CHAOTICKÝ FLOW',cls:'chaos'},
'CHAOS / WAIT MODE':{emoji:'⏳',headline:'ČAKAJ',cls:'wait'},
'NO CLEAR DOMINANCE':{emoji:'⚠️',headline:'BEZ JASNÉHO EDGE',cls:'wait'},
'NO CLEAR EDGE':{emoji:'⚠️',headline:'BEZ JASNÉHO EDGE',cls:'wait'},
'LOW EDGE FLOW':{emoji:'⚠️',headline:'SLABÝ EDGE',cls:'low'},
'DEAD FLOW':{emoji:'⏳',headline:'ČAKAJ',cls:'wait'},
'FLOW SHIFT — WAIT':{emoji:'⏳',headline:'ČAKAJ',cls:'wait'},
'REŽIM UČENIA':{emoji:'⏳',headline:'ČAKAJ',cls:'wait'}
};
const m=map[noReason]||{emoji:'🧠',headline:'NEVIEM',cls:'wait'};
return{knowsUnknown:true,status:m.headline,emoji:m.emoji,cls:m.cls,sub:noReason};
}
if(confidence<40)return{knowsUnknown:true,status:'NÍZKA SILA SIGNÁLU',emoji:'🧠',cls:'wait',sub:confidence+'% — bez výhody'};
if(lowEdgeFlow)return{knowsUnknown:false,status:'SLABÝ EDGE',emoji:'⚠️',cls:'low',sub:'NORMÁLNY ≠ obchodovateľný tok'};
if(mode==='WAIT')return{knowsUnknown:true,status:'ČAKAJ',emoji:'⏳',cls:'wait',sub:'čakám na live edge'};
if(noClearDominance&&confidence<55)return{knowsUnknown:true,status:'BEZ JASNÉHO EDGE',emoji:'⚠️',cls:'wait',sub:'Slabá dominancia'};
return{knowsUnknown:false,status:'ŽIVÁ VÝHODA',emoji:'✓',cls:'edge',sub:'Čitateľný živý tok'};
}

function lfpStreakRun(seq){
let run=1,maxRun=1,cur=seq[0];
for(let i=1;i<seq.length;i++){
if(seq[i]===seq[i-1]){run++;maxRun=Math.max(maxRun,run);}else run=1;
}
return maxRun;
}

function lfpStrictAlternating(seq){
if(seq.length<5)return false;
let alt=0;
for(let i=1;i<seq.length;i++)if(seq[i]!==seq[i-1])alt++;
return alt>=seq.length-1;
}

function lfpDetectAnomalies(cols,dozens,colTop,dozTop){
const raw=spins.slice(-8).filter(n=>n!==0);
const colSeq=raw.map(columnIndexForNum).filter(c=>c>=0);
const colors=raw.map(n=>reds.includes(n)?'R':'B');
const colStreak=lfpStreakRun(colSeq);
const colorStreak=lfpStreakRun(colors);
const colGap=colTop.first.p-colTop.second.p;
const dozGap=dozTop.first.p-dozTop.second.p;
const repeatStrong=colStreak>=4||colorStreak>=6||(colStreak>=3&&colGap>=18);
const dominanceStrong=colGap>=22&&dozGap>=15;
return{
colStreak,colorStreak,repeatStrong,dominanceStrong,colGap,dozGap,
score:clamp((colStreak>=5?35:colStreak>=3?20:0)+(colorStreak>=7?25:colorStreak>=5?15:0)+(colGap>=20?20:0),0,100)
};
}

function lfpDetectFlowState(anomaly){
const live=spins.slice(-8).filter(n=>n!==0);
const micro=live.slice(-4);
if(live.length<3)return{state:'NORMAL',detail:'Live flow — čakám na dáta.',lowConf:true};
const cols=live.map(columnIndexForNum).filter(c=>c>=0);
const mcols=micro.map(columnIndexForNum).filter(c=>c>=0);
const colors=micro.map(n=>reds.includes(n)?'R':'B');
const colStreak=lfpStreakRun(mcols.length?mcols:cols);
if(lfpStrictAlternating(colors)||(mcols.length>=5&&lfpStrictAlternating(mcols))){
return{state:'ALTERNATING',detail:'Alternating flow — live micro okno.',lowConf:true};
}
if(anomaly&&anomaly.repeatStrong&&colStreak>=3){
return{state:'REPEAT',detail:'Opakovaný flow — živé opakovanie.',lowConf:false};
}
let alt=0;
for(let i=1;i<mcols.length;i++)if(mcols[i]!==mcols[i-1])alt++;
const uniqC=new Set(mcols.length?mcols:cols).size;
if(uniqC>=3&&colStreak<2){
return{state:'CHAOTIC',detail:'Chaotic flow — live bez dominancie.',lowConf:true};
}
if(cols.length>=6){
const early=cols.slice(0,Math.max(2,cols.length-3));
const late=cols.slice(-3);
const eMode=early.length?early[0]:-1;
const lDom=late[late.length-1];
const lateHits=late.filter(c=>c===lDom).length;
const earlyHits=early.filter(c=>c===eMode).length;
if(eMode>=0&&lDom>=0&&eMode!==lDom&&lateHits>=2&&earlyHits>=2&&!late.includes(eMode)){
return{state:'REVERSAL',detail:'Návrat potvrdený live ('+lateHits+' spiny).',lowConf:false};
}
}
if(uniqC>=3&&alt>=3)return{state:'MIGRATING',detail:'Migrácia — živý presun toku.',lowConf:false};
return{state:'NORMAL',detail:'Normálny živý tok.',lowConf:false};
}

function lfpZeroContext(){
const od=computeOdNuly();
let pressure='nízka';
if(od<=3)pressure='vysoká';
else if(od<=8)pressure='stredná';
const lastZero=spins.length?spins.lastIndexOf(0):-1;
const since=lastZero>=0?spins.length-1-lastZero:spins.length;
return{od,pressure,since,note:since<=4?'Nula nedávno — sleduj timing, neoverride tip.':'Vzdialenosť od nuly: '+od+' spinov.'};
}

function lfpSignalTier(pct){
if(pct>=90)return{band:'90-100',label:'Extrémne silná anomália',cls:'greenTxt'};
if(pct>=70)return{band:'70-89',label:'Silný flow',cls:'greenTxt'};
if(pct>=50)return{band:'50-69',label:'Normálny flow',cls:'yellowTxt'};
if(pct>=30)return{band:'30-49',label:'Slabý flow',cls:'yellowTxt'};
return{band:'0-29',label:'Chaos / wait',cls:'redTxt'};
}

function lfpAntiFakeConfidence(base,flow,anomaly,sup,phase,colTop,dozTop){
let c=base;
if(flow.lowConf||flow.state==='CHAOTIC')c=Math.min(c,28);
if(flow.state==='ALTERNATING')c=Math.min(c,32);
const colGap=colTop.first.p-colTop.second.p;
const dozGap=dozTop.first.p-dozTop.second.p;
if(colGap<12&&dozGap<12)c=Math.min(c,42);
if(anomaly.repeatStrong&&flow.state==='REPEAT'){
c=clamp(c+Math.min(12,anomaly.score*0.15),0,phase.maxConf);
if(sup.active)c=clamp(c+6,0,phase.maxConf);
}
if(flow.state==='REVERSAL'&&!anomaly.repeatStrong)c=Math.min(c,55);
if(flow.state==='MIGRATING')c=Math.min(c,58);
return clamp(Math.round(c),0,phase.maxConf);
}

function lfpPickMode(conf,flow,phase,noPredict){
if(noPredict)return'WAIT';
if(phase.phase==='LEARNING'||(phase.phase==='EARLY'&&conf<50))return'WAIT';
if(flow.state==='CHAOTIC'||flow.state==='ALTERNATING'||conf<32)return'WAIT';
if(conf<52)return'WAIT';
if(conf>=70&&flow.state==='REPEAT')return'AGGRESSIVE';
if(conf>=56)return'ACTIVE';
return'SAFE';
}

function lfpBuildDetections(L){
const d=[];
const f=L.flow&&L.flow.state;
if(f==='REPEAT'||(L.anomaly&&L.anomaly.repeatStrong))d.push('anomália opakovania');
if(L.sup&&L.sup.active)d.push('potlačenie (suppression)');
if(f==='ALTERNATING')d.push('striebenie flow');
if(f==='REVERSAL')d.push('reversal');
if(f==='CHAOTIC')d.push('chaos');
if(f==='MIGRATING')d.push('migrácia flow');
if(L.flowShift&&L.flowShift.active)d.push('flow sa začína otáčať');
if(L.deadFlow&&L.deadFlow.dead)d.push('mŕtvy flow → ČAKAJ');
if(L.noPredict&&L.noReason){
const sk={'CHAOTIC FLOW':'chaotický flow','DEAD FLOW':'mŕtvy flow','NO CLEAR DOMINANCE':'bez jasnej dominancie','LOW EDGE FLOW':'slabý edge','REŽIM UČENIA':'režim učenia','ALTERNATING — LOW EDGE':'striebenie — slabý edge'};
d.push(sk[L.noReason]||L.noReason.toLowerCase());
}
if(!d.length)d.push('live flow sledovaný');
return d.slice(0,6);
}

function lfpTimingEngine20(flow,anomaly){
const cols=spins.slice(-20).filter(n=>n!==0).map(columnIndexForNum).filter(c=>c>=0);
let hold=1;
for(let i=cols.length-2;i>=0;i--){if(cols[i]===cols[cols.length-1])hold++;else break;}
let core=50;
if(flow.state==='REPEAT'&&hold>=3&&anomaly.repeatStrong)core=78;
else if(flow.state==='CHAOTIC'||flow.state==='ALTERNATING')core=28;
else if(flow.state==='MIGRATING')core=44;
else if(hold>=2)core=62;
const factor=flow.lowConf?0.88:core>=58?1.05:1;
return{core:clamp(Math.round(core),0,100),factor,hold,label:core>=58?'POTVRDENIE':'NEUTRÁL'};
}

function lfpVisualEngine10(){
const vc=clamp(computeVisualCore(),0,100);
const cl=getClusters()[0];
let core=Math.round(vc*0.55);
if(cl&&cl.pressure>=55)core=clamp(core+3,0,85);
return{core,factor:1+Math.min(0.04,(cl&&cl.pressure>50?0.03:0))};
}

function lfpSliceHold(seq){
if(!seq.length)return 0;
let h=1;
for(let i=seq.length-2;i>=0;i--){if(seq[i]===seq[seq.length-1])h++;else break;}
return h;
}

function lfpFlowStabilityScore(flow,anomaly,cols,dozens,colTop,dozTop){
const raw=spins.slice(-12).filter(n=>n!==0);
const colSeq=raw.map(columnIndexForNum).filter(c=>c>=0);
const recent=colSeq.slice(-6),prior=colSeq.slice(0,Math.max(0,colSeq.length-6));
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
const hR=lfpSliceHold(recent),hP=lfpSliceHold(prior);
if(hR>=3&&hP>=2)score=clamp(score+8,0,95);
if(hP>=3&&hR<=1)score=clamp(score-18,0,95);
let alt=0;
for(let i=1;i<recent.length;i++)if(recent[i]!==recent[i-1])alt++;
if(alt>=4)score=clamp(score-14,0,95);
const avg=cols.reduce((a,b)=>a+b,0)/3;
const spread=Math.max(...cols)-Math.min(...cols);
if(spread<12)score=clamp(score-10,0,95);
score=clamp(Math.round(score),0,100);
let trend='DRŽÍ',trendCls='greenTxt';
if(score>=68)trend='DRŽÍ';
else if(score>=48){trend='SLABNE';trendCls='yellowTxt';}
else if(score>=28){trend='KOLABUJE';trendCls='yellowTxt';}
else{trend='→ CHAOS';trendCls='redTxt';}
const fillCls=score>=68?'#00ffbf':score>=45?'#ffcc00':'#ff8060';
return{score,trend,trendCls,fillCls,label:'FLOW STABILITY: '+score+'%',detail:trend+' · stĺpce/tucty/repeat'};
}

function lfpFlowShiftDetector(flow,anomaly,sup,colTop,dozTop){
const signals=[];
const raw=spins.slice(-10).filter(n=>n!==0);
const colSeq=raw.map(columnIndexForNum).filter(c=>c>=0);
const recent4=colSeq.slice(-4),prev4=colSeq.slice(-8,-4);
const colGap=colTop.first.p-colTop.second.p;
if(lfpSliceHold(prev4)>=3&&lfpSliceHold(recent4)<=1)signals.push('momentum weakening');
if(colGap<14)signals.push('dominance weakening');
if(colSeq.length>=8){
const half=Math.floor(colSeq.length/2);
const a=colSeq.slice(0,half),b=colSeq.slice(half);
const cntA=[0,0,0],cntB=[0,0,0];
a.forEach(c=>{cntA[c]++;});b.forEach(c=>{cntB[c]++;});
const domA=a.length?Math.max(...cntA)/a.length:0;
const domB=b.length?Math.max(...cntB)/b.length:0;
if(domA-domB>=0.22)signals.push('dominance weakening');
}
let alt=0;
for(let i=1;i<recent4.length;i++)if(recent4[i]!==recent4[i-1])alt++;
if(alt>=3)signals.push('alternation increase');
if(sup.rising&&sup.active)signals.push('suppression pressure shift');
if(flow.state==='MIGRATING')signals.push('migration shift');
if(sup.items.some(x=>x.spins>=10)){
const hit=raw.slice(-2).some(n=>columnIndexForNum(n)+1===sup.items[0].i);
if(hit)signals.push('suppression break');
}
const active=signals.length>=2||(signals.length>=1&&flow.state!=='REPEAT');
return{
active,
headline:active?'⚠️ FLOW SA ZAČÍNA OBRACAŤ':'',
signals,
detail:signals.length?signals.join(' · '):'Flow stabilný — bez predčasného shiftu.'
};
}

function lfpDominanceMeter(cols,dozens){
const fmt=(arr)=>{
return[1,2,3].map(i=>{
const p=Math.round(arr[i-1]||33);
return i+' = <b>'+p+'%</b>';
}).join('<br>');
};
return{colHtml:fmt(cols),dozHtml:fmt(dozens)};
}

function lfpPressureWarnings(sup,cols,dozens,low,high){
const warns=[];
(sup.items||[]).slice(0,3).forEach(x=>{
if(x.type==='column')warns.push('⚠️ STĹPEC '+x.i+' POD TLAKOM ('+x.spins+' absent)');
else if(x.type==='dozen')warns.push('⚠️ TUCET '+x.i+' POTLAČENÝ ('+x.spins+' absent)');
});
const avg=cols.reduce((a,b)=>a+b,0)/3;
cols.forEach((p,i)=>{if(p<avg*0.55&&p<22)warns.push('⚠️ STĹPEC '+(i+1)+' POD TLAKOM');});
dozens.forEach((p,i)=>{if(p<avg*0.55&&p<22)warns.push('⚠️ TUCET '+(i+1)+' POTLAČENÝ');});
if(low<28)warns.push('⚠️ TLAK NA RANGE 1–18');
if(high<28)warns.push('⚠️ TLAK NA RANGE 19–36');
return warns.slice(0,4);
}

function lfpMemoryDecayInfo(){
return{decay:LFP_DECAY,label:'Memory decay: nové spiny > staré (exp -'+LFP_DECAY+')',windows:'6/12/24/50'};
}

function lfpComputeDisplaySignal(confidence,stability,flow,anomaly,sup,timing,phase){
const chaos=flow.state==='CHAOTIC'?14:flow.state==='ALTERNATING'?10:0;
const repeat=(flow.state==='REPEAT'&&anomaly.repeatStrong)?12:0;
const supp=sup.rising?-6:sup.active?-3:0;
const mom=timing.hold>=3?7:timing.hold>=2?3:0;
const raw=confidence*0.5+stability.score*0.32+repeat+mom+supp-chaos;
return clamp(Math.round(raw),0,phase.maxConf);
}

function lfpExplainSignal(displayPct,confidence,stability,flow,anomaly,sup,timing){
const chaosLevel=flow.state==='CHAOTIC'?'VYSOKÝ':flow.state==='ALTERNATING'?'STREDNÝ':stability.score<38?'STREDNÝ':'NÍZKY';
const repeatFlow=(flow.state==='REPEAT'||anomaly.repeatStrong)?'AKTÍVNY':'VYPNUTÝ';
const supPress=sup.rising?'RASTIE':sup.active?'STREDNÝ':'NÍZKY';
const momentum=timing.hold>=3?'SILNÝ':timing.hold>=2?'NORMÁLNY':'SLABÝ';
let why='Stredný live mix — signál z viacerých faktorov.';
if(displayPct>=62)why='Silný live flow: stabilita + opakovanie/momentum.';
else if(displayPct<35)why='Chaos/striebenie — signál zámerne znížený.';
else if(stability.score>=65)why='Stabilita drží — signál podporuje flow.';
const lines=[
'STABILITA FLOW: '+stability.score+'%',
'ÚROVEŇ CHAOSU: '+chaosLevel,
'OPAKOVACÍ FLOW: '+repeatFlow,
'POTLAČENIE: '+supPress,
'MOMENTUM: '+momentum
];
return{pct:displayPct,why,lines,chaosLevel,repeatFlow};
}

function lfpExplainFlow(flow,colTop,dozTop,sup,anomaly,red,black){
const lines=[];
const a=colTop.first.i+1,b=colTop.second.i+1;
const dz=dozTop.first.i+1;
const st=flow.state;
const flowSk={NORMAL:'NORMÁLNY',REPEAT:'OPAKOVANIE',ALTERNATING:'STRIEBRENIE',REVERSAL:'REVERSAL',CHAOTIC:'CHAOS',MIGRATING:'MIGRÁCIA'};
if(st==='REPEAT'||anomaly.repeatStrong){
lines.push('DOMINANTNÝ: stĺpec '+a+' + '+b);
}else if(st==='ALTERNATING'){
const micro=spins.slice(-6).filter(n=>n!==0).map(n=>reds.includes(n)?'R':'B');
if(micro.length>=4)lines.push('PREPÍNANIE ČERVENÁ / ČIERNA');
lines.push('NÍZKA STABILITA');
}else if(st==='CHAOTIC'){
lines.push('BEZ DOMINANTNÉHO SEKTORA');
lines.push('VYSOKÝ CHAOS');
}else if(st==='REVERSAL'){
lines.push('LIVE POSUN SEKTORA');
lines.push('DOMINANTNÝ: stĺpec '+a);
}else if(st==='MIGRATING'){
lines.push('FLOW MIGRUJE');
lines.push('SLEDUJ: '+a+' → '+b);
}else{
lines.push('DOMINANTNÝ: stĺpec '+a+' + '+b);
lines.push('TUCET: '+dz);
}
const colAbs=lfpSinceAbsent(columnIndexForNum,50);
colAbs.forEach((s,i)=>{if(s>=10)lines.push('STĹPEC '+(i+1)+' POTLAČENÝ');});
if(sup.items&&sup.items[0]&&sup.items[0].type==='dozen')lines.push('TUCET '+sup.items[0].i+' POTLAČENÝ');
return{state:st,lines:lines.slice(0,3),headline:flowSk[st]||st};
}

function lfpExplainMode(mode,flow,stability,confidence,anomaly,lowEdgeFlow,colTop,noPredict){
const lines=[];
if(noPredict||mode==='WAIT'){
lines.push('žiadny čitateľný edge');
lines.push('konzervatívny režim');
}else if(mode==='SAFE'){
lines.push('stredná stabilita '+stability.score+'%');
lines.push('mierny chaos · slabší edge');
}else if(mode==='ACTIVE'){
lines.push('live dominancia stĺpec '+(colTop.first.i+1));
lines.push('momentum '+ (flow.state==='REPEAT'?'repeat':'normál'));
}else if(mode==='AGGRESSIVE'){
lines.push('silný opakovací flow');
lines.push('dominantné stĺpce');
lines.push('nízky chaos');
}
if(lowEdgeFlow&&mode!=='WAIT')lines.push('SLABÝ EDGE — opatrnosť');
const modeSk={SAFE:'BEZPEČNÝ',ACTIVE:'AKTÍVNY',AGGRESSIVE:'AGRESÍVNY',WAIT:'ČAKAJ'};
return{mode,modeSk:modeSk[mode]||mode,lines:lines.slice(0,3)};
}

function lfpExplainZero(zero){
const press=zero.pressure==='vysoká'?'VYSOKÝ':zero.pressure==='stredná'?'STREDNÝ':'NÍZKY';
const timing=zero.od<=5?'ZVÝŠENÉ':zero.od<=14?'NORMÁLNE':'NÍZKE';
const activity=zero.since<=2?'NULA NEDÁVNO':zero.od>=18?'DLHÁ MEDZERA':'NORMÁLNA';
return{
od:zero.od,
lines:['TLAK NULY: '+press,'NAČASOVANIE NULY: '+timing,'AKTIVITA NULY: '+activity],
note:'Doplnok — neovplyvňuje hlavný tip.'
};
}