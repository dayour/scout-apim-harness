# Scout APIM Harness

Scout APIM Harness packages the Microsoft Scout Teams integration as a portable
Electron application and standalone Node.js relay. It provides:

- a Bot Framework HTTP endpoint for Teams messages;
- a WebSocket relay for Scout desktop connections;
- a configuration endpoint that advertises relay and Loki URLs;
- Electron and browser-based operational interfaces;
- runtime generation of a tenant-specific Teams app package.

No tenant IDs, app IDs, secrets, private hosts, or production endpoints are
embedded in the repository. Deployment-specific values are required through
environment variables.

Requires Node.js 22.12 or newer.

## Architecture

```text
Microsoft Teams
      |
      v
Bot Framework endpoint (:3978/api/messages)
      |
      v
ScoutBot <-> RelayServer (:8765 WebSocket) <-> Scout desktop
      |
      +-> /api/v1/clawpilot/configuration
      +-> /healthz

Electron UI or browser UI (:9090)
      |
      +-> relay lifecycle/status
      +-> generated Teams app package
```

## Required configuration

Copy `.env.template` to `.env` for local development:

```powershell
Copy-Item .env.template .env
```

| Variable | Required | Purpose |
|---|---:|---|
| `SCOUT_TENANT_ID` | yes | Microsoft Entra tenant UUID |
| `SCOUT_BOT_APP_ID` | yes | Azure Bot / app registration UUID |
| `SCOUT_BOT_APP_PASSWORD` | yes | Azure Bot client secret |
| `SCOUT_RELAY_WS_URL` | yes | Public `ws://` or `wss://` relay URL advertised to Scout |
| `SCOUT_LOKI_URL` | yes | Absolute Loki HTTP(S) base URL |
| `SCOUT_RELAY_HOST` | no | Relay host label; defaults to `localhost` |
| `SCOUT_HTTP_PORT` | no | Bot/config HTTP port; defaults to `3978` |
| `SCOUT_WS_PORT` | no | Scout WebSocket port; defaults to `8765` |
| `SCOUT_ENV_FILE` | no | External environment-file path |
| `SCOUT_UI_HOST` | no | Browser UI bind host; defaults to `127.0.0.1` |
| `SCOUT_UI_PORT` | no | Browser UI port; defaults to `9090` |

The Electron app remains usable for configuration inspection when variables are
missing, but relay startup fails with an explicit list of missing or invalid
values.

## Install and validate

```powershell
npm install
npm run relay:build
npm run docs:build
```

## Run

Electron mode:

```powershell
npm start
```

Development mode:

```powershell
npm run dev
```

Browser UI and reverse proxy:

```powershell
npm run ui:start
```

The browser server binds to `127.0.0.1:9090` by default and proxies
`/relay/*` to the configured relay HTTP port.

## Teams app package

The repository stores `teams-manifest/manifest.template.json` and the Teams
icons, not a prebuilt ZIP. Electron and browser mode use `lib/manifest.js` to:

1. validate `SCOUT_BOT_APP_ID`;
2. require a public `wss://` relay URL;
3. set the manifest app and bot IDs;
4. derive `validDomains` from the relay hostname;
5. package `manifest.json`, `color.png`, and `outline.png` in memory.

This prevents tenant-specific identifiers from being committed in generated
packages.

## Build

```powershell
npm run build
```

The Electron package includes the relay build, shared manifest generator,
manifest template, icons, and UI. Signing and publisher identity remain
deployment responsibilities.

## Documentation

- Local: `npm run docs:start`
- Production: <https://dayour.github.io/scout-apim-harness/>

## Security

- Keep `.env`, bot passwords, certificates, and generated packages out of Git.
- Rotate a bot secret immediately if it is exposed.
- Use TLS for public Bot Framework and WebSocket endpoints.
- Restrict the browser UI bind host unless remote administration is explicitly
  required.
- Review Bot Framework dependency advisories before each deployment.

## License

MIT. See [LICENSE](LICENSE) if present and upstream dependency licenses.
