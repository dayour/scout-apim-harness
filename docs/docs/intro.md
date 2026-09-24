---
id: intro
title: Scout APIM Harness
slug: /
---

# Scout APIM Harness

Scout APIM Harness is a portable Microsoft Teams integration for Scout. It
combines a Bot Framework endpoint, Scout desktop WebSocket relay, configuration
endpoint, Electron operations interface, browser interface, and runtime Teams
package generator.

## Production principles

- Deployment identifiers and endpoints come from environment variables.
- Relay startup fails before opening listeners when required values are invalid.
- Teams ZIP packages are generated in memory and are never tracked.
- Renderer APIs expose configuration status, not secrets or identifiers.
- The browser interface binds to loopback by default.
- Documentation and GitHub Pages builds fail on broken links.

## Quick start

```powershell
Copy-Item .env.template .env
npm install
npm run relay:build
npm start
```

Configure all required values before selecting **Connect**.

Continue with [Architecture](architecture) and
[Configuration](configuration).
