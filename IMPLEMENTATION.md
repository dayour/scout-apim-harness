# Scout APIM Harness implementation

## Components

| Component | Responsibility |
|---|---|
| `electron/main.js` | Electron lifecycle, validated configuration, relay child process, IPC |
| `electron/preload.js` | Narrow context-bridge API for relay, manifest, and configuration status |
| `relay/src/index.ts` | HTTP endpoints, Bot Framework adapter, WebSocket relay startup |
| `relay/src/bot.ts` | Teams activity handling and request/response correlation |
| `relay/src/relay.ts` | Scout desktop WebSocket protocol and connection state |
| `relay/seed-cache.mjs` | Explicitly configured local Loki cache writer |
| `lib/manifest.js` | Shared Teams manifest validation and in-memory ZIP generation |
| `teams-manifest/` | Public template plus color and outline icons |
| `ui/index.html` | ClippyFlow-themed Electron/browser operations interface |
| `ui-server.js` | Repository-relative static server, relay proxy, and manifest endpoint |
| `docs/` | Production Docusaurus documentation |

## Configuration lifecycle

1. The root process loads `.env` or `SCOUT_ENV_FILE` through `dotenv`.
2. Ports are parsed as integers in the range 1-65535.
3. Tenant and bot IDs must be non-placeholder UUIDs.
4. Relay and Loki values must be absolute URLs with approved protocols.
5. The Electron UI receives only configured/not-configured status, not IDs,
   passwords, or endpoint values.
6. Relay startup passes the validated values to the child process using the
   relay package's environment-variable names.
7. The relay independently validates its required configuration and exits with
   a nonzero status before opening sockets when configuration is invalid.

## Relay interfaces

| Method and path | Purpose |
|---|---|
| `GET /healthz` | Readiness plus desktop connection state and configured ports |
| `GET /api/v1/clawpilot/configuration` | Advertised Loki and Teams relay configuration |
| `POST /api/messages` | Bot Framework activities from Microsoft Teams |
| WebSocket listener | Scout desktop authentication, messages, responses, typing, and permissions |

## Electron IPC contract

```javascript
window.apimAPI = {
  relay: {
    connect(),
    disconnect(),
    getStatus(),
    onStatusChange(callback),
  },
  manifest: {
    download(),
  },
  config: {
    get(),
  },
};
```

Errors are returned as explicit `{ success: false, error }` responses. The
renderer never receives the bot password or full tenant/app identifiers.

## Manifest generation

`lib/manifest.js` is the sole package generator. It rejects missing,
placeholder, or malformed bot IDs and requires `wss://` for Teams package
generation. It parses `manifest.template.json`, injects runtime values, derives
the valid domain from the relay URL, and returns an `AdmZip` object without
writing an intermediate package to the repository.

Electron writes the generated package only to the user-selected destination.
Browser mode streams the in-memory package from `GET /manifest.zip`.

## Packaging

`electron-builder` includes:

- `electron/**/*`
- `lib/**/*`
- `ui/**/*`
- `teams-manifest/**/*`
- `relay/dist/**/*`
- relay runtime dependencies

Generated packages, build output, local environment files, certificates, and
keys are ignored.

## Operational invariants

- Public endpoints are never inferred from a machine name or private address.
- No production relay or Loki fallback exists.
- A generated Teams package always reflects the current bot ID and relay host.
- The standalone UI server defaults to loopback and rejects path traversal.
- The Loki cache writer requires explicit relay and Loki URLs.
- Existing services are managed by the operator; repository validation does
  not assume deployment state.
