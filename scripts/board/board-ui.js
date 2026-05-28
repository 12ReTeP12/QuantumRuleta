/* Board / keyboard UI — extracted from index-NOVY-V4.html */
'use strict';

function betCellHTML(label){
return '<span class="bet-glow" aria-hidden="true"></span>'
+'<span class="bet-fill" aria-hidden="true"></span>'
+'<span class="bet-label">'+label+'</span>'
+'<span class="percent">0%</span>';
}

function buildBoardHTML(label){
return betCellHTML(label);
}

function setBetPct(el,pct){
if(!el)return;
let v=parseFloat(pct);
if(isNaN(v))v=0;
v=Math.min(100,Math.max(0,v));
el.style.setProperty('--pct',v+'%');
const p=el.querySelector('.percent');
if(p)p.textContent=v.toFixed(1)+'%';
el.title='Flow pressure '+v.toFixed(1)+'% · sila flow v session (nie šanca výhry)';
el.setAttribute('data-flow-pressure',v.toFixed(1));
}

function setBetPctById(id,pct){
const el=document.getElementById(id);
if(el)setBetPct(el,pct);
}

function makeNumBtn(n,row,col){
const btn=document.createElement('button');
btn.type='button';
btn.className='bet num '+(n===0?'greenbg zero':reds.includes(n)?'red':'black');
btn.id='num-'+n;
btn.style.gridRow=String(row);
btn.style.gridColumn=String(col);
btn.innerHTML='<span class="bet-glow" aria-hidden="true"></span>'
+'<span class="bet-fill" aria-hidden="true"></span>'
+'<span class="num-val">'+n+'</span><span class="percent">0%</span>';
return btn;
}

function makeOutsideCell(id,label,row,colSpan,extraCls){
const el=document.createElement('div');
el.className='bet outside '+(extraCls||'');
el.id=id;
el.style.gridRow=String(row);
el.style.gridColumn=colSpan;
el.innerHTML=buildBoardHTML(label);
return el;
}

function buildKeyboardHTML(){
const frag=document.createDocumentFragment();
const zeroCol=document.createElement('div');
zeroCol.className='board-zero-col';
const padTop=document.createElement('div');
padTop.className='board-zero-pad';
padTop.setAttribute('aria-hidden','true');
const zero=makeNumBtn(0,2,1);
zero.className='bet num greenbg zero';
zero.style.gridRow='';
zero.style.gridColumn='';
const padBot=document.createElement('div');
padBot.className='board-zero-pad';
padBot.setAttribute('aria-hidden','true');
zeroCol.appendChild(padTop);
zeroCol.appendChild(zero);
zeroCol.appendChild(padBot);
frag.appendChild(zeroCol);
BOARD_LAYOUT.forEach((row,ri)=>{
row.forEach((n,ci)=>{frag.appendChild(makeNumBtn(n,ri+1,ci+2));});
});
for(let i=0;i<3;i++){
const col=document.createElement('div');
col.className='bet col-bet';
col.id='bet-col-'+(i+1);
col.style.gridRow=String(i+1);
col.style.gridColumn='14';
col.innerHTML=buildBoardHTML('2:1');
frag.appendChild(col);
}
frag.appendChild(makeOutsideCell('bet-dozen1','1. 12',4,'2 / 6','dozen'));
frag.appendChild(makeOutsideCell('bet-dozen2','2. 12',4,'6 / 10','dozen'));
frag.appendChild(makeOutsideCell('bet-dozen3','3. 12',4,'10 / 14','dozen'));
frag.appendChild(makeOutsideCell('bet-low','1–18',5,'2 / 4','low'));
frag.appendChild(makeOutsideCell('bet-even','Párne',5,'4 / 6','even'));
frag.appendChild(makeOutsideCell('bet-red','◆',5,'6 / 7','red-diamond'));
frag.appendChild(makeOutsideCell('bet-black','◆',5,'7 / 8','black-diamond'));
frag.appendChild(makeOutsideCell('bet-odd','Nepárne',5,'8 / 10','odd'));
frag.appendChild(makeOutsideCell('bet-high','19–36',5,'10 / 14','high'));
return frag;
}

function renderKeyboard(){
const board=document.getElementById('board');
if(!board)return;
board.innerHTML='';
board.className='board roulette-board';
board.appendChild(buildKeyboardHTML());
if(typeof bindBoardEvents==='function')bindBoardEvents();
}

function updateBoardNumbers(){
const ai=computeBoardAIPercentages();
if(!ai){
for(let i=0;i<=36;i++){
const el=document.getElementById('num-'+i);
if(el)setBetPct(el,0);
}
['bet-dozen1','bet-dozen2','bet-dozen3','bet-col-1','bet-col-2','bet-col-3',
'bet-low','bet-even','bet-red','bet-black','bet-odd','bet-high'].forEach(id=>setBetPctById(id,0));
return;
}
let peak=0,minP=99;
for(let i=0;i<=36;i++){const v=ai.nums[i]||0;peak=Math.max(peak,v);minP=Math.min(minP,v);}
const hotThr=Math.max(4.8,peak*0.72);
const flatSpread=peak-minP<2.2;
for(let i=0;i<=36;i++){
const el=document.getElementById('num-'+i);
if(!el)continue;
const pct=ai.nums[i]||0;
setBetPct(el,pct);
el.classList.remove('hot-number','cluster-active','flow-dominant','flow-flat');
if(pct>=hotThr)el.classList.add('hot-number');
if(peak>0&&pct>=peak*0.92)el.classList.add('flow-dominant');
if(flatSpread)el.classList.add('flow-flat');
}
function setMacroBetPct(id,pct,isDominant,isFlat){
setBetPctById(id,pct);
const el=document.getElementById(id);
if(!el)return;
el.classList.remove('hot-number','flow-dominant','flow-flat');
if(isDominant)el.classList.add('flow-dominant');
if(isFlat)el.classList.add('flow-flat');
}
const macroPeak=Math.max.apply(null,ai.dozens.concat(ai.cols,[ai.low,ai.high,ai.even,ai.odd,ai.red,ai.black]));
const macroMin=Math.min.apply(null,ai.dozens.concat(ai.cols,[ai.low,ai.high,ai.even,ai.odd,ai.red,ai.black]));
const macroFlat=macroPeak-macroMin<3.5;
const maxD=Math.max(ai.dozens[0],ai.dozens[1],ai.dozens[2]);
const maxC=Math.max(ai.cols[0],ai.cols[1],ai.cols[2]);
setMacroBetPct('bet-dozen1',ai.dozens[0],ai.dozens[0]>=maxD*0.98,macroFlat);
setMacroBetPct('bet-dozen2',ai.dozens[1],ai.dozens[1]>=maxD*0.98,macroFlat);
setMacroBetPct('bet-dozen3',ai.dozens[2],ai.dozens[2]>=maxD*0.98,macroFlat);
setMacroBetPct('bet-col-1',ai.cols[0],ai.cols[0]>=maxC*0.98,macroFlat);
setMacroBetPct('bet-col-2',ai.cols[1],ai.cols[1]>=maxC*0.98,macroFlat);
setMacroBetPct('bet-col-3',ai.cols[2],ai.cols[2]>=maxC*0.98,macroFlat);
setMacroBetPct('bet-low',ai.low,ai.low>=Math.max(ai.low,ai.high)*0.98,macroFlat);
setMacroBetPct('bet-even',ai.even,ai.even>=Math.max(ai.even,ai.odd)*0.98,macroFlat);
setMacroBetPct('bet-red',ai.red,ai.red>=Math.max(ai.red,ai.black)*0.98,macroFlat);
setMacroBetPct('bet-black',ai.black,ai.black>=Math.max(ai.red,ai.black)*0.98,macroFlat);
setMacroBetPct('bet-odd',ai.odd,ai.odd>=Math.max(ai.even,ai.odd)*0.98,macroFlat);
setMacroBetPct('bet-high',ai.high,ai.high>=Math.max(ai.low,ai.high)*0.98,macroFlat);
const pr=computeAIPrediction();
const clusterNums=pr?getClusters()[0].nums:(spins.length?getClusters()[0].nums:[]);
if(clusterNums&&clusterNums.length){
clusterNums.forEach(n=>{
const el=document.getElementById('num-'+n);
if(el)el.classList.add('cluster-active');
});
}
}

function renderBoard(){
updateBoardNumbers();
}

var updateBoard=updateBoardNumbers;
