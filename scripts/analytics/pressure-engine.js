/**
 * Pressure Engine — Balík 10H-6 z index-NOVY-V2.html
 * Závisí na: wheel-sector-intel, session-stats, V2 inline (weightedTotal, lastVisualBreakdown)
 */
'use strict';

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
const clusterIntensity=Math.round(normalize(top.score,maxRef));
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
