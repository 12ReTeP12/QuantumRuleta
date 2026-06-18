/**
 * Extrakcia všetkých inline <script> blokov z index-NOVY-V2.html (bez src=).
 * V2 má viac blokov (hlavný, patterny, HUD) — starý rež „prvý až analytics“
 * vkladal </script><script> do JS a lámal node --check.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const INLINE_SCRIPT_RE = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;

function extractV2InlineScripts(html) {
  const blocks = [];
  let m;
  INLINE_SCRIPT_RE.lastIndex = 0;
  while ((m = INLINE_SCRIPT_RE.exec(html)) !== null) {
    const body = m[2].trim();
    if (body) blocks.push(body);
  }
  return blocks.join('\n\n');
}

function readV2Html(root) {
  const htmlPath = path.join(root, 'index-NOVY-V2.html');
  return fs.readFileSync(htmlPath, 'utf8');
}

function extractV2InlineFromRoot(root) {
  return extractV2InlineScripts(readV2Html(root));
}

module.exports = {
  extractV2InlineScripts,
  readV2Html,
  extractV2InlineFromRoot,
};
