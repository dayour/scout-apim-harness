---
id: teams-manifest
title: Teams package
---

# Teams package

`teams-manifest/manifest.template.json` is deliberately not deployable. It uses
tokens for the bot ID and relay domain.

## Generation contract

`lib/manifest.js`:

1. verifies a non-placeholder bot UUID;
2. parses the relay URL;
3. requires `wss://` for Teams package generation;
4. sets `id` and `bots[0].botId`;
5. derives `validDomains[0]` from the relay hostname;
6. adds `color.png` and `outline.png`;
7. returns an in-memory ZIP.

Electron saves the package through a user-selected path. Browser mode streams
the package from `/manifest.zip`.

## Package schema

```text
scout-teams-bot.zip
├── manifest.json
├── color.png
└── outline.png
```

Generated ZIP files are ignored and removed from repository history.

## Teams setup

Upload the generated package through **Apps** > **Manage your apps** >
**Upload an app**. Configure the public HTTPS `/api/messages` endpoint and Teams
channel in the matching Azure Bot resource.
