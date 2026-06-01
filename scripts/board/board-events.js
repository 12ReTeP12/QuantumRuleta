/* Board click events — extracted from index-NOVY-V4.html */
'use strict';

function onNumberSelect(number){
const n=parseInt(number,10);
if(isNaN(n)||n<0||n>36)return;
if(typeof onNewSpin==='function')onNewSpin(n);
else if(typeof spin==='function')spin(n);
}

function handleNumberClick(number){
onNumberSelect(number);
}

function handleBoardClick(ev){
const t=ev.target;
if(!t||!t.closest)return;
const btn=t.closest('button.bet.num');
if(!btn||!btn.id||btn.id.indexOf('num-')!==0)return;
const n=parseInt(btn.id.slice(4),10);
if(!isNaN(n))handleNumberClick(n);
}

function bindBoardEvents(){
const board=document.getElementById('board');
if(!board||board.dataset.boardEventsBound==='1')return;
board.dataset.boardEventsBound='1';
board.addEventListener('click',handleBoardClick);
}
