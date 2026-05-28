/* Quantum Wheel — extracted from index-NOVY-V4.html
   LEN bezpečné oddelenie (bez refactoru / bez zmeny logiky). */

'use strict';

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

function qwChaosSession(Q,chaos){
if(!Q||!Q.ready)return false;
const c=chaos||{chaosLevel:Q.chaosLevel||0,noEdge:!!Q.noEdge};
return c.chaosLevel>=62||c.noEdge||!!Q.flowBreak||(Q.scanner&&Q.scanner.waitMode);
}

function qwEdgeBanner(edge,pri,chaos){
if(edge==='NO_EDGE')return'⚠ FLOW NEJASNÝ — wheel nemá čitateľný smer';
if(edge==='FLOW_TOO_CHAOTIC')return'🔴 REŽIM ČAKANIA — chaos '+chaos.chaosLevel+'%';
if(edge==='WAIT_MODE')return'🔴 REŽIM ČAKANIA';
if(edge==='LOW_CONFIDENCE')return'⚠ FLOW NEJASNÝ — nízka istota';
if(pri&&pri.wait)return'🔴 REŽIM ČAKANIA';
if(pri&&pri.code==='CHAOS')return'🔴 REŽIM ČAKANIA — chaos '+chaos.chaosLevel+'%';
if(pri&&pri.code==='COLLAPSE')return'⚠ DOMINANCIA SLABNE';
return'';
}

