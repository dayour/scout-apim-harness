const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let relayProcess = null;

const CANONICAL_RELAY_WS_URL = 'wss://relay.example.com/ws';
const PRODUCTION_LOKI_URL = 'https://loki.example.com';

// Environment configuration
const config = {
  tenantId: process.env.SCOUT_TENANT_ID || '00000000-0000-0000-0000-000000000000',
  botAppId: process.env.SCOUT_BOT_APP_ID || '00000000-0000-0000-0000-000000000000',
  botAppPassword: process.env.SCOUT_BOT_APP_PASSWORD || '',
  relayHost: process.env.SCOUT_RELAY_HOST || 'localhost',
  httpPort: process.env.SCOUT_HTTP_PORT || '3978',
  wsPort: process.env.SCOUT_WS_PORT || '8765',
  relayWsUrl: process.env.SCOUT_RELAY_WS_URL || process.env.RELAY_WS_URL || CANONICAL_RELAY_WS_URL,
  lokiUrl: (process.env.SCOUT_LOKI_URL || process.env.LOKI_URL || PRODUCTION_LOKI_URL).replace(/\/+$/, ''),
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    title: 'Scout APIM Harness',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('ui/index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startRelayServer() {
  if (relayProcess) {
    console.log('[APIM] Relay server already running');
    return;
  }

  const relayScript = app.isPackaged
    ? path.join(process.resourcesPath, 'relay', 'dist', 'index.js')
    : path.join(__dirname, '..', 'relay', 'dist', 'index.js');

  console.log('[APIM] Starting relay server:', relayScript);

  relayProcess = spawn('node', [relayScript], {
    env: {
      ...process.env,
      BOT_APP_ID: config.botAppId,
      BOT_APP_PASSWORD: config.botAppPassword,
      HOST: config.relayHost,
      PORT: config.httpPort,
      WS_PORT: config.wsPort,
      RELAY_WS_URL: config.relayWsUrl,
      LOKI_URL: config.lokiUrl,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  relayProcess.stdout.on('data', (data) => {
    console.log(`[RELAY] ${data.toString().trim()}`);
  });

  relayProcess.stderr.on('data', (data) => {
    console.error(`[RELAY ERROR] ${data.toString().trim()}`);
  });

  relayProcess.on('close', (code) => {
    console.log(`[RELAY] Process exited with code ${code}`);
    relayProcess = null;
    if (mainWindow) {
      mainWindow.webContents.send('relay:status', { connected: false, error: `Relay exited (code ${code})` });
    }
  });

  relayProcess.on('error', (err) => {
    console.error('[RELAY] Failed to start:', err);
    relayProcess = null;
    if (mainWindow) {
      mainWindow.webContents.send('relay:status', { connected: false, error: err.message });
    }
  });
}

function stopRelayServer() {
  if (relayProcess) {
    console.log('[APIM] Stopping relay server');
    relayProcess.kill();
    relayProcess = null;
  }
}

// IPC Handlers
ipcMain.handle('relay:connect', async () => {
  try {
    if (!config.botAppPassword) {
      return { success: false, error: 'BOT_APP_PASSWORD not configured. Set SCOUT_BOT_APP_PASSWORD environment variable.' };
    }
    startRelayServer();
    store.set('relay.autoConnect', true);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('relay:disconnect', async () => {
  try {
    stopRelayServer();
    store.set('relay.autoConnect', false);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('relay:status', async () => {
  return {
    success: true,
    connected: relayProcess !== null,
    config: {
      relayHost: config.relayHost,
      httpPort: config.httpPort,
      wsPort: config.wsPort,
      wsUrl: config.relayWsUrl,
      lokiUrl: config.lokiUrl,
    },
  };
});

ipcMain.handle('manifest:download', async () => {
  const fs = require('node:fs');
  const AdmZip = require('adm-zip');
  const { dialog } = require('electron');

  try {
    const manifestDir = path.join(__dirname, '..', 'teams-manifest');
    const manifestJson = path.join(manifestDir, 'manifest.json');
    const colorIcon = path.join(manifestDir, 'color.png');
    const outlineIcon = path.join(manifestDir, 'outline.png');

    // Create zip
    const zip = new AdmZip();
    zip.addLocalFile(manifestJson);
    zip.addLocalFile(colorIcon);
    zip.addLocalFile(outlineIcon);

    // Prompt save location
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'scout-bot.zip',
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    });

    if (canceled || !filePath) {
      return { success: false, error: 'Save canceled' };
    }

    zip.writeZip(filePath);
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('config:get', async () => {
  return {
    success: true,
    config: {
      tenantId: config.tenantId,
      botAppId: config.botAppId,
      relayHost: config.relayHost,
      httpPort: config.httpPort,
      wsPort: config.wsPort,
      relayWsUrl: config.relayWsUrl,
      lokiUrl: config.lokiUrl,
      hasPassword: !!config.botAppPassword,
    },
  };
});

// App Lifecycle
app.on('ready', () => {
  createWindow();

  // Auto-connect if previously connected
  const autoConnect = store.get('relay.autoConnect', false);
  if (autoConnect && config.botAppPassword) {
    setTimeout(() => startRelayServer(), 2000);
  }
});

app.on('window-all-closed', () => {
  stopRelayServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopRelayServer();
});
