/* UI panels — extracted from index-NOVY-V4.html */
'use strict';

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

function qwHudShort(txt,maxLen){
if(txt==null||txt==='')return'';
const s=String(txt).trim();
const n=maxLen||48;
return s.length<=n?s:s.slice(0,n-1)+'…';
}

function buildQuantumWheelLeftHTML(Q,st){
const fs=qwFlowStateSimple(Q);
const mom=qwMomBlock(Q);
const dir=qwDirDisplay(Q);
const reg=qwFlowRegimeDisplay(Q);
const voice=qwPlayerVoice(Q,st);
const flowPct=fs.ring!=null?fs.ring:(100-(Q.chaosLevel||50));
if(qwIsVzorWheelDash()){
const ins=qwFlowInsightHero(Q,st);
const mf=Q.mainFlow||{};
let insHead=(mf.headline||'').replace(/^HLAVNÝ FLOW:\s*/i,'').trim();
let insSub=mf.sub||'';
let insCls='greenTxt';
if(mf.cls==='break')insCls='redTxt';
else if(mf.cls==='quiet'||mf.cls==='pending')insCls='yellowTxt';
if(!insHead){insHead=ins.head;insSub=ins.sub||insSub;insCls=ins.cls;}
else if((Q.chaosLevel||0)>=68||Q.flowBreak)insCls='redTxt';
const fsv=qwFlowStateVzor(Q);
const flowPctV=fsv.ring!=null?fsv.ring:(100-(Q.chaosLevel||50));
const waitFlow=!!(Q.scanner&&Q.scanner.waitMode)||(Q.chaosLevel||0)>=68||Q.flowBreak;
const flowCta=waitFlow?'':'SLEDOVAŤ FLOW →';
return '<div class="qw-metric-stack qw-stack-flow hero-hud-stack">'
+qwMetric('HLAVNÝ FLOW INSIGHT',insHead,insSub,insCls,false,false,null,true,{icon:'◈',cta:flowCta})
+qwMetric('FLOW STAV',fsv.val,fsv.sub,fsv.cls,true,false,null,false,{icon:'◎',ring:flowPctV})
+qwMetric('FLOW MOMENTUM',mom.val,mom.sub,mom.cls,false,false,null,false,{icon:'↗'})
+qwMetric('FLOW DIRECTION',dir.main,dir.sub,dir.cls||'greenTxt',false,false,null,false,{icon:'⟲'})
+qwMetric('FLOW REŽIM',reg.val,reg.sub,reg.cls,false,false,null,false,{icon:'⚡'})
+'</div>';
}
return qwPanelKicker('flow','FLOW OBSERVER')
+'<div class="qw-metric-stack qw-stack-flow">'
+qwMetric('FLOW STAV',fs.val,fs.sub,fs.cls,true,false,flowPct,true)
+qwMetric('MOMENTUM',mom.val,mom.sub,mom.cls)
+qwMetric('SMER TOKU',dir.main,dir.sub,'blueTxt')
+qwMetric('REŽIM',voice.playHead||reg.val,voice.playSub||reg.sub,reg.cls,false)
+'</div>';
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
if(qwIsVzorWheelDash()){
const path=(Q.dominantSectorPath&&Q.dominantSectorPath!=='—')?Q.dominantSectorPath:(Q.dominantSector||'—');
const pathDisp=String(path).replace(/-/g,' → ');
const trust=Q.scanner&&Q.scanner.trust?Q.scanner.trust.score:(Q.confidence||82);
const followHead=Q.flowBreak?'FLOW BREAK':(Q.scanner&&Q.scanner.priority&&Q.scanner.priority.head?skQw(Q.scanner.priority.head):'REBOUND FLOW AKTÍVNY');
const followSub=Q.flowBreak?'Nestabilita toku':(Q.scanner&&Q.scanner.priority&&Q.scanner.priority.sub?skQw(Q.scanner.priority.sub):'Po edge sektoroch sa wheel vracia do stredu');
const breakLbl=Q.flowBreak?'BREAK DETEKOVANÝ':'ŽIADNY BREAK';
const breakSub=Q.flowBreak?'Flow sa láme — počkaj':'Flow je stabilný';
const breakCls=Q.flowBreak?'redTxt':'greenTxt';
return '<div class="qw-metric-stack qw-stack-dom hero-hud-stack">'
+qwMetric('DOMINANTNÉ',colN+' ('+colP+'%)',dozN+' ('+dozP+'%)','greenTxt',true,false,Math.max(colP,dozP),false,{icon:'◆'})
+qwMetric('DOMINANTNÝ SEKTOR',pathDisp,'Wheel sa často vracia do tohto sektora','greenTxt',false,false,null,false,{icon:'◎'})
+qwMetric('FOLLOW-UP DETECTION',followHead,followSub,'greenTxt',false,false,null,false,{icon:'↺'})
+qwMetric('FLOW BREAK CHECK',breakLbl,breakSub,breakCls,false,false,null,false,{icon:'⊘'})
+qwMetric('ZDRAVIE KOLESA',trust+'%','Wheel vytvára čitateľné návraty','greenTxt',false,false,null,false,{icon:'♥',ring:trust})
+'</div>';
}
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

function buildQuantumWheelBottomHTML(Q,st){
const live=qwIsVzorWheelDash()?qwLiveRadarComment(Q,st):qwHudShort(qwLiveRadarComment(Q,st),72);
const risk=qwFlowRiskLabel(Q);
const voice=qwPlayerVoice(Q,st);
const rec=(voice.rec||'Sleduj').replace(/^🎯\s*/,'').split(/[.!?]/)[0];
const recCls=(voice.playHead&&voice.playHead.indexOf('ČAKAJ')>=0)?'redTxt':'greenTxt';
const trace=spins.slice(-15);
const trail=trace.length?buildQwTrailHTML(trace,st,Q):'<span class="qw-v1-muted">—</span>';
const hud=qwIsVzorWheelDash()?' hero-hud-card':'';
return'<div class="qw-bottom-cell qw-bottom-trail'+hud+'">'
+qwPanelKicker('trail','STOPA TOKU')
+'<div class="qw-bottom-trail-body">'+trail+'</div></div>'
+'<div class="qw-bottom-cell qw-bottom-voice'+hud+'">'
+qwPanelKicker('voice','LIVE KOMENTÁR')
+'<p class="qw-bottom-live">'+live+'</p></div>'
+'<div class="qw-bottom-cell qw-bottom-risk'+hud+'">'
+qwPanelKicker('risk','RIZIKO FLOW')
+'<div class="qw-bottom-risk-val '+risk.cls+'">'+risk.val+'</div>'
+'<div class="qw-bottom-risk-sub">'+(qwIsVzorWheelDash()?risk.sub:qwHudShort(risk.sub,36))+'</div></div>'
+'<div class="qw-bottom-cell qw-bottom-rec'+hud+'">'
+qwPanelKicker('dom','ODPORÚČANIE')
+'<div class="qw-bottom-rec-val '+recCls+'">'+rec+'</div></div>';
}

function buildQuantumWheelModelFootHTML(){
if(qwIsVzorWheelDash()){
return'<div class="qw-model-rich">'
+'<div class="qw-model-col"><b>70% SPINS</b><span>FOLLOW-UP · PATTERNY · PAMÄŤ</span></div>'
+'<div class="qw-model-col"><b>20% TIMING</b><span>RYTMUS · STABILITA · SYNC</span></div>'
+'<div class="qw-model-col"><b>10% VISUAL</b><span>SEKTORY · TOK · KOLESO</span></div>'
+'</div>'
+'<span class="ai-engine">AI FLOW ENGINE | LIVE ADAPTIVE SYSTEM</span>';
}
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
const edgeTxt=qwEdgeBanner(cs.edge,Q.scanner&&Q.scanner.priority,chaos);
const chaosSess=qwChaosSession(Q,chaos);
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
if(bottom){
if(inV6)bottom.className='qw-dash-bottom qw-dash-bottom-4col hero-bottom-hud';
bottom.innerHTML=buildQuantumWheelBottomHTML(Q,st);
}
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
qwEnsureBoardOutsideWheel();
qwBindWheelResize();
qwSyncWheelStageSize();
qwStartCanvasAnim();
setTimeout(qwSyncWheelStageSize,300);
}