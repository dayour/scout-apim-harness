---
id: relay
title: Relay
---

# Relay

The relay package is a Node.js 20+ TypeScript service.

## Interfaces

| Interface | Purpose |
|---|---|
| `POST /api/messages` | Bot Framework activities |
| `GET /healthz` | Readiness, configured ports, desktop connection state |
| `GET /api/v1/clawpilot/configuration` | Loki URL and Teams relay configuration |
| WebSocket listener | Scout desktop protocol |

## Standalone environment

```powershell
$env:BOT_APP_ID = "<bot-app-id>"
$env:BOT_APP_PASSWORD = "<bot-secret>"
$env:RELAY_WS_URL = "wss://relay.example.com/ws"
$env:LOKI_URL = "https://loki.example.com"
npm --prefix relay run build
npm --prefix relay start
```

The process exits nonzero before binding if any required variable is missing or
malformed.

## Local cache

```powershell
node relay/seed-cache.mjs `
  --ws-url wss://relay.example.com/ws `
  --loki-url https://loki.example.com
```

The cache writer has no production endpoint fallback.
