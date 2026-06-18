/**
 * Keyboard Live AI Flow — Balík 9C extrakcia z index-NOVY-V2.html
 * Závisí na: state, helpers, confidence-engine, roulette-analytics (rbaWeightedBins),
 * V2 inline (getClusters, computeHotColdEngine, getWheelMigrationDirection, kbFlowBoxHTML).
 */
'use strict';

const KB_FLOW_MIN=12;
const KB_FLOW_PAIRS=[[0,1],[0,2],[1,2]];
let kbFlowPersist={dozKey:'',colKey:'',confDoz:40,confCol:40,confColor:28,confParity:26,confRange:26,status:'wait'};

function kbFlowResetState(){
kbFlowPersist={dozKey:'',colKey:'',confDoz:40,confCol:40,confColor:28,confParity:26,confRange:26,status:'wait'};
}
function kbFlowPairLabel(kind,pair){
const n=['1','2','3'];
const unit=kind==='doz'?'TUCET':'STĹPEC';
return n[pair[0]]+' + '+n[pair[1]]+' · '+unit;
}
function kbFlowWeightedWindow(maxLen){
const col=[0,0,0],doz=[0,0,0],color={r:0,b:0},parity={e:0,o:0},range={lo:0,hi:0};
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
if(num<=18)range.lo+=wt;else range.hi+=wt;
});
if(spins.length&&spins[spins.length-1]===0){
range.hi*=1.35;range.lo*=0.88;
if(doz[2]!=null)doz[2]*=1.28;
}
return{col,doz,color,parity,range,total:totalW};
}
function kbFlowMergeBins(short,long){
const out=[0,0,0];
for(let i=0;i<3;i++){
const a=short.total>0?short.col[i]/short.total:0;
const b=long.total>0?long.col[i]/long.total:0;
out[i]=a*0.62+b*0.38;
}
return out;
}
function kbFlowMergeDoz(short,long){
const out=[0,0,0];
for(let i=0;i<3;i++){
const a=short.total>0?short.doz[i]/short.total:0;
const b=long.total>0?long.doz[i]/long.total:0;
out[i]=a*0.62+b*0.38;
}
return out;
}
function kbFlowBlendRba(bins,field){
if(spins.length<8)return bins;
const rba=rbaWeightedBins(field);
const sum=rba.reduce((a,b)=>a+b,0)||1;
return bins.map((v,i)=>v*0.72+(rba[i]/sum)*0.28);
}
function kbFlowBestPair(bins,keyField,kind){
const scores=KB_FLOW_PAIRS.map(p=>{
const s=bins[p[0]]+bins[p[1]];
return{p,s,key:p[0]+'-'+p[1],label:kbFlowPairLabel(kind,p)};
});
scores.sort((a,b)=>b.s-a.s);
let pick=scores[0];
const prevKey=kind==='doz'?kbFlowPersist.dozKey:kbFlowPersist.colKey;
if(prevKey){
const prev=scores.find(x=>x.key===prevKey);
if(prev&&pick.s-prev.s<0.07)pick=prev;
}
if(kind==='doz')kbFlowPersist.dozKey=pick.key;
else kbFlowPersist.colKey=pick.key;
const spread=pick.s-(scores[1]?scores[1].s:0);
const base=Math.min(1,pick.s*2.2)*55+spread*120;
return{label:pick.label,conf:clamp(Math.round(base),8,98),key:pick.key};
}
function kbFlowOppositePair(bins,kind){
const scores=KB_FLOW_PAIRS.map(p=>({p,s:bins[p[0]]+bins[p[1]],key:p[0]+'-'+p[1]}));
scores.sort((a,b)=>a.s-b.s);
const pick=scores[0];
return{label:kbFlowPairLabel(kind,pick.p),conf:clamp(Math.round(38+pick.s*40),12,55),key:pick.key};
}
function kbFlowAnomalyTriplet(){
const r=spins.slice(-3).filter(n=>n>0);
if(r.length<3)return false;
const d=getDozen(r[0]),c=getColumn(r[0]);
if(d<0||c<0)return false;
return r.every(n=>getDozen(n)===d&&getColumn(n)===c);
}
function kbFlowLerpConf(cur,target,up,down){
if(target>cur)return Math.min(target,cur+(up||7));
return Math.max(target,cur-(down||11));
}
function computeKeyboardLiveAIFlow(){
const n=spins.length;
const learn=n<KB_FLOW_MIN;
const active=n>=KB_FLOW_MIN;
const short=kbFlowWeightedWindow(12);
const long=kbFlowWeightedWindow(50);
let colBins=kbFlowBlendRba(kbFlowMergeBins(short,long),'col');
let dozBins=kbFlowBlendRba(kbFlowMergeDoz(short,long),'doz');
const conf=computeConfidenceEngine();
const chaosPct=conf.chaosPct;
const anomaly=kbFlowAnomalyTriplet();
const mig=n>=4?getWheelMigrationDirection():{label:'—'};
const hc=n>=3?computeHotColdEngine():null;
const cluster=n>=2?getClusters()[0]:null;
let dozPick,colPick;
if(anomaly){
dozPick=kbFlowOppositePair(dozBins,'doz');
colPick=kbFlowOppositePair(colBins,'col');
}else{
dozPick=kbFlowBestPair(dozBins,'dozKey','doz');
colPick=kbFlowBestPair(colBins,'colKey','col');
}
const cr=short.color.r+long.color.r*0.35,cb=short.color.b+long.color.b*0.35;
const colorLabel=cr>=cb?'ČERVENÁ':'ČIERNA';
const colorConf=clamp(Math.round(Math.abs(cr-cb)/(cr+cb+0.01)*100),12,72);
const pe=short.parity.e+long.parity.e*0.35,po=short.parity.o+long.parity.o*0.35;
const parLabel=pe>=po?'PÁRNE':'NEPÁRNE';
const parConf=clamp(Math.round(Math.abs(pe-po)/(pe+po+0.01)*100),10,68);
const rl=short.range.lo+long.range.lo*0.35,rh=short.range.hi+long.range.hi*0.35;
const rangeLabel=rh>=rl?'19–36':'1–18';
const rangeConf=clamp(Math.round(Math.abs(rh-rl)/(rh+rl+0.01)*100),10,68);
let status='play';
let banner;
if(!active){
status='learn';
banner={txt:conf.playHead,cls:'wait'};
}else if(conf.status==='ČAKAJ'){
status='wait';
banner={txt:conf.playHead,cls:'wait'};
}else if(conf.status==='OPATRNE'){
status='caution';
banner={txt:conf.playHead,cls:'caution'};
}else{
status='play';
banner={txt:conf.playHead,cls:'play'};
}
const chaosPenalty=active&&chaosPct>=50?Math.round((chaosPct-46)*0.35):0;
dozPick.conf=clamp(dozPick.conf-chaosPenalty+(status==='play'?10:4),12,99);
colPick.conf=clamp(colPick.conf-chaosPenalty+(status==='play'?10:4),12,99);
kbFlowPersist.confDoz=kbFlowLerpConf(kbFlowPersist.confDoz,dozPick.conf);
kbFlowPersist.confCol=kbFlowLerpConf(kbFlowPersist.confCol,colPick.conf);
kbFlowPersist.confColor=kbFlowLerpConf(kbFlowPersist.confColor,colorConf,5,8);
kbFlowPersist.confParity=kbFlowLerpConf(kbFlowPersist.confParity,parConf,5,8);
kbFlowPersist.confRange=kbFlowLerpConf(kbFlowPersist.confRange,rangeConf,5,8);
kbFlowPersist.status=status;
const dimPrimary=false;
const opTag='';
return{
learn,progress:n,need:KB_FLOW_MIN,chaos:chaosPct,status,banner,anomaly,dimPrimary,active,
doz:{label:dozPick.label,conf:kbFlowPersist.confDoz,tag:opTag},
col:{label:colPick.label,conf:kbFlowPersist.confCol,tag:opTag},
color:{label:colorLabel,conf:kbFlowPersist.confColor},
parity:{label:parLabel,conf:kbFlowPersist.confParity},
range:{label:rangeLabel,conf:kbFlowPersist.confRange},
meta:{
mig:mig.label||'—',
cluster:cluster&&cluster.nums?cluster.nums.slice(0,4).join(' → '):'—',
hot:hc&&hc.hot[0]?hc.hot[0].n:'—',
clicks:n
}
};
}

function renderKeyboardLiveAIFlow(){
const root=document.getElementById('kbLiveFlowPanel');
if(!root)return;
const R=computeKeyboardLiveAIFlow();
const learnEl=document.getElementById('kbFlowLearn');
const bannerEl=document.getElementById('kbFlowBanner');
const rowEl=document.getElementById('kbFlowRow');
const primEl=document.getElementById('kbFlowPrimary');
const secEl=document.getElementById('kbFlowSecondary');
const metaEl=document.getElementById('kbFlowMeta');
root.classList.toggle('kb-flow-has-anomaly',!!R.anomaly&&R.active);
const showSignals=!!R.active;
if(learnEl){
if(R.learn){
const pct=Math.round(R.progress/R.need*100);
learnEl.innerHTML='Učenie <b>'+R.progress+'/'+R.need+'</b>'
+'<div class="kb-flow-learn-bar"><i style="width:'+pct+'%"></i></div>';
learnEl.hidden=false;
}else learnEl.hidden=true;
}
if(rowEl)rowEl.hidden=!showSignals;
if(bannerEl){
bannerEl.textContent=R.banner.txt;
bannerEl.className='kb-flow-banner '+R.banner.cls;
bannerEl.hidden=false;
}
if(metaEl){
metaEl.textContent='Chaos '+R.chaos+'% · '+R.meta.mig+' · kliky '+R.meta.clicks;
}
if(showSignals){
if(primEl){
primEl.innerHTML=
kbFlowBoxHTML('TUCET',R.doz,true,false)
+kbFlowBoxHTML('STĹPEC',R.col,true,false);
}
if(secEl){
secEl.innerHTML=
kbFlowBoxHTML('FARBA',R.color,false,false)
+kbFlowBoxHTML('P/N',R.parity,false,false)
+kbFlowBoxHTML('RANGE',R.range,false,false);
}
}else{
if(primEl)primEl.innerHTML='';
if(secEl)secEl.innerHTML='';
}
}
