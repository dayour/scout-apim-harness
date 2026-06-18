/**
 * m-relay/src/loki.ts
 *
 * Builds the Loki configuration response JSON served at:
 *   GET /api/v1/clawpilot/configuration
 *
 * When Scout is launched with:
 *   CLAWPILOT_LOKI_BASE_URL_OVERRIDE=http://<host>:<port>
 * some runtimes route their Loki bootstrap request to this endpoint. The
 * response must keep `lokiUrl` pointed at production Loki so Prepare/Horizon
 * GraphQL never falls through to this APIM relay and returns HTTP 404.
 *
 * This response drives the `teamsRelayConfig.wsUrl` value that makes the
 * Integrations tab Teams Bot section visible.
 *
 * Response schema validated by RawLokiConfigSchema in electron/loki/client.ts.
 */

export interface LokiResponseOptions {
  /** Production Loki base URL used by Prepare/Horizon GraphQL. */
  lokiUrl: string;
  /** ws:// or wss:// URL of the Teams relay WebSocket server. */
  relayWsUrl: string;
  /** Ring name surfaced in Scout diagnostics. Defaults to "Prod". */
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
    lokiUrl: opts.lokiUrl.replace(/\/+$/, ""),
    ring: opts.ring ?? "Prod",
    flights: opts.flights ?? DEFAULT_FLIGHTS,
    settings: {
      teamsRelayConfig: { wsUrl: opts.relayWsUrl },
    },
  });
}
