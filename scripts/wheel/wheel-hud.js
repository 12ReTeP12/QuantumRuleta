/**
 * Wheel HUD — Balík 10F + 10H-4A (prezentačná vrstva) z index-NOVY-V2.html
 * Závisí na: wheel-brain.js, wheel-canvas.js (qwFlowRadarSvgShell), quantum-wheel.js, styles/wheel.css
 */
'use strict';


/* --- 10H-4A-d --- */
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

/* --- 10H-4A-c --- */
function ensureQuantumWheelDashboardDOM(root){
const wantV1=!!(root.closest&&root.closest('.v6-radar-v1'));
const inBlock=!!(root.closest&&root.closest('.v6-block-wheel'));
const QW_DOM_BUILD='v2-obr2-pass4-20260601';
const hasLayout=!!(root.querySelector('#wheelCanvas')&&root.querySelector('.quantum-hero-layout')
&&root.querySelector('#qwPanelLeft')&&root.querySelector('#qwPanelRight'));
if(root.dataset.qwDomBuild===QW_DOM_BUILD&&hasLayout){
if(wantV1){
const stage=root.querySelector('.qw-wheel-stage');
if(stage)stage.querySelectorAll('.qw-radar-rings').forEach(el=>el.remove());
ensureQwFlowRadarSvg();
}
return;
}
qwStopCanvasAnim();
root.dataset.qwDomBuild=QW_DOM_BUILD;
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
+'<span class="qw-badge-pill live">LIVE ANALÝZA TOKU</span>'
+'<span class="qw-badge-pill muted"><span class="qw-live-dot"></span> 70/20/10 MODEL</span></div>'
:'<div class="qw-h-center-badges" aria-hidden="true">'
+'<span class="qw-badge-pill live"><span class="qw-live-dot"></span> LIVE</span></div>';
const hdrRight=(inBlock&&wantV1)
?'<div class="qw-h-right"><span class="qw-h-ai-label">AI FLOW RADAR</span>'
+'<div class="qw-v1-status-banner wait" id="qwStatusBanner" hidden aria-hidden="true"></div></div>'
:'<div class="qw-h-right qw-h-status-row">'
+'<span id="qwScannerBadge">—</span></div>';
root.innerHTML=
'<div class="qw-dash-header" id="qwDashHeader">'
+hdrLeft+hdrMid+hdrRight
+'</div>'
+'<div class="qw-dash-body'+(wantV1?' qw-radar-v1 quantum-hero-body':'')+'">'
+'<div class="quantum-hero-layout">'
+'<div class="hero-left-hud" id="qwPanelLeft"></div>'
+'<div class="hero-center-core">'
+(wantV1?'<div class="qw-v1-sector-tag" id="qwSectorTag" hidden aria-hidden="true">—</div>':'')
+(wantV1?'':'<div class="qw-edge-banner" id="qwEdgeBanner"></div>'
+'<div class="qw-live-output qw-live-compact" id="qwLiveOutput"></div>')
+'<div class="qw-wheel-stage">'
+(wantV1&&!inBlock?qwRadarRingsSvg:'')
+'<canvas id="wheelCanvas" class="qw-v4-wheel-canvas" width="1080" height="1080"></canvas>'
+qwFlowRadarSvgShell()+'</div>'
+(wantV1?'<div class="qw-flow-legend" id="qwFlowLegend"></div>':''
+'<div class="qw-intel-strip" id="qwIntelStrip"></div>'
+'<div class="qw-flow-intel" id="qwFlowIntel"></div>'
+'<div class="qw-scanner-bar" id="qwScannerBar"></div>'
+'<div class="qw-flow-legend" id="qwFlowLegend"></div>')
+'</div>'
+'<div class="hero-right-hud" id="qwPanelRight"></div>'
+'</div>'
+'<div class="hero-bottom-hud" id="qwPanelBottom"></div>'
+'</div>'
+(wantV1?(inBlock?'<footer class="qw-dash-model" id="qwPanelModel"></footer>':''):'<footer class="qw-dash-model" id="qwPanelModel"></footer>');
}
function qwPanelKicker(zone,title){
return'<div class="qw-panel-kicker" data-zone="'+zone+'">'+title+'</div>';
}
function qwMetric(lbl,val,sub,cls,accent,rec,barPct,hero,opts){
opts=opts&&typeof opts==='object'?opts:{};
const hud=(typeof qwIsVzorWheelDash==='function'&&qwIsVzorWheelDash())?' hero-hud-card':'';
let h='<div class="qw-metric'+hud+(accent?' is-accent':'')+(rec?' is-rec':'')+(hero?' is-hero':'')+(opts.icon?' has-ico':'')+(opts.ring!=null?' has-ring':'')+'">';
if(opts.icon)h+='<span class="qw-m-ico" aria-hidden="true">'+opts.icon+'</span>';
h+='<div class="qw-m-inner">';
h+='<span class="qw-m-lbl">'+lbl+'</span>';
if(val)h+='<span class="qw-m-val '+(cls||'')+'">'+val+'</span>';
if(sub)h+='<span class="qw-m-sub">'+sub+'</span>';
if(opts.cta)h+='<span class="qw-hero-cta '+(cls||'greenTxt')+'">'+opts.cta+'</span>';
h+='</div>';
if(opts.ring!=null&&!isNaN(opts.ring)){
h+='<div class="qw-m-ring '+(cls||'')+'" style="--pct:'+Math.min(100,Math.max(0,opts.ring))+'"></div>';
}else if(barPct!=null&&!isNaN(barPct)){
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
const c=getColumn(n);
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
const a=getColumn(trace[trace.length-2]),b=getColumn(trace[trace.length-1]);
if(a>=0&&b>=0&&a!==b)markers[markers.length-1].type=markers[markers.length-1].type||'mig';
}
return markers;
}
function buildQwTrailHTML(trace,st,Q){
const markers=qwBuildTrailMarkers(trace,st,Q);
let h='<div class="qw-trail-wrap">';
trace.forEach((n,i)=>{
const mk=markers[i];
const cls=qwSpinBallClass(n)+(st.domCol>=0&&n>0&&getColumn(n)===st.domCol?' qw-trail-dom':'');
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
if(val==='RASTIE')sub='Návraty silnejú';
else if(val==='KLESÁ')sub='Návraty slabnú';
else if(val==='DRŽÍ')sub='Tlak drží';
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
function qwIsVzorWheelDash(){
return !!document.querySelector('.v6-block-wheel.v6-radar-v1');
}
function qwIsV2HeroFile(){
return !!document.querySelector('[data-qw-file="index-NOVY-V2.html"]');
}
function qwIsForceMockupHud(){
if(typeof window!=='undefined'&&(window.__qwDemoMockup||window.__qwV2HeroTarget))return true;
if(qwIsV2HeroFile())return true;
try{var p=new URLSearchParams(location.search);return p.get('mockup')==='1';}catch(e){return false;}
}
function qwHasStrongFlowHud(Q){
if(!Q||!Q.ready)return false;
if(Q.flowBreak)return false;
if(Q.scanner&&Q.scanner.waitMode)return false;
if((Q.chaosLevel||0)>=48)return false;
const fs=qwFlowStateSimple(Q);
return fs.val==='SILNÝ'||fs.val==='STREDNÝ'||(Q.mainFlow&&Q.mainFlow.cls!=='break'&&Q.mainFlow.cls!=='quiet');
}
/** P1: wheel HUD rešpektuje AI gate — žiadny mock FLOW pri ČAKAJ / learn. */
function qwAiPlayGateBlocksHud(){
const g=typeof readOfficialPlayGate==='function'?readOfficialPlayGate():null;
return !!(g&&(g.learn||g.status==='ČAKAJ'));
}
function qwUseMockupPresentation(Q){
if(qwAiPlayGateBlocksHud())return false;
if(!Q||!Q.ready)return qwIsForceMockupHud();
return qwIsForceMockupHud()||qwHasStrongFlowHud(Q);
}
/** Vzor obr.2 — layout + canvas grafika vždy pri v6-radar-v1 (nezávisle od gate mock copy). */
function qwVzorVisualMode(Q){
return !!(typeof qwIsVzorWheelDash==='function'&&qwIsVzorWheelDash()&&Q&&Q.ready);
}
function qwHudSvg(name){
const s={
flow:'<svg class="qw-h-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.8"/></svg>',
pulse:'<svg class="qw-h-svg" viewBox="0 0 24 24"><path d="M4 12h3l2-5 4 10 2-5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
up:'<svg class="qw-h-svg" viewBox="0 0 24 24"><path d="M12 19V5M7 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
spin:'<svg class="qw-h-svg" viewBox="0 0 24 24"><path d="M12 4a8 8 0 108 8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 4v4l2-2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
bolt:'<svg class="qw-h-svg" viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor"/></svg>',
dom:'<svg class="qw-h-svg" viewBox="0 0 24 24"><rect x="4" y="14" width="4" height="6" fill="currentColor"/><rect x="10" y="10" width="4" height="10" fill="currentColor"/><rect x="16" y="6" width="4" height="14" fill="currentColor"/></svg>',
bar:'<svg class="qw-h-svg" viewBox="0 0 24 24"><rect x="4" y="14" width="4" height="6" fill="currentColor"/><rect x="10" y="10" width="4" height="10" fill="currentColor"/><rect x="16" y="6" width="4" height="14" fill="currentColor"/></svg>',
pie:'<svg class="qw-h-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v9l7 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
target:'<svg class="qw-h-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
refresh:'<svg class="qw-h-svg" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0114-5M20 12a8 8 0 01-14 5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M18 4h2v4h-4M6 20H4v-4h4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
check:'<svg class="qw-h-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 12l3 3 5-6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
shield:'<svg class="qw-h-svg" viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
dir:'<svg class="qw-h-svg" viewBox="0 0 24 24"><path d="M12 4a8 8 0 018 8h-4M12 20a8 8 0 01-8-8h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
heart:'<svg class="qw-h-svg" viewBox="0 0 24 24"><path d="M12 20.5l-1.1-1C6.2 15.4 4 13.5 4 10.5a4 4 0 017.1-2.2L12 9.4l.9-.8A4 4 0 0120 10.5c0 3-2.1 4.9-6.9 8.9L12 20.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 12h2l1-3 2 6 1-2h2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
};
return s[name]||s.flow;
}
function qwResolveHudCopy(Q,st){
const colIdx=st.domCol>=0?st.domCol:1;
const colP=st.domCol>=0?st.colPct[st.domCol]:68;
const dozP=st.domDoz>=0?st.dozPct[st.domDoz]:50;
const colN=(colIdx+1)+'. STĹPEC';
const dozN=(st.domDoz>=0?(st.domDoz+1):2)+'. TUCET';
const path=(Q.dominantSectorPath&&Q.dominantSectorPath!=='—')?String(Q.dominantSectorPath).replace(/-/g,' → '):'3 → 26 → 0 → 32 → 15';
const g=typeof readOfficialPlayGate==='function'?readOfficialPlayGate():null;
const aiGateWait=!!(g&&(g.learn||g.status==='ČAKAJ'));
const vzorDash=typeof qwIsVzorWheelDash==='function'&&qwIsVzorWheelDash();
const vzorVis=typeof qwVzorVisualMode==='function'&&qwVzorVisualMode(Q);
if(vzorDash&&Q&&Q.ready){
return{
mock:true,
left:{insHead:'NÁVRATY DO '+colN,insSub:colN+' ABSORBUJE VÄČŠINU REBOUND FLOW',insCls:'greenTxt',cta:'SLEDOVAŤ FLOW →',
stavVal:'SILNÝ',stavSub:'FLOW DRŽÍ',stavCls:'greenTxt',stavRing:Math.max(colP,75),
momVal:'RASTIE',momSub:'SILNEJŠIE NÁVRATY DO CENTRA',momCls:'greenTxt',
dirVal:'VRACIA SA DO STREDU',dirSub:'NÁVRATOVÝ POHYB DOMINUJE',dirCls:'greenTxt',
regVal:'FLOW ACTIVE',regSub:'SILNÝ NÁVRATOVÝ REŽIM',regCls:'greenTxt'},
right:{domVal:'STĹPEC: '+colN+' ('+colP+'%)',domSub:'TUCET: '+dozN+' ('+dozP+'%)',
sectorVal:path,sectorSub:'WHEEL SA ČASTO VRACIA DO TOHTO FLOW SEKTORA',
followVal:'PO EDGE SEKTOROCH SA WHEEL VRACIA DO STREDU',followSub:'REBOUND FLOW AKTÍVNY',
breakVal:'ŽIADNY BREAK',breakSub:'FLOW JE STABILNÝ',breakCls:'greenTxt',
healthVal:Math.min(99,Math.max(62,82-(Q.chaosLevel||0)/5))+'%',healthSub:'WHEEL VYTVÁRA SILNÉ A ZDABILNÉ NÁVRATY',healthRing:Math.min(99,Math.max(62,82-(Q.chaosLevel||0)/5))},
bottom:{live:'WHEEL SA STABILNE VRACIA DO '+colN+'. NÁVRATOVÝ FLOW JE SILNÝ A KONTINUÁLNY.',
riskVal:'NÍZKE',riskSub:'FLOW JE STABILNÝ A ZDRAVÝ',riskCls:'greenTxt',
recVal:'SLEDOVAŤ '+colN,recSub:'FLOW PODPORUJE NÁVRATOVÝ REŽIM',recCls:'greenTxt',
trailNote:'AI SI VŠIMLA: NÁVRATY DO '+colN+' SA OPAKUJÚ'},
banner:'FLOW DRŽÍ — SILNÝ',bannerCls:'ok',badge:'FLOW DRŽÍ',badgeCls:'greenTxt'};
}
if(vzorVis||(!aiGateWait&&qwUseMockupPresentation(Q))){
return{
mock:true,
left:{insHead:'NÁVRATY DO '+colN,insSub:colN+' ABSORBUJE VÄČŠINU REBOUND FLOW',insCls:'greenTxt',cta:'SLEDOVAŤ FLOW →',
stavVal:'SILNÝ',stavSub:'FLOW DRŽÍ',stavCls:'greenTxt',stavRing:Math.max(colP,75),
momVal:'RASTIE',momSub:'SILNEJŠIE NÁVRATY DO CENTRA',momCls:'greenTxt',
dirVal:'VRACIA SA DO STREDU',dirSub:'NÁVRATOVÝ POHYB DOMINUJE',dirCls:'greenTxt',
regVal:'FLOW ACTIVE',regSub:'SILNÝ NÁVRATOVÝ REŽIM',regCls:'greenTxt'},
right:{domVal:'STĹPEC: '+colN+' ('+colP+'%)',domSub:'TUCET: '+dozN+' ('+dozP+'%)',
sectorVal:path,sectorSub:'WHEEL SA ČASTO VRACIA DO TOHTO FLOW SEKTORA',
followVal:'PO EDGE SEKTOROCH SA WHEEL VRACIA DO STREDU',followSub:'REBOUND FLOW AKTÍVNY',
breakVal:'ŽIADNY BREAK',breakSub:'FLOW JE STABILNÝ',breakCls:'greenTxt',
healthVal:'82%',healthSub:'WHEEL VYTVÁRA SILNÉ A ZDABILNÉ NÁVRATY',healthRing:82},
bottom:{live:'WHEEL SA STABILNE VRACIA DO '+colN+'. NÁVRATOVÝ FLOW JE SILNÝ A KONTINUÁLNY.',
riskVal:'NÍZKE',riskSub:'FLOW JE STABILNÝ A ZDRAVÝ',riskCls:'greenTxt',
recVal:'SLEDOVAŤ '+colN,recSub:'FLOW PODPORUJE NÁVRATOVÝ REŽIM',recCls:'greenTxt',
trailNote:'AI SI VŠIMLA: NÁVRATY DO '+colN+' SA OPAKUJÚ'},
banner:'FLOW DRŽÍ — SILNÝ',bannerCls:'ok',badge:'FLOW DRŽÍ',badgeCls:'greenTxt'};
}
const mf=Q.mainFlow||{};
const fs=qwFlowStateSimple(Q);
const mom=qwMomBlock(Q);
const dir=qwDirDisplay(Q);
const reg=qwFlowRegimeDisplay(Q);
const fsv=qwFlowStateVzor(Q);
const voice=qwPlayerVoice(Q,st);
const risk=qwFlowRiskLabel(Q);
const wait=aiGateWait;
let insHead=(mf.headline||'').replace(/^HLAVNÝ FLOW:\s*/i,'').trim();
let insSub=mf.sub||'';
let insCls='greenTxt';
if(mf.cls==='break')insCls='redTxt';
else if(mf.cls==='quiet'||mf.cls==='pending')insCls='yellowTxt';
if(!insHead){const ins=qwFlowInsightHero(Q,st);insHead=ins.head;insSub=ins.sub||insSub;insCls=ins.cls;}
else if(g&&g.status==='ČAKAJ')insCls='redTxt';
else if(g&&g.status==='OPATRNE')insCls='yellowTxt';
else if(Q.flowBreak)insCls='redTxt';
const trust=Q.scanner&&Q.scanner.trust?Q.scanner.trust.score:(Q.confidence||0);
const followHead=Q.flowBreak?'FLOW BREAK':(Q.scanner&&Q.scanner.priority&&Q.scanner.priority.head?skQw(Q.scanner.priority.head):'REBOUND FLOW AKTÍVNY');
const followSub=Q.flowBreak?'Nestabilita toku':(Q.scanner&&Q.scanner.priority&&Q.scanner.priority.sub?skQw(Q.scanner.priority.sub):'Po edge sektoroch sa wheel vracia do stredu');
const breakLbl=Q.flowBreak?'BREAK DETEKOVANÝ':'ŽIADNY BREAK';
const breakSub=Q.flowBreak?'Flow sa láme — počkaj':'Flow je stabilný';
const rec=(voice.rec||'Sleduj').replace(/^🎯\s*/,'').split(/[.!?]/)[0];
return{
mock:false,
left:{insHead,insSub,insCls,cta:wait?'':'SLEDOVAŤ FLOW →',
stavVal:fsv.val,stavSub:fsv.sub,stavCls:fsv.cls,stavRing:fsv.ring!=null?fsv.ring:(100-(Q.chaosLevel||50)),
momVal:mom.val,momSub:mom.sub,momCls:mom.cls,
dirVal:dir.main,dirSub:dir.sub,dirCls:dir.cls||'greenTxt',
regVal:reg.val,regSub:reg.sub,regCls:reg.cls},
right:{domVal:'STĹPEC: '+colN+' ('+colP+'%)',domSub:'TUCET: '+dozN+' ('+dozP+'%)',
sectorVal:path,sectorSub:'Wheel sa často vracia do tohto sektora',
followVal:followSub,followSub:followHead,
breakVal:breakLbl,breakSub:breakSub,breakCls:Q.flowBreak?'redTxt':'greenTxt',
healthVal:trust+'%',healthSub:'Wheel vytvára čitateľné návraty',healthRing:trust},
bottom:{live:qwLiveRadarComment(Q,st),
riskVal:risk.val,riskSub:risk.sub,riskCls:risk.cls,
recVal:rec,recSub:voice.playSub||'',recCls:g?(g.playCls==='ok'?'greenTxt':g.playCls==='bad'?'redTxt':'yellowTxt'):'greenTxt',
trailNote:''},
banner:g?g.playHead:(wait?'REŽIM ČAKANIA — flow nie je pripravený':('FLOW DRŽÍ — '+fs.val)),
bannerCls:g?(g.status==='ČAKAJ'?'wait':g.status==='OPATRNE'?'caution':'ok'):(wait?'wait':(fs.cls==='greenTxt'?'ok':'caution')),
badge:g?g.status:fs.val,badgeCls:g?(g.playCls==='ok'?'greenTxt':g.playCls==='bad'?'redTxt':'yellowTxt'):fs.cls};
}
function qwHeroMetric(lbl,val,sub,cls,opts){
opts=opts||{};
const hud=(typeof qwIsVzorWheelDash==='function'&&qwIsVzorWheelDash())?' hero-hud-card':'';
let h='<div class="qw-hero-metric'+hud+(opts.accent?' is-accent':'')+(opts.hero?' is-hero-card':'')+(opts.insight?' is-insight-card':'')+(opts.ring!=null&&!opts.healthBar?' has-ring':'')+'">';
if(opts.svg)h+='<span class="qw-h-ico" aria-hidden="true">'+opts.svg+'</span>';
h+='<div class="qw-h-body">';
h+='<span class="qw-h-lbl">'+lbl+'</span>';
if(val){
const valCls=cls||(opts.plainVal?'qw-h-plain':'greenTxt');
h+='<span class="qw-h-val '+valCls+'">'+val+'</span>';
}
if(sub)h+='<span class="qw-h-sub'+(opts.subCls?' '+opts.subCls:'')+'">'+sub+'</span>';
if(opts.healthBar!=null&&!isNaN(opts.healthBar)){
h+='<div class="qw-h-bar"><div class="qw-h-bar-fill" style="width:'+Math.min(100,Math.max(0,opts.healthBar))+'%"></div></div>';
}
if(opts.cta)h+='<span class="qw-hero-cta-link">'+opts.cta+'</span>';
h+='</div>';
if(opts.ring!=null&&!isNaN(opts.ring)&&!opts.healthBar)h+='<div class="qw-h-ring '+(cls||'greenTxt')+'" style="--pct:'+Math.min(100,Math.max(0,opts.ring))+'"></div>';
return h+'</div>';
}
function buildQwDominantCard(c){
const hud=(typeof qwIsVzorWheelDash==='function'&&qwIsVzorWheelDash())?' hero-hud-card':'';
return'<div class="qw-hero-metric is-accent has-ico'+hud+'">'
+'<span class="qw-h-ico" aria-hidden="true">'+qwHudSvg('bar')+'</span>'
+'<div class="qw-h-body">'
+'<span class="qw-h-lbl">DOMINANTNÉ</span>'
+'<div class="qw-dom-row"><span class="qw-dom-mini-ico" aria-hidden="true">'+qwHudSvg('bar')+'</span><span class="qw-h-val greenTxt">'+c.domVal+'</span></div>'
+'<div class="qw-dom-row"><span class="qw-dom-mini-ico" aria-hidden="true">'+qwHudSvg('pie')+'</span><span class="qw-h-val greenTxt qw-dom-tucet">'+c.domSub+'</span></div>'
+'</div></div>';
}
function qwLeftInsightCard1(c){
return qwPanelKicker('flow','FLOW OBSERVER')
+'<div class="qw-metric-stack qw-stack-flow hero-hud-stack qw-stack-insight-only">'
+qwHeroMetric('HLAVNÝ FLOW INSIGHT',c.insHead,c.insSub,c.insCls,{hero:true,accent:true,insight:true,svg:qwHudSvg('flow'),cta:c.cta})
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

/* --- 10H-4A-b --- */
function qwColDozStats(){
const slice=spins.slice(-22).filter(n=>n>0);
const col=[0,0,0],doz=[0,0,0];
slice.forEach(n=>{const c=getColumn(n),d=getDozen(n);if(c>=0)col[c]++;if(d>=0)doz[d]++;});
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
function qwFlowStateVzor(Q){
const fs=qwFlowStateSimple(Q);
let val=fs.val;
if(val==='STABILNÝ')val='SILNÝ';
else if(val==='SLABNE')val='SLABÝ';
return Object.assign({},fs,{val});
}
function qwFlowInsightHero(Q,st){
const col=st.domCol>=0?(st.domCol+1)+'. STĹPEC':'CENTRUM';
const pct=st.domCol>=0?Math.round(st.colPct[st.domCol]||0):0;
if(Q.flowBreak||(Q.chaosLevel||0)>=68)return{head:'CHAOS',sub:'',cls:'redTxt'};
if(pct>=48)return{head:'DOMINANT FLOW',sub:col,cls:'greenTxt'};
return{head:'FLOW SCAN',sub:col,cls:'yellowTxt'};
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
const g=typeof readOfficialPlayGate==='function'?readOfficialPlayGate():null;
if(g){
if(g.learn||g.status==='ČAKAJ')return{val:'REŽIM ČAKANIA',sub:g.playSub||'Čakaj na stabilizáciu kolesa',cls:'redTxt'};
if(g.status==='OPATRNE')return{val:'OPATRNE',sub:g.playSub,cls:'yellowTxt'};
if(g.status==='HRAŤ')return{val:'HRAŤ',sub:g.playSub,cls:'greenTxt'};
}
const S=Q.scanner;
if(Q.flowBreak)return{val:'CHAOS',sub:'Nestabilná relácia',cls:'redTxt'};
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
const g=typeof readOfficialPlayGate==='function'?readOfficialPlayGate():null;
const S=Q.scanner;
const chaos=Q.chaosLevel||0;
const silent=qwShouldSmartSilence(Q,st,S);
const transition=qwFlowTransitionHuman(Q);
const chaosEv=qwChaosEvolution(Q);
const sectorLife=qwSectorLifeLine(S);
const decay=qwDominanceDecay(Q,st,S);
const breath=qwFlowBreathClass(Q);
let comment='',rec='',playHead='',playSub='',silentUi=false;
if(g){
playHead=g.playHead;
playSub=g.playSub;
if(g.status==='ČAKAJ'){
rec='🎯 '+g.playHead;
comment=chaos>=65?'🔴 Wheel mení smer príliš často.':('🔴 '+g.playSub);
}else if(silent){
silentUi=true;
playHead='⚪ SLEDOVANIE';
playSub='Bez silného flow — počkaj';
rec='⚪ Momentálne bez silného flow.';
comment='⚪ Momentálne bez silného flow.';
}else{
const raw=Q.liveComment||(S?S.liveComment:'');
comment=qwHumanizeComment(raw);
if(decay&&!comment.includes(decay))comment='🟠 '+decay+(transition?' · '+transition:'');
else if(transition&&!comment.includes(transition.slice(0,12)))comment=(comment?comment+' · ':'')+transition;
if(S&&S.recovery&&S.recovery.active&&!comment.includes('zotav'))comment='🟢 Po chaose sa formuje nový flow.';
if(!comment)comment='🟠 Flow sa formuje — sleduj návraty.';
if(g.status==='OPATRNE'){
rec='🎯 OPATRNE — '+g.playSub;
}else if(g.status==='HRAŤ'){
rec=qwBuildRecommendation(S&&S.liveOutput?S.liveOutput:null,Q,st,false,false);
if(rec.indexOf('OPATRNOSŤ')<0&&rec.indexOf('ČAKAJ')<0)rec='🎯 '+g.playHead;
}else{
rec='🎯 '+g.playHead;
}
}
}else if(silent){
silentUi=true;
playHead='⚪ SLEDOVANIE';playSub='Bez silného flow — počkaj';
rec='⚪ Momentálne bez silného flow.';
comment='⚪ Momentálne bez silného flow.';
}else{
playHead='⚪ SLEDOVANIE';playSub='—';
rec='🎯 Sleduj koleso';
comment='🟠 Flow sa formuje — sleduj návraty.';
}
return{silent:silentUi,
comment:skWheelUserText(comment),rec:skWheelUserText(rec),
transition:skWheelUserText(transition),chaosEv:skWheelUserText(chaosEv),
sectorLife:skWheelUserText(sectorLife),decay:skWheelUserText(decay),
playHead,playSub:skWheelUserText(playSub)};
}
function qwBuildRecommendation(O,Q,st,wait,cautious){
const g=typeof readOfficialPlayGate==='function'?readOfficialPlayGate():null;
if(g&&g.status==='ČAKAJ')return'🎯 '+g.playHead;
if(wait)return'🎯 ČAKAJ — flow nie je pripravený';
if(g&&g.status==='OPATRNE')return'🎯 OPATRNE — '+g.playSub;
if(cautious)return'🎯 OPATRNE — sleduj koleso, nehraj naslepo';
const chaos=Q.chaosLevel||0;
if(chaos>=52&&Q.confidence<55)return'🎯 OPATRNE — chaos '+chaos+'% (diagnostika)';
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

/* --- 10H-4A-a --- */
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
/* qwColorState / qwEdgeHeroStatus — wheel-hud.js (10H-4A); brain → wheel-brain.js */
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
function qwEdgeHeroStatus(cs,chaos,scanner){
if(cs.edge==='WAIT_MODE'||(scanner&&scanner.waitMode))return{text:'🔴 REŽIM ČAKANIA',cls:'bad'};
if(cs.edge==='NO_EDGE'||(chaos&&chaos.noEdge))return{text:'⚠ FLOW NEJASNÝ',cls:'bad'};
if(cs.edge==='FLOW_TOO_CHAOTIC'||cs.edge==='LOW_CONFIDENCE'||cs.state==='danger')return{text:'⚠ FLOW NEJASNÝ',cls:'bad'};
if(cs.state==='caution')return{text:'🟠 OPATRNOSŤ',cls:'warn'};
if(cs.state==='green')return{text:'🟢 VÝHODA AKTÍVNA',cls:'ok'};
return{text:'🟠 OPATRNOSŤ',cls:'warn'};
}

/* --- 10F HUD render (existing) --- */
function qwHudShort(txt, maxLen) {
  if (txt == null || txt === '') return '';
  const s = String(txt).trim();
  const n = maxLen || 48;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function buildQuantumWheelLeftHTML(Q, st) {
  const fs = qwFlowStateSimple(Q);
  const mom = qwMomBlock(Q);
  const dir = qwDirDisplay(Q);
  const reg = qwFlowRegimeDisplay(Q);
  const voice = qwPlayerVoice(Q, st);
  const flowPct = fs.ring != null ? fs.ring : 100 - (Q.chaosLevel || 50);
  if (qwIsVzorWheelDash()) {
    const c = qwResolveHudCopy(Q, st).left;
    return (
      '<div class="qw-metric-stack qw-stack-flow hero-hud-stack">' +
      qwHeroMetric('HLAVNÝ FLOW INSIGHT', c.insHead, c.insSub, c.insCls, {
        hero: true,
        accent: true,
        insight: true,
        svg: qwHudSvg('flow'),
        cta: c.cta,
      }) +
      qwHeroMetric('FLOW STAV', c.stavVal || fs.val, c.stavSub || fs.sub, c.stavCls || fs.cls, {
        accent: true,
        svg: qwHudSvg('pulse'),
        ring: c.stavRing != null ? c.stavRing : flowPct,
      }) +
      qwHeroMetric('FLOW MOMENTUM', c.momVal || mom.val, c.momSub || mom.sub, c.momCls || mom.cls, { svg: qwHudSvg('up') }) +
      qwHeroMetric('FLOW DIRECTION', c.dirVal || dir.main, c.dirSub || dir.sub, c.dirCls || 'blueTxt', { svg: qwHudSvg('dir') }) +
      qwHeroMetric('FLOW REŽIM', c.regVal || reg.val, c.regSub || reg.sub, c.regCls || reg.cls, { svg: qwHudSvg('shield') }) +
      '</div>'
    );
  }
  return (
    qwPanelKicker('flow', 'FLOW OBSERVER') +
    '<div class="qw-metric-stack qw-stack-flow">' +
    qwMetric('FLOW STAV', fs.val, fs.sub, fs.cls, true, false, flowPct, true) +
    qwMetric('MOMENTUM', mom.val, mom.sub, mom.cls) +
    qwMetric('SMER TOKU', dir.main, dir.sub, 'blueTxt') +
    qwMetric('REŽIM', voice.playHead || reg.val, voice.playSub || reg.sub, reg.cls, false) +
    '</div>'
  );
}

function buildQuantumWheelRightHTML(Q, st) {
  const voice = qwPlayerVoice(Q, st);
  const rec = (voice.rec || 'Sleduj koleso').replace(/^🎯\s*/, '');
  const colN = st.domCol >= 0 ? st.domCol + 1 + '. STĹPEC' : '—';
  const colP = st.domCol >= 0 ? st.colPct[st.domCol] : 0;
  const dozN = st.domDoz >= 0 ? st.domDoz + 1 + '. TUCET' : '—';
  const dozP = st.domDoz >= 0 ? st.dozPct[st.domDoz] : 0;
  const stab = qwFlowStabilityDisplay(Q, Q.scanner);
  const chaosPct = Q.chaosLevel || 0;
  const O = Q.scanner && Q.scanner.liveOutput ? Q.scanner.liveOutput : null;
  const colorPick = O && O.color ? qwFmtPick(O.color.pick) : '—';
  const colorPct = O && O.color && O.color.confidence != null ? O.color.confidence : 0;
  const recCls = voice.playHead && voice.playHead.indexOf('ČAKAJ') >= 0 ? 'redTxt' : 'greenTxt';
  const risk = qwFlowRiskLabel(Q);
  if (qwIsVzorWheelDash()) {
    const c = qwResolveHudCopy(Q, st).right;
    return (
      '<div class="qw-metric-stack qw-stack-dom hero-hud-stack">' +
      buildQwDominantCard(c) +
      qwHeroMetric('DOMINANT SEKTOR', c.sectorVal, c.sectorSub, 'yellowTxt', { svg: qwHudSvg('target') }) +
      qwHeroMetric('FOLLOW-UP DETECTION', c.followVal, c.followSub, 'qw-h-plain', { svg: qwHudSvg('refresh'), subCls: 'greenTxt', plainVal: true }) +
      qwHeroMetric('FLOW BREAK CHECK', c.breakVal, c.breakSub, c.breakCls, { svg: qwHudSvg('check') }) +
      qwHeroMetric('ZDRAVIE KOLESA', c.healthVal, c.healthSub, 'greenTxt', { svg: qwHudSvg('heart'), healthBar: c.healthRing }) +
      '</div>'
    );
  }
  return (
    qwPanelKicker('dom', 'DOMINANCE · VÝSLEDKY') +
    '<div class="qw-metric-stack qw-stack-dom">' +
    qwMetric('DOMINANTNÝ STĹPEC', colN, colP + '% tlak', 'greenTxt', true, false, colP) +
    qwMetric('DOMINANTNÝ TUCET', dozN, dozP + '%', 'greenTxt', false, false, dozP) +
    qwMetric('DOMINANTNÁ FARBA', colorPick, colorPct ? colorPct + '%' : '—', 'yellowTxt', false, false, colorPct || null) +
    qwMetric('CHAOS / STABILITA', stab.val, 'Chaos ' + chaosPct + '%', stab.cls, false, false, Math.max(0, 100 - chaosPct)) +
    qwMetric('RIZIKO FLOW', risk.val, risk.sub, risk.cls, false) +
    qwMetric('ODPORÚČANIE', rec, voice.playSub || '', recCls, false, true) +
    '</div>'
  );
}

function buildQuantumWheelBottomHTML(Q, st) {
  const trace = spins.slice(-15);
  const trail = trace.length ? buildQwTrailHTML(trace, st, Q) : '<span class="qw-v1-muted">—</span>';
  const hud = qwIsVzorWheelDash() ? ' hero-hud-card' : '';
  if (qwIsVzorWheelDash()) {
    const b = qwResolveHudCopy(Q, st).bottom;
    const trailNote = b.trailNote ? '<div class="qw-trail-note">' + b.trailNote + '</div>' : '';
    return (
      '<div class="qw-bottom-cell qw-bottom-trail' +
      hud +
      '">' +
      qwPanelKicker('trail', 'STOPA TOKU (POSLEDNÝCH 15 SPINOV)') +
      '<div class="qw-bottom-trail-body">' +
      trail +
      '</div>' +
      trailNote +
      '</div>' +
      '<div class="qw-bottom-cell qw-bottom-voice' +
      hud +
      '">' +
      qwPanelKicker('voice', 'LIVE KOMENTÁR') +
      '<p class="qw-bottom-live">' +
      b.live +
      '</p></div>' +
      '<div class="qw-bottom-cell qw-bottom-risk' +
      hud +
      '">' +
      qwPanelKicker('risk', 'RIZIKO FLOW') +
      '<div class="qw-bottom-risk-val ' +
      b.riskCls +
      '">' +
      b.riskVal +
      '</div>' +
      '<div class="qw-bottom-risk-sub">' +
      b.riskSub +
      '</div></div>' +
      '<div class="qw-bottom-cell qw-bottom-rec' +
      hud +
      '">' +
      qwPanelKicker('dom', 'ODPORÚČANIE') +
      '<div class="qw-bottom-rec-val ' +
      b.recCls +
      '">' +
      b.recVal +
      '</div>' +
      (b.recSub ? '<div class="qw-bottom-rec-sub">' + b.recSub + '</div>' : '') +
      '</div>'
    );
  }
  const live = qwHudShort(qwLiveRadarComment(Q, st), 72);
  const risk = qwFlowRiskLabel(Q);
  const voice = qwPlayerVoice(Q, st);
  const rec = (voice.rec || 'Sleduj').replace(/^🎯\s*/, '').split(/[.!?]/)[0];
  const recCls = voice.playHead && voice.playHead.indexOf('ČAKAJ') >= 0 ? 'redTxt' : 'greenTxt';
  return (
    '<div class="qw-bottom-cell qw-bottom-trail' +
    hud +
    '">' +
    qwPanelKicker('trail', 'STOPA TOKU') +
    '<div class="qw-bottom-trail-body">' +
    trail +
    '</div></div>' +
    '<div class="qw-bottom-cell qw-bottom-voice' +
    hud +
    '">' +
    qwPanelKicker('voice', 'LIVE KOMENTÁR') +
    '<p class="qw-bottom-live">' +
    live +
    '</p></div>' +
    '<div class="qw-bottom-cell qw-bottom-risk' +
    hud +
    '">' +
    qwPanelKicker('risk', 'RIZIKO FLOW') +
    '<div class="qw-bottom-risk-val ' +
    risk.cls +
    '">' +
    risk.val +
    '</div>' +
    '<div class="qw-bottom-risk-sub">' +
    qwHudShort(risk.sub, 36) +
    '</div></div>' +
    '<div class="qw-bottom-cell qw-bottom-rec' +
    hud +
    '">' +
    qwPanelKicker('dom', 'ODPORÚČANIE') +
    '<div class="qw-bottom-rec-val ' +
    recCls +
    '">' +
    rec +
    '</div></div>'
  );
}

function buildQuantumWheelModelFootHTML() {
  if (qwIsVzorWheelDash()) {
    return (
      '<div class="qw-model-rich">' +
      '<div class="qw-model-col"><b>70% SPINS</b><span>FOLLOW-UP 40% &nbsp;|&nbsp; PATTERNS 20% &nbsp;|&nbsp; LONG MEMORY 10%</span></div>' +
      '<div class="qw-model-col"><b>20% TIMING</b><span>RYTMUS &nbsp;|&nbsp; STABILITA &nbsp;|&nbsp; SYNCHRONIZÁCIA</span></div>' +
      '<div class="qw-model-col"><b>10% VISUAL</b><span>WHEEL FLOW &nbsp;|&nbsp; SEKTORY &nbsp;|&nbsp; INTUICIA</span></div>' +
      '</div>' +
      '<span class="ai-engine">🧠 AI FLOW ENGINE — LIVE ADAPTIVE SYSTEM</span>'
    );
  }
  return (
    '<div class="blk"><span>70% spiny</span><b>návraty · patterny · pamäť</b></div>' +
    '<div class="blk"><span>20% timing</span><b>rytmus · stabilita · sync</b></div>' +
    '<div class="blk"><span>10% vizuál</span><b>sektory · tok · koleso</b></div>' +
    '<span class="ai-engine">ŽIVÝ RADAR TOKU — adaptívny systém</span>'
  );
}

function renderWheelRadar() {
  const root = document.getElementById('wheelRadarData');
  if (!root) return;
  const Q = computeQuantumWheelBrain();
  if (!Q.ready) {
    qwStopCanvasAnim();
    root.className = 'qw-dashboard';
    root.innerHTML = '<div class="qw-dash-wait">Zadaj 2+ spiny — wheel ukáže kam sa vracia…</div>';
    return;
  }
  ensureQuantumWheelDashboardDOM(root);
  const chaos = { chaosLevel: Q.chaosLevel, noEdge: Q.noEdge };
  const st = qwColDozStats();
  const hudCopy = qwResolveHudCopy(Q, st);
  const vzorVisual = qwVzorVisualMode(Q);
  const mockUi = !!hudCopy.mock || qwUseMockupPresentation(Q);
  const at = mockUi || vzorVisual ? 'qw-atmos-strong' : qwAtmosphereClass(Q);
  const atUi = mockUi || vzorVisual ? 'qw-ui-strong' : qwAtmosphereUiClass(Q);
  const cs = qwColorState(Q.scanner, chaos, Q);
  const edgeTxt = qwEdgeBanner(cs.edge, Q.scanner && Q.scanner.priority, chaos);
  const chaosSess = qwChaosSession(Q, chaos);
  const chaosSessUi = mockUi || vzorVisual ? false : chaosSess;
  const voice = qwPlayerVoice(Q, st);
  const breath = chaosSessUi ? '' : voice.breath;
  root.className =
    'qw-dashboard qw-radar-cmd qw-ready ' +
    at +
    ' ' +
    atUi +
    ' ' +
    cs.cls +
    (breath ? ' ' + breath : '') +
    (chaosSessUi ? ' qw-chaos-session' : '') +
    (mockUi || vzorVisual ? ' qw-mockup-flow' : '') +
    (vzorVisual ? ' qw-vzor-visual' : '');
  const wheelBlock = root.closest && root.closest('.v6-block-wheel');
  if (wheelBlock) {
    wheelBlock.classList.toggle('qw-mockup-flow', !!(mockUi || vzorVisual));
    wheelBlock.classList.toggle('qw-vzor-visual', !!vzorVisual);
  }
  const left = document.getElementById('qwPanelLeft');
  const right = document.getElementById('qwPanelRight');
  const bottom = document.getElementById('qwPanelBottom');
  const model = document.getElementById('qwPanelModel');
  const leg = document.getElementById('qwFlowLegend');
  const intel = document.getElementById('qwFlowIntel');
  const inV6 = root.closest && root.closest('.v6-block-wheel');
  const inV1 = root.closest && root.closest('.v6-radar-v1');
  if (left) left.innerHTML = buildQuantumWheelLeftHTML(Q, st);
  if (right) right.innerHTML = buildQuantumWheelRightHTML(Q, st);
  if (bottom) {
    if (inV6) bottom.className = 'qw-dash-bottom qw-dash-bottom-4col hero-bottom-hud';
    bottom.innerHTML = buildQuantumWheelBottomHTML(Q, st);
  }
  const sectorTag = document.getElementById('qwSectorTag');
  if (sectorTag) {
    const path =
      Q.dominantSectorPath && Q.dominantSectorPath !== '—' ? Q.dominantSectorPath : Q.dominantSector || '—';
    sectorTag.textContent = 'Sektor: ' + path;
  }
  const statusBanner = document.getElementById('qwStatusBanner');
  if (statusBanner) {
    statusBanner.className = 'qw-v1-status-banner ' + hudCopy.bannerCls;
    statusBanner.textContent = hudCopy.banner;
  }
  if (model) model.innerHTML = inV6 ? buildQuantumWheelModelFootHTML() : '';
  if (intel) intel.innerHTML = inV1 || inV6 ? '' : qwBuildFlowIntelStrip(Q, st);
  if (leg)
    leg.innerHTML =
      inV1 || inV6
        ? '<span><i class="qw-leg-line strong"></i> SILNÝ FLOW</span>' +
          '<span><i class="qw-leg-line mid"></i> STREDNÝ FLOW</span>' +
          '<span><i class="qw-leg-line weak"></i> SLABÝ FLOW</span>'
        : '<span><i class="qw-leg-line strong"></i> silný flow</span>' +
          '<span><i class="qw-leg-line mid"></i> stredný flow</span>' +
          '<span class="qw-leg-mig">↝ migrácia</span>';
  const bar = document.getElementById('qwScannerBar');
  if (bar) bar.innerHTML = '';
  const edge = document.getElementById('qwEdgeBanner');
  if (edge) {
    edge.className = 'qw-edge-banner';
    edge.textContent = '';
  }
  const lo = document.getElementById('qwLiveOutput');
  if (lo && !inV1 && Q.scanner && Q.scanner.liveOutput)
    lo.innerHTML = buildQwLiveOutputHTML(Q.scanner.liveOutput, Q.scanner.waitMode, edgeTxt, cs, chaos, Q.scanner);
  const chips = document.getElementById('qwIntelStrip');
  if (chips) chips.innerHTML = inV1 || inV6 ? '' : qwBuildIntelChips(Q, st);
  const badge = document.getElementById('qwScannerBadge');
  if (badge) {
    if (inV6 || inV1) {
      badge.style.display = 'none';
      badge.textContent = '';
    } else {
      badge.style.display = '';
      badge.textContent = hudCopy.badge;
      badge.className = hudCopy.badgeCls;
    }
  }
  qwEnsureBoardOutsideWheel();
  qwBindWheelResize();
  qwSyncWheelStageSize();
  qwStartCanvasAnim();
  setTimeout(qwSyncWheelStageSize, 300);
}
