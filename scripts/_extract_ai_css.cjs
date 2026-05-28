const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, '..', 'styles', 'main.css');
const css = fs.readFileSync(mainPath, 'utf8');

function splitRules(text) {
  const out = [];
  let i = 0;
  let buf = '';
  let depth = 0;
  let inStr = false;
  while (i < text.length) {
    const c = text[i];
    const c2 = text[i] + text[i + 1];
    if (!depth && (c === '"' || c === "'")) {
      inStr = !inStr;
      buf += c;
      i++;
      continue;
    }
    if (inStr) {
      buf += c;
      i++;
      continue;
    }
    if (c === '{') {
      depth++;
      buf += c;
      i++;
      continue;
    }
    if (c === '}') {
      depth--;
      buf += c;
      i++;
      if (depth === 0) {
        out.push(buf.trim());
        buf = '';
      }
      continue;
    }
    if (depth === 0 && c === '/' && c2 === '/*') {
      const close = text.indexOf('*/', i + 2);
      const comment = text.slice(i, close + 2);
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      out.push(comment);
      i = close + 2;
      continue;
    }
    buf += c;
    i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function isAiSelector(sel) {
  const s = sel.trim();
  if (!s) return false;
  if (/^@keyframes\s+predShiftPulse/i.test(s)) return true;
  if (s.startsWith('@')) return false;
  if (/\.ai-/i.test(s)) return true;
  if (/\.core-ai-/i.test(s)) return true;
  if (/\.core-pred-/i.test(s)) return true;
  if (/\.pred-/i.test(s)) return true;
  if (/\.lfp-/i.test(s)) return true;
  if (/\.master-ai-bar|\.mai-|\.ai-card-compact|\.eng-master-bar/i.test(s)) return true;
  if (/\.suppressed-hero/i.test(s)) return true;
  if (/v6-zone-pred/i.test(s)) return true;
  if (/\.big-bar|\.big-fill|\.conf-trail/i.test(s)) return true;
  if (/topbar-v6-bar.*\.mai/i.test(s)) return true;
  return false;
}

function splitRuleChunk(chunk) {
  const brace = chunk.indexOf('{');
  if (brace < 0) return { ai: null, main: chunk };
  const head = chunk.slice(0, brace);
  const body = chunk.slice(brace);
  if (head.trim().startsWith('@media')) {
    const inner = body.slice(1, -1);
    const innerRules = splitRules(inner);
    const aiInner = [];
    const mainInner = [];
    for (const ir of innerRules) {
      if (ir.startsWith('/*')) {
        if (/AI predikci|predikci/i.test(ir)) aiInner.push(ir);
        else mainInner.push(ir);
        continue;
      }
      const sp = splitRuleChunk(ir);
      if (sp.ai) aiInner.push(sp.ai);
      if (sp.main) mainInner.push(sp.main);
    }
    const m = head.match(/^@media[^\{]+/);
    const mediaHead = m ? m[0] : head;
    return {
      ai: aiInner.length ? mediaHead + '{' + aiInner.join('\n') + '}' : null,
      main: mainInner.length ? mediaHead + '{' + mainInner.join('\n') + '}' : null,
    };
  }
  const selectors = head.split(',').map((s) => s.trim());
  const aiSel = selectors.filter(isAiSelector);
  const mainSel = selectors.filter((s) => !isAiSelector(s));
  return {
    ai: aiSel.length ? aiSel.join(', ') + body : null,
    main: mainSel.length ? mainSel.join(', ') + body : null,
  };
}

const chunks = splitRules(css.replace(/^\/\*[\s\S]*?\*\/\s*/, ''));
const aiChunks = [];
const mainChunks = [];

for (const chunk of chunks) {
  if (chunk.startsWith('/*')) {
    if (/AI predikci|predikci.*analytik/i.test(chunk)) {
      aiChunks.push('/* AI predikcia — panel corePrediction / LFP */');
      continue;
    }
    mainChunks.push(chunk);
    continue;
  }
  const { ai, main } = splitRuleChunk(chunk);
  if (ai) aiChunks.push(ai);
  if (main) mainChunks.push(main);
}

const aiCss =
  '/* AI predikcia — extrahované z main.css */\n' + aiChunks.join('\n\n') + '\n';
const mainCss =
  '/* Main app CSS — extracted from index-NOVY-V4.html (non-wheel, non-AI-pred) */\n' +
  mainChunks.join('\n\n') +
  '\n';

const aiPath = path.join(__dirname, '..', 'styles', 'ai.css');
fs.writeFileSync(aiPath, aiCss);
fs.writeFileSync(mainPath, mainCss);
console.log('ai.css', aiCss.length, 'bytes, rules:', aiChunks.filter((c) => c.includes('{')).length);
console.log('main.css', mainCss.length, 'bytes, rules:', mainChunks.filter((c) => c.includes('{')).length);
