# Teams app manifest template

This directory stores public inputs for runtime package generation:

- `manifest.template.json` - Teams manifest v1.17 with non-deployable tokens;
- `color.png` - 192x192 full-color icon;
- `outline.png` - 32x32 white-on-transparent outline icon.

Do not upload the template directly to Teams. The Electron app or browser UI
generates `scout-teams-bot.zip` from the configured:

- `SCOUT_BOT_APP_ID`;
- `SCOUT_RELAY_WS_URL`.

The generator injects the bot ID into both required fields and derives
`validDomains` from the `wss://` relay hostname. No generated ZIP is tracked.

## Sideload

1. Configure the bot ID and public relay URL.
2. Select **Download scout-teams-bot.zip** in the harness.
3. In Teams, open **Apps** > **Manage your apps** > **Upload an app**.
4. Upload the generated package and add the app.

The Azure Bot resource controls the mobile bot avatar. Upload `color.png` in
the resource's bot profile settings if the default avatar appears on mobile.
