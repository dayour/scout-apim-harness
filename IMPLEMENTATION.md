# Scout APIM Harness - Implementation Summary

## Created: 2026-06-17

Lightweight Electron application that packages the Microsoft Scout Teams Bot relay as a standalone service for deployment to scout-host.

## Architecture

```
E:\scout-apim-harness\
├── electron/
│   ├── main.js           - Electron main process (relay lifecycle, IPC handlers)
│   └── preload.js        - Context bridge API exposure
├── ui/
│   └── index.html        - Single-page UI (status, connect/disconnect, manifest download)
├── relay/                - m-relay from C:\path\to\scout (copied)
│   ├── src/              - TypeScript relay server source
│   ├── dist/             - Compiled JavaScript (built)
│   └── package.json      - Relay dependencies (botbuilder, ws)
├── teams-manifest/       - Teams app manifest (copied from C:\path\to\scout)
│   ├── manifest.json     - Bot definition (ID: 00000000-0000-0000-0000-000000000000)
│   ├── color.png         - Teams app icon
│   └── outline.png       - Teams app outline icon
├── package.json          - Main app dependencies (electron, electron-builder, adm-zip)
├── .env.template         - Configuration template
└── README.md             - Documentation

```

## Key Features

### 1. Relay Server Management
- **Spawns** `relay/dist/index.js` as a child process with environment config
- **Auto-connect** option (persisted via electron-store)
- **Lifecycle hooks** - starts on app ready (if configured), stops on quit
- **Environment injection** - Bot App ID/Password, relay host, ports

### 2. IPC API
```javascript
window.apimAPI = {
  relay: {
    connect()         // Start relay server
    disconnect()      // Stop relay server
    getStatus()       // Query connection status
    onStatusChange()  // Listen for updates
  },
  manifest: {
    download()        // Save scout-bot.zip to Downloads
  },
  config: {
    get()             // Retrieve tenant/bot configuration
  },
}
```

### 3. UI Components
- **Status card** - Connected/Disconnected with visual indicators
- **Connect/Disconnect button**
- **Configuration display** - Tenant ID, Bot App ID, relay URLs
- **Manifest download** - Creates scout-bot.zip from teams-manifest/
- **Setup instructions** - Step-by-step Teams upload guide

### 4. Configuration
All values from environment variables:
```bash
SCOUT_TENANT_ID=00000000-0000-0000-0000-000000000000
SCOUT_BOT_APP_ID=00000000-0000-0000-0000-000000000000
SCOUT_BOT_APP_PASSWORD=<secret>
SCOUT_RELAY_HOST=scout-host
SCOUT_HTTP_PORT=3978
SCOUT_WS_PORT=8765
```

## Components Reused from C:\path\to\scout

| Source | Extracted | Purpose |
|--------|-----------|---------|
| `C:\path\to\scout\m-relay\` | `relay/` | Full Teams relay server (Bot Framework + WebSocket) |
| `C:\path\to\scout\teams-manifest\` | `teams-manifest/` | Bot app manifest + icons |
| IntegrationsPanel logic | `electron/main.js` | Connect/disconnect/status IPC handlers |
| UI design patterns | `ui/index.html` | Status cards, button styles, dark theme |

## Build & Deployment Workflow

1. **Development**:
   ```powershell
   npm install           # Install Electron + dependencies
   npm run relay:build   # Build TypeScript relay server
   npm start             # Launch Electron app
   ```

2. **Production** (pending electron-builder configuration):
   ```powershell
   npm run build         # Create MSIX/AppX package
   ```

3. **Deploy to scout-host**:
   - Copy `.appx` package
   - Install: `Add-AppxPackage -Path scout-apim-harness-1.0.0.appx`
   - Configure `.env` or set environment variables
   - Launch and connect

## Next Steps (Pending)

- [x] Electron scaffold
- [x] Copy m-relay server
- [x] Copy Teams manifest
- [x] Basic UI with connect/disconnect
- [x] IPC handlers (connect, disconnect, status, download)
- [ ] **electron-builder MSIX configuration** (in package.json but untested)
- [ ] **Test end-to-end on scout-host**
- [ ] Optional: Teams manifest auto-upload via Graph API

## Testing Checklist

Before deploying to scout-host:

1. Verify relay server starts and listens on ports 3978 (HTTP) and 8765 (WS)
2. Verify manifest download creates valid scout-bot.zip
3. Test connect/disconnect toggle in UI
4. Verify status updates correctly
5. Upload scout-bot.zip to Teams and test message relay
6. Verify auto-reconnect on app restart (if previously connected)

## Dependencies

**Main app**:
- electron@^33.3.0
- electron-store@^10.0.0 (persist auto-connect setting)
- adm-zip@^0.5.16 (create scout-bot.zip)
- electron-builder@^25.1.8 (MSIX packaging)

**Relay server** (relay/package.json):
- botbuilder@^4.23.0 (Teams Bot Framework adapter)
- ws@^8.18.0 (WebSocket server)

## Notes

- Relay server runs as a **child process**, not embedded
- No Microsoft 365 authentication (unlike full M integrations)
- No M365StatusCard (removed - APIM harness is relay-only)
- Single-instance enforcement not yet implemented (consider for production)
- MSIX publisher identity needs real certificate for scout-host deployment

## GitHub Repository

Ready to commit to `dayour/scout-apim-harness` when tested.
