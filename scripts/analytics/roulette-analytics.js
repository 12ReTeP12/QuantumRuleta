/* Ruletový analytik — extracted from index-NOVY-V4.html */
'use strict';

/* RULETOVÝ ANALYTIK — samostatný mozog (nezávislý od AI predikcie) */
let rouletteAnalystCache=null,rouletteAnalystKey='';
let rouletteAnalystPrevSnapshot=null;
let rouletteAnalystSessionBaseline=null;
let rouletteAnalystSessionProfile=null;
const RA_PATTERN_WINDOW=12;
const RA_PATTERN_WARN=60;
const RA_MEMORY_WINDOWS=[5,10,20,30,50];
const RBA_OBS_MAX=11;
const RBA_FULL_MIN=12;
const RBA_DEEP_MIN=20;
const RBA_WIN_WEIGHT={5:1,10:.82,20:.58,30:.38,50:.22};
let rbaSessionLog=[];
let rbaSelfEvalHits=[];
let rbaFlowMemoryPatterns=[];
let rbaEvolutionTrack=[];
let rbaPrevBehaviorSnap=null;

function raColName(ci){return ci===0?'1. stĺpec':ci===1?'2. stĺpec':ci===2?'3. stĺpec':'—';}
function raDozName(di){return di===0?'1. tucet':di===1?'2. tucet':di===2?'3. tucet':'—';}
function raColorName(n){if(n===0)return'zelená (0)';return reds.includes(n)?'červená':'čierna';}
function raParityName(n){if(n===0)return'—';return n%2===0?'párne':'nepárne';}
function raSizeName(n){if(n===0)return'—';return n>=19?'veľké (19–36)':'malé (1–18)';}

function raSliceStats(win){
const slice=spins.slice(-win);
if(!slice.length)return null;
const cols=[0,0,0],doz=[0,0,0];
let red=0,black=0,even=0,odd=0,low=0,high=0,zeros=0;
slice.forEach(n=>{
if(n===0){zeros++;return;}
const ci=columnIndexForNum(n),di=dozenIndexForNum(n);
if(ci>=0)cols[ci]++;
if(di>=0)doz[di]++;
if(reds.includes(n))red++;else black++;
if(n%2===0)even++;else odd++;
if(n>=19)high++;else low++;
});
const nz=Math.max(1,slice.length-zeros);
const topCol=cols.indexOf(Math.max(...cols));
const topDoz=doz.indexOf(Math.max(...doz));
return{
win,total:slice.length,cols,doz,topCol,topDoz,
redPct:Math.round(red/nz*100),blackPct:Math.round(black/nz*100),
evenPct:Math.round(even/nz*100),oddPct:Math.round(odd/nz*100),
lowPct:Math.round(low/nz*100),highPct:Math.round(high/nz*100),
last:slice[slice.length-1],trail:slice.slice(-6).join(' → ')
};
}

function raColorStreak(slice){
if(slice.length<2)return{len:0,color:'—'};
const last=slice[slice.length-1];
if(last===0)return{len:0,color:'—'};
const isRed=reds.includes(last);
let len=1;
for(let i=slice.length-2;i>=0;i--){
const n=slice[i];
if(n===0)break;
if(reds.includes(n)===isRed)len++;else break;
}
return{len,color:isRed?'červená':'čierna'};
}

function raReturnHits(slice,field){
let hits=0,trials=0;
for(let i=2;i<slice.length;i++){
const a=field==='col'?columnIndexForNum(slice[i-2]):dozenIndexForNum(slice[i-2]);
const b=field==='col'?columnIndexForNum(slice[i-1]):dozenIndexForNum(slice[i-1]);
const c=field==='col'?columnIndexForNum(slice[i]):dozenIndexForNum(slice[i]);
if(a<0||b<0||c<0)continue;
if(b!==a){trials++;if(c===a)hits++;}
}
return{hits,trials,rate:trials?Math.round(hits/trials*100):0};
}

function raFollowUpWeakness(slice){
const st=raColorStreak(slice);
if(st.len<4)return null;
const recent=slice.slice(-3).filter(n=>n!==0);
const prev=slice.slice(-6,-3).filter(n=>n!==0);
if(!recent.length||!prev.length)return null;
let rR=0,rB=0,pR=0,pB=0;
recent.forEach(n=>{if(reds.includes(n))rR++;else rB++;});
prev.forEach(n=>{if(reds.includes(n))pR++;else pB++;});
const recentDom=rR>=rB?'červená':'čierna';
const prevDom=pR>=pB?'červená':'čierna';
if(recentDom===st.color&&recent.length<prev.length)return st.color;
return null;
}

function raOscillationScore(slice,field){
if(slice.length<6)return 0;
let flips=0;
for(let i=1;i<slice.length;i++){
const a=field==='col'?columnIndexForNum(slice[i-1]):dozenIndexForNum(slice[i-1]);
const b=field==='col'?columnIndexForNum(slice[i]):dozenIndexForNum(slice[i]);
if(a>=0&&b>=0&&a!==b)flips++;
}
return Math.round(flips/(slice.length-1)*100);
}

function raPatternReliability(){
const slice=spins.slice(-Math.max(RA_PATTERN_WINDOW+4,spins.length));
const colRet=raReturnHits(slice,'col');
const dozRet=raReturnHits(slice,'doz');
const rates=[];
if(colRet.trials>=4)rates.push(colRet.rate);
if(dozRet.trials>=4)rates.push(dozRet.rate);
const colorSt=raColorStreak(slice);
if(colorSt.len>=3){
let hit=0,tot=0;
for(let i=1;i<slice.length;i++){
const n=slice[i],p=slice[i-1];
if(n===0||p===0)continue;
tot++;
if(reds.includes(n)===reds.includes(p))hit++;
}
if(tot>=4)rates.push(Math.round(hit/tot*100));
}
if(!rates.length)return{rate:50,samples:0};
return{rate:Math.round(rates.reduce((a,b)=>a+b,0)/rates.length),samples:colRet.trials+dozRet.trials};
}

function raCompareMemory(){
const parts=[];
const w5=raSliceStats(5),w10=raSliceStats(10),w25=spins.length>=12?raSliceStats(25):null;
if(w5&&w10&&w5.topCol!==w10.topCol)parts.push('Za 5 spinov vedie '+raColName(w5.topCol)+', za 10 už '+raColName(w10.topCol)+'.');
if(w10&&w25&&w10.topDoz!==w25.topDoz)parts.push('Tucet sa posúva: krátko '+raDozName(w10.topDoz)+', v širšom okne '+raDozName(w25.topDoz)+'.');
if(w5&&w10&&Math.abs(w5.evenPct-w10.evenPct)>=25)parts.push('Párnosť sa v relácii rýchlo preklápa (krátko '+(w5.evenPct>=50?'párne':'nepárne')+', širšie '+(w10.evenPct>=50?'párne':'nepárne')+').');
return parts.length?parts.join(' '):'Pamäť 5/10/25 spinov drží podobný obraz — zatiaľ bez ostrého zlomu.';
}

function raStanceVsPrediction(analyst){
const pr=lastAIPredictionCache&&lastAIPredictionKey===predCacheKey()?lastAIPredictionCache:null;
if(!pr||!analyst.ready)return'Predikcia ešte nie je k dispozícii — analytik pracuje len z histórie spinov.';
const agree=[];
const disagree=[];
if(/ČERVENÁ/.test(pr.color||'')&&analyst.dominantColor==='červená')agree.push('farbu');
else if(/ČIERNA/.test(pr.color||'')&&analyst.dominantColor==='čierna')agree.push('farbu');
else if(pr.color&&pr.color!=='—')disagree.push('farbu (predikcia vs. tlak v histórii)');
const predPar=/PÁRNE/.test(pr.parity||'')?'párne':/NEPÁRNE/.test(pr.parity||'')?'nepárne':null;
if(predPar&&analyst.dominantParity===predPar)agree.push('párnosť');
else if(predPar)disagree.push('párnosť');
if(agree.length&&!disagree.length)return'Analytik <b>súhlasí</b> s predikciou v: '+agree.join(', ')+' — stále ide o dva nezávislé mozgy.';
if(disagree.length)return'Analytik <b>nesúhlasí</b> s predikciou ('+disagree.join(', ')+') — vidí iný hidden flow v pamäti spinov.';
return'Analytik je opatrný — predikcia ani pamäť nemajú ešte čistý obraz.';
}

function raTrustLabel(pat,mode,oscCol,colorSt){
if(mode==='DEAD_SPIN')return{label:'nízka',cls:'redTxt'};
if(mode==='WARNING'||pat.rate<55)return{label:'nízka',cls:'redTxt'};
if(pat.rate>=72&&colorSt.len>=3)return{label:'stabilná',cls:'greenTxt'};
if(pat.rate>=60)return{label:'flow zatiaľ drží',cls:'yellowTxt'};
return{label:'opatrná',cls:'yellowTxt'};
}

function raFlowScoreLabel(mode,pat,oscCol){
if(mode==='DEAD_SPIN'||pat.rate<RA_PATTERN_WARN)return{label:'ROZPADÁ SA',cls:'ra-flow-collapse'};
if(mode==='WARNING'||pat.rate<65||oscCol>=58)return{label:'NEISTÝ',cls:'ra-flow-uncertain'};
return{label:'STABILNÝ',cls:'ra-flow-stable'};
}

function raAiMood(mode,pat,s5,s50,colorSt,newFlow){
if(mode==='DEAD_SPIN')return'AI stav: MŔTVE SPINY';
if(mode==='WARNING')return'AI stav: NEISTÁ SESSION';
if(newFlow)return'AI stav: ZAČÍNA SA TVORIŤ NOVÝ FLOW';
if(pat.rate>=72&&s5&&s50&&s5.topCol===s50.topCol&&colorSt.len>=3)return'AI stav: FLOW STABILNÝ';
if(pat.rate>=62)return'AI stav: FLOW DRŽÍ — SLEDUJEM';
return'AI stav: NEISTÁ SESSION';
}

function raDetectFlowChange(s5,s10,s25,prev){
if(!prev||prev.spinLen!==spins.length-1)return null;
const lines=[];
if(s5&&prev.s5&&s5.topCol!==prev.s5.topCol){
lines.push(raColName(s5.topCol)+' prvýkrát tlačí v krátkom okne — predtým viedol '+raColName(prev.s5.topCol)+'.');
}
if(s10&&prev.s10&&s10.topDoz!==prev.s10.topDoz){
lines.push(raDozName(s10.topDoz)+' sa posúva do popredia (predtým '+raDozName(prev.s10.topDoz)+').');
}
if(s25&&prev.s25&&Math.abs(s25.redPct-prev.s25.redPct)>=35){
lines.push('Farby sa prudko preklopili — '+s25.redPct+'% červená v posledných 25 (predtým '+prev.s25.redPct+'%).');
}
const last=lastSpinNum();
if(last!=null&&prev.last!=null&&columnIndexForNum(last)>=0&&columnIndexForNum(prev.last)>=0){
const ci=columnIndexForNum(last),pi=columnIndexForNum(prev.last);
if(ci!==pi&&s5&&s5.topCol===ci&&prev.s5&&prev.s5.topCol!==ci){
lines.push(raColName(ci)+' prvýkrát vytvoril follow-up pokračovanie po prerušení.');
}
}
return lines.length?lines.join(' '):null;
}

function raFlowFatigue(slice,colorSt,weakFollow,colRet,dozRet,s10){
const out=[];
if(colorSt.len>=6)out.push('AI vidí únavu '+colorSt.color+' flow — trend beží už '+colorSt.len+' spinov a follow-up slabne.');
if(weakFollow)out.push('AI vidí únavu '+weakFollow+' flow — posledné spiny už nedržia rovnaký tlak.');
if(s10&&colRet.trials>=6){
const early=raReturnHits(slice.slice(0,Math.floor(slice.length/2)),'col');
const late=raReturnHits(slice.slice(-Math.floor(slice.length/2)),'col');
if(early.rate>=55&&late.rate<early.rate-18)out.push(raColName(s10.topCol)+' už nevytvára tak stabilné návraty ako predtým.');
}
if(s10&&dozRet.trials>=6){
const early=raReturnHits(slice.slice(0,Math.floor(slice.length/2)),'doz');
const late=raReturnHits(slice.slice(-Math.floor(slice.length/2)),'doz');
if(early.rate>=50&&late.rate<early.rate-15)out.push(raDozName(s10.topDoz)+' stráca návratový rytmus — flow je preťažený.');
}
if(persistenceEngine.maxLife>=8)out.push('Perzistencia je príliš dlhá ('+persistenceEngine.maxLife+' spinov) — trend môže byť vyčerpaný.');
return out;
}

function raHiddenFlow(slice){
const out=[];
const nz=slice.filter(n=>n!==0);
if(nz.length<10)return out;
let afterHigh=0,afterHighLow=0;
for(let i=2;i<nz.length;i++){
const a=nz[i-2],b=nz[i-1],c=nz[i];
if(a>=19&&b>=19){
afterHigh++;
if(c>=1&&c<=18)afterHighLow++;
}
}
if(afterHigh>=3&&afterHighLow>=2)out.push('AI si všimla skrytý návratový rytmus: po <b>veľkom</b> range sa wheel často vracia späť do <b>malého</b> range.');
let afterLow=0,afterLowHigh=0;
for(let i=2;i<nz.length;i++){
const a=nz[i-2],b=nz[i-1],c=nz[i];
if(a<=18&&b<=18&&a>=1){
afterLow++;
if(c>=19)afterLowHigh++;
}
}
if(afterLow>=3&&afterLowHigh>=2)out.push('Skrytý rytmus: po sérii <b>malých</b> čísel často príde odpoveď do <b>veľkého</b> pásma.');
const colBounce=raReturnHits(slice.slice(-20),'col');
if(colBounce.trials>=5&&colBounce.rate>=58)out.push('Hidden návrat: stĺpec sa po odchýlení často vracia do rovnakého pásu bez toho, aby to bolo na prvý pohľad viditeľné.');
return out;
}

function raFlowConflict(s5,s10,s25,colorSt){
if(!s5||!s10||!s25)return null;
const colDom=raColName(s10.topCol);
const dozDom=raDozName(s10.topDoz);
const colorDom=colorSt.len>=2?colorSt.color:(s10.redPct>=55?'červená':'čierna');
const sizeDom=s10.highPct>=58?'veľké':s10.lowPct>=58?'malé':null;
const conflicts=[];
if(s25.topCol!==s10.topCol)conflicts.push('stĺpce v dlhej pamäti ukazujú iný smer než krátky tlak');
if(s25.topDoz!==s10.topDoz)conflicts.push('tucty sa v krátkom a dlhom okne nezhodujú');
if(colorSt.len>=4&&((colorDom==='červená'&&s10.redPct<45)||(colorDom==='čierna'&&s10.blackPct<45))){
conflicts.push('farby už flow nepotvrdzujú, hoci pred chvíľou držali streak');
}
if(conflicts.length<2)return null;
return'AI vidí konflikt flow: '+colDom+' stále drží v stĺpcoch, '+dozDom+' v tuctoch, ale '+conflicts.slice(0,2).join(' a ')+'.';
}

function raShortVsLong(s5,s10,s25,s50){
if(!s5||!s10)return{short:'—',long:'—'};
let short='Krátkodobo: '+raColName(s5.topCol)+' zosilňuje';
if(s5.topDoz!==s10.topDoz)short+=', '+raDozName(s5.topDoz)+' v krátkom okne tlačí';
short+='.';
let long='Dlhodobo: ';
if(s50&&s25){
long+=raColName(s50.topCol)+' stále drží dominantný flow, '+raDozName(s50.topDoz)+' v širšej pamäti';
if(s50.topCol!==s5.topCol)long+=' (iný než posledných 5)';
}else if(s25){
long+=raColName(s25.topCol)+' · '+raDozName(s25.topDoz);
}else long+='ešte málo dát';
long+='.';
return{short,long};
}

function raWatchMode(mode,pat,s5,s10,newFlow){
if(mode==='DEAD_SPIN')return null;
if(pat.rate>=55&&pat.rate<72&&s5&&s10){
return'AI zatiaľ iba sleduje: '+raColName(s5.topCol)+' začína vytvárať nový flow, ale ešte ho nepotvrdzuje dostatok spinov.';
}
if(newFlow&&pat.rate>=50)return'AI zatiaľ iba sleduje: tvorí sa nový rytmus — čakám na 3–5 potvrdzujúcich spinov.';
if(mode==='WARNING')return'AI zatiaľ iba sleduje: patterny sú nestabilné, bez agresívneho vstupu.';
return null;
}

function raBuildAnalystAlerts(flowChange,conflict,fatigue,hidden,mode,pat,s5,colorSt,colRet){
const alerts=[];
if(flowChange)alerts.push({text:flowChange,type:'zmena',positive:false});
if(conflict)alerts.push({text:conflict,type:'konflikt',positive:false});
fatigue.forEach(t=>alerts.push({text:t,type:'únava',positive:false}));
hidden.forEach(t=>alerts.push({text:t,type:'hidden',positive:false}));
if(mode==='DEAD_SPIN')alerts.push({text:'Kolaps flow — session je nečitateľná, pozorovacie spiny.',type:'kolaps',positive:false});
else if(pat.rate>=70&&colorSt.len>=5){
alerts.push({text:raColName(s5?s5.topCol:0)+' drží dlhý trend — sleduj únavu, nie slepú agresiu.',type:'breakout',positive:true});
}
if(colRet.trials>=5&&colRet.rate>=60){
const c=s5?raColName(s5.topCol):'stĺpec';
alerts.push({text:'AI ALERT: '+c+' prerušil chaos a vracia sa návratový rytmus.',type:'návrat',positive:true});
}
if(lastSpinNum()!=null&&spins.length>=3&&spins[spins.length-1]===spins[spins.length-2]){
alerts.push({text:'AI ALERT: anomália — rovnaké číslo po sebe, flow sa môže zmeniť.',type:'anomália',positive:false});
}
return alerts.slice(0,5);
}

function raPersonalityLine(mode,pat,trust,watchLine,newFlow,positive){
const lines=[];
if(positive)lines.push(positive);
if(watchLine)lines.push(watchLine);
else if(mode==='DEAD_SPIN')lines.push('AI momentálne nevidí dostatočne stabilný rytmus — odporúča pozorovanie.');
else if(pat.rate>=68&&trust.label==='stabilná')lines.push('AI zatiaľ stále verí návratovému flow v pamäti spinov.');
else if(newFlow)lines.push('AI je pokojná — nový flow sa len rodí, ešte bez tvrdení.');
else if(trust.label==='flow zatiaľ drží')lines.push('AI zatiaľ stále verí, že krátky flow má zmysel sledovať.');
else lines.push('AI je opatrná analytička — radšej pozoruje než tlačí na rozhodnutie.');
return lines[0]||'';
}

function raSelfLearnNote(pat,mode){
if(pat.samples<6)return'';
if(mode==='DEAD_SPIN'||pat.rate<RA_PATTERN_WARN){
return'AI sa učí z posledných chýb: vlastné patterny nevychádzali — znižuje agresivitu a prepína do pozorovania.';
}
if(pat.rate<65)return'AI upravila dôveru — patterny posledných spinov sú slabšie, viac pozorovania.';
return'';
}

function raWheelBehaviorFeel(slice){
if(slice.length<4)return'AI ešte len začína sledovať správanie wheelu.';
let near=0,far=0;
for(let i=1;i<slice.length;i++){
const d=Math.abs(wheelStep(slice[i-1],slice[i]));
if(d<=3)near++;else if(d>=6)far++;
}
if(near>=far+2)return'AI má pocit, že wheel sa momentálne vracia do stredu namiesto migrácie do krajov.';
if(far>=near+2)return'AI má pocit, že wheel tlačí skôr do krajov — migrácia je výraznejšia než držanie stredu.';
return'AI má pocit, že wheel balansuje medzi stredom a okrajmi — session ešte nemá jednoznačný smer.';
}

function raSessionPersonality(mode,pat,rep,oscCol,colorSt,colRet){
if(mode==='DEAD_SPIN')return'Táto session momentálne pôsobí: mŕtvo a ťažko čitateľne.';
if(pat.rate>=68&&colRet.rate>=55&&rep<28)return'Táto session momentálne pôsobí: rytmicky a návratovo.';
if(oscCol>=58&&pat.rate<60)return'Táto session momentálne pôsobí: chaoticky a nestabilne.';
if(colorSt.len>=5&&rep<22)return'Táto session momentálne pôsobí: agresívne — jeden trend tlačí dlho.';
if(colRet.rate>=50&&pat.rate>=55)return'Táto session momentálne pôsobí: návratovo — wheel drží opakované pásy.';
if(pat.rate>=62)return'Táto session momentálne pôsobí: čitateľne, no opatrne.';
return'Táto session momentálne pôsobí: nestabilne a návratovo.';
}

function raRandomVsPattern(pat,spinCount,colRet){
if(spinCount<8)return'AI zatiaľ nevie potvrdiť, či ide o reálny pattern alebo krátkodobú náhodu — málo spinov v pamäti.';
if(pat.rate>=65&&colRet.trials>=5&&colRet.rate>=55)return'AI to už neberie ako náhodu — návraty sa opakujú príliš často na coincidence.';
if(pat.rate<50)return'AI zatiaľ nevie potvrdiť, či ide o reálny pattern alebo krátkodobú náhodu.';
return'AI je opatrná: časť vyzerá ako pattern, časť stále ako krátka náhoda.';
}

function raSuspiciousFlow(s10,slice,colRet){
if(!s10||colRet.trials<4)return null;
const lines=[];
const col=raColName(s10.topCol);
let retCount=0;
for(let i=2;i<slice.length;i++){
const a=columnIndexForNum(slice[i-2]),b=columnIndexForNum(slice[i-1]),c=columnIndexForNum(slice[i]);
if(a>=0&&b>=0&&c>=0&&b!==a&&c===a&&a===s10.topCol)retCount++;
}
if(retCount>=4&&colRet.rate>=58)lines.push('AI si všimla podozrivo časté návraty do <b>'+col+'</b>.');
const doz=raDozName(s10.topDoz);
let sameDoz=0;
slice.forEach(n=>{if(dozenIndexForNum(n)===s10.topDoz)sameDoz++;});
if(sameDoz>=Math.min(8,slice.length*0.55))lines.push('Podozrivo silný tlak na <b>'+doz+'</b> — wheel sa k nemu vracia príliš pravidelne.');
return lines.length?lines.join(' '):null;
}

function raPatience(pat,newFlow,watchLine){
if(watchLine)return'AI zatiaľ čaká na potvrdenie nového flow — trpezlivo sleduje, bez tvrdení.';
if(newFlow&&pat.rate<68)return'AI zatiaľ čaká na potvrdenie nového flow — ešte chýbajú 3–5 potvrdzujúce spiny.';
if(pat.rate>=55&&pat.rate<68)return'AI zatiaľ čaká — pattern je sľubný, ale nie je ešte uzavretý.';
return'';
}

function raSelfCriticism(pat,mode,prev){
const lines=[];
if(mode==='DEAD_SPIN'||pat.rate<RA_PATTERN_WARN){
lines.push('AI posledné spiny nečítala stabilne — flow sa správa nepredvídateľne.');
lines.push('AI patterny posledných spinov stratili kontinuitu.');
}else if(pat.rate<60){
lines.push('AI priznáva: posledná interpretácia bola slabšia — session sa rýchlo mení.');
}
if(prev&&prev.patRate>=65&&pat.rate<prev.patRate-15){
lines.push('AI sa kriticky pozerá späť — dôvera v vlastné čítanie flow klesla oproti predchádzajúcemu spinu.');
}
return lines.join(' ');
}

function raSurprise(flowChange,prev,slice,s10,colRet){
const out=[];
if(flowChange)out.push('<b>AI ALERT:</b> '+flowChange);
if(prev&&prev.last!=null&&slice.length>=2){
const broke=columnIndexForNum(prev.last),now=columnIndexForNum(slice[slice.length-1]);
if(broke>=0&&now>=0&&broke!==now&&s10){
const longRun=persistenceEngine.columnLife[broke]||0;
if(longRun>=4)out.push('<b>AI ALERT:</b> '+raColName(now)+' prvýkrát prerušil dlhý návratový flow v '+raColName(broke)+'.');
}
}
if(colRet.trials>=4&&colRet.rate>=62&&prev&&prev.patRate<50){
out.push('<b>AI ALERT:</b> Náhle sa objavil čitateľný návratový rytmus — toto je prekvapenie oproti predchádzajúcemu chaosu.');
}
return out.length?out.join(' '):null;
}

function raSessionFlowHistory(s25,s50){
if(spins.length<6)return'Od začiatku session ešte nie je dosť dát.';
const all=spins.slice();
const early=all.slice(0,Math.min(12,all.length));
const dozEarly=[0,0,0],colEarly=[0,0,0];
early.forEach(n=>{
if(n===0)return;
const di=dozenIndexForNum(n),ci=columnIndexForNum(n);
if(di>=0)dozEarly[di]++;
if(ci>=0)colEarly[ci]++;
});
const topD=dozEarly.indexOf(Math.max(...dozEarly));
const topC=colEarly.indexOf(Math.max(...colEarly));
let h='Od začiatku session ('+all.length+' spinov): ';
h+='<b>'+raDozName(topD)+'</b> drží dominantný návratový flow';
if(s50&&s25&&s50.topDoz!==s25.topDoz)h+=', no v posledných 25 sa posúva '+raDozName(s25.topDoz);
h+=' · stĺpce: '+raColName(topC);
if(s50)h+=' (dlhodobo '+raColName(s50.topCol)+')';
h+='.';
return h;
}

function raTrendFatigueFromStart(baseline,colorSt,weakFollow,s10){
if(!baseline||!s10)return'';
const lines=[];
if(baseline.color&&colorSt.len>=3){
const startDom=baseline.color;
if(startDom===colorSt.color&&weakFollow){
lines.push('AI vidí, že <b>'+colorSt.color+'</b> flow už stráca silu oproti začiatku session.');
}else if(startDom!==colorSt.color){
lines.push('Od začiatku viedla <b>'+startDom+'</b>, teraz tlačí skôr <b>'+colorSt.color+'</b> — trend sa prerodil.');
}
}
if(baseline.topCol!==undefined&&baseline.topCol!==s10.topCol){
lines.push('Dominantný stĺpec sa od začiatku session posunul z '+raColName(baseline.topCol)+' na '+raColName(s10.topCol)+'.');
}
return lines.join(' ');
}

function raPrepareNote(newFlow,pat,watchLine){
if(!newFlow&&pat.rate<55)return'';
if(newFlow&&pat.rate>=50)return'AI vidí formovanie nového flow, ale ešte čaká na potvrdenie — priprav sa sledovať, nie hrať.';
if(watchLine)return'';
if(pat.rate>=52&&pat.rate<65)return'AI vidí prvé znaky nového flow — zatiaľ len pozorovanie.';
return'';
}

function raFlowIntuition(slice,s10){
if(slice.length<5||!s10)return'';
let regularRet=0;
for(let i=2;i<Math.min(slice.length,16);i++){
const a=columnIndexForNum(slice[i-2]),b=columnIndexForNum(slice[i-1]),c=columnIndexForNum(slice[i]);
if(a>=0&&b>=0&&c>=0&&b!==a&&c===a)regularRet++;
}
if(regularRet>=4)return'AI má pocit, že wheel sa momentálne vracia príliš pravidelne do <b>'+raColName(s10.topCol)+'</b>.';
const mig=getWheelMigrationDirection();
if(mig.dir==='MIX')return'AI má pocit, že wheel sa zasekáva medzi smermi — intuícia hovorí o rozpadávajúcom flow.';
return'AI má pocit, že wheel „dýcha“ — krátke návraty striedajú s menšími skokmi.';
}

function raMemoryConflictDeep(s5,s10,s25,s50){
if(!s5||!s10)return null;
if(s50&&s5.topCol!==s50.topCol){
return'Konflikt pamäte: krátkodobý flow favorizuje <b>'+raColName(s5.topCol)+'</b>, ale dlhodobá pamäť session stále drží návraty do <b>'+raColName(s50.topCol)+'</b>.';
}
if(s25&&s5.topDoz!==s25.topDoz){
return'Konflikt pamäte: krátkodobo tlačí <b>'+raDozName(s5.topDoz)+'</b>, no od začiatka session dominuje skôr <b>'+raDozName(s25.topDoz)+'</b>.';
}
if(s10&&s5.topCol!==s10.topCol){
return'Konflikt pamäte: posledných 5 spinov iný stĺpec než okno 10 — pamäť sa ešte nezhodla.';
}
return null;
}

function raSessionQuality(mode,pat,oscCol){
if(mode==='DEAD_SPIN')return{label:'SLABÁ',cls:'ra-q-weak',desc:'Session je ťažko čitateľná.'};
if(mode==='WARNING'||pat.rate<55)return{label:'SLABÁ',cls:'ra-q-weak',desc:'Kvalita session je slabá — veľa šumu.'};
if(pat.rate>=72&&oscCol<50)return{label:'ČITATEĽNÁ',cls:'ra-q-read',desc:'Session je čitateľná — flow dáva zmysel.'};
if(oscCol>=55&&pat.rate<65)return{label:'CHAOTICKÁ',cls:'ra-q-chaos',desc:'Session je čitateľná len čiastočne.'};
if(pat.rate>=65&&oscCol<45)return{label:'RYTMICKÁ',cls:'ra-q-rhythm',desc:'Koleso vytvára rytmický flow bez prudkých breakoutov.'};
return{label:'NEISTÁ',cls:'ra-q-chaos',desc:'Session sa ešte formuje.'};
}

function raInternalOpinion(mode,pat,colorSt,colRet,newFlow){
if(mode==='DEAD_SPIN')return'AI by zatiaľ vôbec nešla agresívne — session nemá zmysel na vstup.';
if(newFlow&&pat.rate<65)return'AI momentálne viac verí pozorovaniu než breakout-u — nový flow ešte nie je potvrdený.';
if(colRet.rate>=58&&pat.rate>=65)return'AI momentálne viac verí návratovému flow než prudkému breakout-u.';
if(colorSt.len>=5&&colorSt.color==='červená')return'AI by zatiaľ nešla agresívne proti červenému flow — radšej čaká na korekciu alebo potvrdenie.';
if(colorSt.len>=5&&colorSt.color==='čierna')return'AI by zatiaľ nešla agresívne proti čiernemu flow — streak je dlhý, ale follow-up slabne.';
if(pat.rate>=60)return'AI by zatiaľ išla opatrne — flow drží, ale bez tvrdení.';
return'AI nemá ešte vnútorný názor — potrebuje viac spinov.';
}

function raPatternRateOnSlice(slice){
const colRet=raReturnHits(slice,'col'),dozRet=raReturnHits(slice,'doz');
const rates=[];
if(colRet.trials>=3)rates.push(colRet.rate);
if(dozRet.trials>=3)rates.push(dozRet.rate);
return rates.length?Math.round(rates.reduce((a,b)=>a+b,0)/rates.length):50;
}

function raFlowStrength(pat,colorSt,colRet,behaviorId){
if(behaviorId==='DEAD_SPIN')return{label:'SLABÁ',cls:'ra-fs-weak'};
let score=pat.rate*0.45+(colorSt.len>=4?18:0)+(colRet.rate>=50?colRet.rate*0.35:0);
if(score>=72)return{label:'SILNÁ',cls:'ra-fs-strong'};
if(score>=52)return{label:'STREDNÁ',cls:'ra-fs-mid'};
return{label:'SLABÁ',cls:'ra-fs-weak'};
}

function raBehaviorMode(baseMode,pat,oscCol,newFlow,colRet,colorSt,watchLine,slice){
if(baseMode==='DEAD_SPIN')return{id:'DEAD_SPIN',label:skRaModeLabel('DEAD_SPIN'),cls:'ra-mode-dead'};
if(slice.length>=2&&slice[slice.length-1]===slice[slice.length-2]&&slice[slice.length-1]!==0){
return{id:'ANOMALY',label:skRaModeLabel('ANOMALY'),cls:'ra-mode-anomaly'};
}
if(colRet.rate>=58&&oscCol<48&&pat.rate>=55)return{id:'REVERSAL',label:skRaModeLabel('REVERSAL'),cls:'ra-mode-reversal'};
if(newFlow&&pat.rate<68)return{id:'BREAKOUT',label:skRaModeLabel('BREAKOUT'),cls:'ra-mode-breakout'};
if(baseMode==='WARNING')return{id:'WARNING',label:skRaModeLabel('WARNING'),cls:'ra-mode-warning'};
if(watchLine||pat.rate<65)return{id:'OBSERVATION',label:skRaModeLabel('OBSERVATION'),cls:'ra-mode-observe'};
if(pat.rate>=72&&oscCol<50)return{id:'FLOW',label:skRaModeLabel('FLOW'),cls:'ra-mode-flow'};
return{id:'OBSERVATION',label:skRaModeLabel('OBSERVATION'),cls:'ra-mode-observe'};
}

function raSessionPersonalityMemory(profile){
if(!profile||spins.length<15)return null;
const recent=spins.slice(-15);
const recentOsc=raOscillationScore(recent,'col');
const recentPat=raPatternRateOnSlice(recent);
if(profile.osc>=58&&recentOsc<=44&&recentPat>=58){
return'Pamäť osobnosti session: začiatok bol veľmi chaotický, ale posledných 15 spinov začína vytvárať stabilnejší flow.';
}
if(profile.osc<=42&&recentOsc>=56){
return'Pamäť osobnosti session: začiatok bol čitateľný, no posledných 15 spinov session rozpadá do chaosu.';
}
if(profile.pat>=65&&recentPat<profile.pat-14){
return'Pamäť osobnosti session: na začiatku silnejší pattern ('+profile.label+'), teraz flow stráca kontinuitu.';
}
if(profile.pat<55&&recentPat>=profile.pat+15){
return'Pamäť osobnosti session: začiatok bol '+profile.label+', no posledných 15 spinov sa flow pomaly číta lepšie.';
}
return'Pamäť osobnosti session: od začiatku '+profile.label+' — AI túto session už pozná ('+spins.length+' spinov).';
}

function raFalseFlow(s5,pat,colRet,newFlow){
if(!newFlow||!s5)return null;
if(pat.rate<58||colRet.rate<50){
return'AI zatiaľ neverí novému trendu <b>'+raColName(s5.topCol)+'</b>. Flow pôsobí skôr ako krátkodobý breakout.';
}
if(pat.rate<65){
return'AI zatiaľ neverí novému trendu — vyzerá silno, ale pamäť patternov ešte nedrží.';
}
return null;
}

function raDeepIntuition(slice,s10){
if(!s10||slice.length<6)return'';
let samePoint=0;
const target=s10.topCol;
for(let i=1;i<slice.length;i++){
const a=columnIndexForNum(slice[i-1]),b=columnIndexForNum(slice[i]);
if(a===target&&b===target)samePoint++;
}
if(samePoint>=3)return'AI má pocit, že wheel sa príliš často vracia do rovnakého flow bodu (<b>'+raColName(target)+'</b>).';
return raFlowIntuition(slice,s10);
}

function raGradualFlowEvolution(slice){
if(slice.length<12)return null;
const a=slice.slice(-12,-6),b=slice.slice(-6);
const oscA=raOscillationScore(a,'col'),oscB=raOscillationScore(b,'col');
const patA=raPatternRateOnSlice(a),patB=raPatternRateOnSlice(b);
if(patB>=patA+12&&oscB<=oscA-8)return'Flow sa posledných 6 spinov pomaly stabilizuje.';
if(patB<=patA-12)return'Flow sa posledných 6 spinov pomaly rozpadá — AI to číta ako postupný úpadok.';
if(oscB<oscA-10)return'Posledných 6 spinov: menej chaotický pohyb stĺpcov, wheel sa upokojuje.';
if(oscB>oscA+12)return'Posledných 6 spinov: chaos stĺpcov rastie oproti predchádzajúcim 6.';
return null;
}

function raSpinSurprise(prev,slice,s10){
if(!prev||!s10||slice.length<2)return null;
const last=slice[slice.length-1],ci=columnIndexForNum(last);
if(ci<0||prev.last==null)return null;
const prevCi=columnIndexForNum(prev.last);
if(ci===s10.topCol&&prevCi!==ci&&prev.s5&&prev.s5.topCol!==ci){
return'AI neočakávala tak rýchly návrat do <b>'+raColName(ci)+'</b> — wheel skočil späť skôr, než analytik čakal.';
}
if(prev.patRate<50&&raPatternRateOnSlice(slice.slice(-6))>=62){
return'AI neočakávala tak rýchle ustálenie flow — chaos sa zmenil na čitateľný rytmus v pár spinoch.';
}
return null;
}

function raSuccessMemory(pat,prev){
const fs=adaptiveWeights.failStreak;
if(fs>=3)return'AI flow posledných spinov momentálne nevychádza stabilne — vnútorná pamäť úspešnosti je opatrná.';
if(prev&&prev.patRate>=65&&pat.rate<prev.patRate-12){
return'AI flow posledných spinov momentálne nevychádza stabilne — patterny stratili kontinuitu.';
}
if(pat.rate>=68&&fs<=1)return'AI si pamätá: posledné čítanie flow sedelo — drží pokojný, konzistentný tón.';
return'';
}

function raFlowTension(colRet,newFlow,s5,s50,memoryConflictDeep){
if(memoryConflictDeep)return'AI cíti rastúce napätie medzi návratovým flow a breakout trendom — pamäť sa nezhoduje.';
if(colRet.rate>=55&&newFlow&&s50&&s5&&s5.topCol!==s50.topCol){
return'AI cíti rastúce napätie medzi návratovým flow a breakout trendom.';
}
return null;
}

const RA_SILENCE_MSG='AI zatiaľ nevidí nič dostatočne silné na výrazný flow záver.';

function raStripHtml(s){return(s||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();}

function raPickMainInsight(ctx){
if(ctx.baseMode==='DEAD_SPIN'||ctx.mode==='DEAD_SPIN'){
return{main:'Session prešla do mŕtvych spinov.',tier:3,alert:true};
}
if(ctx.mode==='ANOMALY'){
return{main:'Brutálna anomália na wheeli — flow sa môže okamžite zlomiť.',tier:3,alert:true};
}
if(ctx.strongAlert){
return{main:raStripHtml(ctx.strongAlert),tier:3,alert:true};
}
if(ctx.spinSurprise){
return{main:raStripHtml(ctx.spinSurprise),tier:3,alert:true};
}
if(ctx.surprise){
return{main:raStripHtml(ctx.surprise).replace(/^AI ALERT:\s*/i,''),tier:3,alert:true};
}
if(ctx.falseFlow){
return{main:raStripHtml(ctx.falseFlow),tier:3,alert:true};
}
if(ctx.suspicious&&ctx.colRet&&ctx.colRet.rate>=55){
return{main:raStripHtml(ctx.suspicious),tier:3,alert:true};
}
if(ctx.flowTension){
return{main:raStripHtml(ctx.flowTension),tier:2,alert:false};
}
if(ctx.memoryConflictDeep){
return{main:raStripHtml(ctx.memoryConflictDeep),tier:2,alert:false};
}
if(ctx.weakFollow&&ctx.colorSt&&ctx.colorSt.len>=4){
const c=ctx.colorSt.color;
return{main:(c==='červená'?'Červený':'Čierny')+' flow začína byť preťažený.',tier:2,alert:false};
}
if(ctx.s10&&ctx.colRet&&ctx.colRet.rate>=55&&ctx.colRet.trials>=4){
return{main:raColName(ctx.s10.topCol)+' stále absorbuje návraty flow.',tier:2,alert:false};
}
if(ctx.mode==='BREAKOUT'&&ctx.s10){
return{main:'Nový breakout smerom k '+raColName(ctx.s10.topCol)+' — AI ešte neverí trendu.',tier:2,alert:false};
}
if(ctx.mode==='REVERSAL'&&ctx.s10){
return{main:'Návratový flow v '+raColName(ctx.s10.topCol)+' sa opäť aktivoval.',tier:2,alert:false};
}
if(ctx.newFlow&&ctx.s10){
return{main:'Rodí sa nový flow okolo '+raColName(ctx.s10.topCol)+' — čakám na potvrdenie.',tier:2,alert:false};
}
if(ctx.pat&&ctx.pat.rate>=68&&ctx.colorSt&&ctx.colorSt.len>=3){
const c=ctx.colorSt.color;
return{main:(c==='červená'?'Červený':'Čierny')+' flow drží momentum — session sa číta.',tier:2,alert:false};
}
if(ctx.fatigue&&ctx.fatigue[0]&&ctx.pat&&ctx.pat.rate>=62){
return{main:raStripHtml(ctx.fatigue[0]),tier:2,alert:false};
}
return{main:null,tier:0,alert:false};
}

function raResolveNarrative(ctx,liveFeed){
const picked=raPickMainInsight(ctx);
if(picked.main){
let sub=null;
if(!picked.alert&&liveFeed.primary.length){
sub=raStripHtml(liveFeed.primary[0].text);
if(sub&&sub.length>100)sub=sub.slice(0,100)+'…';
if(sub===picked.main)sub=null;
}
return{
mainInsight:picked.main,
mainTier:picked.tier,
mainAlert:picked.alert,
subNote:sub,
isSilent:false,
silenceMsg:null
};
}
if(ctx.baseMode==='DEAD_SPIN'){
return{mainInsight:'Session prešla do mŕtvych spinov.',mainTier:3,mainAlert:true,subNote:null,isSilent:false,silenceMsg:null};
}
return{mainInsight:null,mainTier:0,mainAlert:false,subNote:null,isSilent:true,silenceMsg:RA_SILENCE_MSG};
}

function raFormatImportance(text,level){
if(!text)return'';
if(level>=3)return'<div class="ra-strong-alert"><b>SILNÝ ALERT:</b> '+text.replace(/<b>SILNÝ ALERT:<\/b>\s*/i,'').replace(/<b>AI ALERT:<\/b>\s*/i,'')+'</div>';
if(level===2)return text;
return'<span class="ra-dim">'+text+'</span>';
}

function raVoiceLine(text,kind){
if(!text)return'';
if(kind==='feel'&&!/^AI má pocit/i.test(text)&&!/^AI cíti/i.test(text)){
return'AI má pocit, že '+text.charAt(0).toLowerCase()+text.slice(1);
}
return text;
}

function raBuildLiveFeed(ctx){
const feed=[];
const push=(text,priority)=>{if(text)feed.push({text,priority});};
if(ctx.strongAlert)push(ctx.strongAlert,3);
if(ctx.surprise)push(ctx.surprise,3);
if(ctx.spinSurprise)push(ctx.spinSurprise,3);
if(ctx.falseFlow)push(ctx.falseFlow,3);
if(ctx.sessionMemory)push(ctx.sessionMemory,2);
if(ctx.flowTension)push(ctx.flowTension,2);
if(ctx.wheelFeel)push(ctx.wheelFeel,2);
if(ctx.sessionVibe)push(ctx.sessionVibe,2);
if(ctx.deepIntuition)push(ctx.deepIntuition,2);
if(ctx.gradualEvolution)push(ctx.gradualEvolution,2);
if(ctx.prepareNote)push('<b>Priprav sa:</b> '+ctx.prepareNote,2);
if(ctx.innerOpinion)push(ctx.innerOpinion,2);
if(ctx.memoryConflictDeep)push(ctx.memoryConflictDeep,2);
else if(ctx.conflict)push(ctx.conflict,2);
if(ctx.flowChange)push('<b>Zmena flow:</b> '+ctx.flowChange,2);
if(ctx.selfCrit)push(ctx.selfCrit,2);
if(ctx.successMemory)push(ctx.successMemory,2);
if(ctx.suspicious)push(ctx.suspicious,2);
if(ctx.randomVsPat)push(ctx.randomVsPat,1);
if(ctx.patience)push(ctx.patience,1);
if(ctx.trendFatigueStart)push(ctx.trendFatigueStart,1);
if(ctx.flowHistory)push(ctx.flowHistory,1);
if(ctx.positiveNote)push('<span class="greenTxt">'+ctx.positiveNote+'</span>',1);
ctx.fatigue.forEach(t=>push(t,1));
ctx.hidden.slice(0,1).forEach(t=>push(t,1));
feed.sort((a,b)=>b.priority-a.priority);
const strong=feed.filter(f=>f.priority>=3).slice(0,1);
const primary=feed.filter(f=>f.priority===2).slice(0,4);
const secondary=feed.filter(f=>f.priority===1).slice(0,2);
return{strong,primary,secondary,feed};
}

function rbaStreakLen(slice,pred){
if(!slice.length)return{len:0,what:'—'};
const last=slice[slice.length-1];
if(last===0&&!pred(last,last))return{len:0,what:'—'};
let len=1;
for(let i=slice.length-2;i>=0;i--){
const n=slice[i];
if(n===0)break;
if(pred(n,last))len++;else break;
}
return{len,what:pred(last,last)?String(last):'—'};
}
function rbaColStreak(slice){
const lastCi=columnIndexForNum(slice[slice.length-1]);
if(lastCi<0)return{len:0,what:'—'};
return rbaStreakLen(slice,n=>{const c=columnIndexForNum(n);return c>=0&&c===lastCi;});
}
function rbaDozStreak(slice){
const lastDi=dozenIndexForNum(slice[slice.length-1]);
if(lastDi<0)return{len:0,what:'—'};
return rbaStreakLen(slice,n=>{const d=dozenIndexForNum(n);return d>=0&&d===lastDi;});
}
function rbaWeightedBins(field){
const bins=field==='col'?[0,0,0]:[0,0,0];
RA_MEMORY_WINDOWS.forEach(w=>{
if(spins.length<w)return;
const st=raSliceStats(w);
if(!st)return;
const arr=field==='col'?st.cols:st.doz;
const wt=RBA_WIN_WEIGHT[w]||.2;
arr.forEach((v,i)=>{bins[i]+=v*wt;});
});
return bins;
}
function rbaTopTwoLabels(bins,namer){
const order=[0,1,2].sort((a,b)=>bins[b]-bins[a]);
const t1=namer(order[0]),t2=namer(order[1]);
return t1===t2?t1:t1+' · '+t2;
}
function rbaSuppressionLines(slice){
const out=[];
const last20=slice.slice(-20).filter(n=>n!==0);
[0,1,2].forEach(i=>{
const hit=last20.some(n=>(columnIndexForNum(n))===i);
if(!hit&&last20.length>=12)out.push(raColName(i)+' je potlačený — RNG ho ignoruje (nie „musí prísť“).');
});
[0,1,2].forEach(i=>{
const hit=last20.some(n=>(dozenIndexForNum(n))===i);
if(!hit&&last20.length>=12)out.push(raDozName(i)+' chýba v okne — suppression flow.');
});
return out.slice(0,2);
}
function rbaChaosIndex(oscCol,oscDoz,pat,mig){
let c=Math.round((oscCol+oscDoz)/2);
if(pat.rate<55)c+=12;
if(mig&&mig>=3)c+=8;
return Math.min(100,c);
}
function rbaChaosTag(c){
if(c>=78)return{level:'EXTREME',label:'EXTREME',cls:'redTxt'};
if(c>=62)return{level:'HIGH',label:'HIGH',cls:'redTxt'};
if(c>=45)return{level:'MEDIUM',label:'MEDIUM',cls:'yellowTxt'};
return{level:'LOW',label:'LOW',cls:'greenTxt'};
}
function rbaFlowStateId(pat,oscCol,colorSt,chaos,mode){
if(mode==='DEAD')return{ id:'DEAD',label:'DEAD FLOW',cls:'ra-mode-dead'};
if(chaos.level==='EXTREME'||chaos.level==='HIGH')return{ id:'CHAOTIC',label:'CHAOTIC FLOW',cls:'ra-mode-warning'};
if(pat.rate<RA_PATTERN_WARN)return{ id:'COLLAPSING',label:'COLLAPSING FLOW',cls:'ra-mode-dead'};
if(oscCol>=62)return{ id:'ALTERNATING',label:'ALTERNATING FLOW',cls:'ra-mode-reversal'};
if(colorSt.len>=4||pat.rate>=70)return{ id:'REPEAT',label:skUiLabel('REPEAT FLOW'),cls:'ra-mode-flow'};
if(oscCol>=48&&oscCol<62)return{ id:'MIGRATING',label:'MIGRATING FLOW',cls:'ra-mode-breakout'};
if(pat.rate>=68)return{ id:'STABLE',label:'STABLE FLOW',cls:'ra-mode-flow'};
return{ id:'AGGRESSIVE',label:'AGGRESSIVE FLOW',cls:'ra-mode-breakout'};
}
function rbaSessionMood(pat,chaos,colorSt,oscCol){
if(chaos.level==='EXTREME')return{ id:'CHAOTIC',label:'CHAOTIC',cls:'redTxt'};
if(chaos.level==='HIGH')return{ id:'NERVOUS',label:'NERVOUS',cls:'yellowTxt'};
if(colorSt.len>=6)return{ id:'OVERHEATED',label:'OVERHEATED',cls:'yellowTxt'};
if(pat.rate>=72&&oscCol<45)return{ id:'CALM',label:'CALM',cls:'greenTxt'};
if(pat.rate<55)return{ id:'UNSTABLE',label:'UNSTABLE',cls:'redTxt'};
if(oscCol>=55)return{ id:'AGGRESSIVE',label:'AGGRESSIVE',cls:'yellowTxt'};
return{ id:'PASSIVE',label:'PASSIVE',cls:'yellowTxt'};
}
function rbaFlowHealth(pat,chaos,mode){
if(mode==='DEAD'||pat.rate<50)return{ label:'DEAD',cls:'ra-fs-weak'};
if(chaos.level==='HIGH'||chaos.level==='EXTREME')return{ label:'COLLAPSING',cls:'ra-fs-weak'};
if(pat.rate<62)return{ label:'WEAKENING',cls:'ra-fs-weak'};
if(pat.rate>=72)return{ label:'STABLE',cls:'ra-fs-strong'};
if(pat.rate>=58)return{ label:'BUILDING',cls:'ra-fs-mid'};
return{ label:'WEAKENING',cls:'ra-fs-weak'};
}
function rbaEdgeStatus(pat,chaos,wait){
if(wait)return{ label:'NO EDGE',cls:'redTxt'};
if(chaos.level==='HIGH'||chaos.level==='EXTREME'||pat.rate<55)return{ label:'NO EDGE',cls:'redTxt'};
if(pat.rate>=75)return{ label:'STRONG EDGE',cls:'greenTxt'};
if(pat.rate>=68)return{ label:'MEDIUM EDGE',cls:'yellowTxt'};
if(pat.rate>=60)return{ label:'LOW EDGE',cls:'yellowTxt'};
return{ label:'NO EDGE',cls:'redTxt'};
}
function rbaBehaviorPicks(s5,s10,slice,colorSt){
const colBins=rbaWeightedBins('col'),dozBins=rbaWeightedBins('doz');
const columns=rbaTopTwoLabels(colBins,raColName);
const dozens=rbaTopTwoLabels(dozBins,raDozName);
let color='—';
if(s5&&s10){
const shortDom=s5.redPct>=s5.blackPct?'červená':'čierna';
const longDom=s10.redPct>=s10.blackPct?'červená':'čierna';
if(colorSt.len>=4&&shortDom===colorSt.color){
color=(shortDom==='červená'?'čierna':'červená')+' (korekcia tlaku)';
}else color=longDom+' (flow)';
}
let size='—',parity='—';
if(s10){
size=s10.highPct>=58?'VEĽKÉ':s10.lowPct>=58?'MALÉ':'MALÉ / VEĽKÉ — neutrál';
parity=s10.evenPct>=58?'PÁRNE':s10.oddPct>=58?'NEPÁRNE':'PÁRNE / NEPÁRNE — neutrál';
}
return{ dozens, columns, color, size, parity };
}
function rbaObserveInsight(n){
const msgs=[
'Zbieram dáta — flow ešte nie je stabilný.',
'Potrebujem viac spinov pred behavior úsudkom.',
'Session ešte nemá dostatočný behavior obraz.',
'Sledujem RNG — reálne hodnotenia od '+RBA_FULL_MIN+'. spinu.'
];
return msgs[n%msgs.length];
}
function rbaSelfSuccessRate(){
if(rbaSelfEvalHits.length<4)return 70;
return Math.round(rbaSelfEvalHits.reduce((a,b)=>a+b,0)/rbaSelfEvalHits.length*100);
}
function rbaLogSession(evt){
rbaSessionLog.push({spin:spins.length,evt,ts:Date.now()});
if(rbaSessionLog.length>40)rbaSessionLog.shift();
}
function rbaDominanceShare(st){
if(!st)return 0;
const arr=st.cols||[0,0,0];
const t=arr.reduce((a,b)=>a+b,0);
return t?Math.round(Math.max(...arr)/t*100):0;
}
function rbaFlowDNA(ctx){
const{pat,oscCol,oscDoz,colorSt,colSt,dozSt,chaos,s10,s5,slice}=ctx;
const scores={
CLEAN:0,STICKY:0,HEAVY:0,TOXIC:0,FAST_SWITCH:0,CHAOTIC:0,COLD:0,OVERHEATED:0
};
if(chaos.level==='EXTREME'||chaos.level==='HIGH'){scores.CHAOTIC+=40;scores.TOXIC+=25;}
if(oscCol>=62){scores.FAST_SWITCH+=35;scores.TOXIC+=10;}
if(colSt.len>=4||colorSt.len>=4){scores.STICKY+=30;scores.HEAVY+=15;}
if(colorSt.len>=6||colSt.len>=6){scores.OVERHEATED+=40;}
if(pat.rate>=72&&oscCol<42&&chaos.level==='LOW'){scores.CLEAN+=38;}
if(pat.rate>=65&&oscCol<50&&(colSt.len>=3||colorSt.len>=3))scores.STICKY+=22;
if(s10&&rbaDominanceShare(s10)>=48)scores.HEAVY+=28;
if(pat.rate<55&&chaos.level!=='LOW'){scores.TOXIC+=30;scores.CHAOTIC+=15;}
if(pat.rate>=50&&pat.rate<62&&oscCol<40&&colorSt.len<3)scores.COLD+=32;
if(oscDoz>=58)scores.FAST_SWITCH+=12;
const top=Object.keys(scores).sort((a,b)=>scores[b]-scores[a])[0];
const reasons={
CLEAN:'Flow je čistý a stabilný bez agresívneho switching.',
STICKY:'RNG drží sticky repeat — dominancia sa lepí na rovnaký sektor.',
HEAVY:'Session má ťažký dominance flow — jeden sektor tlačí dlho.',
TOXIC:'RNG vytvára toxický chaotic flow — štruktúra je nezdravá.',
FAST_SWITCH:'Rýchle prepínanie medzi stĺpcami — nervózny switching charakter.',
CHAOTIC:'Chaotická osobnosť flowu — RNG odmieta stabilnú štruktúru.',
COLD:'Pokojný cold flow — nízka intenzita, málo agresívnych patternov.',
OVERHEATED:'Session pôsobí prehriato po dlhom repeat momentum.'
};
return{type:top,label:top.replace(/_/g,' '),score:scores[top],reason:reasons[top]||'Flow DNA sa profiluje.'};
}
function rbaFlowFatigueEngine(ctx){
const{colSt,dozSt,colorSt,pat,s10,slice}=ctx;
const lines=[];
let score=0;
const domLen=Math.max(colSt.len,dozSt.len,colorSt.len);
if(domLen>=5){score+=22;lines.push((colSt.len>=dozSt.len?raColName(s10?s10.topCol:0):raDozName(s10?s10.topDoz:0))+' už pôsobí vyčerpane.');}
if(colorSt.len>=6){score+=18;lines.push('Repeat flow stráca energiu — '+colorSt.color+' streak je preťažený.');}
if(domLen>=4&&pat.rate<68){score+=14;lines.push('Dominancia začína byť preťažená.');}
if(pat.rate>=70&&domLen>=4)lines.push('Momentum slabne po agresívnom streaku.');
const weak=raFollowUpWeakness(slice);
if(weak){score+=16;lines.push(weak+' flow už nedrží rovnaký tlak.');}
return{score:Math.min(100,score),tired:score>=28,lines:lines.slice(0,2)};
}
function rbaFalseFlowDetector(ctx){
const{pat,colSt,chaos,colRet,s5,s10,oscCol}=ctx;
let fake=false,reason='';
if(pat.rate>=62&&pat.rate<70&&colSt.len<3&&oscCol>=48){
fake=true;reason='Flow síce vyzerá stabilne, ale nemá dostatočnú momentum podporu.';
}else if(colSt.len>=2&&colSt.len<=3&&colRet.rate<52){
fake=true;reason='Dominancia je príliš krátka na dôveryhodný edge.';
}else if(pat.rate>=65&&chaos.level!=='LOW'&&colRet.rate<55){
fake=true;reason='RNG vytvára falošný repeat pattern — chaotic support pod povrchom.';
}else if(s5&&s10&&s5.topCol===s10.topCol&&pat.rate<60){
fake=true;reason='Povrchová stabilita bez reálnej štruktúry v pattern pamäti.';
}
return{fake,reason};
}
function rbaFlowRecoveryDetector(ctx,prev){
if(!prev||ctx.phase==='OBSERVE')return{active:false,reason:''};
const chaosDrop=prev.chaosLevel&&ctx.chaos.level!=='HIGH'&&ctx.chaos.level!=='EXTREME'&&(prev.chaosLevel==='HIGH'||prev.chaosLevel==='EXTREME');
const patUp=ctx.pat.rate>=58&&prev.patRate<55;
const oscDown=ctx.oscCol<52&&prev.oscCol>=58;
if(chaosDrop&&patUp){
return{active:true,reason:'Po chaotic phase začína vznikať nový repeat flow.'};
}
if(oscDown&&ctx.pat.rate>=55){
return{active:true,reason:'RNG sa po nestabilnom switching znovu upokojuje.'};
}
if(patUp&&ctx.chaos.level==='LOW'){
return{active:true,reason:'Session sa pomaly vracia do stabilného flowu.'};
}
return{active:false,reason:''};
}
function rbaSessionTemperature(ctx){
const{pat,chaos,colorSt,colSt,oscCol,mig}=ctx;
let score=50;
if(chaos.level==='EXTREME')score=95;
else if(chaos.level==='HIGH')score=82;
else if(colorSt.len>=6||colSt.len>=6)score=78;
else if(pat.rate>=72&&oscCol<45)score=42;
else if(pat.rate<55)score=38;
else if(oscCol>=60)score=72;
if(mig>=3)score+=8;
let level='WARM',line='Session je teplá — stredná intenzita RNG.';
if(score>=90){level='CHAOTIC';line='RNG je v chaotic teplote — nestabilná session.';}
else if(score>=82){level='BURNING';line='RNG vytvára burning momentum.';}
else if(score>=70){level='OVERHEATED';line='Session je momentálne prehrievaná.';}
else if(score>=58){level='HOT';line='Flow je horúci — agresívnejší behavior.';}
else if(score<40){level='COLD';line='Flow zostáva pokojný a cold.';}
return{level,score,line};
}
function rbaFlowPressureSystem(ctx){
const{pat,oscCol,chaos,colSt,colorSt,suppression,colRet}=ctx;
const repeatP=Math.min(100,(colSt.len+colorSt.len)*12+Math.max(0,pat.rate-50));
const reversalP=Math.min(100,oscCol+(pat.rate<60?18:0)+(ctx.health&&ctx.health.label==='WEAKENING'?15:0));
const chaosP=chaos.level==='EXTREME'?92:chaos.level==='HIGH'?78:chaos.level==='MEDIUM'?48:22;
const domShare=ctx.s10?rbaDominanceShare(ctx.s10):0;
const dominanceP=Math.min(100,domShare+(colSt.len>=4?18:0));
const suppressionP=Math.min(100,(suppression?suppression.length:0)*35+(colRet.rate<50?20:0));
const pressures=[
{key:'REPEAT',val:repeatP,line:repeatP>=60?'Repeat pressure zostáva silný.':''},
{key:'REVERSAL',val:reversalP,line:reversalP>=58?'Reversal pressure začína rásť.':''},
{key:'CHAOS',val:chaosP,line:chaosP>=65?'Chaos pressure prekrýva dominanciu.':''},
{key:'DOMINANCE',val:dominanceP,line:dominanceP>=62?'Dominance pressure drží session v jednom pásme.':''},
{key:'SUPPRESSION',val:suppressionP,line:suppressionP>=50?'Suppression pressure — RNG ignoruje časti wheelu.':''}
];
pressures.sort((a,b)=>b.val-a.val);
const collapseRisk=chaosP>=70&&dominanceP>=55&&reversalP>=55;
return{dominant:pressures[0].key,top:pressures[0],collapseRisk,lines:pressures.filter(p=>p.line).map(p=>p.line).slice(0,2)};
}
function rbaRngStabilityIndex(ctx){
const{oscCol,oscDoz,pat,colSt,chaos,colorSt}=ctx;
let idx=70;
idx-=Math.round((oscCol+oscDoz)/6);
idx+=Math.min(20,pat.rate-50);
idx-=colSt.len>=6?15:0;
if(chaos.level==='HIGH')idx-=22;
if(chaos.level==='EXTREME')idx-=35;
if(colorSt.len>=5&&pat.rate>=65)idx-=8;
idx=clamp(idx,0,100);
let label='STABLE';
if(idx>=78)label='VERY STABLE';
else if(idx>=58)label='STABLE';
else if(idx>=38)label='UNSTABLE';
else label='HIGHLY CHAOTIC';
return{index:idx,label};
}
function rbaAnalystTrust(ctx,selfRate,rngStab,edge,falseFlow){
let score=55;
score+=(selfRate-50)*0.35;
if(rngStab.label==='VERY STABLE'||rngStab.label==='STABLE')score+=14;
else if(rngStab.label==='HIGHLY CHAOTIC')score-=28;
else score-=12;
if(ctx.chaos.level==='HIGH'||ctx.chaos.level==='EXTREME')score-=20;
if(edge.label==='STRONG EDGE')score+=12;
else if(edge.label==='NO EDGE')score-=18;
if(falseFlow&&falseFlow.fake)score-=15;
score=clamp(Math.round(score),0,100);
let level='MEDIUM TRUST',line='Držím strednú dôveru — flow je čiastočne čitateľný.';
if(score>=72){level='HIGH TRUST';line='Session zostáva čitateľná a trust rastie.';}
else if(score<38){level='NO TRUST';line='Momentálne nemám dôveru v tento flow.';}
else if(score<55){level='LOW TRUST';line='Momentálne mám nízku dôveru v tento flow.';}
return{level,score,line};
}
function rbaFlowEvolutionTracking(ctx,dna){
const snap={spin:spins.length,dna:dna.type,chaos:ctx.chaos.level,pat:ctx.pat.rate,osc:ctx.oscCol};
const prev=rbaEvolutionTrack[rbaEvolutionTrack.length-1];
if(!prev||prev.spin!==snap.spin){
rbaEvolutionTrack.push(snap);
if(rbaEvolutionTrack.length>24)rbaEvolutionTrack.shift();
}
const phases=rbaEvolutionTrack;
let story='Session sa vyvíja.';
if(phases.length>=4){
const first=phases[0],last=phases[phases.length-1];
if((first.dna==='CLEAN'||first.dna==='STICKY')&&(last.chaos==='HIGH'||last.chaos==='EXTREME')){
story='Session začala stabilným repeat flowom, ale neskôr prešla do chaotic switching.';
}else if(first.chaos==='HIGH'&&last.pat>=58){
story='Po chaotic štarte session pomaly buduje novú štruktúru.';
}else if(last.pat<55){
story='Dominancia sa po silnom momente začína rozpadávať.';
}else{
story='Flow evolúcia: '+first.dna+' → '+last.dna+' (chaos '+first.chaos+' → '+last.chaos+').';
}
}
return{story,phases:phases.slice(-6)};
}
function rbaMicroWindowDetector(slice,pat,oscCol){
const micro=slice.slice(-5).filter(n=>n!==0);
const prior=slice.slice(-10,-5).filter(n=>n!==0);
if(micro.length<4)return{active:false,line:''};
const oscM=raOscillationScore(micro,'col');
const oscP=prior.length>=4?raOscillationScore(prior,'col'):oscCol;
if(oscM<38&&pat.rate>=62){
return{active:true,line:'RNG momentálne vytvára krátke stabilné repeat window.'};
}
if(oscM<42&&oscP>=55){
return{active:true,line:'Session krátkodobo stabilizovala switching.'};
}
if(pat.rate>=60&&oscM<45){
return{active:true,line:'Vzniká malé low-chaos okno.'};
}
return{active:false,line:''};
}
function rbaAnalystSilence(ctx,trust,rngStab){
if(ctx.phase==='OBSERVE')return{active:false,msg:''};
if(ctx.chaos.level==='EXTREME'||rngStab.label==='HIGHLY CHAOTIC'){
return{active:true,msg:'RNG pôsobí príliš chaoticky.'};
}
if(ctx.pat.rate<52&&ctx.oscCol>=58){
return{active:true,msg:'Momentálne nevidím čitateľný flow.'};
}
if((trust.level==='NO TRUST'||trust.level==='ŽIADNA DÔVERA')&&(ctx.edge.label==='NO EDGE'||ctx.edge.label==='BEZ VÝHODY')){
return{active:true,msg:'Session nemá dostatočnú štruktúru.'};
}
if(ctx.wait)return{active:true,msg:'Momentálne nevidím čitateľný flow.'};
return{active:false,msg:''};
}
function rbaFlowEgo(selfRate,trust,chaos,health){
let mode='balanced',tone='Vyvážený pozorovateľ.';
if(selfRate>=68&&trust.score>=65&&chaos.level==='LOW'&&health.label==='STABLE'){
mode='confident';tone='Čítam flow dobre — držím sebavedomý, no nie slepý tón.';
}else if(selfRate>=62&&trust.score>=58){
mode='assertive';tone='Mám čitateľný obraz — mierne odvážnejší behavior úsudok.';
}else if(selfRate<55||trust.level==='NO TRUST'||chaos.level==='HIGH'||chaos.level==='EXTREME'){
mode='cautious';tone='Som opatrný a skeptický — radšej počkám.';
}else if(health.label==='COLLAPSING'||health.label==='DEAD'){
mode='passive';tone='Pasívny režim — flow ma prekonal, stiahnem sa.';
}
return{mode,tone};
}
function rbaSessionIdentity(ctx,dna){
const{oscCol,colSt,colorSt,chaos,pat}=ctx;
let id='SWITCHING SESSION',line='Session je v switching režime.';
if(dna.type==='CHAOTIC'||dna.type==='TOXIC'||chaos.level==='HIGH'){
id='CHAOTIC SESSION';line='Chaotická session — RNG odmieta jednotný rytmus.';
}else if(colSt.len>=4||colorSt.len>=4||dna.type==='STICKY'||dna.type==='CLEAN'){
id='REPEAT SESSION';line='Repeat session — RNG drží behavior loop.';
}else if(oscCol>=58){
id='SWITCHING SESSION';line='Switching session — rýchle zmeny medzi pásmi.';
}else if(rbaDominanceShare(ctx.s10)>=50||dna.type==='HEAVY'){
id='HEAVY DOMINANCE SESSION';line='Ťažká dominance session — jeden sektor vládne.';
}else if(ctx.recovery&&ctx.recovery.active||oscCol>=52&&pat.rate<60){
id='REVERSAL SESSION';line='Reversal session — tlak na zlom trendu.';
}
return{id,label:id,line};
}
function rbaFlowMemoryPatternsUpdate(dna,chaos,s10){
const key=dna.type+'|'+chaos.level+'|'+(s10?s10.topCol:'x');
const hit=rbaFlowMemoryPatterns.find(p=>p.key===key);
if(hit)hit.count++;else rbaFlowMemoryPatterns.push({key,dna:dna.type,chaos:chaos.level,count:1,spin:spins.length});
if(rbaFlowMemoryPatterns.length>18)rbaFlowMemoryPatterns.shift();
const repeat=rbaFlowMemoryPatterns.filter(p=>p.count>=2);
let line='';
if(repeat.length){
const r=repeat[repeat.length-1];
if(r.dna==='CHAOTIC'||r.chaos==='HIGH')line='Tento typ chaosu sa počas session už viackrát objavil.';
else line='Column dominance sa opakovane vracia po chaos phase.';
}
return{line,recurring:repeat.length};
}
function rbaInternalCaution(ctx,trust,falseFlow,fatigue){
const lines=[];
if(ctx.chaos.level==='HIGH'||ctx.chaos.level==='EXTREME')lines.push('Session pôsobí nebezpečne chaoticky.');
if(falseFlow.fake)lines.push('Flow pôsobí príliš nestabilne na bezpečný vstup.');
if(fatigue.tired)lines.push('Momentálne neverím tomuto momentum.');
if(trust.level==='LOW TRUST'||trust.level==='NO TRUST')lines.push('Vnútorná opatrnosť: radšej pozorujem než tvrdenie.');
return lines.slice(0,2);
}
function rbaFlowPsychology(ctx,dna,temp,fatigue,mood){
const parts=[];
if(mood.id==='NERVOUS'||mood.id==='CHAOTIC')parts.push('Session pôsobí nervózne.');
else if(temp.level==='COLD')parts.push('Flow pôsobí pokojne a čitateľne.');
else if(dna.type==='STICKY'||dna.type==='HEAVY')parts.push('RNG tlačí agresívny repeat flow.');
if(fatigue.tired)parts.push('Dominancia začína byť emocionálne nestabilná.');
if(dna.type==='TOXIC')parts.push('RNG má toxický, nepredvídateľný charakter.');
if(!parts.length)parts.push('Psychológia session: '+temp.level.toLowerCase()+' · '+dna.label.toLowerCase()+'.');
return parts[0]||'Sledujem psychológiu flowu.';
}
function rbaPickPrimaryInsight(cands,silence){
if(silence.active)return silence.msg;
const ranked=cands.filter(Boolean).sort((a,b)=>(b.priority||0)-(a.priority||0));
return ranked.length?ranked[0].text:'Sledujem behavior session.';
}
function rbaRunAdvancedBehaviorSystems(ctx){
const dna=rbaFlowDNA(ctx);
const fatigue=rbaFlowFatigueEngine(ctx);
const falseFlow=rbaFalseFlowDetector(ctx);
const recovery=rbaFlowRecoveryDetector(ctx,rbaPrevBehaviorSnap);
const temperature=rbaSessionTemperature(ctx);
const pressure=rbaFlowPressureSystem(ctx);
const rngStability=rbaRngStabilityIndex(ctx);
const edge=ctx.edge;
const selfRate=ctx.selfRate;
const trust=rbaAnalystTrust(ctx,selfRate,rngStability,edge,falseFlow);
const evolution=rbaFlowEvolutionTracking(ctx,dna);
const micro=rbaMicroWindowDetector(ctx.slice,ctx.pat,ctx.oscCol);
const sessionIdentity=rbaSessionIdentity({...ctx,recovery},dna);
const flowMemory=rbaFlowMemoryPatternsUpdate(dna,ctx.chaos,ctx.s10);
const ego=rbaFlowEgo(selfRate,trust,ctx.chaos,ctx.health);
const caution=rbaInternalCaution(ctx,trust,falseFlow,fatigue);
const psychology=rbaFlowPsychology(ctx,dna,temperature,fatigue,ctx.mood);
const silence=rbaAnalystSilence(ctx,trust,rngStability);
const insightCandidates=[
{priority:95,text:silence.msg,tag:'ticho'},
{priority:88,text:recovery.active?recovery.reason:null,tag:'recovery'},
{priority:82,text:falseFlow.fake?falseFlow.reason:null,tag:'false'},
{priority:78,text:fatigue.lines[0]||null,tag:'fatigue'},
{priority:75,text:pressure.lines[0]||null,tag:'pressure'},
{priority:72,text:dna.reason,tag:'dna'},
{priority:68,text:micro.active?micro.line:null,tag:'micro'},
{priority:65,text:temperature.line,tag:'temp'},
{priority:62,text:evolution.story,tag:'evo'},
{priority:58,text:flowMemory.line||null,tag:'memory'},
{priority:55,text:psychology,tag:'psych'},
{priority:50,text:trust.line,tag:'trust'},
{priority:45,text:ego.tone,tag:'ego'}
];
const primaryInsight=rbaPickPrimaryInsight(insightCandidates,silence);
const secondary=insightCandidates.filter(c=>c.text&&c.text!==primaryInsight).sort((a,b)=>b.priority-a.priority).slice(0,1).map(c=>c.text)[0]||'';
rbaPrevBehaviorSnap={chaosLevel:ctx.chaos.level,patRate:ctx.pat.rate,oscCol:ctx.oscCol,dna:dna.type};
return{
dna,fatigue,falseFlow,recovery,temperature,pressure,rngStability,trust,evolution,micro,
sessionIdentity,flowMemory,ego,caution,psychology,silence,
primaryInsight,secondaryInsight:secondary,isSilent:silence.active
};
}
function computeRbaBehaviorAnalyst(){
const n=spins.length;
const phase=n<=RBA_OBS_MAX?'OBSERVE':n>=RBA_DEEP_MIN?'DEEP':'FULL';
const slice=spins.slice(-100);
const s5=n>=5?raSliceStats(5):null,s10=n>=10?raSliceStats(10):null;
const s20=n>=20?raSliceStats(20):null,s30=n>=30?raSliceStats(30):null,s50=n>=50?raSliceStats(50):null;
const pat=n>=8?raPatternReliability():{rate:50,samples:0};
const oscCol=n>=6?raOscillationScore(slice.slice(-15),'col'):0;
const oscDoz=n>=6?raOscillationScore(slice.slice(-15),'doz'):0;
const colorSt=n>=2?raColorStreak(slice):{len:0,color:'—'};
const colSt=n>=3?rbaColStreak(slice.slice(-12)):{len:0};
const dozSt=n>=3?rbaDozStreak(slice.slice(-12)):{len:0};
const mig=n>=4?countMigrationStreak():0;
const chaos=rbaChaosTag(rbaChaosIndex(oscCol,oscDoz,pat,mig));
const colRet=n>=6?raReturnHits(slice,'col'):{rate:0,trials:0};
const compare=raShortVsLong(s5,s10,s20,s50);
const memoryLine=raCompareMemory();
const suppression=rbaSuppressionLines(slice);
const selfRate=rbaSelfSuccessRate();
const wait=phase!=='OBSERVE'&&(chaos.level==='EXTREME'||chaos.level==='HIGH'||pat.rate<RA_PATTERN_WARN||selfRate<60);
let baseMode='NORMAL';
if(phase==='OBSERVE')baseMode='LEARN';
else if(pat.samples>=6&&pat.rate<RA_PATTERN_WARN)baseMode='DEAD_SPIN';
else if(pat.rate<65||chaos.level==='HIGH'||chaos.level==='EXTREME')baseMode='WARNING';
const flowState=phase==='OBSERVE'?{id:'OBSERVE',label:'POZOROVANIE',cls:'ra-mode-normal'}:rbaFlowStateId(pat,oscCol,colorSt,chaos,baseMode==='DEAD_SPIN'?'DEAD':'');
const mood=rbaSessionMood(pat,chaos,colorSt,oscCol);
const health=rbaFlowHealth(pat,chaos,baseMode==='DEAD_SPIN'?'DEAD':'');
const edge=rbaEdgeStatus(pat,chaos,wait);
const picks=phase==='OBSERVE'?{dozens:'—',columns:'—',color:'—',size:'—',parity:'—'}:rbaBehaviorPicks(s5,s10,slice,colorSt);
const dominantColor=s10?(s10.redPct>=s10.blackPct?'červená':'čierna'):'—';
const dominantParity=s10?(s10.evenPct>=50?'párne':'nepárne'):'—';
let modeLabel='POZOROVANIE',modeCls='ra-mode-normal',mode='OBSERVATION';
if(phase!=='OBSERVE'){
if(baseMode==='DEAD_SPIN'){mode='DEAD_SPIN';modeLabel='REŽIM MŔTVYCH SPINOV';modeCls='ra-mode-dead';}
else if(wait){mode='WAIT';modeLabel='REŽIM ČAKANIA';modeCls='ra-mode-warning';}
else if(baseMode==='WARNING'){mode='WARNING';modeLabel='REŽIM VÝSTRAHY';modeCls='ra-mode-warning';}
else{mode=flowState.id;modeLabel=flowState.label;modeCls=flowState.cls;}
}
let flowStrength={label:'ZBIERAM',cls:'ra-fs-mid'};
if(phase!=='OBSERVE'){
if(health.label==='STABLE'||health.label==='BUILDING')flowStrength={label:'SILNÁ',cls:'ra-fs-strong'};
else if(health.label==='WEAKENING')flowStrength={label:'SLABÁ',cls:'ra-fs-weak'};
else flowStrength={label:'SLABÁ',cls:'ra-fs-weak'};
}
const flowScoreLabel=phase==='OBSERVE'?{label:'ZBIERAM',cls:'ra-flow-uncertain'}:
wait||health.label==='COLLAPSING'||health.label==='DEAD'?{label:'ROZPADÁ SA',cls:'ra-flow-collapse'}:
health.label==='STABLE'?{label:'DRŽÍ',cls:'ra-flow-stable'}:{label:'NEISTÝ',cls:'ra-flow-uncertain'};
const rbaCtx={phase,pat,oscCol,oscDoz,colorSt,colSt,dozSt,chaos,s5,s10,s20,s30,s50,slice,health,edge,suppression,colRet,selfRate,wait,mood};
const behavior=phase==='OBSERVE'?null:rbaRunAdvancedBehaviorSystems(rbaCtx);
let mainInsight='',subNote=null,isSilent=false,silenceMsg=null,mainAlert=false;
let flowComment='',doubt=null;
if(phase==='OBSERVE'){
mainInsight=rbaObserveInsight(n);
subNote='Learning mode — '+n+'/'+RBA_OBS_MAX+' spinov. Nie som predikcia.';
}else if(wait){
mainInsight=behavior&&behavior.silence.active?behavior.silence.msg:'Nehraj — session je nestabilná, chaos alebo slabý flow reading.';
subNote='Počkaj 2–3 spiny · trust '+(behavior?behavior.trust.level:'—')+' · '+selfRate+'% accuracy.';
mainAlert=true;
}else if(mode==='DEAD_SPIN'){
mainInsight='Session prešla do mŕtvych spinov.';
subNote='Režim mŕtvych spinov — nehraj, sleduj 3–5 spinov.';
mainAlert=true;
}else if(behavior){
isSilent=behavior.isSilent;
silenceMsg=behavior.silence.msg;
mainInsight=behavior.primaryInsight;
flowComment=behavior.secondaryInsight||behavior.psychology;
subNote=behavior.dna.label+' · '+behavior.temperature.level+' · RNG '+behavior.rngStability.label;
if(behavior.pressure.collapseRisk)mainAlert=true;
if(behavior.trust.level==='LOW TRUST'||behavior.trust.level==='NO TRUST')doubt=behavior.trust.line;
else if(behavior.falseFlow.fake)doubt=behavior.falseFlow.reason;
if(behavior.ego.mode==='cautious'||behavior.ego.mode==='passive')doubt=(doubt?doubt+' ':'')+behavior.ego.tone;
if(phase==='DEEP'&&behavior.evolution)flowComment=behavior.evolution.story;
}else{
mainInsight='Sledujem behavior session.';
}
const pr=lastAIPredictionCache&&lastAIPredictionKey===predCacheKey()?lastAIPredictionCache:null;
let aiConflict=null;
if(pr&&phase!=='OBSERVE'){
const predCol=pr.columns||'';
const predColor=(pr.color||'').toUpperCase();
const disagree=[];
if(predColor&&picks.color!=='—'&&!picks.color.toUpperCase().includes(predColor.includes('ČERVEN')?'ČERVEN':'ČIERN'))disagree.push('farbu');
if(predCol&&picks.columns!=='—'&&!picks.columns.includes(predCol.split(' ')[0]))disagree.push('stĺpce');
if(disagree.length)aiConflict='Prediction vyzerá inak, ale flow mi nesedí ('+disagree.join(', ')+').';
else if(pr.confidence>=70&&pat.rate>=65)aiConflict='Prediction aj behavior flow sú v súlade — stále dva nezávislé mozgy.';
}
const stance=raStanceVsPrediction({ready:phase!=='OBSERVE',dominantColor,dominantParity});
if(!flowComment)flowComment=mainInsight;
if(phase==='FULL'&&n===RBA_FULL_MIN)rbaLogSession('full_mode');
if(phase==='DEEP'&&n===RBA_DEEP_MIN)rbaLogSession('deep_mode');
const prev=rouletteAnalystPrevSnapshot;
if(prev&&prev.spinLen===n-1&&phase!=='OBSERVE'){
const guess=picks.color.includes('červen')?'červená':picks.color.includes('čiern')?'čierna':null;
if(guess){const last=lastSpinNum();if(last!=null&&last!==0){
const ok=guess==='červená'?reds.includes(last):!reds.includes(last);
rbaSelfEvalHits.push(ok?1:0);if(rbaSelfEvalHits.length>24)rbaSelfEvalHits.shift();
}}}
rouletteAnalystPrevSnapshot={spinLen:n,last:lastSpinNum(),s5,s10,s20,patRate:pat.rate,redPct:s10?s10.redPct:50};
const sessionMemory=rbaSessionLog.length>=2
?'Pamäť session: '+rbaSessionLog.slice(-3).map(e=>e.evt).join(' → ')+'.'
:(rouletteAnalystSessionProfile?'Začiatok: '+rouletteAnalystSessionProfile.label+' session.':'Session sa ešte profiluje.');
if(!rouletteAnalystSessionProfile&&n>=8){
const early=spins.slice(0,8);
rouletteAnalystSessionProfile={osc:raOscillationScore(early,'col'),pat:raPatternRateOnSlice(early),label:raOscillationScore(early,'col')>=58?'chaotický štart':'čitateľný štart'};
}
return{
ready:n>=1,phase,modelLabel:'RULETOVÝ ANALYTIK · samostatný mozog',
mode,modeLabel,modeCls,flowState,mood,health,edge,chaos,wait,
flowStrength,flowScoreLabel,patternRate:pat.rate,
mainInsight,subNote,isSilent,silenceMsg,mainAlert,
intro:phase==='OBSERVE'?'Pozorovací režim 0–'+RBA_OBS_MAX+' spinov.':'Behavior analytik · '+n+' spinov · '+modeLabel+'.',
insights:[],memoryLine,stance,aiConflict,doubt,flowComment,picks,behavior,
dominantColor,dominantParity,
dominantCol:s10?raColName(s10.topCol):'—',dominantDoz:s10?raDozName(s10.topDoz):'—',
dozens:picks.dozens,columns:picks.columns,color:picks.color,size:picks.size,parity:picks.parity,
compare,sessionMemory,selfRate,colSt,dozSt,colorSt,suppression,
blendScore:pat.rate,dataScore:pat.rate,reasoningScore:pat.rate,unifiedConfidence:Math.max(0,pat.rate-(chaos.level==='HIGH'?15:0)),
reasonLines:[mainInsight],lines:[mainInsight],dataLines:[flowComment],
spinsLines:[],timingLines:[],visualLines:[],systemDetailLine:mood.label,invisible:null,
baseMode,
trust:behavior?{label:behavior.trust.level,cls:behavior.trust.score>=65?'greenTxt':behavior.trust.score<45?'redTxt':'yellowTxt',line:behavior.trust.line}:raTrustLabel(pat,baseMode,oscCol,colorSt),
personality:doubt||flowComment,
sessionQuality:{label:health.label,cls:health.cls,desc:(behavior?behavior.rngStability.label+' · '+behavior.temperature.level+' · ':'')+edge.label+' · chaos '+chaos.label},
flowDna:behavior?behavior.dna:null,
sessionIdentity:behavior?behavior.sessionIdentity:null
};
}

let rouletteObserverCache=null;
let rouletteObserverKey='';
const RO_LEARN_MAX=11;
const RO_NARRATE_MIN=12;
const RO_DIRS_MIN=5;
const RO_SOFT_ALARM_UNTIL=15;
const RO_MAX_SENTENCES=5;
const RO_DIR_DISCLAIMER='Pozorovanie správania, nie záruka ďalšieho čísla.';

function observerResetSession(){
rbaSelfEvalHits=[];
rbaSessionLog=[];
rbaPrevBehaviorSnap=null;
rbaFlowMemoryPatterns=[];
rbaEvolutionTrack=[];
rouletteAnalystPrevSnapshot=null;
rouletteAnalystSessionBaseline=null;
rouletteAnalystSessionProfile=null;
rouletteAnalystCache=null;
rouletteAnalystKey='';
rouletteObserverCache=null;
rouletteObserverKey='';
bahResetSession();
}

function observerSpinPhase(n){
if(n<1)return'empty';
if(n<=RO_LEARN_MAX)return'learning';
if(n<RO_SOFT_ALARM_UNTIL)return'warming';
return'full';
}

function observerMaxSentences(phase){
if(phase==='learning')return 2;
if(phase==='warming')return 3;
return RO_MAX_SENTENCES;
}

function roStripHtml(s){
return String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function roCleanDirVal(v){
if(!v||v==='—')return '—';
return String(v).replace(/\s*\([^)]*\)/g,'').replace(/\s*\/\s*/g,' / ').replace(/\s+/g,' ').trim();
}
function roUpperDir(v){
const c=roCleanDirVal(v);
if(c==='—')return c;
return c.toUpperCase();
}
function roSk(text){
if(!text)return '';
let t=String(text);
const map=[
[/Momentálne nemám dôveru v tento flow/gi,'Momentálne nemám dôveru v toto správanie wheelu'],
[/Momentálne mám nízku dôveru/gi,'Momentálne mám nízku dôveru v správanie wheelu'],
[/nízku dôveru v tento flow/gi,'nízku dôveru v správanie wheelu'],
[/Povrchová stabilita bez reálnej štruktúry/gi,'Na povrchu to vyzerá stabilne, ale chýba podpora v histórii'],
[/Flow síce vyzerá stabilne/gi,'Tlak vyzerá stabilne'],
[/RNG vytvára falošný/gi,'Koleso vytvára falošný'],
[/chaotic support/gi,'chaos pod povrchom'],
[/momentum/gi,'rytmus'],
[/hidden flow/gi,'skrytý behavior'],
[/Prediction/gi,'Hlavná predikcia'],
[/flow mi nesedí/gi,'môj pohľad sa nezhoduje'],
[/NO TRUST/gi,'žiadna dôvera'],
[/LOW TRUST/gi,'nízka dôvera'],
[/bezpečný edge/gi,'bezpečný vstup'],
[/\bedge\b/gi,'vstup']
];
map.forEach(([re,rep])=>{t=t.replace(re,rep);});
return skWheelUserText(t.replace(/\s+/g,' ').trim());
}

function roFormatRange(sizeVal,s10){
if(s10){
if(s10.highPct>=58)return '19–36';
if(s10.lowPct>=58)return '1–18';
}
const c=roCleanDirVal(sizeVal);
if(/VEĽK|19|36/i.test(c))return '19–36';
if(/MAL|1.?18/i.test(c))return '1–18';
return c==='—'?'—':roUpperDir(c);
}
function roFormatCombo(val){
const c=roCleanDirVal(val);
if(c==='—')return '—';
return c.replace(/\s*·\s*/g,' + ').toUpperCase();
}

function roFormatParity(parityVal,s10){
if(s10){
if(s10.evenPct>=58)return 'PÁRNE';
if(s10.oddPct>=58)return 'NEPÁRNE';
}
const c=roCleanDirVal(parityVal);
if(/^PÁRNE/i.test(c))return 'PÁRNE';
if(/^NEPÁRNE/i.test(c))return 'NEPÁRNE';
if(c==='—')return '—';
const part=c.split('/')[0].trim();
return part?part.toUpperCase():roUpperDir(c);
}

function observerBuildMainDirections(ctx){
const n=spins.length;
if(n<RO_DIRS_MIN)return null;
const s5=n>=5?raSliceStats(5):null;
const s10=n>=10?raSliceStats(10):null;
const slice=spins.slice(-100);
const colorSt=raColorStreak(slice);
const p=rbaBehaviorPicks(s5,s10,slice,colorSt);
const rows=[
{ico:'🔥',label:'FARBA',val:roUpperDir(p.color)},
{ico:'⚡',label:'PÁRNE / NEPÁRNE',val:roFormatParity(p.parity,s10)},
{ico:'🎯',label:'RANGE',val:roFormatRange(p.size,s10)},
{ico:'📊',label:'TUCTY',val:roFormatCombo(p.dozens)},
{ico:'📈',label:'STĹPCE',val:roFormatCombo(p.columns)}
];
const has=rows.some(r=>r.val&&r.val!=='—');
return has?rows:null;
}

function observerGatherLayers(){
const A=computeRouletteAnalyst();
let flow=null,pressure=null,risk=null,pattern=null;
try{if(spins.length>=2)flow=computeFlowAnalyzer();}catch(e){}
try{if(spins.length>=1)pressure=computeWheelPressureEngine();}catch(e){}
try{if(spins.length>=2)risk=computeRiskChaosCore();}catch(e){}
try{if(spins.length>=2)pattern=computePatternEngine();}catch(e){}
return{A,flow,pressure,risk,pattern};
}

function observerDecideFocus(ctx){
const A=ctx.A;
const n=spins.length;
const phase=observerSpinPhase(n);
if(phase==='empty')return'empty';
if(phase==='learning')return'learning';
const soft=n<RO_SOFT_ALARM_UNTIL;
if(A.wait||A.mode==='DEAD_SPIN'||A.mode==='WAIT'){
if(soft){
if(A.mode==='DEAD_SPIN'&&A.patternRate<48)return'pause';
if(A.wait&&A.patternRate<45)return'pause';
}else return'pause';
}
if(!soft){
if(ctx.risk&&ctx.risk.tag==='HIGH')return'chaos';
if(A.chaos&&(A.chaos.level==='HIGH'||A.chaos.level==='EXTREME'))return'chaos';
}else{
if(ctx.risk&&ctx.risk.tag==='HIGH'&&(ctx.risk.chaosLevel>=68||ctx.risk.score>=62))return'chaos';
if(A.chaos&&A.chaos.level==='EXTREME')return'chaos';
}
const fs=A.flowScoreLabel&&A.flowScoreLabel.label;
const collapseSig=(fs==='ROZPADÁ SA'||A.health&&A.health.label==='COLLAPSING'||A.health&&A.health.label==='DEAD')&&A.patternRate<(soft?48:58);
if(collapseSig)return soft?'rhythm':'collapse';
const B=A.behavior;
if(B&&B.falseFlow&&B.falseFlow.fake)return soft?'rhythm':'fake';
if(A.patternRate>=65&&((A.colSt&&A.colSt.len>=3)||(A.colorSt&&A.colorSt.len>=3)))return'dominance';
return'rhythm';
}

function observerBadge(focus,A){
const map={
empty:{t:'Čakám na spiny',c:'ro-badge-learn'},
learning:{t:'Pozorovanie session',c:'ro-badge-learn'},
pause:{t:'Odporúčam počkať',c:'ro-badge-pause'},
chaos:{t:'Nestabilné správanie',c:'ro-badge-warn'},
collapse:{t:'Flow sa rozpadá',c:'ro-badge-pause'},
fake:{t:'Opatrné pozorovanie',c:'ro-badge-warn'},
dominance:{t:'Tlak dominancie',c:'ro-badge-watch'},
rhythm:{t:'Sledujem wheel',c:'ro-badge-watch'}
};
return map[focus]||map.rhythm;
}

function observerHero(focus,ctx){
const A=ctx.A;
const n=spins.length;
if(focus==='empty')return'Zadaj spiny do histórie — začnem sledovať správanie kolesa v celej session.';
if(focus==='learning')return'Zbieram obraz session ('+n+' / '+RO_LEARN_MAX+' spinov). Od '+RO_NARRATE_MIN+'. spinu budem písať plné komentáre — stále len pozorovanie, nie predikcia čísla.';
if(focus==='pause'){
if(A.mode==='DEAD_SPIN')return'Koleso momentálne nevytvára čitateľné správanie — vhodné sú pozorovacie spiny.';
if(A.wait)return'Momentálne nevidím bezpečný vstup — session je príliš nestabilná na tvrdenia.';
return'Momentálne nevidím stabilný rytmus — radšej sleduj ďalší vývoj.';
}
if(focus==='chaos')return'Posledné spiny prinášajú veľa chaosu — kolo zatiaľ nevytvára stabilný rytmus.';
if(focus==='collapse')return'Dominancia sa rozpadá a smer sa často mení — session je ťažšie čitateľná.';
if(focus==='fake')return'Na prvý pohľad to môže vyzerať stabilne, ale vnútorný obraz tomu nesedí.';
if(focus==='dominance'){
const col=A.dominantCol&&A.dominantCol!=='—'?A.dominantCol:'dominantný stĺpec';
const doz=A.dominantDoz&&A.dominantDoz!=='—'?A.dominantDoz:'tucet';
return'Koleso drží tlak — najsilnejšie teraz '+doz+' a '+col+'.';
}
const ins=roStripHtml(A.mainInsight);
if(ins&&ins.length>8&&ins.length<200&&!/NO TRUST|TOXIC|DEAD|EDGE/i.test(ins))return ins;
return'Koleso má v session čitateľný behavior — sledujem návraty, farby a presuny.';
}

function observerAdvice(focus,phase){
if(phase==='learning'||phase==='empty')return null;
if(focus==='pause')return'Odporúčam vynechať 2–3 spiny a sledovať, či sa vytvorí nový rytmus.';
if(phase==='full'&&(focus==='chaos'||focus==='collapse'||focus==='fake'))return'Odporúčam vynechať 2–3 spiny a sledovať, či sa vytvorí nový rytmus.';
if(phase==='warming'&&focus==='pause')return'Pri malom počte spinov radšej ešte chvíľu sleduj vývoj.';
return null;
}

function observerMainDirTitle(phase,focus){
if(phase==='learning')return'Predbežný tlak z histórie (plný výstup od '+RO_NARRATE_MIN+'. spinu)';
if(focus==='pause'||focus==='chaos'||focus==='collapse')return'Momentálne najsilnejší tlak z histórie — aj pri nestabilnej session';
return'Momentálne najsilnejšie behavior smery wheelu (nie predikcia čísla)';
}

function observerCollectSentences(ctx,focus){
const cands=[];
const A=ctx.A;
const beh=A.behavior;
const n=spins.length;
const push=(p,t,x)=>{if(x)cands.push({p,t,x:String(x).trim()});};

if(focus==='learning'){
push(100,'neut','Mám '+n+' spinov v pamäti — ešte len skladám obraz celej session.');
if(n>=3)push(88,'neut','Zatiaľ sledujem farby, tucty a stĺpce bez záveru o ďalšom čísle.');
if(n>=1)push(82,'neut','Plné komentáre začnem od '+RO_NARRATE_MIN+'. spinu v histórii.');
return cands;
}

if(focus==='pause'){
push(98,'bad','Session je momentálne nečitateľná — wheel nevytvára stabilný rytmus na vstup.');
if(ctx.risk&&ctx.risk.chaosLevel>=55)push(94,'warn','Posledné spiny prinášajú chaos — stabilný behavior chýba.');
if(A.chaos&&(A.chaos.level==='HIGH'||A.chaos.level==='EXTREME'))push(92,'warn','Koleso stráca rytmus — príliš veľa kolísania v session.');
if(beh&&beh.falseFlow&&beh.falseFlow.fake)push(88,'warn',roSk(beh.falseFlow.reason));
if(beh&&beh.fatigue&&beh.fatigue.lines&&beh.fatigue.lines[0])push(84,'warn',roSk(beh.fatigue.lines[0]));
const doubt=roSk(roStripHtml(A.doubt||''));
if(doubt&&doubt.length>8&&!/trust|NO TRUST|LOW TRUST/i.test(doubt))push(82,'warn',doubt);
else if(beh&&beh.trust&&beh.trust.line)push(80,'warn',roSk(beh.trust.line));
return cands;
}

const soft=n<RO_SOFT_ALARM_UNTIL;
if(ctx.risk&&ctx.risk.tag==='HIGH'&&!soft)push(97,'bad','V session rastie chaos a kolísanie — stabilný rytmus zatiaľ chýba.');
else if(ctx.risk&&ctx.risk.tag==='HIGH'&&soft)push(72,'warn','V krátkom okne je viac neporiadku — ešte čakám na dlhší obraz session.');
else if(ctx.risk&&ctx.risk.chaosLevel>=55&&!soft)push(85,'warn','Stupeň neporiadku v posledných spinoch je vyšší — wheel často mení charakter.');

if(A.dominantColor&&A.dominantColor!=='—'){
const st=A.colorSt;
if(st&&st.len>=3)push(78,'ok','Farba '+A.dominantColor+' drží opakovaný tlak už '+st.len+' spinov.');
else push(62,'ok','V krátkom okne teraz silnejšie tlačí '+A.dominantColor+'.');
}

if(A.dominantParity&&A.dominantParity!=='—'&&A.dominantParity!=='párne / nepárne'){
push(58,'ok','Párnosť sa v posledných spinoch viac prikláňa k '+A.dominantParity+'.');
}

if(A.colRet&&A.colRet.rate>=58&&A.colRet.trials>=4){
push(74,'ok','Návraty do rovnakého stĺpca sa opakujú — wheel drží návratový rytmus.');
}

if(ctx.flow&&ctx.flow.migrationLabel&&ctx.flow.migrationLabel!=='—'){
push(56,'neut','Presun na wheeli: '+ctx.flow.migrationLabel+'.');
}else if(ctx.flow&&ctx.flow.migrationDir&&ctx.flow.migrationDir!=='—'){
push(54,'neut','Smer pohybu na wheeli sa momentálne kloní skôr '+ctx.flow.migrationDir+'.');
}

if(ctx.pressure&&ctx.pressure.activeSector&&ctx.pressure.dominantPressure>=40){
const s=ctx.pressure.activeSector;
push(70,'ok','Koleso sa často vracia do pásu okolo čísla '+s.center+' ('+s.hits+' zásahov v histórii).');
}

if(ctx.pattern&&ctx.pattern.activeClusters&&ctx.pattern.activeClusters[0]){
const cl=ctx.pattern.activeClusters[0];
if(cl.active)push(64,'ok','Opakované čísla v jednom pásme držia pokope — wheel žije v tomto sektore.');
}

if(beh&&beh.fatigue&&beh.fatigue.lines){
beh.fatigue.lines.forEach((ln,i)=>push(72-i*4,'warn',roSk(ln)));
}

if(beh&&beh.recovery&&beh.recovery.active&&beh.recovery.reason)push(68,'ok',roSk(beh.recovery.reason));

if(ctx.flow&&ctx.flow.timingCore!=null&&n>=8){
const tOpen=ctx.flow.timingWindow==='OTVORENE';
push(42,'neut','Časovanie wheelu: '+(tOpen?'okno je otvorené':'okno je zatvorené')+' — podpora '+ctx.flow.timingCore+' %.');
}

if(ctx.risk&&n>=8){
push(40,'neut','Stupeň neporiadku v session: '+(ctx.risk.chaosLevel||0)+' % · volatilita '+ctx.risk.volatility+' %.');
}

if(A.patternRate<55&&focus==='collapse')push(94,'bad','Opakovania a návraty už nedávajú jednotný obraz — flow sa rozpadá.');
if(focus==='fake'&&beh&&beh.falseFlow&&beh.falseFlow.reason){
push(95,'warn',beh.falseFlow.reason);
push(88,'warn','Na povrchu to vyzerá stabilne, ale chýba podpora v pamäti spinov.');
}

if(A.compare&&A.compare.short){
const sh=roStripHtml(A.compare.short).replace(/^Krátkodobo:\s*/i,'Krátkodobo ');
if(sh.length>12)push(48,'neut',sh);
}
if(A.compare&&A.compare.long&&focus!=='chaos'&&focus!=='pause'){
const lg=roStripHtml(A.compare.long).replace(/^Dlhodobo:\s*/i,'Dlhodobo ');
if(lg.length>12&&lg.indexOf('málo dát')<0)push(44,'neut',lg);
}

if(rouletteAnalystSessionProfile&&n>=10){
const lab=rouletteAnalystSessionProfile.label||'';
if(lab)push(42,'neut','Od začiatku session to pôsobilo '+lab.replace('štart','')+'.');
}

if(A.memoryLine&&A.memoryLine!=='—'&&A.memoryLine.indexOf('Pamäť')>=0){
push(40,'neut',roStripHtml(A.memoryLine));
}

if(beh&&beh.evolution&&beh.evolution.story&&focus!=='learning')push(46,'neut',beh.evolution.story);

const minP=focus==='chaos'||focus==='collapse'?78:0;
return cands.filter(c=>c.p>=minP||c.t==='bad'||c.t==='warn').sort((a,b)=>b.p-a.p);
}

function observerAiNote(A,focus,phase){
if(focus==='empty'||phase==='learning')return null;
if(A.aiConflict)return roSk(roStripHtml(A.aiConflict));
if(A.stance&&A.stance!=='—')return roSk(roStripHtml(A.stance));
return null;
}

function observerMemoryLine(A){
if(A.sessionMemory&&A.sessionMemory!=='—')return roStripHtml(A.sessionMemory);
return null;
}

function observerFootnote(A){
if(rbaSelfEvalHits.length>=4)return'Vlastné čítanie správania v tejto session: '+A.selfRate+' % (nezávislé od hlavnej predikcie).';
return'Úspešnosť čítania sa zobrazí po niekoľkých hodnotených spinoch v session.';
}

function computeRouletteObserverUI(){
const key=spins.length+'|'+(spins[spins.length-1]??'')+'|obs|'+predCacheKey();
if(rouletteObserverCache&&rouletteObserverKey===key)return rouletteObserverCache;
const n=spins.length;
const phase=observerSpinPhase(n);
if(!n){
const empty={ready:false,phase:'empty',focus:'empty',badge:observerBadge('empty',{}),hero:observerHero('empty',{}),advice:null,mainDirections:null,mainDirTitle:'',mainDirMuted:false,sentences:[],aiNote:null,memory:null,foot:null,dirDisclaimer:RO_DIR_DISCLAIMER};
rouletteObserverCache=empty;rouletteObserverKey=key;return empty;
}
const ctx=observerGatherLayers();
const focus=observerDecideFocus(ctx);
const A=ctx.A;
const heroCls=(focus==='pause'||focus==='chaos'||focus==='collapse')?'ro-hero-warn':(focus==='learning'?'ro-hero-quiet':'');
const maxSent=observerMaxSentences(phase);
const sentences=observerCollectSentences(ctx,focus).slice(0,maxSent);
const mainDirections=observerBuildMainDirections(ctx);
const mainDirMuted=focus==='pause'||focus==='chaos'||focus==='collapse';
const result={
ready:true,phase,focus,
badge:observerBadge(focus,A),
hero:observerHero(focus,ctx),
heroCls,
advice:observerAdvice(focus,phase),
mainDirections,
mainDirTitle:observerMainDirTitle(phase,focus),
mainDirMuted,
sentences,
aiNote:observerAiNote(A,focus,phase),
memory:phase==='learning'?null:roSk(observerMemoryLine(A)||''),
foot:observerFootnote(A),
spinCount:n,
dirDisclaimer:RO_DIR_DISCLAIMER
};
rouletteObserverCache=result;rouletteObserverKey=key;return result;
}

function computeRouletteAnalyst(){
const key=spins.length+'|'+(spins[spins.length-1]??'')+'|'+predCacheKey();
if(rouletteAnalystCache&&rouletteAnalystKey===key)return rouletteAnalystCache;
const empty={
ready:false,modelLabel:'RULETOVÝ ANALYTIK',
mode:'NORMAL',modeLabel:'Čakám',modeCls:'ra-mode-normal',
intro:'Zadaj spiny — analytik začne po prvom spine.',
insights:['Čakám na históriu. Nie som predikcia — som samostatný behavior analytik.'],
memoryLine:'—',stance:'—',patternRate:0,
blendScore:0,dataScore:0,reasoningScore:0,unifiedConfidence:0,
reasonLines:['Čakám na spiny.'],lines:['Čakám na spiny.'],dataLines:[],
spinsLines:[],timingLines:[],visualLines:[],systemDetailLine:'—',invisible:null,
dozens:'—',columns:'—',color:'—',size:'—',parity:'—',phase:'OBSERVE',wait:false
};
if(spins.length<1){rouletteAnalystCache=empty;rouletteAnalystKey=key;return empty;}
const result=computeRbaBehaviorAnalyst();
rouletteAnalystCache=result;rouletteAnalystKey=key;return result;
}

function computeSpinAIComment(){
return computeRouletteAnalyst();
}