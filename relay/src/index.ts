/**
 * m-relay/src/index.ts
 *
 * Entry point.  Wires:
 *   - HTTP server (PORT, default 3978) for:
 *       POST /api/messages   — Teams Bot Framework activities
 *       GET  /api/v1/clawpilot/configuration — local Loki config override
 *       GET  /healthz        — readiness probe
 *   - WebSocket server (WS_PORT, default 8765) — Scout desktop relay
 *
 * Required environment variables:
 *   BOT_APP_ID       — Azure Bot / Teams app registration client ID
 *   BOT_APP_PASSWORD — Azure Bot client secret
 *
 * Optional:
 *   PORT             — HTTP listen port (default 3978)
 *   WS_PORT          — WebSocket listen port (default 8765)
 *   HOST             — Hostname advertised in the Loki config response (default: detected)
 *   RELAY_WS_URL     — Full ws:// URL to advertise (overrides HOST + WS_PORT construction)
 */

import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { BotFrameworkAdapter } from "botbuilder";

import { createRelayServer } from "./relay.js";
import { ScoutBot } from "./bot.js";
import { buildLokiResponse } from "./loki.js";
import { createLogger } from "./logger.js";

const log = createLogger("Main");

const BOT_APP_ID = process.env["BOT_APP_ID"] ?? "";
const BOT_APP_PASSWORD = process.env["BOT_APP_PASSWORD"] ?? "";
const PORT = Number(process.env["PORT"] ?? 3978);
const WS_PORT = Number(process.env["WS_PORT"] ?? 8765);
const HOST = process.env["HOST"] ?? "localhost";

const RELAY_WS_URL =
  process.env["RELAY_WS_URL"] ?? `ws://${HOST}:${WS_PORT}/ws`;

if (!BOT_APP_ID || !BOT_APP_PASSWORD) {
  log.warn(
    "BOT_APP_ID or BOT_APP_PASSWORD not set — Teams channel auth will fail. " +
    "Set these from the Azure Bot registration for the Example tenant tenant.",
  );
}

// --- Relay ---------------------------------------------------------------
const relay = createRelayServer(WS_PORT);

// --- Bot Framework -------------------------------------------------------
const adapter = new BotFrameworkAdapter({
  appId: BOT_APP_ID,
  appPassword: BOT_APP_PASSWORD,
});

adapter.onTurnError = async (context, err) => {
  log.error("Unhandled Bot Framework error:", err.message);
  await context.sendActivity("An error occurred. Please try again.");
};

const bot = new ScoutBot(relay);

// --- HTTP server ---------------------------------------------------------
const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Loki config override endpoint — no auth required.
  // Scout calls this when CLAWPILOT_LOKI_BASE_URL_OVERRIDE is set.
  if (req.method === "GET" && req.url === "/api/v1/clawpilot/configuration") {
    const body = buildLokiResponse({
      relayWsUrl: RELAY_WS_URL,
      host: req.headers.host ?? `${HOST}:${PORT}`,
    });
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
    log.info(`Loki config served to ${req.socket.remoteAddress}`);
    return;
  }

  if (req.method === "GET" && req.url === "/healthz") {
    const body = JSON.stringify({
      ok: true,
      desktopConnected: relay.isDesktopConnected(),
      wsPort: WS_PORT,
      httpPort: PORT,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(body);
    return;
  }

  if (req.method === "POST" && req.url === "/api/messages") {
    // BotFrameworkAdapter.processActivity requires a WebResponse-compatible object.
    const webRes = {
      send: (body: unknown) => {
        if (!res.headersSent) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(typeof body === "string" ? body : JSON.stringify(body));
        }
      },
      status: (code: number) => {
        res.statusCode = code;
        return webRes;
      },
    };
    await adapter.processActivity(
      req,
      webRes as Parameters<typeof adapter.processActivity>[1],
      async (context) => { await bot.run(context); },
    );
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  log.info(`HTTP server listening on port ${PORT}`);
  log.info(`  GET  /healthz                          — readiness probe`);
  log.info(`  GET  /api/v1/clawpilot/configuration   — local Loki override`);
  log.info(`  POST /api/messages                     — Teams Bot Framework`);
  log.info(`Relay WS URL advertised: ${RELAY_WS_URL}`);
  log.info("");
  log.info("Enable Integrations tab — either:");
  log.info(`  A) env var on target: CLAWPILOT_LOKI_BASE_URL_OVERRIDE=http://<host>:${PORT}`);
  log.info("  B) run: node seed-cache.mjs --ws-url " + RELAY_WS_URL);
});
