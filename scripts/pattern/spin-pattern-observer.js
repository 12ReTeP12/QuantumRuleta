/**
 * Pattern Observer — Balík 9F (produkčný modul z index-NOVY-V2.html)
 * Závisí: state.js (spins), constants.js (reds), helpers.js (getDozen, getColumn)
 * Voliteľne: chaosState · renderTuctyStlpceTip volá kbFlowBoxHTML (V2 inline, runtime)
 */
'use strict';

var tsModuleState={dozHits:0,dozMisses:0,colHits:0,colMisses:0,lastDozTopTwo:null,lastColTopTwo:null,scoreLog:[]};

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

function spoDominantTieInfo(counts){
let max=-1;
counts.forEach(v=>{if(v>max)max=v;});
if(max<=0)return{isTie:false,idx:0,tied:[0],max:0};
const tied=[];
counts.forEach((v,i)=>{if(v===max)tied.push(i);});
return{isTie:tied.length>1,idx:tied[0],tied,max};
}

function spoDomDisplayLabel(field,idx,counts){
const info=spoDominantTieInfo(counts);
if(info.isTie)return 'Remíza — '+info.tied.map(i=>spoHumanShort(field,i)).join(' a ');
return spoHumanName(field,idx);
}

function spoDomDisplayRolling(field,seq,domIdx){
const win=Math.min(15,seq.length||0);
const slice=seq.slice(-win);
if(!slice.length)return spoHumanName(field,domIdx);
return spoDomDisplayLabel(field,domIdx,spoCountBins(slice));
}

function spoBreaksExplain(field,breaks){
const unit=field==='doz'?'tuctov':'stĺpcov';
if(!breaks.length)return 'Zatiaľ bez výraznej zmeny dominantného '+(field==='doz'?'tuctu':'stĺpca')+'.';
return 'Dominancia v rade '+unit+' sa zmenila po '+breaks.map(n=>n+'.')+' kroku. '
+'Krok = jeden spin s číslom (0 sa nepočíta) — nie je to číslo vľavo z klávesnice.';
}

function spoMemoryPanelText(field,memory){
const unit=field==='doz'?'tuctov':'stĺpcov';
if(!memory)return '<p class="spo-muted">V histórii '+unit+' zatiaľ nemáme podobný sled.</p>';
return '<p class="spo-mem">Podobný sled '+unit+' už bol medzi '+memory.from+'. a '+memory.to+'. krokom (pred '+memory.ago+' krokmi).</p>';
}

function spoLabel(field,idx){return(idx+1)+'. '+(field==='doz'?'TUCET':'STĹPEC');}

function spoHumanName(field,idx){
const n=idx+1;
if(field==='doz')return n===1?'prvý tucet (1–12)':n===2?'druhý tucet (13–24)':'tretí tucet (25–36)';
return n===1?'prvý stĺpec (1, 4, 7…)':n===2?'druhý stĺpec (2, 5, 8…)':'tretí stĺpec (3, 6, 9…)';
}
function spoHumanShort(field,idx){
const n=idx+1;
return field==='doz'?n+'. tucet':n+'. stĺpec';
}
function spoTransExplain(k,field){
const p=k.split('→');
if(p.length!==2)return k;
return 'z '+spoHumanShort(field,+p[0]-1)+' na '+spoHumanShort(field,+p[1]-1);
}
function spoRepeatQual(pct){
if(pct>=60)return 'často — viac než bežne';
if(pct>=45)return 'celkom často';
if(pct>=33)return 'priemerne';
if(pct>=20)return 'občas';
return 'zriedka';
}
function spoRepeatExplain(field,domIdx,rep){
const w=rep.window||10;
return 'Za posledných '+w+' spinov padol '+spoHumanName(field,domIdx)+' '+rep.count+'× ('+rep.pct+' % času) — '+spoRepeatQual(rep.pct)+'.';
}
function spoRepeatSentence(field,domIdx,rep){
const w=rep.window||10;
return 'Za posledných '+w+' spinov padol '+spoHumanName(field,domIdx)+' '+rep.count+'×.';
}
function spoReturnSentence(field,domIdx,ret){
const name=spoHumanName(field,domIdx);
const cap=name.charAt(0).toUpperCase()+name.slice(1);
if(!ret)return 'Zatiaľ sa '+name+' nevracia výrazne.';
let s=cap+' sa počas relácie vrátil '+ret.count+'×';
return s+(ret.regular?' v približne rovnakých odstupoch.':', ale nie pravidelne.');
}
function spoPanelWrap(level,step,title,inner){
const cls=level==='key'?'spo-panel spo-panel-primary':level==='quiet'?'spo-panel spo-panel-quiet':'spo-panel spo-panel-secondary';
return '<div class="'+cls+'"><h4><span class="spo-step">'+step+'</span> '+title+'</h4>'+inner+'</div>';
}

function spoGlanceTrendWords(pat){
if(pat.trend.key==='SILNIE')return{short:'Silnie',line:'Držanie sa posilňuje.'};
if(pat.trend.key==='SLABNE')return{short:'Slabne',line:'Držanie oslabuje.'};
return{short:'Drží sa',line:'Držanie je zatiaľ rovnaké.'};
}

function spoObserverNoticeField(data,field){
const parts=[];
const dom=field==='doz'?data.dozDom:data.colDom;
const breakRisk=field==='doz'?data.dozBreakRisk:data.colBreakRisk;
const domTrans=field==='doz'?data.dozTrans:data.colTrans;
const rep10=field==='doz'?data.dozRepeat10:data.colRepeat10;
const unit=field==='doz'?'tuctoch':'stĺpcoch';
if((data.chaosHint||0)>=65)parts.push({w:9,text:'Výsledky sa veľmi striedajú — v '+unit+' je ťažké určiť pevného lídra.'});
if(rep10.count>=5)parts.push({w:rep10.count,text:'V posledných '+rep10.window+' krokoch sa často vracia '+spoHumanName(field,dom.idx)+' ('+rep10.count+'×).'});
const ret=field==='doz'?data.dozReturn:data.colReturn;
if(ret&&ret.count>=4){
parts.push({w:ret.count+(ret.regular?3:0),
text:spoHumanName(field,dom.idx)+' sa opakovane vracia'+(ret.regular?' v približne rovnakých odstupoch.':' — nie v pravidelných intervaloch.')});
}
if(domTrans.top&&domTrans.top.c>=3){
parts.push({w:domTrans.top.c,text:'Často sa strieda '+spoTransExplain(domTrans.top.k,field)+' ('+domTrans.top.c+'×).'});
}
if(data.behaviorChange&&data.behaviorChange.field===field){
const bc=data.behaviorChange;
parts.push({w:10,text:'Zmena: namiesto '+spoHumanName(field,bc.prev)+' teraz častejšie padá '+spoHumanName(field,bc.next)+'.'});
}
if(dom.age>=8&&breakRisk==='VYSOKÉ'){
parts.push({w:7,text:spoHumanName(field,dom.idx)+' už dlho dominuje — vzorec môže čoskoro prasknúť.'});
}
if(!parts.length){
if(spoNumsOnly(spins).length<4)return'Ešte je málo spinov — po pár ďalších uvidíš zrozumiteľnejší obraz.';
return'Zatiaľ nevidím výrazný opakujúci sa vzorec v '+unit+'.';
}
parts.sort((a,b)=>b.w-a.w);
return parts[0].text;
}

function spoRenderFieldGlance(d,field,fv,fpat){
const seq=field==='doz'?d.dozSeq:d.colSeq;
const risk=fv.risk;
const riskH=spoRiskHuman(risk);
const trend=spoGlanceTrendWords(fpat);
const domLabel=spoDomDisplayRolling(field,seq,fv.dom.idx);
const tag=field==='doz'?'TUCTOV':'STĹPCOV';
const leadHead=domLabel.indexOf('Remíza')===0?'Teraz '+domLabel.toLowerCase():'Teraz dominuje '+domLabel;
const lead=leadHead+', smer '+trend.short.toLowerCase()+', fáza „'+spoDisplayPhase(fpat.phase.label)+'“, šanca zmeny '+riskH.short.toLowerCase()+'.';
return '<div class="spo-glance spo-glance-field" role="region" aria-label="Záver '+tag+'">'
+'<span class="spo-glance-tag">Zhrnutie — '+tag+'</span>'
+'<p class="spo-glance-lead">'+lead+'</p>'
+'<ul class="spo-glance-grid">'
+'<li><span>Kto dominuje</span><b>'+domLabel+'</b></li>'
+'<li><span>Trend</span><b class="'+fpat.trend.cls+'">'+fpat.trend.arrow+' '+spoDisplayTrend(fpat.trend.label)+'</b></li>'
+'<li><span>Fáza</span><b class="'+fpat.phase.cls+'">'+fpat.phase.emoji+' '+spoDisplayPhase(fpat.phase.label)+'</b></li>'
+'<li><span>Sila</span><b>'+fv.sila+'</b></li>'
+'<li><span>Stabilita</span><b>'+fv.stab+' %</b></li>'
+'<li><span>Šanca zmeny</span><b class="'+spoRiskCls(risk)+'">'+riskH.short+'</b></li>'
+'</ul></div>';
}

function spoRenderFieldHeroMain(d,field,fv){
const trans=field==='doz'?d.dozTrans:d.colTrans;
const tag=field==='doz'?'Čo sa deje s tuctami':'Čo sa deje so stĺpcami';
return '<div class="spo-hero spo-hero-field">'
+'<span class="spo-hero-tag">'+tag+'</span>'
+(trans.top
?'<div class="spo-dom-trans"><span class="spo-dom-lbl">Najčastejšie striedanie</span><b>'+spoTransExplain(trans.top.k,field)+' ('+trans.top.c+'×)</b></div>'
:(field==='doz'?'<p class="spo-muted">Zatiaľ sa tucty výrazne nestriedajú.</p>':'<p class="spo-muted">Zatiaľ sa stĺpce výrazne nestriedajú.</p>'))
+'<div class="spo-status-row"><span>Ako dlho to trvá</span><b>'+spoDomAgeWords(fv.dom.age)+'</b></div>'
+'</div>';
}

function spoRenderFieldNoticeBlock(d,field){
const tag=field==='doz'?'Čo vyniká — tucty':'Čo vyniká — stĺpce';
return '<div class="spo-notice-compact"><span>'+tag+'</span><p>'+spoObserverNoticeField(d,field)+'</p></div>';
}

function spoRenderFieldChangeBlock(d,field){
const bc=d.behaviorChange;
const tag=field==='doz'?'Zmena lídra — tucty':'Zmena lídra — stĺpce';
const active=bc&&bc.field===field;
const none=field==='doz'?'Dominantný tucet sa zatiaľ výrazne nezmenil.':'Dominantný stĺpec sa zatiaľ výrazne nezmenil.';
return '<div class="spo-change-banner'+(active?' is-active':'')+'"><span class="spo-change-banner-tag">'+tag+'</span>'
+(active
?'<div class="spo-change-inline"><span>Predtým: <b>'+spoHumanName(field,bc.prev)+'</b></span>'
+'<span class="spo-change-sep">→</span>'
+'<span>Teraz: <b class="yellowTxt">'+spoHumanName(field,bc.next)+'</b></span></div>'
:'<span class="spo-change-banner-none">'+none+'</span>')+'</div>';
}
function spoStabLine(field,stab,domIdx){
const n=spoHumanName(field,domIdx);
if(stab>=68)return stab+' % — väčšinou padá '+n;
if(stab>=45)return stab+' % — strieda sa, ale často sa vracia k '+n;
if(stab>=25)return stab+' % — slabo sa drží '+n;
return stab+' % — '+n+' padá len výnimočne';
}
function spoRiskHuman(risk){
if(risk==='VYSOKÉ')return{short:'Vysoká',line:'Líder môže čoskoro vymeniť — drží to už dlho.'};
if(risk==='STREDNÉ')return{short:'Stredná',line:'Možná zmena — líder už dlhšie drží.'};
return{short:'Nízka',line:'Líder zatiaľ drží — zmena nie je na spadnutie.'};
}
function spoFmtHistHuman(seq,max,field){
const s=seq.slice(-max);
if(!s.length)return 'zatiaľ nič';
return s.map(x=>spoHumanShort(field,+x-1)).join(' → ');
}
function spoCountsLine(field,counts){
return[0,1,2].map(i=>spoHumanShort(field,i)+': '+counts[i]+'×').join(' · ');
}
function spoDomAgeWords(age){
if(age<=1)return 'práve sa ustálil';
if(age<=5)return 'krátko ('+age+' spinov)';
if(age<=14)return 'už chvíľu ('+age+' spinov)';
return 'dlho ('+age+' spinov)';
}
function spoDisplayRisk(r){return spoRiskHuman(r).short;}

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
if(d.count>=5)parts.push({w:d.count,text:'V posledných '+d.window+' spinoch sa často vracia '+spoHumanName('doz',data.dozDom.idx)+' ('+d.count+'×).'});
const c=data.colRepeat10;
if(c.count>=5)parts.push({w:c.count,text:'V posledných '+c.window+' spinoch sa často vracia '+spoHumanName('col',data.colDom.idx)+' ('+c.count+'×).'});
if(data.dozReturn&&data.dozReturn.count>=4){
parts.push({w:data.dozReturn.count+(data.dozReturn.regular?3:0),
text:spoHumanName('doz',data.dozDom.idx)+' sa opakovane vracia'+(data.dozReturn.regular?' v približne rovnakých odstupoch.':' — nie v pravidelných intervaloch.')});
}
if(domTrans.top&&domTrans.top.c>=3){
parts.push({w:domTrans.top.c,text:'Často sa strieda '+spoTransExplain(domTrans.top.k,field)+' ('+domTrans.top.c+'×) — '+ (field==='doz'?'tucty':'stĺpce')+' sa často menia touto dvojicou.'});
}
if(data.behaviorChange){
const bc=data.behaviorChange;
parts.push({w:10,text:'Zmena: namiesto '+spoHumanName(bc.field,bc.prev)+' teraz častejšie padá '+spoHumanName(bc.field,bc.next)+'.'});
}
if(dom.age>=8&&breakRisk==='VYSOKÉ'){
parts.push({w:7,text:spoHumanName(field,dom.idx)+' už dlho dominuje — vzorec môže čoskoro prasknúť.'});
}
if(!parts.length){
if(spins.length<4)return'Ešte je málo spinov — po pár ďalších uvidíš zrozumiteľnejší obraz.';
return'Zatiaľ nevidím výrazný opakujúci sa vzorec v tuctoch ani stĺpcoch.';
}
parts.sort((a,b)=>b.w-a.w);
return parts[0].text;
}

function spoPatternRadar(data){
if(spins.length<3)return'Ešte je málo spinov — po pár ďalších bude obraz jasnejší.';
const field=spoPickDominantField(data);
const dom=field==='doz'?data.dozDom:data.colDom;
const breakRisk=field==='doz'?data.dozBreakRisk:data.colBreakRisk;
if((data.chaosHint||0)>=65)return'Výsledky sa veľmi striedajú — ťažko z nich vyčítať pevný vzorec.';
if(data.behaviorChange)return'Mení sa smer: silnejší je teraz '+spoHumanName(data.behaviorChange.field,data.behaviorChange.next)+'.';
if(dom.age>=10&&breakRisk!=='NÍZKE'){
return spoHumanName(field,dom.idx)+' stále drží, ale už dlho — môže prísť zlom.';
}
const domTrans=field==='doz'?data.dozTrans:data.colTrans;
if(domTrans.top&&domTrans.top.c>=4){
return'Často sa opakuje striedanie: '+spoTransExplain(domTrans.top.k,field)+'.';
}
if(data.strength.label==='Slabá')return'Žiadny tucet ani stĺpec zatiaľ výrazne nevládne — je to skôr rozptýlené.';
return'V tuctoch aj stĺpcoch je z histórie viditeľné pomerne ustálené správanie.';
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
ready:spoNumsOnly(spins).length>=2,
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

function spoTransRows(sorted,limit,field){
if(!sorted.length)return'<div class="spo-muted">Zatiaľ bez výrazného striedania.</div>';
return'<div class="spo-trans-list">'+sorted.slice(0,limit).map(x=>'<div class="spo-trans-row"><span>'+spoTransExplain(x.k,field)+'</span><b>'+x.c+'×</b></div>').join('')+'</div>';
}

function spoHeatRows(field,counts){
return[0,1,2].map(i=>'<div class="spo-heat-row"><span>'+spoHumanShort(field,i)+'</span><b>'+counts[i]+'×</b></div>').join('');
}

function spoPickDominantView(d){
const field=d.domField||spoPickDominantField(d);
const fv=spoFieldView(d,field);
const dom=fv.dom;
const trans=field==='doz'?d.dozTrans.top:d.colTrans.top;
const type=field==='doz'?'TUCET':'STĹPEC';
const seq=field==='doz'?d.dozSeq:d.colSeq;
const dominateLabel=spoDomDisplayRolling(field,seq,dom.idx);
const transLine=trans?spoTransExplain(trans.k,field)+' ('+trans.c+'×)':null;
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
const u=field==='doz'?'tuctov':'stĺpcov';
const m={
'História':'Posledné '+u,
'Dominancia':'Kto teraz vedie',
'Prechody':'Ako sa striedajú',
'Opakovania':'Koľkokrát padá ten istý',
'Návraty':'Návraty lídra',
'Sila patternu':'Ako silno drží',
'Stabilita':'Ako často padá líder',
'Riziko zlomu':'Šanca zmeny lídra',
'Pamäť patternov':'Podobný sled v minulosti',
'História zlomov':'Kedy sa menil líder',
'Prehľad počtov':'Počty v celej histórii'
};
return m[name]||name;
}

function spoColSummary(d,field,fv,fpat){
const rep10=field==='doz'?d.dozRepeat10:d.colRepeat10;
const seq=field==='doz'?d.dozSeq:d.colSeq;
const hint=field==='doz'?'Stručné zhrnutie tuctov':'Stručné zhrnutie stĺpcov';
const recent=spoFmtHistHuman(seq,6,field);
return '<div class="spo-col-summary" role="group" aria-label="'+hint+'">'
+'<div class="spo-col-summary-head"><span class="spo-col-tag">'+(field==='doz'?'TUCTY':'STĹPCE')+'</span><span class="spo-col-summary-hint">'+hint+'</span></div>'
+'<div class="spo-summary-grid">'
+'<div class="spo-sum-row spo-sum-key"><span>Opakovania</span><b>'+spoRepeatSentence(field,fv.dom.idx,rep10)+'</b></div>'
+'<div class="spo-sum-row spo-sum-wide"><span>Posledných 6 krokov</span><b>'+recent+'</b></div>'
+'</div></div>';
}
function shortLabel(field){return field==='doz'?'tucty':'stĺpce';}

function spoRenderFieldDetails(d,field){
const isDoz=field==='doz';
const short=isDoz?'tucet':'stĺpec';
const fv=spoFieldView(d,field);
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
const t=function(name){return spoPanelTitle(field,name);};
const riskH=spoRiskHuman(risk);
const transLead=trans.top
?'<p class="spo-lead-strong">Najčastejšie: '+spoTransExplain(trans.top.k,field)+' ('+trans.top.c+'×).</p>'
:'<p class="spo-lead">Zatiaľ bez výrazného striedania.</p>';
return spoPanelWrap('mid','1',t('História'),'<div class="spo-hist">'+spoFmtHistHuman(seq,20,field)+'</div><p class="spo-muted">Zľava doprava — každý krok = jeden spin s číslom (0 sa nepočíta).</p>')
+spoPanelWrap('key','2',t('Dominancia'),
(function(){
const tot=spoDominantTieInfo(counts);
let sub='Drží sa '+spoDomAgeWords(dom.age)+'. Počty: '+spoCountsLine(field,counts)+'.';
if(tot.isTie)sub+=' V celej histórii je remíza medzi '+tot.tied.map(i=>spoHumanShort(field,i)).join(' a ')+'.';
return '<p class="spo-lead">'+sub+'</p><p class="spo-muted">Líder v závere hore je vypočítaný z posledných 15 krokov.</p>';
})())
+spoPanelWrap('key','3',t('Prechody'),transLead+spoTransRows(trans.sorted,6,field))
+spoPanelWrap('key','4',t('Opakovania'),
'<p class="spo-lead">'+spoRepeatSentence(field,dom.idx,rep10)+'</p>'
+'<p class="spo-lead-sub">'+spoRepeatSentence(field,dom.idx,rep20)+'</p>')
+spoPanelWrap('mid','5',t('Návraty'),'<p class="spo-lead">'+spoReturnSentence(field,dom.idx,ret)+'</p>')
+spoPanelWrap('mid','6',t('Sila patternu'),'<p class="spo-lead">Sila držania: '+fv.sila+' — '+(fv.sila==='Vysoká'?'drží sa pevne':fv.sila==='Stredná'?'drží sa čiastočne':'slabo drží')+'.</p>')
+spoPanelWrap('mid','7',t('Stabilita'),'<p class="spo-lead">'+spoStabLine(field,stab,dom.idx)+'</p>')
+spoPanelWrap('key','8',t('Riziko zlomu'),
'<p class="spo-risk-lead '+spoRiskCls(risk)+'">'+riskH.short+'</p>'
+'<p class="spo-lead-sub">'+riskH.line+'</p>')
+spoPanelWrap('quiet','9',t('Pamäť patternov'),spoMemoryPanelText(field,d.memory))
+spoPanelWrap('quiet','10',t('História zlomov'),'<p class="spo-mem">'+spoBreaksExplain(field,breaks)+'</p>')
+spoPanelWrap('quiet','11',t('Prehľad počtov'),'<p class="spo-muted">Koľkokrát padol každý '+short+' v celej histórii.</p>'+spoHeatRows(field,counts));
}

function spoRenderFieldColumn(d,field){
const fv=spoFieldView(d,field);
const fpat=spoPatternState(d,fv);
return spoRenderFieldGlance(d,field,fv,fpat)
+spoColSummary(d,field,fv,fpat)
+spoRenderFieldHeroMain(d,field,fv)
+spoRenderFieldNoticeBlock(d,field)
+spoRenderFieldChangeBlock(d,field)
+spoRenderFieldDetails(d,field);
}

function renderSpinPatternObserver(){
const root=document.getElementById('spinPatternObserver');
if(!root)return;
const R=computeSpinPatternObserver();
if(!R.ready){
root.innerHTML='<div class="spo-wait">Zadaj aspoň 2 spiny s číslom (0 sa nepočíta). Vľavo uvidíš tucty, vpravo stĺpce — každý stĺpec je samostatný príbeh.</div>';
return;
}
const d=R;
root.innerHTML=
'<div class="spo-two-col">'
+'<div class="spo-col spo-col-doz spo-col-world"><div class="spo-col-head">Tucty</div><div class="spo-col-stack">'+spoRenderFieldColumn(d,'doz')+'</div></div>'
+'<div class="spo-col spo-col-col spo-col-world"><div class="spo-col-head">Stĺpce</div><div class="spo-col-stack">'+spoRenderFieldColumn(d,'col')+'</div></div>'
+'</div>';
}

/* TUCTY A STĹPCE — výstupná vrstva · odporúčania z Pattern Observer · % = reálna hit-rate modulu */
function tsModuleResetState(){
return{dozHits:0,dozMisses:0,colHits:0,colMisses:0,lastDozTopTwo:null,lastColTopTwo:null,scoreLog:[]};
}
function tsModuleResetAll(){
tsModuleState=tsModuleResetState();
}
function tsReadTopTwo(counts,domIdx){
const ranked=[0,1,2].map(i=>({i,c:counts[i]})).sort((a,b)=>{
if(b.c!==a.c)return b.c-a.c;
if(a.i===domIdx)return -1;
if(b.i===domIdx)return 1;
return a.i-b.i;
});
let a=ranked[0].i,b=ranked[1].i;
if(a>b){const t=a;a=b;b=t;}
return[a,b];
}
function tsReadPlaySignal(R){
const dv=spoFieldView(R,'doz'),cv=spoFieldView(R,'col');
if(dv.fs.label==='Silná'&&cv.fs.label==='Silná'&&dv.risk!=='VYSOKÉ'&&cv.risk!=='VYSOKÉ')
return{emoji:'🟢',label:'HRAŤ',key:'hrat'};
if((dv.fs.label==='Slabá'&&cv.fs.label==='Slabá')||(dv.risk==='VYSOKÉ'&&cv.risk==='VYSOKÉ'))
return{emoji:'🔴',label:'NEHRAŤ',key:'nehrat'};
return{emoji:'🟡',label:'ČAKAŤ',key:'cakat'};
}
function tsModuleHitPct(field){
const h=field==='doz'?tsModuleState.dozHits:tsModuleState.colHits;
const m=field==='doz'?tsModuleState.dozMisses:tsModuleState.colMisses;
const t=h+m;
return t?Math.round(h/t*100):0;
}
function tsModuleScoreSpin(number){
if(number==null||number===0)return;
const prevN=spoNumsOnly(spins).length;
/* 12 spinov = zber · odporúčanie po 12. · prvé vyhodnotenie až pri 13. spine (prevN===12) */
if(prevN<12||!tsModuleState.lastDozTopTwo)return;
const di=getDozen(number),ci=getColumn(number);
const row={dozHit:false,colHit:false,dozScored:false,colScored:false};
if(di>=0){
row.dozScored=true;
row.dozHit=tsModuleState.lastDozTopTwo.includes(di);
if(row.dozHit)tsModuleState.dozHits++;else tsModuleState.dozMisses++;
}
if(ci>=0){
row.colScored=true;
row.colHit=tsModuleState.lastColTopTwo.includes(ci);
if(row.colHit)tsModuleState.colHits++;else tsModuleState.colMisses++;
}
tsModuleState.scoreLog.push(row);
}
function tsModuleUpdateRecommendation(){
const n=spoNumsOnly(spins).length;
if(n<12){tsModuleState.lastDozTopTwo=null;tsModuleState.lastColTopTwo=null;return;}
const R=computeSpinPatternObserver();
tsModuleState.lastDozTopTwo=tsReadTopTwo(R.dozCounts,R.dozDom.idx);
tsModuleState.lastColTopTwo=tsReadTopTwo(R.colCounts,R.colDom.idx);
}
function tsModuleOnUndo(){
const row=tsModuleState.scoreLog.pop();
if(row){
if(row.dozScored){if(row.dozHit)tsModuleState.dozHits--;else tsModuleState.dozMisses--;}
if(row.colScored){if(row.colHit)tsModuleState.colHits--;else tsModuleState.colMisses--;}
}
if(spoNumsOnly(spins).length<12)tsModuleResetAll();
else tsModuleUpdateRecommendation();
}
function tsModuleRecomputeFromHistory(){
tsModuleResetAll();
const full=spins.slice();
const validN=spoNumsOnly(full).length;
if(validN<12)return;
if(validN===12){
const R=computeSpinPatternObserver();
tsModuleState.lastDozTopTwo=tsReadTopTwo(R.dozCounts,R.dozDom.idx);
tsModuleState.lastColTopTwo=tsReadTopTwo(R.colCounts,R.colDom.idx);
return;
}
let lastDoz=null,lastCol=null;
for(let i=0;i<full.length;i++){
const num=full[i];
const numsBefore=spoNumsOnly(full.slice(0,i)).length;
/* prvé vyhodnotenie pri numsBefore===12, ďalšie pri každom spine 13+ */
if(numsBefore>=12&&lastDoz&&num>0){
const di=getDozen(num),ci=getColumn(num);
const row={dozHit:false,colHit:false,dozScored:false,colScored:false};
if(di>=0){row.dozScored=true;row.dozHit=lastDoz.includes(di);if(row.dozHit)tsModuleState.dozHits++;else tsModuleState.dozMisses++;}
if(ci>=0){row.colScored=true;row.colHit=lastCol.includes(ci);if(row.colHit)tsModuleState.colHits++;else tsModuleState.colMisses++;}
tsModuleState.scoreLog.push(row);
}
spins=full.slice(0,i+1);
if(spoNumsOnly(spins).length>=12){
const R=computeSpinPatternObserver();
lastDoz=tsReadTopTwo(R.dozCounts,R.dozDom.idx);
lastCol=tsReadTopTwo(R.colCounts,R.colDom.idx);
}
}
spins=full;
tsModuleState.lastDozTopTwo=lastDoz;
tsModuleState.lastColTopTwo=lastCol;
}
function renderTuctyStlpceTip(){
const bannerEl=document.getElementById('tsPoBanner');
const primEl=document.getElementById('tsPoPrimary');
const rowEl=document.getElementById('tsPoRow');
if(!bannerEl||!primEl)return;
if(rowEl)rowEl.hidden=false;
function tsPoVal(kind,pair,pct){
const unit=kind==='doz'?'TUCET':'STĹPEC';
return(pair[0]+1)+' + '+(pair[1]+1)+' · '+unit+' ('+pct+'%)';
}
function tsPoBox(kind,pair,pct){
const lbl=kind==='doz'?'TUCET':'STĹPEC';
return kbFlowBoxHTML(lbl,{label:pair?tsPoVal(kind,pair,pct):'—',conf:pct||0},true,false);
}
const n=spoNumsOnly(spins).length;
if(n<12){
bannerEl.textContent='⚪ ČAKÁM';
bannerEl.className='kb-flow-banner wait';
bannerEl.title='Čaká sa na 12 spinov — Pattern Observer';
primEl.innerHTML=tsPoBox('doz',null,0)+tsPoBox('col',null,0);
return;
}
const R=computeSpinPatternObserver();
const dozPair=tsReadTopTwo(R.dozCounts,R.dozDom.idx);
const colPair=tsReadTopTwo(R.colCounts,R.colDom.idx);
const sig=tsReadPlaySignal(R);
const dozEval=tsModuleState.dozHits+tsModuleState.dozMisses;
const colEval=tsModuleState.colHits+tsModuleState.colMisses;
const dozPct=dozEval?tsModuleHitPct('doz'):0;
const colPct=colEval?tsModuleHitPct('col'):0;
bannerEl.textContent=sig.emoji+' '+sig.label;
bannerEl.className='kb-flow-banner '+(sig.key==='hrat'?'play':sig.key==='cakat'?'caution':'wait');
bannerEl.title='Tucty a stĺpce · Pattern Observer';
primEl.innerHTML=tsPoBox('doz',dozPair,dozPct)+tsPoBox('col',colPair,colPct);
}