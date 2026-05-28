const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

/** Packaged RULETA.exe musí brať index.html z koreňa QuantumApp (nie starý súbor v .asar). */
function resolveIndexHtml() {
    const bundled = path.join(__dirname, 'index.html');
    if (!app.isPackaged) {
        return bundled;
    }
    const external = path.join(path.dirname(process.execPath), '..', 'index.html');
    if (fs.existsSync(external)) {
        console.log('[RULETA] Načítavam živý UI:', external);
        return external;
    }
    console.warn('[RULETA] Externý index.html chýba, používam zabalený:', bundled);
    return bundled;
}

app.setName('RULETA');

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 1000,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false
        }
    });

    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('closed', () => { mainWindow = null; });

    mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
        console.error('did-fail-load', code, desc, url);
    });

    mainWindow.webContents.on('render-process-gone', (_event, details) => {
        console.error('render-process-gone', details);
    });

    const htmlPath = resolveIndexHtml();
    mainWindow.setTitle('KVANTOVÁ RULETA PRO V4 — živý index.html');
    mainWindow.loadFile(htmlPath).catch((err) => {
        console.error('loadFile failed:', htmlPath, err);
    });
}

if (gotSingleInstanceLock) {
    app.whenReady().then(createWindow);
    app.on('window-all-closed', () => app.quit());
}