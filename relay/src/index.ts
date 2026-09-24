/**
 * m-relay/src/index.ts
 *
 * Entry point.  Wires:
 *   - HTTP server (PORT, default 3978) for:
 *       POST /api/messages   — Teams Bot Framework activities
 *       GET  /api/v1/clawpilot/configuration — relay config with production Loki URL
 *       GET  /healthz        — readiness probe
 *   - WebSocket server (WS_PORT, default 8765) — Scout desktop relay
 *
 * Required environment variables:
 *   BOT_APP_ID       — Azure Bot / Teams app registration client ID
 *   BOT_APP_PASSWORD — Azure Bot client secret
 *   RELAY_WS_URL     — Full ws:// or wss:// Teams relay URL to advertise
 *   LOKI_URL         — Loki base URL to advertise for Prepare/Horizon GraphQL
 *
 * Optional:
 *   PORT             — HTTP listen port (default 3978)
 *   WS_PORT          — WebSocket listen port (default 8765)
 */

import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { BotFrameworkAdapter } from "botbuilder";

import { createRelayServer } from "./relay.js";
import { ScoutBot } from "./bot.js";
import { buildLokiResponse } from "./loki.js";
import { createLogger } from "./logger.js";

const log = createLogger("Main");

function failConfiguration(message: string): never {
  log.error(`Configuration error: ${message}`);
  process.exit(1);
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  return value || failConfiguration(`${name} is required`);
}

function portEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    return failConfiguration(`${name} must be an integer between 1 and 65535`);
  }
  return value;
}

function requiredUrl(name: string, protocols: string[]): string {
  const value = requiredEnv(name);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return failConfiguration(`${name} must be an absolute URL`);
  }
  if (!protocols.includes(url.protocol)) {
    return failConfiguration(`${name} must use ${protocols.join(" or ")}`);
  }
  return value.replace(/\/+$/, "");
}

const BOT_APP_ID = requiredEnv("BOT_APP_ID");
const BOT_APP_PASSWORD = requiredEnv("BOT_APP_PASSWORD");
const PORT = portEnv("PORT", 3978);
const WS_PORT = portEnv("WS_PORT", 8765);
const RELAY_WS_URL = requiredUrl("RELAY_WS_URL", ["ws:", "wss:"]);
const LOKI_URL = requiredUrl("LOKI_URL", ["http:", "https:"]);

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
  // Relay config endpoint — no auth required. It advertises the configured
  // relay and Loki endpoints.
  if (req.method === "GET" && req.url === "/api/v1/clawpilot/configuration") {
    const body = buildLokiResponse({
      lokiUrl: LOKI_URL,
      relayWsUrl: RELAY_WS_URL,
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
  log.info(`  GET  /api/v1/clawpilot/configuration   — relay config`);
  log.info(`  POST /api/messages                     — Teams Bot Framework`);
  log.info(`Relay WS URL advertised: ${RELAY_WS_URL}`);
  log.info(`Loki URL advertised for Prepare/Horizon: ${LOKI_URL}`);
  log.info("");
  log.info("Enable the Integrations tab without routing Prepare through APIM:");
  log.info("  Preferred: run node seed-cache.mjs --ws-url " + RELAY_WS_URL);
  log.info("  Keep LOKI_URL pointed at the deployment's intended Loki service.");
});
