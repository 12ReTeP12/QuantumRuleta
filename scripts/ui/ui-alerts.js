/* UI alerts — extracted from index-NOVY-V4.html */
'use strict';

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

function buildUpozorneniaSekcia(){
const eng=computeBehaviorAlerts();
const n=spins.length;
if(!eng.ready){
return'<div class="bah-wait">Zbieram obraz z histórie ('+n+'/'+BAH_RADAR_MIN+' spinov) — radar správania štartuje po '+BAH_RADAR_MIN+'. spîne.</div>';
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
return html;
}

function buildAlertsHTML(){
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
return html;
}

function renderAlerts(){
const alertsEl=document.getElementById('alerts');
if(!alertsEl)return;
alertsEl.innerHTML=buildAlertsHTML();
}

function updateAlerts(){
const warningEl=document.getElementById('warning');
if(warningEl)warningEl.innerHTML='';
const alertEl=document.getElementById('alertSystem');
if(alertEl)alertEl.innerHTML=buildUpozorneniaSekcia();
renderAlerts();
}

function renderAlertSystem(){
const el=document.getElementById('alertSystem');
if(!el)return;
el.innerHTML=buildUpozorneniaSekcia();
}

function renderWarning(){
const warningEl=document.getElementById('warning');
if(warningEl)warningEl.innerHTML='';
}
