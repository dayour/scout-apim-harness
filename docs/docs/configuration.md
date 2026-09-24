---
id: configuration
title: Configuration
---

# Configuration

Use `.env` for local development, `SCOUT_ENV_FILE` for an external file, or
process environment variables in packaged deployments.

| Variable | Required | Validation | Default |
|---|---:|---|---|
| `SCOUT_TENANT_ID` | yes | Non-placeholder UUID | none |
| `SCOUT_BOT_APP_ID` | yes | Non-placeholder UUID | none |
| `SCOUT_BOT_APP_PASSWORD` | yes | Nonempty | none |
| `SCOUT_RELAY_WS_URL` | yes | Absolute `ws://` or `wss://`; Teams package requires `wss://` | none |
| `SCOUT_LOKI_URL` | yes | Absolute HTTP(S) URL | none |
| `SCOUT_RELAY_HOST` | no | Nonempty host label | `localhost` |
| `SCOUT_HTTP_PORT` | no | Integer 1-65535 | `3978` |
| `SCOUT_WS_PORT` | no | Integer 1-65535 | `8765` |
| `SCOUT_UI_HOST` | no | Bind address | `127.0.0.1` |
| `SCOUT_UI_PORT` | no | Integer 1-65535 | `9090` |

The Electron process maps these to the relay's `BOT_APP_ID`,
`BOT_APP_PASSWORD`, `PORT`, `WS_PORT`, `RELAY_WS_URL`, and `LOKI_URL`
variables.

## Example structure

```dotenv
SCOUT_TENANT_ID=<tenant-uuid>
SCOUT_BOT_APP_ID=<bot-app-uuid>
SCOUT_BOT_APP_PASSWORD=<bot-secret>
SCOUT_RELAY_HOST=localhost
SCOUT_HTTP_PORT=3978
SCOUT_WS_PORT=8765
SCOUT_RELAY_WS_URL=wss://relay.example.com/ws
SCOUT_LOKI_URL=https://loki.example.com
```

Never commit the populated file.
