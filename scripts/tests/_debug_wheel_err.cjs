const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');
const htmlPath = path.join(__dirname, '..', '..', 'index-NOVY-V4.html');

app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  win.webContents.on('console-message', (_, __, msg) => console.log('PAGE:', msg));
  await win.loadFile(htmlPath);
  await new Promise((r) => setTimeout(r, 2500));
  try {
    const err = await win.webContents.executeJavaScript(`(function(){
      try {
        const seq = [32,15,19,4,21,2,25,17,34,6,11,20,7,18,3,26,5,14,9,22,31,8,12];
        seq.forEach(n => spin(n));
        renderLight({ wheelImmediate: true });
        return computeQuantumWheelBrain().ready ? 'ok' : 'not ready';
      } catch (e) {
        return 'ERR:' + e.message + '\\n' + (e.stack || '');
      }
    })()`);
    console.log('RESULT:', err);
  } catch (e) {
    console.error('EXEC FAIL:', e.message);
  }
  await win.destroy();
  app.exit(0);
});

setTimeout(() => { console.error('timeout'); app.exit(1); }, 20000);
