# m-relay

Teams relay WebSocket server and local Loki configuration endpoint for Microsoft Scout (m-copilot).

## What it does

Scout desktop connects to this server over WebSocket. Teams messages are forwarded to the connected Scout instance and responses are relayed back. A local HTTP endpoint at `/api/v1/clawpilot/configuration` serves the Loki config (including `teamsRelayConfig.wsUrl`) so the Integrations tab Teams Bot section activates without a Microsoft 1P Loki token.

## Architecture

```
Teams channel  ->  Bot Framework adapter  ->  ScoutBot (bot.ts)
                                                     |
                                                 RelayServer (relay.ts)
                                                     |
                               ws://  <-->  Scout desktop (electron/teams-relay.ts)
```

## Prerequisites

- Node.js >= 20
- An Azure Bot resource registered in the Example tenant tenant (example.com)
  - Bot App ID:  `00000000-0000-0000-0000-000000000000`
  - Add the Teams channel to the Azure Bot
- `npm install` in this directory

## Environment variables

| Variable              | Default                     | Description                                               |
|-----------------------|-----------------------------|-----------------------------------------------------------|
| `BOT_APP_ID`          | (required)                  | Azure Bot / Teams app registration client ID              |
| `BOT_APP_PASSWORD`    | (required)                  | Azure Bot client secret                                   |
| `PORT`                | `3978`                      | HTTP listen port (Teams messages + Loki config endpoint)  |
| `WS_PORT`             | `8765`                      | WebSocket relay port for Scout desktop                    |
| `HOST`                | `localhost`                 | Hostname advertised in Loki config response               |
| `RELAY_WS_URL`        | `ws://<HOST>:<WS_PORT>/ws`  | Full WS URL advertised to Scout clients                   |

## Running on 192.0.2.10 (DarbotLM gateway host)

```sh
BOT_APP_ID=00000000-0000-0000-0000-000000000000 \
BOT_APP_PASSWORD=<secret-from-azure-bot> \
HOST=192.0.2.10 \
npm start
```

The Teams messaging endpoint to register in the Azure Bot resource:
```
https://192.0.2.10:3978/api/messages
```
(or via nginx proxy: `https://192.0.2.10:9443/relay/api/messages`)

Readiness probe: `GET http://192.0.2.10:3978/healthz`

## Enabling the Integrations tab on a Scout node

### Option A — cache file (persistent, works in packaged builds)

Run on the target machine:
```sh
node seed-cache.mjs --ws-url ws://192.0.2.10:8765/ws
```

Or via ScoutDeployer.ps1 Phase 2 > Memory component (drops the file into the user profile).

### Option B — env var override (live, reroutes all Loki calls)

Launch Scout with:
```
CLAWPILOT_LOKI_BASE_URL_OVERRIDE=http://192.0.2.10:3978
```

This causes Scout to call `GET http://192.0.2.10:3978/api/v1/clawpilot/configuration` instead of the Microsoft Office Loki service. No token acquisition occurs. The response includes `teamsRelayConfig.wsUrl` which activates the Teams Bot section in the Integrations panel.

NOTE: In packaged Scout builds the `RELAY_URL` env var is blocked at the WebSocket level. The relay URL must come from Loki config (this endpoint or the cache file) — the env var is only respected in unpackaged/dev builds.

## Teams bot setup

1. Build the Teams app manifest from Scout:
   - Open Scout > Integrations > Teams Bot > "Download bot package"
   - A `scout-bot.zip` is saved to your Downloads folder
2. Upload to Microsoft Teams:
   - Teams > Apps > Manage your apps > Upload a custom app
   - Select `scout-bot.zip`
3. Add the app to yourself or a team channel

## Wire protocol

See `electron/teams-relay.ts` in the host repo for the authoritative protocol definition. Key message types:

| Direction       | Type                 | Fields                                                       |
|-----------------|----------------------|--------------------------------------------------------------|
| client -> server | auth                | userId, token, capabilities                                  |
| server -> client | auth_ok             | capabilities                                                 |
| server -> client | message             | requestId, text, userId                                      |
| client -> server | response            | requestId, text, done, format                                |
| client -> server | typing              | requestId                                                    |
| client -> server | permission_request  | requestId, title, message, command, tooltips?                |
| server -> client | permission_response | requestId, action                                            |

Close code 4004 = displacement (another Scout instance connected).
