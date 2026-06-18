'use strict';
/* 10H-3b session-stats.js — Balík 10H */

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

/* A2: miera prechodov R/B (nie /spins) · škála 0–8 */
const rate=transitions/Math.max(1,spins.length-1);
cache.entropy=(rate*8).toFixed(2);

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
