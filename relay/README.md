# Scout Teams relay

The relay bridges Microsoft Teams Bot Framework activities to a connected Scout
desktop instance over WebSocket.

Requires Node.js 22.12 or newer.

## Required environment variables

| Variable | Required | Description |
|---|---:|---|
| `BOT_APP_ID` | yes | Azure Bot / app registration UUID |
| `BOT_APP_PASSWORD` | yes | Azure Bot client secret |
| `RELAY_WS_URL` | yes | Full relay URL advertised to Scout |
| `LOKI_URL` | yes | Loki HTTP(S) base URL advertised to Scout |
| `PORT` | no | HTTP port; defaults to `3978` |
| `WS_PORT` | no | WebSocket port; defaults to `8765` |

Missing or malformed required values cause a clear startup error before any
listener is opened.

## Build and run

```powershell
npm install
npm run build

$env:BOT_APP_ID = "<bot-app-id>"
$env:BOT_APP_PASSWORD = "<bot-secret>"
$env:RELAY_WS_URL = "wss://relay.example.com/ws"
$env:LOKI_URL = "https://loki.example.com"
npm start
```

## HTTP endpoints

| Method and path | Purpose |
|---|---|
| `GET /healthz` | Relay readiness and Scout desktop connection state |
| `GET /api/v1/clawpilot/configuration` | Loki URL and `teamsRelayConfig.wsUrl` |
| `POST /api/messages` | Microsoft Teams Bot Framework messaging endpoint |

Register a public HTTPS endpoint ending in `/api/messages` in the Azure Bot
resource. The service can listen on a private port behind a TLS reverse proxy.

## Scout cache

Write the local cache only with explicit endpoints:

```powershell
node seed-cache.mjs `
  --ws-url wss://relay.example.com/ws `
  --loki-url https://loki.example.com
```

Use `--out` to select a non-default cache path and `--oid` when a deployment
requires a specific object identifier.

## WebSocket protocol

| Direction | Type | Purpose |
|---|---|---|
| client to server | `auth` | Authenticate the Scout desktop connection |
| server to client | `auth_ok` | Confirm capabilities |
| server to client | `message` | Deliver a Teams request |
| client to server | `response` | Stream or complete the Scout response |
| client to server | `typing` | Report typing state |
| client to server | `permission_request` | Request user approval |
| server to client | `permission_response` | Return the selected action |

Close code `4004` indicates displacement by another Scout desktop connection.
