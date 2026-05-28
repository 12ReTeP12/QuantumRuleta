/* AI prediction — extracted from index-NOVY-V4.html
   LEN bezpečné oddelenie (bez refactoru / bez zmeny logiky). */

'use strict';

function computeLiveFlowPredictionAI(){
const key=predFlowCacheKey()+'|lfp|'+spins.length+'|'+spins[spins.length-1];
if(lfpCache&&lfpCacheKey===key)return lfpCache;
if(spins.length<2)return null;
const behavior=predCoreBehaviorEngine();
const phase=lfpActivationPhase();
const flowMem=lfpFlowMemory();
const cols=lfpBlendCategory('cols');
const dozens=lfpBlendCategory('dozens');
const colTop=lfpTopTwo(cols);
const dozTop=lfpTopTwo(dozens);
const spinVisual=lfpSpinsVsVisual(colTop);
const anomaly=lfpDetectAnomalies(cols,dozens,colTop,dozTop);
const flow=lfpDetectFlowState(anomaly);
if(flowMem.ready&&flowMem.arc==='DOM→BREAK→RETURN'&&flow.state==='NORMAL')flow.detail=flowMem.detail;
const sup=lfpSuppressionPressure(cols,dozens);
const zero=lfpZeroContext();
const red=lfpBlendCategory('red');
const black=lfpBlendCategory('black');
const low=lfpBlendCategory('low');
const high=lfpBlendCategory('high');
const even=lfpBlendCategory('even');
const odd=lfpBlendCategory('odd');
let spinScore=50;
if(flow.state==='REPEAT'&&anomaly.repeatStrong)spinScore=clamp(72+anomaly.score*0.2,0,95);
else if(flowMem.arc==='DOM→BREAK→RETURN')spinScore=clamp(68+colTop.first.p*0.15,55,82);
else if(flow.state==='ALTERNATING')spinScore=28;
else if(flow.state==='CHAOTIC')spinScore=24;
else if(flow.state==='REVERSAL')spinScore=55;
else if(flow.state==='MIGRATING')spinScore=52;
else spinScore=clamp(46+colTop.first.p*0.3,35,65);
const timing=lfpTimingEngine20(flow,anomaly);
const visual=lfpVisualEngine10();
const blend=lfpSpinsPriorityBlend(spinScore,timing.core,visual.core,spinVisual);
let confidence=lfpAntiFakeConfidence(blend.weighted*timing.factor,flow,anomaly,sup,phase,colTop,dozTop);
const signalTier=lfpSignalTier(confidence);
const colGap=colTop.first.p-colTop.second.p;
const dozGap=dozTop.first.p-dozTop.second.p;
const noClearDominance=colGap<14&&dozGap<14;
const lowEdgeFlow=flow.state==='NORMAL'&&!anomaly.repeatStrong&&(colGap<16||confidence<48);
const stability=lfpFlowStabilityScore(flow,anomaly,cols,dozens,colTop,dozTop);
const flowShift=lfpFlowShiftDetector(flow,anomaly,sup,colTop,dozTop);
const deadFlow=lfpDeadFlowDetector(flow,stability,confidence,noClearDominance,anomaly);
const domMeter=lfpDominanceMeter(cols,dozens);
const pressureWarns=lfpPressureWarnings(sup,cols,dozens,low,high);
const memDecay=lfpMemoryDecayInfo();
let noPredict=behavior.learn;
let noReason=behavior.noReason||'';
if(behavior.learn){
noReason='REŽIM UČENIA';
}else if(deadFlow.dead&&!anomaly.repeatStrong&&behavior.playMode==='HRAT'){
noReason='DEAD FLOW';
}else if(flowShift.active&&stability.score<42&&!anomaly.repeatStrong&&behavior.playMode!=='HRAT'){
noReason='FLOW SHIFT — WAIT';
}
let mode='WAIT';
if(behavior.learn)mode='WAIT';
else if(behavior.playMode==='CAKAJ')mode='WAIT';
else if(behavior.playMode==='OPATRNE')mode='SAFE';
else if(confidence>=70&&flow.state==='REPEAT'&&anomaly.repeatStrong)mode='AGGRESSIVE';
else mode='ACTIVE';
if(deadFlow.forceWait&&behavior.playMode!=='HRAT')mode='WAIT';
confidence=clamp(Math.round(confidence*0.35+behavior.confidence*0.65),0,behavior.learn?phase.maxConf:88);
const know=behavior.learn?lfpAssessKnowledge(flow,confidence,noClearDominance,lowEdgeFlow,true,noReason,'WAIT'):{
knowsUnknown:behavior.playMode==='CAKAJ',
status:behavior.playHead.replace(/^[^\s]+\s/,''),
emoji:behavior.playMode==='HRAT'?'✓':behavior.playMode==='OPATRNE'?'⚠️':'⏳',
cls:behavior.playMode==='HRAT'?'edge':behavior.playMode==='OPATRNE'?'low':'wait',
sub:behavior.playSub
};
const columns=behavior.learn?'—':behavior.columns;
const dozensPick=behavior.learn?'—':behavior.dozens;
const color=behavior.learn?'—':behavior.color;
const parity=behavior.learn?'—':behavior.parity;
const range=behavior.learn?'—':behavior.range;
const displaySignal=lfpComputeDisplaySignal(confidence,stability,flow,anomaly,sup,timing,phase);
const signalTierDisp=lfpSignalTier(displaySignal);
const signalIntel=lfpExplainSignal(displaySignal,confidence,stability,flow,anomaly,sup,timing);
const flowIntel=lfpExplainFlow(flow,colTop,dozTop,sup,anomaly,red,black);
const modeIntel=lfpExplainMode(mode,flow,stability,confidence,anomaly,lowEdgeFlow,colTop,noPredict);
const zeroIntel=lfpExplainZero(zero);
let detections=lfpBuildDetections({flow,anomaly,sup,flowShift,deadFlow,noPredict,noReason});
if(behavior.anomalyMsg)detections=['ANOMÁLIA detekovaná'].concat(detections).slice(0,6);
if(behavior.alternatingLabel)detections=[behavior.alternatingLabel].concat(detections).slice(0,6);
lfpCache={
behavior,phase,flow,flowMem,mode,color,parity,range,columns,dozens:dozensPick,
signal:displaySignal,confidence,signalTier:signalTierDisp,signalIntel,flowIntel,modeIntel,zeroIntel,
know,spinVisual,detections,
stability,flowShift,deadFlow,domMeter,pressureWarns,memDecay,
spinCore:spinScore,timingCore:timing.core,visualCore:visual.core,
blend,timing,visual,supCol:sup,supDoz:sup,sup,
anomaly,zero,noPredict,noReason,noClearDominance,lowEdgeFlow,
edgeLabel:know.status==='LIVE EDGE'||know.status==='ŽIVÁ VÝHODA'?'ŽIVÁ VÝHODA':know.status,
modeSk:(modeIntel&&modeIntel.modeSk)||mode,
signalLabel:signalTierDisp.label,signalCls:signalTierDisp.cls,
odNuly:zero.od,zero,
colPct:colTop.first.p,dozPct:dozTop.first.p,colGap,dozGap,cols,dozensPct:dozens
};
lfpCacheKey=key;
return lfpCache;
}

function computeAIPredictionEngine(){
if(spins.length<2)return null;
const LFP=computeLiveFlowPredictionAI();
if(LFP){
const B=LFP.behavior||predCoreBehaviorEngine();
const timing=LFP.timing||{label:'NEUTRÁL',factor:1,core:LFP.timingCore};
const blend=LFP.blend;
const flowEng=computeFollowUpFlowEngine();
const trustHierarchy={tier:LFP.signal>=62?'VERY_STRONG':LFP.signal>=48?'MEDIUM':'WEAK',label:LFP.mode,showStrong:LFP.signal>=58,aggression:LFP.mode==='AGGRESSIVE'?0.9:LFP.mode==='WAIT'?0.35:0.65,sub:LFP.flow.detail};
const stab={quiet:B.learn||B.playMode==='CAKAJ',displayCol:null,displayDoz:null,mainOpinion:{headline:B.playHead,sub:B.playSub,cls:''},breakDetected:false};
return{
flowEng,blend,timing,visualSup:{factor:1,factor:1},patScore:LFP.spinCore,
flowStatus:{flow:LFP.flow.state,trust:String(LFP.signal),cls:'ra-fs-mid',hierarchy:trustHierarchy},
trustHierarchy,flowTrust:{label:LFP.flow.state,cls:'greenTxt'},
predRezim:B.learn?'OBSERVATION':B.playMode==='HRAT'?'FLOW ACTIVE':B.playMode==='OPATRNE'?'WARNING':'OBSERVATION',
signalStrength:LFP.signal,rawConfidence:LFP.signal,confidence:B.confidence||LFP.confidence,
color:B.color==='ČERVENÁ'?'červená':B.color==='ČIERNA'?'čierna':'—',parity:B.parity,size:B.range==='19–36'?'VEĽKÉ (19–36)':'MALÉ (1–18)',
dozens:B.dozens,columns:B.columns,colorDisplay:B.color,
chaosLevel:B.chaosPct,chaosTag:B.chaosPct+'%',
playState:{state:B.playMode,play:B.playHead,cls:B.playCls==='ok'?'greenTxt':B.playCls==='bad'?'redTxt':'yellowTxt',reason:B.playSub},
flowConfirm:{},opinionChange:null,stability:stab,mainOpinion:stab.mainOpinion,quiet:stab.quiet,
flowTransition:null,flowChanging:false,displayCol:null,displayDoz:null,
seria:LFP.flow.state,rezim:LFP.mode,odNuly:LFP.odNuly,
dominantFlow:LFP.flow.state,dominantTarget:LFP.columns,
state:LFP.mode,stateLabel:LFP.mode,riskLabel:LFP.flow.state,
sessionMode:sessionIntel.label,sessionQuality:sessionIntel.mode,
edgeStrength:'—',edge:'—',playState:{state:LFP.mode,play:LFP.mode,cls:'yellowTxt'},
suppressed:LFP.flow.state==='CHAOTIC',noEdge:false,cluster:getClusters()[0],
sector:'—',modelLabel:'ŽIVÝ FLOW + ANOMÁLIA · 70/20/10',
flowSeria:LFP.flow.state,flowBrain:LFP.flow.state,flowTrust:{label:LFP.flow.state,cls:'greenTxt'},
momentumLabel:'—',chaosLevel:0,chaosTag:'—',migrationDir:'—',migrationLabel:'—',
preferNow:LFP.columns+' · '+LFP.dozens,notFortuneTeller:'Live flow — nie štatistická istota.',
lfp:LFP
};
}
coreAnalysisDepth++;
try{
const flowEng=computeFollowUpFlowEngine();
const spinCore=computeSpinsFlowCore();
const timingCoreVal=getBallTimingSamples().length?computeBallTimingCore(getBallTimingSamples()):computeTimingCore();
const visualCoreVal=computeVisualCore();
const blend=computeModelBlend(spinCore,timingCoreVal,visualCoreVal);
const timing=getPredictionTimingFactor();
const visualSup=getPredictionVisualSupportSector();
const patScore=computeFlowPatternsScore();
let trustHierarchy=computePredictionTrustHierarchy(flowEng,patScore,timing);
const adaptShim={bestCol:flowEng.adaptBestCol!=null?flowEng.adaptBestCol:flowEng.shortCol,repeatTo:flowEng.adaptRepeatTo||0,score:flowEng.adaptScore||0,edgeHits:flowEng.adaptEdgeHits||[]};
const shortShim={bestCol:flowEng.shortCol,score:flowEng.shortScore,repeatTo:flowEng.repeatToTarget};
const stab=predResolveMainFlowEngine(flowEng.realityCol!=null?flowEng.realityCol:flowEng.bestCol,flowEng.bestDoz,flowEng,trustHierarchy.tier,adaptShim,shortShim);
if(flowEng.realityStrong)trustHierarchy=Object.assign({},trustHierarchy,{showStrong:true,sub:flowEng.realityReason||trustHierarchy.sub});
if(stab.displayCol!=null){
flowEng.bestCol=stab.displayCol;
flowEng.bestDoz=stab.displayDoz;
if(flowEng.secondCol!=null&&flowEng.secondCol!==stab.displayCol&&flowEng.secondScore>=2){
flowEng.colPick=String(stab.displayCol+1)+' + '+(flowEng.secondCol+1);
}else flowEng.colPick=String(stab.displayCol+1);
}
if(stab.quiet)trustHierarchy=Object.assign({},trustHierarchy,{tier:'WEAK',label:'BEZ STABILNÉHO FLOW',showStrong:false,sub:stab.mainOpinion.sub,aggression:0.3});
if(stab.stableTier==='WEAK'&&trustHierarchy.tier!=='VERY_STRONG')trustHierarchy=Object.assign({},trustHierarchy,{tier:'WEAK',label:'SLABÁ PREDIKCIA',flow:'ROZPADÁ SA',trust:'SLABÁ',cls:'pred-tier-weak',aggression:0.35,showStrong:false,sub:'Dlhodobá stabilita: dva slabé signály za sebou — bez paniky po jednom spine.'});
else if(stab.stableTier==='VERY_STRONG')trustHierarchy=Object.assign({},trustHierarchy,{tier:'VERY_STRONG',label:'VEĽMI SILNÁ PREDIKCIA',cls:'pred-tier-very',aggression:0.92,showStrong:true});
const flowConfirm=computeFlowConfirmation(flowEng,trustHierarchy,timing,stab);
const flowTrust=predComputeFlowTrust(trustHierarchy,flowEng,{code:flowEng.flowMomentum,label:flowEng.flowMomentumLabel});
flowEng.flowTrust=flowTrust;
const opinionChange=predExplainOpinionChange(flowEng,flowEng.bestCol,flowEng.bestDoz);
const flowStatus=computePredictionFlowStatus(flowEng,patScore,timing);
let predRezim=computePredictionRezim(flowEng,flowStatus,trustHierarchy);
if(stab.quiet)predRezim='OBSERVATION';
const flowTransition=predFlowTransitionLabel(predStableState.prevRezim,predRezim);
predStableState.prevRezim=predRezim;
const learnMult=getLearningConfidenceBoost();
let signalStrength=blend.weighted;
signalStrength=signalStrength*0.9+timing.factor*blend.weighted*0.06+visualSup.factor*blend.weighted*0.04;
signalStrength*=learnMult*aiStateMachine.confMult*(flowEng.corrAggressive||1);
if(flowEng.flowMomentum==='RASTIE')signalStrength=clamp(signalStrength*1.06,0,100);
if(flowEng.flowMomentum==='SLABNE')signalStrength=clamp(signalStrength*0.9,0,100);
if(flowEng.corrPenalty)signalStrength=clamp(signalStrength*(1-flowEng.corrPenalty),0,100);
signalStrength*=trustHierarchy.aggression;
if(trustHierarchy.tier==='WEAK')signalStrength=clamp(Math.min(signalStrength,42),0,100);
if(trustHierarchy.tier==='VERY_STRONG')signalStrength=clamp(signalStrength,62,88);
if(predRezim==='DEAD SPINS')signalStrength=clamp(Math.min(signalStrength,35));
let rawConfidence=clamp(Math.round(signalStrength));
let confidence=rawConfidence;
if(trustHierarchy.tier==='MEDIUM')confidence=clamp(confidence,45,62);
if(trustHierarchy.tier==='WEAK')confidence=clamp(confidence,28,48);
if(trustHierarchy.tier==='VERY_STRONG')confidence=clamp(confidence,58,85);
const cluster=getClusters()[0];
const playState={state:predRezim==='FLOW ACTIVE'?'ATTACK':predRezim==='DEAD SPINS'?'SAFE':'OBSERVE',play:predRezim,cls:predRezim==='FLOW ACTIVE'?'greenTxt':'yellowTxt',reason:flowEng.reasons.stlpce||'—'};
const pickColor=flowEng.colorWeak?'—':(flowEng.dominantColor==='červená'?'ČERVENÁ':'ČIERNA');
const pickSize=flowEng.sizePick==='19-36'?'VEĽKÉ (19–36)':'MALÉ (1–18)';
const pickPar=flowEng.priorityWeak>=2?'—':(flowEng.parityPick==='párne'?'PÁRNE':'NEPÁRNE');
const colPlain=String(flowEng.colPick||'').replace(/<[^>]+>/g,'').trim()||(stab.displayCol+1);
const dozPlain=String(flowEng.dozPick||'').replace(/<[^>]+>/g,'').trim()||(stab.displayDoz+1);
const columnsDisplay=predFormatPickWithConfirm(colPlain,flowConfirm.col);
const dozensDisplay=predFormatPickWithConfirm(dozPlain,flowConfirm.doz);
const colorDisplay=pickColor!=='—'?predFormatPickWithConfirm(pickColor,flowConfirm.color):'—';
const preferCol=colPlain;
return{
flowEng,blend,timing,visualSup,patScore,flowStatus,trustHierarchy,flowTrust,predRezim,
signalStrength:+signalStrength.toFixed(2),rawConfidence,confidence,
color:pickColor,parity:pickPar,size:pickSize,
dozens:dozensDisplay,columns:columnsDisplay,colorDisplay,
flowConfirm,opinionChange,stability:stab,mainOpinion:stab.mainOpinion,quiet:stab.quiet,flowTransition,flowChanging:!!(flowEng.flowFlip||opinionChange||stab.breakDetected),
displayCol:stab.displayCol,displayDoz:stab.displayDoz,
seria:flowStatus.flow,rezim:predRezim,odNuly:computeOdNuly(),
dominantFlow:'FLOW · '+preferCol,dominantTarget:(flowEng.bestCol+1)+'. stĺpec',
state:playState.state,stateLabel:predRezim,riskLabel:flowStatus.trust,
sessionMode:sessionIntel.label,sessionQuality:sessionIntel.mode,
edgeStrength:flowStatus.trust,edge:flowStatus.trust==='SILNÁ'?'CLEAR EDGE':'LOW EDGE',
playState,suppressed:false,noEdge:false,cluster,
sector:cluster.nums.slice(0,5).join(' · '),
modelLabel:'AI predikcia · 70% spiny · 20% timing · 10% vizuál',
flowSeria:flowEng.flowMomentumLabel||'—',
flowBrain:flowTrust.label,
flowTrust,
momentumLabel:flowEng.flowMomentumLabel,
chaosLevel:0,chaosTag:'—',migrationDir:'—',migrationLabel:'—',
preferNow:'Teraz (posledných '+PRED_SHORT_WIN+'): '+preferCol+' · '+flowEng.dozPick.replace(/<[^>]+>/g,''),
notFortuneTeller:'Analýza follow-up — nie magická istota. Flow sa mení každým spinom.'
};
}finally{coreAnalysisDepth=Math.max(0,coreAnalysisDepth-1);}
}

function computeAIPrediction(){
if(spins.length<2)return null;
const key=predCacheKey();
if(lastAIPredictionCache&&lastAIPredictionKey===key)return lastAIPredictionCache;
const CA=computeAIPredictionEngine();
if(!CA)return null;
const cluster=CA.cluster;
const result={
trend:predictSpinTrendLine(),
last:lastSpinNum(),
tip:null,
sector:CA.sector,
dozens:CA.dozens,columns:CA.columns,color:CA.color,parity:CA.parity,size:CA.size,
seria:CA.seria,rezim:CA.rezim,odNuly:CA.odNuly,
dominantFlow:CA.dominantFlow,dominantTarget:CA.dominantTarget,
state:CA.state,stateLabel:CA.stateLabel,riskLabel:CA.riskLabel,sessionMode:CA.sessionMode,
edgeStrength:CA.edgeStrength,suppressed:CA.suppressed,noEdge:CA.noEdge,
confidence:CA.confidence,rawConfidence:CA.rawConfidence,signalStrength:CA.signalStrength,
flowEng:CA.flowEng,flowStatus:CA.flowStatus,trustHierarchy:CA.trustHierarchy,predRezim:CA.predRezim,preferNow:CA.preferNow,
flowConfirm:CA.flowConfirm,opinionChange:CA.opinionChange,columnsDisplay:CA.columns,dozensDisplay:CA.dozens,colorDisplay:CA.colorDisplay,
invisible:computeInvisibleEngines(CA.rawConfidence!=null?CA.rawConfidence:CA.confidence),
spinCore:CA.blend.spinCore,timingCore:CA.blend.timingCore,visualCore:CA.blend.visualCore,
spinPart:CA.blend.spinPart,timingPart:CA.blend.timingPart,visualPart:CA.blend.visualPart,modelWeighted:CA.blend.weighted,
timingLabel:CA.timing.label,timingFactor:CA.timing.factor,visualSupport:CA.visualSup.factor,
chaosPenalty:1,clusterScore:cluster.score.toFixed(2),modelLabel:CA.modelLabel,
sources:'SPINY 40% follow-up · 20% patterny · 10% pamäť · 20% timing · 10% vizuál',
learningBoost:getLearningConfidenceBoost(),
evolutionGen:predictionEvolution.generation,selfCorrection:predictionEvolution.selfCorrection,
coreAnalysis:CA,
lfp:CA.lfp||computeLiveFlowPredictionAI()
};
lastAIPredictionCache=result;
lastAIPredictionKey=key;
lastCoreValues={spinCore:result.spinCore,timingCore:result.timingCore,visualCore:result.visualCore};
return result;
}
