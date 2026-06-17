# Scout APIM Harness

Lightweight Electron app that runs the Microsoft Scout Teams Bot integration as a standalone service for scout-host.

## Architecture

```
Scout APIM Harness (Electron + Node.js)
├── UI: Integrations Panel (Teams Bot status + setup instructions)
├── Relay: m-relay server (Node.js WebSocket relay from C:\path\to\scout)
├── Teams Manifest: Auto-download scout-bot.zip for Teams upload
└── Package: MSIX/AppX for Windows deployment
```

## What It Does

1. **Relay Server** — Runs `m-relay` as a child process:
   - WebSocket relay server (port 8765) for Scout desktop connections
   - Bot Framework adapter (port 3978) for Teams messages
   - Local Loki configuration endpoint

2. **Simple UI** — Single-page HTML interface:
   - Connect/Disconnect controls
   - Connection status display
   - Download scout-bot.zip manifest button
   - Setup instructions for Teams

3. **Configuration** — Environment variables via .env file:
   - Tenant ID, Bot App ID/Password
   - Relay host (scout-host IP or hostname)
   - HTTP and WebSocket ports

## Prerequisites

- Node.js >= 20
- Azure Bot resource in your tenant
- Bot App ID and Password (from Azure Portal)

## Setup

1. Copy `.env.template` to `.env` and configure:
   ```bash
   cp .env.template .env
   notepad .env
   ```

2. Set `SCOUT_BOT_APP_PASSWORD` (from Azure Bot resource)

3. Install dependencies:
   ```powershell
   npm install
   ```

4. Build the relay server:
   ```powershell
   npm run relay:build
   ```

## Development

```powershell
# Run in development mode (relay server + electron)
npm run dev

# Or run electron only (if relay is already built)
npm start
```

## Build MSIX

```powershell
npm run build
```

Output: `dist/scout-apim-harness-*.appx` (Windows MSIX package)

## Deployment to scout-host

1. Configure `.env` with scout-host IP:
   ```
   SCOUT_RELAY_HOST=scout-host
   ```

2. Build MSIX: `npm run build`

3. Copy MSIX to scout-host

4. Install: `Add-AppxPackage -Path dist\scout-apim-harness-1.0.0.appx`

5. Launch Scout APIM Harness

6. Click "Connect" to start relay server

7. Download `scout-bot.zip` and upload to Teams

## Differences from Full M (C:\path\to\scout)

- NO: Full SDK, agentic runtime, bundled skills, MCP servers, CLI
- YES: Relay server only, minimal UI, Teams manifest helper
- Purpose: Standalone Teams integration for scout-host fleet nodes

## License

MIT (relay server extracted from microsoft/clawpilot)
