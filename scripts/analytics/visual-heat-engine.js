/**
 * Visual Heat Engine — Balík 10H-6 z index-NOVY-V2.html
 * Závisí na: pressure-engine, ai-engine (hot/cold), session-stats, V2 inline (visual core)
 */
'use strict';

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
