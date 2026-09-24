#!/usr/bin/env node
/**
 * m-relay/seed-cache.mjs
 *
 * Writes ~/.copilot/m-loki-cache.json on the LOCAL machine with a
 * teamsRelayConfig pointing to the configured relay. Scout reads this file at
 * boot via initLokiCacheFromDisk() without sending Prepare/Horizon through APIM.
 *
 * Usage (on the target Windows machine):
 *   node seed-cache.mjs --ws-url wss://relay.example.com/ws \
 *     --loki-url https://loki.example.com
 *
 * After running, restart Microsoft Scout.  The Integrations tab will show
 * the Teams Bot section.
 *
 * Schema: LokiConfig plus { oid, fetchedAt, schemaVersion: 1 }.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_FLIGHTS = [
  "EnableHorizon",
  "EnableDiagnostics",
  "EnableCloudSync",
  "EnableMemora",
  "EnableOpenClawRuntime",
  "ShowExperiments",
  "experiments.teamsbriefs",
];

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node seed-cache.mjs --ws-url <ws-url> --loki-url <http-url> [--oid <uuid>] [--out <path>]");
    process.exit(0);
  }
  const wsUrlIdx = args.indexOf("--ws-url");
  const wsUrl = wsUrlIdx !== -1 ? args[wsUrlIdx + 1] : process.env.SCOUT_RELAY_WS_URL ?? process.env.RELAY_WS_URL;
  const oidIdx = args.indexOf("--oid");
  const oid = oidIdx !== -1 ? args[oidIdx + 1] : "00000000-0000-0000-0000-000000000000";
  const lokiUrlIdx = args.indexOf("--loki-url");
  const lokiUrl = lokiUrlIdx !== -1 ? args[lokiUrlIdx + 1] : process.env.SCOUT_LOKI_URL ?? process.env.LOKI_URL;
  const outIdx = args.indexOf("--out");
  const out = outIdx !== -1 ? args[outIdx + 1] : null;
  return {
    wsUrl: requiredUrl("relay WebSocket URL", wsUrl, ["ws:", "wss:"]),
    oid,
    lokiUrl: requiredUrl("Loki URL", lokiUrl, ["http:", "https:"]).replace(/\/+$/, ""),
    out,
  };
}

function requiredUrl(label, value, protocols) {
  if (!value) {
    throw new Error(`${label} is required; pass the command option or set the matching environment variable`);
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute URL`);
  }
  if (!protocols.includes(url.protocol)) {
    throw new Error(`${label} must use ${protocols.join(" or ")}`);
  }
  return value;
}

async function main() {
  const { wsUrl, oid, lokiUrl, out } = parseArgs();

  const cache = {
    lokiUrl,
    ring: "prod",
    flights: DEFAULT_FLIGHTS,
    settings: {
      teamsRelayConfig: { wsUrl },
    },
    oid,
    fetchedAt: Date.now(),
    schemaVersion: 1,
  };

  // Default path used by Scout's local Loki cache loader.
  const defaultOut = path.join(os.homedir(), ".copilot", "m-loki-cache.json");
  const dest = out ?? defaultOut;

  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, JSON.stringify(cache, null, 2), "utf8");

  console.log(`Wrote m-loki-cache.json -> ${dest}`);
  console.log(`  lokiUrl = ${lokiUrl}`);
  console.log(`  teamsRelayConfig.wsUrl = ${wsUrl}`);
  console.log(`  flights: ${cache.flights.join(", ")}`);
  console.log("");
  console.log("Restart Microsoft Scout for the Integrations tab to appear.");
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
