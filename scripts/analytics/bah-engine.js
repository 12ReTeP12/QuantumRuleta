'use strict';
/* 10H-3a bah-engine.js — Balík 10H */

/* BEHAVIOR ALERT ENGINE — iba raw spiny, max 2 alerty, anti-spam */
let bahAlertPrev=null;
let bahPendingConfirm={};
let bahDisplayedId=null;
let bahDisplayedSince=0;
let bahLastSwitchTs=0;
let bahLastSnapKey='';
const BAH_ALERT_SWITCH_MS=12000;
const BAH_ALERT_COOLDOWN_MS=8000;
const BAH_RADAR_MIN=5;
const BAH_NARRATE_FULL=12;
const BAH_SOFT_UNTIL=15;

function bahAlertDef(id,icon,title,text,color,pri,pulse){
return{id,icon,title,text:skWheelUserText(text),color,pri,pulse:pulse||'',hint:''};
}

function bahResetSession(){
bahAlertPrev=null;
bahPendingConfirm={};
bahDisplayedId=null;
bahDisplayedSince=0;
bahLastSwitchTs=0;
bahLastSnapKey='';
lastAlertHub=null;
lastAlertHubKey='';
}

function bahVar(seed,arr){
return arr[Math.abs(seed|0)%arr.length];
}

function bahRadarPhase(n){
if(n<BAH_RADAR_MIN)return'gather';
if(n<=RO_LEARN_MAX)return'observe';
if(n<BAH_SOFT_UNTIL)return'soft';
return'full';
}

function bahDataWhy(id,A){
const osc=A.oscCol||0;
const ch=A.chaos?A.chaos.chaosLevel:0;
const pat=A.pat?A.pat.rate:50;
const ret=A.returnRate||0;
const colLen=A.colSt?A.colSt.len:0;
const mig=A.mig?A.mig.dir:'—';
if(id==='CHAOS'){
if(osc>=56)return'V krátkom okne často strieda stĺpce — wheel mení smer príliš často.';
if(ch>=60)return'Session je teraz veľmi rozhúpaná (neporiadok okolo '+ch+' %) — stabilný rytmus chýba.';
return'Posledné spiny nemajú spoločný smer.';
}
if(id==='WAIT'){
if(pat<46)return'Opakovania v histórii nedávajú istotu (slabší obraz patternov).';
if(ch>=65)return'Koleso je príliš nepredvídateľný na bezpečné čítanie.';
if(mig==='MIX')return'Smer na wheeli sa stále preklápa — flow sa nevie ustáliť.';
return'Signály z histórie sa navzájom nezhodujú.';
}
if(id==='COLLAPSE')return'Dominancia slabne — návraty už len '+ret+' % v dominantnom pásme.';
if(id==='SHIFT')return'Smer pohybu sa zmenil z držaného smeru na rozptýlený.';
if(id==='UNCLEAR')return'Smer je nejasný — stĺpce aj chaos ukazujú rozptyl.';
if(id==='REVERSAL')return'Opakovaný tlak farby alebo pásu už nedrží ('+colLen+' spinov streak).';
if(id==='OVERHEAT')return'Stĺpec alebo pás tlačí už '+colLen+' spinov za sebou — tlak môže byť vyčerpaný.';
if(id==='WEAK')return'Návraty klesli na '+ret+' % — momentum dominancie slabne.';
if(id==='DOM'||id==='STABLE')return'Návraty v pásme držia okolo '+ret+' % — wheel sa tam vracia.';
if(id==='CLUSTER')return'Zásahy v pásme sú roztrieštené — návraty len '+ret+' %.';
if(osc>=52)return'Koleso mení smer príliš často a nevytvára stabilný rytmus.';
if(pat<52)return'Posledné spiny nevytvárajú stabilnú dominanciu.';
if(ret<40)return'Návraty do rovnakého sektora sú zatiaľ slabé.';
return'Behavior wheelu je momentálne nejasný — zatiaľ nič výrazné.';
}

function bahNarrativePack(id,A){
const n=spins.length;
const seed=n+(A.snap?A.snap.chaos:0)+(A.snap?A.snap.oscCol:0);
const phase=bahRadarPhase(n);
const soft=n<BAH_SOFT_UNTIL;
const colName=bahColName(A.domCol);
const hintWait='Odporúčam vynechať 2–3 spiny a sledovať ďalší vývoj.';
const hintWatch='Sleduj ďalší vývoj flowu opatrnejšie.';
const why=bahDataWhy(id,A);
const packs={
WAIT:{
icon:'⛔',
title:'Odporúčam počkať',
texts:[
'Flow sa zatiaľ nevie ustáliť — posledné spiny sú príliš rozbité.',
'Session je momentálne nečitateľná — wheel často mení charakter.',
'Koleso nevytvára stabilný rytmus, preto teraz radšej nič netvrdím.'
],
hint:hintWait,
color:'red'
},
CHAOS:{
icon:'🔴',
title:'Koleso často mení smer',
texts:[
'Koleso mení smer príliš často a nevytvára stabilný rytmus.',
'Posledné spiny nemajú spoločný smer — v session je veľa kolísania.',
'Behavior pôsobí príliš rozbitým dojmom, kolo sa ťažko číta.'
],
hint:soft?hintWatch:hintWait,
color:'red'
},
COLLAPSE:{
icon:'🔴',
title:'Flow stráca stabilitu',
texts:[
'Dominancia začína slabnúť a návraty už nedržia pokope.',
'Flow sa rozpadá — tlak v dominantnom pásme už nesedí s predchádzajúcimi spinmi.',
'Koleso stráca konzistenciu, session je ťažšie čitateľná.'
],
hint:hintWait,
color:'red'
},
SHIFT:{
icon:'🟠',
title:'Smer sa mení',
texts:[
'Koleso práve mení smer pohybu — predtým držal iný smer na kolese.',
'Presun flowu je viditeľný, starý smer už toľko nepodporuje.',
'Pohyb na wheeli sa preklápa, ešte nie je jasné, čo bude dominantné.'
],
hint:hintWatch,
color:'orange'
},
UNCLEAR:{
icon:'⚠',
title:'Behavior je nejasný',
texts:[
'Koleso momentálne nemá jednoznačný smer — signály sa navzájom nezhodujú.',
'Session zatiaľ nevytvára kvalitný tlak, smer je rozptýlený.',
'Posledné spiny nevytvárajú spoločný rytmus.'
],
hint:hintWatch,
color:'orange'
},
REVERSAL:{
icon:'🟠',
title:'Návraty slabnú',
texts:[
'Opakované návraty do rovnakého pásma začínajú strácať silu.',
'Farba alebo pás držali tlak, ale posledné spiny už nedávajú rovnaký obraz.',
'Flow môže čoskoro zmeniť smer — opakovaný tlak už nie je taký silný.'
],
hint:hintWatch,
color:'orange'
},
OVERHEAT:{
icon:'🟠',
title:'Tlak trvá príliš dlho',
texts:[
'Dominancia ide už dlho za sebou — wheel môže byť preťažený.',
'Jeden smer tlačí príliš dlho, návraty začínajú pôsobiť vyčerpane.',
'Tlak dominancie trvá dlho — pozor na únavu flowu.'
],
hint:hintWatch,
color:'orange'
},
WEAK:{
icon:'🟠',
title:'Dominancia slabne',
texts:[
'Dominancia stráca momentum — posledné spiny ju už toľko nepotvrdzujú.',
'Flow slabne, aj keď ešte vidím určitý smer.',
'Session začína byť menej čitateľná v doterajšom pásme.'
],
hint:hintWatch,
color:'orange'
},
DOM:{
icon:'🟢',
title:'Dominancia zatiaľ drží',
texts:[
colName+' stále drží tlak — návraty do tohto pásma pokračujú.',
'Koleso sa opakovane vracia do '+colName+' — behavior je zatiaľ konzistentný.',
'V session je viditeľný stabilný tlak na '+colName+'.'
],
hint:'Dominancia zatiaľ stále drží — sleduj, či to potvrdia ďalšie spiny.',
color:'green'
},
STABLE:{
icon:'🟢',
title:'Stabilný rytmus',
texts:[
'Koleso sa vracia do rovnakého sektora — rytmus je zatiaľ čitateľný.',
'Návraty a tlak držia pokope, session má zatiaľ zmysel sledovať.',
'Posledné spiny dávajú spoločný smer — flow je zatiaľ ustálený.'
],
hint:'Sleduj koleso — zatiaľ drží rozumné správanie bez tvrdenia o ďalšom čísle.',
color:'green'
},
CLUSTER:{
icon:'🟠',
title:'Pás je nestabilný',
texts:[
'Koleso nedrží stabilnú zónu — zásahy v pásme sú roztrieštené.',
'Klaster na wheeli slabne, session nemá pevný stred.',
'Opakované čísla v jednom pásme ešte nedávajú jednotný obraz.'
],
hint:hintWatch,
color:'orange'
},
IDLE:{
icon:'⚪',
title:'Momentálne bez výrazného flowu',
texts:[
'Koleso mení smer príliš často a nevytvára stabilný rytmus.',
'Posledné spiny nevytvárajú stabilnú dominanciu.',
'Behavior wheelu je momentálne nejasný — zatiaľ nič výrazné.',
'Session zatiaľ nevytvára kvalitný tlak.',
'Koleso stráca konzistenciu v krátkom okne.'
],
hint:n<RO_NARRATE_MIN?'Zbieram obraz — plný radar od '+RO_NARRATE_MIN+'. spinu v histórii.':hintWatch,
color:'neutral'
}
};
const p=packs[id]||packs.IDLE;
let text=id==='IDLE'?why:bahVar(seed,p.texts);
if(id!=='IDLE'&&why&&text.indexOf(why.slice(0,24))<0)text=text+' '+why;
let hint=p.hint;
if(phase==='observe')hint='Ešte zbieram obraz ('+n+' spinov) — plné upozornenia od '+BAH_NARRATE_FULL+'.';
else if(phase==='soft'&&p.color==='red')hint=hintWatch;
return{
icon:p.icon,
title:p.title,
text,
hint,
color:p.color,
phase
};
}

function bahColName(ci){
return(ci>=0?ci+1:1)+'. stĺpec';
}

function bahHumanizeAlert(raw,A){
if(!raw)return null;
const pack=bahNarrativePack(raw.id,A);
const n=spins.length;
let pulse=raw.pulse||'';
if(pack.color==='neutral'||pack.phase==='observe')pulse='';
else if(n<BAH_SOFT_UNTIL&&pack.color==='red')pulse='';
return{
id:raw.id,
icon:pack.icon,
title:pack.title,
text:pack.text,
hint:pack.hint,
color:pack.color,
pri:raw.pri,
pulse
};
}

function bahNowLine(primary){
if(!primary)return'';
if(primary.color==='red'||primary.id==='WAIT')return'Teraz: radšej počkaj a sleduj wheel.';
if(primary.color==='orange')return'Teraz: sleduj opatrne, či sa flow ustáli.';
if(primary.color==='green')return'Teraz: dominancia zatiaľ drží — sleduj potvrdenie.';
return'Teraz: pokojné pozorovanie bez výrazného signálu.';
}

function bahConfirm(id,ok){
if(!ok){delete bahPendingConfirm[id];return false;}
bahPendingConfirm[id]=(bahPendingConfirm[id]||0)+1;
return bahPendingConfirm[id]>=2;
}

function bahAnalyzeFromSpins(){
const slice=spins.filter(n=>n>0);
const t=slice.length;
if(t<5)return{ready:false};
const chaos=analyzeChaosFromSpins();
const oscCol=slice.length>=6?raOscillationScore(slice.slice(-12),'col'):0;
const pat=spins.length>=8?raPatternReliability():{rate:50};
const colSt=rbaColStreak(slice.slice(-12));
const colorSt=raColorStreak(slice.slice(-15));
const mig=getWheelMigrationDirection();
const colBins=rbaWeightedBins('col');
const domCol=[0,1,2].sort((a,b)=>colBins[b]-colBins[a])[0];
const domNums=qwNumsForColumn(domCol);
const returnRate=domNums.length?qwSectorReturnRate(domNums,Math.min(18,spins.length)):0;
const stableMig=mig.dir==='CW'||mig.dir==='CCW';
const snap={t,chaos:chaos.chaosLevel,oscCol,pat:pat.rate,colLen:colSt.len,migDir:mig.dir,domCol,returnRate,stableMig,colorLen:colorSt.len};
return{ready:true,snap,chaos,pat,colSt,colorSt,mig,domCol,returnRate,stableMig,oscCol};
}

function bahSnapKey(s){
if(!s)return'';
return[s.chaos,s.migDir,s.colLen,s.returnRate|0,s.pat|0,s.domCol,s.colorLen].join('|');
}

function bahCollectCandidates(A){
const c=[];
const wait=A.chaos.noEdge||A.chaos.chaosLevel>=65||(A.mig.dir==='MIX'&&A.chaos.chaosLevel>=52)||A.pat.rate<46;
if(wait)c.push(bahAlertDef('WAIT','🔴','REŽIM ČAKANIA','Flow je príliš nestabilný.','red',0,'bah-pulse-warn'));
if(A.chaos.chaosLevel>=60||A.oscCol>=56)c.push(bahAlertDef('CHAOS','🔴','CHAOS VYSOKÝ','Koleso mení smer príliš často.','red',1,'bah-pulse-warn'));
const collapseOk=bahConfirm('COLLAPSE',A.colSt.len>=3&&A.returnRate<36&&A.pat.rate<54);
if(collapseOk)c.push(bahAlertDef('COLLAPSE','🔴','FLOW KOLAPS','Dominancia stráca smer.','red',2,'bah-pulse-warn'));
const shiftOk=bahConfirm('SHIFT',bahAlertPrev&&(bahAlertPrev.migDir==='CW'||bahAlertPrev.migDir==='CCW')&&A.mig.dir==='MIX');
if(shiftOk)c.push(bahAlertDef('SHIFT','🟠','SMER SA MENÍ','Koleso mení flow smer.','orange',3,'bah-pulse-soft'));
if(!wait&&(A.mig.dir==='MIX'||A.oscCol>=54)&&A.chaos.chaosLevel<60)
c.push(bahAlertDef('UNCLEAR','⚠','FLOW NEJASNÝ','Koleso momentálne nemá smer.','orange',2));
if(A.colorSt.len>=4&&A.oscCol>=48)c.push(bahAlertDef('REVERSAL','🟠','NÁVRATY SLABNÚ','Flow môže meniť smer.','orange',6,'bah-pulse-soft'));
if(A.colSt.len>=5)c.push(bahAlertDef('OVERHEAT','🟠','TLAK SLABNE','Dominancia ide príliš dlho.','orange',5));
if(A.colSt.len>=3&&A.returnRate<42&&A.pat.rate<58)c.push(bahAlertDef('WEAK','🟠','FLOW SLABNE','Dominancia stráca momentum.','orange',5));
if(A.colSt.len>=3&&A.returnRate>=44&&!wait){
const colName=(A.domCol+1)+'. stĺpec';
c.push(bahAlertDef('DOM','🟢','STABILNÝ SEKTOR',colName+' stále drží flow.','green',4));
}
if(!wait&&A.chaos.chaosLevel<52&&A.returnRate>=46&&A.pat.rate>=54&&A.stableMig){
c.push(bahAlertDef('STABLE','🟢','STABILNÝ FLOW','Koleso sa vracia do rovnakého sektora.','green',7));
}
const clusterWeak=A.returnRate<32&&A.pat.rate<50;
if(clusterWeak&&!wait)c.push(bahAlertDef('CLUSTER','🟠','SLABÝ KLASTER','Koleso nedrží stabilnú zónu.','orange',4));
if(!c.length)c.push(bahAlertDef('IDLE','⚪','MOMENTÁLNE BEZ FLOW','Koleso nevytvára čitateľný behavior.','neutral',9));
else if(!wait&&A.chaos.chaosLevel<48&&A.pat.rate<52&&A.colSt.len<3&&A.returnRate<40)
c.push(bahAlertDef('IDLE','⚪','ŽIADNY SILNÝ FLOW','Momentálne nevidím čitateľný behavior.','neutral',8));
const seen=new Set();
return c.filter(a=>{if(seen.has(a.id))return false;seen.add(a.id);return true;}).sort((a,b)=>a.pri-b.pri);
}

function bahDedupePair(primary,secondary){
if(!primary)return{primary:null,secondary:null};
if(!secondary)return{primary,secondary:null};
if(secondary.id===primary.id||secondary.title===primary.title)return{primary,secondary:null};
if(primary.id==='WAIT'&&secondary.id==='UNCLEAR')return{primary,secondary:null};
if(primary.id==='CHAOS'&&secondary.id==='UNCLEAR')return{primary,secondary};
if(primary.id==='WAIT'&&secondary.id==='CHAOS')return{primary,secondary};
return{primary,secondary};
}

function bahApplyPriority(list){
if(!list.length)return[];
const wait=list.find(a=>a.id==='WAIT');
if(wait){
const chaos=list.find(a=>a.id==='CHAOS');
const collapse=list.find(a=>a.id==='COLLAPSE');
const weak=list.find(a=>a.id==='WEAK');
const sec=chaos||collapse||weak||list.find(a=>a=>a.id!=='WAIT'&&a.color!=='green'&&a.id!=='IDLE');
const pair=bahDedupePair(wait,sec);
const out=[pair.primary];
if(pair.secondary)out.push(pair.secondary);
return out.slice(0,2);
}
const top=list[0];
if(top.id==='IDLE')return[list.find(a=>a.id==='IDLE')||top].slice(0,1);
return list.slice(0,2);
}

function bahStabilizeDisplay(cands,snapKey){
if(!cands.length)return{primary:null,secondary:null};
const now=Date.now();
let pick=cands[0];
let sec=cands[1]||null;
const deduped=bahDedupePair(pick,sec);
pick=deduped.primary;
sec=deduped.secondary;
const stateChanged=snapKey&&snapKey!==bahLastSnapKey;
if(stateChanged)bahLastSnapKey=snapKey;
if(bahDisplayedId&&bahDisplayedId===pick.id){
if(!stateChanged&&now-bahDisplayedSince<BAH_ALERT_COOLDOWN_MS){
pick=cands.find(x=>x.id===bahDisplayedId)||pick;
}
}else if(bahDisplayedId&&pick.id!==bahDisplayedId){
if(!stateChanged&&now-bahLastSwitchTs<BAH_ALERT_SWITCH_MS){
const old=cands.find(x=>x.id===bahDisplayedId);
if(old&&(old.pri<=pick.pri+2))pick=old;
}
}
if(pick.id!==bahDisplayedId||stateChanged){
bahDisplayedId=pick.id;
bahDisplayedSince=now;
bahLastSwitchTs=now;
}
const finalDedup=bahDedupePair(pick,sec);
return{primary:finalDedup.primary,secondary:finalDedup.secondary};
}

function computeBehaviorAlerts(){
const lastN=spins.length?spins[spins.length-1]:'';
const k=spins.length+'|'+lastN;
if(lastAlertHub&&lastAlertHubKey===k)return lastAlertHub;
const empty={
ready:false,risk:{score:0,tag:'—'},comment:{blendScore:0,dataScore:0,reasoningScore:0},
warnings:[],infos:[],display:['Čakám na 5+ spinov…'],critical:0,all:[],
alerts:[],history:[],topCritical:null,primary:null,secondary:null
};
if(spins.length<5){lastAlertHub=empty;lastAlertHubKey=k;return empty;}
const A=bahAnalyzeFromSpins();
if(!A.ready){lastAlertHub=empty;lastAlertHubKey=k;return empty;}
const rawCands=bahCollectCandidates(A);
const filtered=bahApplyPriority(rawCands);
const disp=bahStabilizeDisplay(filtered,bahSnapKey(A.snap));
bahAlertPrev=A.snap;
const primary=bahHumanizeAlert(disp.primary,A);
const secondary=bahHumanizeAlert(disp.secondary,A);
const legacyAlerts=[primary,secondary].filter(Boolean).map(a=>({
id:a.id,text:a.title,type:a.id,priority:a.color==='red'?'CRITICAL':a.color==='orange'?'HIGH':'MEDIUM',
strength:0,source:'SPINY',cls:a.color==='red'?'p1':a.color==='orange'?'p2':'p4',ts:Date.now()
}));
const warnings=primary?['⚠ '+primary.title]:[];
const display=warnings.concat(secondary?['ℹ '+secondary.title]:[]);
const result={
ready:true,risk:computeRiskEngine(),
comment:{blendScore:0,dataScore:0,reasoningScore:0},
warnings,infos:[],display,critical:primary&&(primary.color==='red')?1:0,
all:display,alerts:legacyAlerts,history:[],
topCritical:legacyAlerts[0]||null,
primary,secondary,
nowLine:bahNowLine(primary),
phase:bahRadarPhase(spins.length)
};
lastAlertHub=result;
lastAlertHubKey=k;
return result;
}

function computeLiveAlertEngine(){return computeBehaviorAlerts();}
function computeAlertHub(){return computeBehaviorAlerts();}
function buildSpinAnomalyAlerts(){
const eng=computeBehaviorAlerts();
if(!eng.ready||!eng.primary)return[];
const out=[eng.primary.title];
if(eng.secondary)out.push(eng.secondary.title);
return out;
}
