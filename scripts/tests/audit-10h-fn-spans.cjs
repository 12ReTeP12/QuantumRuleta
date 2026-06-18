'use strict';
const { extractV2InlineFromRoot } = require('./v2-inline-extract.cjs');
const js = extractV2InlineFromRoot(require('path').join(__dirname, '..', '..'));
const lines = js.split(/\r?\n/);
const fn = [];
for (let i = 0; i < lines.length; i++) {
  const lm = lines[i].match(/^function\s+(\w+)/);
  if (lm) fn.push({ name: lm[1], line: i + 1 });
}
fn.push({ name: 'END', line: lines.length + 1 });
const spans = [];
for (let i = 0; i < fn.length - 1; i++) {
  spans.push({ name: fn[i].name, lines: fn[i + 1].line - fn[i].line });
}
spans.sort((a, b) => b.lines - a.lines);
console.log('inlineLines', lines.length);
spans.slice(0, 20).forEach((s) => console.log(s.lines + '\t' + s.name));
