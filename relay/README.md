# m-relay

Teams relay WebSocket server and relay configuration endpoint for Microsoft Scout (m-copilot).

## What it does

Scout desktop connects to the configured relay WebSocket. Teams messages are forwarded to the connected Scout instance and responses are relayed back. The HTTP endpoint at `/api/v1/clawpilot/configuration` can serve `teamsRelayConfig.wsUrl`, but it must keep `lokiUrl` pointed at production Loki so Prepare/Horizon GraphQL does not hit APIM and return HTTP 404.

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
| `PORT`                | `3978`                      | HTTP listen port (Teams messages + config endpoint)       |
| `WS_PORT`             | `8765`                      | WebSocket relay port for Scout desktop                    |
| `RELAY_WS_URL`        | `wss://relay.example.com/ws` | Full WS URL advertised to Scout clients |
| `LOKI_URL`            | `https://loki.example.com` | Loki URL advertised for Prepare/Horizon GraphQL       |

## Running on 192.0.2.10 (DarbotLM gateway host)

```sh
BOT_APP_ID=00000000-0000-0000-0000-000000000000 \
BOT_APP_PASSWORD=<secret-from-azure-bot> \
RELAY_WS_URL=wss://relay.example.com/ws \
LOKI_URL=https://loki.example.com \
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
node seed-cache.mjs --ws-url wss://relay.example.com/ws
```

Or via ScoutDeployer.ps1 Phase 2 > Memory component (drops the file into the user profile).

### Option B — config endpoint only (avoid for ClippyClaw native)

Some Scout runtimes can read `GET /api/v1/clawpilot/configuration` as a config
source. This endpoint now returns production `lokiUrl` plus
`settings.teamsRelayConfig.wsUrl`, so Prepare/Horizon GraphQL stays on Loki while
Teams uses the canonical relay URL.

Do not point `CLAWPILOT_LOKI_BASE_URL_OVERRIDE` at APIM for ClippyClaw native.
That legacy override is configuration-only there; Horizon/Prepare GraphQL uses
production Loki unless `CLAWPILOT_LOKI_GRAPHQL_BASE_URL_OVERRIDE` is explicitly
set for local Loki testing.

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
