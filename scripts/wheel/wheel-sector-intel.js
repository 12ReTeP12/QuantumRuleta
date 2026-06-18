/**
 * Wheel Sector Intel — Balík 10H-4B z index-NOVY-V2.html
 * Závisí na: pred-dashboard (computeHotColdEngine), pred-flow-engine (MODEL),
 * session-stats (entropy, getClusters, neighborChain), V2 inline (scoring, migration, hasMinSpins)
 */
'use strict';

let lastWheelIntel=null;
let lastWheelIntelKey='';
const WHEEL_SPIN_WEIGHT={history:0.22,neighbors:0.20,cluster:0.18,migration:0.15,hotCold:0.12,streak:0.05,entropy:0.08};

function invalidateWheelSectorIntelCache(){
lastWheelIntel=null;
lastWheelIntelKey='';
}


/* --- 10H-4B-b --- */
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

/* --- 10H-4B-a --- */
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
