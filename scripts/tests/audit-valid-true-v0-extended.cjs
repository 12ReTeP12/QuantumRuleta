/**
 * Rozšírený technický audit TRUE VALID V0 — bez zmien produkčného kódu.
 * Spustenie: npx electron scripts/tests/audit-valid-true-v0-extended.cjs
 */
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V2.html');
const outDir = path.join(root, 'valid-true-export');
const outJson = path.join(outDir, 'audit-valid-true-v0-extended-report.json');

const findings = [];
function pass(name, msg) {
  findings.push({ status: 'PASS', name, msg });
  console.log('PASS:', name, '—', msg);
}
function warn(name, msg) {
  findings.push({ status: 'WARNING', name, msg });
  console.warn('WARNING:', name, '—', msg);
}
function fail(name, msg) {
  findings.push({ status: 'FAIL', name, msg });
  console.error('FAIL:', name, '—', msg);
}

app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1400,
    height: 900,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  const consoleErrors = [];
  win.webContents.on('console-message', (_e, _level, message) => {
    if (/error|exception|uncaught|ValidTrueV0/i.test(message) && /error|failed/i.test(message))
      consoleErrors.push(message);
  });

  try {
    await win.loadFile(htmlPath);
    await new Promise((r) => setTimeout(r, 2500));

    const audit = await win.webContents.executeJavaScript(`(async function(){
      const R = { checks: [], meta: {} };
      function pass(n,m){R.checks.push({status:'PASS',name:n,msg:m});}
      function warn(n,m){R.checks.push({status:'WARNING',name:n,msg:m});}
      function fail(n,m){R.checks.push({status:'FAIL',name:n,msg:m});}

      if(typeof ValidTrueV0==='undefined'){fail('bootstrap','ValidTrueV0 missing');return R;}
      pass('bootstrap','ValidTrueV0 present');

      const BASELINE=12/37;
      const origCE=typeof computeConfidenceEngine==='function'?computeConfidenceEngine:null;
      let gateOverride=null;
      if(origCE)window.computeConfidenceEngine=function(){return gateOverride||origCE();};

      function setGate(o){gateOverride=o;}
      function wilson(h,n){const z=1.96;if(!n)return null;const p=h/n,den=1+(z*z)/n,centre=p+(z*z)/(2*n);const margin=z*Math.sqrt((p*(1-p)+(z*z)/(4*n))/n);return{low:+(((centre-margin)/den)*100).toFixed(2),high:+(((centre+margin)/den)*100).toFixed(2)};}
      function recompute(recs){
        let h=0,m=0,fpM=0,fpS=0;
        recs.forEach(r=>{
          if(r.outcome.column==='hit'){h++;m++;}
          else if(r.outcome.column==='miss')m++;
          if(r.signal.code==='PLAY'&&(r.outcome.column==='hit'||r.outcome.column==='miss')){
            fpS++;if(r.outcome.column==='miss')fpM++;
          }
        });
        const rate=m?+((h/m)*100).toFixed(2):null;
        const fp=fpS?+((fpM/fpS)*100).toFixed(2):null;
        const w=wilson(h,m);
        let edge='unknown';
        const pp=rate!=null?+(rate-BASELINE*100).toFixed(2):null;
        if(m<100)edge='unknown';
        else if(pp!=null&&pp<2)edge='unlikely';
        else if(pp!=null&&pp>=5&&w&&w.low>BASELINE*100)edge='possible';
        else if(pp!=null&&pp>=8&&m>=300)edge='likely';
        return{h,m,rate,fp,w,edge};
      }

      /* --- Signály --- */
      ValidTrueV0.resetSession();
      setGate({status:'HRAŤ',playMode:'HRAŤ',chaosPct:30,learn:false,allowPlay:true});
      predLastPick={col:1,doz:0,colPick:'2nd',dozPick:'1st'};
      let r=ValidTrueV0.onSpinScored(14);
      if(r&&r.signal.code==='PLAY'&&r.outcome.column!=='excluded')pass('mode-play','PLAY scored column');
      else fail('mode-play',JSON.stringify(r&&r.signal));

      setGate({status:'ČAKAJ',playMode:'ČAKAJ',chaosPct:50,learn:false,allowPlay:false});
      r=ValidTrueV0.onSpinScored(2);
      if(r&&r.signal.code==='WAIT'&&r.outcome.column==='excluded')pass('mode-wait','WAIT excluded');
      else fail('mode-wait',JSON.stringify(r&&r.signal));

      setGate({status:'ČAKAJ',playMode:'ČAKAJ',chaosPct:50,learn:true,allowPlay:false});
      r=ValidTrueV0.onSpinScored(8);
      if(r&&r.signal.code==='LEARN')pass('mode-learn','LEARN');
      else fail('mode-learn',JSON.stringify(r&&r.signal));

      setGate({status:'OPATRNE',playMode:'OPATRNE',chaosPct:55,learn:false,allowPlay:false});
      r=ValidTrueV0.onSpinScored(21);
      if(r&&r.signal.code==='CAUTION')pass('mode-caution','CAUTION');
      else fail('mode-caution',JSON.stringify(r&&r.signal));

      setGate({status:'HRAŤ',playMode:'HRAŤ',chaosPct:30,learn:false,allowPlay:true});
      predLastPick={col:-1,doz:0};
      r=ValidTrueV0.onSpinScored(9);
      if(r&&r.signal.code==='PLAY_NO_PICK'&&r.outcome.column==='excluded')pass('edge-play-no-pick','PLAY_NO_PICK');
      else warn('edge-play-no-pick',JSON.stringify(r&&r.signal));

      setGate(null);
      r=ValidTrueV0.onSpinScored(10);
      if(r&&r.signal.code==='UNKNOWN'||!r)pass('edge-null-gate','gate null tolerated');
      else warn('edge-null-gate','code='+(r&&r.signal.code));

      /* --- Reset --- */
      ValidTrueV0.resetSession();
      if(ValidTrueV0.getSpinRecords().length===0)pass('reset-session','records cleared');
      else fail('reset-session','n='+ValidTrueV0.getSpinRecords().length);

      setGate({status:'HRAŤ',playMode:'HRAŤ',chaosPct:30,learn:false,allowPlay:true});
      predLastPick={col:0,doz:0,colPick:'1st',dozPick:'1st'};
      ValidTrueV0.onSpinScored(1);
      const sid1=ValidTrueV0.buildReport().aggregates.sessionId||ValidTrueV0.buildReport().sessionId;
      ValidTrueV0.resetSession();
      ValidTrueV0.onSpinScored(2);
      const rep2=ValidTrueV0.buildReport();
      const sid2=rep2.aggregates&&rep2.aggregates.sessionId;
      if(ValidTrueV0.getSpinRecords().length===1)pass('reset-new-session','single spin after reset');
      else fail('reset-new-session','n='+ValidTrueV0.getSpinRecords().length);

      if(typeof clearSessionData==='function'){
        setGate({status:'HRAŤ',playMode:'HRAŤ',chaosPct:30,learn:false,allowPlay:true});
        predLastPick={col:0,doz:0,colPick:'1st',dozPick:'1st'};
        for(let i=0;i<5;i++)ValidTrueV0.onSpinScored(1+i);
        const before=ValidTrueV0.getSpinRecords().length;
        clearSessionData();
        const after=ValidTrueV0.getSpinRecords().length;
        if(after===0)pass('reset-clearSessionData','TRUE VALID cleared with session');
        else warn('reset-clearSessionData','after clear n='+after+' before='+before);
      }else warn('reset-clearSessionData','clearSessionData not found');

      /* --- Edge: disabled, invalid spin --- */
      const wasDis=window.__validTrueDisabled;
      window.__validTrueDisabled=true;
      const dis=ValidTrueV0.onSpinScored(15);
      if(dis===null)pass('edge-disabled-flag','__validTrueDisabled blocks log');
      else fail('edge-disabled-flag','returned record');
      window.__validTrueDisabled=wasDis||false;

      ValidTrueV0.resetSession();
      setGate({status:'HRAŤ',playMode:'HRAŤ',chaosPct:30,learn:false,allowPlay:true});
      predLastPick={col:0,doz:0,colPick:'1st',dozPick:'1st'};
      const n0=ValidTrueV0.onSpinScored(0);
      const nNeg=ValidTrueV0.onSpinScored(-1);
      const nNull=ValidTrueV0.onSpinScored(null);
      if(n0===null&&nNeg===null&&nNull===null)pass('edge-invalid-spin','0/-1/null rejected');
      else fail('edge-invalid-spin','0='+(!!n0)+' -1='+(!!nNeg)+' null='+(!!nNull));

      /* --- 1000 spinov + dlhá relácia --- */
      ValidTrueV0.resetSession();
      const modes=['PLAY','WAIT','LEARN','CAUTION'];
      const counts={PLAY:0,WAIT:0,LEARN:0,CAUTION:0,OTHER:0};
      const N=1000;
      for(let i=0;i<N;i++){
        const mod=i%20;
        if(mod<12){
          setGate({status:'HRAŤ',playMode:'HRAŤ',chaosPct:25+mod,learn:false,allowPlay:true});
          predLastPick={col:i%3,doz:i%3,colPick:'x',dozPick:'x'};
        }else if(mod<15){
          setGate({status:'ČAKAJ',playMode:'ČAKAJ',chaosPct:60,learn:false,allowPlay:false});
        }else if(mod<17){
          setGate({status:'ČAKAJ',playMode:'ČAKAJ',chaosPct:60,learn:true,allowPlay:false});
        }else if(mod<19){
          setGate({status:'OPATRNE',playMode:'OPATRNE',chaosPct:50,learn:false,allowPlay:false});
        }else{
          setGate({status:'HRAŤ',playMode:'HRAŤ',chaosPct:30,learn:false,allowPlay:true});
          predLastPick={col:-1,doz:0};
        }
        const num=1+Math.floor(Math.random()*36);
        const rec=ValidTrueV0.onSpinScored(num);
        if(rec&&rec.signal&&rec.signal.code){
          if(counts[rec.signal.code]!=null)counts[rec.signal.code]++;
          else counts.OTHER=(counts.OTHER||0)+1;
        }
      }
      const recs=ValidTrueV0.getSpinRecords();
      if(recs.length===N)pass('simulate-1000','logged '+N+' spins');
      else fail('simulate-1000','got '+recs.length);

      if(counts.PLAY>500&&counts.WAIT>50&&counts.LEARN>30&&counts.CAUTION>50)
        pass('long-session-mix','PLAY='+counts.PLAY+' WAIT='+counts.WAIT+' LEARN='+counts.LEARN+' CAUTION='+counts.CAUTION);
      else warn('long-session-mix',JSON.stringify(counts));

      const exp=recompute(recs);
      const rep=ValidTrueV0.buildReport();
      const col=rep.rates.column;
      if(col.hitRatePct===exp.rate)pass('long-consistency-rate',col.hitRatePct+'%');
      else fail('long-consistency-rate','rep='+col.hitRatePct+' exp='+exp.rate);
      if(col.nScored===exp.m)pass('long-consistency-n','n='+col.nScored);
      else fail('long-consistency-n','rep='+col.nScored+' exp='+exp.m);
      if(rep.falsePositiveRatePct===exp.fp)pass('long-consistency-fp',exp.fp+'%');
      else fail('long-consistency-fp','rep='+rep.falsePositiveRatePct+' exp='+exp.fp);
      if(rep.edgePrimary===exp.edge)pass('long-consistency-edge',exp.edge);
      else fail('long-consistency-edge','rep='+rep.edgePrimary+' exp='+exp.edge);
      if(col.wilson95&&exp.w&&col.wilson95.low===exp.w.low)pass('long-consistency-wilson',JSON.stringify(col.wilson95));
      else fail('long-consistency-wilson','mismatch');

      /* localStorage cap */
      let lsLen=0;
      try{
        const raw=localStorage.getItem('validTrueV0Buffer');
        if(raw){const p=JSON.parse(raw);lsLen=p.length;if(p.length<=500)pass('long-localStorage-cap','stored '+p.length+' lines (max 500)');
        else warn('long-localStorage-cap','stored '+p.length+' > 500');}
      }catch(e){warn('long-localStorage-cap',e.message);}

      /* memory lines via export */
      const jl=ValidTrueV0.exportJsonl().split('\\n').filter(Boolean);
      const spinLines=jl.filter(l=>{try{return JSON.parse(l).type==='spin';}catch(e){return false;}}).length;
      if(spinLines===N)pass('long-export-jsonl-memory','jsonl spins='+spinLines);
      else fail('long-export-jsonl-memory','jsonl spins='+spinLines+' mem='+N);

      /* --- Exporty --- */
      try{
        const parsed=jl.map(l=>JSON.parse(l));
        if(parsed[0].type==='meta'&&parsed[0].schemaVersion==='valid-true-v0')pass('export-jsonl-meta','meta ok');
        else fail('export-jsonl-meta','bad meta');
      }catch(e){fail('export-jsonl-parse',e.message);}

      try{
        const csv=ValidTrueV0.exportCsv();
        const rows=csv.trim().split('\\n');
        if(rows.length===N+1&&rows[0].includes('signal')&&rows[0].includes('outcome_column'))
          pass('export-csv','rows='+N);
        else fail('export-csv','rows='+rows.length);
      }catch(e){fail('export-csv',e.message);}

      try{
        const sum=ValidTrueV0.buildReport();
        const ok=sum.officialVerdict==='COLUMN_ONLY'&&sum.rates&&sum.rates.column&&sum.rates.column.wilson95&&sum.edgePrimary!=null;
        if(ok)pass('export-report-json','officialVerdict+wilson+edgePrimary');
        else fail('export-report-json','missing fields');
        if(sum.aggregates&&sum.aggregates.schemaVersion==='valid-true-v0')pass('export-report-schema','aggregates.schemaVersion ok');
        else warn('export-report-schema','no aggregates.schemaVersion');
      }catch(e){fail('export-report-json',e.message);}

      /* --- Undo (long session context) --- */
      if(typeof onNewSpin==='function'&&typeof onUndoSpin==='function'){
        const nBefore=ValidTrueV0.getSpinRecords().length;
        onNewSpin(17);
        const nMid=ValidTrueV0.getSpinRecords().length;
        onUndoSpin();
        const nAfter=ValidTrueV0.getSpinRecords().length;
        if(nAfter>=nMid)warn('undo-long-session','log not reverted '+nBefore+'→'+nMid+'→'+nAfter);
        else pass('undo-long-session','log reverted');
      }

      /* --- seq monotonic --- */
      let seqOk=true;
      for(let i=1;i<recs.length;i++){if(recs[i].seq<=recs[i-1].seq)seqOk=false;}
      if(seqOk)pass('edge-seq-monotonic','seq 1..'+recs[recs.length-1].seq);
      else fail('edge-seq-monotonic','broken sequence');

      ValidTrueV0.renderPanel();
      const pan=document.getElementById('validTruePanel');
      if(pan&&pan.textContent.includes(String(col.nScored)))pass('render-panel-sync','panel shows n='+col.nScored);
      else warn('render-panel-sync','panel may be stale');

      R.meta={N,counts,lsLen,spinLines,colRate:col.hitRatePct,nPlay:col.nScored,fp:rep.falsePositiveRatePct,edge:rep.edgePrimary,wilson:col.wilson95};
      if(origCE)window.computeConfidenceEngine=origCE;
      window.__validTrueDisabled=false;
      return R;
    })()`);

    for (const c of audit.checks || []) {
      if (c.status === 'PASS') pass(c.name, c.msg);
      else if (c.status === 'WARNING') warn(c.name, c.msg);
      else fail(c.name, c.msg);
    }
    if (audit.meta) pass('meta', JSON.stringify(audit.meta));

    for (const e of consoleErrors) warn('runtime-console', e.slice(0, 180));
    if (!consoleErrors.length) pass('runtime-console', 'no critical console errors');

    const summary = {
      generatedAt: new Date().toISOString(),
      baseline: '40b1086',
      findings,
      meta: audit.meta,
      pass: findings.filter((f) => f.status === 'PASS').length,
      warning: findings.filter((f) => f.status === 'WARNING').length,
      fail: findings.filter((f) => f.status === 'FAIL').length,
    };
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outJson, JSON.stringify(summary, null, 2));

    console.log('\n=== EXTENDED AUDIT ===');
    console.log('PASS:', summary.pass, 'WARNING:', summary.warning, 'FAIL:', summary.fail);
    console.log('Report:', outJson);

    app.quit();
    process.exit(summary.fail > 0 ? 1 : 0);
  } catch (err) {
    fail('crash', err.message);
    app.quit();
    process.exit(1);
  }
});
