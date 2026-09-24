---
id: architecture
title: Architecture
---

# Architecture

```text
Microsoft Teams
  -> Azure Bot public messaging endpoint
  -> POST /api/messages
  -> BotFrameworkAdapter
  -> ScoutBot
  -> RelayServer
  -> Scout desktop WebSocket connection
```

## Processes

| Process | Responsibilities |
|---|---|
| Electron main | Configuration validation, child relay lifecycle, IPC, package save dialog |
| Relay | Bot Framework, HTTP configuration, readiness, WebSocket protocol |
| Renderer | Status, connect/disconnect, configuration readiness, package download |
| Browser server | Static UI, loopback reverse proxy, generated package endpoint |

## Trust boundaries

The renderer does not receive the bot secret, tenant ID, bot ID, relay URL, or
Loki URL. The relay child receives only the values required for its process.
Generated manifest bytes contain the bot ID and relay hostname only after an
operator requests a package.

## Data flow

1. Teams sends an activity to `/api/messages`.
2. `ScoutBot` creates a relay request.
3. `RelayServer` forwards the request to the connected Scout desktop.
4. Scout streams status and response messages back.
5. The bot sends the response through Bot Framework.

Only one active Scout desktop connection is retained; displacement uses close
code `4004`.
