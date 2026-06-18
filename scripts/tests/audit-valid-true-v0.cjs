/**
 * Technický audit TRUE VALID V0 (read-only, nemení produkčný kód).
 * Spustenie: node scripts/tests/audit-valid-true-v0.cjs
 * alebo: electron scripts/tests/audit-valid-true-v0.cjs
 */
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..', '..');
const htmlPath = path.join(root, 'index-NOVY-V2.html');
const outDir = path.join(root, 'valid-true-export');
const outJson = path.join(outDir, 'audit-valid-true-v0-report.json');

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
  if (!fs.existsSync(htmlPath)) {
    fail('bootstrap', 'index-NOVY-V2.html missing');
    process.exit(1);
  }

  const win = new BrowserWindow({
    show: false,
    width: 1400,
    height: 900,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });

  const consoleErrors = [];
  win.webContents.on('console-message', (_e, _level, message) => {
    if (/error|exception|uncaught/i.test(message)) consoleErrors.push(message);
  });

  try {
    await win.loadFile(htmlPath);
    await new Promise((r) => setTimeout(r, 2500));

    const audit = await win.webContents.executeJavaScript(`(async function(){
      const R = { checks: [], errors: [] };
      function pass(n,m){R.checks.push({status:'PASS',name:n,msg:m});}
      function warn(n,m){R.checks.push({status:'WARNING',name:n,msg:m});}
      function fail(n,m){R.checks.push({status:'FAIL',name:n,msg:m});}

      if(typeof ValidTrueV0==='undefined'){fail('load','ValidTrueV0 undefined');return R;}
      pass('load','ValidTrueV0 loaded');

      const BASELINE=12/37;
      const origCE=typeof computeConfidenceEngine==='function'?computeConfidenceEngine:null;
      let gateOverride=null;
      if(origCE){
        window.computeConfidenceEngine=function(){
          return gateOverride||origCE();
        };
      }

      function wilson(hits,n,z){
        z=z||1.96;if(!n)return null;
        const p=hits/n,den=1+(z*z)/n,centre=p+(z*z)/(2*n);
        const margin=z*Math.sqrt((p*(1-p)+(z*z)/(4*n))/n);
        return{low:+(((centre-margin)/den)*100).toFixed(2),high:+(((centre+margin)/den)*100).toFixed(2)};
      }
      function rate(h,n){return n?+((h/n)*100).toFixed(2):null;}
      function edgeVerdict(nCol,colRate,colWilson){
        const edgePp=colRate!=null?+(colRate-BASELINE*100).toFixed(2):null;
        let v='unknown';
        if(nCol<100)v='unknown';
        else if(edgePp!=null&&edgePp<2)v='unlikely';
        else if(edgePp!=null&&edgePp>=5&&colWilson&&colWilson.low>BASELINE*100)v='possible';
        else if(edgePp!=null&&edgePp>=8&&nCol>=300)v='likely';
        return{v,edgePp};
      }

      ValidTrueV0.resetSession();
      gateOverride={status:'HRAŤ',playMode:'HRAŤ',playHead:'HRAŤ',chaosPct:40,learn:false,allowPlay:true};
      predLastPick={col:0,doz:0,colPick:'1st',dozPick:'1st'};
      const r1=ValidTrueV0.onSpinScored(5);
      const spinsAfter=r1?ValidTrueV0.getSpinRecords().length:0;
      if(!r1||r1.signal.code!=='PLAY')fail('signal-play', 'PLAY record: '+JSON.stringify(r1&&r1.signal));
      else pass('signal-play','code=PLAY official column scored');

      gateOverride={status:'OPATRNE',playMode:'OPATRNE',playHead:'OPATRNE',chaosPct:55,learn:false,allowPlay:false};
      predLastPick={col:1,doz:1,colPick:'2nd',dozPick:'2nd'};
      const rC=ValidTrueV0.onSpinScored(12);
      if(rC&&rC.signal.code==='CAUTION')pass('signal-caution','code=CAUTION (OPATRNE)');
      else fail('signal-caution','got '+(rC&&rC.signal.code));

      gateOverride={status:'ČAKAJ',playMode:'ČAKAJ',playHead:'ČAKAJ',chaosPct:70,learn:false,allowPlay:false};
      const rW=ValidTrueV0.onSpinScored(3);
      if(rW&&rW.signal.code==='WAIT')pass('signal-wait','code=WAIT (ČAKAJ)');
      else fail('signal-wait','got '+(rW&&rW.signal.code));

      gateOverride={status:'ČAKAJ',playMode:'ČAKAJ',playHead:'ČAKAJ',chaosPct:70,learn:true,allowPlay:false};
      const rL=ValidTrueV0.onSpinScored(7);
      if(rL&&rL.signal.code==='LEARN')pass('signal-learn','code=LEARN');
      else fail('signal-learn','got '+(rL&&rL.signal.code));

      const beforeUndo=ValidTrueV0.getSpinRecords().length;
      if(typeof onUndoSpin==='function'&&typeof onNewSpin==='function'){
        onNewSpin(17);
        const afterSpin=ValidTrueV0.getSpinRecords().length;
        onUndoSpin();
        const afterUndo=ValidTrueV0.getSpinRecords().length;
        if(afterUndo<afterSpin)pass('undo','log shortened after undo ('+afterSpin+'→'+afterUndo+')');
        else fail('undo','onUndoSpin must revert TRUE VALID log ('+beforeUndo+'→'+afterSpin+'→'+afterUndo+')');
      }else warn('undo','onUndoSpin/onNewSpin not callable');

      ValidTrueV0.resetSession();
      const afterReset=ValidTrueV0.getSpinRecords().length;
      if(afterReset===0)pass('reset-session','resetSession cleared spin records');
      else fail('reset-session','nSpins='+afterReset);

      gateOverride={status:'HRAŤ',playMode:'HRAŤ',playHead:'HRAŤ',chaosPct:35,learn:false,allowPlay:true};
      predLastPick={col:0,doz:0,colPick:'1st',dozPick:'1st'};
      const TARGET=320;
      let playHits=0,playMiss=0,playScored=0;
      for(let i=0;i<TARGET;i++){
        const num=1+Math.floor(Math.random()*36);
        const pickCol=i%3;
        predLastPick={col:pickCol,doz:pickCol,colPick:['1st','2nd','3rd'][pickCol],dozPick:['1st','2nd','3rd'][pickCol]};
        if(i%17===0)gateOverride={status:'ČAKAJ',playMode:'ČAKAJ',playHead:'ČAKAJ',chaosPct:60,learn:false,allowPlay:false};
        else if(i%23===0)gateOverride={status:'OPATRNE',playMode:'OPATRNE',playHead:'OPATRNE',chaosPct:50,learn:false,allowPlay:false};
        else if(i%41===0)gateOverride={status:'ČAKAJ',playMode:'ČAKAJ',playHead:'ČAKAJ',chaosPct:60,learn:true,allowPlay:false};
        else gateOverride={status:'HRAŤ',playMode:'HRAŤ',playHead:'HRAŤ',chaosPct:30,learn:false,allowPlay:true};
        ValidTrueV0.onSpinScored(num);
      }
      const recs=ValidTrueV0.getSpinRecords();
      if(recs.length>=300)pass('simulate-300','logged '+recs.length+' spins');
      else fail('simulate-300','only '+recs.length);

      const codes={};
      recs.forEach(r=>{codes[r.signal.code]=(codes[r.signal.code]||0)+1;});
      if(codes.PLAY>50)pass('mix-play','PLAY n='+codes.PLAY);
      else warn('mix-play','low PLAY count '+codes.PLAY);
      if(codes.CAUTION)pass('mix-caution','CAUTION n='+codes.CAUTION); else warn('mix-caution','no CAUTION in bulk run');
      if(codes.WAIT)pass('mix-wait','WAIT n='+codes.WAIT); else warn('mix-wait','no WAIT');
      if(codes.LEARN)pass('mix-learn','LEARN n='+codes.LEARN); else warn('mix-learn','no LEARN');

      let expColH=0,expColM=0,expFpMiss=0,expFpScored=0;
      recs.forEach(r=>{
        if(r.outcome.column==='hit'){expColH++;expColM++;}
        else if(r.outcome.column==='miss')expColM++;
        if(r.signal.code==='PLAY'&&(r.outcome.column==='hit'||r.outcome.column==='miss')){
          expFpScored++;
          if(r.outcome.column==='miss')expFpMiss++;
        }
      });
      const expColRate=rate(expColH,expColM);
      const expFpRate=expFpScored?+((expFpMiss/expFpScored)*100).toFixed(2):null;
      const expWilson=wilson(expColH,expColM);
      const expEdge=edgeVerdict(expColM,expColRate,expWilson);

      const rep=ValidTrueV0.buildReport();
      const col=rep.rates.column;
      if(col.hitRatePct===expColRate)pass('consistency-column-rate','match '+expColRate+'%');
      else fail('consistency-column-rate','report='+col.hitRatePct+' expected='+expColRate);
      if(col.nScored===expColM)pass('consistency-column-n','n='+col.nScored);
      else fail('consistency-column-n','report='+col.nScored+' expected='+expColM);
      if(rep.falsePositiveRatePct===expFpRate)pass('consistency-fp-rate','match '+expFpRate+'%');
      else fail('consistency-fp-rate','report='+rep.falsePositiveRatePct+' expected='+expFpRate);
      if(rep.edgePrimary===expEdge.v)pass('consistency-edgePrimary','match '+expEdge.v);
      else fail('consistency-edgePrimary','report='+rep.edgePrimary+' expected='+expEdge.v);
      if(col.wilson95&&expWilson&&col.wilson95.low===expWilson.low&&col.wilson95.high===expWilson.high)
        pass('consistency-wilson','['+expWilson.low+','+expWilson.high+']');
      else fail('consistency-wilson','report='+JSON.stringify(col.wilson95)+' expected='+JSON.stringify(expWilson));

      let jsonlOk=false,csvOk=false,summaryOk=false;
      try{
        const jl=ValidTrueV0.exportJsonl();
        const lines=jl.split('\\n').filter(Boolean);
        const parsed=lines.map(l=>JSON.parse(l));
        if(parsed.some(x=>x.type==='meta')&&parsed.filter(x=>x.type==='spin').length>=300){
          jsonlOk=true;pass('export-jsonl',parsed.length+' lines parseable');
        }else fail('export-jsonl','lines='+parsed.length);
      }catch(e){fail('export-jsonl',e.message);}

      try{
        const csv=ValidTrueV0.exportCsv();
        const rows=csv.split('\\n');
        if(rows.length>301&&rows[0].includes('outcome_column')){csvOk=true;pass('export-csv',rows.length-1+' data rows');}
        else fail('export-csv','rows='+rows.length);
      }catch(e){fail('export-csv',e.message);}

      try{
        const sum=ValidTrueV0.buildReport();
        if(sum.schemaVersion==='valid-true-v0'&&sum.officialVerdict==='COLUMN_ONLY'&&sum.rates.column.wilson95){
          summaryOk=true;pass('export-summary-json','schema + wilson present');
        }else fail('export-summary-json','missing fields');
      }catch(e){fail('export-summary-json',e.message);}

      if(typeof ValidTrueV0.renderPanel==='function'){
        ValidTrueV0.renderPanel();
        const panel=document.getElementById('validTruePanel');
        if(panel&&panel.innerHTML.includes('TRUE VALID V0'))pass('render-panel','validTruePanel updated');
        else fail('render-panel','panel empty or missing');
      }

      if(ValidTrueV0.isEnabled&&ValidTrueV0.isEnabled())pass('enabled-default','isEnabled true');
      else warn('enabled-default','isEnabled false');

      R.meta={nSpins:recs.length,codes,edgePrimary:rep.edgePrimary,colRate:col.hitRatePct,nPlayScored:col.nScored,fp:rep.falsePositiveRatePct,jsonlOk,csvOk,summaryOk};
      if(gateOverride&&origCE)window.computeConfidenceEngine=origCE;
      return R;
    })()`);

    for (const c of audit.checks || []) {
      if (c.status === 'PASS') pass(c.name, c.msg);
      else if (c.status === 'WARNING') warn(c.name, c.msg);
      else fail(c.name, c.msg);
    }

    if (audit.meta) {
      pass('audit-meta', JSON.stringify(audit.meta));
    }

    for (const e of consoleErrors) {
      warn('runtime-console', e.slice(0, 200));
    }
    if (!consoleErrors.length) pass('runtime-console', 'no error-level console messages captured');

    const summary = {
      generatedAt: new Date().toISOString(),
      html: htmlPath,
      findings,
      meta: audit.meta || null,
      pass: findings.filter((f) => f.status === 'PASS').length,
      warning: findings.filter((f) => f.status === 'WARNING').length,
      fail: findings.filter((f) => f.status === 'FAIL').length,
    };

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outJson, JSON.stringify(summary, null, 2));
    pass('report-file', 'written ' + outJson);

    console.log('\n=== AUDIT SUMMARY ===');
    console.log('PASS:', summary.pass, 'WARNING:', summary.warning, 'FAIL:', summary.fail);

    app.quit();
    process.exit(summary.fail > 0 ? 1 : 0);
  } catch (err) {
    fail('audit-crash', err.message);
    app.quit();
    process.exit(1);
  }
});

app.on('window-all-closed', () => {});
