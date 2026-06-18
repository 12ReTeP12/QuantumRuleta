'use strict';
const fs = require('fs');
const path = require('path');
const { extractV2InlineFromRoot } = require('./v2-inline-extract.cjs');

const root = path.join(__dirname, '..', '..');
const inline = extractV2InlineFromRoot(root);
const lines = inline.split(/\n/);

function braceSpanFrom(startIdx) {
  let depth = 0;
  let started = false;
  for (let i = startIdx; i < lines.length; i++) {
    const l = lines[i];
    for (let c = 0; c < l.length; c++) {
      const ch = l[c];
      if (ch === '{') { depth++; started = true; }
      if (ch === '}') depth--;
      if (started && depth === 0) return { end: i + 1, loc: i - startIdx + 1 };
    }
  }
  return { end: lines.length, loc: lines.length - startIdx };
}

const fns = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^function\s+([a-zA-Z0-9_$]+)\s*\(/);
  if (!m) continue;
  const span = braceSpanFrom(i);
  fns.push({ name: m[1], start: i + 1, loc: span.loc, end: span.end });
}

function sectionSizes() {
  const markers = [];
  lines.forEach((l, i) => {
    if (/^\/\* ={3,}/.test(l.trim()) || /^\/\* ={5,}/.test(l.trim())) {
      const title = (lines[i + 1] || '').trim().replace(/\*+\/?$/, '').trim();
      markers.push({ line: i + 1, title });
    }
  });
  const sections = [];
  for (let m = 0; m < markers.length; m++) {
    const start = markers[m].line;
    const end = m + 1 < markers.length ? markers[m + 1].line - 1 : lines.length;
    sections.push({ title: markers[m].title, loc: end - start + 1, start });
  }
  return sections.sort((a, b) => b.loc - a.loc);
}

const topFns = fns.sort((a, b) => b.loc - a.loc).slice(0, 20);
const sections = sectionSizes().slice(0, 15);
console.log(JSON.stringify({ top20Functions: topFns, top15Sections: sections, totalFunctions: fns.length }, null, 2));
