/* Core helpers — extracted from index-NOVY-V4.html */
'use strict';

function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,v));}

function lastSpinNum(){return spins.length?spins[spins.length-1]:null;}

function getColor(n){if(n===0)return-1;return reds.includes(n)?0:1;}

function getDozen(n){if(n===0)return-1;if(n<=12)return 0;if(n<=24)return 1;return 2;}

function getColumn(n){if(n===0)return-1;return(n-1)%3;}

function normalize(value,maxRef){if(maxRef<=0)return 0;return clamp((value/maxRef)*100);}

function average(arr){if(!arr||!arr.length)return 0;return arr.reduce((a,b)=>a+b,0)/arr.length;}

var columnIndexForNum=getColumn;
var dozenIndexForNum=getDozen;
var normPct=normalize;
var idxColor=getColor;
