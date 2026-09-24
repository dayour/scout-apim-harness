---
id: operations
title: Operations
---

# Operations

## Readiness

Query:

```text
GET /healthz
```

The response includes `ok`, `desktopConnected`, `wsPort`, and `httpPort`.

## Common failures

| Symptom | Check |
|---|---|
| Connect returns configuration error | Populate every required `SCOUT_*` variable |
| Teams package generation fails | Use a valid bot UUID and public `wss://` relay URL |
| Teams cannot deliver messages | Verify Azure Bot messaging endpoint, TLS, and Teams channel |
| Relay is online but Scout is disconnected | Verify desktop relay URL, network path, and active client |
| Integrations configuration is absent | Run `seed-cache.mjs` with explicit relay and Loki URLs |

## Security checks

- Confirm no secrets or generated ZIPs are tracked.
- Confirm public URLs use TLS.
- Restrict UI bind host to loopback unless remote access is intentionally
  protected.
- Review `npm audit` findings and Bot Framework release notes.
- Rotate the bot secret after any suspected disclosure.

## Validation commands

```powershell
npm run relay:build
node --check electron/main.js
node --check ui-server.js
npm run docs:build
```
