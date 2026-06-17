/**
 * m-relay/src/loki.ts
 *
 * Builds the Loki configuration response JSON served at:
 *   GET /api/v1/clawpilot/configuration
 *
 * When Scout is launched with:
 *   CLAWPILOT_LOKI_BASE_URL_OVERRIDE=http://<host>:<port>
 * it routes its Loki bootstrap request to this endpoint, bypassing
 * Microsoft's 1P Loki service and the token acquisition that fails for
 * external (Example tenant) tenants.
 *
 * This response drives the `teamsRelayConfig.wsUrl` value that makes the
 * Integrations tab Teams Bot section visible.
 *
 * Response schema validated by RawLokiConfigSchema in electron/loki/client.ts.
 */

export interface LokiResponseOptions {
  /** ws:// or wss:// URL of the running m-relay WebSocket server. */
  relayWsUrl: string;
  /** Host header value from the incoming request (used as lokiUrl base). */
  host: string;
  /** Ring name surfaced in Scout diagnostics. Defaults to "local". */
  ring?: string;
  /** Flights to advertise. Defaults to the standard set. */
  flights?: string[];
}

const DEFAULT_FLIGHTS = [
  "EnableHorizon",
  "EnableDiagnostics",
  "EnableCloudSync",
  "EnableMemora",
  "EnableOpenClawRuntime",
  "ShowExperiments",
  "experiments.teamsbriefs",
];

/**
 * Returns the serialised JSON body for the Loki configuration endpoint.
 */
export function buildLokiResponse(opts: LokiResponseOptions): string {
  return JSON.stringify({
    lokiUrl: `http://${opts.host}`,
    ring: opts.ring ?? "local",
    flights: opts.flights ?? DEFAULT_FLIGHTS,
    settings: {
      teamsRelayConfig: { wsUrl: opts.relayWsUrl },
    },
  });
}
