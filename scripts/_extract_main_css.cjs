const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index-NOVY-V4.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const start = html.indexOf('<style>') + '<style>'.length;
const end = html.indexOf('</style>', start);
const css = html.slice(start, end);

function isWheelSelector(sel) {
  const s = sel.trim();
  if (!s || s.startsWith('@')) return false;
  if (/\.qw-/i.test(s)) return true;
  if (/v6-block-wheel|v6-cc-wheel|v6-radar-v1|#wheelCanvas|wheelCanvas/i.test(s)) return true;
  if (/\.wheel[-_]|\.wsc-|wheel-hub|wheel-pillar|wheel-sector|wheel-model|wheel-legend|wheel-wait/i.test(s)) return true;
  if (/\bwheel\b/i.test(s) && /\.wheel|#wheel|wheel-/i.test(s)) return true;
  return false;
}

function splitRules(text) {
  const out = [];
  let i = 0;
  let buf = '';
  let depth = 0;
  let inStr = false;
  let strCh = '';
  while (i < text.length) {
    const c = text[i];
    const c2 = text[i] + text[i + 1];
    if (!depth && (c === '"' || c === "'")) {
      inStr = !inStr;
      strCh = inStr ? c : '';
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

const chunks = splitRules(css);
const kept = [];
let skipComment = false;

for (const chunk of chunks) {
  if (chunk.startsWith('/*')) {
    if (/koleso|wheel|qw-|radar|KVANTOVÉ KOLESO/i.test(chunk)) {
      skipComment = true;
      continue;
    }
    skipComment = false;
    kept.push(chunk);
    continue;
  }
  if (skipComment) continue;
  const brace = chunk.indexOf('{');
  if (brace < 0) {
    kept.push(chunk);
    continue;
  }
  const head = chunk.slice(0, brace);
  const selectors = head.split(',').map((s) => s.trim());
  if (selectors.some(isWheelSelector)) continue;
  kept.push(chunk);
}

const header = '/* Main app CSS — extracted from index-NOVY-V4.html (non-wheel) */\n';
const outCss = header + kept.join('\n\n') + '\n';
const outPath = path.join(__dirname, '..', 'styles', 'main.css');
fs.writeFileSync(outPath, outCss);
console.log('Wrote', outPath, 'bytes:', outCss.length, 'chunks:', kept.length);
