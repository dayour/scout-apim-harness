/**
 * m-relay/src/logger.ts
 *
 * Lightweight structured logger.  Writes to stdout with timestamped,
 * labelled lines that land cleanly in DarbotLM gateway logs.
 */

export interface Logger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}

export function createLogger(label: string): Logger {
  function format(level: string, args: unknown[]): string {
    const ts = new Date().toISOString();
    const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    return `[${ts}] [${level.padEnd(5)}] [${label}] ${msg}`;
  }
  return {
    info: (...args) => console.log(format("INFO", args)),
    warn: (...args) => console.warn(format("WARN", args)),
    error: (...args) => console.error(format("ERROR", args)),
    debug: (...args) => console.debug(format("DEBUG", args)),
  };
}
