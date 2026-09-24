---
id: deployment
title: Deployment
---

# Deployment

## Build

```powershell
npm ci
npm run relay:build
npm run docs:build
npm run build
```

## Endpoint requirements

- Bot Framework requires a public HTTPS messaging endpoint.
- Scout clients require the configured WebSocket endpoint.
- Public WebSocket deployment should use `wss://`.
- A reverse proxy may terminate TLS and route to the default internal ports.

## Packaged configuration

Do not bake `.env` into the package. Set environment variables through the
deployment system or set `SCOUT_ENV_FILE` to an external protected file.

## Signing

MSIX/AppX signing identity and certificates are environment responsibilities.
Private keys and certificates are ignored and must not be committed.

## GitHub Pages

The `docs` workflow runs `npm ci`, builds Docusaurus with strict links,
configures Pages, uploads the artifact, and deploys it through the
`github-pages` environment.
