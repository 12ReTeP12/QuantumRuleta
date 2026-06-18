/**
 * Wheel Canvas — Balík 10F3 z index-NOVY-V2.html
 * Závisí na: wheel-brain.js, quantum-wheel.js, V2 inline (HUD copy, schedule render, DOM build).
 */
'use strict';

let qwCanvasAnimId=null;
function qwStopCanvasAnim(){
if(qwCanvasAnimId){cancelAnimationFrame(qwCanvasAnimId);qwCanvasAnimId=null;}
}
let qwWheelResizeBound=false;
/* qwSyncWheelStageSize — jediná runtime autorita (10F1); nie v quantum-wheel.js */
function qwSyncWheelStageSize(){
const block=document.querySelector('.v6-block-wheel.v6-radar-v1');
if(!block)return;
const layout=block.querySelector('.quantum-hero-layout');
const center=block.querySelector('.hero-center-core');
const stage=block.querySelector('.qw-wheel-stage');
const cv=document.getElementById('wheelCanvas');
if(!center||!stage||!cv)return;
stage.style.width='';stage.style.height='';stage.style.maxWidth='';stage.style.maxHeight='';stage.style.margin='';
cv.style.width='';cv.style.height='';cv.style.maxWidth='';cv.style.maxHeight='';
const leg=center.querySelector('.qw-flow-legend');
const legH=leg?Math.ceil(leg.getBoundingClientRect().height)+4:0;
const header=block.querySelector('.qw-dash-header');
const bottom=block.querySelector('.hero-bottom-hud');
const model=block.querySelector('.qw-dash-model');
const body=block.querySelector('.qw-dash-body');
const headerH=header?header.offsetHeight:40;
const bottomH=bottom?bottom.offsetHeight:88;
const modelH=model?model.offsetHeight:24;
const bodyH=body?body.clientHeight:0;
let centerH=center.clientHeight;
if(centerH<240){
centerH=Math.max(bodyH-headerH-bottomH-modelH,body.clientHeight-headerH-bottomH-modelH,480);
}
const sideW=parseInt(getComputedStyle(block).getPropertyValue('--qw-side-w'),10)||196;
const layoutW=layout?layout.clientWidth:block.clientWidth;
const maxWheelW=Math.max(layoutW-sideW*2,320);
const maxH=Math.max(centerH-legH-4,280);
const size=Math.floor(Math.min(maxWheelW*0.999,maxH*0.998));
block.style.setProperty('--qw-canvas-px',size+'px');
stage.style.width=size+'px';stage.style.height=size+'px';
cv.style.width=size+'px';cv.style.height=size+'px';
cv.width=1080;cv.height=1080;
if(typeof renderCanvasWheel==='function')renderCanvasWheel();
}
function qwBindWheelResize(){
if(qwWheelResizeBound)return;
qwWheelResizeBound=true;
window.addEventListener('resize',()=>{qwSyncWheelStageSize();},{passive:true});
const block=document.querySelector('.v6-block-wheel.v6-radar-v1');
if(block&&typeof ResizeObserver!=='undefined'){
const ro=new ResizeObserver(()=>{qwSyncWheelStageSize();});
ro.observe(block);
const main=block.querySelector('.quantum-hero-layout');
const center=block.querySelector('.hero-center-core');
const leg=block.querySelector('.qw-flow-legend');
if(main)ro.observe(main);
if(center)ro.observe(center);
if(leg)ro.observe(leg);
}
setTimeout(qwSyncWheelStageSize,500);
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

/* ======================================
CANVAS WHEEL
====================================== */

function wheelPocketBase(num){
if(num===0)return{fill:'rgba(0,160,90,0.45)',stroke:'#065a32',rim:'#5ee09a'};
if(reds.includes(num))return{fill:'rgba(180,30,40,0.45)',stroke:'#7a1220',rim:'#ff6b6b'};
return{fill:'rgba(20,20,30,0.45)',stroke:'#0a0a10',rim:'#8a8a98'};
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
ctx.globalAlpha=0.55*visDim;
for(let i=1;i<=3;i++){
const r=rOut*(0.32+i*0.22);
ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
ctx.strokeStyle='rgba(55,170,210,0.12)';ctx.lineWidth=0.85;ctx.stroke();
}
for(let i=0;i<6;i++){
const a=-Math.PI/2+i*(Math.PI/3);
ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*rOut*0.12,cy+Math.sin(a)*rOut*0.12);
ctx.lineTo(cx+Math.cos(a)*rOut*0.98,cy+Math.sin(a)*rOut*0.98);
ctx.strokeStyle='rgba(70,210,255,0.28)';ctx.lineWidth=1.05;ctx.stroke();
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
function drawQwVzorLabelsCanvas(ctx,cx,cy,outerR,st,canvasW){
const sc=Math.max(0.72,Math.min(1.15,(canvasW||1080)/1080));
const pocketIn=outerR*0.755,hubR=outerR*0.14;
const colMid=(hubR*1.05+pocketIn*0.70)*0.5,dozMid=(hubR*0.78+pocketIn*0.48)*0.5;
ctx.save();
ctx.textAlign='center';
ctx.textBaseline='middle';
QW_VZOR_LABEL_SLOTS.forEach(slot=>{
const rLbl=(slot.kind==='col'?colMid:dozMid)*0.94;
const x=cx+Math.cos(slot.ang)*rLbl,y=cy+Math.sin(slot.ang)*rLbl;
const dom=slot.kind==='col'?(slot.idx===st.domCol):(slot.idx===st.domDoz);
const pct=Math.round(slot.kind==='col'?(st.colPct[slot.idx]||0):(st.dozPct[slot.idx]||0));
const title=slot.prefix+' '+(slot.idx+1);
const lblY=y-(dom?26:22),pctY=y+(dom?18:14),domY=y+52;
ctx.font='700 '+Math.round(20*sc)+'px Segoe UI,Arial,sans-serif';
drawWheelTextOutlined(ctx,title,x,lblY,'#eef4f8',3);
ctx.font=(dom?'900 ':'800 ')+Math.round((dom?58:34)*sc)+'px Segoe UI,Arial,sans-serif';
drawWheelTextOutlined(ctx,pct+'%',x,pctY,dom?'#8cff9a':'#ffffff',dom?4:3.5);
if(dom){
ctx.font='800 '+Math.round(11*sc)+'px Segoe UI,Arial,sans-serif';
drawWheelTextOutlined(ctx,'DOMINANTNÝ',x,domY,'#8cff9a',2.5);
}
});
ctx.restore();
}
/** Vnútorné koleso — celá grafika vzor obr.2 (bez popisov) */
function drawQwVzorWheelInner(ctx,cx,cy,outerR,segment,st,deadCols,pulse,visDim,chaosSess,lastN,hm,coreState){
const hubR=outerR*0.14;
const pocketIn=outerR*0.755;
ctx.save();
const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,pocketIn);
bg.addColorStop(0,'#050810');bg.addColorStop(0.45,'#0a1218');bg.addColorStop(1,'#0e1820');
ctx.fillStyle=bg;ctx.beginPath();ctx.arc(cx,cy,pocketIn,0,Math.PI*2);ctx.fill();
ctx.restore();
drawQwEuropeanWheelShape(ctx,cx,cy,outerR,segment,lastN);
drawQwVzorSixSegmentHub(ctx,cx,cy,hubR,pocketIn,st,pulse,visDim,chaosSess);
ctx.save();
const glowR=hubR*2.8;
const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,glowR);
cg.addColorStop(0,'rgba(80,210,255,0.75)');
cg.addColorStop(0.2,'rgba(35,150,255,0.42)');
cg.addColorStop(0.5,'rgba(15,80,160,0.15)');
cg.addColorStop(1,'rgba(0,0,0,0)');
ctx.shadowColor='rgba(50,190,255,0.7)';
ctx.shadowBlur=22;
ctx.fillStyle=cg;ctx.beginPath();ctx.arc(cx,cy,glowR,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;
const core=ctx.createRadialGradient(cx,cy,0,cx,cy,hubR*0.55);
core.addColorStop(0,'rgba(190,240,255,0.95)');
core.addColorStop(0.5,'rgba(60,180,255,0.5)');
core.addColorStop(1,'rgba(0,0,0,0)');
ctx.fillStyle=core;ctx.beginPath();ctx.arc(cx,cy,hubR*0.55,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#030810';
ctx.beginPath();ctx.arc(cx,cy,hubR*0.16,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='rgba(130,230,255,0.5)';ctx.lineWidth=1;ctx.stroke();
ctx.restore();
if(hm&&coreState)drawQwVzorFlowArcsCanvas(ctx,cx,cy,outerR*0.93,st,hm,coreState,chaosSess);
drawQwVzorGoldBand(ctx,cx,cy,pocketIn);
}
/** Zakrivené flow čiary na canvas (vzor — namiesto SVG lúčov) */
function drawQwVzorFlowArcsCanvas(ctx,cx,cy,rEnd,st,hm,coreState,chaosSess){
const items=qwFlowBeamsVzorItems(st,hm,coreState,chaosSess);
const t=performance.now();
const pulse=0.55+0.45*Math.sin(t/2500);
ctx.save();
ctx.lineCap='round';
ctx.globalCompositeOperation='lighter';
items.forEach(it=>{
const tier=it.tier;
const strong=tier==='strong',mid=tier==='mid';
ctx.strokeStyle=strong?'rgba(115,255,95,0.92)':mid?'rgba(255,200,70,0.78)':'rgba(45,185,245,0.72)';
ctx.lineWidth=strong?2.4:mid?1.6:1.05;
ctx.globalAlpha=(strong?0.95:mid?0.78:0.58)*pulse;
ctx.shadowColor=strong?'rgba(115,255,95,0.75)':mid?'rgba(255,200,70,0.5)':'rgba(45,185,245,0.55)';
ctx.shadowBlur=strong?10:mid?6:4;
const bend=0.42*Math.sin(it.ang*1.55+it.seed*0.31)+0.12*Math.sin(it.seed*0.44);
const rMul=it.rim?(it.frag?0.72:0.98):(it.frag?0.48:0.68);
const rUse=rEnd*rMul;
const ex=cx+Math.cos(it.ang)*rUse,ey=cy+Math.sin(it.ang)*rUse;
const mx=cx+Math.cos(it.ang+bend)*rUse*0.42,my=cy+Math.sin(it.ang+bend)*rUse*0.42;
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
function qwDeadColumns(){
const slice=spins.slice(-16).filter(n=>n>0);
const colHits=[0,0,0];
slice.forEach(n=>{const c=getColumn(n);if(c>=0)colHits[c]++;});
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
const col=getColumn(n);
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
const segment=(Math.PI*2)/wheel.length;
const domCol=st.domCol,domDoz=st.domDoz;
wheel.forEach((num,index)=>{
const ang=index*segment-Math.PI/2+segment/2;
const ci=num===0?-1:getColumn(num),di=num===0?-1:getDozen(num);
let score=num===0?0.12:0.18;
if(domCol>=0&&ci===domCol)score+=0.55*((st.colPct[domCol]||0)/100);
if(domDoz>=0&&di===domDoz)score+=0.32*((st.dozPct[domDoz]||0)/100);
const hi=hm&&hm[num];
if(hi){if(hi.type==='return'||hi.type==='repeat')score+=0.28;else if(hi.type==='hot')score+=0.12;}
let tier=score>=0.46?'strong':score>=0.26?'mid':'weak';
const subs=tier==='strong'?5:(tier==='mid'?3:2);
for(let s=0;s<subs;s++){
const spread=subs>1?((s/(subs-1))-0.5)*0.035:0;
items.push({tier,ang:ang+spread,seed:index*17+s*5,frag:!!chaosSess,rim:true});
}
});
QW_VZOR_LABEL_SLOTS.forEach(slot=>{
const dom=slot.kind==='col'?(slot.idx===st.domCol):(slot.idx===st.domDoz);
const pct=slot.kind==='col'?(st.colPct[slot.idx]||0):(st.dozPct[slot.idx]||0);
if(!dom&&pct<20)return;
const span=Math.PI/3;
const a0=slot.ang-span/2,a1=slot.ang+span/2;
let n=Math.round((dom?14:4)*(0.28+pct/82)*boost);
n=Math.max(dom?8:2,Math.min(dom?22:5,n));
for(let k=0;k<n;k++){
const t=n>1?k/(n-1):0.5;
const ang=a0+0.12+(a1-a0-0.24)*t+0.02*Math.sin(k*2.1+slot.idx);
let tier='weak';
if(dom&&!chaosSess)tier='mid';
else if(dom&&chaosSess)tier='weak';
else if(pct>=24)tier='weak';
items.push({tier,ang,seed:slot.idx*500+k*11+(slot.kind==='doz'?3000:0),frag:!!chaosSess,rim:false});
}
});
return items;
}
function drawQwVzorSixSegmentHub(ctx,cx,cy,hubR,pocketIn,st,pulse,visDim,chaosSess){
const colIn=hubR*1.05,colOut=pocketIn*0.70;
const dozIn=hubR*0.78,dozOut=pocketIn*0.48;
const colSegs=[
{idx:0,a0:-5*Math.PI/6,a1:-Math.PI/2},
{idx:1,a0:-Math.PI/2,a1:-Math.PI/3},
{idx:2,a0:-Math.PI/3,a1:0}
];
const dozSegs=[
{idx:2,a0:0,a1:Math.PI/3},
{idx:1,a0:Math.PI/3,a1:2*Math.PI/3},
{idx:0,a0:2*Math.PI/3,a1:Math.PI}
];
colSegs.forEach(seg=>{
const dom=seg.idx===st.domCol;
const pct=st.colPct[seg.idx]||0;
const a=dom?(0.1+0.03*pulse)*(Math.max(0.38,pct/100)):0.02;
drawQwWedge(ctx,cx,cy,colIn,colOut,seg.a0,seg.a1,
dom?'rgba(0,100,75,'+(a*visDim)+')':'rgba(5,12,20,'+(0.45*visDim)+')',
dom?'rgba(90,255,160,'+(0.2*visDim)+')':'rgba(35,80,110,'+(0.06*visDim)+')',
dom?1:0.45);
});
dozSegs.forEach(seg=>{
const dom=seg.idx===st.domDoz;
const pct=st.dozPct[seg.idx]||0;
const a=dom?(0.12+0.03*pulse)*(Math.max(0.38,pct/100)):0.025;
drawQwWedge(ctx,cx,cy,dozIn,dozOut,seg.a0,seg.a1,
dom?'rgba(0,110,80,'+(a*visDim)+')':'rgba(4,10,18,'+(0.4*visDim)+')',
dom?'rgba(100,255,170,'+(0.22*visDim)+')':'rgba(30,70,95,'+(0.07*visDim)+')',
dom?1.1:0.5);
});
drawQwVzorInnerGrid(ctx,cx,cy,pocketIn*0.72,visDim);
}
/** Vláknové flow čiary — cyan + zelené v dominantných sektoroch */
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
const ci=getColumn(num),di=getDozen(num);
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
function drawQwVzorRimPocketGlow(ctx,cx,cy,pocketOut,segment,nums,pulse,visDim){
if(!nums||!nums.length)return;
const set=new Set(nums.filter(n=>n>0));
const t=performance.now();
const pulseR=0.5+0.5*Math.sin(t/850);
wheel.forEach((num,index)=>{
if(!set.has(num))return;
const start=index*segment-Math.PI/2,end=start+segment;
ctx.save();
ctx.globalAlpha=(0.28+0.18*pulse*pulseR)*visDim;
ctx.strokeStyle='rgba(255,255,255,0.72)';
ctx.lineWidth=13;
ctx.shadowColor='rgba(255,255,255,0.85)';
ctx.shadowBlur=22;
ctx.beginPath();ctx.arc(cx,cy,pocketOut+5,start,end);ctx.stroke();
ctx.globalAlpha=(0.42+0.22*pulse*pulseR)*visDim;
ctx.strokeStyle='rgba(255,255,255,0.95)';
ctx.lineWidth=5;
ctx.shadowBlur=14;
ctx.beginPath();ctx.arc(cx,cy,pocketOut+1,start,end);ctx.stroke();
ctx.restore();
});
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
const QW_RADAR_TEXT_SCALE=1.05;
function qwCanvasPx(lg,sm,W){return Math.round((W>=700?lg:sm)*QW_RADAR_TEXT_SCALE);}
function drawWheelTextOutlined(ctx,text,x,y,fill,strokeW){
ctx.lineWidth=strokeW||3;
ctx.strokeStyle='rgba(0,0,0,0.92)';
ctx.strokeText(text,x,y);
ctx.fillStyle=fill;
ctx.fillText(text,x,y);
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
const outerR=Math.min(W,H)*(radarMinimal?0.505:0.47);
const midR=outerR*0.7;
const hubR=outerR*0.14;
const segment=(Math.PI*2)/wheel.length;
const chaos=Q.ready?{chaosLevel:Q.chaosLevel,noEdge:Q.noEdge}:{chaosLevel:50,noEdge:true};
const vzorVisual=radarVzor&&Q.ready;
const mockCanvasUi=vzorVisual||(Q.ready&&typeof qwUseMockupPresentation==='function'&&qwUseMockupPresentation(Q));
const chaosSess=mockCanvasUi?false:(Q.ready&&qwChaosSession(Q,chaos));
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
ctx.fillStyle=bg;
ctx.beginPath();
ctx.arc(cx,cy,outerR*1.25,0,Math.PI*2);
ctx.fill();
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
let glowNums=[];
const S=Q.scanner;
if(S&&S.dominantSector&&S.dominantSector.path&&S.dominantSector.path!=='—'){
S.dominantSector.path.split('-').forEach(p=>{const n=+p;if(!isNaN(n)&&n>=0)glowNums.push(n);});
}
if(!glowNums.length&&Q.clusters&&Q.clusters[0]&&Q.clusters[0].nums)glowNums=Q.clusters[0].nums.slice(0,5);
drawQwVzorRimPocketGlow(ctx,cx,cy,outerR,segment,glowNums,pulse,visDim);
const glowSet=new Set(glowNums);
const numR=outerR*0.895;
wheel.forEach((num,index)=>{
const mid=index*segment-Math.PI/2+segment/2;
const tx=cx+Math.cos(mid)*numR,ty=cy+Math.sin(mid)*numR;
const isLast=num===lastN;
const isGlow=glowSet.has(num)&&!isLast;
ctx.save();ctx.translate(tx,ty);ctx.rotate(mid+Math.PI/2);
const fsNum=isLast?qwCanvasPx(19,16,W):(isGlow?qwCanvasPx(16,13,W):qwCanvasPx(15,12,W));
ctx.font='900 '+fsNum+'px Segoe UI,Arial';
ctx.textAlign='center';ctx.textBaseline='middle';
if(isGlow){ctx.shadowColor='rgba(255,255,255,0.92)';ctx.shadowBlur=16;}
const numCol=isLast?'#fff59d':isGlow?'#ffffff':num===0?'#f0fff8':reds.includes(num)?'#ffffff':'#f2f4f8';
drawWheelTextOutlined(ctx,String(num),0,0,numCol,isLast?4.5:(isGlow?4.2:(num===0?3.5:2.8)));
ctx.restore();
});
/* V2 mockup: popisy STĹPEC/TUCET v kolese ako obr.2 */
drawQwVzorLabelsCanvas(ctx,cx,cy,outerR,st,W);
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
