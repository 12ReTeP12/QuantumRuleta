
/* QRP7-V4 · ANALYZÉR TOKU · SK */

/* ═══ AI PREDIKCIA · SAMOSTATNÝ FLOW ENGINE (nezávislý od Ruletového analytika) ═══ */
const MODEL={SPINS:0.70,TIMING:0.20,VISUAL:0.10};
/* LIVE FLOW + ANOMALY PREDICTION AI — 70/20/10 */
const LFP_WIN={W6:0.55,W12:0.28,W24:0.12,W50:0.05};
const LFP_MICRO=0.38;
const LFP_CAT={COL:0.40,DOZ:0.35,CLR:0.15,PAR:0.05,RNG:0.05};
const LFP_DECAY=0.24;
let lfpCache=null,lfpCacheKey='';

function lfpInvalidate(){lfpCache=null;lfpCacheKey='';rngInvalidate();}

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

function lfpDeadFlowDetector(flow,stability,confidence,noClearDominance,anomaly){
const dead=flow.state==='CHAOTIC'||flow.state==='ALTERNATING'
||(stability.score<26&&!anomaly.repeatStrong)
||(noClearDominance&&confidence<36&&flow.state!=='REPEAT')
||(stability.score<32&&noClearDominance);
return{dead,label:dead?'MŔTVY FLOW':null,forceWait:dead,detail:dead?'Žiadny stabilný flow · režim čakania':'Tok živý'};
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

function computeLiveFlowPredictionAI(){
const key=predFlowCacheKey()+'|lfp|'+spins.length+'|'+spins[spins.length-1];
if(lfpCache&&lfpCacheKey===key)return lfpCache;
if(spins.length<2)return null;
const phase=lfpActivationPhase();
const flowMem=lfpFlowMemory();
const cols=lfpBlendCategory('cols');
const dozens=lfpBlendCategory('dozens');
const colTop=lfpTopTwo(cols);
const dozTop=lfpTopTwo(dozens);
const spinVisual=lfpSpinsVsVisual(colTop);
const anomaly=lfpDetectAnomalies(cols,dozens,colTop,dozTop);
const flow=lfpDetectFlowState(anomaly);
if(flowMem.ready&&flowMem.arc==='DOM→BREAK→RETURN'&&flow.state==='NORMAL')flow.detail=flowMem.detail;
const sup=lfpSuppressionPressure(cols,dozens);
const zero=lfpZeroContext();
const red=lfpBlendCategory('red');
const black=lfpBlendCategory('black');
const low=lfpBlendCategory('low');
const high=lfpBlendCategory('high');
const even=lfpBlendCategory('even');
const odd=lfpBlendCategory('odd');
let spinScore=50;
if(flow.state==='REPEAT'&&anomaly.repeatStrong)spinScore=clamp(72+anomaly.score*0.2,0,95);
else if(flowMem.arc==='DOM→BREAK→RETURN')spinScore=clamp(68+colTop.first.p*0.15,55,82);
else if(flow.state==='ALTERNATING')spinScore=28;
else if(flow.state==='CHAOTIC')spinScore=24;
else if(flow.state==='REVERSAL')spinScore=55;
else if(flow.state==='MIGRATING')spinScore=52;
else spinScore=clamp(46+colTop.first.p*0.3,35,65);
const timing=lfpTimingEngine20(flow,anomaly);
const visual=lfpVisualEngine10();
const blend=lfpSpinsPriorityBlend(spinScore,timing.core,visual.core,spinVisual);
let confidence=lfpAntiFakeConfidence(blend.weighted*timing.factor,flow,anomaly,sup,phase,colTop,dozTop);
const signalTier=lfpSignalTier(confidence);
const colGap=colTop.first.p-colTop.second.p;
const dozGap=dozTop.first.p-dozTop.second.p;
const noClearDominance=colGap<14&&dozGap<14;
const lowEdgeFlow=flow.state==='NORMAL'&&!anomaly.repeatStrong&&(colGap<16||confidence<48);
const stability=lfpFlowStabilityScore(flow,anomaly,cols,dozens,colTop,dozTop);
const flowShift=lfpFlowShiftDetector(flow,anomaly,sup,colTop,dozTop);
const deadFlow=lfpDeadFlowDetector(flow,stability,confidence,noClearDominance,anomaly);
const domMeter=lfpDominanceMeter(cols,dozens);
const pressureWarns=lfpPressureWarnings(sup,cols,dozens,low,high);
const memDecay=lfpMemoryDecayInfo();
let noPredict=false,noReason='';
if(deadFlow.dead&&!anomaly.repeatStrong){noPredict=true;noReason='DEAD FLOW';}
else if(flow.state==='CHAOTIC'){noPredict=true;noReason='CHAOTIC FLOW';}
else if(flow.state==='ALTERNATING'){noPredict=true;noReason='ALTERNATING — LOW EDGE';}
else if(confidence<32){noPredict=true;noReason='CHAOS / WAIT MODE';}
else if(noClearDominance&&confidence<52){noPredict=true;noReason='NO CLEAR DOMINANCE';}
else if(lowEdgeFlow&&confidence<45){noPredict=true;noReason='LOW EDGE FLOW';}
else if(phase.phase==='LEARNING'){noPredict=true;noReason='REŽIM UČENIA';}
else if(flowShift.active&&stability.score<42&&!anomaly.repeatStrong){noPredict=true;noReason='FLOW SHIFT — WAIT';}
let mode=lfpPickMode(confidence,flow,phase,noPredict);
if(deadFlow.forceWait)mode='WAIT';
const know=lfpAssessKnowledge(flow,confidence,noClearDominance,lowEdgeFlow,noPredict,noReason,mode);
const columns=noPredict?'—':lfpPickPair(colTop,phase.phase==='FULL'?30:26);
const dozensPick=noPredict?'—':lfpPickPair(dozTop,phase.phase==='FULL'?30:26);
const color=noPredict?'—':red>=black?'ČERVENÁ':'ČIERNA';
const parity=noPredict?'—':even>=odd?'PÁRNE':'NEPÁRNE';
const range=noPredict?'—':low>=high?'1-18':'19-36';
const displaySignal=lfpComputeDisplaySignal(confidence,stability,flow,anomaly,sup,timing,phase);
const signalTierDisp=lfpSignalTier(displaySignal);
const signalIntel=lfpExplainSignal(displaySignal,confidence,stability,flow,anomaly,sup,timing);
const flowIntel=lfpExplainFlow(flow,colTop,dozTop,sup,anomaly,red,black);
const modeIntel=lfpExplainMode(mode,flow,stability,confidence,anomaly,lowEdgeFlow,colTop,noPredict);
const zeroIntel=lfpExplainZero(zero);
const detections=lfpBuildDetections({flow,anomaly,sup,flowShift,deadFlow,noPredict,noReason});
lfpCache={
phase,flow,flowMem,mode,color,parity,range,columns,dozens:dozensPick,
signal:displaySignal,confidence,signalTier:signalTierDisp,signalIntel,flowIntel,modeIntel,zeroIntel,
know,spinVisual,detections,
stability,flowShift,deadFlow,domMeter,pressureWarns,memDecay,
spinCore:spinScore,timingCore:timing.core,visualCore:visual.core,
blend,timing,visual,supCol:sup,supDoz:sup,sup,
anomaly,zero,noPredict,noReason,noClearDominance,lowEdgeFlow,
edgeLabel:know.status==='LIVE EDGE'||know.status==='ŽIVÁ VÝHODA'?'ŽIVÁ VÝHODA':know.status,
modeSk:(modeIntel&&modeIntel.modeSk)||mode,
signalLabel:signalTierDisp.label,signalCls:signalTierDisp.cls,
odNuly:zero.od,zero,
colPct:colTop.first.p,dozPct:dozTop.first.p,colGap,dozGap,cols,dozensPct:dozens
};
lfpCacheKey=key;
return lfpCache;
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
const c=columnIndexForNum(n),d=dozenIndexForNum(n);
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
const colAbs=rngObsSinceAbsent(columnIndexForNum,50);
const dozAbs=rngObsSinceAbsent(dozenIndexForNum,50);
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
const colSeq=raw.map(columnIndexForNum).filter(c=>c>=0);
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
const cols=live.map(columnIndexForNum).filter(c=>c>=0);
const mcols=micro.map(columnIndexForNum).filter(c=>c>=0);
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
const colSeq=raw.map(columnIndexForNum).filter(c=>c>=0);
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
{key:'mom',label:'Momentum',on:rngObsStreakRun(spins.slice(-6).filter(n=>n!==0).map(columnIndexForNum).filter(c=>c>=0))>=2||flowState==='REPEAT'},
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
const p=columnIndexForNum(slice[i-1]),c=columnIndexForNum(slice[i]);
if(p>=0&&c===target&&p!==target)score+=2;
}
for(let i=2;i<slice.length;i++){
const a=columnIndexForNum(slice[i-2]),b=columnIndexForNum(slice[i-1]),c=columnIndexForNum(slice[i]);
if(a>=0&&b>=0&&c>=0&&b!==a&&c===target)score+=3;
}
}else{
for(let i=1;i<slice.length;i++){
const p=dozenIndexForNum(slice[i-1]),c=dozenIndexForNum(slice[i]);
if(p>=0&&c===target&&p!==target)score+=2;
}
for(let i=2;i<slice.length;i++){
const a=dozenIndexForNum(slice[i-2]),b=dozenIndexForNum(slice[i-1]),c=dozenIndexForNum(slice[i]);
if(a>=0&&b>=0&&c>=0&&b!==a&&c===target)score+=3;
}
}
return score;
}

function predFollowUpEdgeScores(slice,field){
const edges={};
const idx=n=>field==='col'?columnIndexForNum(n):dozenIndexForNum(n);
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
const p=field==='col'?columnIndexForNum(slice[i-1]):dozenIndexForNum(slice[i-1]);
const c=field==='col'?columnIndexForNum(slice[i]):dozenIndexForNum(slice[i]);
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
const ci=columnIndexForNum(last),di=dozenIndexForNum(last);
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
recent.forEach(n=>{if(columnIndexForNum(n)===t)hits++;});
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
const p=columnIndexForNum(slice[i-1]),c=columnIndexForNum(slice[i]);
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
/* AI PREDIKCIA engine — jediný vstup pre panel (nezávislý od analytika) */
function computeAIPredictionEngine(){
if(spins.length<2)return null;
const LFP=computeLiveFlowPredictionAI();
if(LFP){
const timing=LFP.timing||{label:'NEUTRÁL',factor:1,core:LFP.timingCore};
const blend=LFP.blend;
const flowEng=computeFollowUpFlowEngine();
const trustHierarchy={tier:LFP.signal>=62?'VERY_STRONG':LFP.signal>=48?'MEDIUM':'WEAK',label:LFP.mode,showStrong:LFP.signal>=58,aggression:LFP.mode==='AGGRESSIVE'?0.9:LFP.mode==='WAIT'?0.35:0.65,sub:LFP.flow.detail};
const stab={quiet:LFP.mode==='WAIT',displayCol:null,displayDoz:null,mainOpinion:{headline:'Živý tok: '+skFlow(LFP.flow.state),sub:LFP.flow.detail,cls:''},breakDetected:false};
return{
flowEng,blend,timing,visualSup:{factor:1,factor:1},patScore:LFP.spinCore,
flowStatus:{flow:LFP.flow.state,trust:String(LFP.signal),cls:'ra-fs-mid',hierarchy:trustHierarchy},
trustHierarchy,flowTrust:{label:LFP.flow.state,cls:'greenTxt'},
predRezim:LFP.mode==='WAIT'?'OBSERVATION':LFP.mode==='AGGRESSIVE'?'FLOW ACTIVE':'OBSERVATION',
signalStrength:LFP.signal,rawConfidence:LFP.signal,confidence:LFP.confidence,
color:LFP.color==='ČERVENÁ'?'červená':'čierna',parity:LFP.parity,size:LFP.range==='19-36'?'VEĽKÉ (19–36)':'MALÉ (1–18)',
dozens:LFP.dozens,columns:LFP.columns,colorDisplay:LFP.color,
flowConfirm:{},opinionChange:null,stability:stab,mainOpinion:stab.mainOpinion,quiet:stab.quiet,
flowTransition:null,flowChanging:false,displayCol:null,displayDoz:null,
seria:LFP.flow.state,rezim:LFP.mode,odNuly:LFP.odNuly,
dominantFlow:LFP.flow.state,dominantTarget:LFP.columns,
state:LFP.mode,stateLabel:LFP.mode,riskLabel:LFP.flow.state,
sessionMode:sessionIntel.label,sessionQuality:sessionIntel.mode,
edgeStrength:'—',edge:'—',playState:{state:LFP.mode,play:LFP.mode,cls:'yellowTxt'},
suppressed:LFP.flow.state==='CHAOTIC',noEdge:false,cluster:getClusters()[0],
sector:'—',modelLabel:'ŽIVÝ FLOW + ANOMÁLIA · 70/20/10',
flowSeria:LFP.flow.state,flowBrain:LFP.flow.state,flowTrust:{label:LFP.flow.state,cls:'greenTxt'},
momentumLabel:'—',chaosLevel:0,chaosTag:'—',migrationDir:'—',migrationLabel:'—',
preferNow:LFP.columns+' · '+LFP.dozens,notFortuneTeller:'Live flow — nie štatistická istota.',
lfp:LFP
};
}
coreAnalysisDepth++;
try{
const flowEng=computeFollowUpFlowEngine();
const spinCore=computeSpinsFlowCore();
const timingCoreVal=getBallTimingSamples().length?computeBallTimingCore(getBallTimingSamples()):computeTimingCore();
const visualCoreVal=computeVisualCore();
const blend=computeModelBlend(spinCore,timingCoreVal,visualCoreVal);
const timing=getPredictionTimingFactor();
const visualSup=getPredictionVisualSupportSector();
const patScore=computeFlowPatternsScore();
let trustHierarchy=computePredictionTrustHierarchy(flowEng,patScore,timing);
const adaptShim={bestCol:flowEng.adaptBestCol!=null?flowEng.adaptBestCol:flowEng.shortCol,repeatTo:flowEng.adaptRepeatTo||0,score:flowEng.adaptScore||0,edgeHits:flowEng.adaptEdgeHits||[]};
const shortShim={bestCol:flowEng.shortCol,score:flowEng.shortScore,repeatTo:flowEng.repeatToTarget};
const stab=predResolveMainFlowEngine(flowEng.realityCol!=null?flowEng.realityCol:flowEng.bestCol,flowEng.bestDoz,flowEng,trustHierarchy.tier,adaptShim,shortShim);
if(flowEng.realityStrong)trustHierarchy=Object.assign({},trustHierarchy,{showStrong:true,sub:flowEng.realityReason||trustHierarchy.sub});
if(stab.displayCol!=null){
flowEng.bestCol=stab.displayCol;
flowEng.bestDoz=stab.displayDoz;
if(flowEng.secondCol!=null&&flowEng.secondCol!==stab.displayCol&&flowEng.secondScore>=2){
flowEng.colPick=String(stab.displayCol+1)+' + '+(flowEng.secondCol+1);
}else flowEng.colPick=String(stab.displayCol+1);
}
if(stab.quiet)trustHierarchy=Object.assign({},trustHierarchy,{tier:'WEAK',label:'BEZ STABILNÉHO FLOW',showStrong:false,sub:stab.mainOpinion.sub,aggression:0.3});
if(stab.stableTier==='WEAK'&&trustHierarchy.tier!=='VERY_STRONG')trustHierarchy=Object.assign({},trustHierarchy,{tier:'WEAK',label:'SLABÁ PREDIKCIA',flow:'ROZPADÁ SA',trust:'SLABÁ',cls:'pred-tier-weak',aggression:0.35,showStrong:false,sub:'Dlhodobá stabilita: dva slabé signály za sebou — bez paniky po jednom spine.'});
else if(stab.stableTier==='VERY_STRONG')trustHierarchy=Object.assign({},trustHierarchy,{tier:'VERY_STRONG',label:'VEĽMI SILNÁ PREDIKCIA',cls:'pred-tier-very',aggression:0.92,showStrong:true});
const flowConfirm=computeFlowConfirmation(flowEng,trustHierarchy,timing,stab);
const flowTrust=predComputeFlowTrust(trustHierarchy,flowEng,{code:flowEng.flowMomentum,label:flowEng.flowMomentumLabel});
flowEng.flowTrust=flowTrust;
const opinionChange=predExplainOpinionChange(flowEng,flowEng.bestCol,flowEng.bestDoz);
const flowStatus=computePredictionFlowStatus(flowEng,patScore,timing);
let predRezim=computePredictionRezim(flowEng,flowStatus,trustHierarchy);
if(stab.quiet)predRezim='OBSERVATION';
const flowTransition=predFlowTransitionLabel(predStableState.prevRezim,predRezim);
predStableState.prevRezim=predRezim;
const learnMult=getLearningConfidenceBoost();
let signalStrength=blend.weighted;
signalStrength=signalStrength*0.9+timing.factor*blend.weighted*0.06+visualSup.factor*blend.weighted*0.04;
signalStrength*=learnMult*aiStateMachine.confMult*(flowEng.corrAggressive||1);
if(flowEng.flowMomentum==='RASTIE')signalStrength=clamp(signalStrength*1.06,0,100);
if(flowEng.flowMomentum==='SLABNE')signalStrength=clamp(signalStrength*0.9,0,100);
if(flowEng.corrPenalty)signalStrength=clamp(signalStrength*(1-flowEng.corrPenalty),0,100);
signalStrength*=trustHierarchy.aggression;
if(trustHierarchy.tier==='WEAK')signalStrength=clamp(Math.min(signalStrength,42),0,100);
if(trustHierarchy.tier==='VERY_STRONG')signalStrength=clamp(signalStrength,62,88);
if(predRezim==='DEAD SPINS')signalStrength=clamp(Math.min(signalStrength,35));
let rawConfidence=clamp(Math.round(signalStrength));
let confidence=rawConfidence;
if(trustHierarchy.tier==='MEDIUM')confidence=clamp(confidence,45,62);
if(trustHierarchy.tier==='WEAK')confidence=clamp(confidence,28,48);
if(trustHierarchy.tier==='VERY_STRONG')confidence=clamp(confidence,58,85);
const cluster=getClusters()[0];
const playState={state:predRezim==='FLOW ACTIVE'?'ATTACK':predRezim==='DEAD SPINS'?'SAFE':'OBSERVE',play:predRezim,cls:predRezim==='FLOW ACTIVE'?'greenTxt':'yellowTxt',reason:flowEng.reasons.stlpce||'—'};
const pickColor=flowEng.colorWeak?'—':(flowEng.dominantColor==='červená'?'ČERVENÁ':'ČIERNA');
const pickSize=flowEng.sizePick==='19-36'?'VEĽKÉ (19–36)':'MALÉ (1–18)';
const pickPar=flowEng.priorityWeak>=2?'—':(flowEng.parityPick==='párne'?'PÁRNE':'NEPÁRNE');
const colPlain=String(flowEng.colPick||'').replace(/<[^>]+>/g,'').trim()||(stab.displayCol+1);
const dozPlain=String(flowEng.dozPick||'').replace(/<[^>]+>/g,'').trim()||(stab.displayDoz+1);
const columnsDisplay=predFormatPickWithConfirm(colPlain,flowConfirm.col);
const dozensDisplay=predFormatPickWithConfirm(dozPlain,flowConfirm.doz);
const colorDisplay=pickColor!=='—'?predFormatPickWithConfirm(pickColor,flowConfirm.color):'—';
const preferCol=colPlain;
return{
flowEng,blend,timing,visualSup,patScore,flowStatus,trustHierarchy,flowTrust,predRezim,
signalStrength:+signalStrength.toFixed(2),rawConfidence,confidence,
color:pickColor,parity:pickPar,size:pickSize,
dozens:dozensDisplay,columns:columnsDisplay,colorDisplay,
flowConfirm,opinionChange,stability:stab,mainOpinion:stab.mainOpinion,quiet:stab.quiet,flowTransition,flowChanging:!!(flowEng.flowFlip||opinionChange||stab.breakDetected),
displayCol:stab.displayCol,displayDoz:stab.displayDoz,
seria:flowStatus.flow,rezim:predRezim,odNuly:computeOdNuly(),
dominantFlow:'FLOW · '+preferCol,dominantTarget:(flowEng.bestCol+1)+'. stĺpec',
state:playState.state,stateLabel:predRezim,riskLabel:flowStatus.trust,
sessionMode:sessionIntel.label,sessionQuality:sessionIntel.mode,
edgeStrength:flowStatus.trust,edge:flowStatus.trust==='SILNÁ'?'CLEAR EDGE':'LOW EDGE',
playState,suppressed:false,noEdge:false,cluster,
sector:cluster.nums.slice(0,5).join(' · '),
modelLabel:'AI predikcia · 70% spiny · 20% timing · 10% vizuál',
flowSeria:flowEng.flowMomentumLabel||'—',
flowBrain:flowTrust.label,
flowTrust,
momentumLabel:flowEng.flowMomentumLabel,
chaosLevel:0,chaosTag:'—',migrationDir:'—',migrationLabel:'—',
preferNow:'Teraz (posledných '+PRED_SHORT_WIN+'): '+preferCol+' · '+flowEng.dozPick.replace(/<[^>]+>/g,''),
notFortuneTeller:'Analýza follow-up — nie magická istota. Flow sa mení každým spinom.'
};
}finally{coreAnalysisDepth=Math.max(0,coreAnalysisDepth-1);}
}
function computeCoreAnalysis(){return computeAIPredictionEngine();}

const MIN_SPINS_ACTIVE=12;
function hasMinSpins(){return spins.length>=MIN_SPINS_ACTIVE;}
function spinsUntilActive(){return Math.max(0,MIN_SPINS_ACTIVE-spins.length);}
const COMMENT_MODEL={SPIN_DATA:0.50,REASONING:0.50};
/* FLOW ANALYZER */
const FLOW_DISCLAIMER='Flow Analyzer: analyzuje session, flow, wheel, tlak, chaos, stabilitu. Filtruje edge — neuhadava buduce cislo.';
let lastFlowFocus=null,lastFlowAnalyzerCache=null,lastFlowAnalyzerKey='';
function getFlowFocusSector(){
const cluster=getClusters()[0];
const w=spins.length>=2?computeWheelSectorIntel():{dominant:null};
const dom=w.dominant;
if(dom&&dom.nums&&dom.nums.length)return{nums:dom.nums.slice(),center:dom.nums[2],label:'Dominantny pas',pct:+(dom.displayPct!=null?dom.displayPct:dom.pct||0).toFixed(1)};
return{nums:cluster.nums.slice(),center:cluster.nums[2],label:'Aktivny klaster',pct:0};
}
function flowSectorHit(number,focus){
if(number==null||!focus||!focus.nums||!focus.nums.length)return false;
return focus.nums.includes(number);
}
function computeFlowAnalyzer(){
const key=predCacheKey()+'|f|'+spins.length;
if(lastFlowAnalyzerCache&&lastFlowAnalyzerKey===key)return lastFlowAnalyzerCache;
if(spins.length<2){lastFlowAnalyzerCache=null;lastFlowAnalyzerKey=key;return null;}
const SE=runSpinsEnginePipeline();
const pr=computeAIPrediction();
const focus=getFlowFocusSector();
const mig=SE.ready?SE.migration:analyzeMigrationFlow();
const chaos=SE.ready?SE.chaos:analyzeChaosFromSpins();
const cluster=SE.ready?SE.cluster:analyzeClusterPressure();
const neighbors=SE.ready?SE.neighbors:analyzeWheelNeighborChain();
const timing=SE.ready?SE.timing:runTimingEngineSupport();
const visual=SE.ready?SE.visual:runVisualFromSpins({cluster,migration:analyzeMigrationFlow(),chaos,neighbors,playState:resolvePlayState(50,chaos,null)});
const inv=pr?pr.invisible:getInvisibleLayer();
const flowQuality=SE.ready?SE.liveScore:(pr?pr.spinCore:50);
const timingOpen=timing.core>=55&&lastTimingBreakdown.stability>=45;
const edgeOk=!!(inv&&inv.edge==='CLEAR EDGE'&&SE.ready&&!SE.suppressRecommendation);
const result={
modelLabel:'70% SPINY · 20% TIMING · 10% VIZUÁL',
disclaimer:FLOW_DISCLAIMER,flowQuality:Math.round(flowQuality),sectorFocus:focus,
clusterPressure:Math.round(cluster.pressure||0),migrationDir:mig.dir||mig.mode||'—',
migrationLabel:mig.label||'—',neighborPath:neighbors.path||'—',
chaosLevel:chaos.chaosLevel,chaosTag:chaos.tag||'—',stability:Math.round(100-chaos.chaosLevel),
timingCore:timing.core,timingWindow:timingOpen?'OTVORENE':'ZATVORENE',
timingWindowCls:timingOpen?'greenTxt':'yellowTxt',visualState:visual.state||'TRACK',
visualCore:visual.core||0,edge:inv?skEdge(inv.edge):'—',edgeOk,
suppressGuess:!!(SE.suppressRecommendation||chaos.noEdge),playState:SE.playState,
confidence:pr?pr.confidence:0,SE,pr
};
lastFlowFocus=focus;lastFlowAnalyzerCache=result;lastFlowAnalyzerKey=key;return result;
}
function corePredLineReason(emoji,label,val,reason,cls){
const c=cls?' '+cls:'';
return '<div class="core-pred-line"><span class="cpl-label">'+emoji+' '+label+'</span><b class="cpl-val'+c+'">'+val+'</b><span class="core-pred-reason">'+reason+'</span></div>';
}
function lfpPanelRow(ico,lbl,val,cls){
const c=(cls||'').trim();
return '<div class="panel-line"><span>'+ico+' '+lbl+'</span><b'+(c?' class="'+c+'"':'')+'>'+val+'</b></div>';
}
function lfpMetaSubs(lines){
if(!lines||!lines.length)return'';
return'<div class="lfp-meta-sub">'+lines.map(l=>'<span class="plus">+</span> '+l).join('<br>')+'</div>';
}
function lfpMetaCard(ico,lbl,mainVal,cls,subs){
return'<div class="lfp-meta-card">'+lfpPanelRow(ico,lbl,mainVal,cls)+lfpMetaSubs(subs)+'</div>';
}
function lfpHumanFlowScore(score){
const s=score!=null?score:50;
if(s<40)return{head:'🔴 CHAOS',sub:'Stabilita toku: '+s+'%',cls:'redTxt',hint:'Flow nedrží smer.'};
if(s<60)return{head:'🟠 NEISTÝ FLOW',sub:'Stabilita toku: '+s+'%',cls:'yellowTxt',hint:'Flow je nestabilný.'};
if(s<75)return{head:'🟢 STABILNÝ FLOW',sub:'Stabilita toku: '+s+'%',cls:'greenTxt',hint:'Flow drží smer.'};
return{head:'🟢 SILNÝ FLOW',sub:'Stabilita toku: '+s+'%',cls:'greenTxt',hint:'Dominancia je silná.'};
}
function lfpHumanChaos(chaosLevel,noEdge){
const c=chaosLevel!=null?chaosLevel:50;
if(c>=65||noEdge)return{head:'🔴 CHAOS VYSOKÝ',sub:'Koleso mení smer príliš často.',cls:'redTxt'};
if(c>=45)return{head:'🟠 CHAOS STREDNÝ',sub:'Flow je nestabilný.',cls:'yellowTxt'};
return{head:'🟢 CHAOS NÍZKY',sub:'Koleso drží stabilný smer.',cls:'greenTxt'};
}
function lfpHumanMigration(dir){
const d=String(dir||'').toUpperCase();
if(d==='CW')return{head:'🔄 FLOW SMER',sub:'Migrácia po smere wheelu (doprava).',cls:'greenTxt'};
if(d==='CCW')return{head:'🔄 FLOW SMER',sub:'Migrácia proti smeru wheelu.',cls:'yellowTxt'};
if(d==='MIX'||d==='BREAK'||d==='HOLD')return{head:'🔄 FLOW SMER',sub:'Koleso nemá pevný smer.',cls:'redTxt'};
return{head:'🔄 FLOW SMER',sub:'Smer sa ešte formuje.',cls:'yellowTxt'};
}
function lfpHumanCluster(pct){
const p=pct!=null?pct:0;
if(p<25)return{head:'⚠ SLABÁ DOMINANCIA',sub:'Koleso nedrží stabilnú zónu.',cls:'redTxt'};
if(p<50)return{head:'🟠 MIERNY KLASTER',sub:'Dominancia je slabá.',cls:'yellowTxt'};
if(p<75)return{head:'🟢 SILNÝ KLASTER',sub:'Koleso drží aktívny sektor.',cls:'greenTxt'};
return{head:'🟢 VEĽMI SILNÝ KLASTER',sub:'Sektor má silný tlak.',cls:'greenTxt'};
}
function lfpHumanSector(nums,path){
const list=(nums&&nums.length)?nums.join(' → '):(path&&path!=='—'?path:'');
if(!list)return{head:'🧲 AKTÍVNY SEKTOR',sub:'Sektor sa ešte formuje.',cls:'yellowTxt'};
return{head:'🎯 LIVE FLOW SEKTOR',sub:list,cls:'greenTxt'};
}
function lfpHumanPlayStatus(L){
if(L.noPredict){
const r=String(L.noReason||'');
if(/CHAOT|DEAD|ALTERNAT|WAIT|SHIFT/i.test(r))return{head:'🔴 REŽIM ČAKANIA',sub:'Flow je príliš nestabilný.',cls:'bad'};
return{head:'⚠ FLOW NEJASNÝ',sub:'Koleso nemá stabilný smer.',cls:'warn'};
}
const know=L.know||{};
if(know.knowsUnknown||know.cls==='wait'||know.status==='ČAKAJ'||know.status==='BEZ JASNÉHO EDGE'||know.status==='CHAOTICKÝ FLOW')
return{head:'⚠ FLOW NEJASNÝ',sub:'Počkaj na jasnejší signál.',cls:'warn'};
if(know.cls==='edge'||know.status==='LIVE EDGE'||know.status==='ŽIVÁ VÝHODA')return{head:'🟢 VÝHODA AKTÍVNA',sub:'Flow je čitateľný pre hru.',cls:'ok'};
if(know.cls==='low'||know.status==='SLABÝ EDGE')return{head:'🟠 OPATRNOSŤ',sub:'Slabší edge — hraj opatrne.',cls:'warn'};
return{head:'🟠 OPATRNOSŤ',sub:'Stredný signál — sleduj potvrdenie.',cls:'warn'};
}
function lfpGatherBehaviorContext(L){
let SE=null,F=null,chaos=null;
if(spins.length>=2){
try{SE=runSpinsEnginePipeline();}catch(e){}
try{F=computeFlowAnalyzer();}catch(e){}
try{chaos=analyzeChaosFromSpins();}catch(e){}
}
const flowScore=L.stability?L.stability.score:(F?F.flowQuality:(SE?SE.liveScore:50));
const chaosLevel=F?F.chaosLevel:(SE&&SE.chaos?SE.chaos.chaosLevel:(chaos?chaos.chaosLevel:50));
const noEdge=!!(F&&F.suppressGuess)||!!(SE&&SE.chaos&&SE.chaos.noEdge)||!!(chaos&&chaos.noEdge);
const migDir=(F&&F.migrationDir)||(SE&&SE.migration?SE.migration.dir:'—');
const clusterPct=F?F.clusterPressure:(SE&&SE.cluster?Math.round(SE.cluster.pressure):0);
let sectorNums=[];
if(F&&F.sectorFocus&&F.sectorFocus.nums)sectorNums=F.sectorFocus.nums;
else{try{const fs=getFlowFocusSector();if(fs&&fs.nums)sectorNums=fs.nums;}catch(e){}}
const neighborPath=F?F.neighborPath:(SE&&SE.neighbors?SE.neighbors.path:'—');
return{flowScore,chaosLevel,noEdge,migDir,clusterPct,sectorNums,neighborPath};
}
function lfpBuildHumanLiveComment(L,ctx){
const st=L.flow&&L.flow.state;
const cols=L.columns&&L.columns!=='—'?L.columns:null;
if(L.noPredict){
if(st==='CHAOTIC'||L.deadFlow&&L.deadFlow.dead)return'🔴 Wheel je príliš chaotický.';
if(ctx.chaosLevel>=65)return'🔴 Chaos je vysoký — počkaj na stabilizáciu.';
return'🔴 Počkaj — flow nie je čitateľný.';
}
if(st==='REPEAT'&&cols)return'🟢 '+cols+' stále drží flow.';
if(L.stability&&L.stability.trend==='SLABNE')return'🟠 Dominancia začína slabnúť.';
if(st==='MIGRATING'||ctx.migDir==='MIX')return'🟠 Wheel mení smer častejšie než normálne.';
if(L.flowMem&&L.flowMem.ready&&String(L.flowMem.arc).indexOf('RETURN')>=0){
const p=ctx.sectorNums.length?ctx.sectorNums.join('-'):'';
return'🟢 Flow sa vracia do sektora'+(p?' '+p+'.':'.');
}
if(ctx.flowScore>=72)return'🟢 Flow drží stabilný smer.';
if(st==='REVERSAL')return'🟠 Wheel mení dominantný sektor.';
return'🟠 Sleduj koleso — tok sa formuje.';
}
function lfpHumanMetricHtml(ico,block){
const lbl=skWheelUserText(block.head);
const sub=skWheelUserText(block.sub);
return '<div class="panel-line lfp-human-metric"><span>'+(ico?ico+' ':'')+lbl+'</span><b class="'+(block.cls||'')+'">'+sub+'</b></div>';
}
function buildAIPredictionPanelHTML(pr,E){
const L=(pr&&pr.lfp)||computeLiveFlowPredictionAI();
if(!L){
if(spins.length<2)return '<div class="alert">Zadaj 2+ spiny.</div>';
return '<div class="alert">Načítavam…</div>';
}
const wait=L.noPredict||(L.know&&L.know.knowsUnknown);
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
function buildFlowAnalyzerHTML(F){
const pr=computeAIPrediction();
return pr?buildAIPredictionPanelHTML(pr,pr.coreAnalysis):'';
}

const MAX_SPINS=180;
const HEAVY_RENDER_INTERVAL=5;
const wheel=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const reds=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
let spins=[],statsCache={},timingHistory=[],predictionHistory=[];
let timingRunning=false,timingStartAt=null,lastBallTimingSec=null,ballTimingHistory=[];
let ballTimingRecords=[],pendingBallTimingSec=null,lastTimingProfileCache=null;
const TIMING_PROFILE_MIN=3,TIMING_PROFILE_FULL=12;
let timingBallPick={dozens:'—',columns:'—',color:'—',size:'—',parity:'—'};
let timingTickTimer=null;
let lastAIPredictionCache=null;
let lastAIPredictionKey='';
let lastWheelIntel=null;
let lastWheelIntelKey='';
const WHEEL_SPIN_WEIGHT={history:0.22,neighbors:0.20,cluster:0.18,migration:0.15,hotCold:0.12,streak:0.05,entropy:0.08};
const PRED_SPIN_SOURCE={history:0.16,hotCold:0.14,wheel:0.28,patterns:0.18,wheelFlow:0.14};
let lastPrediction=[],lastPick=null,totalPredictions=0,successfulPredictions=0;
let lastSpinTime=Date.now(),spinTimes=[];
let lastCoreValues={spinCore:0,timingCore:50,visualCore:50};
let lastSpinBreakdown={cluster:0,chain:0,hotCold:0,entropy:0,gap:0,dozen:0,streak:0,drift:0,total:0};
let lastTimingBreakdown={rhythm:0,pace:0,trend:0,flow:0,stability:0,total:0};
let lastVisualBreakdown={wheel:0,board:0,pressure:0,heatSpread:0,align:0,total:0};
let adaptiveWeights={spin:1,timing:1,visual:1,failStreak:0};
let memoryBank={short:[],mid:[],long:[]};
let adaptiveLearning={numWeight:{},patternSurvival:{},sectorPersist:{d1:50,d2:50,d3:50,c1:50,c2:50,c3:50},reinforcement:50,memorySuccess:50,hits:0,misses:0};
let predictionEvolution={generation:0,generations:[],confidenceTrail:[],weightShift:{spin:1,timing:1,visual:1,pattern:1,sector:1},selfCorrection:0,lastDelta:0};
function resetAdaptiveLearningState(){
adaptiveLearning={numWeight:{},patternSurvival:{},sectorPersist:{d1:50,d2:50,d3:50,c1:50,c2:50,c3:50},reinforcement:50,memorySuccess:50,hits:0,misses:0};
predictionEvolution={generation:0,generations:[],confidenceTrail:[],weightShift:{spin:1,timing:1,visual:1,pattern:1,sector:1},selfCorrection:0,lastDelta:0};
}

/* ========== EVENT + LIVE SPIN PIPELINE ========== */
const EVENT={BEFORE_SPIN:'before_spin',SPIN_PROCESSED:'spin_processed',RENDER:'render',UNDO:'undo'};
const eventListeners={};
function onEvent(type,fn){if(!eventListeners[type])eventListeners[type]=[];eventListeners[type].push(fn);}
function emitEvent(type,payload){(eventListeners[type]||[]).forEach(fn=>{try{fn(payload||{});}catch(e){console.error('event',type,e);}});}

let spinMemoryEngine={activePatterns:[],dyingPatterns:[],dominantSectors:{dozen:-1,column:-1},sectorAge:{d1:0,d2:0,d3:0,c1:0,c2:0,c3:0},migrationHistory:[],chaosHistory:[],confidenceHistory:[],predictionSnapshots:[]};
let sessionIntel={mode:'WARMUP',label:'Rozcvička',score:0,flags:{}};
let aiStateMachine={state:'OBSERVE',label:'Sledovanie',aggression:0.55,confMult:1,allowRisky:true,allowAttack:false};
let persistenceEngine={dozenLife:[0,0,0],columnLife:[0,0,0],currentDozen:-1,currentColumn:-1,maxLife:0};
let predictionArchive=[];
let futureFlowEngine={horizon:5,direction:'NEUTRAL',label:'—',collapseRisk:0,migrationBias:0,steps:[]};
let performanceEngine={accuracy:0,confidenceAccuracy:0,chaosAccuracy:0,sessionAccuracy:0,predictionSurvival:0,sampleSize:0};
let pipelineMeta={lastSpinAt:0,spinCount:0,renderGeneration:0};

/* ========== SPINS ENGINE — 70% HLAVNÉ JADRO ========== */
const HC_WINDOWS=[10,20,30,50];
let spinRecords=[];
let spinsEngineCache=null;
let spinsEngineCacheKey='';
let spinsEngineDepth=0;
let coreAnalysisDepth=0;

function spinMeta(number,ts){
const n=+number;
const wi=wheel.indexOf(n);
const di=dozenIndexForNum(n);
const ci=columnIndexForNum(n);
const secIdx=wi>=0?wi:-1;
const nums=[];
if(secIdx>=0){for(let j=-2;j<=2;j++)nums.push(wheel[(secIdx+j+wheel.length)%wheel.length]);}
return{
n,ts:ts||Date.now(),wheelIndex:wi,sector:nums,sectorCenter:secIdx>=0?wheel[secIdx]:n,
color:n===0?'green':reds.includes(n)?'red':'black',dozen:di,column:ci,
parity:n===0?'zero':n%2===0?'even':'odd',size:n===0?'zero':n>=19?'high':'low'
};
}

function recordSpinRich(number,now){const rec=spinMeta(number,now);spinRecords.push(rec);if(spinRecords.length>MAX_SPINS)spinRecords.shift();return rec;}

function hotColdForWindow(winSize){
const w=Math.min(winSize,spinRecords.length);
if(!w)return{win:winSize,hot:[],cold:[],recovering:[],overheated:[]};
const tmp=spinRecords.slice(-w).map(r=>r.n);
const saved=spins.slice();spins=tmp;updateStats();
const e=computeHotColdEngine();
spins=saved;updateStats();
return{win:winSize,hot:e.hot.slice(0,8),cold:e.cold.slice(0,8),recovering:e.recovering.slice(0,5),overheated:e.overheated.slice(0,5)};
}

function analyzeWheelNeighborChain(){
if(spinRecords.length<2)return{chain:0,steps:[],path:'—',score:0,cw:0,ccw:0};
const recent=spinRecords.slice(-12);
const steps=[];
for(let i=1;i<recent.length;i++){
const st=wheelStep(recent[i-1].n,recent[i].n);
steps.push({from:recent[i-1].n,to:recent[i].n,step:st});
}
let cw=0,ccw=0;
steps.forEach(st=>{if(st.step>0)cw++;else if(st.step<0)ccw++;});
const path=recent.map(r=>r.n).join(' → ');
return{chain:neighborChain(),steps:steps.slice(-8),path,cw,ccw,score:clamp(neighborChain()*9+Math.max(cw,ccw)*6)};
}

function analyzeClusterPressure(){
const c=getClusters();
const top=c[0]||{score:0,nums:[]};
const sec=getSectorAnalysis();
const pressure=clamp((top.score||0)*3.5+(sec.dominant?sec.dominant.pct:0)*0.4);
return{top,clusters:c.slice(0,3),pressure,sectorDominant:sec.dominant,confidenceBoost:clamp(pressure*0.35,0,28)};
}

function analyzeMigrationFlow(){
const mig=getWheelMigrationDirection();
return{...mig,drift:lastSpinBreakdown.drift||0,strength:wheelDirectionScore(),mode:mig.dir==='CW'?'CW':mig.dir==='CCW'?'CCW':mig.dir==='MIX'?'BREAK':'HOLD'};
}

function analyzeChaosFromSpins(){
const risk=spins.length>=2?computeRiskChaosCore():{chaosLevel:50};
const ent=parseFloat(entropy())||0;
const rep=repeatRate();
const mig=analyzeMigrationFlow();
const dead=mig.dir==='MIX'&&ent>5.4&&rep<20;
return{chaosLevel:risk.chaosLevel,entropy:ent,repeat:rep,deadFlow:dead,noEdge:risk.chaosLevel>=68||ent>5.75||dead,tag:dead?'RANDOM':risk.chaosLevel>=65?'CHAOS':'STABLE'};
}

function computeLiveAIScore(cluster,mig,chaos,neighbors){
const persist=persistenceEngine.maxLife>=6?12:0;
return Math.round(clamp(
cluster.pressure*0.28+mig.strength*0.18+neighbors.score*0.22+
(100-chaos.chaosLevel)*0.18+(100-repeatRate())*0.08+persist
));
}

function resolvePlayState(liveScore,chaos,inv){
if(spins.length<2)return{state:'OBSERVE',play:'NEHRAŤ',cls:'yellowTxt',reason:'Málo dát — len sleduj.'};
if(chaos.noEdge||chaos.chaosLevel>=72)return{state:'CHAOS',play:'NEHRAŤ',cls:'redTxt',reason:'Chaos / náhodná session — nehraj.'};
if(liveScore<38||(inv&&inv.edge==='NO EDGE'))return{state:'SAFE',play:'NEHRAŤ',cls:'redTxt',reason:'Slabá výhoda — bezpečný režim.'};
if(liveScore<48)return{state:'WAIT',play:'ČAKAJ',cls:'yellowTxt',reason:'Slabý signál — počkaj.'};
if(liveScore>=72&&inv&&inv.edge==='CLEAR EDGE')return{state:'ATTACK',play:'ÚTOK',cls:'greenTxt',reason:'Silný edge — jediný ATTACK.'};
if(liveScore>=58)return{state:'CONFIRM',play:'POTVRDIŤ',cls:'greenTxt',reason:'Pattern potvrdený.'};
if(liveScore>=45)return{state:'TRACK',play:'SLEDUJ',cls:'blueTxt',reason:'Flow existuje.'};
return{state:'OBSERVE',play:'SLEDUJ',cls:'yellowTxt',reason:'Zbieraj spiny.'};
}

function runTimingEngineSupport(){
const samples=getBallTimingSamples();
const core=samples.length?computeBallTimingCore(samples):computeTimingCore();
const iv=spinIntervals();
const std=iv.length>=2?ivStd(iv):0;
const chaosTiming=std>6?clamp(std*12,40,95):clamp(100-std*10);
return{role:'TIMING 20% · podpora',core:Math.round(core),stability:lastTimingBreakdown.stability,
rhythm:lastTimingBreakdown.rhythm,chaosFromTiming:chaosTiming,confirmOnly:true,label:timingRunning?'LIVE':'STOP'};
}

function runVisualFromSpins(spinsSlice){
let visualState='TRACK',colorClass='blueTxt';
const ps=spinsSlice.playState;
if(ps.state==='CHAOS'||ps.state==='SAFE'){visualState='CHAOS';colorClass='redTxt';}
else if(ps.state==='ATTACK'){visualState='ATTACK';colorClass='greenTxt';}
else if(ps.state==='WAIT'){visualState='WAIT';colorClass='yellowTxt';}
const cluster=spinsSlice.cluster;
const mig=spinsSlice.migration;
const wheelSig=clamp(cluster.pressure*0.4+mig.strength*0.25);
const boardSig=clamp(55);
const pressureSig=clamp(cluster.pressure);
const heat=scoreVisualHeatSpread();
const align=scoreVisualAlign();
lastVisualBreakdown={wheel:wheelSig,board:boardSig,pressure:pressureSig,heatSpread:heat,align:align,total:0};
const total=Math.round(wheelSig*VISUAL_SIGNAL.wheel+boardSig*VISUAL_SIGNAL.board+
pressureSig*VISUAL_SIGNAL.pressure+heat*VISUAL_SIGNAL.heatSpread+align*VISUAL_SIGNAL.align);
lastVisualBreakdown.total=total;
return{core:total,state:visualState,color:colorClass,displayOnly:true,migration:mig.dir,cluster:cluster.top.nums.join(' · ')};
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

function invalidateSpinsEngine(){spinsEngineCache=null;spinsEngineCacheKey='';spinsEngineDepth=0;}

function skSessionMode(m){const x={WARMUP:'Rozcvička',STABLE_SESSION:'Stabilná relácia',HIGH_CHAOS:'Vysoký chaos',REPEATING:'Opakovanie',MIGRATION_FLOW:'Migrácia',DEAD_RANDOM:'Náhodná / mŕtva',HOT_SECTOR:'Horúci sektor'};return x[m]||m;}
function skAIState(s){const x={OBSERVE:'SLEDOVANIE',TRACK:'SLEDOVANIE+',CONFIRM:'POTVRDENIE',ATTACK:'ÚTOK',SAFE:'BEZPEČNÝ',CHAOS:'CHAOS',WAIT:'ČAKANIE'};return x[s]||s;}
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
aggr=aiStateMachine.aggression||0.55;
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

function resetCoreEngines(){
resetSessionFatigueEngine();
spinMemoryEngine={activePatterns:[],dyingPatterns:[],dominantSectors:{dozen:-1,column:-1},sectorAge:{d1:0,d2:0,d3:0,c1:0,c2:0,c3:0},migrationHistory:[],chaosHistory:[],confidenceHistory:[],predictionSnapshots:[]};
sessionIntel={mode:'WARMUP',label:'Rozcvička',score:0,flags:{}};
aiStateMachine={state:'OBSERVE',label:'Sledovanie',aggression:0.55,confMult:1,allowRisky:true,allowAttack:false};
persistenceEngine={dozenLife:[0,0,0],columnLife:[0,0,0],currentDozen:-1,currentColumn:-1,maxLife:0};
predictionArchive=[];
futureFlowEngine={horizon:5,direction:'NEUTRAL',label:'—',collapseRisk:0,migrationBias:0,steps:[]};
performanceEngine={accuracy:0,confidenceAccuracy:0,chaosAccuracy:0,sessionAccuracy:0,predictionSurvival:0,sampleSize:0};
pipelineMeta={lastSpinAt:0,spinCount:0,renderGeneration:0};
}

function pipelineScorePreviousSpin(number){
if(lastFlowFocus==null&&lastPick==null)return;
totalPredictions++;
const hit=flowSectorHit(number,lastFlowFocus)||(lastPrediction.length&&lastPrediction.includes(number));
if(hit)successfulPredictions++;
learningAdjust(hit);
processAdaptiveLearningOnSpin(number,true,hit);
const lastArch=predictionArchive.length?predictionArchive[predictionArchive.length-1]:null;
if(lastArch&&!lastArch.resolved){lastArch.result=number;lastArch.success=hit;lastArch.survival=hit?100:clamp(lastArch.survival-35,0,100);lastArch.resolved=true;}
}
function pipelineRecordSpin(number,now){
recordSpinRich(number,now);
lastSpinTime=now;spins.push(number);spinTimes.push(now);
if(spins.length>MAX_SPINS){spins.shift();spinTimes.shift();}
pipelineMeta.lastSpinAt=now;pipelineMeta.spinCount=spins.length;
}
function persistenceEngineOnSpin(number){
if(number==null||number<0)return;
const di=dozenIndexForNum(number),ci=columnIndexForNum(number);
if(di>=0){if(persistenceEngine.currentDozen===di)persistenceEngine.dozenLife[di]++;else{persistenceEngine.currentDozen=di;persistenceEngine.dozenLife=[0,0,0];persistenceEngine.dozenLife[di]=1;}}
if(ci>=0){if(persistenceEngine.currentColumn===ci)persistenceEngine.columnLife[ci]++;else{persistenceEngine.currentColumn=ci;persistenceEngine.columnLife=[0,0,0];persistenceEngine.columnLife[ci]=1;}}
persistenceEngine.maxLife=Math.max(persistenceEngine.maxLife,...persistenceEngine.dozenLife,...persistenceEngine.columnLife);
spinMemoryEngine.sectorAge={d1:persistenceEngine.dozenLife[0]||0,d2:persistenceEngine.dozenLife[1]||0,d3:persistenceEngine.dozenLife[2]||0,c1:persistenceEngine.columnLife[0]||0,c2:persistenceEngine.columnLife[1]||0,c3:persistenceEngine.columnLife[2]||0};
}
function spinMemoryEngineOnSpin(){
const ps=adaptiveLearning.patternSurvival,active=[],dying=[];
Object.keys(ps).forEach(k=>{const p=ps[k];const row={key:k,survival:Math.round(p.survival),hits:p.hits,misses:p.misses};if(p.survival>=42)active.push(row);else if(p.survival>0)dying.push(row);});
active.sort((a,b)=>b.survival-a.survival);dying.sort((a,b)=>a.survival-b.survival);
spinMemoryEngine.activePatterns=active.slice(0,8);spinMemoryEngine.dyingPatterns=dying.slice(0,6);
let bestD=0,bestDi=-1;const sums=DOZENS.map(d=>d.reduce((s,n)=>s+(statsCache[n]||0),0));
sums.forEach((v,i)=>{if(v>bestD){bestD=v;bestDi=i;}});
let bestC=0,bestCi=-1;const cols=[0,0,0];for(let n=1;n<=36;n++)cols[(n-1)%3]+=statsCache[n]||0;
cols.forEach((v,i)=>{if(v>bestC){bestC=v;bestCi=i;}});
spinMemoryEngine.dominantSectors={dozen:bestDi,column:bestCi};
const mig=getWheelMigrationDirection();
spinMemoryEngine.migrationHistory.push({dir:mig.dir,at:spins.length,ts:Date.now()});
if(spinMemoryEngine.migrationHistory.length>24)spinMemoryEngine.migrationHistory.shift();
const risk=spins.length>=2?computeRiskChaosCore():{chaosLevel:50};
spinMemoryEngine.chaosHistory.push(Math.round(risk.chaosLevel));
if(spinMemoryEngine.chaosHistory.length>24)spinMemoryEngine.chaosHistory.shift();
const pr=lastAIPredictionCache;
spinMemoryEngine.confidenceHistory.push(pr?pr.confidence:clamp(Math.round(calculateAI())));
if(spinMemoryEngine.confidenceHistory.length>24)spinMemoryEngine.confidenceHistory.shift();
}
function sessionModeEngineRefresh(){
if(spins.length<2){sessionIntel={mode:'WARMUP',label:skSessionMode('WARMUP'),score:0,flags:{}};return;}
const ent=parseFloat(entropy())||0,rep=repeatRate(),mig=getWheelMigrationDirection(),risk=computeRiskChaosCore(),rr=risk.chaosLevel;
let mode='STABLE_SESSION',score=55;const flags={entropy:ent,repeat:rep,migration:mig.dir,chaos:rr};
if(rr>=68||ent>5.8){mode='HIGH_CHAOS';score=22;}else if(rep>=55){mode='REPEATING';score=48;}else if(mig.dir==='CW'||mig.dir==='CCW'){mode='MIGRATION_FLOW';score=72;}else if(ent>5.2&&rep<25&&rr<45){mode='DEAD_RANDOM';score=30;}else if(persistenceEngine.maxLife>=8){mode='HOT_SECTOR';score=78;}
sessionIntel={mode,label:skSessionMode(mode),score,flags};
}
function aiStateMachineRefresh(){
if(spins.length<2){aiStateMachine={state:'OBSERVE',label:skAIState('OBSERVE'),aggression:0.4,confMult:1,allowRisky:false,allowAttack:false};return;}
const inv=getInvisibleLayer(),ent=parseFloat(entropy())||0,risk=computeRiskChaosCore(),cc=risk.clusterConflict||0,mig=getWheelMigrationDirection();
let state='TRACK',aggression=0.65,confMult=1,allowRisky=true,allowAttack=false;
if(sessionIntel.mode==='HIGH_CHAOS'||risk.chaosLevel>=70||ent>5.7||cc>48){state='CHAOS';aggression=0.25;confMult=0.82;allowRisky=false;allowAttack=false;}
else if(sessionIntel.mode==='DEAD_RANDOM'||(inv&&inv.edge==='NO EDGE')){state='SAFE';aggression=0.3;confMult=0.86;allowRisky=false;allowAttack=false;}
else if(performanceEngine.sampleSize>=8&&performanceEngine.confidenceAccuracy<38){state='SAFE';aggression=0.35;confMult=0.88;allowRisky=false;}
else if(inv&&inv.suppress.hideLowConfidence){state='WAIT';aggression=0.4;confMult=0.9;allowRisky=false;}
else if(spins.length<6){state='OBSERVE';aggression=0.45;confMult=0.95;allowRisky=false;}
else if(inv&&inv.edge==='CLEAR EDGE'&&inv.signalQuality==='STRONG'&&sessionIntel.mode!=='HIGH_CHAOS'){state='ATTACK';aggression=0.92;confMult=1.05;allowRisky=true;allowAttack=true;}
else if(inv&&inv.edge==='LOW EDGE'&&mig.dir!=='MIX'){state='CONFIRM';aggression=0.72;allowRisky=true;}
else if(sessionIntel.mode==='MIGRATION_FLOW'){state='TRACK';aggression=0.68;confMult=1.02;}
else if(sessionIntel.mode==='REPEATING'){state='CONFIRM';aggression=0.6;confMult=0.96;}
aiStateMachine={state,label:skAIState(state),aggression,confMult,allowRisky,allowAttack};
}
function selfCorrectingEngineRefresh(){
const recent=predictionArchive.filter(p=>p.resolved).slice(-20);
if(recent.length<4)return;
const avgConf=recent.reduce((s,p)=>s+p.confidence,0)/recent.length;
const hitRate=recent.filter(p=>p.success).length/recent.length;
if(avgConf>=58&&hitRate<0.38){
adaptiveWeights.spin=clamp(adaptiveWeights.spin-0.04,0.85,1.15);
adaptiveWeights.timing=clamp(adaptiveWeights.timing-0.03,0.85,1.15);
predictionEvolution.weightShift.pattern=clamp(predictionEvolution.weightShift.pattern-0.05,0.7,1.3);
runSelfCorrection(false);
aiStateMachine={state:'SAFE',label:skAIState('SAFE'),aggression:0.32,confMult:0.85,allowRisky:false,allowAttack:false};
}
}
function futureFlowEngineRefresh(){
if(spins.length<3){futureFlowEngine={horizon:5,direction:'NEUTRAL',label:'Málo dát',collapseRisk:0,migrationBias:0,steps:[]};return;}
const mig=getWheelMigrationDirection(),dir=mig.dir==='CW'?1:mig.dir==='CCW'?-1:0,last=lastSpinNum(),steps=[];
let cur=last!=null?last:0;
for(let i=0;i<5;i++){const step=dir||(i%2===0?1:-1);const idx=wheel.indexOf(cur);cur=wheel[(idx+step+wheel.length)%wheel.length];steps.push({step:i+1,num:cur});}
const ent=parseFloat(entropy())||0;
futureFlowEngine={horizon:5,direction:mig.dir,label:mig.label,collapseRisk:clamp(ent*8+(sessionIntel.mode==='HIGH_CHAOS'?25:0),0,100),migrationBias:dir,steps};
}
function performanceEngineRefresh(){
const resolved=predictionArchive.filter(p=>p.resolved),n=resolved.length;
if(!n){performanceEngine={accuracy:0,confidenceAccuracy:0,chaosAccuracy:0,sessionAccuracy:0,predictionSurvival:0,sampleSize:0};return;}
const hits=resolved.filter(p=>p.success).length,acc=Math.round(hits/n*100);
const hiConf=resolved.filter(p=>p.confidence>=60);
const confAcc=hiConf.length?Math.round(hiConf.filter(p=>p.success).length/hiConf.length*100):acc;
const surv=Math.round(resolved.reduce((s,p)=>s+(p.survival||0),0)/n);
performanceEngine={accuracy:acc,confidenceAccuracy:confAcc,chaosAccuracy:acc,sessionAccuracy:acc,predictionSurvival:surv,sampleSize:n};
}
function pipelineArchivePrediction(pr){
if(!pr)return;
const risk=computeRiskChaosCore();
predictionArchive.push({id:predictionEvolution.generation,prediction:pr.dominantTarget||pr.sector||'—',confidence:pr.confidence,rawConfidence:pr.rawConfidence,chaos:Math.round(risk.chaosLevel),timing:pr.timingCore,sector:pr.sector,sessionMode:sessionIntel.mode,aiState:aiStateMachine.state,result:null,success:null,survival:70,resolved:false,ts:Date.now(),spinIndex:spins.length});
if(predictionArchive.length>80)predictionArchive.shift();
spinMemoryEngine.predictionSnapshots=predictionArchive.slice(-12);
}
function pipelineUpdatePredictions(){updatePredictions();pipelineArchivePrediction(computeAIPrediction());}
function onNewSpin(number){
const now=Date.now();
emitEvent(EVENT.BEFORE_SPIN,{number,now});
pipelineScorePreviousSpin(number);
pipelineRecordSpin(number,now);
sessionFatigueOnSpin(now);
if(lastPick==null)processAdaptiveLearningOnSpin(number,false,false);
invalidatePredCache();
updateStats();
updateMemoryBank();
runSpinsEnginePipeline();
persistenceEngineOnSpin(number);
spinMemoryEngineOnSpin();
pipelineUpdatePredictions();
sessionModeEngineRefresh();
aiStateMachineRefresh();
selfCorrectingEngineRefresh();
futureFlowEngineRefresh();
performanceEngineRefresh();
emitEvent(EVENT.SPIN_PROCESSED,{number,now,sessionMode:sessionIntel.mode,aiState:aiStateMachine.state});
persistSession();
emitEvent(EVENT.RENDER,{light:true,heavy:spins.length%HEAVY_RENDER_INTERVAL===0});
}
function onUndoSpin(){
if(!spins.length)return;
const removed=spins.pop();
if(spinRecords.length)spinRecords.pop();
if(spinTimes.length)spinTimes.pop();
if(predictionHistory.length)predictionHistory.pop();
if(predictionArchive.length)predictionArchive.pop();
const prevPred=predictionHistory.length?predictionHistory[predictionHistory.length-1]:null;
if(totalPredictions>0){totalPredictions--;if(prevPred&&removed===prevPred.number&&successfulPredictions>0)successfulPredictions--;}
if(spins.length){const cluster=getClusters()[0];lastPrediction=cluster.nums.slice();lastPick=predictPrimaryTip();}else{lastPick=null;lastPrediction=[];}
invalidatePredCache();updateStats();updateMemoryBank();
if(spins.length)persistenceEngineOnSpin(spins[spins.length-1]);
sfaTrimAfterUndo();
sessionModeEngineRefresh();aiStateMachineRefresh();performanceEngineRefresh();
emitEvent(EVENT.UNDO,{removed});persistSession();
emitEvent(EVENT.RENDER,{light:true,heavy:true});
}
function computeSpinMemoryEngine(){
if(spins.length<2)return{ready:false,note:'Čakám na 2+ spiny'};
return{ready:true,modelLabel:'Engine pamäte spinov',active:spinMemoryEngine.activePatterns.slice(0,5),dying:spinMemoryEngine.dyingPatterns.slice(0,3),sectorAge:spinMemoryEngine.sectorAge};
}
function computeSessionIntelEngine(){return{ready:hasMinSpins(),mode:sessionIntel.mode,label:sessionIntel.label,score:sessionIntel.score};}
function computeAIStateMachineEngine(){return{ready:true,state:aiStateMachine.state,label:aiStateMachine.label,aggression:Math.round(aiStateMachine.aggression*100),confMult:aiStateMachine.confMult};}
function computePersistenceEnginePanel(){return{ready:spins.length>=1,maxLife:persistenceEngine.maxLife,dozen:persistenceEngine.dozenLife};}
function computePerformanceEnginePanel(){return Object.assign({ready:performanceEngine.sampleSize>0},performanceEngine);}
function computeFutureFlowPanel(){
if(spins.length<3)return{ready:false,note:'Čakám na 3+ spiny'};
return{ready:true,direction:futureFlowEngine.direction,collapse:futureFlowEngine.collapseRisk,steps:futureFlowEngine.steps};
}
function renderSpinPipeline(){
const el=document.getElementById('spinPipeline');if(!el)return;
el.innerHTML='<div class="section-label">'+skUiLabel('Live Spin Pipeline')+'</div><div class="panel-line"><span>Spiny</span><b class="greenTxt">'+pipelineMeta.spinCount+'</b></div><div class="panel-line"><span>'+skUiLabel('Render')+'</span><b class="blueTxt">'+pipelineMeta.renderGeneration+'</b></div><div class="panel-line"><span>Relácia</span><b class="yellowTxt">'+sessionIntel.label+'</b></div><div class="panel-line"><span>AI</span><b class="greenTxt">'+aiStateMachine.label+'</b></div>';
}
function renderSpinMemory(){
const el=document.getElementById('spinMemoryPanel');if(!el)return;const M=computeSpinMemoryEngine();
if(!M.ready){el.innerHTML='<div class="alert">'+M.note+'</div>';return;}
el.innerHTML='<div class="section-label">'+M.modelLabel+'</div><div class="panel-line"><span>Aktívne</span><b class="greenTxt">'+M.active.length+'</b></div><div class="panel-line"><span>Zanikajúce</span><b class="redTxt">'+M.dying.length+'</b></div><div class="panel-line"><span>Tucety život</span><b>'+M.sectorAge.d1+'·'+M.sectorAge.d2+'·'+M.sectorAge.d3+'</b></div>';
}
function renderSessionIntel(){
const el=document.getElementById('sessionIntelPanel');if(!el)return;const S=computeSessionIntelEngine();
if(!S.ready){el.innerHTML='<div class="alert">Čakám…</div>';return;}
el.innerHTML='<div class="section-label">Inteligencia relácie</div><div class="panel-line"><span>Režim</span><b class="greenTxt">'+S.label+'</b></div><div class="panel-line"><span>Skóre</span><b class="yellowTxt">'+S.score+'</b></div>';
}
function renderAIStatePanel(){
const el=document.getElementById('aiStatePanel');if(!el)return;const A=computeAIStateMachineEngine();
el.innerHTML='<div class="section-label">'+skUiLabel('AI State Machine')+'</div><div class="panel-line"><span>Stav</span><b class="greenTxt">'+A.label+'</b></div><div class="panel-line"><span>Agresivita</span><b class="yellowTxt">'+A.aggression+'%</b></div><div class="panel-line"><span>'+skUiLabel('Mult')+'</span><b class="blueTxt">'+A.confMult.toFixed(2)+'</b></div>';
}
function renderPersistencePanel(){
const el=document.getElementById('persistenceEnginePanel');if(!el)return;const P=computePersistenceEnginePanel();
el.innerHTML='<div class="section-label">'+skUiLabel('Persistence')+'</div><div class="panel-line"><span>Max život</span><b class="greenTxt">'+P.maxLife+'</b></div><div class="panel-line"><span>Tucety</span><b>'+P.dozen[0]+'·'+P.dozen[1]+'·'+P.dozen[2]+'</b></div>';
}
function renderPredictionArchive(){
const el=document.getElementById('predictionArchivePanel');if(!el)return;const rows=predictionArchive.slice(-6).reverse();
if(!rows.length){el.innerHTML='<div class="alert">—</div>';return;}
let h='<div class="section-label">'+skUiLabel('Archive')+'</div>';rows.forEach(r=>{const c=r.resolved?(r.success?'greenTxt':'redTxt'):'yellowTxt';h+='<div class="panel-line"><span>#'+r.id+' '+r.prediction+'</span><b class="'+c+'">'+(r.resolved?(r.success?'OK':'X'):'?')+'</b></div>';});
el.innerHTML=h;
}
function renderPerformancePanel(){
const el=document.getElementById('performancePanel');if(!el)return;const P=computePerformanceEnginePanel();
if(!P.ready){el.innerHTML='<div class="alert">Čakám…</div>';return;}
el.innerHTML='<div class="section-label">'+skUiLabel('Performance')+'</div><div class="panel-line"><span>Presnosť</span><b class="greenTxt">'+P.accuracy+'%</b></div><div class="panel-line"><span>'+skUiLabel('Conf')+'</span><b class="yellowTxt">'+P.confidenceAccuracy+'%</b></div>';
}
function renderFutureFlowPanel(){
const el=document.getElementById('futureFlowPanel');if(!el)return;const F=computeFutureFlowPanel();
if(!F.ready){el.innerHTML='<div class="alert">'+F.note+'</div>';return;}
let h='<div class="section-label">'+skUiLabel('Future Flow')+'</div><div class="panel-line"><span>Kolaps</span><b class="redTxt">'+F.collapse+'%</b></div>';
F.steps.slice(0,4).forEach(s=>{h+='<div class="panel-line"><span>'+s.step+'</span><b class="yellowTxt">'+s.num+'</b></div>';});
el.innerHTML=h;
}
function renderCoreEnginesHeavy(){
renderSpinPipeline();renderSpinMemory();renderSessionIntel();renderAIStatePanel();
renderPersistencePanel();renderPredictionArchive();renderPerformancePanel();renderFutureFlowPanel();
}
onEvent(EVENT.RENDER,function(opts){
pipelineMeta.renderGeneration++;
if(typeof requestAnimationFrame==='undefined'){renderLight(opts||{});if(opts&&opts.heavy)renderHeavy();return;}
if(renderQueued)return;renderQueued=true;
requestAnimationFrame(function(){renderLight(opts||{});if(opts&&opts.heavy)renderHeavy();renderQueued=false;});
});
function dozenIndexForNum(n){if(n===0)return -1;if(n<=12)return 0;if(n<=24)return 1;return 2;}
function columnIndexForNum(n){if(n===0)return -1;return (n-1)%3;}
function currentPatternKey(){
if(spins.length<2)return 'empty';
const c=getClusters()[0];
const mig=getWheelMigrationDirection();
const head=(c&&c.nums)?c.nums.slice(0,3).join('-'):'0';
return head+'|'+mig.dir+'|'+lastSpinBreakdown.cluster.toFixed(0);
}
function getNumLearnWeight(n){const k=String(n);const w=adaptiveLearning.numWeight[k];return w!=null?w:50;}
function setNumLearnWeight(n,delta){const k=String(n);const cur=adaptiveLearning.numWeight[k]!=null?adaptiveLearning.numWeight[k]:50;adaptiveLearning.numWeight[k]=clamp(cur+delta,5,95);}
function decayPatternSurvival(){const ps=adaptiveLearning.patternSurvival;Object.keys(ps).forEach(key=>{ps[key].survival=clamp(ps[key].survival*0.94,0,100);});}
function touchPatternSurvival(key,hit){
if(!adaptiveLearning.patternSurvival[key])adaptiveLearning.patternSurvival[key]={survival:45,hits:0,misses:0,lastGen:predictionEvolution.generation};
const p=adaptiveLearning.patternSurvival[key];
if(hit){p.hits++;p.survival=clamp(p.survival+14,0,100);}else{p.misses++;p.survival=clamp(p.survival-10,0,100);}
p.lastGen=predictionEvolution.generation;
}
function updateSectorPersistenceOnSpin(actualNum){
const di=dozenIndexForNum(actualNum),ci=columnIndexForNum(actualNum);
if(di>=0){const k='d'+(di+1);adaptiveLearning.sectorPersist[k]=clamp((adaptiveLearning.sectorPersist[k]||50)+4,0,100);for(let i=1;i<=3;i++){const kk='d'+i;if(kk!==k)adaptiveLearning.sectorPersist[kk]=clamp((adaptiveLearning.sectorPersist[kk]||50)-1.5,0,100);}}
if(ci>=0){const k='c'+(ci+1);adaptiveLearning.sectorPersist[k]=clamp((adaptiveLearning.sectorPersist[k]||50)+4,0,100);for(let i=1;i<=3;i++){const kk='c'+i;if(kk!==k)adaptiveLearning.sectorPersist[kk]=clamp((adaptiveLearning.sectorPersist[kk]||50)-1.5,0,100);}}
}
function getSectorLearnBoost(n){
let b=1;const di=dozenIndexForNum(n),ci=columnIndexForNum(n);
if(di>=0)b*=0.88+(adaptiveLearning.sectorPersist['d'+(di+1)]||50)/200;
if(ci>=0)b*=0.88+(adaptiveLearning.sectorPersist['c'+(ci+1)]||50)/200;
return b;
}
function getPatternSurvivalBoost(){
const ps=adaptiveLearning.patternSurvival,keys=Object.keys(ps);
if(!keys.length)return 1;
let best=0;keys.forEach(k=>{if(ps[k].survival>best)best=ps[k].survival;});
return 0.9+best/250;
}
function shiftAutoWeights(hit){
const ws=predictionEvolution.weightShift,d=hit?0.025:-0.035;
ws.spin=clamp(ws.spin+d+(hit?0.01:0),0.75,1.25);
ws.timing=clamp(ws.timing+d*0.7,0.75,1.25);
ws.visual=clamp(ws.visual+d*0.5,0.75,1.25);
ws.pattern=clamp(ws.pattern+(hit?0.03:-0.04),0.7,1.3);
ws.sector=clamp(ws.sector+(hit?0.025:-0.03),0.7,1.3);
adaptiveWeights.spin=clamp(adaptiveWeights.spin*(0.97+ws.spin*0.03),0.85,1.15);
adaptiveWeights.timing=clamp(adaptiveWeights.timing*(0.98+ws.timing*0.02),0.85,1.15);
adaptiveWeights.visual=clamp(adaptiveWeights.visual*(0.98+ws.visual*0.02),0.85,1.15);
}
function runSelfCorrection(hit){
const rate=totalPredictions>0?successfulPredictions/totalPredictions:0.5;
let delta=hit?3:-5;
if(rate>=0.55)delta+=2;
if(rate<=0.35)delta-=4;
if(adaptiveWeights.failStreak>=3)delta-=6;
predictionEvolution.selfCorrection=clamp(predictionEvolution.selfCorrection+delta,-18,18);
predictionEvolution.lastDelta=delta;
}
function getLearningConfidenceBoost(){
const mem=adaptiveLearning.memorySuccess,rein=adaptiveLearning.reinforcement,pat=getPatternSurvivalBoost();
const sc=1+predictionEvolution.selfCorrection/100,ws=predictionEvolution.weightShift,wavg=(ws.spin+ws.timing+ws.visual)/3;
return clamp((0.88+mem/350)*(0.9+rein/400)*pat*sc*(0.92+wavg*0.08),0.82,1.18);
}
function processAdaptiveLearningOnSpin(actualNum,hadPrediction,hit){
if(hadPrediction){
if(hit){adaptiveLearning.hits++;setNumLearnWeight(actualNum,9);if(lastPick!=null)setNumLearnWeight(lastPick,5);}
else{adaptiveLearning.misses++;setNumLearnWeight(actualNum,6);if(lastPick!=null)setNumLearnWeight(lastPick,-8);}
decayPatternSurvival();touchPatternSurvival(currentPatternKey(),hit);
}
updateSectorPersistenceOnSpin(actualNum);
const total=adaptiveLearning.hits+adaptiveLearning.misses;
adaptiveLearning.memorySuccess=total?clamp(Math.round(adaptiveLearning.hits/total*100),0,100):50;
adaptiveLearning.reinforcement=clamp(adaptiveLearning.reinforcement+(hit?5:-7),0,100);
}
function advancePredictionGeneration(pr){
if(!pr)return;
predictionEvolution.generation++;
predictionEvolution.generations.push({gen:predictionEvolution.generation,tip:pr.dominantTarget||pr.sector,confidence:pr.confidence,rawConfidence:pr.rawConfidence,spinIndex:spins.length,ts:Date.now()});
if(predictionEvolution.generations.length>40)predictionEvolution.generations.shift();
predictionEvolution.confidenceTrail.push(pr.confidence);
if(predictionEvolution.confidenceTrail.length>24)predictionEvolution.confidenceTrail.shift();
}
function computeAdaptiveLearningEngine(){
if(spins.length<2)return{ready:false,modelLabel:'Adaptívne učenie',note:'Čakám na 2+ spiny'};
const patterns=Object.keys(adaptiveLearning.patternSurvival).map(k=>{const p=adaptiveLearning.patternSurvival[k];return{key:k,survival:Math.round(p.survival),hits:p.hits,misses:p.misses};}).sort((a,b)=>b.survival-a.survival).slice(0,5);
const topNums=Object.keys(adaptiveLearning.numWeight).map(k=>({n:+k,w:Math.round(adaptiveLearning.numWeight[k])})).sort((a,b)=>b.w-a.w).slice(0,6);
return{ready:true,modelLabel:'Adaptívne učenie · pamäť · reinforcement · survival · sektory',memorySuccess:adaptiveLearning.memorySuccess,reinforcement:Math.round(adaptiveLearning.reinforcement),hits:adaptiveLearning.hits,misses:adaptiveLearning.misses,patterns,topNums,sectorPersist:adaptiveLearning.sectorPersist,patternBoost:Math.round((getPatternSurvivalBoost()-1)*100)};
}
function computePredictionEvolutionEngine(){
if(spins.length<2)return{ready:false,modelLabel:'Evolúcia predikcie',note:'Čakám na 2+ spiny'};
const trail=predictionEvolution.confidenceTrail;
let trend=0;if(trail.length>=2)trend=trail[trail.length-1]-trail[trail.length-2];
return{ready:true,modelLabel:'Evolúcia predikcie · generácie · váhy · samokorekcia',generation:predictionEvolution.generation,selfCorrection:predictionEvolution.selfCorrection,lastDelta:predictionEvolution.lastDelta,confidenceTrend:trend,confidenceTrail:trail.slice(-8),recentGenerations:predictionEvolution.generations.slice(-6),weightShift:predictionEvolution.weightShift,learningBoost:Math.round((getLearningConfidenceBoost()-1)*100)};
}
function renderAdaptiveLearning(){
const el=document.getElementById('adaptiveLearning');
if(!el)return;
const L=computeAdaptiveLearningEngine();
if(!L.ready){el.innerHTML='<div class="alert">'+L.note+'</div>';return;}
const sp=L.sectorPersist;
let html='<div class="section-label">'+L.modelLabel+'</div>';
html+='<div class="panel-line"><span>Pamäť úspechov</span><b class="greenTxt">'+L.memorySuccess+'%</b></div>';
html+='<div class="panel-line"><span>Posilňovanie</span><b class="yellowTxt">'+L.reinforcement+'%</b></div>';
html+='<div class="panel-line"><span>Trafenia / minutia</span><b class="blueTxt">'+L.hits+' / '+L.misses+'</b></div>';
html+='<div class="panel-line"><span>Prežitie patternov</span><b class="greenTxt">+'+L.patternBoost+'%</b></div>';
html+='<div class="panel-line"><span>Tucety</span><b>'+Math.round(sp.d1)+' · '+Math.round(sp.d2)+' · '+Math.round(sp.d3)+'</b></div>';
html+='<div class="panel-line"><span>Stĺpce</span><b>'+Math.round(sp.c1)+' · '+Math.round(sp.c2)+' · '+Math.round(sp.c3)+'</b></div>';
if(L.topNums.length){html+='<div class="section-label">Top váhy čísel</div>';L.topNums.forEach(t=>{html+='<div class="panel-line"><span>#'+t.n+'</span><b class="greenTxt">'+t.w+'%</b></div>';});}
if(L.patterns.length){html+='<div class="section-label">Prežitie patternov (detail)</div>';L.patterns.forEach(p=>{html+='<div class="panel-line"><span>'+p.key.slice(0,24)+'</span><b class="yellowTxt">'+p.survival+'%</b></div>';});}
el.innerHTML=html;
}
function renderPredictionEvolution(){
const el=document.getElementById('predictionEvolution');
if(!el)return;
const E=computePredictionEvolutionEngine();
if(!E.ready){el.innerHTML='<div class="alert">'+E.note+'</div>';return;}
const ws=E.weightShift;
let html='<div class="section-label">'+E.modelLabel+'</div>';
html+='<div class="panel-line"><span>Generácia</span><b class="greenTxt">#'+E.generation+'</b></div>';
html+='<div class="panel-line"><span>Samokorekcia</span><b class="'+(E.selfCorrection>=0?'greenTxt':'redTxt')+'">'+E.selfCorrection+'</b></div>';
html+='<div class="panel-line"><span>Trend spoľ.</span><b class="yellowTxt">'+(E.confidenceTrend>=0?'+':'')+E.confidenceTrend+'</b></div>';
html+='<div class="panel-line"><span>Boost učenia</span><b class="blueTxt">+'+E.learningBoost+'%</b></div>';
html+='<div class="panel-line"><span>Váhy S·T·V·P</span><b style="font-size:11px">'+ws.spin.toFixed(2)+' · '+ws.timing.toFixed(2)+' · '+ws.visual.toFixed(2)+' · '+ws.pattern.toFixed(2)+'</b></div>';
if(E.confidenceTrail.length){html+='<div class="section-label">Graf spoľahlivosti</div>'+renderConfidenceTrailBars(E.confidenceTrail);}
if(E.recentGenerations.length){html+='<div class="section-label">Generácie</div>';E.recentGenerations.slice().reverse().forEach(g=>{html+='<div class="panel-line"><span>#'+g.gen+' · '+g.tip+'</span><b class="yellowTxt">'+g.confidence+'%</b></div>';});}
el.innerHTML=html;
}

const SPIN_SIGNAL={cluster:0.22,chain:0.18,hotCold:0.15,entropy:0.12,gap:0.08,dozen:0.10,streak:0.08,drift:0.07};
const TIMING_SIGNAL={rhythm:0.30,pace:0.25,trend:0.20,flow:0.15,stability:0.10};
const VISUAL_SIGNAL={wheel:0.30,board:0.25,pressure:0.20,heatSpread:0.15,align:0.10};
const DOZENS=[[1,2,3,4,5,6,7,8,9,10,11,12],[13,14,15,16,17,18,19,20,21,22,23,24],[25,26,27,28,29,30,31,32,33,34,35,36]];
const cache={clusters:null,entropy:null,chain:null};
function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,v));}
function renderConfidenceTrailBars(trail){
if(!trail||!trail.length)return '';
let h='<div class="conf-trail">';
trail.forEach(function(v){
const hgt=clamp(v,8,100);
h+='<div class="conf-trail-bar" style="height:'+hgt+'%" title="'+v+'%"></div>';
});
return h+'</div>';
}
function exportSessionJson(){
try{
const payload=buildSessionPayload();
const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
const a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download='qrp7-session-'+new Date().toISOString().slice(0,10)+'.json';
a.click();
URL.revokeObjectURL(a.href);
showSessionToast('Relácia exportovaná (JSON)');
}catch(e){showSessionToast('Export zlyhal');}
}
function skActionLabel(a){const m={WARMUP:'ROZCVIČKA',WATCH:'SLEDUJ',NO_BET:'BEZ HRANIA',WAIT:'ČAKAJ',BET:'VÝHODA OK'};return m[a]||a;}
function skRisk(r){const m={HIGH:'VYSOKÉ',LOW:'NÍZKE',MEDIUM:'STREDNÉ',EXTREME:'EXTRÉMNE'};return m[r]||r;}
function skTrust(t){const m={'NO TRUST':'ŽIADNA DÔVERA','LOW TRUST':'NÍZKA DÔVERA','HIGH TRUST':'VYSOKÁ DÔVERA','MEDIUM TRUST':'STREDNÁ DÔVERA'};return m[t]||t;}
function skSignal(q){const m={STRONG:'SILNÝ',WEAK:'SLABÝ',MEDIUM:'STREDNÝ'};return m[q]||q;}
function skEdge(e){const m={'CLEAR EDGE':'JASNÁ VÝHODA','LOW EDGE':'NÍZKA VÝHODA','NO EDGE':'BEZ VÝHODY','LIVE EDGE':'ŽIVÁ VÝHODA'};return m[e]||e;}
function skFlow(f){const m={STABLE:'STABILNÝ',COLLAPSING:'KOLAPS',RANDOM:'NÁHODNÝ',MIGRATING:'MIGRUJÚCI',WAIT:'ČAKANIE',SAFE:'BEZPEČNÝ',ACTIVE:'AKTÍVNY',AGGRESSIVE:'AGRESÍVNY',OBSERVATION:'POZOROVANIE','FLOW ACTIVE':'AKTÍVNY FLOW',BREAKOUT:'PRELOM',REVERSAL:'NÁVRAT','DEAD SPINS':'MŔTVE SPINY',WARNING:'VAROVANIE','STABLE FLOW':'STABILNÝ TOK','MIGRATING FLOW':'MIGRUJÚCI TOK',NORMAL:'NORMÁLNY',REPEAT:'OPAKOVANIE',ALTERNATING:'STRIEBRENIE',CHAOTIC:'CHAOTICKÝ','DEAD FLOW':'MŔTVY FLOW','NO CLEAR DOMINANCE':'BEZ JASNEJ DOMINANCIE','LOW EDGE FLOW':'SLABÝ EDGE','CHAOTIC FLOW':'CHAOTICKÝ FLOW','CHAOS / WAIT MODE':'CHAOS / REŽIM ČAKANIA','ALTERNATING — LOW EDGE':'STRIEBRENIE — SLABÝ EDGE','LIVE FLOW SEKTOR':'ŽIVÝ FLOW SEKTOR','VERY STABLE':'VEĽMI STABILNÝ',UNSTABLE:'NESTABILNÝ','HIGHLY CHAOTIC':'VEĽMI CHAOTICKÝ','HIGH QUALITY':'VYSOKÁ KVALITA','MEDIUM QUALITY':'STREDNÁ KVALITA','LOW QUALITY':'NÍZKA KVALITA','HIGH RISK':'VYSOKÉ RIZIKO','MEDIUM RISK':'STREDNÉ RIZIKO','LOW RISK':'NÍZKE RIZIKO','LOW NOISE':'NÍZKY ŠUM','MEDIUM NOISE':'STREDNÝ ŠUM','HIGH NOISE':'VYSOKÝ ŠUM'};return m[f]||f;}
function skLfpPhase(p){const m={LEARNING:'UČENIE',EARLY:'SKORÝ',ACTIVE:'AKTÍVNY',FULL:'PLNÝ'};return m[p]||p;}
function skConfState(s){const m={WAIT:'ČAKAJ',PENDING:'ČAKÁ',CONFIRMED:'POTVRDENÉ'};return m[s]||s;}
function skTier(t){const m={WEAK:'SLABÁ',MEDIUM:'STREDNÁ','VERY_STRONG':'VEĽMI SILNÁ'};return m[t]||t;}
function skUiLabel(s){
if(!s||s==='—')return s;
const m={
'Live Spin Pipeline':'Živý pipeline spinov','Render':'Cyklus vykreslenia','AI State Machine':'Stavový automat AI',
'Persistence':'Perzistencia','Archive':'Archív','Performance':'Výkon','Future Flow':'Budúci tok',
'Health engine':'Zdravie engine','Stability':'Stabilita','Live metrics':'Živé metriky','Core pulse':'Pulz jádra',
'STATE':'STAV','Flow · Signal · Edge':'Tok · signál · výhoda','System':'Systém','Spin count':'Počet spinov',
'AI score':'AI skóre','Weighted · frequency · decay':'Technické váženie (debug)',
'Recovery cold':'Možný návrat','Overheated':'Prehriaty flow','Sector heat':'Aktívny sektor',
'Repeat':'Opakovanie','Path':'Dráha','Echo':'Ozvena','Interval':'Interval','Momentum':'Momentum',
'Spin sequence · neighbor · repeat · path':'Sekvencia · susedstvo · opakovanie',
'Sequence':'Sekvencia','Neighbor chain':'Reťaz susedov','Repeat rate':'Miera opakovania',
'AI Prediction':'AI predikcia','Align klaster':'Zhoda klastra','AI Comment':'AI komentár','Predikcia':'Predikcia',
'Blend':'Zmiešanie','Insight':'Pohľad','data':'dáta','reasoning':'logika',
'Clockwise flow':'Tok po smere','Counter flow':'Tok proti smeru','Migration direction':'Smer migrácie',
'Quantum Wheel · direction · neighbors':'Kvantové koleso · smer · susedia',
'Wheel pressure':'Tlak kolesa','Koleso pressure':'Tlak kolesa','Direction engine':'Engine smeru','Neighbor transition':'Prechod susedov',
'Align quantum':'Zhoda kvanta','Chaos level':'Úroveň chaosu','Randomness pressure':'Tlak náhodnosti',
'Cluster conflict':'Konflikt klastra','Chaos penalty':'Penalizácia chaosu','confidence':'spoľahlivosť',
'Heat concentration':'Koncentrácia tepla','Heatmap spread':'Rozptyl heatmapy','Pressure engine':'Engine tlaku',
'Visual core':'Vizuálne jadro','Active zones':'Aktívne zóny','ACTIVE':'AKTÍVNE','AKTÍVNY':'AKTÍVNY',
'Top heat (raw)':'Top teplo (raw)','Active sector':'Aktívny sektor','Cluster intensity':'Intenzita klastra',
'Conf':'Spoľahlivosť','Mult':'Násobič','Fail · timing':'Zlyhanie · timing','Spins · last':'Spiny · posledný',
'Sync · signal':'Sync · signál','Tip · confidence':'Tip · spoľahlivosť',
'Vstupy · entropy · vol · timing · cluster':'Vstupy · entropia · vol · timing · klaster',
'HLAVNÝ INSIGHT':'HLAVNÝ POHĽAD','REPEAT FLOW':'OPAKOVANÝ FLOW','REPEAT SESSION':'REŽIM OPAKOVANIA',
'Echo patterny':'Ozvenové patterny','Dominant sektor':'Dominantný sektor','Tip · sektor':'Tip · sektor',
'Zdroje':'Zdroje','Trend':'Trend','Smer':'Smer','Kolaps':'Kolaps','Generácia':'Generácia',
'DEBUG MODE':'LADIACI REŽIM','RNG BEHAVIOR ANALYSIS':'ANALÝZA RNG SPRÁVANIA','WAIT MODE':'REŽIM ČAKANIA',
'PURE RANDOM PICKER':'ČISTÝ RANDOM VÝBER','PURE RANDOM MODE':'ČISTÁ NÁHODNOSŤ',
'behavior radar':'radar správania','observer':'pozorovateľ','gambler fallacy':'gamblerový omyl',
'LIVE FLOW ENGINE':'ŽIVÝ FLOW ENGINE','EDGE AKTÍVNY':'VÝHODA AKTÍVNA','NO TRUST':'ŽIADNA DÔVERA',
'LOW TRUST':'NÍZKA DÔVERA','HIGH TRUST':'VYSOKÁ DÔVERA','FLOW ALIGNED':'FLOW ZLADENÝ',
'FLOW CONFLICT':'FLOW KONFLIKT','MIXED':'ZMIEŠANÝ','NO EDGE':'BEZ VÝHODY',
'Ball timing':'Čas guličky','Timing confidence':'Spoľahlivosť timingu','Timing chaos · σ':'Chaos timingu · σ',
'Timer':'Časovač','Flow score':'Skóre flow','Fokus pas':'Fokus pásma','Migracia':'Migrácia',
'ŽIVÝ WHEEL FLOW SCANNER':'ŽIVÝ RADAR TOKU KOLESA',
'LIVE FLOW + ANOMALY AI · 70/20/10':'ŽIVÝ FLOW + ANOMÁLIA · 70/20/10',
'AI PREDIKCIA · samostatný flow engine · 70% SPINY · 20% TIMING · 10% VIZUÁL':'AI predikcia · 70% spiny · 20% timing · 10% vizuál',
'live timing-flow profil':'profil toku z času guličky','Dominantny pas':'Dominantný pás',
'FLOW STABILITY: ':'STABILITA FLOW: ','Flow memory':'Pamäť flow','Chaos / wait':'Chaos / čakaj',
'SKORÝ LIVE FLOW':'SKORÝ ŽIVÝ FLOW','PLNÁ LIVE ANALÝZA':'PLNÁ ŽIVÁ ANALÝZA',
'SWITCHING SESSION':'MENIACA RELÁCIA','CHAOTIC SESSION':'CHAOTICKÁ RELÁCIA','REPEAT SESSION':'OPAKOVACIA RELÁCIA',
'DOMINANCE SESSION':'DOMINANCIA RELÁCIA','REVERSAL SESSION':'NÁVRATOVÁ RELÁCIA',
'FLOW SYNCHRONIZED':'FLOW ZLADENÝ','Return force:':'Sila návratu:',
'RNG behavior analysis':'analýza RNG správania','invisible engine':'skrytá vrstva',
'chaos/risk filter':'filter chaos/riziko','behavior observer':'pozorovateľ správania',
'Predikcie · AI engine':'Predikcie · engine','70% SPINY · 20% TIMING · 10% VIZUÁL AI':'70% spiny · 20% timing · 10% vizuál'
};
if(m[s])return m[s];
const f=skFlow(s);if(f!==s)return f;
const t=skTrust(s);if(t!==s)return t;
const e=skEdge(s);if(e!==s)return e;
const r=skRisk(s);if(r!==s)return r;
return s;
}
function sk(s){
if(!s||s==='—')return s;
const x=String(s);
const u=skUiLabel(x);if(u!==x)return u;
const p=skPredRezim(x);if(p!==x)return p;
const l=skFlowLabel(x);if(l!==x)return l;
const st=skStrategyMode(x);if(st!==x)return st;
const lv=skLiveState(x);if(lv!==x)return lv;
return x;
}
function skStrategyMode(m){const x={SAFE:'BEZPEČNÁ',MEDIUM:'STREDNÁ',AGGRESSIVE:'AGRESÍVNA'};return x[m]||m;}
function skTag(t){const m={HIGH:'VYSOKÉ',LOW:'NÍZKE',MID:'STREDNÉ'};return m[t]||t;}
function skLiveState(s){const m={LIVE:'ŽIVÝ',ACTIVE:'ŽIVÝ',OFFLINE:'NEPOČÍTA',DEGRADED:'ZOŠLAMENÝ',WARMUP:'ROZCVIČKA',STABLE:'STABILNÝ','TIMING LIVE':'TIMING ŽIVÝ'};return m[s]||s;}
function skPlayState(s){return skAIState(s)||s;}
function skFlowLabel(fl){
if(fl==='CW FLOW')return'TOK CW';
if(fl==='CCW FLOW')return'TOK CCW';
if(fl==='MIX FLOW')return'ZMIEŠANÝ TOK';
return skFlow(fl)||fl;
}
function qwWheelFlowDirection(mig,chaos,stability){
if(!mig)return{main:'—',sub:'—'};
const osc=chaos?chaos.chaosLevel:50;
if(osc>=68)return{main:'NÁHODNÁ MIGRÁCIA',sub:'Nestabilný pohyb po kolese'};
if(stability==='VERY STABLE'||stability==='STABLE'){
if(mig.dir==='CW')return{main:'TOK PO SMERE',sub:'STABILNÁ MIGRÁCIA'};
if(mig.dir==='CCW')return{main:'TOK PROTI SMERU',sub:'STABILNÁ MIGRÁCIA'};
}
if(mig.dir==='CW')return{main:'TOK PO SMERE',sub:'Migrácia po smere'};
if(mig.dir==='CCW')return{main:'TOK PROTI SMERU',sub:'Migrácia proti smeru'};
return{main:'NÁHODNÁ MIGRÁCIA',sub:'Bez stabilného smeru'};
}
function qwFlowContinuity(chaos){
if(!chaos)return{label:'—',cls:'yellowTxt'};
if(chaos.chaosLevel>=72||chaos.noEdge)return{label:'ROZPADÁ SA',cls:'redTxt'};
if(chaos.chaosLevel>=55||chaos.deadFlow)return{label:'NESTABILNÝ',cls:'yellowTxt'};
if(chaos.tag==='RANDOM')return{label:'BEZ KONTINUITY',cls:'yellowTxt'};
return{label:'DRŽÍ',cls:'greenTxt'};
}
function qwNumsForColumn(colIdx){
return wheel.filter(n=>n>0&&columnIndexForNum(n)===colIdx);
}
function qwWheelHealthExplain(health,chaos,mig){
if(health<38)return'Koleso momentálne nevytvára stabilné návraty.';
if(chaos&&chaos.chaosLevel>=65)return'Koleso stráca flow kontinuitu.';
if(mig&&(mig.dir==='CW'||mig.dir==='CCW'))return'Koleso vytvára silnejší návratový flow.';
return'Koleso sleduje session — flow sa ešte formuje.';
}
function qwFormatSectorTrail(nums){
if(!nums||!nums.length)return'—';
return nums.slice(0,6).join(' → ');
}
function qwSectorAbsorption(cluster,w){
const nums=cluster&&cluster.nums?cluster.nums:(w&&w.dominant?w.dominant.nums:[]);
const slice=spins.slice(-Math.min(14,spins.length)).filter(n=>n!==undefined);
let hits=0;
slice.forEach(n=>{if(nums.includes(n))hits++;});
const rate=slice.length?hits/slice.length:0;
const nearCenter=nums.some(n=>{const i=wheel.indexOf(n);return n===0||(i>=0&&Math.min(Math.abs(i-wheel.indexOf(0)),37-Math.abs(i-wheel.indexOf(0)))<=2);});
return{hits,rate,nums,nearCenter};
}
function qwMomentumCls(label){
if(label==='Rastie'||label==='Drží')return'greenTxt';
if(label==='Slabne'||label==='Bez pokračovania')return'redTxt';
return'yellowTxt';
}
function qwAnalyzeWheelFlow(pr,w,mig,chaos,clusters){
const fu=pr&&pr.coreAnalysis?pr.coreAnalysis.flowEng:null;
const quiet=!!(pr&&pr.coreAnalysis&&pr.coreAnalysis.quiet)||(fu&&predIsQuietPeriod(fu));
const absorb=qwSectorAbsorption(clusters[0],w);
const colIdx=fu!=null?(pr.coreAnalysis.displayCol!=null?pr.coreAnalysis.displayCol:fu.bestCol):-1;
const repeatTo=fu?fu.repeatToTarget:0;
const prev=qwFlowState;
let breakDetected=false,breakReason='';
if(prev.prevCol!=null&&colIdx>=0&&prev.prevCol!==colIdx&&prev.hold>=2&&!fu?.realityStrong&&repeatTo<2){
breakDetected=true;
breakReason='Follow-up flow sa prerušil — dominantný stĺpec sa mení bez potvrdenia.';
}
if(prev.prevSectorKey&&prev.hold>=3){
const curKey=clusters[0]&&clusters[0].nums?clusters[0].nums.slice(0,4).join('-'):'';
if(curKey&&curKey!==prev.prevSectorKey&&absorb.rate<0.22){
breakDetected=true;
breakReason='Dominantný sektor prestal absorbovať flow — rebound zmizol.';
}
}
if(fu&&fu.corrPenalty>=0.12)breakDetected=true,breakReason='Koleso stráca follow-up kontinuitu.';
let phase='EMERGING',momLabel='Stagnuje';
if(quiet||spins.length<5){phase='QUIET';momLabel='Bez pokračovania';}
else if(breakDetected||chaos.chaosLevel>=72){phase='DEAD';momLabel='Bez pokračovania';}
else if(fu&&fu.realityStrong&&repeatTo>=2){phase='STRONG';momLabel='Rastie';}
else if(fu&&(fu.flowMomentum==='RASTIE'||fu.flowMomentum==='DRZI')&&repeatTo>=2){phase='GROWING';momLabel=fu.flowMomentum==='RASTIE'?'Rastie':'Drží';}
else if(fu&&fu.flowMomentum==='SLABNE'){phase='WEAKENING';momLabel='Slabne';}
else if(repeatTo>=2&&absorb.rate>=0.35){phase='STRONG';momLabel='Drží';}
else if(repeatTo>=1){phase='GROWING';momLabel='Rastie';}
else if(absorb.rate<0.15){phase='WEAKENING';momLabel='Slabne';}
let transition=null;
if(breakDetected)transition=breakReason;
else if(prev.prevCol!=null&&colIdx>=0&&prev.prevCol!==colIdx&&(repeatTo>=2||fu?.realityStrong)){
transition='Flow sa presúva na '+(colIdx+1)+'. stĺpec — wheel sleduje nové návraty.';
}else if(prev.prevPhase==='STRONG'&&phase==='WEAKENING'){
transition='Návratový flow slabne — edge sektory nestačia držať follow-up.';
}else if(absorb.nearCenter&&prev.prevPhase!=='STRONG'&&(phase==='GROWING'||phase==='STRONG')){
transition='Flow sa presúva do centra wheelu.';
}else if(prev.prevSectorKey&&clusters[0]&&prev.prevSectorKey!==clusters[0].nums.slice(0,4).join('-')&&phase!=='QUIET'){
transition='Dominantný sektor sa mení — wheel hľadá nový flow.';
}
let headline='',sub='',cls='';
if(phase==='QUIET'||phase==='DEAD'){
headline='Koleso momentálne nevytvára stabilný flow';
sub=breakReason||'Session neukazuje opakovaný follow-up na wheeli.';
cls=phase==='DEAD'?'break':'quiet';
}else if(colIdx>=0&&(fu?.realityStrong||repeatTo>=2)){
headline=(colIdx+1)+'. stĺpec absorbuje väčšinu rebound flow';
sub=fu&&fu.realityReason?fu.realityReason:'Koleso aj spiny ukazujú rovnaký návratový smer.';
}else if(absorb.nearCenter&&absorb.rate>=0.3){
headline='návraty do centrálneho sektora wheelu';
sub='Koleso sa často vracia do stredu po sektore.';
}else if(clusters[0]&&clusters[0].nums){
headline='wheel sa vracia do sektora '+qwFormatSectorTrail(clusters[0].nums);
sub='Tento pas absorbuje väčšinu posledných návratov.';
}else{
headline='flow sa ešte formuje';
sub='Sleduj stopu toku — čakaj opakovaný follow-up.';
cls='pending';
}
if(transition)sub=transition+(sub?' · '+sub:'');
const hold=colIdx>=0&&colIdx===prev.prevCol?(prev.hold||0)+1:1;
qwFlowState={
prevCol:colIdx>=0?colIdx:prev.prevCol,
prevSectorKey:clusters[0]&&clusters[0].nums?clusters[0].nums.slice(0,4).join('-'):'',
prevPhase:phase,
hold
};
return{
phase,
momentum:{label:momLabel,cls:qwMomentumCls(momLabel)},
mainFlow:{headline:'HLAVNÝ FLOW: '+headline,sub,cls:cls||(phase==='STRONG'?'':phase==='WEAKENING'?'pending':'')},
transition,breakDetected,breakReason,absorbRate:Math.round(absorb.rate*100)
};
}
function skSeverity(s){const m={HIGH:'VYSOKÁ',MEDIUM:'STREDNÁ',LOW:'NÍZKA',CRITICAL:'KRITICKÁ'};return m[s]||s;}
function skFatigueLvl(l){const m={LOW:'NÍZKA',MEDIUM:'STREDNÁ',HIGH:'VYSOKÁ'};return m[l]||l;}
function skTempo(t){const m={STABLE:'STABILNÝ',ACCELERATING:'ZRÝCHĽUJÚCI',SLOWING:'SPOMALUJÚCI'};return m[t]||t;}
function skChaosRes(c){const m={GOOD:'DOBRÁ',WEAK:'SLABÁ',OVERRIDE:'IGNOROVANIE FILTRA'};return m[c]||c;}
function skEscalation(e){const m={STABLE:'STABILNÉ',RISING:'RASTÚCE'};return m[e]||e;}
function skCognitive(c){const m={LOW:'NÍZKE',MEDIUM:'STREDNÉ',HIGH:'VYSOKÉ'};return m[c]||c;}
function skStability(s){const m={HIGH:'VYSOKÁ',MEDIUM:'STREDNÁ',LOW:'NÍZKA'};return m[s]||s;}
function skAlertType(t){const m={FLOW:'TOK',CLUSTER:'KLASTER',CHAOS:'CHAOS',CONFIDENCE:'SPOĽAHLIVOSŤ',TIMING:'TIMING',SESSION:'RELÁCIA',EDGE:'VÝHODA',MODE:'REŽIM',PERSISTENCE:'PERZISTENCIA',VISUAL:'VIZUÁL',STACK:'ZÁSOBNÍK',HOTCOLD:'HORÚCE/STUDENÉ'};return m[t]||t;}
function skPredRezim(r){const m={OBSERVATION:'POZOROVANIE','FLOW ACTIVE':'AKTÍVNY FLOW',WARNING:'VÝSTRAHA','DEAD SPINS':'MŔTVE SPINY',REVERSAL:'NÁVRAT',BREAKOUT:'PRERAZENIE'};return m[r]||r;}
function skRaModeLabel(id){const m={DEAD_SPIN:'REŽIM MŔTVYCH SPINOV',ANOMALY:'REŽIM ANOMÁLIE',REVERSAL:'REŽIM NÁVRATU',BREAKOUT:'REŽIM PRERAZENIA',WARNING:'REŽIM VÝSTRAHY',OBSERVATION:'REŽIM POZOROVANIA',FLOW:'REŽIM FLOW',NORMAL:'NORMÁLNY REŽIM'};return m[id]||id;}
function skEngineName(n){const m={'Spin core':'Jadro spinov','Timing core':'Jadro timingu','Visual core':'Jadro vizuálu','Hot/Cold':'Aktivita kolesa',Pattern:'Patterny','Risk/Chaos':'Riziko/Chaos','Wheel flow':'Tok kolesa','Wheel sector':'Sektor kolesa','Koleso flow':'Tok kolesa','Koleso sector':'Sektor kolesa',Persistence:'Perzistencia','Spin Memory':'Pamäť spinov'};return m[n]||n;}
function normPct(value,maxRef){if(maxRef<=0)return 0;return clamp((value/maxRef)*100);}
function weightedTotal(){if(!spins.length)return 1;let t=0;for(let i=0;i<spins.length;i++)t+=Math.pow((i+1)/spins.length,2.15);return t||1;}
function spinsSince(num){for(let i=spins.length-1;i>=0;i--)if(spins[i]===num)return spins.length-1-i;return spins.length;}
function wheelStep(fromNum,toNum){const a=wheel.indexOf(fromNum),b=wheel.indexOf(toNum);if(a<0||b<0)return 0;let d=b-a;if(d>wheel.length/2)d-=wheel.length;if(d<-wheel.length/2)d+=wheel.length;return d;}
function lastSpinNum(){return spins.length?spins[spins.length-1]:null;}
function ivStd(iv){if(iv.length<2)return 0;const avg=iv.reduce((a,b)=>a+b,0)/iv.length;return Math.sqrt(iv.reduce((s,t)=>s+Math.pow(t-avg,2),0)/iv.length);}
function countColorStats(){let r=0,b=0,g=0;spins.forEach(n=>{if(n===0)g++;else if(reds.includes(n))r++;else b++;});const t=spins.length||1;return{r,b,g,rp:+(r/t*100).toFixed(1),bp:+(b/t*100).toFixed(1)};}
function countEvenOdd(){let e=0,o=0;spins.forEach(n=>{if(n===0)return;if(n%2===0)e++;else o++;});const t=Math.max(1,e+o);return{e,o,ep:+(e/t*100).toFixed(1),op:+(o/t*100).toFixed(1)};}
function countHighLow(){let hi=0,lo=0;spins.forEach(n=>{if(n===0)return;if(n>=19)hi++;else lo++;});const t=Math.max(1,hi+lo);return{hi,lo,hip:+(hi/t*100).toFixed(1),lop:+(lo/t*100).toFixed(1)};}
function predictColor(){if(spins.length<2)return '—';const s=spins.slice(-15);let r=0,b=0;s.forEach(n=>{if(n===0)return;if(reds.includes(n))r++;else b++;});return r>=b?'ČERVENÁ':'ČIERNA';}
function predictEvenOdd(){if(spins.length<2)return '—';const s=spins.slice(-15);let e=0,o=0;s.forEach(n=>{if(n===0)return;if(n%2===0)e++;else o++;});return e>=o?'PÁRNE':'NEPÁRNE';}
function predictHighLow(){if(spins.length<2)return '—';const s=spins.slice(-15);let hi=0,lo=0;s.forEach(n=>{if(n===0)return;if(n>=19)hi++;else lo++;});return hi>=lo?'VEĽKÉ':'MALÉ';}
function hotDozenPair(){const sums=DOZENS.map(d=>d.reduce((s,n)=>s+(statsCache[n]||0),0));const sorted=sums.map((v,i)=>({i:i+1,v})).sort((a,b)=>b.v-a.v);return sorted.slice(0,2).map(x=>x.i).join(' + ');}
function hotColumnPair(){const cols=[0,0,0];for(let n=1;n<=36;n++)cols[(n-1)%3]+=statsCache[n]||0;return cols.map((v,i)=>({i:i+1,v})).sort((a,b)=>b.v-a.v).slice(0,2).map(x=>x.i).join(' + ');}
const AI_COLUMNS=[
[3,6,9,12,15,18,21,24,27,30,33,36],
[2,5,8,11,14,17,20,23,26,29,32,35],
[1,4,7,10,13,16,19,22,25,28,31,34]
];
function aiSpinScore(nums,recentW,basePow){
let base=0,trend=0;
spins.forEach((s,idx)=>{
if(!nums.includes(s))return;
base+=Math.pow((idx+1)/spins.length,basePow);
if(idx>=spins.length-recentW)trend+=2.4;
});
const gap=nums.reduce((s,n)=>s+spinsSince(n),0)/nums.length;
return base+trend+clamp(gap*1.4,0,22);
}
function predictSpinTrendLine(){
const n=Math.min(12,spins.length);
return spins.slice(-n).join(' → ');
}
function predictPrimaryTip(){
if(!spins.length)return null;
return pickDashboardPrimaryTip();
}
function predictDozenLabels(){
const scored=DOZENS.map((nums,i)=>({
label:(i+1)+'. tucet ('+nums[0]+'–'+nums[nums.length-1]+')',
score:aiSpinScore(nums,10,2.2)
})).sort((a,b)=>b.score-a.score);
return scored.slice(0,2).map(x=>x.label).join(' · ');
}
function predictColumnLabels(){
const scored=AI_COLUMNS.map((nums,i)=>({
label:'Stĺpec '+(i+1)+' (2:1)',
score:aiSpinScore(nums,10,2.1)
})).sort((a,b)=>b.score-a.score);
return scored.slice(0,2).map(x=>x.label).join(' · ');
}
function predictSizeLabel(){
const v=predictHighLow();
if(v==='—')return'—';
return v==='VEĽKÉ'?'VEĽKÉ (19–36)':'MALÉ (1–18)';
}

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
qwWheelMemory=[];qwPrevScannerSnap=null;
predFlowEngineCache=null;predFlowEngineKey='';
}
function invalidateWheelCache(){
lastWheelIntel=null;
lastWheelIntelKey='';
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
function shouldSuppressUI(kind){
const inv=getInvisibleLayer();
if(!inv)return false;
if(kind==='weak')return inv.suppress.hideWeakSignals;
if(kind==='aggressive')return inv.suppress.hideAggressivePred;
if(kind==='lowConf')return inv.suppress.hideLowConfidence;
if(kind==='detail')return inv.suppress.hideSecondaryPanels;
if(kind==='comment')return inv.suppress.hideSecondaryPanels||inv.suppress.hideAggressivePred;
return false;
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
+'<span class="mai-item"><span class="mai-label">RELÁCIA</span><b class="mai-value blueTxt">'+sessionIntel.label+'</b></span>'
+'<span class="mai-item"><span class="mai-label">AI STAV</span><b class="mai-value greenTxt">'+aiStateMachine.label+'</b></span>';
updateSessionStatus();
}
function computeAIPrediction(){
if(spins.length<2)return null;
const key=predCacheKey();
if(lastAIPredictionCache&&lastAIPredictionKey===key)return lastAIPredictionCache;
const CA=computeAIPredictionEngine();
if(!CA)return null;
const cluster=CA.cluster;
const result={
trend:predictSpinTrendLine(),
last:lastSpinNum(),
tip:null,
sector:CA.sector,
dozens:CA.dozens,columns:CA.columns,color:CA.color,parity:CA.parity,size:CA.size,
seria:CA.seria,rezim:CA.rezim,odNuly:CA.odNuly,
dominantFlow:CA.dominantFlow,dominantTarget:CA.dominantTarget,
state:CA.state,stateLabel:CA.stateLabel,riskLabel:CA.riskLabel,sessionMode:CA.sessionMode,
edgeStrength:CA.edgeStrength,suppressed:CA.suppressed,noEdge:CA.noEdge,
confidence:CA.confidence,rawConfidence:CA.rawConfidence,signalStrength:CA.signalStrength,
flowEng:CA.flowEng,flowStatus:CA.flowStatus,trustHierarchy:CA.trustHierarchy,predRezim:CA.predRezim,preferNow:CA.preferNow,
flowConfirm:CA.flowConfirm,opinionChange:CA.opinionChange,columnsDisplay:CA.columns,dozensDisplay:CA.dozens,colorDisplay:CA.colorDisplay,
invisible:computeInvisibleEngines(CA.rawConfidence!=null?CA.rawConfidence:CA.confidence),
spinCore:CA.blend.spinCore,timingCore:CA.blend.timingCore,visualCore:CA.blend.visualCore,
spinPart:CA.blend.spinPart,timingPart:CA.blend.timingPart,visualPart:CA.blend.visualPart,modelWeighted:CA.blend.weighted,
timingLabel:CA.timing.label,timingFactor:CA.timing.factor,visualSupport:CA.visualSup.factor,
chaosPenalty:1,clusterScore:cluster.score.toFixed(2),modelLabel:CA.modelLabel,
sources:'SPINY 40% follow-up · 20% patterny · 10% pamäť · 20% timing · 10% vizuál',
learningBoost:getLearningConfidenceBoost(),
evolutionGen:predictionEvolution.generation,selfCorrection:predictionEvolution.selfCorrection,
coreAnalysis:CA,
lfp:CA.lfp||computeLiveFlowPredictionAI()
};
lastAIPredictionCache=result;
lastAIPredictionKey=key;
lastCoreValues={spinCore:result.spinCore,timingCore:result.timingCore,visualCore:result.visualCore};
return result;
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
if(aiStateMachine.state==='CHAOS'||aiStateMachine.state==='SAFE'||aiStateMachine.state==='WAIT')return 'BEZPEČNÝ';
if(aiStateMachine.state==='ATTACK')return 'AGRESÍVNY';
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

/* RULETOVÝ ANALYTIK — samostatný mozog (nezávislý od AI predikcie) */
let rouletteAnalystCache=null,rouletteAnalystKey='';
let rouletteAnalystPrevSnapshot=null;
let rouletteAnalystSessionBaseline=null;
let rouletteAnalystSessionProfile=null;
const RA_PATTERN_WINDOW=12;
const RA_PATTERN_WARN=60;
const RA_MEMORY_WINDOWS=[5,10,20,30,50];
const RBA_OBS_MAX=11;
const RBA_FULL_MIN=12;
const RBA_DEEP_MIN=20;
const RBA_WIN_WEIGHT={5:1,10:.82,20:.58,30:.38,50:.22};
let rbaSessionLog=[];
let rbaSelfEvalHits=[];
let rbaFlowMemoryPatterns=[];
let rbaEvolutionTrack=[];
let rbaPrevBehaviorSnap=null;

function raColName(ci){return ci===0?'1. stĺpec':ci===1?'2. stĺpec':ci===2?'3. stĺpec':'—';}
function raDozName(di){return di===0?'1. tucet':di===1?'2. tucet':di===2?'3. tucet':'—';}
function raColorName(n){if(n===0)return'zelená (0)';return reds.includes(n)?'červená':'čierna';}
function raParityName(n){if(n===0)return'—';return n%2===0?'párne':'nepárne';}
function raSizeName(n){if(n===0)return'—';return n>=19?'veľké (19–36)':'malé (1–18)';}

function raSliceStats(win){
const slice=spins.slice(-win);
if(!slice.length)return null;
const cols=[0,0,0],doz=[0,0,0];
let red=0,black=0,even=0,odd=0,low=0,high=0,zeros=0;
slice.forEach(n=>{
if(n===0){zeros++;return;}
const ci=columnIndexForNum(n),di=dozenIndexForNum(n);
if(ci>=0)cols[ci]++;
if(di>=0)doz[di]++;
if(reds.includes(n))red++;else black++;
if(n%2===0)even++;else odd++;
if(n>=19)high++;else low++;
});
const nz=Math.max(1,slice.length-zeros);
const topCol=cols.indexOf(Math.max(...cols));
const topDoz=doz.indexOf(Math.max(...doz));
return{
win,total:slice.length,cols,doz,topCol,topDoz,
redPct:Math.round(red/nz*100),blackPct:Math.round(black/nz*100),
evenPct:Math.round(even/nz*100),oddPct:Math.round(odd/nz*100),
lowPct:Math.round(low/nz*100),highPct:Math.round(high/nz*100),
last:slice[slice.length-1],trail:slice.slice(-6).join(' → ')
};
}

function raColorStreak(slice){
if(slice.length<2)return{len:0,color:'—'};
const last=slice[slice.length-1];
if(last===0)return{len:0,color:'—'};
const isRed=reds.includes(last);
let len=1;
for(let i=slice.length-2;i>=0;i--){
const n=slice[i];
if(n===0)break;
if(reds.includes(n)===isRed)len++;else break;
}
return{len,color:isRed?'červená':'čierna'};
}

function raReturnHits(slice,field){
let hits=0,trials=0;
for(let i=2;i<slice.length;i++){
const a=field==='col'?columnIndexForNum(slice[i-2]):dozenIndexForNum(slice[i-2]);
const b=field==='col'?columnIndexForNum(slice[i-1]):dozenIndexForNum(slice[i-1]);
const c=field==='col'?columnIndexForNum(slice[i]):dozenIndexForNum(slice[i]);
if(a<0||b<0||c<0)continue;
if(b!==a){trials++;if(c===a)hits++;}
}
return{hits,trials,rate:trials?Math.round(hits/trials*100):0};
}

function raFollowUpWeakness(slice){
const st=raColorStreak(slice);
if(st.len<4)return null;
const recent=slice.slice(-3).filter(n=>n!==0);
const prev=slice.slice(-6,-3).filter(n=>n!==0);
if(!recent.length||!prev.length)return null;
let rR=0,rB=0,pR=0,pB=0;
recent.forEach(n=>{if(reds.includes(n))rR++;else rB++;});
prev.forEach(n=>{if(reds.includes(n))pR++;else pB++;});
const recentDom=rR>=rB?'červená':'čierna';
const prevDom=pR>=pB?'červená':'čierna';
if(recentDom===st.color&&recent.length<prev.length)return st.color;
return null;
}

function raOscillationScore(slice,field){
if(slice.length<6)return 0;
let flips=0;
for(let i=1;i<slice.length;i++){
const a=field==='col'?columnIndexForNum(slice[i-1]):dozenIndexForNum(slice[i-1]);
const b=field==='col'?columnIndexForNum(slice[i]):dozenIndexForNum(slice[i]);
if(a>=0&&b>=0&&a!==b)flips++;
}
return Math.round(flips/(slice.length-1)*100);
}

function raPatternReliability(){
const slice=spins.slice(-Math.max(RA_PATTERN_WINDOW+4,spins.length));
const colRet=raReturnHits(slice,'col');
const dozRet=raReturnHits(slice,'doz');
const rates=[];
if(colRet.trials>=4)rates.push(colRet.rate);
if(dozRet.trials>=4)rates.push(dozRet.rate);
const colorSt=raColorStreak(slice);
if(colorSt.len>=3){
let hit=0,tot=0;
for(let i=1;i<slice.length;i++){
const n=slice[i],p=slice[i-1];
if(n===0||p===0)continue;
tot++;
if(reds.includes(n)===reds.includes(p))hit++;
}
if(tot>=4)rates.push(Math.round(hit/tot*100));
}
if(!rates.length)return{rate:50,samples:0};
return{rate:Math.round(rates.reduce((a,b)=>a+b,0)/rates.length),samples:colRet.trials+dozRet.trials};
}

function raCompareMemory(){
const parts=[];
const w5=raSliceStats(5),w10=raSliceStats(10),w25=spins.length>=12?raSliceStats(25):null;
if(w5&&w10&&w5.topCol!==w10.topCol)parts.push('Za 5 spinov vedie '+raColName(w5.topCol)+', za 10 už '+raColName(w10.topCol)+'.');
if(w10&&w25&&w10.topDoz!==w25.topDoz)parts.push('Tucet sa posúva: krátko '+raDozName(w10.topDoz)+', v širšom okne '+raDozName(w25.topDoz)+'.');
if(w5&&w10&&Math.abs(w5.evenPct-w10.evenPct)>=25)parts.push('Párnosť sa v relácii rýchlo preklápa (krátko '+(w5.evenPct>=50?'párne':'nepárne')+', širšie '+(w10.evenPct>=50?'párne':'nepárne')+').');
return parts.length?parts.join(' '):'Pamäť 5/10/25 spinov drží podobný obraz — zatiaľ bez ostrého zlomu.';
}

function raStanceVsPrediction(analyst){
const pr=lastAIPredictionCache&&lastAIPredictionKey===predCacheKey()?lastAIPredictionCache:null;
if(!pr||!analyst.ready)return'Predikcia ešte nie je k dispozícii — analytik pracuje len z histórie spinov.';
const agree=[];
const disagree=[];
if(/ČERVENÁ/.test(pr.color||'')&&analyst.dominantColor==='červená')agree.push('farbu');
else if(/ČIERNA/.test(pr.color||'')&&analyst.dominantColor==='čierna')agree.push('farbu');
else if(pr.color&&pr.color!=='—')disagree.push('farbu (predikcia vs. tlak v histórii)');
const predPar=/PÁRNE/.test(pr.parity||'')?'párne':/NEPÁRNE/.test(pr.parity||'')?'nepárne':null;
if(predPar&&analyst.dominantParity===predPar)agree.push('párnosť');
else if(predPar)disagree.push('párnosť');
if(agree.length&&!disagree.length)return'Analytik <b>súhlasí</b> s predikciou v: '+agree.join(', ')+' — stále ide o dva nezávislé mozgy.';
if(disagree.length)return'Analytik <b>nesúhlasí</b> s predikciou ('+disagree.join(', ')+') — vidí iný hidden flow v pamäti spinov.';
return'Analytik je opatrný — predikcia ani pamäť nemajú ešte čistý obraz.';
}

function raTrustLabel(pat,mode,oscCol,colorSt){
if(mode==='DEAD_SPIN')return{label:'nízka',cls:'redTxt'};
if(mode==='WARNING'||pat.rate<55)return{label:'nízka',cls:'redTxt'};
if(pat.rate>=72&&colorSt.len>=3)return{label:'stabilná',cls:'greenTxt'};
if(pat.rate>=60)return{label:'flow zatiaľ drží',cls:'yellowTxt'};
return{label:'opatrná',cls:'yellowTxt'};
}

function raFlowScoreLabel(mode,pat,oscCol){
if(mode==='DEAD_SPIN'||pat.rate<RA_PATTERN_WARN)return{label:'ROZPADÁ SA',cls:'ra-flow-collapse'};
if(mode==='WARNING'||pat.rate<65||oscCol>=58)return{label:'NEISTÝ',cls:'ra-flow-uncertain'};
return{label:'STABILNÝ',cls:'ra-flow-stable'};
}

function raAiMood(mode,pat,s5,s50,colorSt,newFlow){
if(mode==='DEAD_SPIN')return'AI stav: MŔTVE SPINY';
if(mode==='WARNING')return'AI stav: NEISTÁ SESSION';
if(newFlow)return'AI stav: ZAČÍNA SA TVORIŤ NOVÝ FLOW';
if(pat.rate>=72&&s5&&s50&&s5.topCol===s50.topCol&&colorSt.len>=3)return'AI stav: FLOW STABILNÝ';
if(pat.rate>=62)return'AI stav: FLOW DRŽÍ — SLEDUJEM';
return'AI stav: NEISTÁ SESSION';
}

function raDetectFlowChange(s5,s10,s25,prev){
if(!prev||prev.spinLen!==spins.length-1)return null;
const lines=[];
if(s5&&prev.s5&&s5.topCol!==prev.s5.topCol){
lines.push(raColName(s5.topCol)+' prvýkrát tlačí v krátkom okne — predtým viedol '+raColName(prev.s5.topCol)+'.');
}
if(s10&&prev.s10&&s10.topDoz!==prev.s10.topDoz){
lines.push(raDozName(s10.topDoz)+' sa posúva do popredia (predtým '+raDozName(prev.s10.topDoz)+').');
}
if(s25&&prev.s25&&Math.abs(s25.redPct-prev.s25.redPct)>=35){
lines.push('Farby sa prudko preklopili — '+s25.redPct+'% červená v posledných 25 (predtým '+prev.s25.redPct+'%).');
}
const last=lastSpinNum();
if(last!=null&&prev.last!=null&&columnIndexForNum(last)>=0&&columnIndexForNum(prev.last)>=0){
const ci=columnIndexForNum(last),pi=columnIndexForNum(prev.last);
if(ci!==pi&&s5&&s5.topCol===ci&&prev.s5&&prev.s5.topCol!==ci){
lines.push(raColName(ci)+' prvýkrát vytvoril follow-up pokračovanie po prerušení.');
}
}
return lines.length?lines.join(' '):null;
}

function raFlowFatigue(slice,colorSt,weakFollow,colRet,dozRet,s10){
const out=[];
if(colorSt.len>=6)out.push('AI vidí únavu '+colorSt.color+' flow — trend beží už '+colorSt.len+' spinov a follow-up slabne.');
if(weakFollow)out.push('AI vidí únavu '+weakFollow+' flow — posledné spiny už nedržia rovnaký tlak.');
if(s10&&colRet.trials>=6){
const early=raReturnHits(slice.slice(0,Math.floor(slice.length/2)),'col');
const late=raReturnHits(slice.slice(-Math.floor(slice.length/2)),'col');
if(early.rate>=55&&late.rate<early.rate-18)out.push(raColName(s10.topCol)+' už nevytvára tak stabilné návraty ako predtým.');
}
if(s10&&dozRet.trials>=6){
const early=raReturnHits(slice.slice(0,Math.floor(slice.length/2)),'doz');
const late=raReturnHits(slice.slice(-Math.floor(slice.length/2)),'doz');
if(early.rate>=50&&late.rate<early.rate-15)out.push(raDozName(s10.topDoz)+' stráca návratový rytmus — flow je preťažený.');
}
if(persistenceEngine.maxLife>=8)out.push('Perzistencia je príliš dlhá ('+persistenceEngine.maxLife+' spinov) — trend môže byť vyčerpaný.');
return out;
}

function raHiddenFlow(slice){
const out=[];
const nz=slice.filter(n=>n!==0);
if(nz.length<10)return out;
let afterHigh=0,afterHighLow=0;
for(let i=2;i<nz.length;i++){
const a=nz[i-2],b=nz[i-1],c=nz[i];
if(a>=19&&b>=19){
afterHigh++;
if(c>=1&&c<=18)afterHighLow++;
}
}
if(afterHigh>=3&&afterHighLow>=2)out.push('AI si všimla skrytý návratový rytmus: po <b>veľkom</b> range sa wheel často vracia späť do <b>malého</b> range.');
let afterLow=0,afterLowHigh=0;
for(let i=2;i<nz.length;i++){
const a=nz[i-2],b=nz[i-1],c=nz[i];
if(a<=18&&b<=18&&a>=1){
afterLow++;
if(c>=19)afterLowHigh++;
}
}
if(afterLow>=3&&afterLowHigh>=2)out.push('Skrytý rytmus: po sérii <b>malých</b> čísel často príde odpoveď do <b>veľkého</b> pásma.');
const colBounce=raReturnHits(slice.slice(-20),'col');
if(colBounce.trials>=5&&colBounce.rate>=58)out.push('Hidden návrat: stĺpec sa po odchýlení často vracia do rovnakého pásu bez toho, aby to bolo na prvý pohľad viditeľné.');
return out;
}

function raFlowConflict(s5,s10,s25,colorSt){
if(!s5||!s10||!s25)return null;
const colDom=raColName(s10.topCol);
const dozDom=raDozName(s10.topDoz);
const colorDom=colorSt.len>=2?colorSt.color:(s10.redPct>=55?'červená':'čierna');
const sizeDom=s10.highPct>=58?'veľké':s10.lowPct>=58?'malé':null;
const conflicts=[];
if(s25.topCol!==s10.topCol)conflicts.push('stĺpce v dlhej pamäti ukazujú iný smer než krátky tlak');
if(s25.topDoz!==s10.topDoz)conflicts.push('tucty sa v krátkom a dlhom okne nezhodujú');
if(colorSt.len>=4&&((colorDom==='červená'&&s10.redPct<45)||(colorDom==='čierna'&&s10.blackPct<45))){
conflicts.push('farby už flow nepotvrdzujú, hoci pred chvíľou držali streak');
}
if(conflicts.length<2)return null;
return'AI vidí konflikt flow: '+colDom+' stále drží v stĺpcoch, '+dozDom+' v tuctoch, ale '+conflicts.slice(0,2).join(' a ')+'.';
}

function raShortVsLong(s5,s10,s25,s50){
if(!s5||!s10)return{short:'—',long:'—'};
let short='Krátkodobo: '+raColName(s5.topCol)+' zosilňuje';
if(s5.topDoz!==s10.topDoz)short+=', '+raDozName(s5.topDoz)+' v krátkom okne tlačí';
short+='.';
let long='Dlhodobo: ';
if(s50&&s25){
long+=raColName(s50.topCol)+' stále drží dominantný flow, '+raDozName(s50.topDoz)+' v širšej pamäti';
if(s50.topCol!==s5.topCol)long+=' (iný než posledných 5)';
}else if(s25){
long+=raColName(s25.topCol)+' · '+raDozName(s25.topDoz);
}else long+='ešte málo dát';
long+='.';
return{short,long};
}

function raWatchMode(mode,pat,s5,s10,newFlow){
if(mode==='DEAD_SPIN')return null;
if(pat.rate>=55&&pat.rate<72&&s5&&s10){
return'AI zatiaľ iba sleduje: '+raColName(s5.topCol)+' začína vytvárať nový flow, ale ešte ho nepotvrdzuje dostatok spinov.';
}
if(newFlow&&pat.rate>=50)return'AI zatiaľ iba sleduje: tvorí sa nový rytmus — čakám na 3–5 potvrdzujúcich spinov.';
if(mode==='WARNING')return'AI zatiaľ iba sleduje: patterny sú nestabilné, bez agresívneho vstupu.';
return null;
}

function raBuildAnalystAlerts(flowChange,conflict,fatigue,hidden,mode,pat,s5,colorSt,colRet){
const alerts=[];
if(flowChange)alerts.push({text:flowChange,type:'zmena',positive:false});
if(conflict)alerts.push({text:conflict,type:'konflikt',positive:false});
fatigue.forEach(t=>alerts.push({text:t,type:'únava',positive:false}));
hidden.forEach(t=>alerts.push({text:t,type:'hidden',positive:false}));
if(mode==='DEAD_SPIN')alerts.push({text:'Kolaps flow — session je nečitateľná, pozorovacie spiny.',type:'kolaps',positive:false});
else if(pat.rate>=70&&colorSt.len>=5){
alerts.push({text:raColName(s5?s5.topCol:0)+' drží dlhý trend — sleduj únavu, nie slepú agresiu.',type:'breakout',positive:true});
}
if(colRet.trials>=5&&colRet.rate>=60){
const c=s5?raColName(s5.topCol):'stĺpec';
alerts.push({text:'AI ALERT: '+c+' prerušil chaos a vracia sa návratový rytmus.',type:'návrat',positive:true});
}
if(lastSpinNum()!=null&&spins.length>=3&&spins[spins.length-1]===spins[spins.length-2]){
alerts.push({text:'AI ALERT: anomália — rovnaké číslo po sebe, flow sa môže zmeniť.',type:'anomália',positive:false});
}
return alerts.slice(0,5);
}

function raPersonalityLine(mode,pat,trust,watchLine,newFlow,positive){
const lines=[];
if(positive)lines.push(positive);
if(watchLine)lines.push(watchLine);
else if(mode==='DEAD_SPIN')lines.push('AI momentálne nevidí dostatočne stabilný rytmus — odporúča pozorovanie.');
else if(pat.rate>=68&&trust.label==='stabilná')lines.push('AI zatiaľ stále verí návratovému flow v pamäti spinov.');
else if(newFlow)lines.push('AI je pokojná — nový flow sa len rodí, ešte bez tvrdení.');
else if(trust.label==='flow zatiaľ drží')lines.push('AI zatiaľ stále verí, že krátky flow má zmysel sledovať.');
else lines.push('AI je opatrná analytička — radšej pozoruje než tlačí na rozhodnutie.');
return lines[0]||'';
}

function raSelfLearnNote(pat,mode){
if(pat.samples<6)return'';
if(mode==='DEAD_SPIN'||pat.rate<RA_PATTERN_WARN){
return'AI sa učí z posledných chýb: vlastné patterny nevychádzali — znižuje agresivitu a prepína do pozorovania.';
}
if(pat.rate<65)return'AI upravila dôveru — patterny posledných spinov sú slabšie, viac pozorovania.';
return'';
}

function raWheelBehaviorFeel(slice){
if(slice.length<4)return'AI ešte len začína sledovať správanie wheelu.';
let near=0,far=0;
for(let i=1;i<slice.length;i++){
const d=Math.abs(wheelStep(slice[i-1],slice[i]));
if(d<=3)near++;else if(d>=6)far++;
}
if(near>=far+2)return'AI má pocit, že wheel sa momentálne vracia do stredu namiesto migrácie do krajov.';
if(far>=near+2)return'AI má pocit, že wheel tlačí skôr do krajov — migrácia je výraznejšia než držanie stredu.';
return'AI má pocit, že wheel balansuje medzi stredom a okrajmi — session ešte nemá jednoznačný smer.';
}

function raSessionPersonality(mode,pat,rep,oscCol,colorSt,colRet){
if(mode==='DEAD_SPIN')return'Táto session momentálne pôsobí: mŕtvo a ťažko čitateľne.';
if(pat.rate>=68&&colRet.rate>=55&&rep<28)return'Táto session momentálne pôsobí: rytmicky a návratovo.';
if(oscCol>=58&&pat.rate<60)return'Táto session momentálne pôsobí: chaoticky a nestabilne.';
if(colorSt.len>=5&&rep<22)return'Táto session momentálne pôsobí: agresívne — jeden trend tlačí dlho.';
if(colRet.rate>=50&&pat.rate>=55)return'Táto session momentálne pôsobí: návratovo — wheel drží opakované pásy.';
if(pat.rate>=62)return'Táto session momentálne pôsobí: čitateľne, no opatrne.';
return'Táto session momentálne pôsobí: nestabilne a návratovo.';
}

function raRandomVsPattern(pat,spinCount,colRet){
if(spinCount<8)return'AI zatiaľ nevie potvrdiť, či ide o reálny pattern alebo krátkodobú náhodu — málo spinov v pamäti.';
if(pat.rate>=65&&colRet.trials>=5&&colRet.rate>=55)return'AI to už neberie ako náhodu — návraty sa opakujú príliš často na coincidence.';
if(pat.rate<50)return'AI zatiaľ nevie potvrdiť, či ide o reálny pattern alebo krátkodobú náhodu.';
return'AI je opatrná: časť vyzerá ako pattern, časť stále ako krátka náhoda.';
}

function raSuspiciousFlow(s10,slice,colRet){
if(!s10||colRet.trials<4)return null;
const lines=[];
const col=raColName(s10.topCol);
let retCount=0;
for(let i=2;i<slice.length;i++){
const a=columnIndexForNum(slice[i-2]),b=columnIndexForNum(slice[i-1]),c=columnIndexForNum(slice[i]);
if(a>=0&&b>=0&&c>=0&&b!==a&&c===a&&a===s10.topCol)retCount++;
}
if(retCount>=4&&colRet.rate>=58)lines.push('AI si všimla podozrivo časté návraty do <b>'+col+'</b>.');
const doz=raDozName(s10.topDoz);
let sameDoz=0;
slice.forEach(n=>{if(dozenIndexForNum(n)===s10.topDoz)sameDoz++;});
if(sameDoz>=Math.min(8,slice.length*0.55))lines.push('Podozrivo silný tlak na <b>'+doz+'</b> — wheel sa k nemu vracia príliš pravidelne.');
return lines.length?lines.join(' '):null;
}

function raPatience(pat,newFlow,watchLine){
if(watchLine)return'AI zatiaľ čaká na potvrdenie nového flow — trpezlivo sleduje, bez tvrdení.';
if(newFlow&&pat.rate<68)return'AI zatiaľ čaká na potvrdenie nového flow — ešte chýbajú 3–5 potvrdzujúce spiny.';
if(pat.rate>=55&&pat.rate<68)return'AI zatiaľ čaká — pattern je sľubný, ale nie je ešte uzavretý.';
return'';
}

function raSelfCriticism(pat,mode,prev){
const lines=[];
if(mode==='DEAD_SPIN'||pat.rate<RA_PATTERN_WARN){
lines.push('AI posledné spiny nečítala stabilne — flow sa správa nepredvídateľne.');
lines.push('AI patterny posledných spinov stratili kontinuitu.');
}else if(pat.rate<60){
lines.push('AI priznáva: posledná interpretácia bola slabšia — session sa rýchlo mení.');
}
if(prev&&prev.patRate>=65&&pat.rate<prev.patRate-15){
lines.push('AI sa kriticky pozerá späť — dôvera v vlastné čítanie flow klesla oproti predchádzajúcemu spinu.');
}
return lines.join(' ');
}

function raSurprise(flowChange,prev,slice,s10,colRet){
const out=[];
if(flowChange)out.push('<b>AI ALERT:</b> '+flowChange);
if(prev&&prev.last!=null&&slice.length>=2){
const broke=columnIndexForNum(prev.last),now=columnIndexForNum(slice[slice.length-1]);
if(broke>=0&&now>=0&&broke!==now&&s10){
const longRun=persistenceEngine.columnLife[broke]||0;
if(longRun>=4)out.push('<b>AI ALERT:</b> '+raColName(now)+' prvýkrát prerušil dlhý návratový flow v '+raColName(broke)+'.');
}
}
if(colRet.trials>=4&&colRet.rate>=62&&prev&&prev.patRate<50){
out.push('<b>AI ALERT:</b> Náhle sa objavil čitateľný návratový rytmus — toto je prekvapenie oproti predchádzajúcemu chaosu.');
}
return out.length?out.join(' '):null;
}

function raSessionFlowHistory(s25,s50){
if(spins.length<6)return'Od začiatku session ešte nie je dosť dát.';
const all=spins.slice();
const early=all.slice(0,Math.min(12,all.length));
const dozEarly=[0,0,0],colEarly=[0,0,0];
early.forEach(n=>{
if(n===0)return;
const di=dozenIndexForNum(n),ci=columnIndexForNum(n);
if(di>=0)dozEarly[di]++;
if(ci>=0)colEarly[ci]++;
});
const topD=dozEarly.indexOf(Math.max(...dozEarly));
const topC=colEarly.indexOf(Math.max(...colEarly));
let h='Od začiatku session ('+all.length+' spinov): ';
h+='<b>'+raDozName(topD)+'</b> drží dominantný návratový flow';
if(s50&&s25&&s50.topDoz!==s25.topDoz)h+=', no v posledných 25 sa posúva '+raDozName(s25.topDoz);
h+=' · stĺpce: '+raColName(topC);
if(s50)h+=' (dlhodobo '+raColName(s50.topCol)+')';
h+='.';
return h;
}

function raTrendFatigueFromStart(baseline,colorSt,weakFollow,s10){
if(!baseline||!s10)return'';
const lines=[];
if(baseline.color&&colorSt.len>=3){
const startDom=baseline.color;
if(startDom===colorSt.color&&weakFollow){
lines.push('AI vidí, že <b>'+colorSt.color+'</b> flow už stráca silu oproti začiatku session.');
}else if(startDom!==colorSt.color){
lines.push('Od začiatku viedla <b>'+startDom+'</b>, teraz tlačí skôr <b>'+colorSt.color+'</b> — trend sa prerodil.');
}
}
if(baseline.topCol!==undefined&&baseline.topCol!==s10.topCol){
lines.push('Dominantný stĺpec sa od začiatku session posunul z '+raColName(baseline.topCol)+' na '+raColName(s10.topCol)+'.');
}
return lines.join(' ');
}

function raPrepareNote(newFlow,pat,watchLine){
if(!newFlow&&pat.rate<55)return'';
if(newFlow&&pat.rate>=50)return'AI vidí formovanie nového flow, ale ešte čaká na potvrdenie — priprav sa sledovať, nie hrať.';
if(watchLine)return'';
if(pat.rate>=52&&pat.rate<65)return'AI vidí prvé znaky nového flow — zatiaľ len pozorovanie.';
return'';
}

function raFlowIntuition(slice,s10){
if(slice.length<5||!s10)return'';
let regularRet=0;
for(let i=2;i<Math.min(slice.length,16);i++){
const a=columnIndexForNum(slice[i-2]),b=columnIndexForNum(slice[i-1]),c=columnIndexForNum(slice[i]);
if(a>=0&&b>=0&&c>=0&&b!==a&&c===a)regularRet++;
}
if(regularRet>=4)return'AI má pocit, že wheel sa momentálne vracia príliš pravidelne do <b>'+raColName(s10.topCol)+'</b>.';
const mig=getWheelMigrationDirection();
if(mig.dir==='MIX')return'AI má pocit, že wheel sa zasekáva medzi smermi — intuícia hovorí o rozpadávajúcom flow.';
return'AI má pocit, že wheel „dýcha“ — krátke návraty striedajú s menšími skokmi.';
}

function raMemoryConflictDeep(s5,s10,s25,s50){
if(!s5||!s10)return null;
if(s50&&s5.topCol!==s50.topCol){
return'Konflikt pamäte: krátkodobý flow favorizuje <b>'+raColName(s5.topCol)+'</b>, ale dlhodobá pamäť session stále drží návraty do <b>'+raColName(s50.topCol)+'</b>.';
}
if(s25&&s5.topDoz!==s25.topDoz){
return'Konflikt pamäte: krátkodobo tlačí <b>'+raDozName(s5.topDoz)+'</b>, no od začiatka session dominuje skôr <b>'+raDozName(s25.topDoz)+'</b>.';
}
if(s10&&s5.topCol!==s10.topCol){
return'Konflikt pamäte: posledných 5 spinov iný stĺpec než okno 10 — pamäť sa ešte nezhodla.';
}
return null;
}

function raSessionQuality(mode,pat,oscCol){
if(mode==='DEAD_SPIN')return{label:'SLABÁ',cls:'ra-q-weak',desc:'Session je ťažko čitateľná.'};
if(mode==='WARNING'||pat.rate<55)return{label:'SLABÁ',cls:'ra-q-weak',desc:'Kvalita session je slabá — veľa šumu.'};
if(pat.rate>=72&&oscCol<50)return{label:'ČITATEĽNÁ',cls:'ra-q-read',desc:'Session je čitateľná — flow dáva zmysel.'};
if(oscCol>=55&&pat.rate<65)return{label:'CHAOTICKÁ',cls:'ra-q-chaos',desc:'Session je čitateľná len čiastočne.'};
if(pat.rate>=65&&oscCol<45)return{label:'RYTMICKÁ',cls:'ra-q-rhythm',desc:'Koleso vytvára rytmický flow bez prudkých breakoutov.'};
return{label:'NEISTÁ',cls:'ra-q-chaos',desc:'Session sa ešte formuje.'};
}

function raInternalOpinion(mode,pat,colorSt,colRet,newFlow){
if(mode==='DEAD_SPIN')return'AI by zatiaľ vôbec nešla agresívne — session nemá zmysel na vstup.';
if(newFlow&&pat.rate<65)return'AI momentálne viac verí pozorovaniu než breakout-u — nový flow ešte nie je potvrdený.';
if(colRet.rate>=58&&pat.rate>=65)return'AI momentálne viac verí návratovému flow než prudkému breakout-u.';
if(colorSt.len>=5&&colorSt.color==='červená')return'AI by zatiaľ nešla agresívne proti červenému flow — radšej čaká na korekciu alebo potvrdenie.';
if(colorSt.len>=5&&colorSt.color==='čierna')return'AI by zatiaľ nešla agresívne proti čiernemu flow — streak je dlhý, ale follow-up slabne.';
if(pat.rate>=60)return'AI by zatiaľ išla opatrne — flow drží, ale bez tvrdení.';
return'AI nemá ešte vnútorný názor — potrebuje viac spinov.';
}

function raPatternRateOnSlice(slice){
const colRet=raReturnHits(slice,'col'),dozRet=raReturnHits(slice,'doz');
const rates=[];
if(colRet.trials>=3)rates.push(colRet.rate);
if(dozRet.trials>=3)rates.push(dozRet.rate);
return rates.length?Math.round(rates.reduce((a,b)=>a+b,0)/rates.length):50;
}

function raFlowStrength(pat,colorSt,colRet,behaviorId){
if(behaviorId==='DEAD_SPIN')return{label:'SLABÁ',cls:'ra-fs-weak'};
let score=pat.rate*0.45+(colorSt.len>=4?18:0)+(colRet.rate>=50?colRet.rate*0.35:0);
if(score>=72)return{label:'SILNÁ',cls:'ra-fs-strong'};
if(score>=52)return{label:'STREDNÁ',cls:'ra-fs-mid'};
return{label:'SLABÁ',cls:'ra-fs-weak'};
}

function raBehaviorMode(baseMode,pat,oscCol,newFlow,colRet,colorSt,watchLine,slice){
if(baseMode==='DEAD_SPIN')return{id:'DEAD_SPIN',label:skRaModeLabel('DEAD_SPIN'),cls:'ra-mode-dead'};
if(slice.length>=2&&slice[slice.length-1]===slice[slice.length-2]&&slice[slice.length-1]!==0){
return{id:'ANOMALY',label:skRaModeLabel('ANOMALY'),cls:'ra-mode-anomaly'};
}
if(colRet.rate>=58&&oscCol<48&&pat.rate>=55)return{id:'REVERSAL',label:skRaModeLabel('REVERSAL'),cls:'ra-mode-reversal'};
if(newFlow&&pat.rate<68)return{id:'BREAKOUT',label:skRaModeLabel('BREAKOUT'),cls:'ra-mode-breakout'};
if(baseMode==='WARNING')return{id:'WARNING',label:skRaModeLabel('WARNING'),cls:'ra-mode-warning'};
if(watchLine||pat.rate<65)return{id:'OBSERVATION',label:skRaModeLabel('OBSERVATION'),cls:'ra-mode-observe'};
if(pat.rate>=72&&oscCol<50)return{id:'FLOW',label:skRaModeLabel('FLOW'),cls:'ra-mode-flow'};
return{id:'OBSERVATION',label:skRaModeLabel('OBSERVATION'),cls:'ra-mode-observe'};
}

function raSessionPersonalityMemory(profile){
if(!profile||spins.length<15)return null;
const recent=spins.slice(-15);
const recentOsc=raOscillationScore(recent,'col');
const recentPat=raPatternRateOnSlice(recent);
if(profile.osc>=58&&recentOsc<=44&&recentPat>=58){
return'Pamäť osobnosti session: začiatok bol veľmi chaotický, ale posledných 15 spinov začína vytvárať stabilnejší flow.';
}
if(profile.osc<=42&&recentOsc>=56){
return'Pamäť osobnosti session: začiatok bol čitateľný, no posledných 15 spinov session rozpadá do chaosu.';
}
if(profile.pat>=65&&recentPat<profile.pat-14){
return'Pamäť osobnosti session: na začiatku silnejší pattern ('+profile.label+'), teraz flow stráca kontinuitu.';
}
if(profile.pat<55&&recentPat>=profile.pat+15){
return'Pamäť osobnosti session: začiatok bol '+profile.label+', no posledných 15 spinov sa flow pomaly číta lepšie.';
}
return'Pamäť osobnosti session: od začiatku '+profile.label+' — AI túto session už pozná ('+spins.length+' spinov).';
}

function raFalseFlow(s5,pat,colRet,newFlow){
if(!newFlow||!s5)return null;
if(pat.rate<58||colRet.rate<50){
return'AI zatiaľ neverí novému trendu <b>'+raColName(s5.topCol)+'</b>. Flow pôsobí skôr ako krátkodobý breakout.';
}
if(pat.rate<65){
return'AI zatiaľ neverí novému trendu — vyzerá silno, ale pamäť patternov ešte nedrží.';
}
return null;
}

function raDeepIntuition(slice,s10){
if(!s10||slice.length<6)return'';
let samePoint=0;
const target=s10.topCol;
for(let i=1;i<slice.length;i++){
const a=columnIndexForNum(slice[i-1]),b=columnIndexForNum(slice[i]);
if(a===target&&b===target)samePoint++;
}
if(samePoint>=3)return'AI má pocit, že wheel sa príliš často vracia do rovnakého flow bodu (<b>'+raColName(target)+'</b>).';
return raFlowIntuition(slice,s10);
}

function raGradualFlowEvolution(slice){
if(slice.length<12)return null;
const a=slice.slice(-12,-6),b=slice.slice(-6);
const oscA=raOscillationScore(a,'col'),oscB=raOscillationScore(b,'col');
const patA=raPatternRateOnSlice(a),patB=raPatternRateOnSlice(b);
if(patB>=patA+12&&oscB<=oscA-8)return'Flow sa posledných 6 spinov pomaly stabilizuje.';
if(patB<=patA-12)return'Flow sa posledných 6 spinov pomaly rozpadá — AI to číta ako postupný úpadok.';
if(oscB<oscA-10)return'Posledných 6 spinov: menej chaotický pohyb stĺpcov, wheel sa upokojuje.';
if(oscB>oscA+12)return'Posledných 6 spinov: chaos stĺpcov rastie oproti predchádzajúcim 6.';
return null;
}

function raSpinSurprise(prev,slice,s10){
if(!prev||!s10||slice.length<2)return null;
const last=slice[slice.length-1],ci=columnIndexForNum(last);
if(ci<0||prev.last==null)return null;
const prevCi=columnIndexForNum(prev.last);
if(ci===s10.topCol&&prevCi!==ci&&prev.s5&&prev.s5.topCol!==ci){
return'AI neočakávala tak rýchly návrat do <b>'+raColName(ci)+'</b> — wheel skočil späť skôr, než analytik čakal.';
}
if(prev.patRate<50&&raPatternRateOnSlice(slice.slice(-6))>=62){
return'AI neočakávala tak rýchle ustálenie flow — chaos sa zmenil na čitateľný rytmus v pár spinoch.';
}
return null;
}

function raSuccessMemory(pat,prev){
const fs=adaptiveWeights.failStreak;
if(fs>=3)return'AI flow posledných spinov momentálne nevychádza stabilne — vnútorná pamäť úspešnosti je opatrná.';
if(prev&&prev.patRate>=65&&pat.rate<prev.patRate-12){
return'AI flow posledných spinov momentálne nevychádza stabilne — patterny stratili kontinuitu.';
}
if(pat.rate>=68&&fs<=1)return'AI si pamätá: posledné čítanie flow sedelo — drží pokojný, konzistentný tón.';
return'';
}

function raFlowTension(colRet,newFlow,s5,s50,memoryConflictDeep){
if(memoryConflictDeep)return'AI cíti rastúce napätie medzi návratovým flow a breakout trendom — pamäť sa nezhoduje.';
if(colRet.rate>=55&&newFlow&&s50&&s5&&s5.topCol!==s50.topCol){
return'AI cíti rastúce napätie medzi návratovým flow a breakout trendom.';
}
return null;
}

const RA_SILENCE_MSG='AI zatiaľ nevidí nič dostatočne silné na výrazný flow záver.';

function raStripHtml(s){return(s||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();}

function raPickMainInsight(ctx){
if(ctx.baseMode==='DEAD_SPIN'||ctx.mode==='DEAD_SPIN'){
return{main:'Session prešla do mŕtvych spinov.',tier:3,alert:true};
}
if(ctx.mode==='ANOMALY'){
return{main:'Brutálna anomália na wheeli — flow sa môže okamžite zlomiť.',tier:3,alert:true};
}
if(ctx.strongAlert){
return{main:raStripHtml(ctx.strongAlert),tier:3,alert:true};
}
if(ctx.spinSurprise){
return{main:raStripHtml(ctx.spinSurprise),tier:3,alert:true};
}
if(ctx.surprise){
return{main:raStripHtml(ctx.surprise).replace(/^AI ALERT:\s*/i,''),tier:3,alert:true};
}
if(ctx.falseFlow){
return{main:raStripHtml(ctx.falseFlow),tier:3,alert:true};
}
if(ctx.suspicious&&ctx.colRet&&ctx.colRet.rate>=55){
return{main:raStripHtml(ctx.suspicious),tier:3,alert:true};
}
if(ctx.flowTension){
return{main:raStripHtml(ctx.flowTension),tier:2,alert:false};
}
if(ctx.memoryConflictDeep){
return{main:raStripHtml(ctx.memoryConflictDeep),tier:2,alert:false};
}
if(ctx.weakFollow&&ctx.colorSt&&ctx.colorSt.len>=4){
const c=ctx.colorSt.color;
return{main:(c==='červená'?'Červený':'Čierny')+' flow začína byť preťažený.',tier:2,alert:false};
}
if(ctx.s10&&ctx.colRet&&ctx.colRet.rate>=55&&ctx.colRet.trials>=4){
return{main:raColName(ctx.s10.topCol)+' stále absorbuje návraty flow.',tier:2,alert:false};
}
if(ctx.mode==='BREAKOUT'&&ctx.s10){
return{main:'Nový breakout smerom k '+raColName(ctx.s10.topCol)+' — AI ešte neverí trendu.',tier:2,alert:false};
}
if(ctx.mode==='REVERSAL'&&ctx.s10){
return{main:'Návratový flow v '+raColName(ctx.s10.topCol)+' sa opäť aktivoval.',tier:2,alert:false};
}
if(ctx.newFlow&&ctx.s10){
return{main:'Rodí sa nový flow okolo '+raColName(ctx.s10.topCol)+' — čakám na potvrdenie.',tier:2,alert:false};
}
if(ctx.pat&&ctx.pat.rate>=68&&ctx.colorSt&&ctx.colorSt.len>=3){
const c=ctx.colorSt.color;
return{main:(c==='červená'?'Červený':'Čierny')+' flow drží momentum — session sa číta.',tier:2,alert:false};
}
if(ctx.fatigue&&ctx.fatigue[0]&&ctx.pat&&ctx.pat.rate>=62){
return{main:raStripHtml(ctx.fatigue[0]),tier:2,alert:false};
}
return{main:null,tier:0,alert:false};
}

function raResolveNarrative(ctx,liveFeed){
const picked=raPickMainInsight(ctx);
if(picked.main){
let sub=null;
if(!picked.alert&&liveFeed.primary.length){
sub=raStripHtml(liveFeed.primary[0].text);
if(sub&&sub.length>100)sub=sub.slice(0,100)+'…';
if(sub===picked.main)sub=null;
}
return{
mainInsight:picked.main,
mainTier:picked.tier,
mainAlert:picked.alert,
subNote:sub,
isSilent:false,
silenceMsg:null
};
}
if(ctx.baseMode==='DEAD_SPIN'){
return{mainInsight:'Session prešla do mŕtvych spinov.',mainTier:3,mainAlert:true,subNote:null,isSilent:false,silenceMsg:null};
}
return{mainInsight:null,mainTier:0,mainAlert:false,subNote:null,isSilent:true,silenceMsg:RA_SILENCE_MSG};
}

function raFormatImportance(text,level){
if(!text)return'';
if(level>=3)return'<div class="ra-strong-alert"><b>SILNÝ ALERT:</b> '+text.replace(/<b>SILNÝ ALERT:<\/b>\s*/i,'').replace(/<b>AI ALERT:<\/b>\s*/i,'')+'</div>';
if(level===2)return text;
return'<span class="ra-dim">'+text+'</span>';
}

function raVoiceLine(text,kind){
if(!text)return'';
if(kind==='feel'&&!/^AI má pocit/i.test(text)&&!/^AI cíti/i.test(text)){
return'AI má pocit, že '+text.charAt(0).toLowerCase()+text.slice(1);
}
return text;
}

function raBuildLiveFeed(ctx){
const feed=[];
const push=(text,priority)=>{if(text)feed.push({text,priority});};
if(ctx.strongAlert)push(ctx.strongAlert,3);
if(ctx.surprise)push(ctx.surprise,3);
if(ctx.spinSurprise)push(ctx.spinSurprise,3);
if(ctx.falseFlow)push(ctx.falseFlow,3);
if(ctx.sessionMemory)push(ctx.sessionMemory,2);
if(ctx.flowTension)push(ctx.flowTension,2);
if(ctx.wheelFeel)push(ctx.wheelFeel,2);
if(ctx.sessionVibe)push(ctx.sessionVibe,2);
if(ctx.deepIntuition)push(ctx.deepIntuition,2);
if(ctx.gradualEvolution)push(ctx.gradualEvolution,2);
if(ctx.prepareNote)push('<b>Priprav sa:</b> '+ctx.prepareNote,2);
if(ctx.innerOpinion)push(ctx.innerOpinion,2);
if(ctx.memoryConflictDeep)push(ctx.memoryConflictDeep,2);
else if(ctx.conflict)push(ctx.conflict,2);
if(ctx.flowChange)push('<b>Zmena flow:</b> '+ctx.flowChange,2);
if(ctx.selfCrit)push(ctx.selfCrit,2);
if(ctx.successMemory)push(ctx.successMemory,2);
if(ctx.suspicious)push(ctx.suspicious,2);
if(ctx.randomVsPat)push(ctx.randomVsPat,1);
if(ctx.patience)push(ctx.patience,1);
if(ctx.trendFatigueStart)push(ctx.trendFatigueStart,1);
if(ctx.flowHistory)push(ctx.flowHistory,1);
if(ctx.positiveNote)push('<span class="greenTxt">'+ctx.positiveNote+'</span>',1);
ctx.fatigue.forEach(t=>push(t,1));
ctx.hidden.slice(0,1).forEach(t=>push(t,1));
feed.sort((a,b)=>b.priority-a.priority);
const strong=feed.filter(f=>f.priority>=3).slice(0,1);
const primary=feed.filter(f=>f.priority===2).slice(0,4);
const secondary=feed.filter(f=>f.priority===1).slice(0,2);
return{strong,primary,secondary,feed};
}

function rbaStreakLen(slice,pred){
if(!slice.length)return{len:0,what:'—'};
const last=slice[slice.length-1];
if(last===0&&!pred(last,last))return{len:0,what:'—'};
let len=1;
for(let i=slice.length-2;i>=0;i--){
const n=slice[i];
if(n===0)break;
if(pred(n,last))len++;else break;
}
return{len,what:pred(last,last)?String(last):'—'};
}
function rbaColStreak(slice){
const lastCi=columnIndexForNum(slice[slice.length-1]);
if(lastCi<0)return{len:0,what:'—'};
return rbaStreakLen(slice,n=>{const c=columnIndexForNum(n);return c>=0&&c===lastCi;});
}
function rbaDozStreak(slice){
const lastDi=dozenIndexForNum(slice[slice.length-1]);
if(lastDi<0)return{len:0,what:'—'};
return rbaStreakLen(slice,n=>{const d=dozenIndexForNum(n);return d>=0&&d===lastDi;});
}
function rbaWeightedBins(field){
const bins=field==='col'?[0,0,0]:[0,0,0];
RA_MEMORY_WINDOWS.forEach(w=>{
if(spins.length<w)return;
const st=raSliceStats(w);
if(!st)return;
const arr=field==='col'?st.cols:st.doz;
const wt=RBA_WIN_WEIGHT[w]||.2;
arr.forEach((v,i)=>{bins[i]+=v*wt;});
});
return bins;
}
function rbaTopTwoLabels(bins,namer){
const order=[0,1,2].sort((a,b)=>bins[b]-bins[a]);
const t1=namer(order[0]),t2=namer(order[1]);
return t1===t2?t1:t1+' · '+t2;
}
function rbaSuppressionLines(slice){
const out=[];
const last20=slice.slice(-20).filter(n=>n!==0);
[0,1,2].forEach(i=>{
const hit=last20.some(n=>(columnIndexForNum(n))===i);
if(!hit&&last20.length>=12)out.push(raColName(i)+' je potlačený — RNG ho ignoruje (nie „musí prísť“).');
});
[0,1,2].forEach(i=>{
const hit=last20.some(n=>(dozenIndexForNum(n))===i);
if(!hit&&last20.length>=12)out.push(raDozName(i)+' chýba v okne — suppression flow.');
});
return out.slice(0,2);
}
function rbaChaosIndex(oscCol,oscDoz,pat,mig){
let c=Math.round((oscCol+oscDoz)/2);
if(pat.rate<55)c+=12;
if(mig&&mig>=3)c+=8;
return Math.min(100,c);
}
function rbaChaosTag(c){
if(c>=78)return{level:'EXTREME',label:'EXTREME',cls:'redTxt'};
if(c>=62)return{level:'HIGH',label:'HIGH',cls:'redTxt'};
if(c>=45)return{level:'MEDIUM',label:'MEDIUM',cls:'yellowTxt'};
return{level:'LOW',label:'LOW',cls:'greenTxt'};
}
function rbaFlowStateId(pat,oscCol,colorSt,chaos,mode){
if(mode==='DEAD')return{ id:'DEAD',label:'DEAD FLOW',cls:'ra-mode-dead'};
if(chaos.level==='EXTREME'||chaos.level==='HIGH')return{ id:'CHAOTIC',label:'CHAOTIC FLOW',cls:'ra-mode-warning'};
if(pat.rate<RA_PATTERN_WARN)return{ id:'COLLAPSING',label:'COLLAPSING FLOW',cls:'ra-mode-dead'};
if(oscCol>=62)return{ id:'ALTERNATING',label:'ALTERNATING FLOW',cls:'ra-mode-reversal'};
if(colorSt.len>=4||pat.rate>=70)return{ id:'REPEAT',label:skUiLabel('REPEAT FLOW'),cls:'ra-mode-flow'};
if(oscCol>=48&&oscCol<62)return{ id:'MIGRATING',label:'MIGRATING FLOW',cls:'ra-mode-breakout'};
if(pat.rate>=68)return{ id:'STABLE',label:'STABLE FLOW',cls:'ra-mode-flow'};
return{ id:'AGGRESSIVE',label:'AGGRESSIVE FLOW',cls:'ra-mode-breakout'};
}
function rbaSessionMood(pat,chaos,colorSt,oscCol){
if(chaos.level==='EXTREME')return{ id:'CHAOTIC',label:'CHAOTIC',cls:'redTxt'};
if(chaos.level==='HIGH')return{ id:'NERVOUS',label:'NERVOUS',cls:'yellowTxt'};
if(colorSt.len>=6)return{ id:'OVERHEATED',label:'OVERHEATED',cls:'yellowTxt'};
if(pat.rate>=72&&oscCol<45)return{ id:'CALM',label:'CALM',cls:'greenTxt'};
if(pat.rate<55)return{ id:'UNSTABLE',label:'UNSTABLE',cls:'redTxt'};
if(oscCol>=55)return{ id:'AGGRESSIVE',label:'AGGRESSIVE',cls:'yellowTxt'};
return{ id:'PASSIVE',label:'PASSIVE',cls:'yellowTxt'};
}
function rbaFlowHealth(pat,chaos,mode){
if(mode==='DEAD'||pat.rate<50)return{ label:'DEAD',cls:'ra-fs-weak'};
if(chaos.level==='HIGH'||chaos.level==='EXTREME')return{ label:'COLLAPSING',cls:'ra-fs-weak'};
if(pat.rate<62)return{ label:'WEAKENING',cls:'ra-fs-weak'};
if(pat.rate>=72)return{ label:'STABLE',cls:'ra-fs-strong'};
if(pat.rate>=58)return{ label:'BUILDING',cls:'ra-fs-mid'};
return{ label:'WEAKENING',cls:'ra-fs-weak'};
}
function rbaEdgeStatus(pat,chaos,wait){
if(wait)return{ label:'NO EDGE',cls:'redTxt'};
if(chaos.level==='HIGH'||chaos.level==='EXTREME'||pat.rate<55)return{ label:'NO EDGE',cls:'redTxt'};
if(pat.rate>=75)return{ label:'STRONG EDGE',cls:'greenTxt'};
if(pat.rate>=68)return{ label:'MEDIUM EDGE',cls:'yellowTxt'};
if(pat.rate>=60)return{ label:'LOW EDGE',cls:'yellowTxt'};
return{ label:'NO EDGE',cls:'redTxt'};
}
function rbaBehaviorPicks(s5,s10,slice,colorSt){
const colBins=rbaWeightedBins('col'),dozBins=rbaWeightedBins('doz');
const columns=rbaTopTwoLabels(colBins,raColName);
const dozens=rbaTopTwoLabels(dozBins,raDozName);
let color='—';
if(s5&&s10){
const shortDom=s5.redPct>=s5.blackPct?'červená':'čierna';
const longDom=s10.redPct>=s10.blackPct?'červená':'čierna';
if(colorSt.len>=4&&shortDom===colorSt.color){
color=(shortDom==='červená'?'čierna':'červená')+' (korekcia tlaku)';
}else color=longDom+' (flow)';
}
let size='—',parity='—';
if(s10){
size=s10.highPct>=58?'VEĽKÉ':s10.lowPct>=58?'MALÉ':'MALÉ / VEĽKÉ — neutrál';
parity=s10.evenPct>=58?'PÁRNE':s10.oddPct>=58?'NEPÁRNE':'PÁRNE / NEPÁRNE — neutrál';
}
return{ dozens, columns, color, size, parity };
}
function rbaObserveInsight(n){
const msgs=[
'Zbieram dáta — flow ešte nie je stabilný.',
'Potrebujem viac spinov pred behavior úsudkom.',
'Session ešte nemá dostatočný behavior obraz.',
'Sledujem RNG — reálne hodnotenia od '+RBA_FULL_MIN+'. spinu.'
];
return msgs[n%msgs.length];
}
function rbaSelfSuccessRate(){
if(rbaSelfEvalHits.length<4)return 70;
return Math.round(rbaSelfEvalHits.reduce((a,b)=>a+b,0)/rbaSelfEvalHits.length*100);
}
function rbaLogSession(evt){
rbaSessionLog.push({spin:spins.length,evt,ts:Date.now()});
if(rbaSessionLog.length>40)rbaSessionLog.shift();
}
function rbaDominanceShare(st){
if(!st)return 0;
const arr=st.cols||[0,0,0];
const t=arr.reduce((a,b)=>a+b,0);
return t?Math.round(Math.max(...arr)/t*100):0;
}
function rbaFlowDNA(ctx){
const{pat,oscCol,oscDoz,colorSt,colSt,dozSt,chaos,s10,s5,slice}=ctx;
const scores={
CLEAN:0,STICKY:0,HEAVY:0,TOXIC:0,FAST_SWITCH:0,CHAOTIC:0,COLD:0,OVERHEATED:0
};
if(chaos.level==='EXTREME'||chaos.level==='HIGH'){scores.CHAOTIC+=40;scores.TOXIC+=25;}
if(oscCol>=62){scores.FAST_SWITCH+=35;scores.TOXIC+=10;}
if(colSt.len>=4||colorSt.len>=4){scores.STICKY+=30;scores.HEAVY+=15;}
if(colorSt.len>=6||colSt.len>=6){scores.OVERHEATED+=40;}
if(pat.rate>=72&&oscCol<42&&chaos.level==='LOW'){scores.CLEAN+=38;}
if(pat.rate>=65&&oscCol<50&&(colSt.len>=3||colorSt.len>=3))scores.STICKY+=22;
if(s10&&rbaDominanceShare(s10)>=48)scores.HEAVY+=28;
if(pat.rate<55&&chaos.level!=='LOW'){scores.TOXIC+=30;scores.CHAOTIC+=15;}
if(pat.rate>=50&&pat.rate<62&&oscCol<40&&colorSt.len<3)scores.COLD+=32;
if(oscDoz>=58)scores.FAST_SWITCH+=12;
const top=Object.keys(scores).sort((a,b)=>scores[b]-scores[a])[0];
const reasons={
CLEAN:'Flow je čistý a stabilný bez agresívneho switching.',
STICKY:'RNG drží sticky repeat — dominancia sa lepí na rovnaký sektor.',
HEAVY:'Session má ťažký dominance flow — jeden sektor tlačí dlho.',
TOXIC:'RNG vytvára toxický chaotic flow — štruktúra je nezdravá.',
FAST_SWITCH:'Rýchle prepínanie medzi stĺpcami — nervózny switching charakter.',
CHAOTIC:'Chaotická osobnosť flowu — RNG odmieta stabilnú štruktúru.',
COLD:'Pokojný cold flow — nízka intenzita, málo agresívnych patternov.',
OVERHEATED:'Session pôsobí prehriato po dlhom repeat momentum.'
};
return{type:top,label:top.replace(/_/g,' '),score:scores[top],reason:reasons[top]||'Flow DNA sa profiluje.'};
}
function rbaFlowFatigueEngine(ctx){
const{colSt,dozSt,colorSt,pat,s10,slice}=ctx;
const lines=[];
let score=0;
const domLen=Math.max(colSt.len,dozSt.len,colorSt.len);
if(domLen>=5){score+=22;lines.push((colSt.len>=dozSt.len?raColName(s10?s10.topCol:0):raDozName(s10?s10.topDoz:0))+' už pôsobí vyčerpane.');}
if(colorSt.len>=6){score+=18;lines.push('Repeat flow stráca energiu — '+colorSt.color+' streak je preťažený.');}
if(domLen>=4&&pat.rate<68){score+=14;lines.push('Dominancia začína byť preťažená.');}
if(pat.rate>=70&&domLen>=4)lines.push('Momentum slabne po agresívnom streaku.');
const weak=raFollowUpWeakness(slice);
if(weak){score+=16;lines.push(weak+' flow už nedrží rovnaký tlak.');}
return{score:Math.min(100,score),tired:score>=28,lines:lines.slice(0,2)};
}
function rbaFalseFlowDetector(ctx){
const{pat,colSt,chaos,colRet,s5,s10,oscCol}=ctx;
let fake=false,reason='';
if(pat.rate>=62&&pat.rate<70&&colSt.len<3&&oscCol>=48){
fake=true;reason='Flow síce vyzerá stabilne, ale nemá dostatočnú momentum podporu.';
}else if(colSt.len>=2&&colSt.len<=3&&colRet.rate<52){
fake=true;reason='Dominancia je príliš krátka na dôveryhodný edge.';
}else if(pat.rate>=65&&chaos.level!=='LOW'&&colRet.rate<55){
fake=true;reason='RNG vytvára falošný repeat pattern — chaotic support pod povrchom.';
}else if(s5&&s10&&s5.topCol===s10.topCol&&pat.rate<60){
fake=true;reason='Povrchová stabilita bez reálnej štruktúry v pattern pamäti.';
}
return{fake,reason};
}
function rbaFlowRecoveryDetector(ctx,prev){
if(!prev||ctx.phase==='OBSERVE')return{active:false,reason:''};
const chaosDrop=prev.chaosLevel&&ctx.chaos.level!=='HIGH'&&ctx.chaos.level!=='EXTREME'&&(prev.chaosLevel==='HIGH'||prev.chaosLevel==='EXTREME');
const patUp=ctx.pat.rate>=58&&prev.patRate<55;
const oscDown=ctx.oscCol<52&&prev.oscCol>=58;
if(chaosDrop&&patUp){
return{active:true,reason:'Po chaotic phase začína vznikať nový repeat flow.'};
}
if(oscDown&&ctx.pat.rate>=55){
return{active:true,reason:'RNG sa po nestabilnom switching znovu upokojuje.'};
}
if(patUp&&ctx.chaos.level==='LOW'){
return{active:true,reason:'Session sa pomaly vracia do stabilného flowu.'};
}
return{active:false,reason:''};
}
function rbaSessionTemperature(ctx){
const{pat,chaos,colorSt,colSt,oscCol,mig}=ctx;
let score=50;
if(chaos.level==='EXTREME')score=95;
else if(chaos.level==='HIGH')score=82;
else if(colorSt.len>=6||colSt.len>=6)score=78;
else if(pat.rate>=72&&oscCol<45)score=42;
else if(pat.rate<55)score=38;
else if(oscCol>=60)score=72;
if(mig>=3)score+=8;
let level='WARM',line='Session je teplá — stredná intenzita RNG.';
if(score>=90){level='CHAOTIC';line='RNG je v chaotic teplote — nestabilná session.';}
else if(score>=82){level='BURNING';line='RNG vytvára burning momentum.';}
else if(score>=70){level='OVERHEATED';line='Session je momentálne prehrievaná.';}
else if(score>=58){level='HOT';line='Flow je horúci — agresívnejší behavior.';}
else if(score<40){level='COLD';line='Flow zostáva pokojný a cold.';}
return{level,score,line};
}
function rbaFlowPressureSystem(ctx){
const{pat,oscCol,chaos,colSt,colorSt,suppression,colRet}=ctx;
const repeatP=Math.min(100,(colSt.len+colorSt.len)*12+Math.max(0,pat.rate-50));
const reversalP=Math.min(100,oscCol+(pat.rate<60?18:0)+(ctx.health&&ctx.health.label==='WEAKENING'?15:0));
const chaosP=chaos.level==='EXTREME'?92:chaos.level==='HIGH'?78:chaos.level==='MEDIUM'?48:22;
const domShare=ctx.s10?rbaDominanceShare(ctx.s10):0;
const dominanceP=Math.min(100,domShare+(colSt.len>=4?18:0));
const suppressionP=Math.min(100,(suppression?suppression.length:0)*35+(colRet.rate<50?20:0));
const pressures=[
{key:'REPEAT',val:repeatP,line:repeatP>=60?'Repeat pressure zostáva silný.':''},
{key:'REVERSAL',val:reversalP,line:reversalP>=58?'Reversal pressure začína rásť.':''},
{key:'CHAOS',val:chaosP,line:chaosP>=65?'Chaos pressure prekrýva dominanciu.':''},
{key:'DOMINANCE',val:dominanceP,line:dominanceP>=62?'Dominance pressure drží session v jednom pásme.':''},
{key:'SUPPRESSION',val:suppressionP,line:suppressionP>=50?'Suppression pressure — RNG ignoruje časti wheelu.':''}
];
pressures.sort((a,b)=>b.val-a.val);
const collapseRisk=chaosP>=70&&dominanceP>=55&&reversalP>=55;
return{dominant:pressures[0].key,top:pressures[0],collapseRisk,lines:pressures.filter(p=>p.line).map(p=>p.line).slice(0,2)};
}
function rbaRngStabilityIndex(ctx){
const{oscCol,oscDoz,pat,colSt,chaos,colorSt}=ctx;
let idx=70;
idx-=Math.round((oscCol+oscDoz)/6);
idx+=Math.min(20,pat.rate-50);
idx-=colSt.len>=6?15:0;
if(chaos.level==='HIGH')idx-=22;
if(chaos.level==='EXTREME')idx-=35;
if(colorSt.len>=5&&pat.rate>=65)idx-=8;
idx=clamp(idx,0,100);
let label='STABLE';
if(idx>=78)label='VERY STABLE';
else if(idx>=58)label='STABLE';
else if(idx>=38)label='UNSTABLE';
else label='HIGHLY CHAOTIC';
return{index:idx,label};
}
function rbaAnalystTrust(ctx,selfRate,rngStab,edge,falseFlow){
let score=55;
score+=(selfRate-50)*0.35;
if(rngStab.label==='VERY STABLE'||rngStab.label==='STABLE')score+=14;
else if(rngStab.label==='HIGHLY CHAOTIC')score-=28;
else score-=12;
if(ctx.chaos.level==='HIGH'||ctx.chaos.level==='EXTREME')score-=20;
if(edge.label==='STRONG EDGE')score+=12;
else if(edge.label==='NO EDGE')score-=18;
if(falseFlow&&falseFlow.fake)score-=15;
score=clamp(Math.round(score),0,100);
let level='MEDIUM TRUST',line='Držím strednú dôveru — flow je čiastočne čitateľný.';
if(score>=72){level='HIGH TRUST';line='Session zostáva čitateľná a trust rastie.';}
else if(score<38){level='NO TRUST';line='Momentálne nemám dôveru v tento flow.';}
else if(score<55){level='LOW TRUST';line='Momentálne mám nízku dôveru v tento flow.';}
return{level,score,line};
}
function rbaFlowEvolutionTracking(ctx,dna){
const snap={spin:spins.length,dna:dna.type,chaos:ctx.chaos.level,pat:ctx.pat.rate,osc:ctx.oscCol};
const prev=rbaEvolutionTrack[rbaEvolutionTrack.length-1];
if(!prev||prev.spin!==snap.spin){
rbaEvolutionTrack.push(snap);
if(rbaEvolutionTrack.length>24)rbaEvolutionTrack.shift();
}
const phases=rbaEvolutionTrack;
let story='Session sa vyvíja.';
if(phases.length>=4){
const first=phases[0],last=phases[phases.length-1];
if((first.dna==='CLEAN'||first.dna==='STICKY')&&(last.chaos==='HIGH'||last.chaos==='EXTREME')){
story='Session začala stabilným repeat flowom, ale neskôr prešla do chaotic switching.';
}else if(first.chaos==='HIGH'&&last.pat>=58){
story='Po chaotic štarte session pomaly buduje novú štruktúru.';
}else if(last.pat<55){
story='Dominancia sa po silnom momente začína rozpadávať.';
}else{
story='Flow evolúcia: '+first.dna+' → '+last.dna+' (chaos '+first.chaos+' → '+last.chaos+').';
}
}
return{story,phases:phases.slice(-6)};
}
function rbaMicroWindowDetector(slice,pat,oscCol){
const micro=slice.slice(-5).filter(n=>n!==0);
const prior=slice.slice(-10,-5).filter(n=>n!==0);
if(micro.length<4)return{active:false,line:''};
const oscM=raOscillationScore(micro,'col');
const oscP=prior.length>=4?raOscillationScore(prior,'col'):oscCol;
if(oscM<38&&pat.rate>=62){
return{active:true,line:'RNG momentálne vytvára krátke stabilné repeat window.'};
}
if(oscM<42&&oscP>=55){
return{active:true,line:'Session krátkodobo stabilizovala switching.'};
}
if(pat.rate>=60&&oscM<45){
return{active:true,line:'Vzniká malé low-chaos okno.'};
}
return{active:false,line:''};
}
function rbaAnalystSilence(ctx,trust,rngStab){
if(ctx.phase==='OBSERVE')return{active:false,msg:''};
if(ctx.chaos.level==='EXTREME'||rngStab.label==='HIGHLY CHAOTIC'){
return{active:true,msg:'RNG pôsobí príliš chaoticky.'};
}
if(ctx.pat.rate<52&&ctx.oscCol>=58){
return{active:true,msg:'Momentálne nevidím čitateľný flow.'};
}
if((trust.level==='NO TRUST'||trust.level==='ŽIADNA DÔVERA')&&(ctx.edge.label==='NO EDGE'||ctx.edge.label==='BEZ VÝHODY')){
return{active:true,msg:'Session nemá dostatočnú štruktúru.'};
}
if(ctx.wait)return{active:true,msg:'Momentálne nevidím čitateľný flow.'};
return{active:false,msg:''};
}
function rbaFlowEgo(selfRate,trust,chaos,health){
let mode='balanced',tone='Vyvážený pozorovateľ.';
if(selfRate>=68&&trust.score>=65&&chaos.level==='LOW'&&health.label==='STABLE'){
mode='confident';tone='Čítam flow dobre — držím sebavedomý, no nie slepý tón.';
}else if(selfRate>=62&&trust.score>=58){
mode='assertive';tone='Mám čitateľný obraz — mierne odvážnejší behavior úsudok.';
}else if(selfRate<55||trust.level==='NO TRUST'||chaos.level==='HIGH'||chaos.level==='EXTREME'){
mode='cautious';tone='Som opatrný a skeptický — radšej počkám.';
}else if(health.label==='COLLAPSING'||health.label==='DEAD'){
mode='passive';tone='Pasívny režim — flow ma prekonal, stiahnem sa.';
}
return{mode,tone};
}
function rbaSessionIdentity(ctx,dna){
const{oscCol,colSt,colorSt,chaos,pat}=ctx;
let id='SWITCHING SESSION',line='Session je v switching režime.';
if(dna.type==='CHAOTIC'||dna.type==='TOXIC'||chaos.level==='HIGH'){
id='CHAOTIC SESSION';line='Chaotická session — RNG odmieta jednotný rytmus.';
}else if(colSt.len>=4||colorSt.len>=4||dna.type==='STICKY'||dna.type==='CLEAN'){
id='REPEAT SESSION';line='Repeat session — RNG drží behavior loop.';
}else if(oscCol>=58){
id='SWITCHING SESSION';line='Switching session — rýchle zmeny medzi pásmi.';
}else if(rbaDominanceShare(ctx.s10)>=50||dna.type==='HEAVY'){
id='HEAVY DOMINANCE SESSION';line='Ťažká dominance session — jeden sektor vládne.';
}else if(ctx.recovery&&ctx.recovery.active||oscCol>=52&&pat.rate<60){
id='REVERSAL SESSION';line='Reversal session — tlak na zlom trendu.';
}
return{id,label:id,line};
}
function rbaFlowMemoryPatternsUpdate(dna,chaos,s10){
const key=dna.type+'|'+chaos.level+'|'+(s10?s10.topCol:'x');
const hit=rbaFlowMemoryPatterns.find(p=>p.key===key);
if(hit)hit.count++;else rbaFlowMemoryPatterns.push({key,dna:dna.type,chaos:chaos.level,count:1,spin:spins.length});
if(rbaFlowMemoryPatterns.length>18)rbaFlowMemoryPatterns.shift();
const repeat=rbaFlowMemoryPatterns.filter(p=>p.count>=2);
let line='';
if(repeat.length){
const r=repeat[repeat.length-1];
if(r.dna==='CHAOTIC'||r.chaos==='HIGH')line='Tento typ chaosu sa počas session už viackrát objavil.';
else line='Column dominance sa opakovane vracia po chaos phase.';
}
return{line,recurring:repeat.length};
}
function rbaInternalCaution(ctx,trust,falseFlow,fatigue){
const lines=[];
if(ctx.chaos.level==='HIGH'||ctx.chaos.level==='EXTREME')lines.push('Session pôsobí nebezpečne chaoticky.');
if(falseFlow.fake)lines.push('Flow pôsobí príliš nestabilne na bezpečný vstup.');
if(fatigue.tired)lines.push('Momentálne neverím tomuto momentum.');
if(trust.level==='LOW TRUST'||trust.level==='NO TRUST')lines.push('Vnútorná opatrnosť: radšej pozorujem než tvrdenie.');
return lines.slice(0,2);
}
function rbaFlowPsychology(ctx,dna,temp,fatigue,mood){
const parts=[];
if(mood.id==='NERVOUS'||mood.id==='CHAOTIC')parts.push('Session pôsobí nervózne.');
else if(temp.level==='COLD')parts.push('Flow pôsobí pokojne a čitateľne.');
else if(dna.type==='STICKY'||dna.type==='HEAVY')parts.push('RNG tlačí agresívny repeat flow.');
if(fatigue.tired)parts.push('Dominancia začína byť emocionálne nestabilná.');
if(dna.type==='TOXIC')parts.push('RNG má toxický, nepredvídateľný charakter.');
if(!parts.length)parts.push('Psychológia session: '+temp.level.toLowerCase()+' · '+dna.label.toLowerCase()+'.');
return parts[0]||'Sledujem psychológiu flowu.';
}
function rbaPickPrimaryInsight(cands,silence){
if(silence.active)return silence.msg;
const ranked=cands.filter(Boolean).sort((a,b)=>(b.priority||0)-(a.priority||0));
return ranked.length?ranked[0].text:'Sledujem behavior session.';
}
function rbaRunAdvancedBehaviorSystems(ctx){
const dna=rbaFlowDNA(ctx);
const fatigue=rbaFlowFatigueEngine(ctx);
const falseFlow=rbaFalseFlowDetector(ctx);
const recovery=rbaFlowRecoveryDetector(ctx,rbaPrevBehaviorSnap);
const temperature=rbaSessionTemperature(ctx);
const pressure=rbaFlowPressureSystem(ctx);
const rngStability=rbaRngStabilityIndex(ctx);
const edge=ctx.edge;
const selfRate=ctx.selfRate;
const trust=rbaAnalystTrust(ctx,selfRate,rngStability,edge,falseFlow);
const evolution=rbaFlowEvolutionTracking(ctx,dna);
const micro=rbaMicroWindowDetector(ctx.slice,ctx.pat,ctx.oscCol);
const sessionIdentity=rbaSessionIdentity({...ctx,recovery},dna);
const flowMemory=rbaFlowMemoryPatternsUpdate(dna,ctx.chaos,ctx.s10);
const ego=rbaFlowEgo(selfRate,trust,ctx.chaos,ctx.health);
const caution=rbaInternalCaution(ctx,trust,falseFlow,fatigue);
const psychology=rbaFlowPsychology(ctx,dna,temperature,fatigue,ctx.mood);
const silence=rbaAnalystSilence(ctx,trust,rngStability);
const insightCandidates=[
{priority:95,text:silence.msg,tag:'ticho'},
{priority:88,text:recovery.active?recovery.reason:null,tag:'recovery'},
{priority:82,text:falseFlow.fake?falseFlow.reason:null,tag:'false'},
{priority:78,text:fatigue.lines[0]||null,tag:'fatigue'},
{priority:75,text:pressure.lines[0]||null,tag:'pressure'},
{priority:72,text:dna.reason,tag:'dna'},
{priority:68,text:micro.active?micro.line:null,tag:'micro'},
{priority:65,text:temperature.line,tag:'temp'},
{priority:62,text:evolution.story,tag:'evo'},
{priority:58,text:flowMemory.line||null,tag:'memory'},
{priority:55,text:psychology,tag:'psych'},
{priority:50,text:trust.line,tag:'trust'},
{priority:45,text:ego.tone,tag:'ego'}
];
const primaryInsight=rbaPickPrimaryInsight(insightCandidates,silence);
const secondary=insightCandidates.filter(c=>c.text&&c.text!==primaryInsight).sort((a,b)=>b.priority-a.priority).slice(0,1).map(c=>c.text)[0]||'';
rbaPrevBehaviorSnap={chaosLevel:ctx.chaos.level,patRate:ctx.pat.rate,oscCol:ctx.oscCol,dna:dna.type};
return{
dna,fatigue,falseFlow,recovery,temperature,pressure,rngStability,trust,evolution,micro,
sessionIdentity,flowMemory,ego,caution,psychology,silence,
primaryInsight,secondaryInsight:secondary,isSilent:silence.active
};
}
function computeRbaBehaviorAnalyst(){
const n=spins.length;
const phase=n<=RBA_OBS_MAX?'OBSERVE':n>=RBA_DEEP_MIN?'DEEP':'FULL';
const slice=spins.slice(-100);
const s5=n>=5?raSliceStats(5):null,s10=n>=10?raSliceStats(10):null;
const s20=n>=20?raSliceStats(20):null,s30=n>=30?raSliceStats(30):null,s50=n>=50?raSliceStats(50):null;
const pat=n>=8?raPatternReliability():{rate:50,samples:0};
const oscCol=n>=6?raOscillationScore(slice.slice(-15),'col'):0;
const oscDoz=n>=6?raOscillationScore(slice.slice(-15),'doz'):0;
const colorSt=n>=2?raColorStreak(slice):{len:0,color:'—'};
const colSt=n>=3?rbaColStreak(slice.slice(-12)):{len:0};
const dozSt=n>=3?rbaDozStreak(slice.slice(-12)):{len:0};
const mig=n>=4?countMigrationStreak():0;
const chaos=rbaChaosTag(rbaChaosIndex(oscCol,oscDoz,pat,mig));
const colRet=n>=6?raReturnHits(slice,'col'):{rate:0,trials:0};
const compare=raShortVsLong(s5,s10,s20,s50);
const memoryLine=raCompareMemory();
const suppression=rbaSuppressionLines(slice);
const selfRate=rbaSelfSuccessRate();
const wait=phase!=='OBSERVE'&&(chaos.level==='EXTREME'||chaos.level==='HIGH'||pat.rate<RA_PATTERN_WARN||selfRate<60);
let baseMode='NORMAL';
if(phase==='OBSERVE')baseMode='LEARN';
else if(pat.samples>=6&&pat.rate<RA_PATTERN_WARN)baseMode='DEAD_SPIN';
else if(pat.rate<65||chaos.level==='HIGH'||chaos.level==='EXTREME')baseMode='WARNING';
const flowState=phase==='OBSERVE'?{id:'OBSERVE',label:'POZOROVANIE',cls:'ra-mode-normal'}:rbaFlowStateId(pat,oscCol,colorSt,chaos,baseMode==='DEAD_SPIN'?'DEAD':'');
const mood=rbaSessionMood(pat,chaos,colorSt,oscCol);
const health=rbaFlowHealth(pat,chaos,baseMode==='DEAD_SPIN'?'DEAD':'');
const edge=rbaEdgeStatus(pat,chaos,wait);
const picks=phase==='OBSERVE'?{dozens:'—',columns:'—',color:'—',size:'—',parity:'—'}:rbaBehaviorPicks(s5,s10,slice,colorSt);
const dominantColor=s10?(s10.redPct>=s10.blackPct?'červená':'čierna'):'—';
const dominantParity=s10?(s10.evenPct>=50?'párne':'nepárne'):'—';
let modeLabel='POZOROVANIE',modeCls='ra-mode-normal',mode='OBSERVATION';
if(phase!=='OBSERVE'){
if(baseMode==='DEAD_SPIN'){mode='DEAD_SPIN';modeLabel='REŽIM MŔTVYCH SPINOV';modeCls='ra-mode-dead';}
else if(wait){mode='WAIT';modeLabel='REŽIM ČAKANIA';modeCls='ra-mode-warning';}
else if(baseMode==='WARNING'){mode='WARNING';modeLabel='REŽIM VÝSTRAHY';modeCls='ra-mode-warning';}
else{mode=flowState.id;modeLabel=flowState.label;modeCls=flowState.cls;}
}
let flowStrength={label:'ZBIERAM',cls:'ra-fs-mid'};
if(phase!=='OBSERVE'){
if(health.label==='STABLE'||health.label==='BUILDING')flowStrength={label:'SILNÁ',cls:'ra-fs-strong'};
else if(health.label==='WEAKENING')flowStrength={label:'SLABÁ',cls:'ra-fs-weak'};
else flowStrength={label:'SLABÁ',cls:'ra-fs-weak'};
}
const flowScoreLabel=phase==='OBSERVE'?{label:'ZBIERAM',cls:'ra-flow-uncertain'}:
wait||health.label==='COLLAPSING'||health.label==='DEAD'?{label:'ROZPADÁ SA',cls:'ra-flow-collapse'}:
health.label==='STABLE'?{label:'DRŽÍ',cls:'ra-flow-stable'}:{label:'NEISTÝ',cls:'ra-flow-uncertain'};
const rbaCtx={phase,pat,oscCol,oscDoz,colorSt,colSt,dozSt,chaos,s5,s10,s20,s30,s50,slice,health,edge,suppression,colRet,selfRate,wait,mood};
const behavior=phase==='OBSERVE'?null:rbaRunAdvancedBehaviorSystems(rbaCtx);
let mainInsight='',subNote=null,isSilent=false,silenceMsg=null,mainAlert=false;
let flowComment='',doubt=null;
if(phase==='OBSERVE'){
mainInsight=rbaObserveInsight(n);
subNote='Learning mode — '+n+'/'+RBA_OBS_MAX+' spinov. Nie som predikcia.';
}else if(wait){
mainInsight=behavior&&behavior.silence.active?behavior.silence.msg:'Nehraj — session je nestabilná, chaos alebo slabý flow reading.';
subNote='Počkaj 2–3 spiny · trust '+(behavior?behavior.trust.level:'—')+' · '+selfRate+'% accuracy.';
mainAlert=true;
}else if(mode==='DEAD_SPIN'){
mainInsight='Session prešla do mŕtvych spinov.';
subNote='Režim mŕtvych spinov — nehraj, sleduj 3–5 spinov.';
mainAlert=true;
}else if(behavior){
isSilent=behavior.isSilent;
silenceMsg=behavior.silence.msg;
mainInsight=behavior.primaryInsight;
flowComment=behavior.secondaryInsight||behavior.psychology;
subNote=behavior.dna.label+' · '+behavior.temperature.level+' · RNG '+behavior.rngStability.label;
if(behavior.pressure.collapseRisk)mainAlert=true;
if(behavior.trust.level==='LOW TRUST'||behavior.trust.level==='NO TRUST')doubt=behavior.trust.line;
else if(behavior.falseFlow.fake)doubt=behavior.falseFlow.reason;
if(behavior.ego.mode==='cautious'||behavior.ego.mode==='passive')doubt=(doubt?doubt+' ':'')+behavior.ego.tone;
if(phase==='DEEP'&&behavior.evolution)flowComment=behavior.evolution.story;
}else{
mainInsight='Sledujem behavior session.';
}
const pr=lastAIPredictionCache&&lastAIPredictionKey===predCacheKey()?lastAIPredictionCache:null;
let aiConflict=null;
if(pr&&phase!=='OBSERVE'){
const predCol=pr.columns||'';
const predColor=(pr.color||'').toUpperCase();
const disagree=[];
if(predColor&&picks.color!=='—'&&!picks.color.toUpperCase().includes(predColor.includes('ČERVEN')?'ČERVEN':'ČIERN'))disagree.push('farbu');
if(predCol&&picks.columns!=='—'&&!picks.columns.includes(predCol.split(' ')[0]))disagree.push('stĺpce');
if(disagree.length)aiConflict='Prediction vyzerá inak, ale flow mi nesedí ('+disagree.join(', ')+').';
else if(pr.confidence>=70&&pat.rate>=65)aiConflict='Prediction aj behavior flow sú v súlade — stále dva nezávislé mozgy.';
}
const stance=raStanceVsPrediction({ready:phase!=='OBSERVE',dominantColor,dominantParity});
if(!flowComment)flowComment=mainInsight;
if(phase==='FULL'&&n===RBA_FULL_MIN)rbaLogSession('full_mode');
if(phase==='DEEP'&&n===RBA_DEEP_MIN)rbaLogSession('deep_mode');
const prev=rouletteAnalystPrevSnapshot;
if(prev&&prev.spinLen===n-1&&phase!=='OBSERVE'){
const guess=picks.color.includes('červen')?'červená':picks.color.includes('čiern')?'čierna':null;
if(guess){const last=lastSpinNum();if(last!=null&&last!==0){
const ok=guess==='červená'?reds.includes(last):!reds.includes(last);
rbaSelfEvalHits.push(ok?1:0);if(rbaSelfEvalHits.length>24)rbaSelfEvalHits.shift();
}}}
rouletteAnalystPrevSnapshot={spinLen:n,last:lastSpinNum(),s5,s10,s20,patRate:pat.rate,redPct:s10?s10.redPct:50};
const sessionMemory=rbaSessionLog.length>=2
?'Pamäť session: '+rbaSessionLog.slice(-3).map(e=>e.evt).join(' → ')+'.'
:(rouletteAnalystSessionProfile?'Začiatok: '+rouletteAnalystSessionProfile.label+' session.':'Session sa ešte profiluje.');
if(!rouletteAnalystSessionProfile&&n>=8){
const early=spins.slice(0,8);
rouletteAnalystSessionProfile={osc:raOscillationScore(early,'col'),pat:raPatternRateOnSlice(early),label:raOscillationScore(early,'col')>=58?'chaotický štart':'čitateľný štart'};
}
return{
ready:n>=1,phase,modelLabel:'RULETOVÝ ANALYTIK · samostatný mozog',
mode,modeLabel,modeCls,flowState,mood,health,edge,chaos,wait,
flowStrength,flowScoreLabel,patternRate:pat.rate,
mainInsight,subNote,isSilent,silenceMsg,mainAlert,
intro:phase==='OBSERVE'?'Pozorovací režim 0–'+RBA_OBS_MAX+' spinov.':'Behavior analytik · '+n+' spinov · '+modeLabel+'.',
insights:[],memoryLine,stance,aiConflict,doubt,flowComment,picks,behavior,
dominantColor,dominantParity,
dominantCol:s10?raColName(s10.topCol):'—',dominantDoz:s10?raDozName(s10.topDoz):'—',
dozens:picks.dozens,columns:picks.columns,color:picks.color,size:picks.size,parity:picks.parity,
compare,sessionMemory,selfRate,colSt,dozSt,colorSt,suppression,
blendScore:pat.rate,dataScore:pat.rate,reasoningScore:pat.rate,unifiedConfidence:Math.max(0,pat.rate-(chaos.level==='HIGH'?15:0)),
reasonLines:[mainInsight],lines:[mainInsight],dataLines:[flowComment],
spinsLines:[],timingLines:[],visualLines:[],systemDetailLine:mood.label,invisible:null,
baseMode,
trust:behavior?{label:behavior.trust.level,cls:behavior.trust.score>=65?'greenTxt':behavior.trust.score<45?'redTxt':'yellowTxt',line:behavior.trust.line}:raTrustLabel(pat,baseMode,oscCol,colorSt),
personality:doubt||flowComment,
sessionQuality:{label:health.label,cls:health.cls,desc:(behavior?behavior.rngStability.label+' · '+behavior.temperature.level+' · ':'')+edge.label+' · chaos '+chaos.label},
flowDna:behavior?behavior.dna:null,
sessionIdentity:behavior?behavior.sessionIdentity:null
};
}

let rouletteObserverCache=null;
let rouletteObserverKey='';
const RO_LEARN_MAX=11;
const RO_NARRATE_MIN=12;
const RO_DIRS_MIN=5;
const RO_SOFT_ALARM_UNTIL=15;
const RO_MAX_SENTENCES=5;
const RO_DIR_DISCLAIMER='Pozorovanie správania, nie záruka ďalšieho čísla.';

function observerResetSession(){
rbaSelfEvalHits=[];
rbaSessionLog=[];
rbaPrevBehaviorSnap=null;
rbaFlowMemoryPatterns=[];
rbaEvolutionTrack=[];
rouletteAnalystPrevSnapshot=null;
rouletteAnalystSessionBaseline=null;
rouletteAnalystSessionProfile=null;
rouletteAnalystCache=null;
rouletteAnalystKey='';
rouletteObserverCache=null;
rouletteObserverKey='';
bahResetSession();
}

function observerSpinPhase(n){
if(n<1)return'empty';
if(n<=RO_LEARN_MAX)return'learning';
if(n<RO_SOFT_ALARM_UNTIL)return'warming';
return'full';
}

function observerMaxSentences(phase){
if(phase==='learning')return 2;
if(phase==='warming')return 3;
return RO_MAX_SENTENCES;
}

function roStripHtml(s){
return String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function roCleanDirVal(v){
if(!v||v==='—')return '—';
return String(v).replace(/\s*\([^)]*\)/g,'').replace(/\s*\/\s*/g,' / ').replace(/\s+/g,' ').trim();
}
function roUpperDir(v){
const c=roCleanDirVal(v);
if(c==='—')return c;
return c.toUpperCase();
}
function roSk(text){
if(!text)return '';
let t=String(text);
const map=[
[/Momentálne nemám dôveru v tento flow/gi,'Momentálne nemám dôveru v toto správanie wheelu'],
[/Momentálne mám nízku dôveru/gi,'Momentálne mám nízku dôveru v správanie wheelu'],
[/nízku dôveru v tento flow/gi,'nízku dôveru v správanie wheelu'],
[/Povrchová stabilita bez reálnej štruktúry/gi,'Na povrchu to vyzerá stabilne, ale chýba podpora v histórii'],
[/Flow síce vyzerá stabilne/gi,'Tlak vyzerá stabilne'],
[/RNG vytvára falošný/gi,'Koleso vytvára falošný'],
[/chaotic support/gi,'chaos pod povrchom'],
[/momentum/gi,'rytmus'],
[/hidden flow/gi,'skrytý behavior'],
[/Prediction/gi,'Hlavná predikcia'],
[/flow mi nesedí/gi,'môj pohľad sa nezhoduje'],
[/NO TRUST/gi,'žiadna dôvera'],
[/LOW TRUST/gi,'nízka dôvera'],
[/bezpečný edge/gi,'bezpečný vstup'],
[/\bedge\b/gi,'vstup']
];
map.forEach(([re,rep])=>{t=t.replace(re,rep);});
return skWheelUserText(t.replace(/\s+/g,' ').trim());
}

function roFormatRange(sizeVal,s10){
if(s10){
if(s10.highPct>=58)return '19–36';
if(s10.lowPct>=58)return '1–18';
}
const c=roCleanDirVal(sizeVal);
if(/VEĽK|19|36/i.test(c))return '19–36';
if(/MAL|1.?18/i.test(c))return '1–18';
return c==='—'?'—':roUpperDir(c);
}
function roFormatCombo(val){
const c=roCleanDirVal(val);
if(c==='—')return '—';
return c.replace(/\s*·\s*/g,' + ').toUpperCase();
}

function roFormatParity(parityVal,s10){
if(s10){
if(s10.evenPct>=58)return 'PÁRNE';
if(s10.oddPct>=58)return 'NEPÁRNE';
}
const c=roCleanDirVal(parityVal);
if(/^PÁRNE/i.test(c))return 'PÁRNE';
if(/^NEPÁRNE/i.test(c))return 'NEPÁRNE';
if(c==='—')return '—';
const part=c.split('/')[0].trim();
return part?part.toUpperCase():roUpperDir(c);
}

function observerBuildMainDirections(ctx){
const n=spins.length;
if(n<RO_DIRS_MIN)return null;
const s5=n>=5?raSliceStats(5):null;
const s10=n>=10?raSliceStats(10):null;
const slice=spins.slice(-100);
const colorSt=raColorStreak(slice);
const p=rbaBehaviorPicks(s5,s10,slice,colorSt);
const rows=[
{ico:'🔥',label:'FARBA',val:roUpperDir(p.color)},
{ico:'⚡',label:'PÁRNE / NEPÁRNE',val:roFormatParity(p.parity,s10)},
{ico:'🎯',label:'RANGE',val:roFormatRange(p.size,s10)},
{ico:'📊',label:'TUCTY',val:roFormatCombo(p.dozens)},
{ico:'📈',label:'STĹPCE',val:roFormatCombo(p.columns)}
];
const has=rows.some(r=>r.val&&r.val!=='—');
return has?rows:null;
}

function observerGatherLayers(){
const A=computeRouletteAnalyst();
let flow=null,pressure=null,risk=null,pattern=null;
try{if(spins.length>=2)flow=computeFlowAnalyzer();}catch(e){}
try{if(spins.length>=1)pressure=computeWheelPressureEngine();}catch(e){}
try{if(spins.length>=2)risk=computeRiskChaosCore();}catch(e){}
try{if(spins.length>=2)pattern=computePatternEngine();}catch(e){}
return{A,flow,pressure,risk,pattern};
}

function observerDecideFocus(ctx){
const A=ctx.A;
const n=spins.length;
const phase=observerSpinPhase(n);
if(phase==='empty')return'empty';
if(phase==='learning')return'learning';
const soft=n<RO_SOFT_ALARM_UNTIL;
if(A.wait||A.mode==='DEAD_SPIN'||A.mode==='WAIT'){
if(soft){
if(A.mode==='DEAD_SPIN'&&A.patternRate<48)return'pause';
if(A.wait&&A.patternRate<45)return'pause';
}else return'pause';
}
if(!soft){
if(ctx.risk&&ctx.risk.tag==='HIGH')return'chaos';
if(A.chaos&&(A.chaos.level==='HIGH'||A.chaos.level==='EXTREME'))return'chaos';
}else{
if(ctx.risk&&ctx.risk.tag==='HIGH'&&(ctx.risk.chaosLevel>=68||ctx.risk.score>=62))return'chaos';
if(A.chaos&&A.chaos.level==='EXTREME')return'chaos';
}
const fs=A.flowScoreLabel&&A.flowScoreLabel.label;
const collapseSig=(fs==='ROZPADÁ SA'||A.health&&A.health.label==='COLLAPSING'||A.health&&A.health.label==='DEAD')&&A.patternRate<(soft?48:58);
if(collapseSig)return soft?'rhythm':'collapse';
const B=A.behavior;
if(B&&B.falseFlow&&B.falseFlow.fake)return soft?'rhythm':'fake';
if(A.patternRate>=65&&((A.colSt&&A.colSt.len>=3)||(A.colorSt&&A.colorSt.len>=3)))return'dominance';
return'rhythm';
}

function observerBadge(focus,A){
const map={
empty:{t:'Čakám na spiny',c:'ro-badge-learn'},
learning:{t:'Pozorovanie session',c:'ro-badge-learn'},
pause:{t:'Odporúčam počkať',c:'ro-badge-pause'},
chaos:{t:'Nestabilné správanie',c:'ro-badge-warn'},
collapse:{t:'Flow sa rozpadá',c:'ro-badge-pause'},
fake:{t:'Opatrné pozorovanie',c:'ro-badge-warn'},
dominance:{t:'Tlak dominancie',c:'ro-badge-watch'},
rhythm:{t:'Sledujem wheel',c:'ro-badge-watch'}
};
return map[focus]||map.rhythm;
}

function observerHero(focus,ctx){
const A=ctx.A;
const n=spins.length;
if(focus==='empty')return'Zadaj spiny do histórie — začnem sledovať správanie kolesa v celej session.';
if(focus==='learning')return'Zbieram obraz session ('+n+' / '+RO_LEARN_MAX+' spinov). Od '+RO_NARRATE_MIN+'. spinu budem písať plné komentáre — stále len pozorovanie, nie predikcia čísla.';
if(focus==='pause'){
if(A.mode==='DEAD_SPIN')return'Koleso momentálne nevytvára čitateľné správanie — vhodné sú pozorovacie spiny.';
if(A.wait)return'Momentálne nevidím bezpečný vstup — session je príliš nestabilná na tvrdenia.';
return'Momentálne nevidím stabilný rytmus — radšej sleduj ďalší vývoj.';
}
if(focus==='chaos')return'Posledné spiny prinášajú veľa chaosu — kolo zatiaľ nevytvára stabilný rytmus.';
if(focus==='collapse')return'Dominancia sa rozpadá a smer sa často mení — session je ťažšie čitateľná.';
if(focus==='fake')return'Na prvý pohľad to môže vyzerať stabilne, ale vnútorný obraz tomu nesedí.';
if(focus==='dominance'){
const col=A.dominantCol&&A.dominantCol!=='—'?A.dominantCol:'dominantný stĺpec';
const doz=A.dominantDoz&&A.dominantDoz!=='—'?A.dominantDoz:'tucet';
return'Koleso drží tlak — najsilnejšie teraz '+doz+' a '+col+'.';
}
const ins=roStripHtml(A.mainInsight);
if(ins&&ins.length>8&&ins.length<200&&!/NO TRUST|TOXIC|DEAD|EDGE/i.test(ins))return ins;
return'Koleso má v session čitateľný behavior — sledujem návraty, farby a presuny.';
}

function observerAdvice(focus,phase){
if(phase==='learning'||phase==='empty')return null;
if(focus==='pause')return'Odporúčam vynechať 2–3 spiny a sledovať, či sa vytvorí nový rytmus.';
if(phase==='full'&&(focus==='chaos'||focus==='collapse'||focus==='fake'))return'Odporúčam vynechať 2–3 spiny a sledovať, či sa vytvorí nový rytmus.';
if(phase==='warming'&&focus==='pause')return'Pri malom počte spinov radšej ešte chvíľu sleduj vývoj.';
return null;
}

function observerMainDirTitle(phase,focus){
if(phase==='learning')return'Predbežný tlak z histórie (plný výstup od '+RO_NARRATE_MIN+'. spinu)';
if(focus==='pause'||focus==='chaos'||focus==='collapse')return'Momentálne najsilnejší tlak z histórie — aj pri nestabilnej session';
return'Momentálne najsilnejšie behavior smery wheelu (nie predikcia čísla)';
}

function observerCollectSentences(ctx,focus){
const cands=[];
const A=ctx.A;
const beh=A.behavior;
const n=spins.length;
const push=(p,t,x)=>{if(x)cands.push({p,t,x:String(x).trim()});};

if(focus==='learning'){
push(100,'neut','Mám '+n+' spinov v pamäti — ešte len skladám obraz celej session.');
if(n>=3)push(88,'neut','Zatiaľ sledujem farby, tucty a stĺpce bez záveru o ďalšom čísle.');
if(n>=1)push(82,'neut','Plné komentáre začnem od '+RO_NARRATE_MIN+'. spinu v histórii.');
return cands;
}

if(focus==='pause'){
push(98,'bad','Session je momentálne nečitateľná — wheel nevytvára stabilný rytmus na vstup.');
if(ctx.risk&&ctx.risk.chaosLevel>=55)push(94,'warn','Posledné spiny prinášajú chaos — stabilný behavior chýba.');
if(A.chaos&&(A.chaos.level==='HIGH'||A.chaos.level==='EXTREME'))push(92,'warn','Koleso stráca rytmus — príliš veľa kolísania v session.');
if(beh&&beh.falseFlow&&beh.falseFlow.fake)push(88,'warn',roSk(beh.falseFlow.reason));
if(beh&&beh.fatigue&&beh.fatigue.lines&&beh.fatigue.lines[0])push(84,'warn',roSk(beh.fatigue.lines[0]));
const doubt=roSk(roStripHtml(A.doubt||''));
if(doubt&&doubt.length>8&&!/trust|NO TRUST|LOW TRUST/i.test(doubt))push(82,'warn',doubt);
else if(beh&&beh.trust&&beh.trust.line)push(80,'warn',roSk(beh.trust.line));
return cands;
}

const soft=n<RO_SOFT_ALARM_UNTIL;
if(ctx.risk&&ctx.risk.tag==='HIGH'&&!soft)push(97,'bad','V session rastie chaos a kolísanie — stabilný rytmus zatiaľ chýba.');
else if(ctx.risk&&ctx.risk.tag==='HIGH'&&soft)push(72,'warn','V krátkom okne je viac neporiadku — ešte čakám na dlhší obraz session.');
else if(ctx.risk&&ctx.risk.chaosLevel>=55&&!soft)push(85,'warn','Stupeň neporiadku v posledných spinoch je vyšší — wheel často mení charakter.');

if(A.dominantColor&&A.dominantColor!=='—'){
const st=A.colorSt;
if(st&&st.len>=3)push(78,'ok','Farba '+A.dominantColor+' drží opakovaný tlak už '+st.len+' spinov.');
else push(62,'ok','V krátkom okne teraz silnejšie tlačí '+A.dominantColor+'.');
}

if(A.dominantParity&&A.dominantParity!=='—'&&A.dominantParity!=='párne / nepárne'){
push(58,'ok','Párnosť sa v posledných spinoch viac prikláňa k '+A.dominantParity+'.');
}

if(A.colRet&&A.colRet.rate>=58&&A.colRet.trials>=4){
push(74,'ok','Návraty do rovnakého stĺpca sa opakujú — wheel drží návratový rytmus.');
}

if(ctx.flow&&ctx.flow.migrationLabel&&ctx.flow.migrationLabel!=='—'){
push(56,'neut','Presun na wheeli: '+ctx.flow.migrationLabel+'.');
}else if(ctx.flow&&ctx.flow.migrationDir&&ctx.flow.migrationDir!=='—'){
push(54,'neut','Smer pohybu na wheeli sa momentálne kloní skôr '+ctx.flow.migrationDir+'.');
}

if(ctx.pressure&&ctx.pressure.activeSector&&ctx.pressure.dominantPressure>=40){
const s=ctx.pressure.activeSector;
push(70,'ok','Koleso sa často vracia do pásu okolo čísla '+s.center+' ('+s.hits+' zásahov v histórii).');
}

if(ctx.pattern&&ctx.pattern.activeClusters&&ctx.pattern.activeClusters[0]){
const cl=ctx.pattern.activeClusters[0];
if(cl.active)push(64,'ok','Opakované čísla v jednom pásme držia pokope — wheel žije v tomto sektore.');
}

if(beh&&beh.fatigue&&beh.fatigue.lines){
beh.fatigue.lines.forEach((ln,i)=>push(72-i*4,'warn',roSk(ln)));
}

if(beh&&beh.recovery&&beh.recovery.active&&beh.recovery.reason)push(68,'ok',roSk(beh.recovery.reason));

if(ctx.flow&&ctx.flow.timingCore!=null&&n>=8){
const tOpen=ctx.flow.timingWindow==='OTVORENE';
push(42,'neut','Časovanie wheelu: '+(tOpen?'okno je otvorené':'okno je zatvorené')+' — podpora '+ctx.flow.timingCore+' %.');
}

if(ctx.risk&&n>=8){
push(40,'neut','Stupeň neporiadku v session: '+(ctx.risk.chaosLevel||0)+' % · volatilita '+ctx.risk.volatility+' %.');
}

if(A.patternRate<55&&focus==='collapse')push(94,'bad','Opakovania a návraty už nedávajú jednotný obraz — flow sa rozpadá.');
if(focus==='fake'&&beh&&beh.falseFlow&&beh.falseFlow.reason){
push(95,'warn',beh.falseFlow.reason);
push(88,'warn','Na povrchu to vyzerá stabilne, ale chýba podpora v pamäti spinov.');
}

if(A.compare&&A.compare.short){
const sh=roStripHtml(A.compare.short).replace(/^Krátkodobo:\s*/i,'Krátkodobo ');
if(sh.length>12)push(48,'neut',sh);
}
if(A.compare&&A.compare.long&&focus!=='chaos'&&focus!=='pause'){
const lg=roStripHtml(A.compare.long).replace(/^Dlhodobo:\s*/i,'Dlhodobo ');
if(lg.length>12&&lg.indexOf('málo dát')<0)push(44,'neut',lg);
}

if(rouletteAnalystSessionProfile&&n>=10){
const lab=rouletteAnalystSessionProfile.label||'';
if(lab)push(42,'neut','Od začiatku session to pôsobilo '+lab.replace('štart','')+'.');
}

if(A.memoryLine&&A.memoryLine!=='—'&&A.memoryLine.indexOf('Pamäť')>=0){
push(40,'neut',roStripHtml(A.memoryLine));
}

if(beh&&beh.evolution&&beh.evolution.story&&focus!=='learning')push(46,'neut',beh.evolution.story);

const minP=focus==='chaos'||focus==='collapse'?78:0;
return cands.filter(c=>c.p>=minP||c.t==='bad'||c.t==='warn').sort((a,b)=>b.p-a.p);
}

function observerAiNote(A,focus,phase){
if(focus==='empty'||phase==='learning')return null;
if(A.aiConflict)return roSk(roStripHtml(A.aiConflict));
if(A.stance&&A.stance!=='—')return roSk(roStripHtml(A.stance));
return null;
}

function observerMemoryLine(A){
if(A.sessionMemory&&A.sessionMemory!=='—')return roStripHtml(A.sessionMemory);
return null;
}

function observerFootnote(A){
if(rbaSelfEvalHits.length>=4)return'Vlastné čítanie správania v tejto session: '+A.selfRate+' % (nezávislé od hlavnej predikcie).';
return'Úspešnosť čítania sa zobrazí po niekoľkých hodnotených spinoch v session.';
}

function computeRouletteObserverUI(){
const key=spins.length+'|'+(spins[spins.length-1]??'')+'|obs|'+predCacheKey();
if(rouletteObserverCache&&rouletteObserverKey===key)return rouletteObserverCache;
const n=spins.length;
const phase=observerSpinPhase(n);
if(!n){
const empty={ready:false,phase:'empty',focus:'empty',badge:observerBadge('empty',{}),hero:observerHero('empty',{}),advice:null,mainDirections:null,mainDirTitle:'',mainDirMuted:false,sentences:[],aiNote:null,memory:null,foot:null,dirDisclaimer:RO_DIR_DISCLAIMER};
rouletteObserverCache=empty;rouletteObserverKey=key;return empty;
}
const ctx=observerGatherLayers();
const focus=observerDecideFocus(ctx);
const A=ctx.A;
const heroCls=(focus==='pause'||focus==='chaos'||focus==='collapse')?'ro-hero-warn':(focus==='learning'?'ro-hero-quiet':'');
const maxSent=observerMaxSentences(phase);
const sentences=observerCollectSentences(ctx,focus).slice(0,maxSent);
const mainDirections=observerBuildMainDirections(ctx);
const mainDirMuted=focus==='pause'||focus==='chaos'||focus==='collapse';
const result={
ready:true,phase,focus,
badge:observerBadge(focus,A),
hero:observerHero(focus,ctx),
heroCls,
advice:observerAdvice(focus,phase),
mainDirections,
mainDirTitle:observerMainDirTitle(phase,focus),
mainDirMuted,
sentences,
aiNote:observerAiNote(A,focus,phase),
memory:phase==='learning'?null:roSk(observerMemoryLine(A)||''),
foot:observerFootnote(A),
spinCount:n,
dirDisclaimer:RO_DIR_DISCLAIMER
};
rouletteObserverCache=result;rouletteObserverKey=key;return result;
}

function computeRouletteAnalyst(){
const key=spins.length+'|'+(spins[spins.length-1]??'')+'|'+predCacheKey();
if(rouletteAnalystCache&&rouletteAnalystKey===key)return rouletteAnalystCache;
const empty={
ready:false,modelLabel:'RULETOVÝ ANALYTIK',
mode:'NORMAL',modeLabel:'Čakám',modeCls:'ra-mode-normal',
intro:'Zadaj spiny — analytik začne po prvom spine.',
insights:['Čakám na históriu. Nie som predikcia — som samostatný behavior analytik.'],
memoryLine:'—',stance:'—',patternRate:0,
blendScore:0,dataScore:0,reasoningScore:0,unifiedConfidence:0,
reasonLines:['Čakám na spiny.'],lines:['Čakám na spiny.'],dataLines:[],
spinsLines:[],timingLines:[],visualLines:[],systemDetailLine:'—',invisible:null,
dozens:'—',columns:'—',color:'—',size:'—',parity:'—',phase:'OBSERVE',wait:false
};
if(spins.length<1){rouletteAnalystCache=empty;rouletteAnalystKey=key;return empty;}
const result=computeRbaBehaviorAnalyst();
rouletteAnalystCache=result;rouletteAnalystKey=key;return result;
}

function computeSpinAIComment(){
return computeRouletteAnalyst();
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

const ENGINE_CATALOG=[
{id:'spin',icon:'🧠',title:'SPIN ENGINE',features:[
['Adaptívne skórovanie klastrov',()=>lastSpinBreakdown.cluster],
['Sledovanie dominancie sektora',()=>lastSpinBreakdown.dozen],
['Hlboká analýza sekvencie spinov',()=>clamp(spins.length*4)],
['Potlačenie opakovania',()=>clamp(100-repeatRate())],
['Únava predikcie',()=>clamp(100-adaptiveWeights.failStreak*12)],
['Vývoj driftu',()=>lastSpinBreakdown.drift],
['Dynamické váženie horúce/studené',()=>lastSpinBreakdown.hotCold],
['Detekcia dlhej série',()=>lastSpinBreakdown.streak],
['AI perzistencie sektora',()=>lastSpinBreakdown.gap],
['Inteligentné rozšírenie susedov',()=>lastSpinBreakdown.chain]]},
{id:'timing',icon:'⏱',title:'TIMING ENGINE',features:[
['Detektor stability rytmu',()=>lastTimingBreakdown.rhythm],
['Detekcia anomálie timingu',()=>clamp(100-ivStd(spinIntervals())*16)],
['Analýza fázy rýchlosti',()=>lastTimingBreakdown.pace],
['Vývoj trendu timingu',()=>lastTimingBreakdown.trend],
['Sledovanie zrýchlenia spinu',()=>{const iv=spinIntervals();if(iv.length<3)return 50;const d=iv[iv.length-1]-iv[iv.length-2];return clamp(70-Math.abs(d)*15);}],
['Rozpoznanie patternu oneskorenia',()=>lastTimingBreakdown.flow],
['AI konzistencie tempa',()=>lastTimingBreakdown.stability],
['Detektor chaosu timingu',()=>clamp(100-ivStd(spinIntervals())*20)],
['Adaptívne váženie timingu',()=>clamp(adaptiveWeights.timing*100)],
['Engine synchronizácie toku',()=>lastTimingBreakdown.flow]]},
{id:'visual',icon:'👁',title:'VIZUÁLNA AI',features:[
['Adaptívna heatmapa',()=>lastVisualBreakdown.heatSpread],
['Vizualizácia tlakovej vlny',()=>lastVisualBreakdown.pressure],
['Zvýraznenie dominantného sektora',()=>scoreVisualPressure()],
['Dynamické vizuálne váženie',()=>lastVisualBreakdown.board],
['Intenzita žiaru sektora',()=>lastVisualBreakdown.wheel],
['Živé prekrytia tlaku',()=>lastVisualBreakdown.pressure],
['Vizualizácia chaosu',()=>clamp(100-(parseFloat(entropy())||0)*8)],
['Inteligentný radar kolesa',()=>lastVisualBreakdown.wheel],
['Detekcia vizuálneho driftu',()=>lastVisualBreakdown.align],
['Sledovanie koncentrácie tepla',()=>lastVisualBreakdown.heatSpread]]},
{id:'memory',icon:'🧬',title:'SYSTÉM PAMÄTE',features:[
['Krátkodobá pamäť',()=>clamp(memoryBank.short.length*20)],
['Strednodobá pamäť',()=>clamp(memoryBank.mid.length*5)],
['Dlhodobá pamäť',()=>clamp(memoryBank.long.length*1.25)],
['Starnutie patternov',()=>clamp(100-spins.length*0.3)],
['Úpadok pamäte',()=>clamp(100-repeatRate()/2)],
['Rekurzívna pamäť patternov',()=>neighborChain()*9],
['Sledovanie historického driftu',()=>lastSpinBreakdown.drift],
['AI histórie sektora',()=>lastSpinBreakdown.dozen],
['Engine perzistencie patternov',()=>lastSpinBreakdown.gap],
['Adaptívne váženie pamäte',()=>clamp(55+memoryBank.mid.length)]]},
{id:'prediction',icon:'🎯',title:'PREDIKČNÝ ENGINE',features:[
['Primárna predikcia',()=>lastPick!=null?clamp(70+lastCoreValues.spinCore*0.3):40],
['Sekundárna predikcia',()=>clamp(lastCoreValues.timingCore)],
['Záložná predikcia',()=>clamp(lastCoreValues.visualCore)],
['Spoľahlivosť predikcie',()=>calculateAI()],
['Vyváženie rizika',()=>clamp(100-(parseFloat(entropy())||0)*9)],
['Adaptívny rozptyl predikcie',()=>clamp(getClusters()[0].score*4)],
['Potlačenie falošných patternov',()=>clamp(100-repeatRate())],
['Kontrola prekrývania predikcií',()=>clamp(80-adaptiveWeights.failStreak*10)],
['Dynamická agresivita',()=>clamp(lastCoreValues.spinCore*adaptiveWeights.spin)],
['Vyváženie viacerých sektorov',()=>lastSpinBreakdown.dozen]]},
{id:'chaos',icon:'⚠',title:'CHAOS / ENTROPIA',features:[
['Skutočný engine entropie',()=>clamp(100-(parseFloat(entropy())||0)*10)],
['Detekcia stavu chaosu',()=>clamp((parseFloat(entropy())||0)*12)],
['Index stability',()=>lastTimingBreakdown.stability],
['Sledovanie volatility',()=>clamp(ivStd(spinIntervals())*18)],
['Analyzátor náhodnosti',()=>clamp(50+Math.random()*0+ivStd(spinIntervals())*12)],
['Logika obnovy entropie',()=>clamp(100-(parseFloat(entropy())||0)*11)],
['Detekcia kolapsu patternu',()=>clamp(100-lastSpinBreakdown.cluster)],
['Agresívna ochrana pred chaosom',()=>clamp(70+lastCoreValues.timingCore*0.2)],
['Monitor nestability AI',()=>clamp(100-adaptiveWeights.failStreak*14)],
['Systém degradácie spoľahlivosti',()=>clamp(calculateAI()-adaptiveWeights.failStreak*5)]]},
{id:'flow',icon:'🌀',title:'ENGINE TOKU KOLESA',features:[
['Sledovanie po smere hodinových',()=>{const r=spins.slice(-8);let c=0;for(let i=1;i<r.length;i++)if(wheelStep(r[i-1],r[i])>0)c++;return clamp(c*14);}],
['Sledovanie proti smeru hodinových',()=>{const r=spins.slice(-8);let c=0;for(let i=1;i<r.length;i++)if(wheelStep(r[i-1],r[i])<0)c++;return clamp(c*14);}],
['Smerové momentum',()=>wheelDirectionScore()],
['Detekcia odrazu',()=>clamp(neighborChain()*8)],
['Detekcia obratu',()=>clamp(100-Math.abs(wheelStep(spins[spins.length-2]||0,spins[spins.length-1]||0))*12)],
['Migrácia sektora',()=>lastSpinBreakdown.drift],
['Zrýchlenie kolesa',()=>lastTimingBreakdown.pace],
['Analýza kruhového toku',()=>lastSpinBreakdown.chain],
['Vývoj reťazca susedov',()=>clamp(neighborChain()*9)],
['Perzistencia momenta',()=>lastSpinBreakdown.streak]]},
{id:'telemetry',icon:'📊',title:'TELEMETRY',features:[
['AI diagnostika',()=>calculateAI()],
['Synchronizácia engineov',()=>clamp((lastCoreValues.spinCore+lastCoreValues.timingCore+lastCoreValues.visualCore)/3)],
['Monitor živého signálu',()=>lastCoreValues.spinCore],
['Index spoľahlivosti predikcie',()=>totalPredictions?clamp(successfulPredictions/totalPredictions*100):50],
['Meradlo spoľahlivosti',()=>calculateAI()],
['Meradlo rizika',()=>clamp((parseFloat(entropy())||0)*14)],
['Skóre dôvery AI',()=>clamp(calculateAI()-adaptiveWeights.failStreak*4)],
['Sledovanie výkonu engineov',()=>lastCoreValues.timingCore],
['Rekalibrácia v reálnom čase',()=>clamp(60+adaptiveWeights.spin*40)],
['Monitorovanie stability',()=>lastTimingBreakdown.stability]]},
{id:'hot',icon:'🔥',title:'AKTIVITA WHEELU',features:[
['Aktívne čísla (behavior)',()=>lastSpinBreakdown.hotCold],
['Neaktívne čísla / recovery',()=>clamp(100-lastSpinBreakdown.hotCold)],
['Vyváženie tepla sektora',()=>lastSpinBreakdown.dozen],
['Perzistencia tepla',()=>lastSpinBreakdown.gap],
['Detekcia prehriateho sektora',()=>scoreVisualHeatSpread()],
['Predikcia prelomenia studených',()=>clamp(100-scoreVisualHeatSpread())],
['Adaptívne váženie tepla',()=>lastVisualBreakdown.heatSpread],
['Analýza trendu tepla',()=>lastSpinBreakdown.hotCold],
['Momentum tepla',()=>lastSpinBreakdown.streak],
['Teplotné vlny sektora',()=>lastVisualBreakdown.pressure]]},
{id:'perf',icon:'⚡',title:'ENGINE VÝKONU',features:[
['Dávkové vykresľovanie',()=>95],
['Aktualizácie len canvasu',()=>92],
['Optimalizácia DOM',()=>88],
['Memoizované výpočty',()=>cache.clusters?90:75],
['Inteligentné intervaly obnovy',()=>90],
['Vykresľovanie vhodné pre GPU',()=>85],
['Systém priority vykresľovania',()=>87],
['Lenivé ťažké vykresľovanie',()=>clamp(100-HEAVY_RENDER_INTERVAL*8)],
['Strážca výkonu',()=>96],
['Monitor stability snímok',()=>94]]},
{id:'learn',icon:'🤖',title:'SAMOUCENIE AI',features:[
['Analýza neúspešnej predikcie',()=>clamp(100-adaptiveWeights.failStreak*11)],
['Systém automatickej korekcie',()=>clamp(50+adaptiveWeights.spin*50)],
['Adaptívne váhy signálu',()=>clamp(adaptiveWeights.spin*100)],
['Spoľahlivosť učenia',()=>clamp(calculateAI()-adaptiveWeights.failStreak*6)],
['Sledovanie úspechu patternov',()=>totalPredictions?clamp(successfulPredictions/totalPredictions*100):50],
['Dynamická rekalibrácia',()=>lastCoreValues.spinCore],
['Vývoj predikcie',()=>clamp(predictionHistory.length*3)],
['Spätnoväzobná slučka AI',()=>clamp(70+adaptiveWeights.spin*25)],
['Vyváženie úspech/neúspech',()=>{const r=totalPredictions?successfulPredictions/totalPredictions:0.5;return clamp(r*100);}],
['Inteligentná adaptácia',()=>clamp(65+adaptiveWeights.spin*30)]]},
{id:'pressure',icon:'📈',title:'ENGINE TLAKU',features:[
['Akumulácia tlaku',()=>scoreVisualPressure()],
['Tlakové vlny sektora',()=>lastVisualBreakdown.pressure],
['Úpadok tlaku',()=>clamp(100-scoreVisualPressure())],
['Dominantné zóny tlaku',()=>clamp(getClusters()[0].score*3)],
['Vyváženie tlaku klastra',()=>lastSpinBreakdown.cluster],
['Migrácia tlaku',()=>lastSpinBreakdown.drift],
['Detekcia skrytého tlaku',()=>clamp(getClusters()[1]?.score*3||30)],
['Vývoj trendu tlaku',()=>lastSpinBreakdown.dozen],
['Výstrahy vrcholu tlaku',()=>clamp(getClusters()[0].score*4)],
['Detekcia kolapsu tlaku',()=>clamp(100-getClusters()[0].score*2)]]},
{id:'cluster',icon:'🧩',title:'ENGINE KLASTROV',features:[
['Inteligentné zlučovanie klastrov',()=>lastSpinBreakdown.cluster],
['Dynamická veľkosť klastra',()=>clamp(getClusters()[0].nums.length*20)],
['Vývoj klastra',()=>lastSpinBreakdown.chain],
['Úpadok klastra',()=>clamp(100-lastSpinBreakdown.cluster)],
['AI dominantného klastra',()=>lastSpinBreakdown.cluster],
['Detekcia skrytého klastra',()=>clamp((getClusters()[1]?.score||0)*3)],
['Adaptívne váženie klastra',()=>lastSpinBreakdown.cluster],
['Analýza konfliktu klastrov',()=>clamp(Math.abs((getClusters()[0]?.score||0)-(getClusters()[1]?.score||0))*5)],
['Detekcia prekrývania sektorov',()=>lastSpinBreakdown.dozen],
['Momentum klastra',()=>lastSpinBreakdown.drift]]},
{id:'alert',icon:'🚨',title:'SYSTÉM VÝSTRAH',features:[
['Výstraha vysokého chaosu',()=>clamp((parseFloat(entropy())||0)*15)],
['Výstraha rizika predikcie',()=>clamp(100-calculateAI())],
['Varovanie slabá spoľahlivosť',()=>clamp(100-calculateAI())],
['Varovanie preťaženia sektora',()=>scoreVisualHeatSpread()],
['Výstraha kolapsu patternu',()=>clamp(100-lastSpinBreakdown.cluster)],
['Výstraha nestability timingu',()=>clamp(100-lastTimingBreakdown.stability)],
['Výstraha obratu driftu',()=>clamp(Math.abs(wheelStep(spins[spins.length-2]||0,spins[spins.length-1]||0))*14)],
['Varovanie skoku entropie',()=>clamp((parseFloat(entropy())||0)*13)],
['Varovanie nestability AI',()=>clamp(adaptiveWeights.failStreak*14)],
['Výstraha extrémnej volatility',()=>clamp(ivStd(spinIntervals())*20)]]}
];

function featureHtml(name,val){
const v=clamp(typeof val==='number'?val:50);
return '<div class="feature-item"><div class="metric-label"><span>'+name+'</span><b>'+Math.round(v)+'%</b></div><div class="bar"><div class="fill" style="width:'+v+'%"></div></div></div>';
}

const ENGINE_HUB_DIAGNOSTIC={
prediction:[
['Vyváženie pilierov',()=>clamp((lastCoreValues.spinCore+lastCoreValues.timingCore+lastCoreValues.visualCore)/3)],
['Pilier spinov',()=>lastCoreValues.spinCore],
['Pilier timingu',()=>lastCoreValues.timingCore],
['Pilier vizuálu',()=>lastCoreValues.visualCore],
['Risk balance',()=>clamp(100-(parseFloat(entropy())||0)*9)],
['Kontrola prekrývania',()=>clamp(80-adaptiveWeights.failStreak*10)],
['Potlačenie patternov',()=>clamp(100-repeatRate())],
['Agresivita',()=>clamp(lastCoreValues.spinCore*adaptiveWeights.spin)],
['Vyváženie sektora',()=>lastSpinBreakdown.dozen],
['Zaťaženie engineu',()=>calculateAI()]]
};
function getEngineHubFeatures(eng){
if(eng.id==='prediction'&&ENGINE_HUB_DIAGNOSTIC.prediction)return ENGINE_HUB_DIAGNOSTIC.prediction;
return eng.features;
}
function measureEngineHealth(eng){
const feats=getEngineHubFeatures(eng);
let sum=0,n=0;
feats.forEach(f=>{
try{sum+=clamp(f[1]());n++;}catch(e){sum+=50;n++;}
});
return n?Math.round(sum/n):50;
}
function computeEngineHubState(){
const signals=spins.length>=2?collectEngineTelemetrySignals():[];
const healthEngine=signals.length?Math.round(signals.reduce((s,e)=>s+e.pct,0)/signals.length):50;
const risk=spins.length>=2?computeRiskChaosEngine():null;
const telem=spins.length>=2?computeTelemetryEngine():null;
const stability=Math.round(
(risk?risk.stability:50)*0.35+
(telem?telem.confidenceStability:50)*0.3+
lastTimingBreakdown.stability*0.25+
(risk?risk.patternReliability:50)*0.1
);
const liveMetrics={
spins:spins.length,
lastSpin:lastSpinNum()!=null?lastSpinNum():'—',
spinCore:lastCoreValues.spinCore,
timingCore:lastCoreValues.timingCore,
visualCore:lastCoreValues.visualCore,
engineSync:telem?telem.engineSync:computeEngineSynchronization(signals),
signalQuality:telem?telem.signalQuality:healthEngine,
failStreak:adaptiveWeights.failStreak,
timingLive:timingRunning
};
const engines=ENGINE_CATALOG.map(eng=>({
id:eng.id,
icon:eng.icon,
title:eng.title,
health:measureEngineHealth(eng)
}));
return{
modelLabel:'Centrum engineov · všetky systémy · bez hlavnej predikcie',
healthEngine,
stability,
liveMetrics,
engines,
signals,
note:'Diagnostika engineov — nie primárny tip'
};
}

function buildEngineHub(){
const tabs=document.getElementById('engineTabs');
const panels=document.getElementById('enginePanels');
if(!tabs||!panels)return;
if(!tabs.dataset)tabs.dataset={};
if(tabs.dataset.ready)return;
tabs.dataset.ready='1';
ENGINE_CATALOG.forEach((eng,idx)=>{
const btn=document.createElement('button');
btn.className='etab'+(idx===0?' active':'');
btn.textContent=eng.icon+' '+eng.title.split(' ')[0];
btn.onclick=()=>{
document.querySelectorAll('.etab').forEach(t=>t.classList.remove('active'));
document.querySelectorAll('.engine-panel').forEach(p=>p.classList.remove('active'));
btn.classList.add('active');
document.getElementById('panel-'+eng.id).classList.add('active');
};
tabs.appendChild(btn);
const panel=document.createElement('div');
panel.className='engine-panel'+(idx===0?' active':'');
panel.id='panel-'+eng.id;
panel.innerHTML='<h2>'+eng.icon+' '+eng.title+'</h2><div class="feature-grid" id="grid-'+eng.id+'"></div>';
panels.appendChild(panel);
});
}

function renderEngineHub(){
buildEngineHub();
const hub=computeEngineHubState();
const summaryEl=document.getElementById('engineHubSummary');
if(summaryEl){
const lm=hub.liveMetrics;
summaryEl.innerHTML=
'<div class="section-label">'+hub.modelLabel+'</div>'
+'<div class="panel-line"><span>'+skUiLabel('Health engine')+'</span><b class="'+(hub.healthEngine>=60?'greenTxt':'yellowTxt')+'">'+hub.healthEngine+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Stability')+'</span><b class="blueTxt">'+hub.stability+'%</b></div>'
+'<div class="section-label">'+skUiLabel('Live metrics')+'</div>'
+'<div class="panel-line"><span>'+skUiLabel('Spins · last')+'</span><b>'+lm.spins+' · '+lm.lastSpin+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Core pulse')+'</span><b class="greenTxt">'+lm.spinCore+' · '+lm.timingCore+' · '+lm.visualCore+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Sync · signal')+'</span><b class="yellowTxt">'+lm.engineSync+'% · '+lm.signalQuality+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Fail · timing')+'</span><b class="'+(lm.failStreak>=2?'redTxt':'greenTxt')+'">'+lm.failStreak+'× · '+(lm.timingLive?'ŽIVÝ':'STOP')+'</b></div>'
+'<div class="alert" style="font-size:9px;margin-top:4px">'+hub.note+'</div>';
}
ENGINE_CATALOG.forEach(eng=>{
const grid=document.getElementById('grid-'+eng.id);
if(!grid)return;
const eh=hub.engines.find(e=>e.id===eng.id);
const hdr=eh?'<div class="panel-line"><span>Zdravie engine</span><b class="greenTxt">'+eh.health+'%</b></div>':'';
grid.innerHTML=hdr+getEngineHubFeatures(eng).map(f=>{
let val=50;
try{val=f[1]();}catch(e){val=50;}
return featureHtml(f[0],val);
}).join('');
});
}

function isPanelOpen(id){
const el=document.getElementById(id);
if(!el)return false;
return !el.classList.contains('collapsed');
}
function renderCorePrediction(){
const el=document.getElementById('corePrediction');
if(!el)return;
if(spins.length<2){el.innerHTML='<div class="alert">Zadaj 2+ spiny — AI ukáže čo hrať podľa živého flow.</div>';return;}
const pr=computeAIPrediction();
if(!pr||!pr.coreAnalysis){el.innerHTML='<div class="alert">Načítavam flow engine…</div>';return;}
el.innerHTML=buildAIPredictionPanelHTML(pr,pr.coreAnalysis);
}
let engineAdvancedOpen=false;
function renderEngineAdvancedPanels(){
if(!engineAdvancedOpen)return;
renderMasterAIState();
renderSessionFatigue();
renderPatterny();
renderWheelFlow();
renderRiskChaos();
renderMemory();
renderPressureGraph();
renderHotCold();
renderLiveData();
renderPressure();
renderHeatmap();
renderPredictions();
renderTelemetry();
renderEngineHub();
renderAdaptiveLearning();
renderPredictionEvolution();
renderCoreEnginesHeavy();
}
function renderDetailHeavy(){renderEngineAdvancedPanels();}
function renderAdvancedHeavy(){renderEngineAdvancedPanels();}
function renderPredictionEngine(){
const el=document.getElementById('predictionEngine');
if(!el)return;
const pr=computeAIPrediction();
if(!pr){el.innerHTML='<div class="alert">Čakám na spiny — zber dát z dashboardu…</div>';return;}
const inv=pr.invisible||getInvisibleLayer();
let html='<div class="section-label">'+pr.modelLabel+'</div>';
if(shouldSuppressUI('lowConf')){html+='<div class="suppressed-msg">Nízka confidence — detail skrytý (suppression)</div>';}
else{
html+='<div class="panel-line"><span>Model 70·20·10</span><b class="greenTxt">'+pr.modelWeighted+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('STATE')+'</span><b class="blueTxt">'+skFlow(pr.state||'—')+' · '+skFlow(pr.dominantFlow)+'</b></div>'
+'<div class="panel-line"><span>Spoľahlivosť</span><b class="yellowTxt">'+pr.confidence+'%</b></div>';
if(inv&&!shouldSuppressUI('weak'))html+='<div class="panel-line"><span>'+skUiLabel('Flow · Signal · Edge')+'</span><b class="blueTxt">'+skFlow(inv.flowState)+' · '+skSignal(inv.signalQuality)+' · '+skEdge(inv.edge)+'</b></div>';
if(!shouldSuppressUI('detail'))html+='<div class="panel-line"><span>SPINY · TIMING · VIZUÁL</span><b class="blueTxt">'+pr.spinCore+' · '+pr.timingCore+' · '+pr.visualCore+'</b></div>';
}
el.innerHTML=html;
}

function computeLiveDataState(){
const lastSpin=lastSpinNum();
let interval=0;
let intervalLive=false;
if(timingRunning&&timingStartAt){
interval=(Date.now()-timingStartAt)/1000;
intervalLive=true;
}else if(lastBallTimingSec!=null){
interval=lastBallTimingSec;
}else{
const iv=spinIntervals();
interval=iv.length?iv[iv.length-1]:0;
}
const aiScore=spins.length>=2?getUnifiedConfidence():0;
let systemTag='IDLE';
let statusCls='yellowTxt';
if(timingRunning){
systemTag='TIMING LIVE';
statusCls='yellowTxt';
}else if(spins.length>=2){
systemTag='ACTIVE';
statusCls='greenTxt';
}
systemTag=skLiveState(systemTag);
let lastCls='blueTxt';
if(lastSpin===0)lastCls='greenTxt';
else if(lastSpin!=null&&reds.includes(lastSpin))lastCls='redTxt';
else if(lastSpin!=null)lastCls='';
const pillars=spins.length>=2?{spin:lastCoreValues.spinCore,timing:lastCoreValues.timingCore,visual:lastCoreValues.visualCore}:null;
return{
modelLabel:'Živé dáta · stav systému v reálnom čase',
lastSpin:lastSpin!=null?lastSpin:'—',
lastCls,
spinCount:spins.length,
interval:interval.toFixed(2),
intervalLive,
aiScore,
systemTag,
statusCls,
pillars
};
}
function renderLiveData(){
const el=document.getElementById('liveData');
if(!el)return;
const d=computeLiveDataState();
el.innerHTML=
'<div class="section-label">'+d.modelLabel+'</div>'
+'<div class="panel-line"><span>'+skUiLabel('System')+'</span><b class="'+d.statusCls+'">'+d.systemTag+'</b></div>'
+'<div class="panel-line"><span>Posledný spin</span><b class="'+d.lastCls+'">'+d.lastSpin+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Spin count')+'</span><b>'+d.spinCount+'</b></div>'
+'<div class="panel-line"><span>Interval</span><b class="'+(d.intervalLive?'yellowTxt':'blueTxt')+'">'+d.interval+' s'+(d.intervalLive?' · ŽIVÝ':'')+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('AI score')+'</span><b class="greenTxt">'+d.aiScore+'%</b></div>'
+(d.pillars?'<div class="panel-line"><span>'+skUiLabel('Core pulse')+'</span><b style="font-size:11px">'+d.pillars.spin+' · '+d.pillars.timing+' · '+d.pillars.visual+'</b></div>':'');
}
function computeRawStatsEngine(){
const raw=rawSpinCounts();
const total=spins.length;
const colors=countColorStats();
const evenOdd=countEvenOdd();
const highLow=countHighLow();
const topNums=[];
for(let n=0;n<=36;n++){
const c=raw[n]||0;
if(c>0)topNums.push({n,c,pct:total?(c/total*100).toFixed(1):'0.0'});
}
topNums.sort((a,b)=>b.c-a.c||a.n-b.n);
const neverHit=[];
for(let n=0;n<=36;n++)if(!raw[n])neverHit.push(n);
const dozens=DOZENS.map((nums,i)=>{
let hits=0;
spins.forEach(n=>{if(nums.includes(n))hits++;});
return{id:i+1,hits,pct:total?(hits/total*100).toFixed(1):'0.0'};
});
const colHits=[0,0,0];
spins.forEach(n=>{
if(n>=1&&n<=36)colHits[(n-1)%3]++;
});
const columns=colHits.map((hits,i)=>({
id:i+1,hits,pct:total?(hits/total*100).toFixed(1):'0.0'
}));
const zeroHits=raw[0]||0;
return{
modelLabel:'Štatistiky · surové dáta spinov',
total,
colors,
evenOdd,
highLow,
topNums:topNums.slice(0,10),
zeroHits,
zeroPct:total?(zeroHits/total*100).toFixed(1):'0.0',
neverHit:neverHit.slice(0,14),
dozens,
columns,
recent:spins.slice(-12),
combo:computeComboMixStats()
};
}
function comboPctFromHits(hits,total){
if(!total)return 0;
return Math.round(hits/total*100);
}
function comboPctHeatClass(pct){
if(pct>=55)return'pct-hi';
if(pct>=35)return'pct-mid';
return'pct-lo';
}
function computeComboMixStats(){
const list=spins.filter(n=>n>0);
const t=list.length;
if(!t)return{ready:false,total:0};
let c12=0,c13=0,c23=0,d12=0,d13=0,d23=0;
let crMa=0,crVe=0,ciMa=0,ciVe=0;
let crPa=0,crNe=0,ciPa=0,ciNe=0;
let maPa=0,maNe=0,vePa=0,veNe=0;
list.forEach(n=>{
const col=columnIndexForNum(n);
const doz=dozenIndexForNum(n);
if(col===0||col===1)c12++;
if(col===0||col===2)c13++;
if(col===1||col===2)c23++;
if(doz===0||doz===1)d12++;
if(doz===0||doz===2)d13++;
if(doz===1||doz===2)d23++;
const red=reds.includes(n);
const even=n%2===0;
const low=n<19;
if(red&&low)crMa++;else if(red&&!low)crVe++;
else if(!red&&low)ciMa++;else ciVe++;
if(red&&even)crPa++;else if(red&&!even)crNe++;
else if(!red&&even)ciPa++;else ciNe++;
if(low&&even)maPa++;else if(low&&!even)maNe++;
else if(!low&&even)vePa++;else veNe++;
});
return{
ready:true,total:t,
columns:[
{label:'1 + 2',pct:comboPctFromHits(c12,t)},
{label:'1 + 3',pct:comboPctFromHits(c13,t)},
{label:'2 + 3',pct:comboPctFromHits(c23,t)}
],
dozens:[
{label:'1 + 2',pct:comboPctFromHits(d12,t)},
{label:'1 + 3',pct:comboPctFromHits(d13,t)},
{label:'2 + 3',pct:comboPctFromHits(d23,t)}
],
colorSize:[
{label:'ČERVENÁ MALÁ',pct:comboPctFromHits(crMa,t)},
{label:'ČERVENÁ VEĽKÁ',pct:comboPctFromHits(crVe,t)},
{label:'ČIERNA MALÁ',pct:comboPctFromHits(ciMa,t)},
{label:'ČIERNA VEĽKÁ',pct:comboPctFromHits(ciVe,t)}
],
colorParity:[
{label:'ČERVENÁ PÁRNA',pct:comboPctFromHits(crPa,t)},
{label:'ČERVENÁ NEPÁRNA',pct:comboPctFromHits(crNe,t)},
{label:'ČIERNA PÁRNA',pct:comboPctFromHits(ciPa,t)},
{label:'ČIERNA NEPÁRNA',pct:comboPctFromHits(ciNe,t)}
],
sizeParity:[
{label:'MALÉ PÁRNE',pct:comboPctFromHits(maPa,t)},
{label:'MALÉ NEPÁRNE',pct:comboPctFromHits(maNe,t)},
{label:'VEĽKÉ PÁRNE',pct:comboPctFromHits(vePa,t)},
{label:'VEĽKÉ NEPÁRNE',pct:comboPctFromHits(veNe,t)}
]
};
}
function buildComboMixSection(title,icon,rows){
if(!rows||!rows.length)return'';
let h='<div class="combo-stats-sect"><div class="combo-stats-sect-title">'+title+'</div>';
rows.forEach(r=>{
h+='<div class="combo-stat-row '+comboPctHeatClass(r.pct)+'">'
+'<span class="combo-lbl">'+icon+' '+r.label+'</span>'
+'<b class="combo-pct">'+r.pct+'%</b></div>';
});
return h+'</div>';
}
function buildComboMixStatsHTML(combo){
if(!combo||!combo.ready)return'';
return'<div class="combo-stats-block"><div class="combo-stats-title">KOMBINAČNÉ % ŠTATISTIKY</div>'
+buildComboMixSection('STĹPCE MIX %','📈',combo.columns)
+buildComboMixSection('TUCTY MIX %','📊',combo.dozens)
+buildComboMixSection('FARBA + VEĽKOSŤ %','🔥',combo.colorSize)
+buildComboMixSection('FARBA + PÁRNOSŤ %','⚡',combo.colorParity)
+buildComboMixSection('VEĽKOSŤ + PÁRNOSŤ %','🎯',combo.sizeParity)
+'</div>';
}

function renderStatsPanel(){
const el=document.getElementById('statsPanel');
if(!el)return;
if(!spins.length){
el.innerHTML='<div class="alert">Čakám na spiny — raw štatistiky…</div>';
return;
}
const s=computeRawStatsEngine();
const c=s.colors;
const eo=s.evenOdd;
const hl=s.highLow;
let html='<div class="section-label">'+s.modelLabel+'</div>'
+'<div class="panel-line"><span>Celkom spinov</span><b>'+s.total+'</b></div>'
+'<div class="section-label">Farba (raw)</div>'
+'<div class="panel-line"><span>Červená</span><b class="redTxt">'+c.r+'× · '+c.rp+'%</b></div>'
+'<div class="panel-line"><span>Čierna</span><b>'+c.b+'× · '+c.bp+'%</b></div>'
+'<div class="panel-line"><span>Zelená (0)</span><b class="greenTxt">'+c.g+'× · '+s.zeroPct+'%</b></div>'
+'<div class="section-label">Pár / nepár (raw)</div>'
+'<div class="panel-line"><span>Párne</span><b>'+eo.e+'× · '+eo.ep+'%</b></div>'
+'<div class="panel-line"><span>Nepárne</span><b>'+eo.o+'× · '+eo.op+'%</b></div>'
+'<div class="section-label">Veľkosť (raw)</div>'
+'<div class="panel-line"><span>Veľké 19–36</span><b>'+hl.hi+'× · '+hl.hip+'%</b></div>'
+'<div class="panel-line"><span>Malé 1–18</span><b>'+hl.lo+'× · '+hl.lop+'%</b></div>'
+'<div class="section-label">Tucty · stĺpce (raw)</div>';
s.dozens.forEach(d=>{
html+='<div class="panel-line"><span>Tucet '+d.id+'</span><b class="yellowTxt">'+d.hits+'× · '+d.pct+'%</b></div>';
});
s.columns.forEach(col=>{
html+='<div class="panel-line"><span>Stĺpec '+col.id+'</span><b class="blueTxt">'+col.hits+'× · '+col.pct+'%</b></div>';
});
html+=buildComboMixStatsHTML(s.combo);
html+='<div class="section-label">Top čísla (raw počet)</div>';
s.topNums.slice(0,6).forEach((t,i)=>{
const cls=t.n===0?'greenTxt':reds.includes(t.n)?'redTxt':'';
html+='<div class="panel-line"><span>'+(i+1)+'.</span><b class="'+cls+'">'+t.n+' · '+t.c+'× ('+t.pct+'%)</b></div>';
});
if(s.neverHit.length){
html+='<div class="section-label">Bez zásahu</div>'
+'<div class="panel-line"><span>Čísla</span><b style="font-size:11px">'+s.neverHit.join(' · ')+'</b></div>';
}
html+='<div class="section-label">Posledných '+s.recent.length+'</div>'
+'<div class="panel-line"><span>Sekvencia</span><b style="font-size:11px">'+s.recent.join(' · ')+'</b></div>';
el.innerHTML=html;
}
let lastRiskChaosEngine=null;
let lastRiskChaosKey='';
function invalidateRiskChaosCache(){
lastRiskChaosEngine=null;
lastRiskChaosKey='';
}
function computeClusterConflict(){
const c0=getClusters()[0];
const c1=getClusters()[1]||{score:0};
return clamp(Math.abs((c0?.score||0)-(c1?.score||0))*5);
}
let riskChaosBusy=false;
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
function computeRiskChaosEngine(){
const key=spins.length+'|'+(spins[spins.length-1]??'');
if(lastRiskChaosEngine&&lastRiskChaosKey===key)return lastRiskChaosEngine;
const empty={
modelLabel:'Riziko / Chaos · AI predikcia · AI komentár',
sources:'entropia · volatilita · nestabilita timingu · konflikt klastrov',
chaosLevel:0,stability:50,patternReliability:50,randomnessPressure:0,
entropy:0,volatility:0,timingInstability:0,clusterConflict:0,
score:50,tag:'—',prediction:null,comment:null
};
if(spins.length<2){lastRiskChaosEngine=empty;lastRiskChaosKey=key;return empty;}
const core=computeRiskChaosCore();
let prediction=null;
let comment={blendScore:0,dataScore:0,reasoningScore:0,reasonLines:[''],dataLines:['']};
if(!riskChaosBusy){
riskChaosBusy=true;
if(coreAnalysisDepth===0){
prediction=computeAIPrediction();
comment=computeSpinAIComment();
}else if(lastAIPredictionCache){
prediction=lastAIPredictionCache;
comment={blendScore:50,dataScore:50,reasoningScore:50,reasonLines:[''],dataLines:['']};
}
riskChaosBusy=false;
}
const result={
modelLabel:'Riziko / Chaos · AI predikcia · AI komentár',
sources:'entropia · volatilita · nestabilita timingu · konflikt klastrov',
chaosLevel:core.chaosLevel,
stability:core.stability,
patternReliability:core.patternReliability,
randomnessPressure:core.randomnessPressure,
entropy:core.entropy,
volatility:core.volatility,
timingInstability:core.timingInstability,
clusterConflict:core.clusterConflict,
entropySignal:core.entropySignal,
score:core.score,
tag:core.tag,
prediction:prediction?{tip:prediction.tip,confidence:prediction.confidence,chaosPenalty:prediction.chaosPenalty}:null,
comment:{blend:comment.blendScore,data:comment.dataScore,reasoning:comment.reasoningScore,insight:(comment.reasonLines.find(l=>l&&!/Čakám/.test(l))||comment.dataLines[0]||'').slice(0,72)}
};
lastRiskChaosEngine=result;
lastRiskChaosKey=key;
return result;
}
function computeRiskEngine(){
const r=computeRiskChaosEngine();
return{
score:r.score,
tag:r.tag,
chaos:r.chaosLevel,
entropy:r.entropy,
volatility:r.volatility,
predictionRisk:r.prediction?clamp(100-r.prediction.confidence):clamp(100-calculateAI()),
instability:r.timingInstability,
heatRisk:r.clusterConflict
};
}

/* BEHAVIOR ALERT ENGINE — iba raw spiny, max 2 alerty, anti-spam */
let bahAlertPrev=null;
let bahPendingConfirm={};
let bahDisplayedId=null;
let bahDisplayedSince=0;
let bahLastSwitchTs=0;
let bahLastSnapKey='';
const BAH_ALERT_SWITCH_MS=12000;
const BAH_ALERT_COOLDOWN_MS=8000;
const BAH_RADAR_MIN=5;
const BAH_NARRATE_FULL=12;
const BAH_SOFT_UNTIL=15;

function bahAlertDef(id,icon,title,text,color,pri,pulse){
return{id,icon,title,text:skWheelUserText(text),color,pri,pulse:pulse||'',hint:''};
}

function bahResetSession(){
bahAlertPrev=null;
bahPendingConfirm={};
bahDisplayedId=null;
bahDisplayedSince=0;
bahLastSwitchTs=0;
bahLastSnapKey='';
lastAlertHub=null;
lastAlertHubKey='';
}

function bahVar(seed,arr){
return arr[Math.abs(seed|0)%arr.length];
}

function bahRadarPhase(n){
if(n<BAH_RADAR_MIN)return'gather';
if(n<=RO_LEARN_MAX)return'observe';
if(n<BAH_SOFT_UNTIL)return'soft';
return'full';
}

function bahDataWhy(id,A){
const osc=A.oscCol||0;
const ch=A.chaos?A.chaos.chaosLevel:0;
const pat=A.pat?A.pat.rate:50;
const ret=A.returnRate||0;
const colLen=A.colSt?A.colSt.len:0;
const mig=A.mig?A.mig.dir:'—';
if(id==='CHAOS'){
if(osc>=56)return'V krátkom okne často strieda stĺpce — wheel mení smer príliš často.';
if(ch>=60)return'Session je teraz veľmi rozhúpaná (neporiadok okolo '+ch+' %) — stabilný rytmus chýba.';
return'Posledné spiny nemajú spoločný smer.';
}
if(id==='WAIT'){
if(pat<46)return'Opakovania v histórii nedávajú istotu (slabší obraz patternov).';
if(ch>=65)return'Koleso je príliš nepredvídateľný na bezpečné čítanie.';
if(mig==='MIX')return'Smer na wheeli sa stále preklápa — flow sa nevie ustáliť.';
return'Signály z histórie sa navzájom nezhodujú.';
}
if(id==='COLLAPSE')return'Dominancia slabne — návraty už len '+ret+' % v dominantnom pásme.';
if(id==='SHIFT')return'Smer pohybu sa zmenil z držaného smeru na rozptýlený.';
if(id==='UNCLEAR')return'Smer je nejasný — stĺpce aj chaos ukazujú rozptyl.';
if(id==='REVERSAL')return'Opakovaný tlak farby alebo pásu už nedrží ('+colLen+' spinov streak).';
if(id==='OVERHEAT')return'Stĺpec alebo pás tlačí už '+colLen+' spinov za sebou — tlak môže byť vyčerpaný.';
if(id==='WEAK')return'Návraty klesli na '+ret+' % — momentum dominancie slabne.';
if(id==='DOM'||id==='STABLE')return'Návraty v pásme držia okolo '+ret+' % — wheel sa tam vracia.';
if(id==='CLUSTER')return'Zásahy v pásme sú roztrieštené — návraty len '+ret+' %.';
if(osc>=52)return'Koleso mení smer príliš často a nevytvára stabilný rytmus.';
if(pat<52)return'Posledné spiny nevytvárajú stabilnú dominanciu.';
if(ret<40)return'Návraty do rovnakého sektora sú zatiaľ slabé.';
return'Behavior wheelu je momentálne nejasný — zatiaľ nič výrazné.';
}

function bahNarrativePack(id,A){
const n=spins.length;
const seed=n+(A.snap?A.snap.chaos:0)+(A.snap?A.snap.oscCol:0);
const phase=bahRadarPhase(n);
const soft=n<BAH_SOFT_UNTIL;
const colName=bahColName(A.domCol);
const hintWait='Odporúčam vynechať 2–3 spiny a sledovať ďalší vývoj.';
const hintWatch='Sleduj ďalší vývoj flowu opatrnejšie.';
const why=bahDataWhy(id,A);
const packs={
WAIT:{
icon:'⛔',
title:'Odporúčam počkať',
texts:[
'Flow sa zatiaľ nevie ustáliť — posledné spiny sú príliš rozbité.',
'Session je momentálne nečitateľná — wheel často mení charakter.',
'Koleso nevytvára stabilný rytmus, preto teraz radšej nič netvrdím.'
],
hint:hintWait,
color:'red'
},
CHAOS:{
icon:'🔴',
title:'Koleso často mení smer',
texts:[
'Koleso mení smer príliš často a nevytvára stabilný rytmus.',
'Posledné spiny nemajú spoločný smer — v session je veľa kolísania.',
'Behavior pôsobí príliš rozbitým dojmom, kolo sa ťažko číta.'
],
hint:soft?hintWatch:hintWait,
color:'red'
},
COLLAPSE:{
icon:'🔴',
title:'Flow stráca stabilitu',
texts:[
'Dominancia začína slabnúť a návraty už nedržia pokope.',
'Flow sa rozpadá — tlak v dominantnom pásme už nesedí s predchádzajúcimi spinmi.',
'Koleso stráca konzistenciu, session je ťažšie čitateľná.'
],
hint:hintWait,
color:'red'
},
SHIFT:{
icon:'🟠',
title:'Smer sa mení',
texts:[
'Koleso práve mení smer pohybu — predtým držal iný smer na kolese.',
'Presun flowu je viditeľný, starý smer už toľko nepodporuje.',
'Pohyb na wheeli sa preklápa, ešte nie je jasné, čo bude dominantné.'
],
hint:hintWatch,
color:'orange'
},
UNCLEAR:{
icon:'⚠',
title:'Behavior je nejasný',
texts:[
'Koleso momentálne nemá jednoznačný smer — signály sa navzájom nezhodujú.',
'Session zatiaľ nevytvára kvalitný tlak, smer je rozptýlený.',
'Posledné spiny nevytvárajú spoločný rytmus.'
],
hint:hintWatch,
color:'orange'
},
REVERSAL:{
icon:'🟠',
title:'Návraty slabnú',
texts:[
'Opakované návraty do rovnakého pásma začínajú strácať silu.',
'Farba alebo pás držali tlak, ale posledné spiny už nedávajú rovnaký obraz.',
'Flow môže čoskoro zmeniť smer — opakovaný tlak už nie je taký silný.'
],
hint:hintWatch,
color:'orange'
},
OVERHEAT:{
icon:'🟠',
title:'Tlak trvá príliš dlho',
texts:[
'Dominancia ide už dlho za sebou — wheel môže byť preťažený.',
'Jeden smer tlačí príliš dlho, návraty začínajú pôsobiť vyčerpane.',
'Tlak dominancie trvá dlho — pozor na únavu flowu.'
],
hint:hintWatch,
color:'orange'
},
WEAK:{
icon:'🟠',
title:'Dominancia slabne',
texts:[
'Dominancia stráca momentum — posledné spiny ju už toľko nepotvrdzujú.',
'Flow slabne, aj keď ešte vidím určitý smer.',
'Session začína byť menej čitateľná v doterajšom pásme.'
],
hint:hintWatch,
color:'orange'
},
DOM:{
icon:'🟢',
title:'Dominancia zatiaľ drží',
texts:[
colName+' stále drží tlak — návraty do tohto pásma pokračujú.',
'Koleso sa opakovane vracia do '+colName+' — behavior je zatiaľ konzistentný.',
'V session je viditeľný stabilný tlak na '+colName+'.'
],
hint:'Dominancia zatiaľ stále drží — sleduj, či to potvrdia ďalšie spiny.',
color:'green'
},
STABLE:{
icon:'🟢',
title:'Stabilný rytmus',
texts:[
'Koleso sa vracia do rovnakého sektora — rytmus je zatiaľ čitateľný.',
'Návraty a tlak držia pokope, session má zatiaľ zmysel sledovať.',
'Posledné spiny dávajú spoločný smer — flow je zatiaľ ustálený.'
],
hint:'Sleduj koleso — zatiaľ drží rozumné správanie bez tvrdenia o ďalšom čísle.',
color:'green'
},
CLUSTER:{
icon:'🟠',
title:'Pás je nestabilný',
texts:[
'Koleso nedrží stabilnú zónu — zásahy v pásme sú roztrieštené.',
'Klaster na wheeli slabne, session nemá pevný stred.',
'Opakované čísla v jednom pásme ešte nedávajú jednotný obraz.'
],
hint:hintWatch,
color:'orange'
},
IDLE:{
icon:'⚪',
title:'Momentálne bez výrazného flowu',
texts:[
'Koleso mení smer príliš často a nevytvára stabilný rytmus.',
'Posledné spiny nevytvárajú stabilnú dominanciu.',
'Behavior wheelu je momentálne nejasný — zatiaľ nič výrazné.',
'Session zatiaľ nevytvára kvalitný tlak.',
'Koleso stráca konzistenciu v krátkom okne.'
],
hint:n<RO_NARRATE_MIN?'Zbieram obraz — plný radar od '+RO_NARRATE_MIN+'. spinu v histórii.':hintWatch,
color:'neutral'
}
};
const p=packs[id]||packs.IDLE;
let text=id==='IDLE'?why:bahVar(seed,p.texts);
if(id!=='IDLE'&&why&&text.indexOf(why.slice(0,24))<0)text=text+' '+why;
let hint=p.hint;
if(phase==='observe')hint='Ešte zbieram obraz ('+n+' spinov) — plné upozornenia od '+BAH_NARRATE_FULL+'.';
else if(phase==='soft'&&p.color==='red')hint=hintWatch;
return{
icon:p.icon,
title:p.title,
text,
hint,
color:p.color,
phase
};
}

function bahColName(ci){
return(ci>=0?ci+1:1)+'. stĺpec';
}

function bahHumanizeAlert(raw,A){
if(!raw)return null;
const pack=bahNarrativePack(raw.id,A);
const n=spins.length;
let pulse=raw.pulse||'';
if(pack.color==='neutral'||pack.phase==='observe')pulse='';
else if(n<BAH_SOFT_UNTIL&&pack.color==='red')pulse='';
return{
id:raw.id,
icon:pack.icon,
title:pack.title,
text:pack.text,
hint:pack.hint,
color:pack.color,
pri:raw.pri,
pulse
};
}

function bahNowLine(primary){
if(!primary)return'';
if(primary.color==='red'||primary.id==='WAIT')return'Teraz: radšej počkaj a sleduj wheel.';
if(primary.color==='orange')return'Teraz: sleduj opatrne, či sa flow ustáli.';
if(primary.color==='green')return'Teraz: dominancia zatiaľ drží — sleduj potvrdenie.';
return'Teraz: pokojné pozorovanie bez výrazného signálu.';
}

function bahConfirm(id,ok){
if(!ok){delete bahPendingConfirm[id];return false;}
bahPendingConfirm[id]=(bahPendingConfirm[id]||0)+1;
return bahPendingConfirm[id]>=2;
}

function bahAnalyzeFromSpins(){
const slice=spins.filter(n=>n>0);
const t=slice.length;
if(t<5)return{ready:false};
const chaos=analyzeChaosFromSpins();
const oscCol=slice.length>=6?raOscillationScore(slice.slice(-12),'col'):0;
const pat=spins.length>=8?raPatternReliability():{rate:50};
const colSt=rbaColStreak(slice.slice(-12));
const colorSt=raColorStreak(slice.slice(-15));
const mig=getWheelMigrationDirection();
const colBins=rbaWeightedBins('col');
const domCol=[0,1,2].sort((a,b)=>colBins[b]-colBins[a])[0];
const domNums=qwNumsForColumn(domCol);
const returnRate=domNums.length?qwSectorReturnRate(domNums,Math.min(18,spins.length)):0;
const stableMig=mig.dir==='CW'||mig.dir==='CCW';
const snap={t,chaos:chaos.chaosLevel,oscCol,pat:pat.rate,colLen:colSt.len,migDir:mig.dir,domCol,returnRate,stableMig,colorLen:colorSt.len};
return{ready:true,snap,chaos,pat,colSt,colorSt,mig,domCol,returnRate,stableMig,oscCol};
}

function bahSnapKey(s){
if(!s)return'';
return[s.chaos,s.migDir,s.colLen,s.returnRate|0,s.pat|0,s.domCol,s.colorLen].join('|');
}

function bahCollectCandidates(A){
const c=[];
const wait=A.chaos.noEdge||A.chaos.chaosLevel>=65||(A.mig.dir==='MIX'&&A.chaos.chaosLevel>=52)||A.pat.rate<46;
if(wait)c.push(bahAlertDef('WAIT','🔴','REŽIM ČAKANIA','Flow je príliš nestabilný.','red',0,'bah-pulse-warn'));
if(A.chaos.chaosLevel>=60||A.oscCol>=56)c.push(bahAlertDef('CHAOS','🔴','CHAOS VYSOKÝ','Koleso mení smer príliš často.','red',1,'bah-pulse-warn'));
const collapseOk=bahConfirm('COLLAPSE',A.colSt.len>=3&&A.returnRate<36&&A.pat.rate<54);
if(collapseOk)c.push(bahAlertDef('COLLAPSE','🔴','FLOW KOLAPS','Dominancia stráca smer.','red',2,'bah-pulse-warn'));
const shiftOk=bahConfirm('SHIFT',bahAlertPrev&&(bahAlertPrev.migDir==='CW'||bahAlertPrev.migDir==='CCW')&&A.mig.dir==='MIX');
if(shiftOk)c.push(bahAlertDef('SHIFT','🟠','SMER SA MENÍ','Koleso mení flow smer.','orange',3,'bah-pulse-soft'));
if(!wait&&(A.mig.dir==='MIX'||A.oscCol>=54)&&A.chaos.chaosLevel<60)
c.push(bahAlertDef('UNCLEAR','⚠','FLOW NEJASNÝ','Koleso momentálne nemá smer.','orange',2));
if(A.colorSt.len>=4&&A.oscCol>=48)c.push(bahAlertDef('REVERSAL','🟠','NÁVRATY SLABNÚ','Flow môže meniť smer.','orange',6,'bah-pulse-soft'));
if(A.colSt.len>=5)c.push(bahAlertDef('OVERHEAT','🟠','TLAK SLABNE','Dominancia ide príliš dlho.','orange',5));
if(A.colSt.len>=3&&A.returnRate<42&&A.pat.rate<58)c.push(bahAlertDef('WEAK','🟠','FLOW SLABNE','Dominancia stráca momentum.','orange',5));
if(A.colSt.len>=3&&A.returnRate>=44&&!wait){
const colName=(A.domCol+1)+'. stĺpec';
c.push(bahAlertDef('DOM','🟢','STABILNÝ SEKTOR',colName+' stále drží flow.','green',4));
}
if(!wait&&A.chaos.chaosLevel<52&&A.returnRate>=46&&A.pat.rate>=54&&A.stableMig){
c.push(bahAlertDef('STABLE','🟢','STABILNÝ FLOW','Koleso sa vracia do rovnakého sektora.','green',7));
}
const clusterWeak=A.returnRate<32&&A.pat.rate<50;
if(clusterWeak&&!wait)c.push(bahAlertDef('CLUSTER','🟠','SLABÝ KLASTER','Koleso nedrží stabilnú zónu.','orange',4));
if(!c.length)c.push(bahAlertDef('IDLE','⚪','MOMENTÁLNE BEZ FLOW','Koleso nevytvára čitateľný behavior.','neutral',9));
else if(!wait&&A.chaos.chaosLevel<48&&A.pat.rate<52&&A.colSt.len<3&&A.returnRate<40)
c.push(bahAlertDef('IDLE','⚪','ŽIADNY SILNÝ FLOW','Momentálne nevidím čitateľný behavior.','neutral',8));
const seen=new Set();
return c.filter(a=>{if(seen.has(a.id))return false;seen.add(a.id);return true;}).sort((a,b)=>a.pri-b.pri);
}

function bahDedupePair(primary,secondary){
if(!primary)return{primary:null,secondary:null};
if(!secondary)return{primary,secondary:null};
if(secondary.id===primary.id||secondary.title===primary.title)return{primary,secondary:null};
if(primary.id==='WAIT'&&secondary.id==='UNCLEAR')return{primary,secondary:null};
if(primary.id==='CHAOS'&&secondary.id==='UNCLEAR')return{primary,secondary};
if(primary.id==='WAIT'&&secondary.id==='CHAOS')return{primary,secondary};
return{primary,secondary};
}

function bahApplyPriority(list){
if(!list.length)return[];
const wait=list.find(a=>a.id==='WAIT');
if(wait){
const chaos=list.find(a=>a.id==='CHAOS');
const collapse=list.find(a=>a.id==='COLLAPSE');
const weak=list.find(a=>a.id==='WEAK');
const sec=chaos||collapse||weak||list.find(a=>a=>a.id!=='WAIT'&&a.color!=='green'&&a.id!=='IDLE');
const pair=bahDedupePair(wait,sec);
const out=[pair.primary];
if(pair.secondary)out.push(pair.secondary);
return out.slice(0,2);
}
const top=list[0];
if(top.id==='IDLE')return[list.find(a=>a.id==='IDLE')||top].slice(0,1);
return list.slice(0,2);
}

function bahStabilizeDisplay(cands,snapKey){
if(!cands.length)return{primary:null,secondary:null};
const now=Date.now();
let pick=cands[0];
let sec=cands[1]||null;
const deduped=bahDedupePair(pick,sec);
pick=deduped.primary;
sec=deduped.secondary;
const stateChanged=snapKey&&snapKey!==bahLastSnapKey;
if(stateChanged)bahLastSnapKey=snapKey;
if(bahDisplayedId&&bahDisplayedId===pick.id){
if(!stateChanged&&now-bahDisplayedSince<BAH_ALERT_COOLDOWN_MS){
pick=cands.find(x=>x.id===bahDisplayedId)||pick;
}
}else if(bahDisplayedId&&pick.id!==bahDisplayedId){
if(!stateChanged&&now-bahLastSwitchTs<BAH_ALERT_SWITCH_MS){
const old=cands.find(x=>x.id===bahDisplayedId);
if(old&&(old.pri<=pick.pri+2))pick=old;
}
}
if(pick.id!==bahDisplayedId||stateChanged){
bahDisplayedId=pick.id;
bahDisplayedSince=now;
bahLastSwitchTs=now;
}
const finalDedup=bahDedupePair(pick,sec);
return{primary:finalDedup.primary,secondary:finalDedup.secondary};
}

function computeBehaviorAlerts(){
const lastN=spins.length?spins[spins.length-1]:'';
const k=spins.length+'|'+lastN;
if(lastAlertHub&&lastAlertHubKey===k)return lastAlertHub;
const empty={
ready:false,risk:{score:0,tag:'—'},comment:{blendScore:0,dataScore:0,reasoningScore:0},
warnings:[],infos:[],display:['Čakám na 5+ spinov…'],critical:0,all:[],
alerts:[],history:[],topCritical:null,primary:null,secondary:null
};
if(spins.length<5){lastAlertHub=empty;lastAlertHubKey=k;return empty;}
const A=bahAnalyzeFromSpins();
if(!A.ready){lastAlertHub=empty;lastAlertHubKey=k;return empty;}
const rawCands=bahCollectCandidates(A);
const filtered=bahApplyPriority(rawCands);
const disp=bahStabilizeDisplay(filtered,bahSnapKey(A.snap));
bahAlertPrev=A.snap;
const primary=bahHumanizeAlert(disp.primary,A);
const secondary=bahHumanizeAlert(disp.secondary,A);
const legacyAlerts=[primary,secondary].filter(Boolean).map(a=>({
id:a.id,text:a.title,type:a.id,priority:a.color==='red'?'CRITICAL':a.color==='orange'?'HIGH':'MEDIUM',
strength:0,source:'SPINY',cls:a.color==='red'?'p1':a.color==='orange'?'p2':'p4',ts:Date.now()
}));
const warnings=primary?['⚠ '+primary.title]:[];
const display=warnings.concat(secondary?['ℹ '+secondary.title]:[]);
const result={
ready:true,risk:computeRiskEngine(),
comment:{blendScore:0,dataScore:0,reasoningScore:0},
warnings,infos:[],display,critical:primary&&(primary.color==='red')?1:0,
all:display,alerts:legacyAlerts,history:[],
topCritical:legacyAlerts[0]||null,
primary,secondary,
nowLine:bahNowLine(primary),
phase:bahRadarPhase(spins.length)
};
lastAlertHub=result;
lastAlertHubKey=k;
return result;
}

function computeLiveAlertEngine(){return computeBehaviorAlerts();}
function computeAlertHub(){return computeBehaviorAlerts();}
function buildSpinAnomalyAlerts(){
const eng=computeBehaviorAlerts();
if(!eng.ready||!eng.primary)return[];
const out=[eng.primary.title];
if(eng.secondary)out.push(eng.secondary.title);
return out;
}

function buildBahAlertCard(a,secondary){
if(!a)return'';
const pulse=a.pulse?' '+a.pulse:'';
const tier=secondary?' bah-secondary':' bah-primary';
let h='<div class="bah-alert-card bah-'+a.color+tier+pulse+'">'
+'<div class="bah-alert-title">'+a.icon+' '+a.title+'</div>'
+'<div class="bah-alert-text">'+a.text+'</div>';
if(a.hint)h+='<div class="bah-alert-hint">'+a.hint+'</div>';
h+='</div>';
return h;
}

const BOARD_LAYOUT=[
[3,6,9,12,15,18,21,24,27,30,33,36],
[2,5,8,11,14,17,20,23,26,29,32,35],
[1,4,7,10,13,16,19,22,25,28,31,34]
];
const BOARD_COLS=BOARD_LAYOUT.map(r=>r.slice());
const BET_BLACK=[];
for(let n=1;n<=36;n++)if(!reds.includes(n))BET_BLACK.push(n);
const BET_EVEN=[];const BET_ODD=[];
for(let n=1;n<=36;n++){if(n%2===0)BET_EVEN.push(n);else BET_ODD.push(n);}
const BET_LOW=[];const BET_HIGH=[];
for(let n=1;n<=18;n++)BET_LOW.push(n);
for(let n=19;n<=36;n++)BET_HIGH.push(n);
function spinAreaPct(nums){
if(!spins.length)return'0.0';
let hit=0;
for(let i=0;i<spins.length;i++)if(nums.includes(spins[i]))hit++;
return(hit/spins.length*100).toFixed(1);
}
/* FLOW PRESSURE SCORE — board % = sila flow v session (NIE pravdepodobnosť) · 70/20/10 */
function historyFlowWeight(fromEnd,totalLen){
if(fromEnd<10)return 0.06;
if(fromEnd<20)return 0.03;
if(totalLen<=20)return 0;
return 0.1/Math.max(1,totalLen-20);
}
function computeSpinFlowPressureLayer(){
const raw={};
for(let n=0;n<=36;n++)raw[n]=0;
if(!spins.length)return raw;
const L=spins.length;
for(let i=0;i<L;i++){
const n=spins[i];
raw[n]+=historyFlowWeight(L-1-i,L)*100;
}
const mig=getWheelMigrationDirection();
const dir=mig.dir==='CW'?1:mig.dir==='CCW'?-1:0;
const trail=spins.slice(-8);
if(trail.length>=2){
for(let i=1;i<trail.length;i++){
const b=trail[i];
for(let n=1;n<=36;n++){
const step=wheelStep(b,n);
if(dir>0&&step>0&&step<=3)raw[n]+=(4-step)*9;
if(dir<0&&step<0&&step>=-3)raw[n]+=(4-Math.abs(step))*9;
const dist=Math.abs(wheelStep(b,n));
if(dist>=1&&dist<=2)raw[n]+=7-dist*2;
}
}
}
const last=lastSpinNum();
if(last!=null&&last!==0&&dir!==0){
for(let n=1;n<=36;n++){
const st=wheelStep(last,n);
if(dir>0&&st>0&&st<=5)raw[n]+=(6-st)*5.5;
if(dir<0&&st<0&&st>=-5)raw[n]+=(6-Math.abs(st))*5.5;
}
}
const clusters=getClusters().slice(0,2);
clusters.forEach((c,i)=>{
const boost=(c.score||18)*(i===0?1.25:0.62);
c.nums.forEach(n=>{if(n!==0)raw[n]+=boost;});
});
const migRun=countMigrationStreak();
if(migRun>=3&&dir!==0&&clusters[0]){
clusters[0].nums.forEach(n=>{if(n!==0)raw[n]+=migRun*2.8;});
}
const persist=persistenceEngine.maxLife||0;
if(persist>=4&&clusters[0]){
clusters[0].nums.forEach(n=>{if(n!==0)raw[n]+=persist*1.6;});
}
if(spins.length>=3){
const hc=computeHotColdEngine();
hc.hot.slice(0,8).forEach((x,i)=>{raw[x.n]=(raw[x.n]||0)*(1+Math.max(0.03,0.09-i*0.01));});
hc.cold.slice(0,8).forEach((x,i)=>{raw[x.n]=(raw[x.n]||0)*(1-Math.max(0.02,0.06-i*0.008));});
hc.overheated.slice(0,4).forEach(x=>{raw[x.n]=(raw[x.n]||0)*0.93;});
}
return raw;
}
function applyFlowChaosFlatten(raw,chaosLevel,noEdge,sessionMode){
let sum=0;
for(let n=0;n<=36;n++)sum+=raw[n]||0;
const mean=sum/37;
const flat=clamp(chaosLevel/100*0.72+(noEdge?0.16:0)+((sessionMode==='HIGH_CHAOS'||sessionMode==='DEAD_RANDOM')?0.1:0));
for(let n=0;n<=36;n++)raw[n]=(raw[n]||0)*(1-flat)+mean*flat;
if(noEdge)for(let n=0;n<=36;n++)raw[n]*=0.88;
}
function computeTimingFlowLayer(n,spinVal,timingStability,timingVol,flowDir){
let v=spinVal;
const last=lastSpinNum();
if(timingStability>=60&&last!=null&&flowDir!=='MIX'&&n!==0){
const st=wheelStep(last,n);
const fd=flowDir==='CW'?1:flowDir==='CCW'?-1:0;
if(fd>0&&st>0&&st<=4)v*=1+(timingStability-50)/180;
else if(fd<0&&st<0&&st>=-4)v*=1+(timingStability-50)/180;
else v*=1+(timingStability-55)/350;
}else if(timingStability<42||timingVol>6){
v*=0.72+timingStability/250;
}
return Math.max(0,v);
}
function computeVisualFlowLayer(n,clusters,visualHeat,visualPressure){
let v=0;
if(clusters[0]&&clusters[0].nums.includes(n))v+=7+visualPressure/18;
if(clusters[1]&&clusters[1].nums.includes(n))v+=3.5;
if(visualHeat>=58&&n!==0)v+=2;
return v;
}
function computeAINumberScores(){
const key=spins.length+'|'+spins.slice(-30).join(',')+'|'+predCacheKey();
if(spins.length<2){lastBoardAIScores=null;lastBoardAIKey=key;return null;}
if(lastBoardAIScores&&lastBoardAIKey===key)return lastBoardAIScores;
const CA=computeCoreAnalysis();
if(!CA){lastBoardAIScores=null;lastBoardAIKey=key;return null;}
const Q=spins.length>=2?computeQuantumWheelBrain():null;
const chaosLevel=Q?Q.chaosLevel:(CA.chaosLevel||50);
const noEdge=!!(CA.noEdge||(Q&&Q.noEdge));
const flowDir=Q?Q.flowDir:'MIX';
const timingStability=Q?Q.timingStability:(lastTimingBreakdown.stability||50);
const timingVol=Q?Q.timingVolatility:0;
const sessionMode=CA.sessionMode||sessionIntel.mode;
const spinRaw=computeSpinFlowPressureLayer();
applyFlowChaosFlatten(spinRaw,chaosLevel,noEdge,sessionMode);
spinRaw[0]=(spinRaw[0]||0)*0.32+chaosLevel*0.14;
const clusters=getClusters().slice(0,3);
const blended={};
let total=0;
for(let n=0;n<=36;n++){
const sp=Math.max(0,spinRaw[n]||0);
const tm=computeTimingFlowLayer(n,sp,timingStability,timingVol,flowDir);
const vs=computeVisualFlowLayer(n,clusters,Q?Q.visualHeat:50,Q?Q.visualPressure:50);
blended[n]=sp*MODEL.SPINS+tm*MODEL.TIMING+vs*MODEL.VISUAL;
total+=blended[n];
}
const scores={};
for(let n=0;n<=36;n++)scores[n]=total>0?blended[n]/total:1/37;
lastBoardAIScores=scores;
lastBoardAIKey=key;
return scores;
}
function idxDozen(n){if(n>=1&&n<=12)return 0;if(n<=24)return 1;if(n<=36)return 2;return-1;}
function idxColumn(n){if(n<1||n>36)return-1;return(n-1)%3;}
function idxColor(n){if(n===0)return-1;return reds.includes(n)?0:1;}
function idxParity(n){if(n<1)return-1;return n%2===0?0:1;}
function idxLowHigh(n){if(n<1)return-1;return n<=18?0:1;}
function applyMacroChaosFlatten(raw,chaosLevel,noEdge,sessionMode){
let sum=0;for(let i=0;i<raw.length;i++)sum+=raw[i]||0;
const mean=sum/raw.length||0;
const flat=clamp(chaosLevel/100*0.82+(noEdge?0.14:0)+((sessionMode==='HIGH_CHAOS'||sessionMode==='DEAD_RANDOM')?0.12:0));
for(let i=0;i<raw.length;i++)raw[i]=(raw[i]||0)*(1-flat)+mean*flat;
if(noEdge)for(let i=0;i<raw.length;i++)raw[i]*=0.9;
}
function smoothMacroFlowPct(pct,smoothKey,alpha){
if(!lastMacroFlowSmooth)lastMacroFlowSmooth={};
const prev=lastMacroFlowSmooth[smoothKey];
if(!prev||prev.length!==pct.length){lastMacroFlowSmooth[smoothKey]=pct.slice();return pct;}
const out=pct.map((v,i)=>prev[i]*(1-alpha)+v*alpha);
const sum=out.reduce((a,b)=>a+b,0)||1;
const norm=out.map(v=>(v/sum)*100);
lastMacroFlowSmooth[smoothKey]=norm;
return norm;
}
function computeMacroFlowPct(microScores,groups,indexFn,smoothKey,CA,Q){
const gLen=groups.length;
const spinRaw=new Array(gLen).fill(0);
const L=spins.length;
for(let i=0;i<L;i++){
const gi=indexFn(spins[i]);
if(gi<0)continue;
spinRaw[gi]+=historyFlowWeight(L-1-i,L)*120;
}
let streakGi=-1,streakLen=0;
for(let i=L-1;i>=0;i--){
const gi=indexFn(spins[i]);
if(gi<0){if(i===L-1)break;else break;}
if(streakGi<0){streakGi=gi;streakLen=1;}
else if(gi===streakGi)streakLen++;
else break;
}
if(streakLen>=3&&streakGi>=0)spinRaw[streakGi]+=streakLen*9;
const clusters=getClusters().slice(0,2);
clusters.forEach((c,i)=>{
const counts=new Array(gLen).fill(0);
c.nums.forEach(n=>{const gi=indexFn(n);if(gi>=0)counts[gi]++;});
let best=0;for(let j=1;j<gLen;j++)if(counts[j]>counts[best])best=j;
if(counts[best]>0)spinRaw[best]+=(c.score||20)*(i===0?1.5:0.75);
});
const trail=spins.slice(-8).filter(n=>indexFn(n)>=0);
const mig=getWheelMigrationDirection();
const dir=mig.dir==='CW'?1:mig.dir==='CCW'?-1:0;
if(trail.length>=1){
const tg={};
trail.forEach(n=>{const gi=indexFn(n);if(gi>=0)tg[gi]=(tg[gi]||0)+1;});
Object.keys(tg).forEach(k=>{spinRaw[+k]+=tg[k]*5;});
}
const last=trail.length?trail[trail.length-1]:null;
if(last!=null&&dir!==0){
for(let n=1;n<=36;n++){
const gi=indexFn(n);
if(gi<0)continue;
const st=wheelStep(last,n);
if(dir>0&&st>0&&st<=4)spinRaw[gi]+=(5-st)*6.5;
if(dir<0&&st<0&&st>=-4)spinRaw[gi]+=(5-Math.abs(st))*6.5;
}
}
if(spins.length>=3){
const hc=computeHotColdEngine();
hc.hot.slice(0,10).forEach((x,i)=>{const gi=indexFn(x.n);if(gi>=0)spinRaw[gi]+=(10-i)*2.4;});
hc.cold.slice(0,8).forEach((x,i)=>{const gi=indexFn(x.n);if(gi>=0)spinRaw[gi]-=Math.max(0,4-i*0.35);});
}
const chaosLevel=Q?Q.chaosLevel:(CA.chaosLevel||50);
const noEdge=!!(CA.noEdge||(Q&&Q.noEdge));
const sessionMode=CA.sessionMode||sessionIntel.mode;
applyMacroChaosFlatten(spinRaw,chaosLevel,noEdge,sessionMode);
let domGi=0;for(let j=1;j<gLen;j++)if(spinRaw[j]>spinRaw[domGi])domGi=j;
const timingStability=Q?Q.timingStability:(lastTimingBreakdown.stability||50);
const timingVol=Q?Q.timingVolatility:0;
const visualHeat=Q?Q.visualHeat:50;
const visualPressure=Q?Q.visualPressure:50;
const timingLayer=spinRaw.map((v,i)=>{
if(timingStability>=60&&i===domGi)return v*(1+(timingStability-50)/220);
if(timingStability<42||timingVol>6)return v*(0.74+timingStability/280);
return v;
});
const visualLayer=timingLayer.map((v,i)=>{
let x=v;
if(i===domGi&&visualHeat>=55)x+=visualPressure/14;
return Math.max(0,x);
});
const microSums=groups.map(nums=>nums.reduce((s,n)=>s+(microScores[n]||0),0));
const microTotal=microSums.reduce((a,b)=>a+b,0)||1;
const blended=visualLayer.map((v,i)=>{
const microPct=(microSums[i]/microTotal)*100;
return v*0.7+microPct*0.3;
});
const sum=blended.reduce((a,b)=>a+b,0)||1;
let pct=blended.map(v=>(v/sum)*100);
pct=smoothMacroFlowPct(pct,smoothKey,0.34);
return pct;
}
function aiGroupPctFromScores(scores,groups){
const sums=groups.map(nums=>nums.reduce((s,n)=>s+(scores[n]||0),0));
const total=sums.reduce((a,b)=>a+b,0);
if(total<=0)return sums.map(()=>0);
return sums.map(s=>(s/total)*100);
}
function computeBoardAIPercentages(){
const scores=computeAINumberScores();
if(!scores)return null;
const CA=computeCoreAnalysis();
const Q=spins.length>=2?computeQuantumWheelBrain():null;
let numTotal=0;
for(let n=0;n<=36;n++)numTotal+=scores[n]||0;
const nums={};
for(let n=0;n<=36;n++)nums[n]=numTotal>0?((scores[n]||0)/numTotal)*100:0;
const dozens=computeMacroFlowPct(scores,DOZENS,idxDozen,'macro|doz',CA,Q);
const cols=computeMacroFlowPct(scores,AI_COLUMNS,idxColumn,'macro|col',CA,Q);
const lowHigh=computeMacroFlowPct(scores,[BET_LOW,BET_HIGH],idxLowHigh,'macro|lh',CA,Q);
const evenOdd=computeMacroFlowPct(scores,[BET_EVEN,BET_ODD],idxParity,'macro|eo',CA,Q);
const colorPct=computeMacroFlowPct(scores,[reds,BET_BLACK],idxColor,'macro|clr',CA,Q);
return{
nums,
dozens,
cols,
low:lowHigh[0],
high:lowHigh[1],
even:evenOdd[0],
odd:evenOdd[1],
red:colorPct[0],
black:colorPct[1]
};
}
function betCellHTML(label){
return '<span class="bet-glow" aria-hidden="true"></span>'
+'<span class="bet-fill" aria-hidden="true"></span>'
+'<span class="bet-label">'+label+'</span>'
+'<span class="percent">0%</span>';
}
function setBetPct(el,pct){
if(!el)return;
let v=parseFloat(pct);
if(isNaN(v))v=0;
v=Math.min(100,Math.max(0,v));
el.style.setProperty('--pct',v+'%');
const p=el.querySelector('.percent');
if(p)p.textContent=v.toFixed(1)+'%';
el.title='Flow pressure '+v.toFixed(1)+'% · sila flow v session (nie šanca výhry)';
el.setAttribute('data-flow-pressure',v.toFixed(1));
}
function setAreaPct(id,nums){
const el=document.getElementById(id);
if(!el)return;
const scores=computeAINumberScores();
if(!scores){setBetPct(el,0);return;}
const sum=nums.reduce((s,n)=>s+(scores[n]||0),0);
let total=0;for(let n=0;n<=36;n++)total+=scores[n]||0;
setBetPct(el,total>0?(sum/total)*100:0);
}
function setBetPctById(id,pct){
const el=document.getElementById(id);
if(el)setBetPct(el,pct);
}
function makeNumBtn(n,row,col){
const btn=document.createElement('button');
btn.type='button';
btn.className='bet num '+(n===0?'greenbg zero':reds.includes(n)?'red':'black');
btn.id='num-'+n;
btn.style.gridRow=String(row);
btn.style.gridColumn=String(col);
btn.innerHTML='<span class="bet-glow" aria-hidden="true"></span>'
+'<span class="bet-fill" aria-hidden="true"></span>'
+'<span class="num-val">'+n+'</span><span class="percent">0%</span>';
btn.onclick=()=>spin(n);
return btn;
}
function makeOutsideCell(id,label,row,colSpan,extraCls){
const el=document.createElement('div');
el.className='bet outside '+(extraCls||'');
el.id=id;
el.style.gridRow=String(row);
el.style.gridColumn=colSpan;
el.innerHTML=betCellHTML(label);
return el;
}
function createBoard(){

const board=document.getElementById('board');
if(!board)return;
board.innerHTML='';
board.className='board roulette-board';
const zeroCol=document.createElement('div');
zeroCol.className='board-zero-col';
const padTop=document.createElement('div');
padTop.className='board-zero-pad';
padTop.setAttribute('aria-hidden','true');
const zero=makeNumBtn(0,2,1);
zero.className='bet num greenbg zero';
zero.style.gridRow='';
zero.style.gridColumn='';
const padBot=document.createElement('div');
padBot.className='board-zero-pad';
padBot.setAttribute('aria-hidden','true');
zeroCol.appendChild(padTop);
zeroCol.appendChild(zero);
zeroCol.appendChild(padBot);
board.appendChild(zeroCol);
BOARD_LAYOUT.forEach((row,ri)=>{
row.forEach((n,ci)=>{board.appendChild(makeNumBtn(n,ri+1,ci+2));});
});
for(let i=0;i<3;i++){
const col=document.createElement('div');
col.className='bet col-bet';
col.id='bet-col-'+(i+1);
col.style.gridRow=String(i+1);
col.style.gridColumn='14';
col.innerHTML=betCellHTML('2:1');
board.appendChild(col);
}
board.appendChild(makeOutsideCell('bet-dozen1','1. 12',4,'2 / 6','dozen'));
board.appendChild(makeOutsideCell('bet-dozen2','2. 12',4,'6 / 10','dozen'));
board.appendChild(makeOutsideCell('bet-dozen3','3. 12',4,'10 / 14','dozen'));
board.appendChild(makeOutsideCell('bet-low','1–18',5,'2 / 4','low'));
board.appendChild(makeOutsideCell('bet-even','Párne',5,'4 / 6','even'));
board.appendChild(makeOutsideCell('bet-red','◆',5,'6 / 7','red-diamond'));
board.appendChild(makeOutsideCell('bet-black','◆',5,'7 / 8','black-diamond'));
board.appendChild(makeOutsideCell('bet-odd','Nepárne',5,'8 / 10','odd'));
board.appendChild(makeOutsideCell('bet-high','19–36',5,'10 / 14','high'));
}


const SESSION_DB='quantumRouletteProV4';
const SESSION_STORE='session';
const SESSION_KEY='current';
const SESSION_LS_KEY='qrp7sessionV4';
let sessionSaveTimer=null;
let sessionLoaded=false;
function buildSessionPayload(){
return{
v:3,
spins:spins.slice(),
spinTimes:spinTimes.slice(),
ballTimingHistory:ballTimingHistory.slice(),
ballTimingRecords:ballTimingRecords.slice(),
totalPredictions,
successfulPredictions,
adaptiveWeights:{spin:adaptiveWeights.spin,timing:adaptiveWeights.timing,visual:adaptiveWeights.visual,failStreak:adaptiveWeights.failStreak},
adaptiveLearning:JSON.parse(JSON.stringify(adaptiveLearning)),
predictionEvolution:JSON.parse(JSON.stringify(predictionEvolution)),
predictionHistory:predictionHistory.slice(-30),
sessionIntel:JSON.parse(JSON.stringify(sessionIntel)),
aiStateMachine:JSON.parse(JSON.stringify(aiStateMachine)),
spinMemoryEngine:JSON.parse(JSON.stringify(spinMemoryEngine)),
persistenceEngine:JSON.parse(JSON.stringify(persistenceEngine)),
predictionArchive:predictionArchive.slice(-40),
futureFlowEngine:JSON.parse(JSON.stringify(futureFlowEngine)),
performanceEngine:JSON.parse(JSON.stringify(performanceEngine)),
savedAt:Date.now()
};
}
function applySessionPayload(data){
if(!data||!Array.isArray(data.spins))return false;
spins=data.spins.slice(-MAX_SPINS);
spinTimes=(data.spinTimes||[]).slice(-MAX_SPINS);
while(spinTimes.length<spins.length)spinTimes.push(Date.now());
while(spinTimes.length>spins.length)spinTimes.pop();
ballTimingRecords=Array.isArray(data.ballTimingRecords)?data.ballTimingRecords.slice(-120):[];
ballTimingHistory=Array.isArray(data.ballTimingHistory)?data.ballTimingHistory.slice(-100):[];
if(!ballTimingRecords.length&&ballTimingHistory.length)ballTimingHistory.forEach(sec=>ballTimingRecords.push({sec,num:-1,ts:0,dozen:-1,column:-1}));
else syncBallTimingHistoryFromRecords();
totalPredictions=data.totalPredictions|0;
successfulPredictions=data.successfulPredictions|0;
if(data.adaptiveWeights){
adaptiveWeights.spin=data.adaptiveWeights.spin!=null?data.adaptiveWeights.spin:1;
adaptiveWeights.timing=data.adaptiveWeights.timing!=null?data.adaptiveWeights.timing:1;
adaptiveWeights.visual=data.adaptiveWeights.visual!=null?data.adaptiveWeights.visual:1;
adaptiveWeights.failStreak=data.adaptiveWeights.failStreak|0;
}
if(data.adaptiveLearning)adaptiveLearning=Object.assign(adaptiveLearning,data.adaptiveLearning);
if(data.predictionEvolution)predictionEvolution=Object.assign(predictionEvolution,data.predictionEvolution);
if(Array.isArray(data.predictionHistory))predictionHistory=data.predictionHistory.slice(-30);
if(data.sessionIntel)sessionIntel=Object.assign(sessionIntel,data.sessionIntel);
if(data.aiStateMachine)aiStateMachine=Object.assign(aiStateMachine,data.aiStateMachine);
if(data.spinMemoryEngine)spinMemoryEngine=Object.assign(spinMemoryEngine,data.spinMemoryEngine);
if(data.persistenceEngine)persistenceEngine=Object.assign(persistenceEngine,data.persistenceEngine);
if(Array.isArray(data.predictionArchive))predictionArchive=data.predictionArchive.slice(-40);
if(data.futureFlowEngine)futureFlowEngine=Object.assign(futureFlowEngine,data.futureFlowEngine);
if(data.performanceEngine)performanceEngine=Object.assign(performanceEngine,data.performanceEngine);
hcRebuildSpinRecordsFromHistory();
sfaReplayFromSpinHistory();
invalidatePredCache();
updateMemoryBank();
return true;
}
function updateSessionStatus(){
const el=document.getElementById('sessionStatus');
if(!el)return;
if(!spins.length){el.textContent='Relácia: prázdna (auto-ukladanie)';el.className='session-status';return;}
const t=sessionLoaded?'obnovená · ':'';
el.textContent=t+spins.length+' spinov uložených';
el.className='session-status saved';
}
function showSessionToast(msg){
const el=document.getElementById('sessionToast');
if(!el||!msg)return;
el.textContent=msg;
el.classList.add('visible');
if(el._toastTimer)clearTimeout(el._toastTimer);
el._toastTimer=setTimeout(function(){el.classList.remove('visible');},3500);
}
function saveSessionLocal(payload){
try{localStorage.setItem(SESSION_LS_KEY,JSON.stringify(payload||buildSessionPayload()));}catch(e){}
}
function saveSessionIDB(payload){
if(!window.indexedDB)return;
try{
const req=indexedDB.open(SESSION_DB,1);
req.onupgradeneeded=function(e){e.target.result.createObjectStore(SESSION_STORE);};
req.onsuccess=function(e){
const db=e.target.result;
const tx=db.transaction(SESSION_STORE,'readwrite');
tx.objectStore(SESSION_STORE).put(payload,'current');
db.close();
};
}catch(e){}
}
function persistSession(){
const payload=buildSessionPayload();
saveSessionLocal(payload);
if(typeof setTimeout!=='undefined'){
if(sessionSaveTimer)clearTimeout(sessionSaveTimer);
sessionSaveTimer=setTimeout(function(){saveSessionIDB(payload);updateSessionStatus();},250);
}else if(typeof indexedDB!=='undefined'){
saveSessionIDB(payload);
}
updateSessionStatus();
}
function loadSessionFromLocal(){
try{
const raw=localStorage.getItem(SESSION_LS_KEY);
if(!raw)return false;
return applySessionPayload(JSON.parse(raw));
}catch(e){return false;}
}
function loadSessionIDB(){
return new Promise(function(resolve){
let settled=false;
function settle(v){
if(settled)return;
settled=true;
resolve(v);
}
setTimeout(function(){
if(settled)return;
sessionLoaded=loadSessionFromLocal();
settle(sessionLoaded);
},900);
if(!window.indexedDB){sessionLoaded=loadSessionFromLocal();settle(sessionLoaded);return;}
const req=indexedDB.open(SESSION_DB,1);
req.onupgradeneeded=function(e){e.target.result.createObjectStore(SESSION_STORE);};
req.onblocked=function(){sessionLoaded=loadSessionFromLocal();settle(sessionLoaded);};
req.onsuccess=function(e){
const db=e.target.result;
try{
const tx=db.transaction(SESSION_STORE,'readonly');
const get=tx.objectStore(SESSION_STORE).get(SESSION_KEY);
get.onsuccess=function(){
if(get.result&&applySessionPayload(get.result)){sessionLoaded=true;settle(true);return;}
sessionLoaded=loadSessionFromLocal();
settle(sessionLoaded);
};
get.onerror=function(){sessionLoaded=loadSessionFromLocal();settle(sessionLoaded);};
tx.onerror=function(){sessionLoaded=loadSessionFromLocal();settle(sessionLoaded);};
}catch(err){
sessionLoaded=loadSessionFromLocal();
settle(sessionLoaded);
}
};
req.onerror=function(){sessionLoaded=loadSessionFromLocal();settle(sessionLoaded);};
});
}
function clearSessionData(){
rspResetSessionPick();
resetSessionFatigueEngine();
bahResetSession();
invalidateHotColdCache();
spins=[];
spinTimes=[];
spinRecords=[];
ballTimingHistory=[];
totalPredictions=0;
successfulPredictions=0;
adaptiveWeights.failStreak=0;
predictionHistory=[];
resetAdaptiveLearningState();
resetCoreEngines();
lastPick=null;
lastPrediction=[];
try{localStorage.removeItem(SESSION_LS_KEY);}catch(e){}
if(window.indexedDB){
const req=indexedDB.open(SESSION_DB,1);
req.onsuccess=function(e){
const db=e.target.result;
const tx=db.transaction(SESSION_STORE,'readwrite');
tx.objectStore(SESSION_STORE).delete(SESSION_KEY);
db.close();
};
}
sessionLoaded=false;
rouletteAnalystPrevSnapshot=null;
rouletteAnalystSessionBaseline=null;
observerResetSession();
predFlowEngineCache=null;predFlowEngineKey='';predFlowPrevSnapshot=null;predLastPick=null;predStableState={mainCol:null,mainDoz:null,mainMode:null,col:null,doz:null,tier:'MEDIUM',weakStreak:0,confirmStreak:0,candidateCol:null,candidateStreak:0,holdSpins:0,prevRezim:null};
qwFlowState={prevCol:null,prevSectorKey:null,prevPhase:null,hold:0};
qwStopCanvasAnim();
lastQuantumWheelBrain=null;lastQuantumWheelKey='';
predLastPick=null;
invalidatePredCache();
updateStats();
updateMemoryBank();
renderHotCold();
renderAlerts();
}

/* ======================================
SPIN
====================================== */

function spin(number){onNewSpin(number);}

function undoLastSpin(){onUndoSpin();}

/* ======================================
SMART RENDER
====================================== */

let renderQueued=false;
let wheelRenderTimer=null;
let wheelRenderDirty=false;

function scheduleWheelRender(){
wheelRenderDirty=true;
if(wheelRenderTimer)return;
if(typeof setTimeout==='undefined'){renderWheelRadar();renderCanvasWheel();wheelRenderDirty=false;return;}
wheelRenderTimer=setTimeout(function(){
wheelRenderTimer=null;
if(!wheelRenderDirty)return;
wheelRenderDirty=false;
renderWheelRadar();
renderCanvasWheel();
},120);
}
function flushWheelRender(){
if(wheelRenderTimer){clearTimeout(wheelRenderTimer);wheelRenderTimer=null;}
wheelRenderDirty=false;
renderWheelRadar();
renderCanvasWheel();
}

function smartRender(){emitEvent(EVENT.RENDER,{light:true,heavy:true});}

/* ======================================
CACHE
====================================== */

function resetCache(){

cache.clusters=null;
cache.entropy=null;
cache.chain=null;

}

/* ======================================
STATS
====================================== */

function updateStats(){

resetCache();

statsCache={};

for(let i=0;i<=36;i++){
statsCache[i]=0;
}

spins.forEach((n,index)=>{

const weight=
Math.pow(
(index+1)/spins.length,
2.15
);

statsCache[n]+=weight;

});

}

/* ======================================
ENTROPY
====================================== */

function entropy(){

if(cache.entropy){
return cache.entropy;
}

if(spins.length<2)return 0;

let transitions=0;

for(let i=1;i<spins.length;i++){

const a=reds.includes(spins[i]);
const b=reds.includes(spins[i-1]);

if(a!==b){
transitions++;
}

}

cache.entropy=
(
(transitions/spins.length)
*10
).toFixed(2);

return cache.entropy;

}

/* ======================================
CHAIN
====================================== */

function neighborChain(){

if(cache.chain){
return cache.chain;
}

const recent=spins.slice(-12);

let chain=0;

for(let i=1;i<recent.length;i++){

const a=wheel.indexOf(recent[i]);
const b=wheel.indexOf(recent[i-1]);

if(Math.abs(a-b)<=3){
chain++;
}

}

cache.chain=chain;

return chain;

}

/* ======================================
CLUSTERS
====================================== */

function getClusters(){

if(cache.clusters){
return cache.clusters;
}

const clusters=[];

for(let i=0;i<wheel.length;i++){

let score=0;
let nums=[];

for(let j=-2;j<=2;j++){

const idx=
(i+j+wheel.length)%wheel.length;

const num=wheel[idx];

score+=statsCache[num]||0;

nums.push(num);

}

clusters.push({
score,
nums
});

}

clusters.sort((a,b)=>b.score-a.score);

cache.clusters=
clusters.slice(0,3);

return cache.clusters;

}
let lastPatternEngine=null;
let lastPatternKey='';
function invalidatePatternCache(){
lastPatternEngine=null;
lastPatternKey='';
}
function computeRepeatChains(){
const chains=[];
if(spins.length<2)return chains;
let run=1;
for(let i=1;i<spins.length;i++){
if(spins[i]===spins[i-1])run++;
else{
if(run>=2)chains.push({num:spins[i-1],len:run});
run=1;
}
}
if(run>=2)chains.push({num:spins[spins.length-1],len:run});
return chains.slice(-4).reverse();
}
function computeEchoPatterns(){
const echoes=[];
const lastIdx={};
for(let i=0;i<spins.length;i++){
const n=spins[i];
if(lastIdx[n]!=null){
const gap=i-lastIdx[n]-1;
if(gap>=2)echoes.push({num:n,gap,strength:clamp(100-gap*8),at:i});
}
lastIdx[n]=i;
}
return echoes.sort((a,b)=>b.strength-a.strength).slice(0,5);
}
function computeWheelPath(){
const recent=spins.slice(-8);
const steps=[];
for(let i=1;i<recent.length;i++)steps.push(wheelStep(recent[i-1],recent[i]));
const mig=getWheelMigrationDirection();
const pathLabel=steps.length?steps.map(s=>(s>0?'+':'')+s).join(' → '):'—';
return{steps,migration:mig,pathLabel,lastStep:steps.length?steps[steps.length-1]:0};
}
function computeSpinSequence(){
const recent=spins.slice(-6);
let trend='—';
if(recent.length>=3){
let cw=0,ccw=0;
for(let i=1;i<recent.length;i++){
const s=wheelStep(recent[i-1],recent[i]);
if(s>0)cw++;else if(s<0)ccw++;
}
if(cw>=ccw+1)trend='CW drift';
else if(ccw>=cw+1)trend='CCW drift';
else trend='MIX';
}
return{recent,trend,signature:recent.join(' · ')};
}
function computePatternEngine(){
const key=spins.length+'|'+(spins[spins.length-1]??'');
if(lastPatternEngine&&lastPatternKey===key)return lastPatternEngine;
const empty={
modelLabel:'Engine patternov · AI predikcia · AI komentár',
sources:'sekvencie spinov · susedné reťazce · opakovania · dráhy na kolese',
activeClusters:[],
repeatChains:[],
migrationPaths:{dir:'—',pathLabel:'—'},
echoPatterns:[],
spinSequence:{recent:[],trend:'—',signature:'—'},
neighborChain:{len:0,signal:0},
repeats:{rate:0,numRun:0},
wheelPath:{pathLabel:'—'},
prediction:null,
comment:null,
patternScore:0
};
if(spins.length<2){lastPatternEngine=empty;lastPatternKey=key;return empty;}
if(spins.length>=2)computeSpinCore();
const clusters=getClusters().map((c,i)=>({
rank:i+1,
nums:c.nums,
score:c.score,
active:lastSpinNum()!=null&&c.nums.includes(lastSpinNum()),
center:c.nums[2]
}));
const repeatChains=computeRepeatChains();
const echoPatterns=computeEchoPatterns();
const wheelPath=computeWheelPath();
const spinSequence=computeSpinSequence();
const rep=repeatRate();
let numRun=1;
for(let i=spins.length-2;i>=0;i--){if(spins[i]===spins[spins.length-1])numRun++;else break;}
const prediction=computeAIPrediction();
const comment=computeSpinAIComment();
const chainLen=neighborChain();
const patternScore=clamp(
(clusters[0]?.score||0)*0.22+
chainLen*7+
rep*0.35+
echoPatterns.length*8+
(clusters.filter(c=>c.active).length)*12+
(prediction?prediction.confidence*0.15:0)
);
const predAlign=prediction&&lastSpinNum()!=null?clusters[0]?.nums.includes(prediction.tip):false;
const result={
modelLabel:'Engine patternov · AI predikcia · AI komentár',
sources:'sekvencie spinov · susedné reťazce · opakovania · dráhy na kolese',
activeClusters:clusters,
repeatChains,
migrationPaths:{dir:wheelPath.migration.dir,label:wheelPath.migration.label,pathLabel:wheelPath.pathLabel,cw:wheelPath.migration.cw,ccw:wheelPath.migration.ccw},
echoPatterns,
spinSequence,
neighborChain:{len:chainLen,signal:lastSpinBreakdown.chain,max:11},
repeats:{rate:rep,numRun,pairCount:repeatChains.reduce((s,c)=>s+c.len,0)},
wheelPath,
prediction:prediction?{tip:prediction.tip,sector:prediction.sector,confidence:prediction.confidence,align:predAlign}:null,
comment:{blend:comment.blendScore,data:comment.dataScore,reasoning:comment.reasoningScore,insight:(comment.reasonLines.find(l=>l&&!/Čakám/.test(l))||comment.dataLines[0]||'').slice(0,72)},
patternScore:Math.round(patternScore)
};
lastPatternEngine=result;
lastPatternKey=key;
return result;
}


function getWheelSectorStats(){
const sectors=[];
for(let i=0;i<wheel.length;i++){
const nums=[];
for(let j=-2;j<=2;j++){
nums.push(wheel[(i+j+wheel.length)%wheel.length]);
}
let hits=0;
spins.forEach(s=>{if(nums.includes(s))hits++;});
const pct=spins.length?(hits/spins.length)*100:0;
sectors.push({index:i,nums,center:nums[2],hits,pct});
}
return sectors;
}
function scoreWheelSectorSpinCore(sec,hcCached){
if(!spins.length)return{spinScore:0,hist:0,neigh:0,cluster:0,mig:0,hc:0,streak:0};
const recent=spins.slice(-12);
const last=lastSpinNum();
const clusters=getClusters();
const ent=parseFloat(entropy())||0;
const chaosMod=ent>5.5?0.86:ent<4.2?1.08:1;
let hist=0;
recent.forEach((n,ri)=>{if(sec.nums.includes(n))hist+=(ri+1)*2.2;});
if(last!=null&&sec.nums.includes(last))hist+=10;
const step=last!=null?Math.abs(wheelStep(last,sec.center)):99;
if(step<=3)hist+=(4-step)*3.5;
const neigh=clamp(neighborChain()*(step<=4?1.35:0.45)+lastSpinBreakdown.chain*0.12);
let cluster=0;
clusters.slice(0,3).forEach((c,ci)=>{
const ov=c.nums.filter(n=>sec.nums.includes(n)).length;
if(ov)cluster+=(c.score||0)*(ci===0?0.45:0.2)*(ov/5);
});
let mig=lastSpinBreakdown.drift*0.2;
const trail=spins.slice(-7);
let drift=0;
for(let i=1;i<trail.length;i++)drift+=wheelStep(trail[i-1],trail[i]);
if(last!=null){
const fwd=wheelStep(last,sec.center);
const back=wheelStep(sec.center,last);
if(drift>0&&fwd>0&&fwd<=6)mig+=fwd*2.2;
else if(drift<0&&back>0&&back<=6)mig+=back*2.2;
}
const hcEng=hcCached||computeHotColdEngine();
const sh=hcEng.sectorHeat.find(s=>s.index===sec.index);
let hcScore=sh?sh.heatPct*0.22:0;
sec.nums.forEach(n=>{
const item=hcEng.all.find(x=>x.n===n);
if(!item)return;
hcScore+=item.wShare*0.35;
if(item.recoveryScore>=14)hcScore+=2;
if(item.overheatScore>=12)hcScore+=1.5;
});
hcScore/=Math.max(1,sec.nums.length);
let streak=0;
for(let i=recent.length-1;i>=0;i--){
if(sec.nums.includes(recent[i]))streak++;else break;
}
const W=WHEEL_SPIN_WEIGHT;
let spinScore=
hist*W.history+
neigh*W.neighbors+
cluster*W.cluster+
mig*W.migration+
hcScore*W.hotCold+
streak*4*W.streak+
sec.pct*0.38;
spinScore*=chaosMod;
return{spinScore,hist,neigh,cluster:cluster,mig,hc:hcScore,streak,chaosMod};
}
function getWheelMigrationDirection(){
if(spins.length<4)return{dir:'—',label:'Málo dát',cw:0,ccw:0};
const recent=spins.slice(-10);
let cw=0,ccw=0;
for(let i=1;i<recent.length;i++){
const s=wheelStep(recent[i-1],recent[i]);
if(s>0)cw++;else if(s<0)ccw++;
}
if(cw>=ccw+2)return{dir:'CW',label:'Po smere hodinových (↑ tlak vpravo)',cw,ccw};
if(ccw>=cw+2)return{dir:'CCW',label:'Proti smeru (↑ tlak vľavo)',cw,ccw};
return{dir:'MIX',label:'Zmiešaný flow · '+cw+' CW / '+ccw+' CCW',cw,ccw};
}
let lastWheelFlowEngine=null;
let lastWheelFlowKey='';
function invalidateWheelFlowCache(){
lastWheelFlowEngine=null;
lastWheelFlowKey='';
}
function computeWheelMovement(){
const recent=spins.slice(-10);
let cw=0,ccw=0;
const steps=[];
for(let i=1;i<recent.length;i++){
const s=wheelStep(recent[i-1],recent[i]);
steps.push(s);
if(s>0)cw++;else if(s<0)ccw++;
}
const total=Math.max(1,cw+ccw);
return{cw,ccw,steps,lastStep:steps.length?steps[steps.length-1]:0,cwPct:clamp(cw/total*100),ccwPct:clamp(ccw/total*100)};
}
function computeNeighborTransitions(){
const last=lastSpinNum();
const prev=spins.length>1?spins[spins.length-2]:null;
const dist=last!=null&&prev!=null?Math.abs(wheelStep(prev,last)):0;
return{dist,chain:neighborChain(),signal:lastSpinBreakdown.chain,isNeighbor:dist<=3};
}
function computeWheelFlowEngine(){
const key=spins.length+'|'+(spins[spins.length-1]??'');
if(lastWheelFlowEngine&&lastWheelFlowKey===key)return lastWheelFlowEngine;
const empty={
modelLabel:'Tok kolesa · Kvantové koleso · AI predikcia · AI komentár',
sources:'pohyb kolesa · migrácia sektorov · susedné prechody · engine smeru',
clockwiseFlow:0,counterFlow:0,momentum:0,
migrationDirection:{dir:'—',label:'—'},
movement:{cw:0,ccw:0,steps:[]},
neighbors:{dist:0,chain:0},
directionScore:50,
quantum:null,
prediction:null,
comment:null
};
if(spins.length<2){lastWheelFlowEngine=empty;lastWheelFlowKey=key;return empty;}
computeSpinCore();
const movement=computeWheelMovement();
const migration=getWheelMigrationDirection();
const neighbors=computeNeighborTransitions();
const directionScore=wheelDirectionScore();
const quantum=computeWheelSectorIntel();
const momentum=clamp(
lastSpinBreakdown.drift*0.38+
neighbors.chain*6.5+
Math.abs(movement.lastStep)*5+
(quantum.wheelPressure||0)*0.18+
(quantum.neighborIntensity||0)*0.12
);
const prediction=computeAIPrediction();
const comment=computeSpinAIComment();
const predSectorAlign=prediction&&quantum.dominant?quantum.dominant.nums.includes(prediction.tip):false;
const result={
modelLabel:'Tok kolesa · Kvantové koleso · AI predikcia · AI komentár',
sources:'pohyb kolesa · migrácia sektorov · susedné prechody · engine smeru',
clockwiseFlow:Math.round(movement.cwPct),
counterFlow:Math.round(movement.ccwPct),
momentum:Math.round(momentum),
migrationDirection:migration,
movement,
neighbors,
directionScore:Math.round(directionScore),
quantum:{
dominant:quantum.dominant,
potential:quantum.potential,
migration:quantum.migration,
wheelPressure:quantum.wheelPressure,
neighborIntensity:quantum.neighborIntensity,
spinCore:quantum.spinCore
},
prediction:prediction?{tip:prediction.tip,sector:prediction.sector,confidence:prediction.confidence,sectorAlign:predSectorAlign}:null,
comment:{blend:comment.blendScore,data:comment.dataScore,reasoning:comment.reasoningScore,insight:(comment.reasonLines.find(l=>l&&!/Čakám/.test(l))||comment.dataLines[0]||'').slice(0,72)}
};
lastWheelFlowEngine=result;
lastWheelFlowKey=key;
return result;
}
function getWheelTimingFactor(){
const samples=getBallTimingSamples();
const core=samples.length?computeBallTimingCore(samples):computeTimingCore();
let factor=1;
let label='NEUTRÁL';
if(core>=72){factor=1+((core-72)/300);label='POTVRDENIE';}
else if(core<=48){factor=0.84+(core/280);label='OSLABENIE';}
return{factor:clamp(factor,0.84,1.1),label,core};
}
function getWheelVisualSupport(){
const core=computeVisualCore();
const pressure=scoreVisualPressure();
const heat=scoreVisualHeatSpread();
let factor=1+pressure/550+heat/800;
return{factor:clamp(factor,1,1.12),core,pressure,heat};
}
function applyWheelSectorAIModel(sectors,timing,visual){
if(!sectors||!sectors.length)return sectors;
const timingCore=timing.core;
const visualCore=visual.core;
const last=lastSpinNum();
const hcEng=hasMinSpins()?computeHotColdEngine():null;
let spinMax=0.001;
sectors.forEach(sec=>{if((sec.spinScore||0)>spinMax)spinMax=sec.spinScore;});
sectors.forEach(sec=>{
const spinPart=(sec.spinScore/spinMax)*100;
const step=last!=null?Math.abs(wheelStep(last,sec.center)):99;
const timePart=clamp(100-step*11,6,100)*(timingCore/100);
const sh=hcEng?hcEng.sectorHeat.find(s=>s.index===sec.index):null;
const visPart=clamp((sh?sh.heatPct:18)*(visualCore/100),4,100);
let ai=spinPart*MODEL.SPINS+timePart*MODEL.TIMING+visPart*MODEL.VISUAL;
ai*=timing.factor*visual.factor*(sec.signals?sec.signals.chaosMod:1);
sec.aiScore=ai;
sec.wheelConfidence=clamp(Math.round(ai));
sec.displayPct=clamp(ai,0,100);
});
return sectors;
}
function computeWheelSectorIntel(){
const key=spins.length+'|'+ballTimingHistory.length+'|'+(timingRunning?1:0);
if(lastWheelIntel&&lastWheelIntelKey===key)return lastWheelIntel;
const sectors=getWheelSectorStats();
const empty={
modelLabel:'70% spiny · 20% timing · 10% vizuál',
spinCore:0,timingCore:50,visualCore:50,
dominant:null,weak:null,potential:null,sectors,
migration:{dir:'—',label:'—',cw:0,ccw:0},
wheelPressure:0,neighborIntensity:0,chaosImpact:0,
timingLabel:'—',timingFactor:1,visualFactor:1,
clusters:[],ready:false
};
if(!hasMinSpins()){
lastWheelIntel=empty;
lastWheelIntelKey=key;
return empty;
}
computeSpinCore();
const hcWheelCache=hasMinSpins()?computeHotColdEngine():null;
sectors.forEach(sec=>{
const sc=scoreWheelSectorSpinCore(sec,hcWheelCache);
sec.spinScore=sc.spinScore;
sec.signals=sc;
});
const timing=getWheelTimingFactor();
const visual=getWheelVisualSupport();
applyWheelSectorAIModel(sectors,timing,visual);
const byAI=[...sectors].sort((a,b)=>(b.aiScore||0)-(a.aiScore||0));
let dominant=byAI[0];
let weak=[...sectors].sort((a,b)=>(a.aiScore||0)-(b.aiScore||0))[0];
const byPotential=[...sectors].sort((a,b)=>{
const gapA=a.nums.reduce((s,n)=>s+spinsSince(n),0)/a.nums.length;
const gapB=b.nums.reduce((s,n)=>s+spinsSince(n),0)/b.nums.length;
return((b.aiScore||0)+gapB*0.35)-((a.aiScore||0)+gapA*0.35);
});
let potential=byPotential[0];
if(weak.index===dominant.index)weak=byAI[byAI.length-1]||weak;
if(potential.index===dominant.index)potential=byPotential[1]||potential;
if(potential.index===weak.index)potential=byPotential[2]||potential;
const migration=getWheelMigrationDirection();
const ent=parseFloat(entropy())||0;
const chaosImpact=clamp(ent*12);
const neighborIntensity=clamp(neighborChain()*9+lastSpinBreakdown.chain*0.15);
const spinCore=Math.round(computeSpinCore());
const timingCore=Math.round(timing.core);
const visualCore=Math.round(visual.core);
const wheelPressure=clamp(dominant?dominant.wheelConfidence:0);
const clusters=getClusters().slice(0,3);
const result={
modelLabel:'70% spiny · 20% timing · 10% vizuál',
spinCore,timingCore,visualCore,
dominant,weak,potential,sectors,
migration,
wheelPressure,
neighborIntensity,
chaosImpact,
timingLabel:timing.label,
timingFactor:timing.factor,
visualFactor:visual.factor,
visualPressure:Math.round(visual.pressure),
visualHeat:Math.round(visual.heat),
clusters,
ready:true
};
lastWheelIntel=result;
lastWheelIntelKey=key;
return result;
}
function getSectorAnalysis(){
const w=computeWheelSectorIntel();
return{dominant:w.dominant,weak:w.weak,potential:w.potential,sectors:w.sectors};
}

/* KVANTOVÉ KOLESO — LIVE WHEEL FLOW SCANNER */
function skQw(t){
if(!t||t==='—')return'—';
const m={
'FLOW ALIGNED':'FLOW ZLADENÝ','FLOW CONFLICT':'FLOW KONFLIKT','MIXED':'ZMIEŠANÝ',
'FLOW SUPPORT':'PODPORA FLOW','KOREKCIA TLAKU':'KOREKCIA TLAKU',
'MOMENTUM SUPPORT':'PODPORA MOMENTUM','DRŽÍ MOMENTUM':'DRŽÍ MOMENTUM','SLABÝ MOMENTUM':'SLABNÝ MOMENTUM',
'PARITY DOMINANCE':'DOMINANCIA PARITY','PARITY PRESSURE':'TLAK PARITY',
'HIGH PRESSURE':'VYSOKÝ TLAK','LOW PRESSURE':'NÍZKY TLAK','NEUTRÁLNY RANGE':'NEUTRÁLNY RANGE',
'STRONG RETURN FLOW':'SILNÝ NÁVRATOVÝ FLOW','AGGRESSIVE RETURN':'AGRESÍVNY NÁVRAT',
'RETURN PRESSURE':'TLAK NÁVRATU','REPEAT PRESSURE':'TLAK OPAKOVANIA',
'DOMINANCE ACTIVE':'DOMINANCIA AKTÍVNA','SYNC SUPPORT':'PODPORA SYNC',
'DOZEN PRESSURE':'TLAK TUCTOV','REPEAT SUPPORT':'PODPORA OPAKOVANIA',
'DOM SUPPORT':'PODPORA DOMINANCIE','PARITY':'PARITA','RANGE':'RANGE','RETURN':'NÁVRAT','DOMINANCE':'DOMINANCIA',
'VERY STABLE':'VEĽMI STABILNÝ','STABLE':'STABILNÝ','UNSTABLE':'NESTABILNÝ','CHAOTIC':'CHAOTICKÝ',
'HIGHLY CHAOTIC':'VEĽMI CHAOTICKÝ',
'HIGH QUALITY':'VYSOKÁ KVALITA','MEDIUM QUALITY':'STREDNÁ KVALITA','LOW QUALITY':'NÍZKA KVALITA',
'HIGH RISK':'VYSOKÉ RIZIKO','MEDIUM RISK':'STREDNÉ RIZIKO','LOW RISK':'NÍZKE RIZIKO',
'LOW NOISE':'NÍZKY ŠUM','MEDIUM NOISE':'STREDNÝ ŠUM','HIGH NOISE':'VYSOKÝ ŠUM',
'WEAK RETURN':'SLABÝ NÁVRAT','MEDIUM RETURN':'STREDNÝ NÁVRAT','STRONG RETURN':'SILNÝ NÁVRAT','AGGRESSIVE RETURN':'AGRESÍVNY NÁVRAT',
'RANDOM MIGRATION':'NÁHODNÁ MIGRÁCIA','CW FLOW':'TOK PO SMERE','CCW FLOW':'TOK PROTI SMERU','STABLE MIGRATION':'STABILNÁ MIGRÁCIA',
'GROWING':'RASTIE','WEAKENING':'SLABNE','COLLAPSING':'KOLAPS','STABLE':'DRŽÍ',
'WAIT MODE':'REŽIM ČAKANIA','FLOW BREAK':'ZLOM FLOW','COLLAPSE WARNING':'VAROVANIE KOLAPSU',
'HEALTHY':'ZDRAVÝ','FAST MIGRATION':'RÝCHLA MIGRÁCIA','SLOW FLOW':'POMALÝ FLOW',
'STABLE FLOW':'STABILNÝ FLOW','RAPID CHAOS':'RÝCHLY CHAOS',
'HIGH':'VYSOKÉ','MEDIUM':'STREDNÉ','LOW':'NÍZKE','ALIGN':'ZLADENIE'
};
return m[t]||t;
}
function skQwRisk(r){
return r==='HIGH'?'VYSOKÉ':r==='LOW'?'NÍZKE':r==='MEDIUM'?'STREDNÉ':skQw(r);
}
function skWheelUserText(s){
if(s==null||s==='')return s==null?s:'';
let t=String(s);
const pairs=[
[/\bSleduj wheel\b/gi,'Sleduj koleso'],
[/\bnehraj naslepo\b/gi,'nehraj naslepo'],
[/\bSMER WHEELU\b/g,'SMER KOLESA'],
[/\bfilter podľa flow\b/gi,'filter podľa toku'],
[/\bSlabý edge\b/gi,'Slabá výhoda'],
[/\bWheel\b/g,'Koleso'],
[/\bwheelu\b/gi,'kolesa'],
[/\bwheeli\b/gi,'kolesi'],
[/\bwheele\b/gi,'kolese'],
[/\bwheel\b/g,'koleso'],
[/\bbehavior\b/gi,'správanie'],
[/\bfollow-up\b/gi,'návrat'],
[/\btrust\b/gi,'dôvera'],
[/\bmomentum\b/gi,'tempo'],
[/\bbreakout\b/gi,'prerazenie']
];
pairs.forEach(([re,rep])=>{t=t.replace(re,rep);});
return t.replace(/\s{2,}/g,' ').trim();
}
let lastQuantumWheelBrain=null,lastQuantumWheelKey='';
let qwFlowState={prevCol:null,prevSectorKey:null,prevPhase:null,hold:0};
let qwWheelMemory=[];
let qwPrevScannerSnap=null;
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
function qwColorState(scanner,chaos,Q){
if(!scanner||!chaos)return{state:'caution',cls:'qw-state-caution',breathe:'',edge:null,conf:50};
const conf=scanner.trust?scanner.trust.score:(Q?Q.confidence:50);
if(scanner.waitMode)return{state:'danger',cls:'qw-state-danger',breathe:'qw-breathe-nervous',edge:'WAIT_MODE',conf};
if(chaos.noEdge)return{state:'danger',cls:'qw-state-danger',breathe:'qw-breathe-nervous',edge:'NO_EDGE',conf};
if(chaos.chaosLevel>=68||scanner.flowStability==='CHAOTIC')
return{state:'danger',cls:'qw-state-danger',breathe:'qw-breathe-nervous',edge:'FLOW_TOO_CHAOTIC',conf};
if(conf<42)return{state:'danger',cls:'qw-state-danger',breathe:'qw-breathe-nervous',edge:'LOW_CONFIDENCE',conf};
if(conf>=65&&scanner.flowQuality&&scanner.flowQuality.score>=65&&chaos.chaosLevel<52)
return{state:'green',cls:'qw-state-green',breathe:'qw-breathe-calm',edge:null,conf};
return{state:'caution',cls:'qw-state-caution',breathe:chaos.chaosLevel>=50?'qw-breathe-nervous':'',edge:null,conf};
}
function qwEdgeBannerText(edge,pri,chaos){
if(edge==='NO_EDGE')return'⚠ FLOW NEJASNÝ — wheel nemá čitateľný smer';
if(edge==='FLOW_TOO_CHAOTIC')return'🔴 REŽIM ČAKANIA — chaos '+chaos.chaosLevel+'%';
if(edge==='WAIT_MODE')return'🔴 REŽIM ČAKANIA';
if(edge==='LOW_CONFIDENCE')return'⚠ FLOW NEJASNÝ — nízka istota';
if(pri&&pri.wait)return'🔴 REŽIM ČAKANIA';
if(pri&&pri.code==='CHAOS')return'🔴 REŽIM ČAKANIA — chaos '+chaos.chaosLevel+'%';
if(pri&&pri.code==='COLLAPSE')return'⚠ DOMINANCIA SLABNE';
return'';
}
function qwEdgeHeroStatus(cs,chaos,scanner){
if(cs.edge==='WAIT_MODE'||(scanner&&scanner.waitMode))return{text:'🔴 REŽIM ČAKANIA',cls:'bad'};
if(cs.edge==='NO_EDGE'||(chaos&&chaos.noEdge))return{text:'⚠ FLOW NEJASNÝ',cls:'bad'};
if(cs.edge==='FLOW_TOO_CHAOTIC'||cs.edge==='LOW_CONFIDENCE'||cs.state==='danger')return{text:'⚠ FLOW NEJASNÝ',cls:'bad'};
if(cs.state==='caution')return{text:'🟠 OPATRNOSŤ',cls:'warn'};
if(cs.state==='green')return{text:'🟢 VÝHODA AKTÍVNA',cls:'ok'};
return{text:'🟠 OPATRNOSŤ',cls:'warn'};
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
function qwResolvePriority(scanner,chaos,flowLife,mig){
let wait=false,waitReason='';
if(chaos.noEdge){wait=true;waitReason='flow nie je čitateľný';}
else if(chaos.chaosLevel>=68||scanner.noise&&scanner.noise.level==='HIGH NOISE'){wait=true;waitReason='vysoký chaos';}
else if(scanner.flowQuality.score<45){wait=true;waitReason='slabá dominancia';}
else if(scanner.alignment.status==='FLOW CONFLICT'&&scanner.flowRisk.label==='HIGH RISK'){wait=true;waitReason='konflikt flowu';}
else if(scanner.flowStability==='CHAOTIC'||scanner.rngStability.label==='HIGHLY CHAOTIC'){wait=true;waitReason='nestabilný wheel';}
else if(mig&&mig.dir!=='CW'&&mig.dir!=='CCW'&&chaos.chaosLevel>=55){wait=true;waitReason='náhodná migrácia';}
else if(scanner.trust&&scanner.trust.score<42){wait=true;waitReason='nízka istota';}
let code='DOMINANCE',label='DOMINANCIA · '+Math.round(scanner.domStrength)+'%',cls='ok';
if(wait){code='WAIT';label='REŽIM ČAKANIA';cls='wait';}
else if(chaos.chaosLevel>=65){code='CHAOS';label='Chaos '+chaos.chaosLevel+'%';cls='chaos';}
else if(scanner.pressure.collapseRisk||flowLife.breakDetected){code='COLLAPSE';label=flowLife.breakDetected?'ZLOM FLOW':'VAROVANIE KOLAPSU';cls='collapse';}
else if(scanner.returnForce.level.indexOf('STRONG')>=0||scanner.returnForce.level.indexOf('AGGRESSIVE')>=0){code='RETURN';label=scanner.returnForce.level;cls='ok';}
else if(flowLife.momentum&&flowLife.momentum.label){code='MOMENTUM';label=scanner.momentumState||'STABLE';cls='ok';}
return{code,label,cls,wait,waitReason};
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


/* ======================================
SPINS PILLAR (70%) — composite core
====================================== */

function scoreCluster(){
const c=getClusters()[0];
const maxRef=weightedTotal()*5;
return normPct(c.score,maxRef);
}

function scoreChain(){
return normPct(neighborChain(),11);
}

function scoreHotCold(){
if(spins.length<3)return 50;
const e=computeHotColdEngine();
const spread=e.hot[0].w-(e.cold[0]?.w||0);
const rec=e.recovering.length*4;
const oh=e.overheated.length*3;
const sec=e.sectorHeat[0]?e.sectorHeat[0].heatPct:0;
return clamp(spread*12+rec+oh+sec*0.25+45);
}

function scoreEntropyStability(){
const e=parseFloat(entropy())||0;
return clamp(100-e*10);
}

function scoreGap(){
const center=getClusters()[0].nums[2];
return clamp(Math.min(100,spinsSince(center)*9));
}

function scoreDozen(){
if(spins.length<3)return 50;
const sums=DOZENS.map(d=>
d.reduce((s,n)=>s+(statsCache[n]||0),0)
);
const total=sums.reduce((a,b)=>a+b,0)||1;
const share=Math.max(...sums)/total;
return clamp((share-1/3)*220);
}

function scoreColorStreak(){
if(spins.length<2)return 50;
const lastColor=reds.includes(spins[spins.length-1]);
let streak=1;
for(let i=spins.length-2;i>=0;i--){
if(reds.includes(spins[i])===lastColor)streak++;
else break;
}
return clamp(streak*17);
}

function scoreWheelDrift(){
if(spins.length<3)return 50;
const recent=spins.slice(-7);
let drift=0;
for(let i=1;i<recent.length;i++){
drift+=wheelStep(recent[i-1],recent[i]);
}
const avg=Math.abs(drift/(recent.length-1));
return clamp(avg*14);
}

function computeSpinCore(){
const breakdown={
cluster:scoreCluster(),
chain:scoreChain(),
hotCold:scoreHotCold(),
entropy:scoreEntropyStability(),
gap:scoreGap(),
dozen:scoreDozen(),
streak:scoreColorStreak(),
drift:scoreWheelDrift()
};
const total=Math.round(
breakdown.cluster*SPIN_SIGNAL.cluster+
breakdown.chain*SPIN_SIGNAL.chain+
breakdown.hotCold*SPIN_SIGNAL.hotCold+
breakdown.entropy*SPIN_SIGNAL.entropy+
breakdown.gap*SPIN_SIGNAL.gap+
breakdown.dozen*SPIN_SIGNAL.dozen+
breakdown.streak*SPIN_SIGNAL.streak+
breakdown.drift*SPIN_SIGNAL.drift
);
lastSpinBreakdown={...breakdown,total:clamp(total)};
return lastSpinBreakdown.total;
}

function getSpinsPillarGrade(){
if(spins.length<5){
return{score:'—',of10:0,tag:'MALO DÁT'};
}
const core=computeSpinCore();
const of10=+(core/10).toFixed(1);
let tag='ROZVÍJAJÚCE';
if(core>=85)tag='10/10 ELITE';
else if(core>=75)tag='SILNÉ';
else if(core>=62)tag='DOBRÉ';
else if(core>=48)tag='STREDNÉ';
return{score:of10+'/10',of10,tag};
}

/* ======================================
TIMING PILLAR (20%) — zo záznamu spinov
====================================== */

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

function computeTimingCore(){
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
const core=computeTimingCore();
const of10=+(core/10).toFixed(1);
let tag='ROZVÍJAJÚCE';
if(core>=85)tag='10/10 ELITE';
else if(core>=75)tag='SILNÉ';
else if(core>=62)tag='DOBRÉ';
else if(core>=48)tag='STREDNÉ';
return{score:of10+'/10',tag};
}

/* ======================================
VISUAL PILLAR (10%) — z histórie spinov
====================================== */

function wheelHitStats(){
const stats={};
wheel.forEach(n=>{stats[n]=0;});
spins.forEach(s=>{stats[s]=(stats[s]||0)+1;});
return stats;
}

function scoreVisualWheel(){
const stats=wheelHitStats();
const max=Math.max(...Object.values(stats),0);
if(!spins.length)return 50;
return normPct(max,Math.max(2,spins.length*0.22));
}

function scoreVisualBoard(){
if(!spins.length)return 50;
const sorted=Object.entries(statsCache).sort((a,b)=>b[1]-a[1]);
const top12=sorted.slice(0,12).reduce((s,x)=>s+x[1],0);
const total=sorted.reduce((s,x)=>s+x[1],0)||1;
return clamp((top12/total)*115);
}

function scoreVisualPressure(){
const c=getClusters()[0];
return clamp(Math.min(100,c.score*3));
}

function scoreVisualHeatSpread(){
if(spins.length<3)return 50;
const sorted=Object.entries(statsCache).sort((a,b)=>b[1]-a[1]);
const top8=sorted.slice(0,8).reduce((s,x)=>s+x[1],0);
const total=sorted.reduce((s,x)=>s+x[1],0)||1;
return clamp((top8/total)*100);
}

function scoreVisualAlign(){
const last=lastSpinNum();
const center=getClusters()[0].nums[2];
if(last==null)return 50;
const dist=Math.abs(wheelStep(last,center));
return clamp(100-dist*14);
}

function computeVisualCore(){
if(spinsEngineDepth>0){
const breakdown={
wheel:scoreVisualWheel(),
board:scoreVisualBoard(),
pressure:scoreVisualPressure(),
heatSpread:scoreVisualHeatSpread(),
align:scoreVisualAlign()
};
const total=Math.round(
breakdown.wheel*VISUAL_SIGNAL.wheel+
breakdown.board*VISUAL_SIGNAL.board+
breakdown.pressure*VISUAL_SIGNAL.pressure+
breakdown.heatSpread*VISUAL_SIGNAL.heatSpread+
breakdown.align*VISUAL_SIGNAL.align
);
lastVisualBreakdown={...breakdown,total:clamp(total)};
return lastVisualBreakdown.total;
}
if(spins.length>=2){
const SE=runSpinsEnginePipeline();
if(SE.ready&&SE.visual)return SE.visual.core;
}
const breakdown={
wheel:scoreVisualWheel(),
board:scoreVisualBoard(),
pressure:scoreVisualPressure(),
heatSpread:scoreVisualHeatSpread(),
align:scoreVisualAlign()
};
const total=Math.round(
breakdown.wheel*VISUAL_SIGNAL.wheel+
breakdown.board*VISUAL_SIGNAL.board+
breakdown.pressure*VISUAL_SIGNAL.pressure+
breakdown.heatSpread*VISUAL_SIGNAL.heatSpread+
breakdown.align*VISUAL_SIGNAL.align
);
lastVisualBreakdown={...breakdown,total:clamp(total)};
return lastVisualBreakdown.total;
}

function getVisualPillarGrade(){
if(spins.length<5){
return{score:'—',tag:'MALO SPINOV'};
}
const core=computeVisualCore();
const of10=+(core/10).toFixed(1);
let tag='ROZVÍJAJÚCE';
if(core>=85)tag='10/10 ELITE';
else if(core>=75)tag='SILNÉ';
else if(core>=62)tag='DOBRÉ';
else if(core>=48)tag='STREDNÉ';
return{score:of10+'/10',tag};
}

/* ======================================
AI SCORE — 70 / 20 / 10
====================================== */

function calculateAI(){
const SE=spins.length?runSpinsEnginePipeline():null;
if(SE&&SE.ready)return SE.aiConfidence;
const spinCore=computeSpinCore();
const timingCore=computeTimingCore();
const visualCore=computeVisualCore();
lastCoreValues={spinCore,timingCore,visualCore};
return clamp(Math.round(spinCore*MODEL.SPINS+timingCore*MODEL.TIMING+visualCore*MODEL.VISUAL));
}

function modelContribution(core,weight){
return (core*weight).toFixed(1);
}

function computePredictionsPanel(){
const pr=computeAIPrediction();
if(!pr){
return{
modelLabel:'Predikcie · AI engine',
primarySignal:{text:'—',tip:null},
secondarySignal:{text:'—'},
confidence:0,
ready:false
};
}
const c2=getClusters()[1];
const secondaryNum=c2&&c2.nums.length?c2.nums[2]:null;
const secondarySignal={
text:(secondaryNum!=null?secondaryNum+' · ':'')+pr.timingLabel+' · TIMING '+pr.timingCore+'% · VISUAL '+pr.visualCore+'%',
timingCore:pr.timingCore,
visualCore:pr.visualCore,
trend:pr.trend,
shadowNum:secondaryNum
};
return{
modelLabel:'Predikcie · AI engine',
model:pr.modelLabel,
primarySignal:{
text:(pr.dominantTarget||'—')+' · sektor '+pr.sector,
tip:pr.dominantTarget||pr.sector,
sector:pr.sector,
spinCore:pr.spinCore,
trend:pr.trend
},
secondarySignal,
confidence:pr.confidence,
pillars:{spin:pr.spinCore,timing:pr.timingCore,visual:pr.visualCore},
timingLabel:pr.timingLabel,
sources:pr.sources,
ready:true
};
}

/* ======================================
PREDICTIONS
====================================== */

function updatePredictions(){
const cluster=getClusters()[0];
const pr=computeAIPrediction();
lastPrediction=cluster.nums.slice();
lastFlowFocus=getFlowFocusSector();lastPrediction=lastFlowFocus.nums.slice();lastPick=lastFlowFocus.center;
if(pr)advancePredictionGeneration(pr);
predictionHistory.push({
number:lastPick,
sector:cluster.nums.join('-'),
confidence:pr?pr.confidence:calculateAI(),
gen:predictionEvolution.generation
});
if(predictionHistory.length>30){
predictionHistory.shift();
}
}

/* ======================================
RENDER SYSTEM
====================================== */



/* ======================================
BOARD UPDATE
====================================== */

function updateBoard(){
const ai=computeBoardAIPercentages();
if(!ai){
for(let i=0;i<=36;i++){
const el=document.getElementById('num-'+i);
if(el)setBetPct(el,0);
}
['bet-dozen1','bet-dozen2','bet-dozen3','bet-col-1','bet-col-2','bet-col-3',
'bet-low','bet-even','bet-red','bet-black','bet-odd','bet-high'].forEach(id=>setBetPctById(id,0));
return;
}
let peak=0,minP=99;
for(let i=0;i<=36;i++){const v=ai.nums[i]||0;peak=Math.max(peak,v);minP=Math.min(minP,v);}
const hotThr=Math.max(4.8,peak*0.72);
const flatSpread=peak-minP<2.2;
for(let i=0;i<=36;i++){
const el=document.getElementById('num-'+i);
if(!el)continue;
const pct=ai.nums[i]||0;
setBetPct(el,pct);
el.classList.remove('hot-number','cluster-active','flow-dominant','flow-flat');
if(pct>=hotThr)el.classList.add('hot-number');
if(peak>0&&pct>=peak*0.92)el.classList.add('flow-dominant');
if(flatSpread)el.classList.add('flow-flat');
}
function setMacroBetPct(id,pct,isDominant,isFlat){
setBetPctById(id,pct);
const el=document.getElementById(id);
if(!el)return;
el.classList.remove('hot-number','flow-dominant','flow-flat');
if(isDominant)el.classList.add('flow-dominant');
if(isFlat)el.classList.add('flow-flat');
}
const macroPeak=Math.max.apply(null,ai.dozens.concat(ai.cols,[ai.low,ai.high,ai.even,ai.odd,ai.red,ai.black]));
const macroMin=Math.min.apply(null,ai.dozens.concat(ai.cols,[ai.low,ai.high,ai.even,ai.odd,ai.red,ai.black]));
const macroFlat=macroPeak-macroMin<3.5;
const maxD=Math.max(ai.dozens[0],ai.dozens[1],ai.dozens[2]);
const maxC=Math.max(ai.cols[0],ai.cols[1],ai.cols[2]);
setMacroBetPct('bet-dozen1',ai.dozens[0],ai.dozens[0]>=maxD*0.98,macroFlat);
setMacroBetPct('bet-dozen2',ai.dozens[1],ai.dozens[1]>=maxD*0.98,macroFlat);
setMacroBetPct('bet-dozen3',ai.dozens[2],ai.dozens[2]>=maxD*0.98,macroFlat);
setMacroBetPct('bet-col-1',ai.cols[0],ai.cols[0]>=maxC*0.98,macroFlat);
setMacroBetPct('bet-col-2',ai.cols[1],ai.cols[1]>=maxC*0.98,macroFlat);
setMacroBetPct('bet-col-3',ai.cols[2],ai.cols[2]>=maxC*0.98,macroFlat);
setMacroBetPct('bet-low',ai.low,ai.low>=Math.max(ai.low,ai.high)*0.98,macroFlat);
setMacroBetPct('bet-even',ai.even,ai.even>=Math.max(ai.even,ai.odd)*0.98,macroFlat);
setMacroBetPct('bet-red',ai.red,ai.red>=Math.max(ai.red,ai.black)*0.98,macroFlat);
setMacroBetPct('bet-black',ai.black,ai.black>=Math.max(ai.red,ai.black)*0.98,macroFlat);
setMacroBetPct('bet-odd',ai.odd,ai.odd>=Math.max(ai.even,ai.odd)*0.98,macroFlat);
setMacroBetPct('bet-high',ai.high,ai.high>=Math.max(ai.low,ai.high)*0.98,macroFlat);
const pr=computeAIPrediction();
const clusterNums=pr?getClusters()[0].nums:(spins.length?getClusters()[0].nums:[]);
if(clusterNums&&clusterNums.length){
clusterNums.forEach(n=>{
const el=document.getElementById('num-'+n);
if(el)el.classList.add('cluster-active');
});
}
}

/* ======================================
HISTORY
====================================== */

function renderHistory(){
const historyEl=document.getElementById('history');
const emptyEl=document.getElementById('historyEmpty');
const undoBtn=document.getElementById('btnUndoLast');
if(undoBtn)undoBtn.disabled=!spins.length;
if(!historyEl)return;
if(emptyEl){
if(!spins.length){emptyEl.classList.add('visible');historyEl.innerHTML='';return;}
emptyEl.classList.remove('visible');
}
historyEl.innerHTML='';
const maxShow=60;
spins.slice(-maxShow).reverse().forEach(n=>{
const cell=document.createElement('div');
cell.className='history-cell';
const dot=document.createElement('div');
dot.className='history-dot '+(n===0?'greenbg':reds.includes(n)?'red':'black');
dot.textContent=String(n);
cell.appendChild(dot);
historyEl.appendChild(cell);
});
}
/* ======================================
HOT / COLD
====================================== */

function rawSpinCounts(){
const c={};
for(let i=0;i<=36;i++)c[i]=0;
spins.forEach(n=>{if(n>=0&&n<=36)c[n]++;});
return c;
}
function numColorClass(n){
if(n===0)return'green';
return reds.includes(n)?'red':'black';
}
function hcCountSpins(arr){
const m={};
for(let n=0;n<=36;n++)m[n]=0;
(arr||[]).forEach(n=>{if(n>=0&&n<=36)m[n]++;});
return m;
}
function hcSpinSince(num){
for(let i=spins.length-1;i>=0;i--)if(spins[i]===num)return spins.length-1-i;
return spins.length;
}
function hcSpinStreak(num){
let s=0;
for(let i=spins.length-1;i>=0&&spins[i]===num;i--)s++;
return s;
}
/** AKTÍVNE / NEAKTÍVNE panel — výhradne raw pole spins (počty, since, streak). */
function hcBuildFromSpins(){
const total=spins.length;
const winRecent=Math.min(30,total);
const recentSlice=spins.slice(-winRecent);
const sessionCounts=hcCountSpins(spins);
const recentCounts=hcCountSpins(recentSlice);
const rows=[];
for(let n=0;n<=36;n++){
rows.push({
n,
c:sessionCounts[n]||0,
cRecent:recentCounts[n]||0,
since:hcSpinSince(n),
streak:hcSpinStreak(n)
});
}
const active=rows.filter(x=>x.c>=1)
.sort((a,b)=>b.c-a.c||b.cRecent-a.cRecent||b.streak-a.streak||a.since-b.since)
.slice(0,8);
const inactive=rows.filter(x=>x.c===0&&x.since>=1)
.sort((a,b)=>b.since-a.since||a.n-b.n)
.slice(0,8);
const recovering=rows.filter(x=>x.c>=1&&x.cRecent===0&&x.since>=6)
.sort((a,b)=>b.since-a.since)
.slice(0,5);
const overheated=rows.filter(x=>x.cRecent>=3||x.streak>=4)
.sort((a,b)=>b.cRecent-a.cRecent||b.streak-a.streak||b.c-a.c)
.slice(0,5);
const sectors=[];
for(let i=0;i<wheel.length;i++){
const nums=[];
for(let j=-2;j<=2;j++)nums.push(wheel[(i+j+wheel.length)%wheel.length]);
let hits=0;
recentSlice.forEach(sn=>{if(nums.includes(sn))hits++;});
sectors.push({center:wheel[i],nums,hits});
}
sectors.sort((a,b)=>b.hits-a.hits);
return{active,inactive,recovering,overheated,sectors:sectors.slice(0,4),total,winRecent,lastN:lastSpinNum(),
trail:spins.slice(-12)};
}
function hcHumanHotHint(item,rank){
if(item.streak>=5)return'streak ×'+item.streak+' na konci';
if(item.c>=8)return'často padá v histórii';
if(rank<=2&&item.c>=3)return'silný návrat';
if(item.cRecent>=2&&item.since<=2)return'čerstvo aktívne';
if(item.c>=2)return'opakované padnutie';
return'padlo v histórii';
}
function hcHumanColdHint(item){
if(item.c===0&&item.since>=1)return'bez návratu '+item.since+' spinov';
return'neaktívne';
}
function hcHumanRecoveryHint(item){
if(item.since>=12)return'dlho nepadalo · '+item.c+'× v minulosti';
return'kedysi padalo · teraz mlčí';
}
function hcHumanOverheatHint(item){
if(item.streak>=4)return'streak ×'+item.streak+' — veľa za sebou';
if(item.cRecent>=5)return item.cRecent+'× v posledných '+Math.min(30,spins.length)+' spinoch';
return'vysoká frekvencia nedávno';
}
function hcHumanSectorHint(s,rank){
if(rank===0&&s.hits>=3)return'najviac hitov na pásu';
if(s.hits>=2)return'návraty v pásme';
if(s.hits>=1)return'občasný hit';
return'slabý pás';
}
function hcBehaviorRow(item,hint,meta){
return'<div class="hc-row">'
+'<span class="hc-n '+numColorClass(item.n)+'">'+item.n+'</span>'
+'<div class="hc-row-body">'
+'<span class="hc-meta">'+(meta||'—')+'</span>'
+'<span class="hc-hint">'+hint+'</span>'
+'</div></div>';
}
function hcCompactLine(item,rank,kind,extra){
return'<div class="hc-line"><span class="hc-rank">'+rank+'.</span>'
+'<span class="hc-num '+numColorClass(item.n)+'">'+item.n+'</span>'
+'<b class="hc-count '+kind+'">'+extra+'</b></div>';
}
function renderHotCold(){
const hotColdEl=document.getElementById('hotCold');
if(!hotColdEl)return;
if(!spins.length){
hotColdEl.innerHTML='<div class="hc-empty-msg">Čakám na spiny…</div>';
return;
}
const e=computeHotColdEngine();
const hot=e.hot.slice(0,12);
const cold=e.cold.slice(0,12);
let html='<div class="section-label">Vážené · frekvencia · decay '+HC_DECAY_POW+'</div>';
html+='<div class="hc-grid hc-grid-main">';
html+='<div class="hc-col"><div class="hc-title hot">🔥 AKTÍVNE (12)</div>';
if(hot.length){
hot.forEach((item,i)=>{html+=hcCompactLine(item,i+1,'hot',item.c+'× w'+item.wShare.toFixed(1)+'%');});
}else html+='<div class="hc-empty-msg">Zatiaľ bez hitov</div>';
html+='</div><div class="hc-col"><div class="hc-title cold">❄ NEAKTÍVNE (12)</div>';
if(cold.length){
cold.forEach((item,i)=>{
const extra=item.c===0?('0× gap '+item.since):(item.c+'× gap '+item.since);
html+=hcCompactLine(item,i+1,'cold',extra);
});
}else html+='<div class="hc-empty-msg">Všetky čísla už padli</div>';
html+='</div></div>';
const more=e.recovering.length||e.overheated.length||(e.sectorHeat.length&&e.sectorHeat[0].heat>0);
if(more){
html+='<details class="hc-more-fold"><summary>Ďalšie signály (návrat · prehriatie · sektor)</summary><div class="inner">';
if(e.recovering.length){
html+='<div class="section-label">Studená obnova</div>';
e.recovering.slice(0,5).forEach((item,i)=>{
html+='<div class="panel-line"><span>'+(i+1)+'. '+item.n+'</span><b class="blueTxt">rec '+item.recoveryScore.toFixed(0)+'</b></div>';
});
}
if(e.overheated.length){
html+='<div class="section-label">Prehriatie</div>';
e.overheated.slice(0,5).forEach((item,i)=>{
html+='<div class="panel-line"><span>'+(i+1)+'. '+item.n+'</span><b class="redTxt">+'+item.overheatScore.toFixed(0)+'</b></div>';
});
}
if(e.sectorHeat.length&&e.sectorHeat[0].heat>0){
html+='<div class="section-label">Teplo sektora</div>';
e.sectorHeat.slice(0,3).forEach((s,i)=>{
html+='<div class="panel-line"><span>'+(i+1)+'. pás '+s.center+'</span><b class="greenTxt">'+s.heatPct.toFixed(1)+'%</b></div>';
});
}
html+='</div></details>';
}
hotColdEl.innerHTML=html;
}
function hcRebuildSpinRecordsFromHistory(){
spinRecords=spins.map((n,i)=>spinMeta(n,spinTimes[i]||Date.now()));
}
function renderPatterny(){
const clustersEl=document.getElementById('clusters');
const neighborsEl=document.getElementById('neighbors');
if(!clustersEl&&!neighborsEl)return;
const p=computePatternEngine();
if(spins.length<2){
const wait='<div class="alert">Čakám na spiny — engine patternov…</div>';
if(clustersEl)clustersEl.innerHTML=wait;
if(neighborsEl)neighborsEl.innerHTML='';
return;
}
if(clustersEl){
let html='<div class="section-label">'+p.modelLabel+'</div>'
+'<div class="panel-line"><span>Zdroje</span><b style="font-size:11px">'+p.sources+'</b></div>'
+'<div class="panel-line"><span>Skóre patternov</span><b class="greenTxt">'+p.patternScore+'%</b></div>';
p.activeClusters.forEach(c=>{
html+='<div class="panel-line"><span>Klaster '+c.rank+(c.active?' · AKTÍVNY':'')+'</span><b class="'+(c.active?'greenTxt':'blueTxt')+'">'+c.nums.join(' · ')+'</b></div>';
});
html+='<div class="section-label">Reťazce opakovaní</div>';
if(p.repeatChains.length){
p.repeatChains.forEach(r=>{
html+='<div class="panel-line"><span>×'+r.len+'</span><b class="yellowTxt">'+r.num+'</b></div>';
});
}else html+='<div class="panel-line"><span>'+skUiLabel('Repeat')+'</span><b>—</b></div>';
html+='<div class="section-label">Dráhy migrácie</div>'
+'<div class="panel-line"><span>Smer</span><b class="blueTxt">'+p.migrationPaths.dir+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Path')+'</span><b style="font-size:11px">'+p.migrationPaths.pathLabel+'</b></div>'
+'<div class="section-label">'+skUiLabel('Echo patterny')+'</div>';
if(p.echoPatterns.length){
p.echoPatterns.slice(0,3).forEach(e=>{
html+='<div class="panel-line"><span>'+e.num+' (gap '+e.gap+')</span><b class="yellowTxt">'+e.strength+'%</b></div>';
});
}else html+='<div class="panel-line"><span>'+skUiLabel('Echo')+'</span><b>—</b></div>';
clustersEl.innerHTML=html;
}
if(neighborsEl){
const seq=p.spinSequence;
let nhtml='<div class="section-label">'+skUiLabel('Spin sequence · neighbor · repeat · path')+'</div>'
+'<div class="panel-line"><span>'+skUiLabel('Sequence')+'</span><b class="blueTxt">'+seq.signature+'</b></div>'
+'<div class="panel-line"><span>Trend</span><b class="greenTxt">'+seq.trend+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Neighbor chain')+'</span><b class="greenTxt">'+p.neighborChain.len+'/'+p.neighborChain.max+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Repeat rate')+'</span><b class="yellowTxt">'+p.repeats.rate.toFixed(0)+'% · beh ×'+p.repeats.numRun+'</b></div>'
+'<div class="section-label">'+skUiLabel('AI Prediction')+'</div>';
if(p.prediction){
nhtml+='<div class="panel-line"><span>Tip · sektor</span><b class="greenTxt">'+p.prediction.tip+' · '+p.prediction.sector+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Align klaster')+'</span><b class="'+(p.prediction.align?'greenTxt':'yellowTxt')+'">'+(p.prediction.align?'ÁNO':'slabé')+' · '+p.prediction.confidence+'%</b></div>';
}else nhtml+='<div class="panel-line"><span>Predikcia</span><b>—</b></div>';
nhtml+='<div class="section-label">'+skUiLabel('AI Comment')+'</div>'
+'<div class="panel-line"><span>'+skUiLabel('Blend')+'</span><b class="blueTxt">'+p.comment.blend+'% ('+skUiLabel('data')+' '+p.comment.data+' · '+skUiLabel('reasoning')+' '+p.comment.reasoning+')</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Insight')+'</span><b style="font-size:11px">'+p.comment.insight+(p.comment.insight.length>=72?'…':'')+'</b></div>';
neighborsEl.innerHTML=nhtml;
}
}
function renderClusters(){renderPatterny();}
function renderNeighbors(){renderPatterny();}

/* ======================================
MIGRATION
====================================== */

function renderWheelFlow(){
const migrationEl=document.getElementById('migration');
const momentumEl=document.getElementById('momentum');
if(!migrationEl&&!momentumEl)return;
const w=computeWheelFlowEngine();
if(spins.length<2){
const wait='<div class="alert">Čakám na spiny — wheel flow engine…</div>';
if(migrationEl)migrationEl.innerHTML=wait;
if(momentumEl)momentumEl.innerHTML='';
return;
}
if(migrationEl){
const m=w.migrationDirection;
migrationEl.innerHTML=
'<div class="section-label">'+w.modelLabel+'</div>'
+'<div class="panel-line"><span>Zdroje</span><b style="font-size:11px">'+w.sources+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Clockwise flow')+'</span><b class="greenTxt">'+w.clockwiseFlow+'% · '+m.cw+' krokov</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Counter flow')+'</span><b class="blueTxt">'+w.counterFlow+'% · '+m.ccw+' krokov</b></div>'
+'<div class="panel-line"><span>Momentum</span><b class="yellowTxt">'+w.momentum+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Migration direction')+'</span><b class="'+(m.dir==='CW'?'greenTxt':m.dir==='CCW'?'blueTxt':'yellowTxt')+'">'+m.dir+'</b></div>'
+'<div class="panel-line"><span>Smer</span><b style="font-size:11px">'+m.label+'</b></div>';
}
if(momentumEl){
const q=w.quantum;
const dom=q&&q.dominant?q.dominant:null;
let html='<div class="section-label">'+skUiLabel('Quantum Wheel · direction · neighbors')+'</div>';
if(dom){
html+='<div class="panel-line"><span>'+skUiLabel('Dominant sektor')+'</span><b class="greenTxt">'+dom.nums.join(' · ')+' · '+((dom.displayPct!=null?dom.displayPct:dom.pct)||0).toFixed(1)+'%</b></div>';
}
html+='<div class="panel-line"><span>'+skUiLabel('Wheel pressure')+'</span><b class="greenTxt">'+(q?q.wheelPressure:0)+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Direction engine')+'</span><b class="blueTxt">'+w.directionScore+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Neighbor transition')+'</span><b class="yellowTxt">'+w.neighbors.dist+' poz · reťaz '+w.neighbors.chain+'/11</b></div>'
+'<div class="section-label">'+skUiLabel('AI Prediction')+'</div>';
if(w.prediction){
html+='<div class="panel-line"><span>Tip · sektor</span><b class="greenTxt">'+w.prediction.tip+' · '+w.prediction.sector+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Align quantum')+'</span><b class="'+(w.prediction.sectorAlign?'greenTxt':'yellowTxt')+'">'+(w.prediction.sectorAlign?'ÁNO':'slabé')+' · '+w.prediction.confidence+'%</b></div>';
}else html+='<div class="panel-line"><span>Predikcia</span><b>—</b></div>';
html+='<div class="section-label">'+skUiLabel('AI Comment')+'</div>'
+'<div class="panel-line"><span>'+skUiLabel('Blend')+'</span><b class="blueTxt">'+w.comment.blend+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Insight')+'</span><b style="font-size:11px">'+w.comment.insight+(w.comment.insight.length>=72?'…':'')+'</b></div>';
momentumEl.innerHTML=html;
}
}
function renderMigration(){renderWheelFlow();}
function renderMomentum(){renderWheelFlow();}

/* ======================================
PERSISTENCE
====================================== */

function renderRiskChaos(){
const chaosEl=document.getElementById('chaos');
const persistenceEl=document.getElementById('persistence');
if(!chaosEl&&!persistenceEl)return;
const r=computeRiskChaosEngine();
if(spins.length<2){
const wait='<div class="alert">Čakám na spiny — risk / chaos engine…</div>';
if(chaosEl)chaosEl.innerHTML=wait;
if(persistenceEl)persistenceEl.innerHTML='';
return;
}
if(chaosEl){
chaosEl.innerHTML=
'<div class="section-label">'+r.modelLabel+'</div>'
+'<div class="panel-line"><span>Zdroje</span><b style="font-size:11px">'+r.sources+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Chaos level')+'</span><b class="'+(r.chaosLevel>=58?'redTxt':'yellowTxt')+'">'+r.chaosLevel+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Stability')+'</span><b class="'+(r.stability>=65?'greenTxt':'yellowTxt')+'">'+r.stability+'%</b></div>'
+'<div class="panel-line"><span>Spoľahlivosť patternov</span><b class="'+(r.patternReliability>=60?'greenTxt':'redTxt')+'">'+r.patternReliability+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Randomness pressure')+'</span><b class="redTxt">'+r.randomnessPressure+'%</b></div>'
+'<div class="panel-line"><span>Skóre rizika</span><b class="'+(r.tag==='HIGH'?'redTxt':r.tag==='LOW'?'greenTxt':'yellowTxt')+'">'+r.score+'% · '+skTag(r.tag)+'</b></div>';
}
if(persistenceEl){
let html='<div class="section-label">'+skUiLabel('Vstupy · entropy · vol · timing · cluster')+'</div>'
+'<div class="panel-line"><span>Entropia</span><b class="'+(r.entropy>5?'redTxt':'greenTxt')+'">'+r.entropy.toFixed(2)+' · signál '+r.entropySignal+'%</b></div>'
+'<div class="panel-line"><span>Volatilita</span><b class="yellowTxt">'+r.volatility+'%</b></div>'
+'<div class="panel-line"><span>Timing nestabilita</span><b class="redTxt">'+r.timingInstability+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Cluster conflict')+'</span><b class="blueTxt">'+r.clusterConflict+'%</b></div>'
+'<div class="section-label">'+skUiLabel('AI Prediction')+'</div>';
if(r.prediction){
html+='<div class="panel-line"><span>'+skUiLabel('Tip · confidence')+'</span><b class="greenTxt">'+r.prediction.tip+' · '+r.prediction.confidence+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Chaos penalty')+'</span><b class="yellowTxt">×'+(r.prediction.chaosPenalty!=null?r.prediction.chaosPenalty.toFixed(2):'1')+'</b></div>';
}else html+='<div class="panel-line"><span>Predikcia</span><b>—</b></div>';
html+='<div class="section-label">'+skUiLabel('AI Comment')+'</div>'
+'<div class="panel-line"><span>'+skUiLabel('Blend')+'</span><b class="blueTxt">'+r.comment.blend+'% · '+skUiLabel('data')+' '+r.comment.data+' · '+skUiLabel('reasoning')+' '+r.comment.reasoning+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Insight')+'</span><b style="font-size:11px">'+r.comment.insight+(r.comment.insight.length>=72?'…':'')+'</b></div>';
persistenceEl.innerHTML=html;
}
}
function renderPersistence(){renderRiskChaos();}
function renderChaos(){renderRiskChaos();}

let lastVisualHeatEngine=null;
let lastVisualHeatKey='';
function invalidateVisualHeatCache(){
lastVisualHeatEngine=null;
lastVisualHeatKey='';
}
function computeVisualHeatEngine(){
const key=spins.length+'|'+(spins[spins.length-1]??'');
if(lastVisualHeatEngine&&lastVisualHeatKey===key)return lastVisualHeatEngine;
const empty={
modelLabel:'Vizuálna teplota · heatmapa · tlak · bez predikcie',
sources:'heatmap engine · engine tlaku',
heatConcentration:0,
heatSpread:0,
pressureScore:0,
activeZones:[],
topHeatNums:[],
note:'Čakám na spiny'
};
if(!spins.length){lastVisualHeatEngine=empty;lastVisualHeatKey=key;return empty;}
if(spins.length>=2)computeVisualCore();
const heatSpread=scoreVisualHeatSpread();
const pressureScore=scoreVisualPressure();
const vb=lastVisualBreakdown;
const raw=rawSpinCounts();
const total=spins.length;
const numHeat=[];
for(let n=0;n<=36;n++){
const c=raw[n]||0;
if(c>0)numHeat.push({n,c,pct:total?(c/total*100):0});
}
numHeat.sort((a,b)=>b.c-a.c||a.n-b.n);
const top8=numHeat.slice(0,8).reduce((s,x)=>s+x.c,0);
const heatConcentration=clamp(total?(top8/total)*100:0);
const last=lastSpinNum();
const activeZones=[];
if(spins.length>=2){
const hc=computeHotColdEngine();
hc.sectorHeat.slice(0,3).forEach((s,i)=>{
activeZones.push({
type:'heatmap',
label:'Sektor '+s.center,
nums:s.nums,
intensity:+s.heatPct.toFixed(1),
active:last!=null&&s.nums.includes(last)
});
});
}
getClusters().slice(0,2).forEach((c,i)=>{
activeZones.push({
type:'heatmap',
label:'Klaster '+(i+1),
nums:c.nums,
intensity:clamp(c.score*3),
active:last!=null&&c.nums.includes(last)
});
});
if(spins.length>=2){
const wp=computeWheelPressureEngine();
if(wp.activeSector&&!activeZones.some(z=>z.label==='Pressure pás')){
activeZones.push({
type:'pressure',
label:'Pressure pás',
nums:wp.activeSector.nums,
intensity:wp.activeSector.pct,
active:wp.activeSector.active
});
}
}
const result={
modelLabel:'Vizuálna teplota · heatmapa · tlak · bez predikcie',
sources:'heatmap engine · engine tlaku',
heatConcentration:Math.round(heatConcentration),
heatSpread:Math.round(heatSpread),
pressureScore:Math.round(pressureScore),
visualCore:Math.round(lastCoreValues.visualCore),
wheelSignal:vb.wheel,
boardSignal:vb.board,
pressureSignal:vb.pressure,
alignSignal:vb.align,
activeZones:activeZones.slice(0,6),
topHeatNums:numHeat.slice(0,6).map(x=>({n:x.n,c:x.c,pct:x.pct.toFixed(1)})),
note:'Diagnostika — žiadne predikcie'
};
lastVisualHeatEngine=result;
lastVisualHeatKey=key;
return result;
}

/* ======================================
HEATMAP
====================================== */

function renderHeatmap(){
const heatmapEl=document.getElementById('heatmap');
if(!heatmapEl)return;
const v=computeVisualHeatEngine();
if(!spins.length){
heatmapEl.innerHTML='<div class="alert">'+v.note+'</div>';
return;
}
let html='<div class="section-label">'+v.modelLabel+'</div>'
+'<div class="panel-line"><span>Zdroje</span><b style="font-size:11px">'+v.sources+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Heat concentration')+'</span><b class="redTxt">'+v.heatConcentration+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Heatmap spread')+'</span><b class="yellowTxt">'+v.heatSpread+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Pressure engine')+'</span><b class="greenTxt">'+v.pressureScore+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Visual core')+'</span><b class="blueTxt">'+v.visualCore+'% · koleso '+v.wheelSignal+' · board '+v.boardSignal+'</b></div>'
+'<div class="section-label">'+skUiLabel('Active zones')+'</div>';
if(v.activeZones.length){
v.activeZones.forEach(z=>{
html+='<div class="panel-line"><span>'+z.label+(z.active?' · '+skUiLabel('ACTIVE'):'')+'</span><b class="'+(z.active?'greenTxt':'blueTxt')+'">'+z.intensity+'% · '+z.nums.join(' · ')+'</b></div>';
});
}else html+='<div class="panel-line"><span>Zóny</span><b>—</b></div>';
html+='<div class="section-label">'+skUiLabel('Top heat (raw)')+'</div>';
v.topHeatNums.forEach((t,i)=>{
const cls=t.n===0?'greenTxt':reds.includes(t.n)?'redTxt':'';
html+='<div class="panel-line"><span>'+(i+1)+'.</span><b class="'+cls+'">'+t.n+' · '+t.c+'× ('+t.pct+'%)</b></div>';
});
html+='<div class="alert" style="border:1px solid rgba(255,77,77,.12);font-size:9px;margin-top:4px">'+v.note+'</div>';
heatmapEl.innerHTML=html;
}

/* ======================================
TIMING (gulička: len ŠTART → STOP)
====================================== */


function syncBallTimingHistoryFromRecords(){
ballTimingHistory=ballTimingRecords.filter(r=>r.num>=0&&r.num<=36).map(r=>r.sec);
}
function normalizeBallTimingRecords(){
if(!ballTimingRecords.length&&ballTimingHistory.length){
ballTimingHistory.forEach(sec=>ballTimingRecords.push({sec,num:-1,ts:0,dozen:-1,column:-1}));
}
}
function timingRecordFromNum(num,sec){
const n=parseInt(num,10);
if(isNaN(n)||n<0||n>36)return null;
return{sec,num:n,ts:Date.now(),dozen:dozenIndexForNum(n),column:columnIndexForNum(n),
isRed:n>0&&reds.includes(n),isBlack:n>0&&!reds.includes(n)&&n!==0,
isLow:n>0&&n<19,isHigh:n>=19,isEven:n>0&&n%2===0,isOdd:n>0&&n%2===1,wheelIdx:wheel.indexOf(n)};
}
function computeTimingProfileEngine(){
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
function applyTimingBallPickFromProfile(){
const P=computeTimingProfileEngine();
lastTimingProfileCache=P;
if(!P.ready){timingBallPick={dozens:'—',columns:'—',color:'—',size:'—',parity:'—'};updateBallTimingMetrics();return P;}
timingBallPick={dozens:P.dozens,columns:P.columns,color:P.color,size:P.size,parity:P.parity};
invalidatePredCache();updateBallTimingMetrics();return P;
}
function timingCaptureStop(sec){
pendingBallTimingSec=sec;
lastBallTimingSec=sec;
}
function commitBallTimingNumber(raw){
const n=parseInt(String(raw).trim(),10);
if(isNaN(n)||n<0||n>36)return false;
if(pendingBallTimingSec==null&&!timingRunning)return false;
const sec=pendingBallTimingSec!=null?pendingBallTimingSec:(lastBallTimingSec||0);
const rec=timingRecordFromNum(n,sec);
if(!rec)return false;
ballTimingRecords.push(rec);
if(ballTimingRecords.length>120)ballTimingRecords.shift();
syncBallTimingHistoryFromRecords();
pendingBallTimingSec=null;
lastBallTimingSec=sec;
applyTimingBallPickFromProfile();
return true;
}

function computeTimingFromBall(sec){
const P=computeTimingProfileEngine();
if(P.ready){applyTimingBallPickFromProfile();return{dozens:timingBallPick.dozens,columns:timingBallPick.columns,color:timingBallPick.color,size:timingBallPick.size,parity:timingBallPick.parity,sec:sec};}
return{dozens:'—',columns:'—',color:'—',size:'—',parity:'—',sec:sec};
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
function updateBallTimingMetrics(){
const samples=getBallTimingSamples();
lastCoreValues.timingCore=computeBallTimingCore(samples);
}
function applyTimingBallPick(sec){
lastBallTimingSec=sec;
applyTimingBallPickFromProfile();
}
function clearBallTimingState(){
lastBallTimingSec=null;
pendingBallTimingSec=null;
ballTimingRecords=[];
ballTimingHistory=[];
timingBallPick={dozens:'—',columns:'—',color:'—',size:'—',parity:'—'};
lastTimingBreakdown={rhythm:0,pace:0,trend:0,flow:0,stability:0,total:0};
lastCoreValues.timingCore=50;
lastTimingProfileCache=null;
}
function undoLastBallTiming(){
stopTimingTick();
if(timingRunning){
timingRunning=false;
timingStartAt=null;
renderTiming();
renderLight();
return;
}
if(pendingBallTimingSec!=null){pendingBallTimingSec=null;renderTiming();renderLight();return;}
if(!ballTimingRecords.length&&!ballTimingHistory.length)return;
if(ballTimingRecords.length)ballTimingRecords.pop();
syncBallTimingHistoryFromRecords();
if(ballTimingRecords.length){lastBallTimingSec=ballTimingRecords[ballTimingRecords.length-1].sec;applyTimingBallPickFromProfile();}
else clearBallTimingState();
renderTiming();
renderLight();
}
function startTimingTick(){
if(timingTickTimer)clearInterval(timingTickTimer);
timingTickTimer=setInterval(()=>{if(timingRunning)renderTiming();},100);
}
function stopTimingTick(){
if(timingTickTimer){clearInterval(timingTickTimer);timingTickTimer=null;}
}

function renderTiming(){

const timingEl=document.getElementById('timing');
if(!timingEl)return;

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

timingEl.innerHTML=
'<div class="panel-line"><span>TIMING PILIER</span><b class="greenTxt">'+tg.score+'</b></div>'
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
const numIn=document.getElementById('timingResultNum');
const btnUndo=document.getElementById('btnTimingUndo');
if(numIn){numIn.classList.toggle('pending',pendingBallTimingSec!=null);numIn.placeholder=pendingBallTimingSec!=null?('Číslo · '+pendingBallTimingSec.toFixed(1)+'s'):'Číslo 0–36';}
if(btnUndo)btnUndo.disabled=!pendingBallTimingSec&&!ballTimingRecords.length;
applyTimingBallPickFromProfile();
}

/* ======================================
MEMORY
====================================== */

function renderMemory(){renderStrategy();}

/* ======================================
PREDICTIONS
====================================== */

function renderPredictions(){
const predictionsEl=document.getElementById('predictions');
if(!predictionsEl)return;
const pr=computeAIPrediction();
if(!pr||!pr.coreAnalysis){
predictionsEl.innerHTML='<div class="alert">Čakám na spiny — flow engine…</div>';
return;
}
const E=pr.coreAnalysis,fu=E.flowEng||{},th=E.trustHierarchy||{};
predictionsEl.innerHTML=
'<div class="section-label">'+E.modelLabel+'</div>'
+'<div class="panel-line"><span>Čo hrať</span><b class="greenTxt">'+String(fu.colPick||'—').replace(/<[^>]+>/g,'')+' · '+String(fu.dozPick||'—').replace(/<[^>]+>/g,'')+'</b></div>'
+'<div class="panel-line"><span>Sila signálu</span><b class="blueTxt">'+th.label+'</b></div>'
+'<div class="panel-line"><span>Režim</span><b class="yellowTxt">'+skPredRezim(E.predRezim)+'</b></div>'
+'<div class="panel-line"><span>Návratový flow</span><b style="font-size:11px">'+(E.sources||pr.sources||'40% follow-up · 20% patterny · 10% pamäť')+'</b></div>'
+'<p class="manual-hint">Rozšírený panel — hlavný výstup je karta AI PREDIKCIA.</p>';
}

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

function renderAlertSystem(){
const el=document.getElementById('alertSystem');
if(!el)return;
const eng=computeBehaviorAlerts();
const n=spins.length;
if(!eng.ready){
el.innerHTML='<div class="bah-wait">Zbieram obraz z histórie ('+n+'/'+BAH_RADAR_MIN+' spinov) — radar správania štartuje po '+BAH_RADAR_MIN+'. spîne.</div>';
return;
}
let html='';
if(eng.nowLine)html+='<div class="bah-now">'+eng.nowLine+'</div>';
if(!eng.primary){
let idleWhy='Koleso ešte nevytvára silný spoločný rytmus.';
const Aidle=bahAnalyzeFromSpins();
if(Aidle.ready)idleWhy=bahDataWhy('IDLE',Aidle);
else if(n>0&&n<BAH_RADAR_MIN)idleWhy='Ešte zbieram obraz z '+n+' spinov — plný radar od '+BAH_RADAR_MIN+'.';
html+='<div class="bah-neutral-msg">⚪ Momentálne bez výrazného flowu<br><span style="font-weight:600">'+idleWhy+'</span></div>';
}else{
html+=buildBahAlertCard(eng.primary);
if(eng.secondary&&eng.secondary.id!==eng.primary.id&&eng.secondary.title!==eng.primary.title)
html+=buildBahAlertCard(eng.secondary,true);
}
el.innerHTML=html;
}
/* ======================================
WARNING — zlúčené do alertSystem (bez duplicity)
====================================== */

function renderWarning(){
const warningEl=document.getElementById('warning');
if(warningEl)warningEl.innerHTML='';
}
function qwColDozStats(){
const slice=spins.slice(-22).filter(n=>n>0);
const col=[0,0,0],doz=[0,0,0];
slice.forEach(n=>{const c=columnIndexForNum(n),d=dozenIndexForNum(n);if(c>=0)col[c]++;if(d>=0)doz[d]++;});
const t=Math.max(slice.length,1);
const colPct=col.map(x=>Math.round(x/t*100));
const dozPct=doz.map(x=>Math.round(x/t*100));
const domCol=col.indexOf(Math.max(...col));
const domDoz=doz.indexOf(Math.max(...doz));
return{colPct,dozPct,domCol,domDoz};
}
function qwSpinBallClass(n){
if(n===0)return'green';
return reds.includes(n)?'red':'black';
}
function qwFlowStateLabel(Q){
const fc=Q.flowContinuity||{label:'—'};
if(Q.flowBreak)return{val:'ROZPAD',sub:'Flow sa prerušil',cls:'redTxt',ring:25};
if(fc.label==='DRŽÍ')return{val:'SILNÝ',sub:'Flow drží',cls:'greenTxt',ring:88};
if(fc.label==='NESTABILNÝ')return{val:'STREDNÝ',sub:'Flow kolíše',cls:'yellowTxt',ring:55};
return{val:fc.label,sub:'Sleduj koleso',cls:fc.cls||'yellowTxt',ring:42};
}
function qwFlowStateSimple(Q){
const chaos=Q.chaosLevel||50;
if(Q.flowBreak||chaos>=68)return{val:'CHAOS',sub:'Koleso je príliš chaotické',cls:'redTxt',ring:22};
const fc=Q.flowContinuity||{label:'—'};
if(fc.label==='DRŽÍ'&&chaos<52)return{val:'STABILNÝ',sub:'Flow drží smer',cls:'greenTxt',ring:88};
if(fc.label==='ROZPADÁ SA'||fc.label==='BEZ KONTINUITY'||chaos>=55)return{val:'SLABNE',sub:'Dominancia slabne',cls:'yellowTxt',ring:48};
return{val:'SLABNE',sub:'Sleduj koleso',cls:'yellowTxt',ring:42};
}
function qwFlowStabilityDisplay(Q,S){
const chaos=Q.chaosLevel||50;
if(chaos>=65||Q.flowBreak||(S&&S.flowStability==='CHAOTIC'))return{val:'CHAOS',cls:'redTxt'};
const fc=Q.flowContinuity||{};
if(fc.label==='DRŽÍ'&&chaos<55)return{val:'STABILNÝ',cls:'greenTxt'};
return{val:'SLABNE',cls:'yellowTxt'};
}
function qwDirDisplay(Q){
const dh=Q.flowDirHuman||{main:'—',sub:'—'};
const rf=Q.scanner&&Q.scanner.returnForce;
if(rf&&(rf.level.indexOf('STRONG')>=0||rf.level.indexOf('AGGRESSIVE')>=0))
return{main:'NÁVRATOVÝ SMER',sub:(rf.line||'').replace(/^Return force:\s*/i,'').slice(0,42)||'Silné návraty'};
const m=(dh.main||'').toUpperCase();
if(m.indexOf('NÁHOD')>=0)return{main:'MIGRÁCIA',sub:'Bez pevného smeru'};
if(m.indexOf('TOK')>=0)return{main:'SMER KOLESA',sub:dh.main};
return{main:dh.main||'—',sub:dh.sub||'—'};
}
function qwFlowRegimeDisplay(Q){
const S=Q.scanner;
if(S&&S.waitMode)return{val:'REŽIM ČAKANIA',sub:'Čakaj na stabilizáciu kolesa',cls:'redTxt'};
if(Q.flowBreak||(Q.chaosLevel||0)>=68)return{val:'CHAOS',sub:'Nestabilná relácia',cls:'redTxt'};
if(S&&S.recovery&&S.recovery.active)return{val:'ZOTAVENIE',sub:'Po chaose sa formuje nový tok',cls:'greenTxt'};
const ph=Q.flowLife&&Q.flowLife.phase;
if(ph==='STRONG'||ph==='GROWING'||(Q.predRezim||'').toUpperCase().indexOf('ACTIVE')>=0)
return{val:skPredRezim('FLOW ACTIVE'),sub:'Tok drží smer',cls:'greenTxt'};
return{val:skPredRezim('FLOW ACTIVE'),sub:'Sleduj koleso',cls:'yellowTxt'};
}
function qwLiveRadarComment(Q,st){
const voice=qwPlayerVoice(Q,st);
if(voice.comment&&voice.comment.length>8)return voice.comment;
return qwAiInsightText(Q,st);
}
function qwIsChaosSession(Q,chaos){
if(!Q||!Q.ready)return false;
const c=chaos||{chaosLevel:Q.chaosLevel||0,noEdge:!!Q.noEdge};
return c.chaosLevel>=62||c.noEdge||!!Q.flowBreak||(Q.scanner&&Q.scanner.waitMode);
}
function qwFmtPick(pick){
if(!pick||pick==='—')return'—';
return String(pick).replace(/\s*\+\s*/g,' + ');
}
function qwPressureRows(S){
if(!S||!S.pressure||!S.pressure.lines)return'';
const map={'REPEAT':'OPAKOVANIE','REVERSAL':'NÁVRAT','CHAOS':'CHAOS','DOMINANCE':'DOMINANCIA'};
return S.pressure.lines.slice(0,3).map(l=>{
const k=(l.split(' ')[0]||'').toUpperCase();
const lbl=map[k]||k;
const pct=l.match(/\d+/);
return'<div class="pr"><span>'+lbl+'</span><b class="'+(k==='CHAOS'?'redTxt':k==='REPEAT'?'greenTxt':'yellowTxt')+'">'+(pct?pct[0]:'—')+'%</b></div>';
}).join('');
}
function qwBuildFlowIntelStrip(Q,st){
const S=Q.scanner;
if(!S)return'';
const dom=S.dominantSector||{};
const dir=qwDirDisplay(Q);
const mom=qwMomBlock(Q);
return'<span class="qi hot"><span>návrat</span> <b>'+(dom.path||'—')+'</b></span>'
+'<span class="qi"><span>smer</span> <b>'+dir.main+'</b></span>'
+'<span class="qi warn"><span>momentum</span> <b>'+mom.val+'</b></span>';
}
function qwBuildWheelContextAlerts(Q,st,wait){
const alerts=[];
const S=Q.scanner;
const chaos=Q.chaosLevel||0;
const decay=qwDominanceDecay(Q,st,S);
if(wait||Q.scanner&&Q.scanner.waitMode){
let why='Flow je príliš nestabilný.';
if(chaos>=65)why='Koleso mení smer príliš agresívne.';
else if(S&&S.flowStability==='CHAOTIC')why='Dominancia sa rozpadla.';
else if(S&&S.dominantSector&&S.dominantSector.returnRate<35)why='Návraty sú príliš slabé.';
alerts.push({head:'🔴 ČAKAJ',text:why,cls:'bad'});
return alerts.slice(0,1);
}
if(qwShouldSmartSilence(Q,st,S))return alerts;
if(decay)alerts.push({head:'🟠 DOMINANCIA',text:decay,cls:'warn'});
else if(S&&S.falseFlow&&S.falseFlow.active)alerts.push({head:'🟠 OPATRNOSŤ',text:'Dominancia je príliš krátka.',cls:'warn'});
if(st.domCol>=0&&S&&S.dominantSector&&S.dominantSector.returnRate>=42&&!decay)
alerts.push({head:'🟢 STABILNÝ FLOW',text:(st.domCol+1)+'. stĺpec drží návraty.',cls:'ok'});
return alerts.slice(0,2);
}
function qwBuildBehaviorStory(Q,st){
const trace=spins.slice(-12);
const markers=qwBuildTrailMarkers(trace,st,Q);
let rep=0,rev=0,mig=0,cha=0;
markers.forEach(m=>{if(m.type==='repeat')rep++;if(m.type==='rev')rev++;if(m.type==='mig')mig++;if(m.type==='chaos')cha++;});
const parts=[];
if(rep>=2)parts.push('opakovanie ×'+rep);
if(rev>=1)parts.push('návrat späť');
if(mig>=1)parts.push('migrácia');
if(cha>=1)parts.push('chaos');
const S=Q.scanner;
if(S&&S.dominantSector&&S.dominantSector.path!=='—')parts.push('návrat → '+S.dominantSector.path);
if(!parts.length)parts.push('flow sa formuje');
return parts.join(' · ');
}
function qwFlowBreathClass(Q){
const chaos=Q.chaosLevel||0;
const ph=Q.flowLife&&Q.flowLife.phase;
if(Q.flowBreak||chaos>=62||ph==='DEAD')return'qw-breathe-nervous';
if((ph==='STRONG'||ph==='GROWING')&&chaos<52)return'qw-breathe-calm';
if(ph==='WEAKENING'||chaos>=48)return'qw-breathe-weak';
if(ph==='EMERGING'||ph==='QUIET')return'qw-breathe-weak';
return'qw-breathe-calm';
}
function qwChaosEvolution(Q){
const cur=Q.chaosLevel||0;
const prev=qwPrevScannerSnap&&qwPrevScannerSnap.chaos!=null?qwPrevScannerSnap.chaos:cur;
const d=cur-prev;
if(cur>=72)return{head:'🔴 Chaos kulminuje',sub:'Koleso je v najvyššom chaose',cls:'redTxt'};
if(d>=7)return{head:'🟠 Chaos rastie',sub:'Nestabilita sa zhoršuje',cls:'yellowTxt'};
if(d<=-7)return{head:'🟢 Chaos ustupuje',sub:'Koleso sa upokojuje',cls:'greenTxt'};
if(cur>=58)return{head:'🟠 Chaos drží tlak',sub:'Sleduj či klesá',cls:'yellowTxt'};
return{head:'⚪ Chaos pokojný',sub:'Žiadny silný chaos spike',cls:''};
}
function qwFlowTransitionHuman(Q){
const S=Q.scanner;
if(S&&S.recovery&&S.recovery.active)return'Flow sa zotavuje po chaose.';
if(Q.flowTransition)return String(Q.flowTransition)
.replace(/Follow-up flow sa prerušil/i,'Flow sa prerušil')
.replace(/Dominantný sektor prestal absorbovať flow/i,'Dominancia prestala držať návraty')
.replace(/Wheel stráca follow-up kontinuitu/i,'Flow stráca konzistenciu')
.replace(/rebound flow/gi,'návraty')
.replace(/edge sektory/gi,'sektory');
const ph=Q.flowLife&&Q.flowLife.phase;
const map={
EMERGING:'Flow práve vzniká.',
GROWING:'Flow rastie — návraty silnejú.',
STRONG:'Flow vrcholí — dominancia drží.',
WEAKENING:'Flow slabne — pozor na rozpad.',
DEAD:'Flow kolabuje — počkaj na recovery.',
QUIET:'Koleso ešte nevytvára opakovaný flow.'
};
return map[ph]||'';
}
function qwDominanceDecay(Q,st,S){
if(!S)return null;
if(Q.flowBreak)return'Flow stráca konzistenciu.';
if(S.fatigue&&S.fatigue.line)return'Dominancia začína slabnúť.';
const rr=S.dominantSector?S.dominantSector.returnRate:0;
const prevR=qwPrevScannerSnap&&qwPrevScannerSnap.returnRate!=null?qwPrevScannerSnap.returnRate:rr;
if(prevR-rr>=10&&rr<48)return'Návraty už nie sú také silné.';
if(Q.flowLife&&Q.flowLife.phase==='WEAKENING')return'Dominancia stráca momentum.';
if(S.momentumState==='WEAKENING'||S.momentumState==='COLLAPSING')return'Dominancia slabne skôr než kolaps.';
return null;
}
function qwSectorLifeLine(S){
if(!S)return'';
const hot=(S.hotNums||[]).slice(0,4);
const dead=(S.deadNums||[]).slice(0,3);
const parts=[];
if(hot.length)parts.push('zahrieva: '+hot.join(' · '));
if(dead.length)parts.push('mŕtve: '+dead.join(' · '));
return parts.join(' · ')||'Sektory sa ešte formujú.';
}
function qwShouldSmartSilence(Q,st,S){
if(!S||S.waitMode||Q.flowBreak)return false;
const chaos=Q.chaosLevel||0;
if(chaos>=68)return false;
const pat=S.pat?S.pat.rate:50;
const osc=S.oscCol!=null?S.oscCol:50;
const rr=S.dominantSector?S.dominantSector.returnRate:0;
const ph=Q.flowLife&&Q.flowLife.phase;
if(pat<50&&osc>=56)return true;
if((ph==='QUIET'||ph==='EMERGING')&&rr<36&&chaos>=42)return true;
if(rr<30&&pat<55)return true;
return false;
}
function qwHumanizeComment(raw){
if(!raw)return'';
return skWheelUserText(String(raw)
.replace(/Return force:\s*/gi,'')
.replace(/WAIT MODE/gi,skFlow('WAIT MODE')||'REŽIM ČAKANIA')
.replace(/HIGH TRUST|LOW TRUST|NO TRUST/gi,'')
.trim());
}
function qwPlayerVoice(Q,st){
const S=Q.scanner;
const wait=S&&S.waitMode;
const chaos=Q.chaosLevel||0;
const silent=qwShouldSmartSilence(Q,st,S);
const transition=qwFlowTransitionHuman(Q);
const chaosEv=qwChaosEvolution(Q);
const sectorLife=qwSectorLifeLine(S);
const decay=qwDominanceDecay(Q,st,S);
const breath=qwFlowBreathClass(Q);
let comment='',rec='',playHead='',playSub='',silentUi=false;
if(wait){
playHead='🔴 ČAKAJ';playSub='Koleso nemá čitateľný flow';
rec='🎯 ČAKAJ — chaos alebo nestabilita';
comment=chaos>=65?'🔴 Wheel mení smer príliš často.':'🔴 Flow nie je pripravený na hru.';
}else if(silent){
silentUi=true;
playHead='⚪ SLEDOVANIE';playSub='Bez silného flow — počkaj';
rec='⚪ Momentálne bez silného flow.';
comment='⚪ Momentálne bez silného flow.';
}else{
const raw=Q.liveComment||(S?S.liveComment:'');
comment=qwHumanizeComment(raw);
if(decay&&!comment.includes(decay))comment='🟠 '+decay+(transition?' · '+transition:'');
else if(transition&&!comment.includes(transition.slice(0,12)))comment=(comment?comment+' · ':'')+transition;
if(S&&S.recovery&&S.recovery.active&&!comment.includes('zotav'))comment='🟢 Po chaose sa formuje nový flow.';
if(!comment)comment='🟠 Flow sa formuje — sleduj návraty.';
if(chaos>=58&&Q.confidence<50){
rec='🎯 OPATRNOSŤ — chaos '+chaos+'%';
playHead='🟠 OPATRNOSŤ';playSub='Odporúčania sú slabšie';
}else if(chaos>=52||Q.confidence<55){
rec=qwBuildRecommendation(S&&S.liveOutput?S.liveOutput:null,Q,st,false,true);
playHead='🟠 OPATRNOSŤ';playSub='Sleduj dominanciu, nepresadzuj';
}else{
rec=qwBuildRecommendation(S&&S.liveOutput?S.liveOutput:null,Q,st,false,false);
playHead='🟢 SLEDOVAJ';playSub='Koleso má čitateľný flow';
}
}
return{silent:silentUi,
comment:skWheelUserText(comment),rec:skWheelUserText(rec),
transition:skWheelUserText(transition),chaosEv:skWheelUserText(chaosEv),
sectorLife:skWheelUserText(sectorLife),decay:skWheelUserText(decay),
playHead,playSub:skWheelUserText(playSub)};
}
function qwBuildRecommendation(O,Q,st,wait,cautious){
if(wait)return'🎯 ČAKAJ — flow nie je pripravený';
const chaos=Q.chaosLevel||0;
if(cautious||chaos>=58)return'🎯 OPATRNOSŤ — sleduj koleso, nehraj naslepo';
if(chaos>=52&&Q.confidence<55)return'🎯 OPATRNOSŤ — chaos '+chaos+'%';
if(O&&O.columns&&O.columns.pick&&O.columns.pick!=='—'&&st.domCol>=0)
return'🎯 SLEDOVAŤ → '+(st.domCol+1)+'. stĺpec';
if(O&&O.color&&O.color.pick&&O.color.pick!=='—'&&!String(O.color.pick).includes('/'))
return'🎯 SLEDOVAŤ → '+O.color.pick;
if(O&&O.range&&O.range.pick&&String(O.range.pick).indexOf('/')<0)
return'🎯 SLEDOVAŤ → '+O.range.pick;
if(O&&O.parity&&O.parity.pick&&String(O.parity.pick).indexOf('/')<0)
return'🎯 SLEDOVAŤ → '+O.parity.pick;
if(O&&O.dozens&&O.dozens.pick&&O.dozens.pick!=='—')
return'🎯 SLEDOVAŤ → tucty '+O.dozens.pick;
if(Q.dominantSectorPath&&Q.dominantSectorPath!=='—')return'🎯 SLEDOVAŤ → sektor '+Q.dominantSectorPath;
return'🎯 SLEDOVAŤ → dominantný sektor';
}
function qwFlowRiskLabel(Q){
if(Q.flowBreak||Q.noEdge)return{val:'VYSOKÉ',cls:'redTxt',sub:'Flow nie je stabilný'};
if(Q.suppressed)return{val:'STREDNÉ',cls:'yellowTxt',sub:'Signál potlačený'};
const h=Q.wheelHealth||0;
if(h>=70)return{val:'NÍZKE',cls:'greenTxt',sub:'Flow je stabilný a zdravý'};
if(h>=45)return{val:'STREDNÉ',cls:'yellowTxt',sub:'Sleduj zmenu sektora'};
return{val:'VYSOKÉ',cls:'redTxt',sub:'Koleso stráca návraty'};
}
function qwLiveComment(Q,st){
return qwPlayerVoice(Q,st).comment;
}
function qwAtmosphereClass(Q){
if(Q.flowBreak)return'qw-atmos-break';
const rez=(Q.predRezim||'').toUpperCase();
const ph=Q.flowLife&&Q.flowLife.phase;
if(rez.indexOf('DEAD')>=0||ph==='DEAD')return'qw-atmos-dead';
if(rez.indexOf('WARNING')>=0||ph==='WEAKENING'||Q.suppressed)return'qw-atmos-warning';
if(rez.indexOf('ACTIVE')>=0||ph==='STRONG'||ph==='GROWING')return'qw-atmos-active';
if(ph==='QUIET')return'qw-atmos-dead';
return'qw-atmos-warning';
}
function qwAiInsightText(Q,st){
const col=st.domCol>=0?(st.domCol+1)+'. stĺpca':(Q.dominantColumn||'centra');
if(Q.flowBreak)return'flow sa práve láme — wheel hľadá nový smer.';
if(Q.flowMomentum&&Q.flowMomentum.label==='Slabne')return'edge flow slabne — návraty už nedržia.';
if(Q.flowMomentum&&Q.flowMomentum.label==='Rastie')return'návraty do '+col+' sa zintenzívňujú.';
if(Q.flowLife&&Q.flowLife.phase==='QUIET')return'wheel ešte nevytvára opakovaný flow.';
const pct=st.colPct[st.domCol]||0;
if(pct>=45)return'návraty do '+col+' sa opakujú.';
return'wheel sa začína vracať do '+col+'.';
}
let qwCanvasAnimId=null;
function qwStopCanvasAnim(){
if(qwCanvasAnimId){cancelAnimationFrame(qwCanvasAnimId);qwCanvasAnimId=null;}
}
let qwWheelResizeBound=false;
function qwBindWheelResize(){
if(qwWheelResizeBound)return;
qwWheelResizeBound=true;
window.addEventListener('resize',()=>{qwSyncWheelStageSize();},{passive:true});
const block=document.querySelector('.v6-block-wheel.v6-radar-v1');
if(block&&typeof ResizeObserver!=='undefined'){
new ResizeObserver(()=>{qwSyncWheelStageSize();}).observe(block);
}
}
function qwSyncWheelStageSize(){
const block=document.querySelector('.v6-block-wheel.v6-radar-v1');
if(!block)return;
const grow=block.querySelector('.qw-wheel-grow');
const center=block.querySelector('.qw-dash-center');
const stage=block.querySelector('.qw-wheel-stage');
const cv=document.getElementById('wheelCanvas');
const leg=center&&center.querySelector('.qw-flow-legend');
if(!grow||!stage||!cv)return;
const legH=leg?leg.offsetHeight+4:18;
const gw=grow.clientWidth||grow.getBoundingClientRect().width;
const gh=(grow.clientHeight||grow.getBoundingClientRect().height)-legH;
let size=Math.floor(Math.min(gw,gh));
if(size<80&&center){
const ch=center.clientHeight-legH;
const cw=center.clientWidth;
size=Math.floor(Math.min(cw,ch));
}
size=Math.max(200,Math.min(size,960));
const px=size+'px';
block.style.setProperty('--qw-canvas-px',px);
stage.style.setProperty('width',px,'important');
stage.style.setProperty('height',px,'important');
cv.style.setProperty('width',px,'important');
cv.style.setProperty('height',px,'important');
}
function qwStartCanvasAnim(){
if(qwCanvasAnimId)return;
let last=0;
function frame(ts){
const root=document.getElementById('wheelRadarData');
if(!root||!root.classList.contains('qw-ready')){qwStopCanvasAnim();return;}
if(ts-last>50){renderCanvasWheel();last=ts;}
qwCanvasAnimId=requestAnimationFrame(frame);
}
qwCanvasAnimId=requestAnimationFrame(frame);
}
function qwFlowPulse(Q){
const b=qwFlowBreathClass(Q);
if(b==='qw-breathe-nervous')return 0.45+0.22*Math.sin(performance.now()/900);
if(b==='qw-breathe-weak')return 0.38+0.1*Math.sin(performance.now()/3200);
if(b==='qw-breathe-calm')return 0.72+0.28*Math.sin(performance.now()/1600);
return 0.5+0.15*Math.sin(performance.now()/2400);
}
function qwFlowRadarSvgShell(){
return'<svg id="qwFlowRadarSvg" class="qw-flow-radar" viewBox="0 0 1080 1080" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
+'<defs><filter id="qwFlowGlow" x="-20%" y="-20%" width="140%" height="140%">'
+'<feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="b"/>'
+'<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
+'<circle class="qw-radar-scan" cx="540" cy="540" r="492"/>'
+'<g id="qwFlowBeams"></g>'
+'<g id="qwFlowSectorLabels"></g>'
+'<g class="qw-flow-core-wrap">'
+'<circle class="qw-flow-core-pulse" cx="540" cy="540" r="28"/>'
+'<circle class="qw-flow-core-glow" cx="540" cy="540" r="18" fill="none"/>'
+'<circle class="qw-flow-core-dot" cx="540" cy="540" r="6"/>'
+'</g></svg>';
}
function ensureQwFlowRadarSvg(){
const stage=document.querySelector('.v6-block-wheel .qw-wheel-stage')||document.querySelector('.qw-wheel-stage');
if(!stage||stage.querySelector('#qwFlowRadarSvg'))return;
stage.insertAdjacentHTML('beforeend',qwFlowRadarSvgShell());
}
function ensureQuantumWheelDashboardDOM(root){
const wantV1=!!(root.closest&&root.closest('.v6-radar-v1'));
const inBlock=!!(root.closest&&root.closest('.v6-block-wheel'));
const QW_DOM_BUILD='v4-wheel-vzor-inner-4';
const domOk=!!(root.querySelector('#wheelCanvas')&&root.querySelector('.qw-wheel-grow')
&&root.querySelector('#qwPanelLeft')&&root.querySelector('#qwPanelRight')&&root.querySelector('.qw-dash-bottom'));
if(root.dataset.qwDomBuild!==QW_DOM_BUILD||!domOk){
qwStopCanvasAnim();
root.innerHTML='';
root.dataset.qwDomBuild=QW_DOM_BUILD;
}
if(domOk&&root.querySelector('#wheelCanvas')&&(!wantV1||(root.querySelector('.qw-radar-v1')&&root.querySelector('#qwStatusBanner')))){
if(wantV1){
const stage=root.querySelector('.qw-wheel-stage');
if(stage&&!stage.querySelector('.qw-radar-rings')){
stage.insertAdjacentHTML('afterbegin',
'<svg class="qw-radar-rings" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
+'<circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0,255,191,0.1)" stroke-width="0.35"/>'
+'<circle cx="50" cy="50" r="36" fill="none" stroke="rgba(0,255,191,0.07)" stroke-width="0.28"/>'
+'<circle cx="50" cy="50" r="24" fill="none" stroke="rgba(0,255,191,0.05)" stroke-width="0.22"/>'
+'<line x1="50" y1="3" x2="50" y2="97" stroke="rgba(120,200,175,0.08)" stroke-width="0.2"/>'
+'<line x1="3" y1="50" x2="97" y2="50" stroke="rgba(120,200,175,0.08)" stroke-width="0.2"/>'
+'<line x1="14" y1="14" x2="86" y2="86" stroke="rgba(120,200,175,0.05)" stroke-width="0.18"/>'
+'<line x1="86" y1="14" x2="14" y2="86" stroke="rgba(120,200,175,0.05)" stroke-width="0.18"/>'
+'</svg>');
}
ensureQwFlowRadarSvg();
}
if(!wantV1){
const center=root.querySelector('.qw-dash-center');
if(center&&!root.querySelector('#qwEdgeBanner')){
const lo=root.querySelector('#qwLiveOutput');
const edge=document.createElement('div');
edge.id='qwEdgeBanner';edge.className='qw-edge-banner';
if(lo)center.insertBefore(edge,lo);else center.prepend(edge);
}
}
return;
}
const qwRadarRingsSvg=
'<svg class="qw-radar-rings" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
+'<circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0,255,191,0.1)" stroke-width="0.35"/>'
+'<circle cx="50" cy="50" r="36" fill="none" stroke="rgba(0,255,191,0.07)" stroke-width="0.28"/>'
+'<circle cx="50" cy="50" r="24" fill="none" stroke="rgba(0,255,191,0.05)" stroke-width="0.22"/>'
+'<line x1="50" y1="3" x2="50" y2="97" stroke="rgba(120,200,175,0.08)" stroke-width="0.2"/>'
+'<line x1="3" y1="50" x2="97" y2="50" stroke="rgba(120,200,175,0.08)" stroke-width="0.2"/>'
+'<line x1="14" y1="14" x2="86" y2="86" stroke="rgba(120,200,175,0.05)" stroke-width="0.18"/>'
+'<line x1="86" y1="14" x2="14" y2="86" stroke="rgba(120,200,175,0.05)" stroke-width="0.18"/>'
+'</svg>';
const hdrLeft=(inBlock&&wantV1)
?'<div class="qw-h-left">KVANTOVÉ KOLESO<small>LIVE FLOW ANALYZER</small></div>'
:'<div class="qw-h-left">KVANTOVÉ KOLESO<small>živý roulette radar · flow v reálnom čase</small></div>';
const hdrMid=(inBlock&&wantV1)
?'<div class="qw-h-center-badges">'
+'<span class="qw-badge-pill live"><span class="qw-live-dot"></span> LIVE ANALÝZA TOKU</span>'
+'<span class="qw-badge-pill muted">70/20/10 MODEL</span></div>'
:'<div class="qw-h-center-badges" aria-hidden="true">'
+'<span class="qw-badge-pill live"><span class="qw-live-dot"></span> LIVE</span></div>';
const hdrRight=(inBlock&&wantV1)
?'<div class="qw-h-right qw-h-status-row">'
+(wantV1?'<div class="qw-v1-status-banner wait" id="qwStatusBanner">REŽIM ČAKANIA</div>':'')
+'<span class="qw-h-ai-label">AI FLOW RADAR</span><span id="qwScannerBadge">—</span></div>'
:'<div class="qw-h-right qw-h-status-row">'
+(wantV1?'<div class="qw-v1-status-banner wait" id="qwStatusBanner">REŽIM ČAKANIA</div>':'')
+'<span id="qwScannerBadge">—</span></div>';
root.innerHTML=
'<div class="qw-dash-header" id="qwDashHeader">'
+hdrLeft+hdrMid+hdrRight
+'</div>'
+'<div class="qw-dash-body'+(wantV1?' qw-radar-v1':'')+'">'
+'<div class="qw-dash-main">'
+'<aside class="qw-dash-left" id="qwPanelLeft"></aside>'
+'<div class="qw-dash-center">'
+(wantV1?'<div class="qw-v1-sector-tag" id="qwSectorTag" hidden aria-hidden="true">—</div>':'')
+(wantV1?'':'<div class="qw-edge-banner" id="qwEdgeBanner"></div>'
+'<div class="qw-live-output qw-live-compact" id="qwLiveOutput"></div>')
+(inBlock&&wantV1?'<div class="qw-wheel-grow"><div class="qw-wheel-stage">':'<div class="qw-wheel-stage">')
+(wantV1?qwRadarRingsSvg:'')+'<canvas id="wheelCanvas" class="qw-v4-wheel-canvas" width="1080" height="1080"></canvas>'
+qwFlowRadarSvgShell()+'</div>'+(inBlock&&wantV1?'</div>':'')
+(wantV1&&inBlock?'<div class="qw-flow-legend" id="qwFlowLegend"></div>':'')
+(wantV1?'':'<div class="qw-intel-strip" id="qwIntelStrip"></div>'
+'<div class="qw-flow-intel" id="qwFlowIntel"></div>'
+'<div class="qw-scanner-bar" id="qwScannerBar"></div>'
+'<div class="qw-flow-legend" id="qwFlowLegend"></div>')
+'</div>'
+'<aside class="qw-dash-right" id="qwPanelRight"></aside>'
+'</div>'
+'<div class="qw-dash-bottom" id="qwPanelBottom"></div>'
+'</div>'
+(wantV1?(inBlock?'<footer class="qw-dash-model" id="qwPanelModel"></footer>':''):'<footer class="qw-dash-model" id="qwPanelModel"></footer>');
}
function qwPanelKicker(zone,title){
return'<div class="qw-panel-kicker" data-zone="'+zone+'">'+title+'</div>';
}
function qwMetric(lbl,val,sub,cls,accent,rec,barPct,hero){
let h='<div class="qw-metric'+(accent?' is-accent':'')+(rec?' is-rec':'')+(hero?' is-hero':'')+'">';
h+='<span class="qw-m-lbl">'+lbl+'</span>';
if(val)h+='<span class="qw-m-val '+(cls||'')+'">'+val+'</span>';
if(sub)h+='<span class="qw-m-sub">'+sub+'</span>';
if(barPct!=null&&!isNaN(barPct)){
h+='<div class="qw-m-bar"><div class="qw-m-bar-fill '+(cls||'')+'" style="width:'
+Math.min(100,Math.max(6,barPct))+'%"></div></div>';
}
return h+'</div>';
}
function qwMetricLive(lbl,text,cls,accent){
return'<div class="qw-metric'+(accent?' is-accent':'')+'">'
+'<span class="qw-m-lbl">'+lbl+'</span>'
+'<p class="qw-m-live">'+text+'</p></div>';
}
function qwMetricTrail(lbl,trailHtml,accent){
return'<div class="qw-metric qw-metric-trail'+(accent?' is-accent':'')+'">'
+'<span class="qw-m-lbl">'+lbl+'</span>'
+'<div class="qw-m-trail-body">'+trailHtml+'</div></div>';
}
function qwV1Card(lbl,hero,sub,cls,accent,barPct){
return qwMetric(lbl,hero,sub,cls,accent,lbl==='ODPORÚČANIE',barPct);
}
function buildQwScannerBarHTML(S){
if(!S)return'';
const qCls=S.flowQuality.label.indexOf('HIGH')>=0?'greenTxt':S.flowQuality.label.indexOf('LOW')>=0?'redTxt':'yellowTxt';
const rCls=S.flowRisk.label==='LOW RISK'?'greenTxt':S.flowRisk.label==='HIGH RISK'?'redTxt':'yellowTxt';
const aCls=S.alignment.status==='FLOW ALIGNED'?'greenTxt':'redTxt';
return'<span class="qw-sb"><b>CHAOS</b> <em class="'+(S.chaosLevel>=65?'redTxt':'yellowTxt')+'">'+S.chaosLevel+'%</em></span>'
+'<span class="qw-sb"><b>KVALITA</b> <em class="'+qCls+'">'+S.flowQuality.label.replace(' QUALITY','')+'</em></span>'
+'<span class="qw-sb"><b>STABILITA</b> <em>'+S.flowStability+'</em></span>'
+'<span class="qw-sb"><b>ALIGN</b> <em class="'+aCls+'">'+S.alignment.status.replace('FLOW ','')+'</em></span>'
+'<span class="qw-sb"><b>RIZIKO</b> <em class="'+rCls+'">'+S.flowRisk.label.replace(' RISK','')+'</em></span>'
+'<span class="qw-sb"><b>ZDRAVIE</b> <em>'+S.wheelHealth.label+'</em></span>';
}
function buildQwLiveOutputHTML(O,wait,edgeMsg,cs,chaos,scanner){
const edge=qwEdgeHeroStatus(cs||{state:'caution'},chaos,scanner);
const keys=['color','parity','range','dozens','columns'];
const edgeCls=wait||edgeMsg?'bad':edge.cls;
let h='<div class="qw-hero-edge-compact '+edgeCls+'">'+(edgeMsg||(wait?'🔴 REŽIM ČAKANIA':edge.text))+'</div>';
if(wait||edgeMsg)h+='<div class="qw-hero-wait-hint">⚠ Flow nejasný — sleduj wheel, nehraj naslepo</div>';
h+='<div class="qw-hero-strip">';
keys.forEach(k=>{
const f=O&&O[k]?O[k]:null;
if(!f)return;
const st=(wait||edgeMsg)?'state-danger':(f.state||'state-caution');
const pickDisp=(f.pick||'—').replace(/\s*\+\s*/g,' + ');
h+='<div class="qw-hero-cell '+st+'">'
+'<div class="ico">'+f.icon+'</div>'
+'<div class="lbl">'+f.label+'</div>'
+'<div class="pick">'+pickDisp+'</div>'
+'<div class="pct">'+(f.confidence!=null?f.confidence:'—')+'%</div></div>';
});
return h+'</div>';
}
function buildQwSupportStripHTML(S,Q){
if(!S)return'';
const dir=Q&&Q.flowDirHuman?Q.flowDirHuman:{main:'—',sub:''};
const dom=S.dominantSector||{};
return'<span class="qw-sb"><b>chaos</b> <em class="'+(S.chaosLevel>=60?'redTxt':'yellowTxt')+'">'+S.chaosLevel+'%</em></span>'
+'<span class="qw-sb"><b>návraty</b> <em class="greenTxt">'+(dom.returnRate||0)+'%</em></span>'
+'<span class="qw-sb"><b>migrácia</b> <em>'+skQw(dir.main)+'</em></span>'
+'<span class="qw-sb"><b>tlak</b> <em>'+(dom.strength||0)+'%</em></span>';
}
function qwBuildTrailMarkers(trace,st,Q){
const markers=[];
let prevCol=-1,prevPar=null,streakCol=0;
for(let i=0;i<trace.length;i++){
const n=trace[i],m={type:null,label:''};
if(n>0){
const c=columnIndexForNum(n);
if(c===prevCol&&c>=0){streakCol++;if(streakCol>=3)m.type='repeat';m.label='R';}
else{streakCol=1;prevCol=c;}
const par=n%2===0?'even':'odd';
if(prevPar&&par!==prevPar&&i>=2)m.type=m.type?'repeat':'rev';
prevPar=par;
if(st.domCol>=0&&c===st.domCol)m.type=m.type||'dom';
}
if(Q&&Q.scanner&&i===trace.length-1&&Q.scanner.chaosLevel>=60)m.type='chaos';
markers.push(m);
}
if(trace.length>=4){
const a=columnIndexForNum(trace[trace.length-2]),b=columnIndexForNum(trace[trace.length-1]);
if(a>=0&&b>=0&&a!==b)markers[markers.length-1].type=markers[markers.length-1].type||'mig';
}
return markers;
}
function buildQwTrailHTML(trace,st,Q){
const markers=qwBuildTrailMarkers(trace,st,Q);
let h='<div class="qw-trail-wrap">';
trace.forEach((n,i)=>{
const mk=markers[i];
const cls=qwSpinBallClass(n)+(st.domCol>=0&&n>0&&columnIndexForNum(n)===st.domCol?' qw-trail-dom':'');
let tm='';
if(mk&&mk.type==='repeat')tm='<span class="qw-tm repeat" title="opakovanie">R</span>';
else if(mk&&mk.type==='rev')tm='<span class="qw-tm rev" title="reversal">↺</span>';
else if(mk&&mk.type==='chaos')tm='<span class="qw-tm chaos" title="chaos">!</span>';
else if(mk&&mk.type==='mig')tm='<span class="qw-tm mig" title="migrácia">↔</span>';
else if(mk&&mk.type==='dom')tm='<span class="qw-tm dom" title="dominancia">D</span>';
h+='<span class="qw-trail-ball"><span class="qw-spin-ball '+cls+'">'+n+'</span>'+tm+'</span>';
});
return h+'</div>';
}
function qwFnCard(title,icon,body,opts){
opts=opts||{};
return'<article class="qw-fn-card'+(opts.accent?' is-accent':'')+'">'
+'<header class="qw-fn-head">'+(icon?'<span class="qw-fn-ico">'+icon+'</span>':'')+'<h3 class="qw-fn-title">'+title+'</h3>'
+(opts.ring!=null?'<div class="qw-fn-ring" style="--pct:'+opts.ring+'"></div>':'')
+'</header><div class="qw-fn-body">'+body+'</div></article>';
}
function qwMomBlock(Q){
const m=Q.flowMomentum||{label:'—',cls:'yellowTxt'};
const map={'Rastie':'RASTIE','Drží':'DRŽÍ','Slabne':'KLESÁ','Stagnuje':'DRŽÍ','Bez pokračovania':'KLESÁ'};
const val=map[m.label]||String(m.label).toUpperCase();
let sub='';
if(m.label==='Rastie')sub='Návraty silnejú';
else if(m.label==='Slabne')sub='Návraty slabnú';
else if(m.label==='Drží')sub='Tlak drží';
return{val,sub,cls:m.cls||'yellowTxt'};
}
function qwDomBarsHTML(pctArr,domIdx,labels){
let h='<div class="qw-dom-bars">';
for(let i=0;i<3;i++){
const p=pctArr[i]||0;
h+='<div class="qw-dom-bar-row'+(i===domIdx?' dom':'')+'">'
+'<span class="lbl">'+labels[i]+'</span>'
+'<div class="bar"><div class="fill" style="width:'+Math.max(5,p)+'%"></div></div>'
+'<b class="pct'+(i===domIdx?' greenTxt':'')+'">'+p+'%</b></div>';
}
return h+'</div>';
}
function buildQuantumWheelLeftHTML(Q,st){
const fs=qwFlowStateSimple(Q);
const mom=qwMomBlock(Q);
const dir=qwDirDisplay(Q);
const reg=qwFlowRegimeDisplay(Q);
const voice=qwPlayerVoice(Q,st);
const flowPct=fs.ring!=null?fs.ring:(100-(Q.chaosLevel||50));
return qwPanelKicker('flow','FLOW OBSERVER')
+'<div class="qw-metric-stack qw-stack-flow">'
+qwMetric('FLOW STAV',fs.val,fs.sub,fs.cls,true,false,flowPct,true)
+qwMetric('MOMENTUM',mom.val,mom.sub,mom.cls)
+qwMetric('SMER TOKU',dir.main,dir.sub,'blueTxt')
+qwMetric('REŽIM',voice.playHead||reg.val,voice.playSub||reg.sub,reg.cls,false)
+'</div>';
}
function qwChaosRiskLine(Q,S){
const chaos=Q.chaosLevel||0;
const risk=qwFlowRiskLabel(Q);
const ev=qwChaosEvolution(Q);
const cls=chaos>=65?'redTxt':chaos>=50?'yellowTxt':'greenTxt';
const evTxt=(ev.sub||ev.head||'').replace(/^[^\s]+\s*/,'').replace(/^\s*·\s*/,'');
return{chaos,risk,cls,ev,line:'Chaos '+chaos+'% · '+(evTxt||risk.sub)};
}
function buildQuantumWheelRightHTML(Q,st){
const voice=qwPlayerVoice(Q,st);
const rec=(voice.rec||'Sleduj koleso').replace(/^🎯\s*/,'');
const colN=st.domCol>=0?(st.domCol+1)+'. STĹPEC':'—';
const colP=st.domCol>=0?st.colPct[st.domCol]:0;
const dozN=st.domDoz>=0?(st.domDoz+1)+'. TUCET':'—';
const dozP=st.domDoz>=0?st.dozPct[st.domDoz]:0;
const stab=qwFlowStabilityDisplay(Q,Q.scanner);
const chaosPct=Q.chaosLevel||0;
const O=Q.scanner&&Q.scanner.liveOutput?Q.scanner.liveOutput:null;
const colorPick=O&&O.color?qwFmtPick(O.color.pick):'—';
const colorPct=O&&O.color&&O.color.confidence!=null?O.color.confidence:0;
const recCls=(voice.playHead&&voice.playHead.indexOf('ČAKAJ')>=0)?'redTxt':'greenTxt';
const risk=qwFlowRiskLabel(Q);
return qwPanelKicker('dom','DOMINANCE · VÝSLEDKY')
+'<div class="qw-metric-stack qw-stack-dom">'
+qwMetric('DOMINANTNÝ STĹPEC',colN,colP+'% tlak','greenTxt',true,false,colP)
+qwMetric('DOMINANTNÝ TUCET',dozN,dozP+'%','greenTxt',false,false,dozP)
+qwMetric('DOMINANTNÁ FARBA',colorPick,(colorPct?colorPct+'%':'—'),'yellowTxt',false,false,colorPct||null)
+qwMetric('CHAOS / STABILITA',stab.val,'Chaos '+chaosPct+'%',stab.cls,false,false,Math.max(0,100-chaosPct))
+qwMetric('RIZIKO FLOW',risk.val,risk.sub,risk.cls,false)
+qwMetric('ODPORÚČANIE',rec,voice.playSub||'',recCls,false,true)
+'</div>';
}
function buildQuantumWheelCommandStripHTML(Q,st){
const fs=qwFlowStateSimple(Q);
const voice=qwPlayerVoice(Q,st);
const rec=(voice.rec||'Sleduj koleso').replace(/^🎯\s*/,'');
const colN=st.domCol>=0?(st.domCol+1)+'. STĹPEC':'—';
const colP=st.domCol>=0?st.colPct[st.domCol]:0;
const live=qwLiveRadarComment(Q,st);
return'<div class="qw-cmd-grid">'
+'<div class="qw-cmd-cell"><div class="qw-cmd-lbl">FLOW STAV</div><div class="qw-cmd-big '+fs.cls+'">'+fs.val+'</div><div class="qw-cmd-sub">'+fs.sub+'</div></div>'
+'<div class="qw-cmd-cell is-accent"><div class="qw-cmd-lbl">DOMINANTNÝ FLOW</div><div class="qw-cmd-big greenTxt">'+colP+'%</div><div class="qw-cmd-sub">'+colN+'</div></div>'
+'<div class="qw-cmd-cell"><div class="qw-cmd-lbl">ODPORÚČANIE</div><div class="qw-cmd-rec">'+rec+'</div></div>'
+'</div><p class="qw-cmd-live">'+live+'</p>';
}
function buildQuantumWheelBottomHTML(Q,st){
const live=qwLiveRadarComment(Q,st);
const risk=qwFlowRiskLabel(Q);
const voice=qwPlayerVoice(Q,st);
const rec=(voice.rec||'Sleduj koleso').replace(/^🎯\s*/,'');
const recCls=(voice.playHead&&voice.playHead.indexOf('ČAKAJ')>=0)?'redTxt':'greenTxt';
const trace=spins.slice(-15);
const trail=trace.length?buildQwTrailHTML(trace,st,Q):'<span class="qw-v1-muted">Zatiaľ bez stopy</span>';
return'<div class="qw-bottom-grid qw-bottom-vzor">'
+'<div class="qw-bottom-cell qw-bottom-trail">'
+qwPanelKicker('trail','STOPA TOKU')
+'<div class="qw-bottom-trail-body">'+trail+'</div></div>'
+'<div class="qw-bottom-cell qw-bottom-voice">'
+qwPanelKicker('voice','SYSTÉMOVÝ HLAS · LIVE')
+'<p class="qw-bottom-live">'+live+'</p></div>'
+'<div class="qw-bottom-cell qw-bottom-risk">'
+qwPanelKicker('risk','RIZIKO FLOW')
+'<div class="qw-bottom-risk-val '+risk.cls+'">'+risk.val+'</div>'
+'<div class="qw-bottom-risk-sub">'+risk.sub+'</div></div>'
+'<div class="qw-bottom-cell qw-bottom-rec">'
+qwPanelKicker('dom','ODPORÚČANIE')
+'<div class="qw-bottom-rec-val '+recCls+'">'+rec+'</div></div>'
+'</div>';
}
function buildQuantumWheelModelFootHTML(){
return'<div class="blk"><span>70% spiny</span><b>návraty · patterny · pamäť</b></div>'
+'<div class="blk"><span>20% timing</span><b>rytmus · stabilita · sync</b></div>'
+'<div class="blk"><span>10% vizuál</span><b>sektory · tok · koleso</b></div>'
+'<span class="ai-engine">ŽIVÝ RADAR TOKU — adaptívny systém</span>';
}
function renderWheelRadar(){
const root=document.getElementById('wheelRadarData');
if(!root)return;
const Q=computeQuantumWheelBrain();
if(!Q.ready){
qwStopCanvasAnim();
root.className='qw-dashboard';
root.innerHTML='<div class="qw-dash-wait">Zadaj 2+ spiny — wheel ukáže kam sa vracia…</div>';
return;
}
ensureQuantumWheelDashboardDOM(root);
const at=qwAtmosphereClass(Q);
const atUi=qwAtmosphereUiClass(Q);
const chaos={chaosLevel:Q.chaosLevel,noEdge:Q.noEdge};
const cs=qwColorState(Q.scanner,chaos,Q);
const edgeTxt=qwEdgeBannerText(cs.edge,Q.scanner&&Q.scanner.priority,chaos);
const chaosSess=qwIsChaosSession(Q,chaos);
const st=qwColDozStats();
const voice=qwPlayerVoice(Q,st);
const breath=chaosSess?'':voice.breath;
root.className='qw-dashboard qw-radar-cmd qw-ready '+at+' '+atUi+' '+cs.cls+(breath?' '+breath:'')+(chaosSess?' qw-chaos-session':'');
const left=document.getElementById('qwPanelLeft');
const right=document.getElementById('qwPanelRight');
const bottom=document.getElementById('qwPanelBottom');
const model=document.getElementById('qwPanelModel');
const leg=document.getElementById('qwFlowLegend');
const intel=document.getElementById('qwFlowIntel');
const inV6=root.closest&&root.closest('.v6-block-wheel');
const inV1=root.closest&&root.closest('.v6-radar-v1');
if(left)left.innerHTML=buildQuantumWheelLeftHTML(Q,st);
if(right)right.innerHTML=buildQuantumWheelRightHTML(Q,st);
if(bottom)bottom.innerHTML=buildQuantumWheelBottomHTML(Q,st);
const sectorTag=document.getElementById('qwSectorTag');
if(sectorTag){
const path=Q.dominantSectorPath&&Q.dominantSectorPath!=='—'?Q.dominantSectorPath:(Q.dominantSector||'—');
sectorTag.textContent='Sektor: '+path;
}
const statusBanner=document.getElementById('qwStatusBanner');
if(statusBanner){
const fs=qwFlowStateSimple(Q);
const wait=Q.scanner&&Q.scanner.waitMode;
if(wait||chaosSess){
statusBanner.className='qw-v1-status-banner wait';
statusBanner.textContent=wait?'REŽIM ČAKANIA — flow nie je pripravený':('REŽIM ČAKANIA — edge je slabý');
}else if(cs.state==='green'){
statusBanner.className='qw-v1-status-banner ok';
statusBanner.textContent='FLOW DRŽÍ — '+fs.val;
}else{
statusBanner.className='qw-v1-status-banner caution';
statusBanner.textContent=(edgeTxt&&edgeTxt.length<72)?edgeTxt:('OPATRNOSŤ — '+fs.val);
}
}
if(model)model.innerHTML=inV6?buildQuantumWheelModelFootHTML():'';
if(intel)intel.innerHTML=(inV1||inV6)?'':qwBuildFlowIntelStrip(Q,st);
if(leg)leg.innerHTML=(inV1||inV6)?
'<span><i class="qw-leg-line strong"></i> SILNÝ FLOW</span>'
+'<span><i class="qw-leg-line mid"></i> STREDNÝ FLOW</span>'
+'<span><i class="qw-leg-line weak"></i> SLABÝ FLOW</span>':
('<span><i class="qw-leg-line strong"></i> silný flow</span>'
+'<span><i class="qw-leg-line mid"></i> stredný flow</span>'
+'<span class="qw-leg-mig">↝ migrácia</span>');
const bar=document.getElementById('qwScannerBar');
if(bar)bar.innerHTML='';
const edge=document.getElementById('qwEdgeBanner');
if(edge){edge.className='qw-edge-banner';edge.textContent='';}
const lo=document.getElementById('qwLiveOutput');
if(lo&&!inV1&&Q.scanner&&Q.scanner.liveOutput)lo.innerHTML=buildQwLiveOutputHTML(Q.scanner.liveOutput,Q.scanner.waitMode,edgeTxt,cs,chaos,Q.scanner);
const chips=document.getElementById('qwIntelStrip');
if(chips)chips.innerHTML=(inV1||inV6)?'':qwBuildIntelChips(Q,st);
const badge=document.getElementById('qwScannerBadge');
if(badge){
if(chaosSess||Q.scanner&&Q.scanner.waitMode){badge.textContent='REŽIM ČAKANIA';badge.className='redTxt';}
else if(cs.state==='green'){badge.textContent='FLOW DRŽÍ';badge.className='greenTxt';}
else{badge.textContent='OPATRNOSŤ';badge.className='yellowTxt';}
}
qwBindWheelResize();
qwSyncWheelStageSize();
qwStartCanvasAnim();
requestAnimationFrame(()=>{
qwSyncWheelStageSize();
requestAnimationFrame(qwSyncWheelStageSize);
});
}
function renderPressureGraph(){

const pressureGraphEl=
document.getElementById(
'pressureGraph'
);

if(!pressureGraphEl)return;

const cluster=getClusters()[0];
const vb=lastVisualBreakdown;

pressureGraphEl.innerHTML=`
<div class="panel-line">
<span>ŽIVÝ TLAK</span>
<b class="greenTxt">${cluster.score.toFixed(2)}</b>
</div>
<div class="panel-line">
<span>VISUAL TLAK</span>
<b class="yellowTxt">${vb.pressure}%</b>
</div>
<div class="bar">
<div class="fill" style="width:${Math.min(100,cluster.score*3)}%"></div>
</div>
`;

}

/* ======================================
ALERTS
====================================== */

function renderAlerts(){
const alertsEl=document.getElementById('alerts');
if(!alertsEl)return;
const O=computeRouletteObserverUI();
let html='<div class="ro-observer ro-observer-dash'+(O.ready?'':' ro-empty')+'">';
const badgeCls=O.badge.c==='ro-badge-pause'?'redTxt':O.badge.c==='ro-badge-warn'?'yellowTxt':'greenTxt';
html+='<div class="panel-line"><span>Režim</span><b class="'+badgeCls+'">'+O.badge.t+'</b></div>';
if(O.mainDirections&&O.mainDirections.length){
const vis=O.mainDirections.filter(d=>d.val&&d.val!=='—');
if(vis.length){
html+='<div class="ro-main-output'+(O.mainDirMuted?' ro-muted':'')+'">';
html+='<div class="section-label">'+(O.mainDirTitle||'Najsilnejší tlak z histórie')+'</div>';
vis.forEach(d=>{
html+='<div class="panel-line"><span>'+d.ico+' '+d.label+'</span><b>'+d.val+'</b></div>';
});
html+='<p class="timing-hint ro-dir-disclaimer">'+((O.dirDisclaimer)||RO_DIR_DISCLAIMER)+'</p></div>';
}
}
html+='<div class="section-label">Pozorovanie</div>';
html+='<div class="ro-hero '+(O.heroCls||'')+'"><div class="panel-line"><span>Záver</span><b>'+skWheelUserText(O.hero)+'</b></div></div>';
if(O.advice)html+='<div class="panel-line ro-advice"><span>Odporúčanie</span><b class="yellowTxt">'+skWheelUserText(O.advice)+'</b></div>';
if(O.sentences&&O.sentences.length){
html+='<div class="section-label">Stav session</div><ul class="ro-sentences">';
O.sentences.forEach(s=>{
const bcls=s.t==='warn'?'yellowTxt':s.t==='bad'?'redTxt':'greenTxt';
const mark=s.t==='ok'?'🟢 ':s.t==='warn'?'🟠 ':s.t==='bad'?'🔴 ':'';
html+='<li class="panel-line"><span>'+mark+'Stav</span><b class="'+bcls+'">'+skWheelUserText(s.x)+'</b></li>';
});
html+='</ul>';
}else if(O.ready&&O.focus!=='learning'){
html+='<p class="timing-hint ro-foot">Momentálne nevidím ďalší stabilný tok na komentár.</p>';
}
if(O.aiNote)html+='<p class="timing-hint ro-ai">'+skWheelUserText(O.aiNote)+'</p>';
if(O.memory)html+='<p class="timing-hint ro-memory">'+skWheelUserText(O.memory)+'</p>';
if(O.foot)html+='<p class="timing-hint ro-foot">'+skWheelUserText(O.foot)+'</p>';
html+='</div>';
alertsEl.innerHTML=html;
}
function renderSpinEngine(){
const el=document.getElementById('spinEngine');
if(!el)return;
el.style.display=spins.length>=2?'block':'none';
if(spins.length<2){el.innerHTML='<div class="section-label">SPINY 70% · TOK</div><div class="panel-line"><span>Stav</span><b class="yellowTxt">Čakám na 2+ spiny</b></div>';return;}
const SE=runSpinsEnginePipeline(),F=computeFlowAnalyzer();
if(!SE.ready){el.innerHTML='<div class="panel-line">Pripravujem…</div>';return;}
const mig=SE.migration,ch=SE.chaos,cl=SE.cluster;
let html='<div class="section-label">ENGINE SPINOV 70% · TOK</div>';
html+='<div class="panel-line"><span>Stav</span><b class="'+SE.playState.cls+'">'+SE.playState.state+' · '+SE.playState.play+'</b></div>';
html+='<div class="panel-line"><span>Skóre flow</span><b class="greenTxt">'+SE.liveScore+'%</b></div>';
html+='<div class="panel-line"><span>Migrácia</span><b class="blueTxt">'+sk(mig.dir)+'</b></div>';
html+='<div class="panel-line"><span>Klaster</span><b class="yellowTxt">'+Math.round(cl.pressure)+'%</b></div>';
html+='<div class="panel-line"><span>Chaos</span><b class="'+(ch.noEdge?'redTxt':'greenTxt')+'">'+sk(ch.tag)+' · '+ch.chaosLevel+'%</b></div>';
if(F)html+='<div class="panel-line"><span>Fokus pásma</span><b class="greenTxt">'+F.sectorFocus.nums.join(' · ')+'</b></div>';
html+='<div class="alert" style="font-size:11px">'+FLOW_DISCLAIMER+'</div>';
el.innerHTML=html;
}

let lastWheelPressureEngine=null;
let lastWheelPressureKey='';
function invalidateWheelPressureCache(){
lastWheelPressureEngine=null;
lastWheelPressureKey='';
}
function computeWheelPressureEngine(){
const key=spins.length+'|'+(spins[spins.length-1]??'');
if(lastWheelPressureEngine&&lastWheelPressureKey===key)return lastWheelPressureEngine;
const empty={
modelLabel:'Tlak kolesa · kvantum · klaster · migrácia',
sources:'Kvantové koleso · tlak klastra · migrácia',
dominantPressure:0,
activeSector:null,
clusterIntensity:0,
migration:{dir:'—',label:'—'}
};
if(!spins.length){lastWheelPressureEngine=empty;lastWheelPressureKey=key;return empty;}
const w=computeWheelSectorIntel();
const clusters=getClusters();
const top=clusters[0]||{score:0,nums:[]};
const second=clusters[1]||{score:0};
const maxRef=weightedTotal()*5;
const clusterIntensity=Math.round(normPct(top.score,maxRef));
const clusterLead=top.score>0?Math.round(((top.score-second.score)/top.score)*100):0;
const dom=w.dominant;
const dominantPressure=Math.round(
dom?(dom.wheelConfidence!=null?dom.wheelConfidence:(dom.displayPct!=null?dom.displayPct:dom.pct)):w.wheelPressure
);
const last=lastSpinNum();
const activeSector=dom?{
nums:dom.nums,
center:dom.nums[2],
pct:+(dom.displayPct!=null?dom.displayPct:dom.pct).toFixed(1),
hits:dom.hits,
confidence:dom.wheelConfidence||0,
active:last!=null&&dom.nums.includes(last)
}:null;
const result={
modelLabel:'Tlak kolesa · kvantum · klaster · migrácia',
sources:'Kvantové koleso · tlak klastra · migrácia',
dominantPressure,
activeSector,
clusterIntensity,
clusterScore:+(top.score||0).toFixed(2),
clusterNums:top.nums||[],
clusterLead,
migration:w.migration,
wheelPressure:w.wheelPressure,
visualPressure:w.visualPressure||lastVisualBreakdown.pressure,
neighborIntensity:w.neighborIntensity
};
lastWheelPressureEngine=result;
lastWheelPressureKey=key;
return result;
}

/* ======================================
PRESSURE
====================================== */

function renderPressure(){
const pressureEl=document.getElementById('pressure');
if(!pressureEl)return;
if(!spins.length){
pressureEl.innerHTML='<div class="alert">Čakám na spiny — tlak kolesa…</div>';
return;
}
const p=computeWheelPressureEngine();
const a=p.activeSector;
const m=p.migration;
pressureEl.innerHTML=
'<div class="section-label">'+p.modelLabel+'</div>'
+'<div class="panel-line"><span>Zdroje</span><b style="font-size:11px">'+p.sources+'</b></div>'
+'<div class="panel-line"><span>Dominantný tlak</span><b class="greenTxt">'+p.dominantPressure+'%</b></div>'
+'<div class="panel-line"><span>Kvantové koleso</span><b class="blueTxt">'+p.wheelPressure+'% · vizuál '+p.visualPressure+'%</b></div>'
+'<div class="section-label">'+skUiLabel('Active sector')+'</div>'
+(a
?'<div class="panel-line"><span>Pás · stred</span><b class="yellowTxt">'+a.nums.join(' · ')+' · '+a.center+'</b></div>'
+'<div class="panel-line"><span>Podiel · zásahy</span><b class="greenTxt">'+a.pct+'% · '+a.hits+'/'+spins.length+(a.active?' · '+skUiLabel('ACTIVE'):'')+'</b></div>'
:'<div class="panel-line"><span>Sektor</span><b>—</b></div>')
+'<div class="section-label">'+skUiLabel('Cluster intensity')+'</div>'
+'<div class="panel-line"><span>Intenzita klaster</span><b class="greenTxt">'+p.clusterIntensity+'%</b></div>'
+'<div class="panel-line"><span>Klaster #1</span><b class="blueTxt">'+p.clusterScore+' · '+p.clusterNums.join(' · ')+'</b></div>'
+'<div class="panel-line"><span>Náskok #2</span><b class="yellowTxt">'+p.clusterLead+'%</b></div>'
+'<div class="section-label">Migrácia</div>'
+'<div class="panel-line"><span>Smer</span><b class="blueTxt">'+m.dir+'</b></div>'
+'<div class="panel-line"><span>Tok</span><b style="font-size:11px">'+sk(m.label)+'</b></div>'
+'<div class="metric"><div class="metric-label"><span>Tlak</span><b>'+p.dominantPressure+'%</b></div><div class="bar"><div class="fill" style="width:'+Math.min(100,p.dominantPressure)+'%"></div></div></div>';
}
/* ======================================
RECOMMENDATION
====================================== */

function renderRecommendation(){
const recommendationEl=document.getElementById('recommendation');
if(!recommendationEl)return;
const pr=computeAIPrediction();
if(!pr){
recommendationEl.innerHTML='<div class="panel-line"><span>Predikcia</span><b>—</b></div>';
return;
}
if(shouldSuppressUI('aggressive')){
recommendationEl.innerHTML='<div class="suppressed-msg">Signál potlačený — filter chaos/riziko</div>';
}else{
recommendationEl.innerHTML=
'<div class="panel-line"><span>AI cieľ</span><b class="yellowTxt">'+(pr.dominantTarget||pr.sector||'—')+'</b></div>'
+'<div class="panel-line"><span>Sektor</span><b class="blueTxt">'+pr.sector+'</b></div>'
+'<div class="panel-line"><span>Spoľahlivosť</span><b class="greenTxt">'+pr.confidence+'%</b></div>';
}
}

/* ======================================
AI SCORE
====================================== */

function renderAIScore(){
const aiScoreEl=document.getElementById('aiScore');
if(!aiScoreEl)return;
const pr=computeAIPrediction();
const score=pr?pr.confidence:0;
if(shouldSuppressUI('lowConf')){aiScoreEl.innerHTML='<div class="suppressed-msg">Skóre skryté — nízka spoľahlivosť alebo chaos</div>';return;}
const detail=shouldSuppressUI('detail')?'':'<div class="panel-line"><span>SPINY · TIMING · VIZUÁL</span><b class="blueTxt">'+(pr?pr.spinCore:'—')+' · '+(pr?pr.timingCore:'—')+' · '+(pr?pr.visualCore:'—')+'</b></div>';
aiScoreEl.innerHTML='<div class="panel-line"><span>SILA PREDIKCIE</span><b class="greenTxt">'+score+'%</b></div>'+detail+'<div class="bar"><div class="fill" style="width:'+score+'%"></div></div>';
}

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
+'<div class="panel-line"><span>Rad neúspechov</span><b class="'+(s.failStreak>=2?'redTxt':'greenTxt')+'">'+s.failStreak+'×</b></div>'
+(s.prediction?'<div class="panel-line"><span>Tip</span><b class="blueTxt">'+s.prediction.tip+'</b></div>':'');
}
}
function renderAccuracy(){renderStrategy();}

/* ======================================
CANVAS WHEEL
====================================== */

function numSectorRole(num,dom,weak,pot){
if(dom&&dom.nums.includes(num))return'dom';
if(pot&&pot.nums.includes(num))return'pot';
if(weak&&weak.nums.includes(num))return'weak';
return'base';
}
function wheelPocketBase(num){
if(num===0)return{fill:'#0f9d52',stroke:'#065a32',rim:'#5ee09a'};
if(reds.includes(num))return{fill:'#c41e3a',stroke:'#7a1220',rim:'#ff6b6b'};
return{fill:'#181820',stroke:'#0a0a10',rim:'#8a8a98'};
}
function qwEuroPocketStyle(num,lastN){
const base=wheelPocketBase(num);
if(num!==lastN)return base;
if(num===0)return{fill:'#14b864',stroke:'#087040',rim:'#7dffc0'};
if(reds.includes(num))return{fill:'#e02840',stroke:'#901020',rim:'#ff9090'};
return{fill:'#282830',stroke:'#101018',rim:'#b0b0c0'};
}
function drawQwEuropeanWheelShape(ctx,cx,cy,outerR,segment,lastN){
const pocketOut=outerR;
const pocketIn=outerR*0.755;
const rimOut=outerR;
const rimIn=outerR*0.968;
const hubR=outerR*0.13;
ctx.save();
ctx.beginPath();
ctx.arc(cx,cy,rimOut,0,Math.PI*2);
ctx.arc(cx,cy,rimIn,0,Math.PI*2,true);
ctx.closePath();
const rimG=ctx.createLinearGradient(cx-rimOut,cy-rimOut,cx+rimOut,cy+rimOut);
rimG.addColorStop(0,'#3a4854');rimG.addColorStop(0.5,'#1e2830');rimG.addColorStop(1,'#3a4854');
ctx.fillStyle=rimG;ctx.fill();
ctx.strokeStyle='rgba(0,0,0,0.65)';ctx.lineWidth=1.5;ctx.stroke();
for(let i=0;i<wheel.length;i++){
const num=wheel[i];
const start=i*segment-Math.PI/2;
const end=start+segment;
const st=qwEuroPocketStyle(num,lastN);
ctx.beginPath();
ctx.arc(cx,cy,pocketOut,start,end);
ctx.arc(cx,cy,pocketIn,end,start,true);
ctx.closePath();
ctx.fillStyle=st.fill;
ctx.fill();
ctx.strokeStyle=st.stroke;
ctx.lineWidth=1.15;
ctx.stroke();
ctx.beginPath();
ctx.moveTo(cx+Math.cos(start)*pocketIn,cy+Math.sin(start)*pocketIn);
ctx.lineTo(cx+Math.cos(start)*pocketOut,cy+Math.sin(start)*pocketOut);
ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=0.9;ctx.stroke();
}
ctx.beginPath();ctx.arc(cx,cy,pocketIn,0,Math.PI*2);
ctx.strokeStyle='rgba(0,0,0,0.55)';ctx.lineWidth=2.2;ctx.stroke();
ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=1;ctx.stroke();
const hg=ctx.createRadialGradient(cx,cy,hubR*0.15,cx,cy,hubR);
hg.addColorStop(0,'#243038');hg.addColorStop(1,'#080c10');
ctx.beginPath();ctx.arc(cx,cy,hubR,0,Math.PI*2);
ctx.fillStyle=hg;ctx.fill();
ctx.strokeStyle='rgba(90,150,140,0.35)';ctx.lineWidth=1.4;ctx.stroke();
ctx.restore();
}
function drawQwVzorInnerGrid(ctx,cx,cy,rOut,visDim){
ctx.save();
ctx.globalAlpha=0.42*visDim;
for(let i=1;i<=3;i++){
const r=rOut*(0.28+i*0.22);
ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
ctx.strokeStyle='rgba(55,170,210,0.1)';ctx.lineWidth=0.9;ctx.stroke();
}
for(let i=0;i<6;i++){
const a=-Math.PI/2+i*(Math.PI/3);
ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*rOut*0.14,cy+Math.sin(a)*rOut*0.14);
ctx.lineTo(cx+Math.cos(a)*rOut*0.97,cy+Math.sin(a)*rOut*0.97);
ctx.strokeStyle='rgba(70,210,255,0.22)';ctx.lineWidth=1.05;ctx.stroke();
}
ctx.restore();
}
function drawQwVzorGoldBand(ctx,cx,cy,pocketIn){
const bandOut=pocketIn*1.022,bandIn=pocketIn*0.992;
ctx.save();
ctx.beginPath();ctx.arc(cx,cy,bandOut,0,Math.PI*2);ctx.arc(cx,cy,bandIn,0,Math.PI*2,true);ctx.closePath();
const g=ctx.createLinearGradient(cx-bandOut,cy-bandOut,cx+bandOut,cy+bandOut);
g.addColorStop(0,'#6a5840');g.addColorStop(0.35,'#a89058');g.addColorStop(0.55,'#c4a86a');g.addColorStop(1,'#5a4830');
ctx.fillStyle=g;ctx.fill();
ctx.strokeStyle='rgba(0,0,0,0.45)';ctx.lineWidth=1;ctx.stroke();
ctx.restore();
}
/** Popisy STĹPEC/TUCET na canvas — vždy viditeľné (vzor obr.2) */
function drawQwVzorLabelsCanvas(ctx,cx,cy,rLbl,st,canvasW){
const sc=Math.max(0.72,Math.min(1.15,(canvasW||1080)/1080));
ctx.save();
ctx.textAlign='center';
ctx.textBaseline='middle';
QW_VZOR_LABEL_SLOTS.forEach(slot=>{
const x=cx+Math.cos(slot.ang)*rLbl,y=cy+Math.sin(slot.ang)*rLbl;
const dom=slot.kind==='col'?(slot.idx===st.domCol):(slot.idx===st.domDoz);
const pct=Math.round(slot.kind==='col'?(st.colPct[slot.idx]||0):(st.dozPct[slot.idx]||0));
const title=slot.prefix+' '+(slot.idx+1);
const lblY=y-(dom?24:20),pctY=y+(dom?16:12),domY=y+48;
ctx.font='700 '+Math.round(18*sc)+'px Segoe UI,Arial,sans-serif';
drawWheelTextOutlined(ctx,title,x,lblY,'#eef4f8',3);
ctx.font=(dom?'900 ':'800 ')+Math.round((dom?46:30)*sc)+'px Segoe UI,Arial,sans-serif';
drawWheelTextOutlined(ctx,pct+'%',x,pctY,dom?'#8cff9a':'#ffffff',dom?4:3.5);
if(dom){
ctx.font='700 '+Math.round(10*sc)+'px Segoe UI,Arial,sans-serif';
drawWheelTextOutlined(ctx,'DOMINANTNÝ',x,domY,'#8cff9a',2);
}
});
ctx.restore();
}
/** Vnútorné koleso — celá grafika vzor obr.2 (bez popisov) */
function drawQwVzorWheelInner(ctx,cx,cy,outerR,segment,st,deadCols,pulse,visDim,chaosSess,lastN,hm,coreState){
const hubR=outerR*0.14;
const pocketIn=outerR*0.755;
const segIn=hubR*0.85,segOut=pocketIn*0.98;
ctx.save();
const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,pocketIn);
bg.addColorStop(0,'#03060a');bg.addColorStop(0.5,'#070d14');bg.addColorStop(1,'#0a1218');
ctx.fillStyle=bg;ctx.beginPath();ctx.arc(cx,cy,pocketIn,0,Math.PI*2);ctx.fill();
ctx.restore();
drawQwVzorSixSegmentHub(ctx,cx,cy,segIn,segOut,st,pulse,visDim,chaosSess);
if(!chaosSess)drawQwVzorInnerGrid(ctx,cx,cy,segOut,visDim);
drawQwVzorFiberLines(ctx,cx,cy,hubR*0.42,segOut,st,visDim,chaosSess);
if(hm&&coreState)drawQwVzorFlowArcsCanvas(ctx,cx,cy,segOut*0.96,st,hm,coreState,chaosSess);
ctx.save();
const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,hubR*2);
cg.addColorStop(0,'rgba(60,180,255,0.32)');cg.addColorStop(0.45,'rgba(0,100,160,0.08)');cg.addColorStop(1,'rgba(0,0,0,0)');
ctx.fillStyle=cg;ctx.beginPath();ctx.arc(cx,cy,hubR*2,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#030508';
ctx.beginPath();ctx.arc(cx,cy,hubR*0.34,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='rgba(70,190,255,0.45)';ctx.lineWidth=1;ctx.stroke();
ctx.restore();
drawQwVzorGoldBand(ctx,cx,cy,pocketIn);
drawQwEuropeanWheelShape(ctx,cx,cy,outerR,segment,lastN);
}
/** Zakrivené flow čiary na canvas (vzor — namiesto SVG lúčov) */
function drawQwVzorFlowArcsCanvas(ctx,cx,cy,rEnd,st,hm,coreState,chaosSess){
const items=qwFlowBeamsVzorItems(st,hm,coreState,chaosSess);
ctx.save();
ctx.lineCap='round';
items.forEach(it=>{
const tier=it.tier;
ctx.strokeStyle=tier==='strong'?'rgba(120,255,100,0.88)':tier==='mid'?'rgba(230,200,100,0.72)':'rgba(50,200,245,0.58)';
ctx.lineWidth=tier==='strong'?2.05:tier==='mid'?1.25:0.75;
ctx.globalAlpha=tier==='strong'?0.9:0.65;
const bend=0.5*Math.sin(it.ang*1.55+it.seed*0.31)+0.14*Math.sin(it.seed*0.44);
const rUse=rEnd*(it.frag?0.55:0.94);
const ex=cx+Math.cos(it.ang)*rUse,ey=cy+Math.sin(it.ang)*rUse;
const mx=cx+Math.cos(it.ang+bend)*rUse*0.38,my=cy+Math.sin(it.ang+bend)*rUse*0.38;
ctx.beginPath();ctx.moveTo(cx,cy);ctx.quadraticCurveTo(mx,my,ex,ey);ctx.stroke();
});
ctx.restore();
}
function drawQwRadarGrid(ctx,cx,cy,outerR,visDim,chaosSess){
if(chaosSess)return;
ctx.save();
ctx.globalAlpha=0.4*(visDim||1);
for(let i=1;i<=4;i++){
const r=outerR*(0.2+i*0.17);
ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
ctx.strokeStyle='rgba(0,255,191,'+(0.05+0.025*i)+')';
ctx.lineWidth=1;
ctx.setLineDash(i<4?[5,9]:[]);
ctx.stroke();
}
ctx.setLineDash([]);
for(let i=0;i<6;i++){
const a=-Math.PI/2+i*(Math.PI/3);
ctx.beginPath();
ctx.moveTo(cx+Math.cos(a)*outerR*0.2,cy+Math.sin(a)*outerR*0.2);
ctx.lineTo(cx+Math.cos(a)*outerR*0.96,cy+Math.sin(a)*outerR*0.96);
ctx.strokeStyle='rgba(70,200,255,0.12)';
ctx.lineWidth=1;
ctx.stroke();
}
ctx.restore();
}
function wheelHeatOverlay(n,Q){
const h=Q.numHeat[n]||{zone:'blue',score:20,active:false};
const a=Q.suppressed?0.72:0.92;
if(h.dead||h.zone==='dead')return{fill:'rgba(30,40,55,'+(0.55*a)+')',stroke:'rgba(80,95,120,0.5)',rim:'rgba(60,75,95,0.4)'};
if(h.colFlow)return{fill:'rgba(0,255,200,'+(0.55*a)+')',stroke:'#00ffbf',rim:'#00ffbf'};
if(h.zone==='green')return{fill:'rgba(0,255,160,'+(0.48*a)+')',stroke:'#00ffbf',rim:'#00ffbf'};
if(h.zone==='yellow')return{fill:'rgba(255,212,61,'+(0.42*a)+')',stroke:'#ffd43d',rim:'#ffeb3b'};
if(h.zone==='red')return{fill:'rgba(255,60,60,'+(0.4*a)+')',stroke:'#ff5252',rim:'#ff1744'};
if(h.active)return{fill:'rgba(87,181,255,'+(0.36*a)+')',stroke:'#57b5ff',rim:'#40c4ff'};
return{fill:'rgba(40,70,120,'+(0.22*a)+')',stroke:'rgba(120,160,220,0.6)',rim:'rgba(87,140,255,0.4)'};
}
function qwDeadColumns(){
const slice=spins.slice(-16).filter(n=>n>0);
const colHits=[0,0,0];
slice.forEach(n=>{const c=columnIndexForNum(n);if(c>=0)colHits[c]++;});
const dead=new Set();
colHits.forEach((h,i)=>{if(h===0)dead.add(i);});
return dead;
}
function qwBuildLiveHeatMap(Q,st){
const S=Q.scanner;
const hotSet=new Set((S&&S.hotNums)||[]);
const deadSet=new Set((S&&S.deadNums)||[]);
const deadCols=qwDeadColumns();
const domNums=new Set(st.domCol>=0?qwNumsForColumn(st.domCol):[]);
let returnNums=new Set();
const dp=S&&S.dominantSector?S.dominantSector.path:'';
if(dp&&dp!=='—')dp.split('-').forEach(p=>{const n=+p;if(!isNaN(n)&&n>=0)returnNums.add(n);});
if(!returnNums.size&&Q.clusters&&Q.clusters[0]&&Q.clusters[0].nums)returnNums=new Set(Q.clusters[0].nums);
const slice=spins.slice(-20).filter(n=>n>0);
const hitCount={};
slice.forEach(n=>{hitCount[n]=(hitCount[n]||0)+1;});
const chaosLvl=Q.chaosLevel||0;
const map={};
wheel.forEach(n=>{
const nh=Q.numHeat[n]||{};
let type='neutral';
const hits=hitCount[n]||0;
const col=columnIndexForNum(n);
if(n===0){map[n]={type:'neutral',hits:0};return;}
if((deadSet.has(n)||nh.dead||nh.zone==='dead'||(col>=0&&deadCols.has(col)&&hits===0))&&!hotSet.has(n)&&!returnNums.has(n))type='dead';
else if(deadSet.has(n)||(col>=0&&deadCols.has(col)&&hits<=1&&!hotSet.has(n)))type='cold';
else if(chaosLvl>=58&&hits<=1&&!hotSet.has(n)&&!returnNums.has(n))type='chaos';
else if(returnNums.has(n)||domNums.has(n))type='return';
else if(hits>=3)type='repeat';
else if(hits>=2)type='repeat';
else if(hotSet.has(n)||nh.zone==='green')type='hot';
map[n]={type,hits,score:nh.score||0};
});
return{map,deadCols};
}
function qwFlowCoreState(Q){
const chaos=Q.chaosLevel||0;
const trust=Q.scanner&&Q.scanner.trust?Q.scanner.trust.score:Q.confidence||50;
const domP=Q.scanner&&Q.scanner.dominantSector?Q.scanner.dominantSector.strength:0;
const breath=qwFlowBreathClass(Q);
let mode='calm';
if(breath==='qw-breathe-nervous'||chaos>=62||Q.flowBreak)mode='chaos';
else if(breath==='qw-breathe-weak'||chaos>=50||trust<48)mode='weak';
else if(trust>=60&&domP>=38)mode='calm';
return{mode,chaos,trust,domP};
}
function qwRadarBeamStyle(tier,pulse,idx){
const t=performance.now();
const flick=0.08*Math.sin(t/1100+idx*0.55);
if(tier==='strong'){
return{color:'rgba(154,255,232,'+(0.72+0.28*pulse+flick)+')',w:2.1+0.65*pulse,blur:12,alpha:0.78+0.18*pulse,glow:'#6fd4a0',bloom:true};
}
if(tier==='mid'){
return{color:'rgba(232,200,120,'+(0.5+0.22*pulse)+')',w:1.35+0.35*pulse,blur:5,alpha:0.48+0.14*pulse,glow:'#c8a050',bloom:false};
}
return{color:'rgba(120,170,200,'+(0.38+0.12*pulse)+')',w:0.95+0.2*pulse,blur:3,alpha:0.28+0.1*pulse,glow:'#5a90b0',bloom:false};
}
function drawQwRadarBeam(ctx,cx,cy,ang,r1,style,seed,gm){
const t=performance.now();
const wob=0.04*Math.sin(t/2400+seed);
const bend=0.2*Math.sin(ang*2.1+seed*0.4)+wob;
const ex=cx+Math.cos(ang)*r1,ey=cy+Math.sin(ang)*r1;
const mx=cx+Math.cos(ang+bend)*r1*0.48;
const my=cy+Math.sin(ang+bend)*r1*0.48;
ctx.save();
ctx.lineCap='round';
ctx.globalAlpha=style.alpha*gm;
if(style.bloom){
ctx.globalAlpha=style.alpha*gm*0.35;
ctx.shadowColor=style.glow;
ctx.shadowBlur=style.blur*gm*1.8;
ctx.strokeStyle=style.glow;
ctx.lineWidth=style.w*2.4;
ctx.beginPath();ctx.moveTo(cx,cy);ctx.quadraticCurveTo(mx,my,ex,ey);ctx.stroke();
ctx.globalAlpha=style.alpha*gm;
}
ctx.shadowColor=style.glow;
ctx.shadowBlur=style.blur*gm;
ctx.strokeStyle=style.color;
ctx.lineWidth=style.w;
ctx.beginPath();ctx.moveTo(cx,cy);ctx.quadraticCurveTo(mx,my,ex,ey);ctx.stroke();
ctx.restore();
}
function drawQwLiveFlowRadar(ctx,cx,cy,outerR,hubR,st,deadCols,Q,hm,coreState,pulse,visDim,chaosSess,gm,segment){
const t=performance.now();
const breath=0.5+0.5*Math.sin(t/2600);
const r1=outerR*0.9;
const trust=(coreState.trust||50)/100;
const stab=1-Math.min(1,(coreState.chaos||0)/100);
const boost=coreState.mode==='calm'?1:(coreState.mode==='weak'?0.82:0.68);
const gm2=Math.max(0.72,gm)*boost*Math.max(0.82,visDim)*breath*Math.max(0.55,trust)*Math.max(0.5,stab);
const domCol=st.domCol,domDoz=st.domDoz;
const beams=[];
wheel.forEach((num,index)=>{
if(num===0)return;
const ang=index*segment-Math.PI/2+segment/2;
const ci=columnIndexForNum(num),di=dozenIndexForNum(num);
let score=0.18;
if(domCol>=0&&ci===domCol)score+=0.42*((st.colPct[domCol]||0)/100);
if(domDoz>=0&&di===domDoz)score+=0.28*((st.dozPct[domDoz]||0)/100);
if(ci>=0&&deadCols&&deadCols.has(ci))score*=0.35;
const hi=hm[num];
if(hi){
if(hi.type==='return'||hi.type==='repeat')score+=0.22;
else if(hi.type==='hot')score+=0.12;
else if(hi.type==='chaos')score-=0.12;
}
const nh=Q.numHeat[num];
if(nh){
if(nh.zone==='green')score+=0.1;
else if(nh.zone==='yellow')score+=0.04;
else if(nh.zone==='red')score-=0.06;
}
if(chaosSess)score*=0.72;
beams.push({ang,score,index});
});
beams.sort((a,b)=>a.score-b.score);
let seed=0;
beams.forEach(b=>{
const tier=b.score>=0.52?'strong':b.score>=0.3?'mid':'weak';
const subs=tier==='strong'?3:(tier==='mid'?2:1);
for(let s=0;s<subs;s++){
const spread=subs>1?((s/(subs-1))-0.5)*0.028:0;
const style=qwRadarBeamStyle(tier,pulse,seed++);
style.alpha*=gm2*(tier==='strong'?1.05:(tier==='mid'?0.85:0.7));
if(coreState.mode==='chaos'&&tier==='strong')style.alpha*=0.75;
drawQwRadarBeam(ctx,cx,cy,b.ang+spread,r1,style,seed,1);
}
});
if(domCol>=0){
const domAng=-Math.PI/2+domCol*(Math.PI*2/3)+(Math.PI/3);
const extra=chaosSess?4:8;
for(let k=0;k<extra;k++){
const off=(k-(extra-1)/2)*0.035;
const style=qwRadarBeamStyle('strong',pulse,seed+k+100);
style.alpha*=gm2*1.15;
style.w+=0.35;
drawQwRadarBeam(ctx,cx,cy,domAng+off,r1*0.98,style,seed+k,1.1);
}
}
}
function qwFlowRadarPathD(cx,cy,ang,rEnd,seed,chaosFrag){
const t=performance.now()*0.001;
const bend=(chaosFrag?0.38:0.52)*Math.sin(ang*1.55+seed*0.31)+0.16*Math.sin(t*1.25+seed*0.65);
const endJ=0.07*Math.sin(seed*0.44+t*0.9);
const rUse=chaosFrag?rEnd*(0.38+0.42*Math.abs(Math.sin(seed*0.77))):rEnd;
const ex=cx+Math.cos(ang+endJ)*rUse,ey=cy+Math.sin(ang+endJ)*rUse;
const mx=cx+Math.cos(ang+bend)*rUse*0.36;
const my=cy+Math.sin(ang+bend)*rUse*0.36;
return'M '+cx+' '+cy+' Q '+mx+' '+my+' '+ex+' '+ey;
}
function qwFlowSectorLabelsHtml(cx,cy,colIn,colOut,dozIn,dozOut,st){
let h='';
for(let i=0;i<3;i++){
const a0=-Math.PI/2+i*(Math.PI*2/3),am=a0+Math.PI/3;
const r=(colIn+colOut)*0.5,x=cx+Math.cos(am)*r,y=cy+Math.sin(am)*r;
const dom=i===st.domCol,pct=Math.round(st.colPct[i]||0);
h+='<text class="qw-flow-sector-lbl" x="'+x.toFixed(1)+'" y="'+(y-10).toFixed(1)+'" text-anchor="middle">STĹPEC '+(i+1)+'</text>';
h+='<text class="qw-flow-sector-pct'+(dom?' dom':'')+'" x="'+x.toFixed(1)+'" y="'+(y+12).toFixed(1)+'" text-anchor="middle">'+pct+'%</text>';
if(dom)h+='<text class="qw-flow-sector-dom" x="'+x.toFixed(1)+'" y="'+(y+28).toFixed(1)+'" text-anchor="middle">DOMINANTNÝ</text>';
}
for(let i=0;i<3;i++){
const a0=-Math.PI/2+Math.PI/6+i*(Math.PI*2/3),am=a0+Math.PI/3;
const r=(dozIn+dozOut)*0.5,x=cx+Math.cos(am)*r,y=cy+Math.sin(am)*r;
const dom=i===st.domDoz,pct=Math.round(st.dozPct[i]||0);
h+='<text class="qw-flow-sector-lbl" x="'+x.toFixed(1)+'" y="'+(y-10).toFixed(1)+'" text-anchor="middle">TUCET '+(i+1)+'</text>';
h+='<text class="qw-flow-sector-pct'+(dom?' dom':'')+'" x="'+x.toFixed(1)+'" y="'+(y+12).toFixed(1)+'" text-anchor="middle">'+pct+'%</text>';
if(dom)h+='<text class="qw-flow-sector-dom" x="'+x.toFixed(1)+'" y="'+(y+28).toFixed(1)+'" text-anchor="middle">DOMINANTNÝ</text>';
}
return h;
}
/** 6 pozícií popisov — presne ako vzor (hodiny: 10,12,2,4,6,8) */
const QW_VZOR_LABEL_SLOTS=[
{kind:'col',idx:0,ang:-2*Math.PI/3,prefix:'STĹPEC'},
{kind:'col',idx:1,ang:-Math.PI/2,prefix:'STĹPEC'},
{kind:'col',idx:2,ang:-Math.PI/6,prefix:'STĹPEC'},
{kind:'doz',idx:2,ang:Math.PI/6,prefix:'TUCET'},
{kind:'doz',idx:1,ang:Math.PI/2,prefix:'TUCET'},
{kind:'doz',idx:0,ang:5*Math.PI/6,prefix:'TUCET'}
];
function qwFlowSectorLabelsHtmlVzor(cx,cy,colIn,colOut,dozIn,dozOut,st){
const rLbl=(colIn+colOut)*0.46;
let h='';
QW_VZOR_LABEL_SLOTS.forEach(slot=>{
const x=cx+Math.cos(slot.ang)*rLbl,y=cy+Math.sin(slot.ang)*rLbl;
const dom=slot.kind==='col'?(slot.idx===st.domCol):(slot.idx===st.domDoz);
const pct=Math.round(slot.kind==='col'?(st.colPct[slot.idx]||0):(st.dozPct[slot.idx]||0));
const num=slot.idx+1;
const lblY=y-(dom?22:18),pctY=y+(dom?14:10),domY=y+(dom?46:0);
const lblFill='#eef4f8',pctFill=dom?'#8cff9a':'#ffffff';
h+='<text class="qw-flow-sector-lbl" fill="'+lblFill+'" x="'+x.toFixed(1)+'" y="'+lblY.toFixed(1)+'" text-anchor="middle">'+slot.prefix+' '+num+'</text>';
h+='<text class="qw-flow-sector-pct'+(dom?' dom':'')+'" fill="'+pctFill+'" x="'+x.toFixed(1)+'" y="'+pctY.toFixed(1)+'" text-anchor="middle">'+pct+'%</text>';
if(dom)h+='<text class="qw-flow-sector-dom" fill="#8cff9a" x="'+x.toFixed(1)+'" y="'+domY.toFixed(1)+'" text-anchor="middle">DOMINANTNÝ</text>';
});
return h;
}
function qwFlowBeamsVzorItems(st,hm,coreState,chaosSess){
const items=[];
const trust=(coreState.trust||50)/100;
const stab=1-Math.min(1,(coreState.chaos||0)/100);
const boost=Math.max(0.55,trust*stab)*(chaosSess?0.62:1);
QW_VZOR_LABEL_SLOTS.forEach(slot=>{
const dom=slot.kind==='col'?(slot.idx===st.domCol):(slot.idx===st.domDoz);
const pct=slot.kind==='col'?(st.colPct[slot.idx]||0):(st.dozPct[slot.idx]||0);
const span=Math.PI/3;
const a0=slot.ang-span/2,a1=slot.ang+span/2;
let n=Math.round((dom?48:10)*(0.26+pct/88)*boost);
n=Math.max(dom?(chaosSess?8:16):3,Math.min(dom?(chaosSess?28:52):10,n));
for(let k=0;k<n;k++){
const t=n>1?k/(n-1):0.5;
const ang=a0+0.1+(a1-a0-0.2)*t+0.025*Math.sin(k*2.1+slot.idx);
let tier='weak';
if(dom&&!chaosSess)tier='strong';
else if(dom&&chaosSess)tier='mid';
else if(pct>=24)tier='mid';
items.push({tier,ang,seed:slot.idx*500+k*11+(slot.kind==='doz'?3000:0),frag:!!chaosSess});
}
});
return items;
}
/** 6 segmentov vnútra — zelený dominantný, ostatné tmavé */
function drawQwVzorSixSegmentHub(ctx,cx,cy,rIn,rOut,st,pulse,visDim,chaosSess){
const segs=[
{kind:'col',idx:0,a0:-5*Math.PI/6,a1:-Math.PI/2},
{kind:'col',idx:1,a0:-Math.PI/2,a1:-Math.PI/3},
{kind:'col',idx:2,a0:-Math.PI/3,a1:0},
{kind:'doz',idx:2,a0:0,a1:Math.PI/3},
{kind:'doz',idx:1,a0:Math.PI/3,a1:2*Math.PI/3},
{kind:'doz',idx:0,a0:2*Math.PI/3,a1:Math.PI}
];
segs.forEach(seg=>{
const dom=seg.kind==='col'?(seg.idx===st.domCol):(seg.idx===st.domDoz);
const pct=seg.kind==='col'?(st.colPct[seg.idx]||0):(st.dozPct[seg.idx]||0);
const a=dom?(0.32+0.06*pulse)*(Math.max(0.42,pct/100)):0.05;
drawQwWedge(ctx,cx,cy,rIn,rOut,seg.a0,seg.a1,
dom?'rgba(0,95,70,'+(a*visDim)+')':'rgba(6,14,22,'+(0.55*visDim)+')',
dom?'rgba(100,255,170,'+(0.5*visDim)+')':'rgba(40,90,120,'+(0.12*visDim)+')',
dom?1.8:0.7);
});
if(!chaosSess){
ctx.save();
ctx.globalAlpha=0.55*visDim;
ctx.strokeStyle='rgba(80,220,255,0.45)';
ctx.lineWidth=1.1;
QW_VZOR_LABEL_SLOTS.forEach(slot=>{
const a=slot.ang;
ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*rIn*0.9,cy+Math.sin(a)*rIn*0.9);
ctx.lineTo(cx+Math.cos(a)*rOut*0.98,cy+Math.sin(a)*rOut*0.98);
ctx.stroke();
});
ctx.restore();
}
}
/** Vláknové flow čiary — cyan + zelené v dominantných sektoroch */
function drawQwVzorFiberLines(ctx,cx,cy,rIn,rOut,st,visDim,chaosSess){
function nearDom(ang){
let ok=false;
QW_VZOR_LABEL_SLOTS.forEach(slot=>{
const dom=slot.kind==='col'?(slot.idx===st.domCol):(slot.idx===st.domDoz);
if(!dom)return;
let d=Math.abs(ang-slot.ang);d=Math.min(d,Math.PI*2-d);
if(d<0.55)ok=true;
});
return ok;
}
const n=chaosSess?180:380;
ctx.save();
for(let i=0;i<n;i++){
const ang=-Math.PI+Math.PI*2*(i/n)+0.42*Math.sin(i*2.17);
const dom=!chaosSess&&nearDom(ang);
const r0=rIn*(0.5+0.1*Math.sin(i*3.1));
const r1=rOut*(0.92+0.04*Math.sin(i*1.4));
const bend=0.13*Math.sin(i*4.2);
const x0=cx+Math.cos(ang)*r0,y0=cy+Math.sin(ang)*r0;
const xm=cx+Math.cos(ang+bend)*(r0+r1)*0.5,ym=cy+Math.sin(ang+bend)*(r0+r1)*0.5;
const x1=cx+Math.cos(ang)*r1,y1=cy+Math.sin(ang)*r1;
ctx.globalAlpha=(dom?0.55:0.28)*visDim;
ctx.strokeStyle=dom?'rgba(130,255,100,0.9)':'rgba(50,200,245,0.65)';
ctx.lineWidth=dom?1.15:0.6;
ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(xm,ym,x1,y1);ctx.stroke();
}
ctx.restore();
}
let qwFlowRadarSvgKey='';
function renderQwFlowRadarSvg(Q,st,hm,coreState,pulse,chaosSess){
ensureQwFlowRadarSvg();
const svg=document.getElementById('qwFlowRadarSvg');
const beams=document.getElementById('qwFlowBeams');
const secLbl=document.getElementById('qwFlowSectorLabels');
if(!svg||!beams)return;
if(!Q||!Q.ready){
beams.innerHTML='';
if(secLbl)secLbl.innerHTML='';
svg.classList.remove('chaos');
qwFlowRadarSvgKey='';
return;
}
const tick=Math.floor(performance.now()/80);
const cacheKey=spins.length+'|'+(spins[spins.length-1]??'')+'|'+tick+'|'+(st.domCol)+'|'+(st.domDoz);
if(cacheKey===qwFlowRadarSvgKey)return;
qwFlowRadarSvgKey=cacheKey;
const cv=document.getElementById('wheelCanvas');
const Ws=cv?cv.width:1080;
const cx=Ws/2,cy=Ws/2;
const radarVzor=!!(document.getElementById('wheelRadarData')&&document.getElementById('wheelRadarData').closest('.v6-block-wheel.v6-radar-v1'));
if(radarVzor){
beams.innerHTML='';
if(secLbl)secLbl.innerHTML='';
const isChaos=!!(chaosSess||(coreState&&coreState.mode==='chaos'));
svg.classList.toggle('chaos',isChaos);
svg.classList.toggle('stable',!isChaos);
qwFlowRadarSvgKey=spins.length+'|vz|'+tick;
return;
}
const outerR=Math.min(Ws,Ws)*0.47;
const hubR=outerR*0.14;
const colIn=hubR*1.25,colOut=outerR*0.7;
const dozIn=hubR*1.1,dozOut=outerR*0.42;
const rEnd=outerR*0.98;
const isChaos=!!(chaosSess||coreState.mode==='chaos');
svg.classList.toggle('chaos',isChaos);
svg.classList.toggle('stable',!isChaos);
const items=radarVzor?qwFlowBeamsVzorItems(st,hm,coreState,chaosSess):[];
if(!radarVzor){
const segment=(Math.PI*2)/wheel.length;
const domCol=st.domCol,domDoz=st.domDoz;
wheel.forEach((num,index)=>{
const ang=index*segment-Math.PI/2+segment/2;
const ci=columnIndexForNum(num),di=dozenIndexForNum(num);
let score=num===0?0.15:0.22;
if(domCol>=0&&ci===domCol)score+=0.52*((st.colPct[domCol]||0)/100);
if(domDoz>=0&&di===domDoz)score+=0.28*((st.dozPct[domDoz]||0)/100);
const hi=hm[num];
if(hi){if(hi.type==='return'||hi.type==='repeat')score+=0.26;else if(hi.type==='hot')score+=0.14;}
let tier=score>=0.48?'strong':score>=0.28?'mid':'weak';
const subs=tier==='strong'?6:(tier==='mid'?3:2);
for(let s=0;s<subs;s++){
const spread=subs>1?((s/(subs-1))-0.5)*0.04:0;
items.push({tier,ang:ang+spread,seed:index*12+s});
}
});
}
items.sort((a,b)=>(a.tier==='weak'?0:a.tier==='mid'?1:2)-(b.tier==='weak'?0:b.tier==='mid'?1:2));
let html='';
items.forEach(it=>{
html+='<path class="qw-flow-beam '+it.tier+'" d="'+qwFlowRadarPathD(cx,cy,it.ang,rEnd,it.seed,!!it.frag)+'"/>';
});
beams.innerHTML=html;
if(secLbl)secLbl.innerHTML='';
}
function drawQwFlowCore(ctx,cx,cy,hubR,core,pulse,visDim,st,chaosSess){
const t=performance.now();
const p=0.5+0.5*Math.sin(t/2400);
const calm=core.mode==='calm';
const weak=core.mode==='weak';
const pingR=Math.max(2,hubR*0.08);
const auraR=hubR*1.1;
ctx.save();
ctx.globalAlpha=visDim;
const aura=calm?'rgba(90,220,170,'+(0.16+0.12*p)+')':(weak?'rgba(220,170,80,'+(0.1+0.06*p)+')':'rgba(100,140,160,'+(0.08+0.05*p)+')');
const ag=ctx.createRadialGradient(cx,cy,0,cx,cy,auraR);
ag.addColorStop(0,aura);ag.addColorStop(0.55,'rgba(12,28,24,0.12)');ag.addColorStop(1,'rgba(0,0,0,0)');
ctx.fillStyle=ag;ctx.beginPath();ctx.arc(cx,cy,auraR,0,Math.PI*2);ctx.fill();
ctx.strokeStyle=calm?'rgba(111,255,200,'+(0.2+0.15*p)+')':(weak?'rgba(230,190,100,'+(0.15+0.1*p)+')':'rgba(120,150,170,'+(0.12+0.08*p)+')');
ctx.lineWidth=1;
ctx.globalAlpha=visDim*(0.06+0.05*p);
ctx.beginPath();ctx.arc(cx,cy,hubR*0.55,0,Math.PI*2);ctx.stroke();
ctx.globalAlpha=visDim;
ctx.fillStyle=calm?'rgba(18,42,36,0.92)':(weak?'rgba(36,28,16,0.9)':'rgba(20,24,30,0.92)');
ctx.beginPath();ctx.arc(cx,cy,pingR*1.6,0,Math.PI*2);ctx.fill();
ctx.fillStyle=calm?'rgba(130,255,220,'+(0.85+0.15*p)+')':(weak?'rgba(255,210,120,'+(0.7+0.2*p)+')':'rgba(160,190,210,'+(0.65+0.15*p)+')');
if(calm&&!chaosSess){ctx.shadowColor='#6fd4a0';ctx.shadowBlur=8+10*p;}
ctx.beginPath();ctx.arc(cx,cy,pingR,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;
ctx.restore();
}
function qwPocketHeatStyle(num,hm,pulse,chaosLvl,visDim,isLast){
const base=wheelPocketBase(num);
const h=hm[num]||{type:'neutral',hits:0};
const v=visDim||1;
const t=performance.now();
const flick=h.type==='chaos'&&chaosLvl>=52?0.28+0.14*Math.sin(t/420):0;
const isRed=reds.includes(num);
const isBlack=!isRed&&num!==0;
if(h.type==='dead'){
return{fill:'rgba(18,22,30,'+(0.82*v)+')',stroke:'rgba(50,58,68,0.55)',rim:'rgba(40,48,58,0.4)',glow:0,dead:true};
}
if(h.type==='cold'){
return{fill:base.fill,stroke:base.stroke,rim:base.rim,glow:0,opacity:0.55*v};
}
if(h.type==='chaos'){
const a=0.35+flick;
return{fill:isRed?'rgba(185,28,28,'+(0.55+a)*v+')':(isBlack?'rgba(22,22,32,'+(0.7+a)*v+')':'rgba(13,122,69,'+(0.65+a)*v+')'),
stroke:'rgba(220,90,80,'+(0.65*v)+')',rim:'rgba(240,110,95,'+(0.45+0.15*Math.sin(t/500))+')',glow:flick*0.85};
}
if(h.type==='return'){
const g=0.28+0.14*pulse;
return{fill:isRed?'rgba(185,28,28,'+(0.88*v)+')':(isBlack?'rgba(18,18,26,'+(0.92*v)+')':'rgba(13,122,69,'+(0.9*v)+')'),
stroke:'rgba(90,230,170,'+(0.75*v)+')',rim:'rgba(120,255,210,'+(0.65+0.25*pulse)+')',glow:0.5*pulse};
}
if(h.type==='repeat'){
const g=0.22+0.12*pulse+(h.hits>=3?0.1:0);
return{fill:isRed?'rgba(185,28,28,'+(0.9*v)+')':(isBlack?'rgba(18,18,26,'+(0.94*v)+')':'rgba(13,122,69,'+(0.92*v)+')'),
stroke:'rgba(90,220,160,'+(0.6*v)+')',rim:'rgba(130,255,200,'+(0.55+0.2*pulse)+')',glow:0.38*pulse};
}
if(h.type==='hot'){
const g=0.2+0.16*pulse;
return{fill:isRed?'rgba(210,32,32,'+(0.95*v)+')':(isBlack?'rgba(24,24,34,'+(0.96*v)+')':'rgba(16,140,78,'+(0.94*v)+')'),
stroke:'rgba(100,240,180,'+(0.65*v)+')',rim:'rgba(130,255,210,'+(0.65+0.22*pulse)+')',glow:0.48*pulse};
}
return{fill:base.fill,stroke:base.stroke,rim:isLast?'#ffd43d':base.rim,glow:isLast?0.35:0};
}
function drawQwMigrationPath(ctx,cx,cy,r,segment,nums,visDim,pulse,flowMode,chaosSess){
const list=nums.filter(n=>n>0);
if(list.length<2)return;
const strong=flowMode==='calm'&&!chaosSess;
const alphaBase=strong?0.42:(chaosSess?0.1:0.22);
ctx.save();
ctx.lineCap='round';
ctx.lineJoin='round';
for(let i=1;i<list.length;i++){
const a=wheel.indexOf(list[i-1]),b=wheel.indexOf(list[i]);
if(a<0||b<0)continue;
let a0=a*segment-Math.PI/2+segment/2,a1=b*segment-Math.PI/2+segment/2;
let diff=a1-a0;
if(diff>Math.PI)diff-=Math.PI*2;
if(diff<-Math.PI)diff+=Math.PI*2;
const mid=a0+diff*0.5;
const pr=r+8;
const px=cx+Math.cos(mid)*pr,py=cy+Math.sin(mid)*pr;
if(strong){
ctx.globalAlpha=0.18*visDim;
ctx.strokeStyle='rgba(100,220,255,0.55)';
ctx.lineWidth=7+1.5*pulse;
ctx.shadowColor='rgba(120,220,255,0.7)';
ctx.shadowBlur=16;
ctx.setLineDash([]);
ctx.beginPath();ctx.arc(cx,cy,r,a0,a0+diff);ctx.stroke();
ctx.shadowBlur=0;
}
ctx.globalAlpha=alphaBase*visDim;
ctx.strokeStyle=strong?'rgba(140,220,255,0.88)':'rgba(90,150,190,0.45)';
ctx.lineWidth=strong?4.2+0.9*pulse:1.5;
ctx.shadowColor=strong?'rgba(120,200,255,0.55)':'transparent';
ctx.shadowBlur=strong?12:0;
ctx.setLineDash(strong?[]:[5,7]);
ctx.beginPath();ctx.arc(cx,cy,r,a0,a0+diff);ctx.stroke();
ctx.setLineDash([]);
ctx.shadowBlur=0;
ctx.globalAlpha=(strong?0.5:0.28)*visDim;
ctx.fillStyle=strong?'rgba(160,230,255,0.85)':'rgba(120,180,220,0.5)';
ctx.beginPath();ctx.arc(px,py,strong?5:3,0,Math.PI*2);ctx.fill();
if(i===list.length-1&&strong){
ctx.strokeStyle='rgba(200,240,255,0.9)';
ctx.lineWidth=2;
ctx.beginPath();ctx.moveTo(px,py);
ctx.lineTo(px+Math.cos(mid)*10,py+Math.sin(mid)*10);
ctx.stroke();
}
}
ctx.restore();
}
function drawQwReturnZoneGlow(ctx,cx,cy,pocketOut,trackIn,segment,nums,visDim,pulse){
if(!nums||!nums.length)return;
const set=new Set(nums);
const t=performance.now();
const pulseR=0.5+0.5*Math.sin(t/900);
wheel.forEach((num,index)=>{
if(!set.has(num)||num===0)return;
const start=index*segment-Math.PI/2,end=start+segment;
ctx.save();
ctx.globalAlpha=(0.14+0.14*pulse*pulseR)*visDim;
ctx.strokeStyle='rgba(120,255,210,0.55)';
ctx.lineWidth=11;
ctx.shadowColor='rgba(111,255,200,0.45)';
ctx.shadowBlur=18;
ctx.beginPath();ctx.arc(cx,cy,pocketOut+4,start,end);ctx.stroke();
ctx.globalAlpha=(0.22+0.16*pulse*pulseR)*visDim;
ctx.strokeStyle='rgba(140,255,220,0.78)';
ctx.lineWidth=4.5;
ctx.shadowBlur=10;
ctx.beginPath();ctx.arc(cx,cy,pocketOut+1,start,end);ctx.stroke();
ctx.restore();
});
}
function qwComputePlayerIntel(Q,st){
const S=Q.scanner;
const chaos=Q.chaosLevel||0;
const trust=S&&S.trust?S.trust.score:Q.confidence||50;
let repeatP=0,revP=0,chaosP=0,domP=0;
if(S&&S.pressure&&S.pressure.lines){
S.pressure.lines.forEach(l=>{
const u=String(l).toUpperCase();
const m=u.match(/(\d+)/);
const v=m?+m[0]:0;
if(u.indexOf('REPEAT')>=0)repeatP=v;
else if(u.indexOf('REVERSAL')>=0||u.indexOf('NÁVRAT')>=0)revP=v;
else if(u.indexOf('CHAOS')>=0)chaosP=v;
else if(u.indexOf('DOMINANCE')>=0)domP=v;
});
}else if(S&&S.pressure)domP=S.pressure.value||0;
let fpHead='🟠 TLAK DRŽÍ',fpSub='Flow je v rovnováhe',fpCls='yellowTxt';
const mom=Q.flowMomentum&&Q.flowMomentum.label;
if(Q.flowBreak||chaos>=68||(S&&S.pressure&&S.pressure.collapseRisk)){
fpHead='🔴 TLAK SA ROZPADÁ';fpSub='Flow stráca silu — wheel je nestabilný';fpCls='redTxt';
}else if(mom==='Rastie'||mom==='Drží'||repeatP>=58){
fpHead='🟢 TLAK RASTIE';fpSub='Návraty a dominancia silnejú';fpCls='greenTxt';
}else if(mom==='Slabne'||domP<40||revP>=55){
fpHead='🟠 TLAK SLABNE';fpSub='Dominancia stráca momentum';fpCls='yellowTxt';
}
let confHead='🟠 OPATRNOSŤ',confSub='Stredná dôvera v flow',confCls='yellowTxt';
if(trust>=68&&chaos<55)confHead='🟢 VYSOKÁ DÔVERA',confSub='Flow je čitateľný',confCls='greenTxt';
else if(trust<42||chaos>=65)confHead='🔴 NÍZKA DÔVERA',confSub='Koleso je príliš chaotický',confCls='redTxt';
const ph=Q.flowLife&&Q.flowLife.phase;
const cycleMap={EMERGING:'🟢 VZNIK',GROWING:'🟢 RAST',STRONG:'🟢 DOMINANCIA',WEAKENING:'🟠 ÚNAVA',DEAD:'🔴 KOLAPS',QUIET:'⚪ ČAKAJ'};
let cycleHead=cycleMap[ph]||'🟠 FORMUJE SA';
let cycleSub=Q.flowLife&&Q.flowLife.mainFlow?Q.flowLife.mainFlow.sub:'';
if(ph==='STRONG'||ph==='GROWING')cycleSub='Flow rastie a drží smer.';
else if(ph==='WEAKENING')cycleSub='Flow slabne — sleduj potvrdenie.';
else if(ph==='DEAD')cycleSub='Flow skolaboval — počkaj na recovery.';
else if(!cycleSub)cycleSub='Koleso buduje nový behavior.';
const mem=[];
if(qwWheelMemory.length>=1)mem.push('Pamäť: '+qwWheelMemory.slice(-2).map(m=>m.key.split('|')[0]).join(' → '));
if(S&&S.wheelMemory&&S.wheelMemory.line)mem.push(S.wheelMemory.line);
if(S&&S.recovery&&S.recovery.active)mem.push('Recovery po chaose.');
const migPath=Q.trailNums&&Q.trailNums.length?Q.trailNums.slice(-8).join(' → '):'—';
const repeatLane=st.domCol>=0?(st.domCol+1)+'. stĺpec · '+repeatP+'%':'repeat '+repeatP+'%';
return{
flowPressure:{head:fpHead,sub:fpSub,cls:fpCls,repeatP,revP,chaosP,domP},
confidence:{head:confHead,sub:confSub,cls:confCls,pct:trust},
flowCycle:{head:cycleHead,sub:cycleSub,phase:ph},
flowMemory:mem.slice(0,3),
migrationPath:migPath,
repeatLane,
repeatCount:repeatP
};
}
function qwBuildIntelChips(Q,st){
const voice=qwPlayerVoice(Q,st);
const intel=qwComputePlayerIntel(Q,st);
if(voice.silent)return'<span class="qw-intel-chip">⚪ bez silného flow</span>';
return'<span class="qw-intel-chip '+intel.flowPressure.cls+'">'+intel.flowPressure.head+'</span>'
+'<span class="qw-intel-chip '+intel.confidence.cls+'">'+intel.confidence.head+'</span>';
}
function qwAtmosphereUiClass(Q){
if(Q.flowBreak)return'qw-atmos-break';
const ph=Q.flowLife&&Q.flowLife.phase;
if(ph==='STRONG'||ph==='GROWING')return'qw-atmos-flow-strong';
if(ph==='WEAKENING'||ph==='DEAD'||Q.chaosLevel>=62)return'qw-atmos-chaos-lite';
if(Q.chaosLevel>=55)return'qw-atmos-flow-weak';
return'qw-atmos-active';
}
const QW_RADAR_TEXT_SCALE=1.05;
function qwCanvasPx(lg,sm,W){return Math.round((W>=700?lg:sm)*QW_RADAR_TEXT_SCALE);}
function drawWheelTextOutlined(ctx,text,x,y,fill,strokeW){
ctx.lineWidth=strokeW||3;
ctx.strokeStyle='rgba(0,0,0,0.92)';
ctx.strokeText(text,x,y);
ctx.fillStyle=fill;
ctx.fillText(text,x,y);
}
function qwFlowLineStyle(h,inDom,pulse,heatType){
const strong=inDom||h.colFlow||heatType==='return'||heatType==='repeat'||heatType==='hot';
const mid=heatType==='return'||heatType==='repeat';
if(strong&&mid)return{color:'#b8ffe8',w:5.5+1.6*pulse,blur:22,alpha:0.92,glow:'#7affc8',bloom:true,fade:1.28};
if(inDom||h.colFlow)return{color:'#8affe0',w:4.2+1.25*pulse,blur:14,alpha:0.8,glow:'#6fd4a0',bloom:true,fade:1.05};
if(h.zone==='green'||heatType==='hot')return{color:'#7ad4b0',w:2.8+0.75*pulse,blur:8,alpha:0.55,glow:'#6fd4a0',bloom:false,fade:0.75};
if(h.zone==='yellow')return{color:'#e0c070',w:2,blur:5,alpha:0.38,glow:'#c8a050',bloom:false,fade:0.55};
if(h.zone==='red'||heatType==='chaos')return{color:'#a08078',w:1.2,blur:3,alpha:0.22,glow:'#7a5850',bloom:false,fade:0.32};
return{color:'#5a7a72',w:1.4,blur:3,alpha:0.3,glow:'#5a7a72',bloom:false,fade:0.42};
}
function drawQwCurvedFlow(ctx,cx,cy,ang,r0,r1,style,glowMult){
const sx=cx+Math.cos(ang)*r0,sy=cy+Math.sin(ang)*r0;
const ex=cx+Math.cos(ang)*r1,ey=cy+Math.sin(ang)*r1;
const bend=0.16+0.06*Math.sin(ang*3);
const mx=cx+Math.cos(ang+bend)*((r0+r1)*0.5),my=cy+Math.sin(ang+bend)*((r0+r1)*0.5);
const fade=style.fade!=null?style.fade:0.5;
ctx.save();
ctx.lineCap='round';
if(style.bloom){
ctx.globalAlpha=style.alpha*0.38*glowMult*fade;
ctx.shadowColor=style.glow;ctx.shadowBlur=style.blur*2*glowMult;
ctx.strokeStyle=style.color;ctx.lineWidth=style.w*2.3;
ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(mx,my,ex,ey);ctx.stroke();
}
ctx.globalAlpha=style.alpha*glowMult;
ctx.shadowColor=style.glow;ctx.shadowBlur=style.blur*glowMult;
ctx.strokeStyle=style.color;ctx.lineWidth=style.w;
ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(mx,my,ex,ey);ctx.stroke();
ctx.globalAlpha=style.alpha*fade*glowMult*0.32;
ctx.shadowBlur=style.blur*0.35*glowMult;
ctx.lineWidth=style.w*0.55;
ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(ex,ey);ctx.stroke();
ctx.restore();
}
function drawQwWedge(ctx,cx,cy,rIn,rOut,a0,a1,fill,stroke,lw){
ctx.beginPath();ctx.moveTo(cx,cy);
ctx.arc(cx,cy,rOut,a0,a1);ctx.arc(cx,cy,rIn,a1,a0,true);ctx.closePath();
ctx.fillStyle=fill;ctx.fill();
if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1;ctx.stroke();}
}
function qwBuildWheelPlayFields(Q,st){
const play=Q.scanner&&Q.scanner.liveOutput?Q.scanner.liveOutput:null;
const win=Math.min(22,Math.max(6,spins.length));
const s=raSliceStats(win);
const pickOf=(key,fallback)=>{
const f=play&&play[key]?play[key]:null;
let p=f&&f.pick?String(f.pick):fallback;
return p.replace(/\s*\+\s*/g,'+').replace(/\s+/g,' ').trim();
};
const confOf=(key,fb)=>{const f=play&&play[key]?play[key]:null;return f&&f.confidence!=null?+f.confidence:fb;};
const stOf=(key)=>{const f=play&&play[key]?play[key]:null;return f&&f.state?f.state:'state-caution';};
let colorFb='—',colorPct=50,redPct=50,blackPct=50;
let parFb='—',parPct=50;
let rngFb='—',rngPct=50;
let dozFb='—',dozPct=st.domDoz>=0?st.dozPct[st.domDoz]:33;
let colFb='—',colPct=st.domCol>=0?st.colPct[st.domCol]:33;
if(s){
redPct=s.redPct;blackPct=s.blackPct;
colorFb=redPct>=blackPct?'ČERVENÁ':'ČIERNA';
colorPct=Math.max(redPct,blackPct);
parFb=s.evenPct>=s.oddPct?'PÁRNE':'NEPÁRNE';
parPct=Math.max(s.evenPct,s.oddPct);
rngFb=s.highPct>=s.lowPct?'19–36':'1–18';
rngPct=Math.max(s.highPct,s.lowPct);
if(st.domDoz>=0)dozPct=st.dozPct[st.domDoz];
if(st.domCol>=0)colPct=st.colPct[st.domCol];
}
const colOrder=[0,1,2].sort((a,b)=>st.colPct[b]-st.colPct[a]);
const dozOrder=[0,1,2].sort((a,b)=>st.dozPct[b]-st.dozPct[a]);
let colPick=(st.domCol>=0?(st.domCol+1)+'. STĹPEC':colFb);
let colSub=(colOrder[0]+1)+'+'+(colOrder[1]+1);
let dozPick=(st.domDoz>=0?(st.domDoz+1)+'. TUCET':dozFb);
let dozSub=(dozOrder[0]+1)+'+'+(dozOrder[1]+1);
const playCols=play&&play.columns?String(play.columns.pick):'';
if(playCols&&playCols!=='—')colSub=playCols.replace(/\s*\+\s*/g,'+');
return[
{key:'color',icon:'🔥',lbl:'FARBA',pick:pickOf('color',colorFb),sub:'',pct:colorPct,conf:confOf('color',colorPct),state:stOf('color')},
{key:'parity',icon:'⚡',lbl:'PARITA',pick:pickOf('parity',parFb),sub:'',pct:parPct,conf:confOf('parity',parPct),state:stOf('parity')},
{key:'range',icon:'🎯',lbl:'RANGE',pick:pickOf('range',rngFb),sub:'',pct:rngPct,conf:confOf('range',rngPct),state:stOf('range')},
{key:'dozens',icon:'📊',lbl:'TUCTY',pick:pickOf('dozens',dozPick),sub:dozSub,pct:dozPct,conf:confOf('dozens',dozPct),state:stOf('dozens')},
{key:'columns',icon:'📈',lbl:'STĹPCE',pick:pickOf('columns',colPick),sub:colSub,pct:colPct,conf:confOf('columns',colPct),state:stOf('columns')}
];
}
function qwRankWheelFieldPriority(fields,st){
const cols=st.colPct.slice();
const colGap=st.domCol>=0?st.colPct[st.domCol]-Math.max(cols[(st.domCol+1)%3],cols[(st.domCol+2)%3]):0;
const dozGap=st.domDoz>=0?st.dozPct[st.domDoz]-Math.max(st.dozPct[(st.domDoz+1)%3],st.dozPct[(st.domDoz+2)%3]):0;
const scored=fields.map(f=>{
let score=f.pct*0.62+f.conf*0.38;
if(f.state==='state-green')score+=10;
if(f.state==='state-caution')score+=2;
if(f.state==='state-danger')score-=12;
if(f.key==='columns')score+=colGap*0.55;
if(f.key==='dozens')score+=dozGap*0.45;
return Object.assign({},f,{score});
});
scored.sort((a,b)=>b.score-a.score);
const top=scored[0],second=scored[1];
const gapPct=top&&second?top.pct-second.pct:99;
const gapScore=top&&second?top.score-second.score:99;
scored.forEach((f,i)=>{
if(i===0){
f.tier=(top.pct>=54||gapPct>=10)?0:((top.pct>=48&&gapPct>=6)?0:1);
}else if(gapPct>=14||gapScore>=18){
if(f.pct<top.pct-16||f.score<top.score*0.72)f.tier=3;
else if(f.pct<top.pct-9||f.score<top.score*0.82)f.tier=2;
else f.tier=1;
}else if(gapPct>=8){
if(f.pct>=top.pct-5&&f.pct>=44)f.tier=1;
else if(f.pct>=36)f.tier=2;
else f.tier=3;
}else{
if(i===1&&f.pct>=46)f.tier=1;
else if(f.pct>=40)f.tier=2;
else f.tier=3;
}
});
return scored;
}
function qwWheelHeadline(Q,st,ranked){
if(Q.scanner&&Q.scanner.waitMode)return'ČAKAJ — flow nie je pripravený';
const hero=ranked[0];
if(!hero)return'—';
const mig=Q.trailNums&&Q.trailNums.length>=3?' · ↝ '+Q.trailNums.slice(-4).join('→'):'';
return'HLAVNÝ FLOW · '+hero.pick+' · '+hero.pct+'%'+mig;
}
function drawQwHeroSpotlight(ctx,cx,cy,r,hero,W,pulse,waitDim){
if(!hero||hero.tier>1)return;
ctx.save();
const a=waitDim?0.5:1;
ctx.globalAlpha=a;
ctx.shadowColor='rgba(120,255,210,0.55)';
ctx.shadowBlur=20+12*pulse;
const g=ctx.createRadialGradient(cx,cy,r*0.2,cx,cy,r*1.4);
g.addColorStop(0,'rgba(90,200,165,0.22)');g.addColorStop(1,'rgba(0,0,0,0)');
ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r*1.35,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;
ctx.textAlign='center';ctx.textBaseline='middle';
ctx.font='800 '+qwCanvasPx(11,10,W)+'px Segoe UI,Arial';
drawWheelTextOutlined(ctx,'HLAVNÝ TREND',cx,cy-r*0.55,'#9ec4b8',2);
ctx.font='900 '+qwCanvasPx(22,18,W)+'px Segoe UI,Arial';
let pk=hero.pick;if(pk.length>18)pk=pk.slice(0,17)+'…';
drawWheelTextOutlined(ctx,pk,cx,cy-r*0.05,'#d8fff8',4);
ctx.font='900 '+qwCanvasPx(30,24,W)+'px Segoe UI,Arial';
drawWheelTextOutlined(ctx,hero.pct+'%',cx,cy+r*0.42,'#b8fff0',4);
if(hero.sub&&hero.tier===0){
ctx.font='700 '+qwCanvasPx(10,9,W)+'px Segoe UI,Arial';
drawWheelTextOutlined(ctx,hero.sub,cx,cy+r*0.72,'#7a9e94',2);
}
ctx.restore();
}
function drawQwPlayFieldCard(ctx,x,y,f,tier,W,pulse,waitDim){
const T=[
{alpha:1,w:120,h:78,fsLbl:13,fsPick:17,fsPct:36,glow:1,stroke:'rgba(140,240,200,0.65)',fill:'rgba(14,48,40,0.92)'},
{alpha:0.82,w:86,h:54,fsLbl:11,fsPick:13,fsPct:21,glow:0,stroke:'rgba(100,170,150,0.32)',fill:'rgba(10,26,34,0.85)'},
{alpha:0.48,w:70,h:42,fsLbl:9,fsPick:11,fsPct:15,glow:0,stroke:'rgba(70,100,110,0.2)',fill:'rgba(8,14,20,0.65)'},
{alpha:0.26,w:58,h:34,fsLbl:8,fsPick:9,fsPct:12,glow:0,stroke:'rgba(50,70,80,0.12)',fill:'rgba(6,10,14,0.4)'}
];
const t=T[Math.min(3,Math.max(0,tier))];
const dim=waitDim?0.45:1;
const pickCol=f.state==='state-green'?'#9affe8':f.state==='state-danger'?'#c09090':'#c8b888';
const fsLbl=qwCanvasPx(t.fsLbl,t.fsLbl-2,W);
const fsPick=qwCanvasPx(t.fsPick,t.fsPick-2,W);
const fsPct=qwCanvasPx(t.fsPct,t.fsPct-3,W);
ctx.save();
ctx.globalAlpha=t.alpha*dim;
if(t.glow&&!waitDim){
ctx.shadowColor='rgba(111,255,200,0.55)';
ctx.shadowBlur=18+12*pulse;
}
ctx.fillStyle=t.fill;
ctx.strokeStyle=t.stroke;
ctx.lineWidth=tier===0?2.6:1.1;
const rx=x-t.w/2,ry=y-t.h/2;
if(ctx.roundRect){ctx.beginPath();ctx.roundRect(rx,ry,t.w,t.h,7);ctx.fill();ctx.stroke();}
else{ctx.fillRect(rx,ry,t.w,t.h);ctx.strokeRect(rx,ry,t.w,t.h);}
ctx.shadowBlur=0;
ctx.textAlign='center';ctx.textBaseline='middle';
ctx.font='800 '+fsLbl+'px Segoe UI,Arial';
const lblCol=tier<=1?'#b0d8cc':'#6a8a82';
drawWheelTextOutlined(ctx,f.icon+' '+f.lbl,x,ry+12,lblCol,2);
ctx.font='900 '+fsPick+'px Segoe UI,Arial';
let pk=f.pick;if(pk.length>14)pk=pk.slice(0,13)+'…';
const pkCol=tier===0?'#e8fff8':(tier===1?pickCol:'#8a9e98');
drawWheelTextOutlined(ctx,pk,x,ry+t.h*0.5,pkCol,tier===0?3:2);
ctx.font='900 '+fsPct+'px Segoe UI,Arial';
const pctCol=tier===0?'#c8fff4':(tier===1?'#9ec4b8':'#5a7068');
drawWheelTextOutlined(ctx,f.pct+'%',x,ry+t.h*0.8,pctCol,tier===0?4:2);
if(f.sub&&tier<=1){
ctx.font='700 '+qwCanvasPx(9,8,W)+'px Segoe UI,Arial';
drawWheelTextOutlined(ctx,f.sub,x,ry+t.h*0.95,'#6a8a82',1);
}
ctx.restore();
}
function drawQwPracticalFlowHub(ctx,cx,cy,hubR,dozIn,W,Q,st,pulse,waitMode,visDim,chaosSess,radarMinimal){
ctx.textAlign='center';ctx.textBaseline='middle';
if(radarMinimal)return;
if(waitMode||chaosSess){
const main=waitMode?'REŽIM ČAKANIA':'CHAOS';
const sub=waitMode?'Čakaj na stabilizáciu':'Nestabilný tok';
ctx.font='900 '+qwCanvasPx(15,13,W)+'px Segoe UI,Arial';
drawWheelTextOutlined(ctx,main,cx,cy-4,waitMode?'#ffb0a8':'#f0a0a0',2);
ctx.font='600 '+qwCanvasPx(10,9,W)+'px Segoe UI,Arial';
drawWheelTextOutlined(ctx,sub,cx,cy+14,'#9ec4b8',2);
return;
}
const fields=qwBuildWheelPlayFields(Q,st);
const ranked=qwRankWheelFieldPriority(fields,st);
const hero=ranked[0];
const byKey={};ranked.forEach(f=>{byKey[f.key]=f;});
const ringKeys=['color','parity','range','dozens','columns'];
const slotOrder=[hero.key].concat(ringKeys.filter(k=>k!==hero.key));
const rRing=(hubR+dozIn)*0.55;
const head=qwWheelHeadline(Q,st,ranked);
if(head&&head.length<48){
ctx.font='700 '+qwCanvasPx(9,8,W)+'px Segoe UI,Arial';
drawWheelTextOutlined(ctx,head,cx,cy-hubR*0.12,'#a8e8d0',2);
}
if(hero&&hero.tier<=1)drawQwHeroSpotlight(ctx,cx,cy,hubR*0.34,hero,W,pulse,false);
const drawOrder=slotOrder.slice().sort((a,b)=>(byKey[b].tier||0)-(byKey[a].tier||0));
drawOrder.forEach((key)=>{
const f=byKey[key];
if(!f||f.tier>=2)return;
const slotIdx=slotOrder.indexOf(key);
const ang=-Math.PI/2+slotIdx*(Math.PI*2/5);
const pull=f.tier===0?hubR*0.08:0;
const r=rRing-pull;
const x=cx+Math.cos(ang)*r,y=cy+Math.sin(ang)*r;
drawQwPlayFieldCard(ctx,x,y,f,f.tier,W,pulse,false);
});
}
function drawQwInnerPlayRadar(ctx,cx,cy,hubR,dozIn,W,play,waitMode,pulse){
const Q=computeQuantumWheelBrain();
drawQwPracticalFlowHub(ctx,cx,cy,hubR,dozIn,W,Q,qwColDozStats(),pulse,waitMode,1,false,true);
}
function drawQwArcTrail(ctx,cx,cy,r,nums,segment,glowMult){
if(nums.length<2)return;
ctx.save();
ctx.shadowBlur=4*glowMult;
ctx.strokeStyle='rgba(100,200,170,0.55)';ctx.lineWidth=2;ctx.lineCap='round';
for(let i=1;i<nums.length;i++){
const a=wheel.indexOf(nums[i-1]),b=wheel.indexOf(nums[i]);
if(a<0||b<0)continue;
let a0=a*segment-Math.PI/2+segment/2,a1=b*segment-Math.PI/2+segment/2;
let diff=a1-a0;
if(diff>Math.PI)diff-=Math.PI*2;
if(diff<-Math.PI)diff+=Math.PI*2;
ctx.beginPath();ctx.arc(cx,cy,r,a0,a0+diff);ctx.stroke();
}
ctx.restore();
nums.forEach((tn,ti)=>{
const idx=wheel.indexOf(tn);
if(idx<0)return;
const ang=idx*segment-Math.PI/2+segment/2;
const px=cx+Math.cos(ang)*r,py=cy+Math.sin(ang)*r;
ctx.beginPath();ctx.arc(px,py,ti===nums.length-1?8:5,0,Math.PI*2);
ctx.fillStyle=ti===nums.length-1?'#ffe566':'#00ffbf';
ctx.fill();ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.stroke();
});
}
function renderCanvasWheel(){
ensureQwFlowRadarSvg();
const canvas=document.getElementById('wheelCanvas');
if(!canvas)return;
const ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height,cx=W/2,cy=H/2;
const Q=computeQuantumWheelBrain();
const dashEl=document.getElementById('wheelRadarData');
const radarVzor=!!(dashEl&&dashEl.closest('.v6-block-wheel.v6-radar-v1'));
const radarMinimal=radarVzor;
const outerR=Math.min(W,H)*(radarMinimal?0.488:0.47);
const midR=outerR*0.7;
const hubR=outerR*0.14;
const segment=(Math.PI*2)/wheel.length;
const chaos=Q.ready?{chaosLevel:Q.chaosLevel,noEdge:Q.noEdge}:{chaosLevel:50,noEdge:true};
const chaosSess=Q.ready&&qwIsChaosSession(Q,chaos);
const at=Q.ready?qwAtmosphereClass(Q):'qw-atmos-dead';
const breathCls=Q.ready?qwFlowBreathClass(Q):'';
const pulse=chaosSess?0.35:(Q.ready?qwFlowPulse(Q):0.5);
const breathAmp=breathCls==='qw-breathe-calm'?1:(breathCls==='qw-breathe-weak'?0.65:breathCls==='qw-breathe-nervous'?0.85:0.75);
const glowMult=(chaosSess?0.28:1)*(Q.suppressed?0.35:(Q.noEdge?0.4:0.5)*pulse);
const visDim=chaosSess?0.5:1;
const nervous=!chaosSess&&dashEl&&dashEl.classList.contains('qw-breathe-nervous');
const gm=glowMult*(nervous?0.85:1);
const lastN=lastSpinNum();
const st=qwColDozStats();
const domColSet=new Set(st.domCol>=0?qwNumsForColumn(st.domCol):[]);
const pocketIn=radarMinimal?outerR*0.755:outerR*0.88;
const pocketOut=radarMinimal?outerR:outerR+2;
const colIn=hubR*1.25,colOut=outerR*0.7;
const dozIn=hubR*1.1,dozOut=outerR*0.42;
const trackIn=outerR*0.72;
ctx.clearRect(0,0,W,H);
const bg=ctx.createRadialGradient(cx,cy-H*0.08,0,cx,cy,outerR*1.25);
bg.addColorStop(0,'#121c28');bg.addColorStop(0.4,'#0a121a');bg.addColorStop(0.75,'#060c12');bg.addColorStop(1,'#030608');
ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
if(!radarMinimal){
ctx.beginPath();ctx.arc(cx,cy,outerR*0.38,0,Math.PI*2);
const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,outerR*0.38);
cg.addColorStop(0,'rgba(90,180,150,0.1)');cg.addColorStop(0.55,'rgba(40,90,75,0.04)');cg.addColorStop(1,'rgba(0,0,0,0)');
ctx.fillStyle=cg;ctx.fill();
}
ctx.beginPath();ctx.arc(cx,cy,outerR+6,0,Math.PI*2);
ctx.strokeStyle='rgba(80,200,140,'+(chaosSess?0.04:(0.06+0.12*pulse)*breathAmp)+')';ctx.lineWidth=1.2;
ctx.stroke();
if(!Q.ready){
ctx.font='600 '+qwCanvasPx(22,18,W)+'px Segoe UI,Arial';ctx.textAlign='center';ctx.textBaseline='middle';
drawWheelTextOutlined(ctx,'Zadaj 2+ spiny',cx,cy,'#c8f0e4',4);
renderQwFlowRadarSvg(null,st,{},null,pulse,false);
return;
}
const heatPre=Q.ready?qwBuildLiveHeatMap(Q,st):{map:{},deadCols:new Set()};
const deadCols=heatPre.deadCols||new Set();
const hm=heatPre.map||{};
const coreState=qwFlowCoreState(Q);
if(radarVzor&&Q.ready){
drawQwVzorWheelInner(ctx,cx,cy,outerR,segment,st,deadCols,pulse,visDim,chaosSess,lastN,hm,coreState);
const numR=outerR*0.895;
wheel.forEach((num,index)=>{
const mid=index*segment-Math.PI/2+segment/2;
const tx=cx+Math.cos(mid)*numR,ty=cy+Math.sin(mid)*numR;
const isLast=num===lastN;
ctx.save();ctx.translate(tx,ty);ctx.rotate(mid+Math.PI/2);
const fsNum=isLast?qwCanvasPx(19,16,W):qwCanvasPx(15,12,W);
ctx.font='900 '+fsNum+'px Segoe UI,Arial';
ctx.textAlign='center';ctx.textBaseline='middle';
const numCol=isLast?'#fff59d':num===0?'#f0fff8':reds.includes(num)?'#ffffff':'#f2f4f8';
drawWheelTextOutlined(ctx,String(num),0,0,numCol,isLast?4.5:(num===0?3.5:2.8));
ctx.restore();
});
drawQwVzorLabelsCanvas(ctx,cx,cy,(colIn+colOut)*0.46,st,W);
renderQwFlowRadarSvg(Q,st,hm,coreState,pulse,chaosSess);
ctx.beginPath();ctx.arc(cx,cy,outerR+3,0,Math.PI*2);
ctx.strokeStyle='rgba(80,160,140,0.22)';ctx.lineWidth=1.4;ctx.stroke();
return;
}
if(!radarMinimal)drawQwRadarGrid(ctx,cx,cy,outerR,visDim,chaosSess);
const sessWin=Math.min(22,Math.max(6,spins.length));
const sessS=Q.ready?raSliceStats(sessWin):null;
const colorPrefRed=sessS&&sessS.redPct>=sessS.blackPct;
const parPrefEven=sessS&&sessS.evenPct>=sessS.oddPct;
const domColPct=st.domCol>=0?st.colPct[st.domCol]:0;
const domDozPct=st.domDoz>=0?st.dozPct[st.domDoz]:0;
const colStrong=domColPct>=52;
const dozStrong=domDozPct>=52;
if(!radarMinimal){
for(let i=0;i<3;i++){
const a0=-Math.PI/2+i*(Math.PI*2/3),a1=a0+Math.PI*2/3;
const dom=i===st.domCol;
const deadCol=deadCols.has(i);
const domBoost=dom&&colStrong;
const a=deadCol?(0.02*visDim):(dom?(domBoost?(0.09+0.04*pulse):(0.05+0.02*pulse)):0.02)*visDim;
drawQwWedge(ctx,cx,cy,colIn,colOut,a0,a1,
deadCol?'rgba(12,16,22,'+(0.35*visDim)+')':(dom?'rgba(80,200,140,'+a+')':'rgba(0,70,120,'+(0.06*visDim)+')'),
deadCol?'rgba(50,60,70,'+(0.25*visDim)+')':(dom?'rgba(130,255,210,'+(0.35*visDim)+')':'rgba(0,120,180,'+(0.12*visDim)+')'),deadCol?0.6:(dom?1.2:0.5));
if(dom&&!deadCol&&!chaosSess){
ctx.save();
ctx.globalAlpha=(domBoost?0.12:0.06)*visDim;
ctx.strokeStyle='rgba(140,255,220,0.45)';
ctx.lineWidth=1.2;
ctx.beginPath();ctx.arc(cx,cy,(colIn+colOut)*0.5,a0,a1);ctx.stroke();
ctx.restore();
}
}
for(let i=0;i<3;i++){
const a0=-Math.PI/2+i*(Math.PI*2/3)+Math.PI/6,a1=a0+Math.PI*2/3;
const dom=i===st.domDoz;
const domBoost=dom&&dozStrong;
const da=dom?(domBoost?0.08:0.05)*visDim:0.03*visDim;
drawQwWedge(ctx,cx,cy,dozIn,dozOut,a0,a1,
dom?'rgba(0,200,240,'+da+')':'rgba(0,50,90,'+(0.05*visDim)+')',
dom?'rgba(0,220,255,'+(0.25*visDim)+')':'rgba(0,120,180,'+(0.1*visDim)+')',dom?0.9:0.4);
}
}
if(!chaosSess&&!radarMinimal){
for(let i=0;i<3;i++){
const a=-Math.PI/2+i*(Math.PI*2/3);
ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*hubR*1.1,cy+Math.sin(a)*hubR*1.1);
ctx.lineTo(cx+Math.cos(a)*colOut,cy+Math.sin(a)*colOut);
ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=0.8;ctx.stroke();
}
}
if(chaosSess){
const t=performance.now();
const flick=0.04+0.03*Math.sin(t/380);
ctx.save();
ctx.globalAlpha=flick*visDim;
ctx.strokeStyle='rgba(200,90,80,0.35)';
ctx.lineWidth=2;
ctx.beginPath();ctx.arc(cx,cy,outerR+4,0,Math.PI*2);ctx.stroke();
ctx.restore();
}
if(!radarMinimal){
if(!chaosSess&&Q.clusters&&Q.clusters[0]&&Q.clusters[0].nums&&coreState.domP>=35){
const clSet=new Set(Q.clusters[0].nums);
wheel.forEach((num,index)=>{
if(!clSet.has(num))return;
const start=index*segment-Math.PI/2,end=start+segment;
ctx.beginPath();ctx.arc(cx,cy,pocketOut+3,start,end);
ctx.strokeStyle='rgba(255,200,80,'+(0.55*visDim)+')';ctx.lineWidth=2;ctx.stroke();
});
}
ctx.beginPath();ctx.arc(cx,cy,trackIn,0,Math.PI*2);
ctx.strokeStyle='rgba(0,0,0,0.28)';ctx.lineWidth=1.8;ctx.stroke();
}
let returnGlow=[];
if(Q.clusters&&Q.clusters[0]&&Q.clusters[0].nums)returnGlow=Q.clusters[0].nums;
const domPath=Q.scanner&&Q.scanner.dominantSector?Q.scanner.dominantSector.path:'';
if(domPath&&domPath!=='—')domPath.split('-').forEach(p=>{const n=+p;if(!isNaN(n)&&n>=0&&!returnGlow.includes(n))returnGlow.push(n);});
if(!radarMinimal){
drawQwReturnZoneGlow(ctx,cx,cy,pocketOut,trackIn,segment,returnGlow,visDim,pulse);
const migNums=Q.trailNums&&Q.trailNums.length>=2?Q.trailNums:spins.slice(-10);
if(migNums.length>=3)drawQwMigrationPath(ctx,cx,cy,outerR*0.7,segment,migNums,visDim,pulse,coreState.mode,chaosSess);
}
if(!radarMinimal)wheel.forEach((num,index)=>{
const start=index*segment-Math.PI/2,end=start+segment;
const hs=qwPocketHeatStyle(num,hm,pulse,Q.chaosLevel||0,visDim,num===lastN);
const inDom=domColSet.has(num);
const isGreen=num===0;
ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,pocketOut,start,end);ctx.arc(cx,cy,trackIn,end,start,true);ctx.closePath();
if(hs.opacity!=null)ctx.globalAlpha=hs.opacity;
ctx.fillStyle=hs.fill;ctx.fill();
if(hs.opacity!=null)ctx.globalAlpha=1;
if(!radarMinimal&&inDom&&!isGreen){
ctx.globalAlpha=0.2*visDim;
ctx.fillStyle='rgba(80,200,140,0.35)';ctx.fill();ctx.globalAlpha=1;
}else if(!radarMinimal&&!isGreen&&sessS&&!chaosSess){
const isRed=reds.includes(num);
const isEven=num%2===0;
if((colorPrefRed&&isRed)||(!colorPrefRed&&!isRed&&num>0)){
ctx.globalAlpha=0.12*visDim;
ctx.fillStyle=colorPrefRed?'rgba(220,50,60,0.35)':'rgba(40,40,55,0.4)';ctx.fill();ctx.globalAlpha=1;
}
if((parPrefEven&&isEven)||(!parPrefEven&&!isEven&&num>0)){
ctx.globalAlpha=0.08*visDim;
ctx.fillStyle='rgba(120,200,255,0.25)';ctx.fill();ctx.globalAlpha=1;
}
}else if(!radarMinimal&&Q.ready&&!inDom&&num===lastN){
ctx.globalAlpha=0.35;
ctx.fillStyle='rgba(255,200,80,0.45)';ctx.fill();ctx.globalAlpha=1;
}
ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,pocketOut,start,end);ctx.closePath();
ctx.strokeStyle=hs.stroke;ctx.lineWidth=1.6;ctx.stroke();
ctx.beginPath();ctx.arc(cx,cy,pocketOut,start,end);
let rim=hs.rim;
if(chaosSess&&num===lastN)rim='#ffd43d';
else if(inDom&&!chaosSess)rim='rgba(80,200,140,'+(0.55+0.15*pulse)+')';
ctx.strokeStyle=rim;
ctx.lineWidth=chaosSess?(num===lastN?3:1.2):(inDom?2+0.5*pulse:(num===lastN?3.5:1.4+(hs.glow?0.5:0)));
if(hs.glow>0.12){
ctx.save();
ctx.shadowColor=hs.rim;
ctx.shadowBlur=6+10*hs.glow*visDim;
ctx.stroke();
ctx.restore();
}else ctx.stroke();
});
if(!radarMinimal&&Q.trailNums.length>=2&&coreState.mode!=='chaos'&&!chaosSess)drawQwArcTrail(ctx,cx,cy,outerR*0.58,Q.trailNums,segment,gm*0.55*visDim);
if(!radarMinimal)drawQwFlowCore(ctx,cx,cy,hubR,coreState,pulse,visDim,st,chaosSess);
renderQwFlowRadarSvg(Q,st,hm,coreState,pulse,chaosSess);
const waitM=Q.scanner&&Q.scanner.waitMode;
if(!radarMinimal)drawQwPracticalFlowHub(ctx,cx,cy,hubR,dozIn,W,Q,st,pulse,waitM,visDim,chaosSess,false);
const numR=outerR*(radarMinimal?0.895:0.84);
wheel.forEach((num,index)=>{
const mid=index*segment-Math.PI/2+segment/2;
const tx=cx+Math.cos(mid)*numR,ty=cy+Math.sin(mid)*numR;
const isLast=num===lastN;
const deadP=!radarMinimal&&hm[num]&&hm[num].type==='dead';
ctx.save();ctx.translate(tx,ty);ctx.rotate(mid+Math.PI/2);
const fsNum=radarMinimal?(isLast?qwCanvasPx(19,16,W):qwCanvasPx(15,12,W)):(isLast?qwCanvasPx(20,17,W):qwCanvasPx(16,14,W));
ctx.font='900 '+fsNum+'px Segoe UI,Arial';
ctx.textAlign='center';ctx.textBaseline='middle';
const numCol=isLast?'#fff59d':num===0?'#f0fff8':reds.includes(num)?'#ffffff':'#f2f4f8';
const outlineW=isLast?4.5:(num===0?3.5:2.8);
ctx.globalAlpha=deadP?0.42:1;
drawWheelTextOutlined(ctx,String(num),0,0,numCol,outlineW);
ctx.restore();
});
ctx.beginPath();ctx.arc(cx,cy,outerR+(radarMinimal?3:6),0,Math.PI*2);
ctx.strokeStyle=radarMinimal?'rgba(80,160,140,0.22)':'rgba(0,255,102,'+(chaosSess?0.12:0.3+0.4*pulse)+')';
ctx.lineWidth=radarMinimal?1.4:(chaosSess?1:2);ctx.stroke();
}

function renderLight(opts){
opts=opts||{};
updateBoard();
renderWarning();
renderAlertSystem();
renderHistory();
renderStatsPanel();
renderTiming();
renderCorePrediction();
renderRngBehavior();
renderRandomSessionPick();
renderSpinEngine();
renderAlerts();
renderHotCold();
initV6ZoneScroll();
try{renderWheelRadar();}catch(e){console.error('wheelRadar',e);}
if(opts.wheelImmediate)flushWheelRender();
else scheduleWheelRender();
renderEngineAdvancedPanels();
}
function renderHeavy(){
renderEngineAdvancedPanels();
}

let clockTimer=null;
function updateClock(){
const el=document.getElementById('liveClock');
const dateEl=document.getElementById('liveDate');
if(!el||!dateEl)return;
const now=new Date();
el.textContent=now.toLocaleTimeString('sk-SK',{hour12:false});
dateEl.textContent=now.toLocaleDateString('sk-SK');
}
function bindUi(){
updateClock();
if(!clockTimer)clockTimer=setInterval(updateClock,1000);
const btnStart=document.getElementById('btnStart');
const btnStop=document.getElementById('btnStop');
const btnReset=document.getElementById('btnReset');
const btnUndoLast=document.getElementById('btnUndoLast');
if(btnUndoLast)btnUndoLast.onclick=()=>undoLastSpin();
const btnClearSession=document.getElementById('btnClearSession');
if(btnClearSession)btnClearSession.onclick=()=>{
if(!confirm('Vymazať históriu a uloženú reláciu?'))return;
clearSessionData();
renderLight();
updateSessionStatus();
};
if(btnStart)btnStart.onclick=()=>{
timingRunning=true;
timingStartAt=Date.now();
startTimingTick();
renderTiming();
};
if(btnStop)btnStop.onclick=()=>{
if(!timingRunning||!timingStartAt)return;
const sec=(Date.now()-timingStartAt)/1000;
timingRunning=false;
timingStartAt=null;
stopTimingTick();
timingCaptureStop(sec);
updateBallTimingMetrics();
renderTiming();
renderLight();
};
const btnUndoEl=document.getElementById('btnTimingUndo');
const numInput=document.getElementById('timingResultNum');
function submitTimingNumber(){
if(!numInput)return;
if(commitBallTimingNumber(numInput.value)){numInput.value='';numInput.classList.remove('pending');renderTiming();renderLight();}
}
if(numInput){
numInput.onkeydown=(e)=>{if(e.key==='Enter'){e.preventDefault();submitTimingNumber();}};
numInput.onchange=()=>{if(numInput.value!=='')submitTimingNumber();};
}
if(btnUndoEl)btnUndoEl.onclick=()=>undoLastBallTiming();
const btnEngAdv=document.getElementById('btnEngineAdvanced');
const engAdvPanel=document.getElementById('engineAdvancedPanel');
if(btnEngAdv&&engAdvPanel)btnEngAdv.onclick=()=>{
const closed=engAdvPanel.classList.toggle('collapsed');
engineAdvancedOpen=!closed;
btnEngAdv.classList.toggle('open',!closed);
btnEngAdv.setAttribute('aria-expanded',closed?'false':'true');
btnEngAdv.textContent=closed?'▶ 🔧 LADIACI REŽIM · AI a engine diagnostika':'▼ 🔧 LADIACI REŽIM · AI a engine diagnostika';
if(engineAdvancedOpen)renderEngineAdvancedPanels();
};
const btnResetPred=document.getElementById('btnResetPred');
if(btnResetPred)btnResetPred.onclick=()=>{
predFlowEngineCache=null;predFlowEngineKey='';
predFlowPrevSnapshot=null;predLastPick=null;
predStableState={mainCol:null,mainDoz:null,mainMode:null,col:null,doz:null,tier:'MEDIUM',weakStreak:0,confirmStreak:0,candidateCol:null,candidateStreak:0,holdSpins:0,prevRezim:null};
invalidatePredCache();
renderLight({wheelImmediate:true});
showSessionToast('Predikčný flow resetovaný');
};
if(btnReset)btnReset.onclick=()=>{
if(btnResetPred)btnResetPred.click();
};
}
function initV6ZoneScroll(){
document.querySelectorAll('.v6-zone-scroll').forEach(function(wrap){
const body=wrap.querySelector('.v6-zone-body');
if(!body||body.dataset.v6ScrollBound)return;
body.dataset.v6ScrollBound='1';
const step=function(){return Math.max(100,Math.round(body.clientHeight*0.72));};
const up=wrap.querySelector('.v6-zone-scroll-up');
const down=wrap.querySelector('.v6-zone-scroll-down');
if(up)up.addEventListener('click',function(){body.scrollBy({top:-step(),behavior:'smooth'});});
if(down)down.addEventListener('click',function(){body.scrollBy({top:step(),behavior:'smooth'});});
});
}
function bootApp(){
function applyBootUI(restored){
updateStats();
updateSessionStatus();
renderLight({wheelImmediate:true});
renderHeavy();
initV6ZoneScroll();
if(restored&&spins.length)showSessionToast('Relácia obnovená · '+spins.length+' spinov');
}
createBoard();
bindUi();
initV6ZoneScroll();
applyBootUI(false);
loadSessionIDB().then(function(restored){
if(restored)applyBootUI(true);
}).catch(function(){});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootApp);
else bootApp();

