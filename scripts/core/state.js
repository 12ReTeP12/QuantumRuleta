/* Core state — extracted from index-NOVY-V4.html */
'use strict';

let spins=[];
let history=[];

let sessionState={mode:'WARMUP',label:'Rozcvička',score:0,flags:{}};
let chaosState={chaosLevel:50,tag:'—',noEdge:false,score:50};
let aiState={state:'OBSERVE',label:'Sledovanie',aggression:0.55,confMult:1,allowRisky:true,allowAttack:false};

Object.defineProperty(globalThis,'sessionIntel',{get(){return sessionState;},set(v){sessionState=v;},configurable:true,enumerable:true});
Object.defineProperty(globalThis,'aiStateMachine',{get(){return aiState;},set(v){aiState=v;},configurable:true,enumerable:true});
