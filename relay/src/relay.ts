/**
 * m-relay/src/relay.ts
 *
 * WebSocket relay server.  Scout desktop connects here and exchanges messages
 * with the Teams bot via the protocol defined in electron/teams-relay.ts.
 *
 * Protocol (client = Scout desktop, server = this module):
 *   client → server  auth             { type:"auth", userId, token, capabilities? }
 *   server → client  auth_ok          { type:"auth_ok", capabilities }
 *   server → client  message          { type:"message", requestId, text, userId }
 *   client → server  response         { type:"response", requestId, text, done, format? }
 *   client → server  typing           { type:"typing", requestId }
 *   client → server  permission_request { type:"permission_request", requestId, title, message, command, tooltips? }
 *   server → client  permission_response { type:"permission_response", requestId, action }
 *   server closes 4004 when another desktop client connects (displacement).
 */

import { WebSocketServer, WebSocket } from "ws";
import { createLogger } from "./logger.js";

const log = createLogger("Relay");

const REQUEST_TIMEOUT_MS = 120_000;
const PING_INTERVAL_MS = 15_000;
const PONG_TIMEOUT_MS = 10_000;

interface PendingRequest {
  resolve: (text: string | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface RelayServer {
  isDesktopConnected(): boolean;
  sendMessage(requestId: string, text: string, userId: string): Promise<string | null>;
  sendProactive(text: string): boolean;
}

export function createRelayServer(port: number): RelayServer {
  const wss = new WebSocketServer({ port });
  const pendingRequests = new Map<string, PendingRequest>();
  let desktopSocket: WebSocket | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let pongTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers(): void {
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    if (pongTimer) { clearTimeout(pongTimer); pongTimer = null; }
  }

  function startPing(ws: WebSocket): void {
    clearTimers();
    pingTimer = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) { clearTimers(); return; }
      ws.ping();
      pongTimer = setTimeout(() => {
        log.warn("Pong timeout — terminating stale desktop connection");
        ws.terminate();
      }, PONG_TIMEOUT_MS);
    }, PING_INTERVAL_MS);
  }

  function send(ws: WebSocket, payload: object): void {
    ws.send(JSON.stringify(payload));
  }

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (data: Buffer) => {
      let msg: { type: string; [k: string]: unknown };
      try {
        msg = JSON.parse(data.toString()) as typeof msg;
      } catch {
        log.error("Received non-JSON frame — ignoring");
        return;
      }

      switch (msg.type) {
        case "auth": {
          // Displace any existing desktop connection.
          if (desktopSocket && desktopSocket !== ws && desktopSocket.readyState === WebSocket.OPEN) {
            log.info("Displacing previous desktop connection (4004)");
            desktopSocket.close(4004, "Displaced by new connection");
          }
          desktopSocket = ws;
          startPing(ws);
          log.info("Desktop authenticated (userId=desktop)");
          send(ws, { type: "auth_ok", capabilities: ["permission_cards"] });
          break;
        }

        case "response": {
          const { requestId, text, done } = msg as unknown as {
            requestId: string; text: string; done: boolean;
          };
          if (done) {
            const pending = pendingRequests.get(requestId);
            if (pending) {
              clearTimeout(pending.timer);
              pendingRequests.delete(requestId);
              pending.resolve(text || null);
              log.info(`Response delivered [${requestId}] (${text?.length ?? 0} chars)`);
            }
          }
          break;
        }

        case "typing":
          // Acknowledged — could forward a typing indicator to Teams in a future iteration.
          break;

        case "permission_request":
          // TODO: forward to Teams as an Adaptive Card and relay the response back.
          log.info(`Permission request [${(msg as unknown as { requestId: string }).requestId}]: ${(msg as unknown as { command: string }).command}`);
          break;

        default:
          log.warn(`Unknown message type from desktop: ${msg.type}`);
      }
    });

    ws.on("pong", () => {
      if (pongTimer) { clearTimeout(pongTimer); pongTimer = null; }
    });

    ws.on("close", (code: number) => {
      if (desktopSocket === ws) {
        clearTimers();
        desktopSocket = null;
        log.info(`Desktop disconnected (code=${code})`);
        // Resolve any pending requests with null so callers can reply gracefully.
        for (const [id, pending] of pendingRequests) {
          clearTimeout(pending.timer);
          pendingRequests.delete(id);
          pending.resolve(null);
        }
      }
    });

    ws.on("error", (err: Error) => {
      log.error("WebSocket error:", err.message);
    });
  });

  wss.on("listening", () => {
    log.info(`WebSocket relay server listening on port ${port}`);
  });

  return {
    isDesktopConnected(): boolean {
      return desktopSocket?.readyState === WebSocket.OPEN;
    },

    sendMessage(requestId: string, text: string, userId: string): Promise<string | null> {
      const ws = desktopSocket;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.resolve(null);
      }

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            log.warn(`Request timed out [${requestId}]`);
            resolve(null);
          }
        }, REQUEST_TIMEOUT_MS);

        pendingRequests.set(requestId, { resolve, timer });
        send(ws, { type: "message", requestId, text, userId });
        log.info(`Forwarded to desktop [${requestId}] from userId=${userId} (${text.length} chars)`);
      });
    },

    sendProactive(text: string): boolean {
      const ws = desktopSocket;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      send(ws, { type: "proactive", text, format: "markdown" });
      return true;
    },
  };
}
