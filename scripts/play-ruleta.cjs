'use strict';

const { spawn } = require('child_process');
const path = require('path');

const exe = path.join(__dirname, '..', 'app', 'RULETA.exe');
const fs = require('fs');

if (!fs.existsSync(exe)) {
  console.error('[play] Chýba app\\RULETA.exe — spusti: npm run dist');
  process.exit(1);
}

const child = spawn(exe, [], {
  cwd: path.join(__dirname, '..', 'app'),
  detached: true,
  stdio: 'ignore',
});
child.unref();
console.log('[play] Spustené:', exe);
