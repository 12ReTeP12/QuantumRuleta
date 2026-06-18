/**
 * ARCHÍV (Balík 9A) — scripts/_legacy/pattern/spin-pattern-observer.js
 * Produkcia V2 nenačítava tento súbor (<script src> chýba).
 * Autorita (produkcia): scripts/pattern/spin-pattern-observer.js (Balík 9F).
 * Tento súbor je archív pred extrakciou — nenačítavať v produkcii.
 */
/* Patterny a opakovateľnosť — samostatný observer pamäte spinov (bez tipov) */
'use strict';

function spoNumsOnly(arr){return arr.filter(n=>n>0);}

function spoSeqFromSpins(spins,field){
return spoNumsOnly(spins).map(n=>{
const v=field==='doz'?getDozen(n):getColumn(n);
return v>=0?String(v+1):null;
}).filter(Boolean);
}

function spoCountBins(seq){
const c=[0,0,0];
seq.forEach(s=>{const i=+s-1;if(i>=0&&i<3)c[i]++;});
return c;
}

function spoDominantIdx(counts){
let best=0,max=-1;
counts.forEach((v,i)=>{if(v>max){max=v;best=i;}});
return best;
}

function spoLabel(field,idx){return(idx+1)+'. '+(field==='doz'?'TUCET':'STĹPEC');}

function spoTransitions(seq){
const map={'1→1':0,'1→2':0,'1→3':0,'2→1':0,'2→2':0,'2→3':0,'3→1':0,'3→2':0,'3→3':0};
for(let i=1;i<seq.length;i++){
const k=seq[i-1]+'→'+seq[i];
if(map[k]!=null)map[k]++;
}
const sorted=Object.keys(map).map(k=>({k,c:map[k]})).filter(x=>x.c>0).sort((a,b)=>b.c-a.c);
return{map,sorted,top:sorted[0]||null};
}

function spoRepeatInWindow(seq,window){
const slice=seq.slice(-window);
const counts=spoCountBins(slice);
const dom=spoDominantIdx(counts);
return{domIdx:dom,count:counts[dom],window:slice.length,pct:slice.length?Math.round(counts[dom]/slice.length*100):0};
}

function spoRepeatForIdx(seq,domIdx,window){
const slice=seq.slice(-window);
const hits=slice.filter(s=>+s-1===domIdx).length;
return{domIdx,count:hits,window:slice.length,pct:slice.length?Math.round(hits/slice.length*100):0};
}

function spoDominanceRun(seq,window){
if(seq.length<2)return{idx:0,age:0,prevIdx:null};
const getDom=end=>{
const slice=seq.slice(Math.max(0,end-window),end);
if(!slice.length)return 0;
return spoDominantIdx(spoCountBins(slice));
};
const cur=getDom(seq.length);
let age=0;
for(let end=seq.length;end>=Math.min(window,2);end--){
if(getDom(end)===cur)age++;
else break;
}
let prevIdx=null;
for(let end=seq.length-age-1;end>=window;end--){
const d=getDom(end);
if(d!==cur){prevIdx=d;break;}
}
return{idx:cur,age,prevIdx};
}

function spoBreakHistory(seq,window){
const breaks=[];
let prev=null;
for(let i=window;i<=seq.length;i++){
const dom=spoDominantIdx(spoCountBins(seq.slice(i-window,i)));
if(prev!=null&&dom!==prev)breaks.push(i);
prev=dom;
}
return breaks;
}

function spoPatternMemory(dozSeq,colSeq){
const win=Math.min(8,dozSeq.length,colSeq.length);
if(win<4)return null;
const sig=dozSeq.slice(-win).join('')+'|'+colSeq.slice(-win).join('');
for(let i=0;i<=dozSeq.length-win-1;i++){
const s=dozSeq.slice(i,i+win).join('')+'|'+colSeq.slice(i,i+win).join('');
if(s===sig&&i<dozSeq.length-win){
return{from:i+1,to:i+win,ago:dozSeq.length-(i+win)};
}
}
return null;
}

function spoReturnSignal(seq,domIdx){
const target=String(domIdx+1);
const positions=[];
seq.forEach((v,i)=>{if(v===target)positions.push(i);});
if(positions.length<3)return null;
const gaps=[];
for(let i=1;i<positions.length;i++)gaps.push(positions[i]-positions[i-1]);
const avg=gaps.reduce((a,b)=>a+b,0)/gaps.length;
const regular=gaps.filter(g=>Math.abs(g-avg)<=1).length>=Math.max(2,gaps.length-1);
return{count:positions.length,regular,avgGap:Math.round(avg*10)/10};
}

function spoStability(seq,domIdx,window){
const slice=seq.slice(-window);
if(!slice.length)return 0;
const hits=slice.filter(s=>+s-1===domIdx).length;
return Math.round(hits/slice.length*100);
}

function spoStrength(stability,age,ratio){
if(stability>=68&&age>=4&&ratio>=0.38)return{emoji:'🟢',label:'Silná'};
if(stability>=42||age>=2)return{emoji:'🟡',label:'Stredná'};
return{emoji:'🔴',label:'Slabá'};
}

function spoBreakRisk(age,ratio,stability){
if(age>=14&&ratio>=0.42)return'VYSOKÉ';
if(age>=15&&stability<55)return'VYSOKÉ';
if(age>=15)return'STREDNÉ';
if(age>=8&&stability>=55)return'STREDNÉ';
return'NÍZKE';
}

function spoPickDominantField(d){
const dozScore=d.dozCounts[d.dozDom.idx]+d.dozDom.age*0.15;
const colScore=d.colCounts[d.colDom.idx]+d.colDom.age*0.15;
return dozScore>=colScore*0.92?'doz':'col';
}

function spoFieldRatio(d,field,idx){
const seqLen=field==='doz'?d.dozSeq.length:d.colSeq.length;
const counts=field==='doz'?d.dozCounts:d.colCounts;
return seqLen?counts[idx]/seqLen:0;
}

function spoFieldStrength(d,field,dom){
const stab=field==='doz'?d.dozStab:d.colStab;
return spoStrength(stab,dom.age,spoFieldRatio(d,field,dom.idx));
}

function spoDetectBehaviorChange(dozDom,colDom,preferField){
const list=[];
if(dozDom.prevIdx!=null&&dozDom.age<=6)list.push({field:'doz',prev:dozDom.prevIdx,next:dozDom.idx,age:dozDom.age});
if(colDom.prevIdx!=null&&colDom.age<=6)list.push({field:'col',prev:colDom.prevIdx,next:colDom.idx,age:colDom.age});
if(!list.length)return null;
const pref=list.find(x=>x.field===preferField);
return pref||list.sort((a,b)=>a.age-b.age)[0];
}

function spoHeatBar(count,maxLen){
const n=maxLen?Math.max(1,Math.round(count/maxLen*8)):0;
return'█'.repeat(Math.max(1,n));
}

function spoAuxStats(spins){
const slice=spoNumsOnly(spins).slice(-24);
let r=0,b=0,e=0,o=0,lo=0,hi=0;
slice.forEach(n=>{
if(reds.includes(n))r++;else b++;
if(n%2===0)e++;else o++;
if(n<=18)lo++;else hi++;
});
const t=Math.max(slice.length,1);
return{
color:'R '+Math.round(r/t*100)+'% · B '+Math.round(b/t*100)+'%',
parity:'P '+Math.round(e/t*100)+'% · N '+Math.round(o/t*100)+'%',
range:'M '+Math.round(lo/t*100)+'% · V '+Math.round(hi/t*100)+'%'
};
}

function spoObserverNotice(data){
const parts=[];
const field=spoPickDominantField(data);
const dom=field==='doz'?data.dozDom:data.colDom;
const breakRisk=field==='doz'?data.dozBreakRisk:data.colBreakRisk;
const domTrans=field==='doz'?data.dozTrans:data.colTrans;
const d=data.dozRepeat10;
if(d.count>=5)parts.push({w:d.count,text:(d.domIdx+1)+'. tucet sa objavil '+d.count+'× za posledných '+d.window+' spinov.'});
const c=data.colRepeat10;
if(c.count>=5)parts.push({w:c.count,text:(c.domIdx+1)+'. stĺpec sa objavil '+c.count+'× za posledných '+c.window+' spinov.'});
if(data.dozReturn&&data.dozReturn.count>=4){
parts.push({w:data.dozReturn.count+(data.dozReturn.regular?3:0),
text:spoLabel('doz',data.dozDom.idx)+' sa opakovane vracia'+(data.dozReturn.regular?' v pravidelných intervaloch.':'.')});
}
if(domTrans.top&&domTrans.top.c>=3){
parts.push({w:domTrans.top.c,text:'Prechody '+domTrans.top.k+' ('+(field==='doz'?'tucty':'stĺpce')+') sú nezvyčajne časté ('+domTrans.top.c+'×).'});
}
if(data.behaviorChange){
parts.push({w:10,text:'Detekovaná zmena správania: '+spoLabel(data.behaviorChange.field,data.behaviorChange.prev)+' → '+spoLabel(data.behaviorChange.field,data.behaviorChange.next)+'.'});
}
if(dom.age>=8&&breakRisk==='VYSOKÉ'){
parts.push({w:7,text:'Dominancia '+spoLabel(field,dom.idx).toLowerCase()+' trvá dlho — pattern starne.'});
}
if(!parts.length){
if(spins.length<4)return'V histórii zatiaľ málo spinov na čitateľný pattern.';
return'V histórii spinov zatiaľ nevidím silný opakujúci sa vzorec tuctov ani stĺpcov.';
}
parts.sort((a,b)=>b.w-a.w);
return parts[0].text;
}

function spoPatternRadar(data){
if(spins.length<3)return'Historické vzorce sú ešte príliš krátke — observer zbiera dáta.';
const field=spoPickDominantField(data);
const dom=field==='doz'?data.dozDom:data.colDom;
const breakRisk=field==='doz'?data.dozBreakRisk:data.colBreakRisk;
if((data.chaosHint||0)>=65)return'Ruleta sa správa chaoticky — opakovateľnosť je slabá.';
if(data.behaviorChange)return'Vzniká nový cyklus — '+spoLabel(data.behaviorChange.field,data.behaviorChange.next)+' preberá dominanciu.';
if(dom.age>=10&&breakRisk!=='NÍZKE'){
return'Dominancia '+spoLabel(field,dom.idx).toLowerCase()+' stále trvá, ale pattern starne.';
}
const domTrans=field==='doz'?data.dozTrans:data.colTrans;
if(domTrans.top&&domTrans.top.c>=4){
return'Vzniká cyklus medzi '+domTrans.top.k.replace('→','. a ')+'. '+(field==='doz'?'tuctom':'stĺpcom')+'.';
}
if(data.strength.label==='Slabá')return'Historické vzorce sú slabé — žiadna silná dominancia.';
return'Observer vidí stabilné správanie v tuctoch a stĺpcoch z histórie spinov.';
}

function computeSpinPatternObserver(){
const dozSeq=spoSeqFromSpins(spins,'doz');
const colSeq=spoSeqFromSpins(spins,'col');
const dozCounts=spoCountBins(dozSeq);
const colCounts=spoCountBins(colSeq);
const dozRun=spoDominanceRun(dozSeq,15);
const colRun=spoDominanceRun(colSeq,15);
const dozDom={...dozRun,count:dozCounts[dozRun.idx]};
const colDom={...colRun,count:colCounts[colRun.idx]};
const dozTrans=spoTransitions(dozSeq);
const colTrans=spoTransitions(colSeq);
const dozRepeat10=spoRepeatForIdx(dozSeq,dozDom.idx,10);
const colRepeat10=spoRepeatForIdx(colSeq,colDom.idx,10);
const dozRepeat20=spoRepeatForIdx(dozSeq,dozDom.idx,20);
const colRepeat20=spoRepeatForIdx(colSeq,colDom.idx,20);
const dozStab=spoStability(dozSeq,dozDom.idx,Math.min(20,dozSeq.length||1));
const colStab=spoStability(colSeq,colDom.idx,Math.min(20,colSeq.length||1));
const stability=Math.round((dozStab+colStab)/2);
const dozRatio=dozSeq.length?dozCounts[dozDom.idx]/dozSeq.length:0;
const colRatio=colSeq.length?colCounts[colDom.idx]/colSeq.length:0;
const domField=spoPickDominantField({dozCounts,colCounts,dozDom,colDom});
const activeDom=domField==='doz'?dozDom:colDom;
const activeStab=domField==='doz'?dozStab:colStab;
const activeRatio=domField==='doz'?dozRatio:colRatio;
const strength=spoStrength(activeStab,activeDom.age,activeRatio);
const dozBreakRisk=spoBreakRisk(dozDom.age,dozRatio,dozStab);
const colBreakRisk=spoBreakRisk(colDom.age,colRatio,colStab);
const breaksDoz=spoBreakHistory(dozSeq,12);
const breaksCol=spoBreakHistory(colSeq,12);
const memory=spoPatternMemory(dozSeq,colSeq);
const dozReturn=spoReturnSignal(dozSeq,dozDom.idx);
const colReturn=spoReturnSignal(colSeq,colDom.idx);
const behaviorChange=spoDetectBehaviorChange(dozDom,colDom,domField);
const chaosHint=typeof chaosState!=='undefined'&&chaosState?chaosState.chaosLevel:0;
const aux=spoAuxStats(spins);
const data={
ready:spins.length>=2,
domField,dozSeq,colSeq,dozCounts,colCounts,dozDom,colDom,
dozTrans,colTrans,dozRepeat10,colRepeat10,dozRepeat20,colRepeat20,
dozStab,colStab,stability,strength,dozBreakRisk,colBreakRisk,
breaksDoz,breaksCol,memory,dozReturn,colReturn,behaviorChange,chaosHint,aux
};
data.notice=spoObserverNotice(data);
data.radar=spoPatternRadar(data);
return data;
}

function spoFmtHist(seq,max){
const s=seq.slice(-max);
return s.length?s.join(' | '):'—';
}

function spoTransRows(sorted,limit){
if(!sorted.length)return'<div class="spo-muted">—</div>';
return sorted.slice(0,limit).map(x=>'<div class="spo-trans-row"><span>'+x.k+'</span><b>'+x.c+'×</b></div>').join('');
}

function spoHeatRows(field,counts){
const max=Math.max(...counts,1);
return[0,1,2].map(i=>'<div class="spo-heat-row"><span>'+(i+1)+'. '+(field==='doz'?'tucet':'stĺpec')+'</span><code>'+spoHeatBar(counts[i],max)+'</code><b>'+counts[i]+'×</b></div>').join('');
}

function spoPickDominantView(d){
const field=d.domField||spoPickDominantField(d);
const fv=spoFieldView(d,field);
const dom=fv.dom;
const trans=field==='doz'?d.dozTrans.top:d.colTrans.top;
const type=field==='doz'?'TUCET':'STĹPEC';
const dominateLabel=(dom.idx+1)+'. '+type;
const transLine=trans?trans.k.replace('→',' → '):null;
return{field,dom,dominateLabel,transLine,type,sila:fv.sila,stab:fv.stab,age:fv.age,strengthLabel:fv.strengthLabel};
}

function spoDomBreakRisk(d,field){
return field==='doz'?d.dozBreakRisk:d.colBreakRisk;
}

function spoPatternState(d,domView){
const age=domView.age;
const risk=spoDomBreakRisk(d,domView.field);
const stab=domView.stab;
const str=domView.strengthLabel;
let trendKey='STABILNÝ';
let trend={cls:'spo-trend-flat',arrow:'→',label:'STABILNÝ',key:'STABILNÝ'};
if(str==='Slabá'||risk==='VYSOKÉ'||(age>=15&&(risk==='STREDNÉ'||stab<55))||(age>=6&&stab<42)){
trendKey='SLABNE';
trend={cls:'spo-trend-down',arrow:'↓',label:'SLABNE',key:'SLABNE'};
}else if(str==='Silná'&&stab>=55&&risk==='NÍZKE'&&age<=14){
trendKey='SILNIE';
trend={cls:'spo-trend-up',arrow:'↑',label:'SILNIE',key:'SILNIE'};
}
let phase;
if(age>=15&&trendKey==='SLABNE')phase={cls:'spo-phase-break',emoji:'🔴',label:'ROZPADÁ SA'};
else if(age>=15)phase={cls:'spo-phase-old',emoji:'🟠',label:'STARNE'};
else if(age>=6&&age<=14&&(trendKey==='STABILNÝ'||trendKey==='SILNIE'))phase={cls:'spo-phase-grow',emoji:'🟡',label:'DOZRIEVA'};
else if(age>=6&&age<=14&&trendKey==='SLABNE')phase={cls:'spo-phase-break',emoji:'🔴',label:'ROZPADÁ SA'};
else if(age<=5&&(trendKey==='SILNIE'||trendKey==='STABILNÝ'))phase={cls:'spo-phase-born',emoji:'🟢',label:'VZNIKÁ'};
else if(age<=5&&trendKey==='SLABNE')phase={cls:'spo-phase-break',emoji:'🔴',label:'ROZPADÁ SA'};
else phase={cls:'spo-phase-grow',emoji:'🟡',label:'DOZRIEVA'};
let ageView;
if(age>=15)ageView={cls:'spo-age-old',tag:'STARÝ PATTERN'};
else if(age<=5)ageView={cls:'spo-age-young',tag:'MLADÝ PATTERN'};
else ageView={cls:'spo-age-mid',tag:'AKTÍVNY PATTERN'};
return{trend,phase,age:ageView};
}

function spoBehaviorView(d){
return d.behaviorChange||null;
}

function spoTopTransitionView(d){
const a=d.dozTrans.top,b=d.colTrans.top;
if(!a&&!b)return null;
if(!a)return{k:b.k,c:b.c,field:'col'};
if(!b)return{k:a.k,c:a.c,field:'doz'};
const field=a.c>=b.c?'doz':'col';
const pick=a.c>=b.c?a:b;
return{k:pick.k,c:pick.c,field};
}

function spoDisplayTrend(label){
return label==='SILNIE'?'Silnie':label==='SLABNE'?'Slabne':'Stabilný';
}

function spoDisplayPhase(label){
return label==='VZNIKÁ'?'Vzniká':label==='DOZRIEVA'?'Dozrieva':label==='STARNE'?'Starne':label==='ROZPADÁ SA'?'Rozpadá sa':label;
}

function spoRiskCls(r){
return r==='VYSOKÉ'?'redTxt':r==='STREDNÉ'?'yellowTxt':'greenTxt';
}

function spoFieldView(d,field){
const dom=field==='doz'?d.dozDom:d.colDom;
const stab=field==='doz'?d.dozStab:d.colStab;
const risk=field==='doz'?d.dozBreakRisk:d.colBreakRisk;
const fs=spoFieldStrength(d,field,dom);
let sila=fs.label==='Silná'?'Vysoká':fs.label==='Stredná'?'Stredná':'Nízka';
if(risk==='VYSOKÉ')sila='Nízka';
else if(risk==='STREDNÉ'&&sila==='Vysoká')sila='Stredná';
return{field,dom,stab,age:dom.age,strengthLabel:fs.label,sila,fs,risk};
}

function spoPanelTitle(field,name){
return name+' '+(field==='doz'?'tuctov':'stĺpcov');
}

function spoColSummary(d,field,fv,fpat){
const risk=field==='doz'?d.dozBreakRisk:d.colBreakRisk;
const rep10=field==='doz'?d.dozRepeat10:d.colRepeat10;
const seq=field==='doz'?d.dozSeq:d.colSeq;
const tag=field==='doz'?'TUCTY':'STĹPCE';
const meni=d.behaviorChange&&d.behaviorChange.field===field
?spoLabel(field,d.behaviorChange.prev)+' → '+spoLabel(field,d.behaviorChange.next)
:'Bez zmeny';
const recent=spoFmtHist(seq,6);
return '<div class="spo-col-summary" role="group" aria-label="Rýchly prehľad '+tag+'">'
+'<div class="spo-col-summary-head"><span class="spo-col-tag">'+tag+'</span><span class="spo-col-summary-hint">Rýchly prehľad príbehu</span></div>'
+'<div class="spo-summary-grid">'
+'<div class="spo-sum-row spo-sum-wide"><span>Posledné '+shortLabel(field)+'</span><b>'+recent+'</b></div>'
+'<div class="spo-sum-row"><span>Dominuje</span><b>'+spoLabel(field,fv.dom.idx)+'</b></div>'
+'<div class="spo-sum-row"><span>Opakuje sa</span><b>'+rep10.count+'× / 10 spinov</b></div>'
+'<div class="spo-sum-row"><span>Mení sa</span><b'+(meni!=='Bez zmeny'?' class="greenTxt"':'')+'>'+meni+'</b></div>'
+'<div class="spo-sum-row"><span>Trend</span><b class="'+fpat.trend.cls+'">'+fpat.trend.arrow+' '+spoDisplayTrend(fpat.trend.label)+'</b></div>'
+'<div class="spo-sum-row"><span>Sila</span><b>'+fv.sila+'</b></div>'
+'<div class="spo-sum-row"><span>Stabilita</span><b>'+fv.stab+' %</b></div>'
+'<div class="spo-sum-row"><span>Zlom</span><b class="'+spoRiskCls(risk)+'">'+risk+'</b></div>'
+'</div></div>';
}
function shortLabel(field){return field==='doz'?'tucty':'stĺpce';}

function spoRenderFieldAnalysis(d,field){
const isDoz=field==='doz';
const short=isDoz?'tucet':'stĺpec';
const fv=spoFieldView(d,field);
const fpat=spoPatternState(d,fv);
const seq=isDoz?d.dozSeq:d.colSeq;
const counts=isDoz?d.dozCounts:d.colCounts;
const dom=fv.dom;
const trans=isDoz?d.dozTrans:d.colTrans;
const rep10=isDoz?d.dozRepeat10:d.colRepeat10;
const rep20=isDoz?d.dozRepeat20:d.colRepeat20;
const ret=isDoz?d.dozReturn:d.colReturn;
const risk=isDoz?d.dozBreakRisk:d.colBreakRisk;
const stab=fv.stab;
const breaks=isDoz?d.breaksDoz:d.breaksCol;
const fs=fv.fs;
const t=function(name){return spoPanelTitle(field,name);};
return spoColSummary(d,field,fv,fpat)
+'<div class="spo-panel spo-panel-story"><h4><span class="spo-step">1</span> '+t('História')+'</h4><div class="spo-hist">'+spoFmtHist(seq,20)+'</div></div>'
+'<div class="spo-panel spo-panel-story"><h4><span class="spo-step">2</span> '+t('Dominancia')+'</h4>'
+'<div class="spo-dom"><span>1. '+short+' = '+counts[0]+'×</span><span>2. '+short+' = '+counts[1]+'×</span><span>3. '+short+' = '+counts[2]+'×</span></div>'
+'<div class="spo-dom-line">Dominuje: <b>'+spoLabel(field,dom.idx)+'</b> · vek <b>'+dom.age+'</b> spinov</div></div>'
+'<div class="spo-panel spo-panel-story"><h4><span class="spo-step">3</span> '+t('Prechody')+'</h4>'
+(trans.top?'<div class="spo-kv spo-kv-top"><span>Najčastejší prechod '+short+'</span><b>'+trans.top.k.replace('→',' → ')+' · '+trans.top.c+'×</b></div>':'')
+spoTransRows(trans.sorted,9)+'</div>'
+'<div class="spo-panel spo-panel-story"><h4><span class="spo-step">4</span> '+t('Opakovania')+'</h4>'
+'<div class="spo-kv"><span>10 spinov · '+short+'</span><b>'+rep10.count+'× ('+rep10.pct+'%)</b></div>'
+'<div class="spo-kv"><span>20 spinov · '+short+'</span><b>'+rep20.count+'× ('+rep20.pct+'%)</b></div></div>'
+'<div class="spo-panel spo-panel-story"><h4><span class="spo-step">5</span> '+t('Návraty')+'</h4>'
+'<div class="spo-kv"><span>Návrat dominantného '+short+'</span><b>'+(ret?ret.count+'×'+(ret.regular?' · pravidelné':' · nepravidelné'):'—')+'</b></div></div>'
+'<div class="spo-panel spo-panel-story"><h4><span class="spo-step">6</span> '+t('Sila patternu')+'</h4>'
+'<div class="spo-kv"><span>Sila · '+short+'</span><b>'+fs.emoji+' '+fv.sila+'</b></div></div>'
+'<div class="spo-panel spo-panel-story"><h4><span class="spo-step">7</span> '+t('Stabilita')+'</h4>'
+'<div class="spo-kv"><span>Stabilita · '+short+'</span><b>'+stab+' %</b></div></div>'
+'<div class="spo-panel spo-panel-story"><h4><span class="spo-step">8</span> '+t('Riziko zlomu')+'</h4>'
+'<div class="spo-kv"><span>Riziko zlomu · '+short+'</span><b class="'+spoRiskCls(risk)+'">'+risk+'</b></div></div>'
+'<div class="spo-panel spo-panel-story"><h4><span class="spo-step">9</span> '+t('Pamäť patternov')+'</h4>'
+(d.memory
?'<p class="spo-mem">Podobný kombinovaný vzorec (tucet + stĺpec) bol medzi spinmi <b>'+d.memory.from+'–'+d.memory.to+'</b> (pred '+d.memory.ago+' spinmi).</p>'
:'<div class="spo-muted">Zatiaľ nenašiel podobnú kombináciu tuctov a stĺpcov v histórii.</div>')+'</div>'
+'<div class="spo-panel spo-panel-story"><h4><span class="spo-step">10</span> '+t('História zlomov')+'</h4>'
+'<div class="spo-kv"><span>Zlomy · '+short+'</span><b>'+(breaks.length?breaks.map(x=>'Spin '+x).join(' · '):'—')+'</b></div></div>'
+'<div class="spo-panel spo-panel-story spo-heat"><h4><span class="spo-step">11</span> '+t('Heatmapa')+'</h4>'+spoHeatRows(field,counts)+'</div>';
}

function renderSpinPatternObserver(){
const root=document.getElementById('spinPatternObserver');
if(!root)return;
const R=computeSpinPatternObserver();
if(!R.ready){
root.innerHTML='<div class="spo-wait">Zadaj aspoň 2 spiny — observer začne čítať históriu tuctov a stĺpcov.</div>';
return;
}
const d=R;
const domView=spoPickDominantView(d);
const pat=spoPatternState(d,domView);
const beh=spoBehaviorView(d);
root.innerHTML=
'<div class="spo-radar '+d.strength.label.toLowerCase()+'"><span class="spo-radar-tag">PATTERN RADAR</span><p>'+d.radar+'</p></div>'
+'<div class="spo-hero-row">'
+'<div class="spo-hero spo-hero-dom"><span class="spo-hero-tag">DOMINANTNÝ PATTERN</span>'
+'<div class="spo-dom-block"><span class="spo-dom-lbl">DOMINUJE:</span><div class="spo-hero-main">'+domView.dominateLabel+'</div></div>'
+(domView.transLine?'<div class="spo-dom-trans"><span class="spo-dom-lbl">NAJČASTEJŠÍ PRECHOD:</span><b>'+domView.transLine+'</b></div>':'')
+'</div>'
+'<div class="spo-hero spo-status-panel '+pat.age.cls+'"><span class="spo-hero-tag">STATUS PATTERNU</span>'
+'<div class="spo-status-row"><span>VEK:</span><b>'+domView.age+' spinov</b></div>'
+'<div class="spo-status-row '+pat.trend.cls+'"><span>TREND:</span><b>'+pat.trend.arrow+' '+spoDisplayTrend(pat.trend.label)+'</b></div>'
+'<div class="spo-status-row '+pat.phase.cls+'"><span>FÁZA:</span><b>'+pat.phase.emoji+' '+spoDisplayPhase(pat.phase.label)+'</b></div>'
+'<div class="spo-status-row"><span>SILA:</span><b>'+domView.sila+'</b></div>'
+'<div class="spo-status-row"><span>STABILITA:</span><b>'+domView.stab+' %</b></div>'
+'</div>'
+'</div>'
+'<div class="spo-change-banner'+(beh?' is-active':'')+'"><span class="spo-change-banner-tag">ZMENA SPRÁVANIA</span>'
+(beh
?'<div class="spo-change-inline"><span>Predtým: <b>'+spoLabel(beh.field,beh.prev)+'</b></span>'
+'<span class="spo-change-sep">→</span>'
+'<span>Teraz: <b class="greenTxt">'+spoLabel(beh.field,beh.next)+'</b></span></div>'
:'<span class="spo-change-banner-none">Zatiaľ bez zmeny dominantného tuctu ani stĺpca.</span>')+'</div>'
+'<div class="spo-notice-compact"><span>OBSERVER SI VŠIMOL</span><p>'+d.notice+'</p></div>'
+'<div class="spo-two-col">'
+'<div class="spo-col spo-col-doz"><div class="spo-col-head">ANALÝZA TUCTOV</div><div class="spo-col-stack">'+spoRenderFieldAnalysis(d,'doz')+'</div></div>'
+'<div class="spo-col spo-col-col"><div class="spo-col-head">ANALÝZA STĹPCOV</div><div class="spo-col-stack">'+spoRenderFieldAnalysis(d,'col')+'</div></div>'
+'</div>';
}
