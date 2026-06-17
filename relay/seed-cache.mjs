#!/usr/bin/env node
/**
 * m-relay/seed-cache.mjs
 *
 * Writes ~/.copilot/m-loki-cache.json on the LOCAL machine with a
 * teamsRelayConfig pointing to the m-relay server.  Scout reads this file at
 * boot via initLokiCacheFromDisk() — no Microsoft 1P Loki token required.
 *
 * Usage (on the target Windows machine):
 *   node seed-cache.mjs [--ws-url ws://192.0.2.10:8765/ws]
 *
 * After running, restart Microsoft Scout.  The Integrations tab will show
 * the Teams Bot section.
 *
 * Schema source: C:\path\to\scout\common\loki-cache-schema.ts
 *   LokiCacheFileSchema = LokiConfigSchema + { oid, fetchedAt, schemaVersion:1 }
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_WS_URL = "ws://192.0.2.10:8765/ws";
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
  const wsUrlIdx = args.indexOf("--ws-url");
  const wsUrl = wsUrlIdx !== -1 ? args[wsUrlIdx + 1] : DEFAULT_WS_URL;
  const oidIdx = args.indexOf("--oid");
  const oid = oidIdx !== -1 ? args[oidIdx + 1] : "00000000-0000-0000-0000-000000000000";
  const outIdx = args.indexOf("--out");
  const out = outIdx !== -1 ? args[outIdx + 1] : null;
  return { wsUrl, oid, out };
}

async function main() {
  const { wsUrl, oid, out } = parseArgs();

  const cache = {
    lokiUrl: "https://loki.example.com",
    ring: "df",
    flights: DEFAULT_FLIGHTS,
    settings: {
      teamsRelayConfig: { wsUrl },
    },
    oid,
    fetchedAt: Date.now(),
    schemaVersion: 1,
  };

  // Production fallback path used by getCachePath() in electron/loki/client.ts:
  //   homedir + "/.copilot/m-loki-cache.json"
  const defaultOut = path.join(os.homedir(), ".copilot", "m-loki-cache.json");
  const dest = out ?? defaultOut;

  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, JSON.stringify(cache, null, 2), "utf8");

  console.log(`Wrote m-loki-cache.json -> ${dest}`);
  console.log(`  teamsRelayConfig.wsUrl = ${wsUrl}`);
  console.log(`  flights: ${cache.flights.join(", ")}`);
  console.log("");
  console.log("Restart Microsoft Scout for the Integrations tab to appear.");
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
