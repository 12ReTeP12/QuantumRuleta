/**
 * Engine Hub (DEBUG) — Balík 10G z index-NOVY-V2.html
 * Závisí na: V2 inline (breakdown, telemetry, risk); volá sa z renderEngineAdvancedPanels.
 */
'use strict';

/* METRICS 8.4A/8.4B — cluster success rate (interná stratégia, nie TRUE VALID).
 * Zdroj: pipelineScorePreviousSpin → successfulPredictions / totalPredictions.
 * Engine Hub: jediná položka „História cluster hitov“ v SAMOUCENIE AI (id learn).
 * Detail: scripts/METRICS-SUCCESS-8.4A.md */
function getClusterSuccessRatePct(){
return totalPredictions?clamp(successfulPredictions/totalPredictions*100):50;
}

const ENGINE_CATALOG=[
{id:'spin',icon:'🧠',title:'SPIN ENGINE',features:[
['Adaptívne skórovanie klastrov',()=>lastSpinBreakdown.cluster],
['Sledovanie dominancie sektora',()=>lastSpinBreakdown.dozen],
['Hlboká analýza sekvencie spinov',()=>clamp(spins.length*4)],
['Potlačenie opakovania',()=>clamp(100-repeatRate())],
['Únava predikcie',()=>clamp(100-adaptiveWeights.failStreak*12)],
['Vývoj driftu',()=>lastSpinBreakdown.drift],
['Dynamické váženie horúce/studené',()=>lastSpinBreakdown.hotCold],
['Detekcia dlhej série',()=>lastSpinBreakdown.streak],
['AI perzistencie sektora',()=>lastSpinBreakdown.gap],
['Inteligentné rozšírenie susedov',()=>lastSpinBreakdown.chain]]},
{id:'timing',icon:'⏱',title:'TIMING ENGINE',features:[
['Detektor stability rytmu',()=>lastTimingBreakdown.rhythm],
['Detekcia anomálie timingu',()=>clamp(100-ivStd(spinIntervals())*16)],
['Analýza fázy rýchlosti',()=>lastTimingBreakdown.pace],
['Vývoj trendu timingu',()=>lastTimingBreakdown.trend],
['Sledovanie zrýchlenia spinu',()=>{const iv=spinIntervals();if(iv.length<3)return 50;const d=iv[iv.length-1]-iv[iv.length-2];return clamp(70-Math.abs(d)*15);}],
['Rozpoznanie patternu oneskorenia',()=>lastTimingBreakdown.flow],
['AI konzistencie tempa',()=>lastTimingBreakdown.stability],
['Detektor chaosu timingu',()=>clamp(100-ivStd(spinIntervals())*20)],
['Adaptívne váženie timingu',()=>clamp(adaptiveWeights.timing*100)],
['Engine synchronizácie toku',()=>lastTimingBreakdown.flow]]},
{id:'visual',icon:'👁',title:'VIZUÁLNA AI',features:[
['Adaptívna heatmapa',()=>lastVisualBreakdown.heatSpread],
['Vizualizácia tlakovej vlny',()=>lastVisualBreakdown.pressure],
['Zvýraznenie dominantného sektora',()=>scoreVisualPressure()],
['Dynamické vizuálne váženie',()=>lastVisualBreakdown.board],
['Intenzita žiaru sektora',()=>lastVisualBreakdown.wheel],
['Živé prekrytia tlaku',()=>lastVisualBreakdown.pressure],
['Vizualizácia chaosu',()=>clamp(100-(parseFloat(entropy())||0)*8)],
['Inteligentný radar kolesa',()=>lastVisualBreakdown.wheel],
['Detekcia vizuálneho driftu',()=>lastVisualBreakdown.align],
['Sledovanie koncentrácie tepla',()=>lastVisualBreakdown.heatSpread]]},
{id:'memory',icon:'🧬',title:'SYSTÉM PAMÄTE',features:[
['Krátkodobá pamäť',()=>clamp(memoryBank.short.length*20)],
['Strednodobá pamäť',()=>clamp(memoryBank.mid.length*5)],
['Dlhodobá pamäť',()=>clamp(memoryBank.long.length*1.25)],
['Starnutie patternov',()=>clamp(100-spins.length*0.3)],
['Úpadok pamäte',()=>clamp(100-repeatRate()/2)],
['Rekurzívna pamäť patternov',()=>neighborChain()*9],
['Sledovanie historického driftu',()=>lastSpinBreakdown.drift],
['AI histórie sektora',()=>lastSpinBreakdown.dozen],
['Engine perzistencie patternov',()=>lastSpinBreakdown.gap],
['Adaptívne váženie pamäte',()=>clamp(55+memoryBank.mid.length)]]},
{id:'prediction',icon:'🎯',title:'PREDIKČNÝ ENGINE',features:[
['Primárna predikcia',()=>lastPick!=null?clamp(70+lastCoreValues.spinCore*0.3):40],
['Sekundárna predikcia',()=>clamp(lastCoreValues.timingCore)],
['Záložná predikcia',()=>clamp(lastCoreValues.visualCore)],
['Spoľahlivosť predikcie',()=>calculateAI()],
['Vyváženie rizika',()=>clamp(100-(parseFloat(entropy())||0)*9)],
['Adaptívny rozptyl predikcie',()=>clamp(getClusters()[0].score*4)],
['Potlačenie falošných patternov',()=>clamp(100-repeatRate())],
['Kontrola prekrývania predikcií',()=>clamp(80-adaptiveWeights.failStreak*10)],
['Dynamická agresivita',()=>clamp(lastCoreValues.spinCore*adaptiveWeights.spin)],
['Vyváženie viacerých sektorov',()=>lastSpinBreakdown.dozen]]},
{id:'chaos',icon:'⚠',title:'CHAOS / ENTROPIA',features:[
['Skutočný engine entropie',()=>clamp(100-(parseFloat(entropy())||0)*10)],
['Detekcia stavu chaosu',()=>clamp((parseFloat(entropy())||0)*12)],
['Index stability',()=>lastTimingBreakdown.stability],
['Sledovanie volatility',()=>clamp(ivStd(spinIntervals())*18)],
['Analyzátor náhodnosti',()=>clamp(50+Math.random()*0+ivStd(spinIntervals())*12)],
['Logika obnovy entropie',()=>clamp(100-(parseFloat(entropy())||0)*11)],
['Detekcia kolapsu patternu',()=>clamp(100-lastSpinBreakdown.cluster)],
['Agresívna ochrana pred chaosom',()=>clamp(70+lastCoreValues.timingCore*0.2)],
['Monitor nestability AI',()=>clamp(100-adaptiveWeights.failStreak*14)],
['Systém degradácie spoľahlivosti',()=>clamp(calculateAI()-adaptiveWeights.failStreak*5)]]},
{id:'flow',icon:'🌀',title:'ENGINE TOKU KOLESA',features:[
['Sledovanie po smere hodinových',()=>{const r=spins.slice(-8);let c=0;for(let i=1;i<r.length;i++)if(wheelStep(r[i-1],r[i])>0)c++;return clamp(c*14);}],
['Sledovanie proti smeru hodinových',()=>{const r=spins.slice(-8);let c=0;for(let i=1;i<r.length;i++)if(wheelStep(r[i-1],r[i])<0)c++;return clamp(c*14);}],
['Smerové momentum',()=>wheelDirectionScore()],
['Detekcia odrazu',()=>clamp(neighborChain()*8)],
['Detekcia obratu',()=>clamp(100-Math.abs(wheelStep(spins[spins.length-2]||0,spins[spins.length-1]||0))*12)],
['Migrácia sektora',()=>lastSpinBreakdown.drift],
['Zrýchlenie kolesa',()=>lastTimingBreakdown.pace],
['Analýza kruhového toku',()=>lastSpinBreakdown.chain],
['Vývoj reťazca susedov',()=>clamp(neighborChain()*9)],
['Perzistencia momenta',()=>lastSpinBreakdown.streak]]},
{id:'telemetry',icon:'📊',title:'TELEMETRY',features:[
['AI diagnostika',()=>calculateAI()],
['Synchronizácia engineov',()=>clamp((lastCoreValues.spinCore+lastCoreValues.timingCore+lastCoreValues.visualCore)/3)],
['Monitor živého signálu',()=>lastCoreValues.spinCore],
['Rezervované · slot metriky',()=>null],
['Meradlo spoľahlivosti',()=>calculateAI()],
['Meradlo rizika',()=>clamp((parseFloat(entropy())||0)*14)],
['Skóre dôvery AI',()=>clamp(calculateAI()-adaptiveWeights.failStreak*4)],
['Sledovanie výkonu engineov',()=>lastCoreValues.timingCore],
['Rekalibrácia v reálnom čase',()=>clamp(60+adaptiveWeights.spin*40)],
['Monitorovanie stability',()=>lastTimingBreakdown.stability]]},
{id:'hot',icon:'🔥',title:'AKTIVITA WHEELU',features:[
['Aktívne čísla (behavior)',()=>lastSpinBreakdown.hotCold],
['Neaktívne čísla / recovery',()=>clamp(100-lastSpinBreakdown.hotCold)],
['Vyváženie tepla sektora',()=>lastSpinBreakdown.dozen],
['Perzistencia tepla',()=>lastSpinBreakdown.gap],
['Detekcia prehriateho sektora',()=>scoreVisualHeatSpread()],
['Predikcia prelomenia studených',()=>clamp(100-scoreVisualHeatSpread())],
['Adaptívne váženie tepla',()=>lastVisualBreakdown.heatSpread],
['Analýza trendu tepla',()=>lastSpinBreakdown.hotCold],
['Momentum tepla',()=>lastSpinBreakdown.streak],
['Teplotné vlny sektora',()=>lastVisualBreakdown.pressure]]},
{id:'perf',icon:'⚡',title:'ENGINE VÝKONU',features:[
['Dávkové vykresľovanie',()=>95],
['Aktualizácie len canvasu',()=>92],
['Optimalizácia DOM',()=>88],
['Memoizované výpočty',()=>cache.clusters?90:75],
['Inteligentné intervaly obnovy',()=>90],
['Vykresľovanie vhodné pre GPU',()=>85],
['Systém priority vykresľovania',()=>87],
['Lenivé ťažké vykresľovanie',()=>clamp(100-HEAVY_RENDER_INTERVAL*8)],
['Strážca výkonu',()=>96],
['Monitor stability snímok',()=>94]]},
{id:'learn',icon:'🤖',title:'SAMOUCENIE AI',features:[
['Analýza neúspešnej predikcie',()=>clamp(100-adaptiveWeights.failStreak*11)],
['Systém automatickej korekcie',()=>clamp(50+adaptiveWeights.spin*50)],
['Adaptívne váhy signálu',()=>clamp(adaptiveWeights.spin*100)],
['Spoľahlivosť učenia',()=>clamp(calculateAI()-adaptiveWeights.failStreak*6)],
['História cluster hitov',()=>getClusterSuccessRatePct()],
['Dynamická rekalibrácia',()=>lastCoreValues.spinCore],
['Vývoj predikcie',()=>clamp(predictionHistory.length*3)],
['Spätnoväzobná slučka AI',()=>clamp(70+adaptiveWeights.spin*25)],
['Inteligentná adaptácia',()=>clamp(65+adaptiveWeights.spin*30)]]},
{id:'pressure',icon:'📈',title:'ENGINE TLAKU',features:[
['Akumulácia tlaku',()=>scoreVisualPressure()],
['Tlakové vlny sektora',()=>lastVisualBreakdown.pressure],
['Úpadok tlaku',()=>clamp(100-scoreVisualPressure())],
['Dominantné zóny tlaku',()=>clamp(getClusters()[0].score*3)],
['Vyváženie tlaku klastra',()=>lastSpinBreakdown.cluster],
['Migrácia tlaku',()=>lastSpinBreakdown.drift],
['Detekcia skrytého tlaku',()=>clamp(getClusters()[1]?.score*3||30)],
['Vývoj trendu tlaku',()=>lastSpinBreakdown.dozen],
['Výstrahy vrcholu tlaku',()=>clamp(getClusters()[0].score*4)],
['Detekcia kolapsu tlaku',()=>clamp(100-getClusters()[0].score*2)]]},
{id:'cluster',icon:'🧩',title:'ENGINE KLASTROV',features:[
['Inteligentné zlučovanie klastrov',()=>lastSpinBreakdown.cluster],
['Dynamická veľkosť klastra',()=>clamp(getClusters()[0].nums.length*20)],
['Vývoj klastra',()=>lastSpinBreakdown.chain],
['Úpadok klastra',()=>clamp(100-lastSpinBreakdown.cluster)],
['AI dominantného klastra',()=>lastSpinBreakdown.cluster],
['Detekcia skrytého klastra',()=>clamp((getClusters()[1]?.score||0)*3)],
['Adaptívne váženie klastra',()=>lastSpinBreakdown.cluster],
['Analýza konfliktu klastrov',()=>clamp(Math.abs((getClusters()[0]?.score||0)-(getClusters()[1]?.score||0))*5)],
['Detekcia prekrývania sektorov',()=>lastSpinBreakdown.dozen],
['Momentum klastra',()=>lastSpinBreakdown.drift]]},
{id:'alert',icon:'🚨',title:'SYSTÉM VÝSTRAH',features:[
['Výstraha vysokého chaosu',()=>clamp((parseFloat(entropy())||0)*15)],
['Výstraha rizika predikcie',()=>clamp(100-calculateAI())],
['Varovanie slabá spoľahlivosť',()=>clamp(100-calculateAI())],
['Varovanie preťaženia sektora',()=>scoreVisualHeatSpread()],
['Výstraha kolapsu patternu',()=>clamp(100-lastSpinBreakdown.cluster)],
['Výstraha nestability timingu',()=>clamp(100-lastTimingBreakdown.stability)],
['Výstraha obratu driftu',()=>clamp(Math.abs(wheelStep(spins[spins.length-2]||0,spins[spins.length-1]||0))*14)],
['Varovanie skoku entropie',()=>clamp((parseFloat(entropy())||0)*13)],
['Varovanie nestability AI',()=>clamp(adaptiveWeights.failStreak*14)],
['Výstraha extrémnej volatility',()=>clamp(ivStd(spinIntervals())*20)]]}
];

function featureHtml(name,val){
if(val==null)return '<div class="feature-item feature-item-reserved"><div class="metric-label"><span>'+name+'</span><b>—</b></div><div class="bar"><div class="fill" style="width:0"></div></div></div>';
const v=clamp(typeof val==='number'?val:50);
return '<div class="feature-item"><div class="metric-label"><span>'+name+'</span><b>'+Math.round(v)+'%</b></div><div class="bar"><div class="fill" style="width:'+v+'%"></div></div></div>';
}

const ENGINE_HUB_DIAGNOSTIC={
prediction:[
['Vyváženie pilierov',()=>clamp((lastCoreValues.spinCore+lastCoreValues.timingCore+lastCoreValues.visualCore)/3)],
['Pilier spinov',()=>lastCoreValues.spinCore],
['Pilier timingu',()=>lastCoreValues.timingCore],
['Pilier vizuálu',()=>lastCoreValues.visualCore],
['Risk balance',()=>clamp(100-(parseFloat(entropy())||0)*9)],
['Kontrola prekrývania',()=>clamp(80-adaptiveWeights.failStreak*10)],
['Potlačenie patternov',()=>clamp(100-repeatRate())],
['Agresivita',()=>clamp(lastCoreValues.spinCore*adaptiveWeights.spin)],
['Vyváženie sektora',()=>lastSpinBreakdown.dozen],
['Zaťaženie engineu',()=>calculateAI()]]
};
function getEngineHubFeatures(eng){
if(eng.id==='prediction'&&ENGINE_HUB_DIAGNOSTIC.prediction)return ENGINE_HUB_DIAGNOSTIC.prediction;
return eng.features;
}
function measureEngineHealth(eng){
const feats=getEngineHubFeatures(eng);
let sum=0,n=0;
feats.forEach(f=>{
try{sum+=clamp(f[1]());n++;}catch(e){sum+=50;n++;}
});
return n?Math.round(sum/n):50;
}
function computeEngineHubState(){
const signals=spins.length>=2?collectEngineTelemetrySignals():[];
const healthEngine=signals.length?Math.round(signals.reduce((s,e)=>s+e.pct,0)/signals.length):50;
const risk=spins.length>=2?computeRiskChaosEngine():null;
const telem=spins.length>=2?computeTelemetryEngine():null;
const stability=Math.round(
(risk?risk.stability:50)*0.35+
(telem?telem.confidenceStability:50)*0.3+
lastTimingBreakdown.stability*0.25+
(risk?risk.patternReliability:50)*0.1
);
const liveMetrics={
spins:spins.length,
lastSpin:lastSpinNum()!=null?lastSpinNum():'—',
spinCore:lastCoreValues.spinCore,
timingCore:lastCoreValues.timingCore,
visualCore:lastCoreValues.visualCore,
engineSync:telem?telem.engineSync:computeEngineSynchronization(signals),
signalQuality:telem?telem.signalQuality:healthEngine,
failStreak:adaptiveWeights.failStreak,
timingLive:timingRunning
};
const engines=ENGINE_CATALOG.map(eng=>({
id:eng.id,
icon:eng.icon,
title:eng.title,
health:measureEngineHealth(eng)
}));
return{
modelLabel:'Centrum engineov · všetky systémy · bez hlavnej predikcie',
healthEngine,
stability,
liveMetrics,
engines,
signals,
note:'Diagnostika engineov — nie primárny tip'
};
}

function buildEngineHub(){
const tabs=document.getElementById('engineTabs');
const panels=document.getElementById('enginePanels');
if(!tabs||!panels)return;
if(!tabs.dataset)tabs.dataset={};
if(tabs.dataset.ready)return;
tabs.dataset.ready='1';
ENGINE_CATALOG.forEach((eng,idx)=>{
const btn=document.createElement('button');
btn.className='etab'+(idx===0?' active':'');
btn.textContent=eng.icon+' '+eng.title.split(' ')[0];
btn.onclick=()=>{
document.querySelectorAll('.etab').forEach(t=>t.classList.remove('active'));
document.querySelectorAll('.engine-panel').forEach(p=>p.classList.remove('active'));
btn.classList.add('active');
document.getElementById('panel-'+eng.id).classList.add('active');
};
tabs.appendChild(btn);
const panel=document.createElement('div');
panel.className='engine-panel'+(idx===0?' active':'');
panel.id='panel-'+eng.id;
panel.innerHTML='<h2>'+eng.icon+' '+eng.title+'</h2><div class="feature-grid" id="grid-'+eng.id+'"></div>';
panels.appendChild(panel);
});
}

function renderEngineHub(){
buildEngineHub();
const hub=computeEngineHubState();
const summaryEl=document.getElementById('engineHubSummary');
if(summaryEl){
const lm=hub.liveMetrics;
summaryEl.innerHTML=
'<div class="section-label">'+hub.modelLabel+'</div>'
+'<div class="panel-line"><span>'+skUiLabel('Health engine')+'</span><b class="'+(hub.healthEngine>=60?'greenTxt':'yellowTxt')+'">'+hub.healthEngine+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Stability')+'</span><b class="blueTxt">'+hub.stability+'%</b></div>'
+'<div class="section-label">'+skUiLabel('Live metrics')+'</div>'
+'<div class="panel-line"><span>'+skUiLabel('Spins · last')+'</span><b>'+lm.spins+' · '+lm.lastSpin+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Core pulse')+'</span><b class="greenTxt">'+lm.spinCore+' · '+lm.timingCore+' · '+lm.visualCore+'</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Sync · signal')+'</span><b class="yellowTxt">'+lm.engineSync+'% · '+lm.signalQuality+'%</b></div>'
+'<div class="panel-line"><span>'+skUiLabel('Fail · timing')+'</span><b class="'+(lm.failStreak>=2?'redTxt':'greenTxt')+'">'+lm.failStreak+'× · '+(lm.timingLive?'ŽIVÝ':'STOP')+'</b></div>'
+'<div class="alert" style="font-size:9px;margin-top:4px">'+hub.note+'</div>';
}
ENGINE_CATALOG.forEach(eng=>{
const grid=document.getElementById('grid-'+eng.id);
if(!grid)return;
const eh=hub.engines.find(e=>e.id===eng.id);
const hdr=eh?'<div class="panel-line"><span>Zdravie engine</span><b class="greenTxt">'+eh.health+'%</b></div>':'';
grid.innerHTML=hdr+getEngineHubFeatures(eng).map(f=>{
let val=50;
try{val=f[1]();}catch(e){val=50;}
return featureHtml(f[0],val);
}).join('');
});
}
