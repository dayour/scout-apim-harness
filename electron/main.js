const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const dotenv = require('dotenv');
const { createManifestZip, isConfiguredUuid, parseRelayUrl } = require('../lib/manifest');

dotenv.config({
  path: process.env.SCOUT_ENV_FILE || path.join(process.cwd(), '.env'),
  quiet: true,
});

let store;
let mainWindow;
let relayProcess = null;

function envValue(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

function parsePort(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return value;
}

// Environment configuration
const config = {
  tenantId: envValue('SCOUT_TENANT_ID'),
  botAppId: envValue('SCOUT_BOT_APP_ID'),
  botAppPassword: envValue('SCOUT_BOT_APP_PASSWORD'),
  relayHost: envValue('SCOUT_RELAY_HOST') || 'localhost',
  httpPort: parsePort('SCOUT_HTTP_PORT', 3978),
  wsPort: parsePort('SCOUT_WS_PORT', 8765),
  relayWsUrl: envValue('SCOUT_RELAY_WS_URL', 'RELAY_WS_URL'),
  lokiUrl: envValue('SCOUT_LOKI_URL', 'LOKI_URL').replace(/\/+$/, ''),
};

function getConfigErrors({ requirePassword = true, requireTenant = true } = {}) {
  const errors = [];
  if (requireTenant && !isConfiguredUuid(config.tenantId)) {
    errors.push('SCOUT_TENANT_ID must be a non-placeholder UUID');
  }
  if (!isConfiguredUuid(config.botAppId)) {
    errors.push('SCOUT_BOT_APP_ID must be a non-placeholder UUID');
  }
  if (requirePassword && !config.botAppPassword) {
    errors.push('SCOUT_BOT_APP_PASSWORD is required');
  }
  try {
    parseRelayUrl(config.relayWsUrl);
  } catch (err) {
    errors.push(err.message);
  }
  if (!config.lokiUrl) {
    errors.push('SCOUT_LOKI_URL is required');
  } else {
    try {
      const url = new URL(config.lokiUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('SCOUT_LOKI_URL must use http:// or https://');
      }
    } catch {
      errors.push('SCOUT_LOKI_URL must be an absolute URL');
    }
  }
  return errors;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    title: 'Scout APIM Harness',
    backgroundColor: '#0d1b2a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startRelayServer() {
  if (relayProcess) {
    console.log('[APIM] Relay server already running');
    return;
  }

  const errors = getConfigErrors();
  if (errors.length > 0) {
    throw new Error(`Relay configuration is incomplete: ${errors.join('; ')}`);
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
  };
});

ipcMain.handle('manifest:download', async () => {
  const { dialog } = require('electron');

  try {
    const manifestDir = path.join(__dirname, '..', 'teams-manifest');
    const zip = createManifestZip({
      botAppId: config.botAppId,
      relayWsUrl: config.relayWsUrl,
      manifestDir,
    });

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
  const errors = getConfigErrors();
  return {
    success: true,
    config: {
      relayHost: config.relayHost,
      httpPort: config.httpPort,
      wsPort: config.wsPort,
      hasTenantId: isConfiguredUuid(config.tenantId),
      hasBotAppId: isConfiguredUuid(config.botAppId),
      hasPassword: Boolean(config.botAppPassword),
      hasRelayWsUrl: Boolean(config.relayWsUrl),
      hasLokiUrl: Boolean(config.lokiUrl),
      errors,
    },
  };
});

// App Lifecycle
app.on('ready', async () => {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store();
    createWindow();

    // Auto-connect if previously connected
    const autoConnect = store.get('relay.autoConnect', false);
    if (autoConnect) {
      const errors = getConfigErrors();
      if (errors.length > 0) {
        console.error(`[APIM] Auto-connect skipped: ${errors.join('; ')}`);
      } else {
        setTimeout(() => startRelayServer(), 2000);
      }
    }
  } catch (err) {
    console.error('[APIM] Failed to initialize:', err);
    app.quit();
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
