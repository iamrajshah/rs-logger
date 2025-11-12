import {
  createLogger as winstonCreateLogger,
  format,
  transports,
  Logger as WinstonLogger,
} from "winston";
import TransportStream = require("winston-transport");

const {
  combine,
  timestamp,
  printf,
  errors: formatErrors,
  metadata: formatMetadata,
} = format;

export interface ILogConfiguration {
  APP_NAME: string;
  ENV: string;
  LOG_DIR?: string;
  LOG_LEVEL?: string;
  pretty?: boolean; // pretty-print in non-prod
}

// Safe stringify that handles Errors and circular references
function safeStringify(value: unknown): string {
  const seen = new WeakSet();

  function replacer(_key: string, val: any) {
    if (val instanceof Error) {
      const errorProps: Record<string, any> = {
        name: val.name,
        message: val.message,
        stack: val.stack,
      };
      // copy enumerable + non-enumerable own props
      for (const k of Object.getOwnPropertyNames(val)) {
        if (k in errorProps) continue;
        try {
          errorProps[k] = (val as any)[k];
        } catch {
          errorProps[k] = "[unserializable]";
        }
      }
      return errorProps;
    }

    if (val && typeof val === "object") {
      if (seen.has(val)) return "[Circular]";
      seen.add(val);
    }
    return val;
  }

  try {
    return JSON.stringify(value, replacer, 2);
  } catch {
    return String(value);
  }
}

function createTransports(_service: string): TransportStream[] {
  // Keep transports minimal by default. Users can pass custom transports.
  return [new transports.Console()];
}

export type LogLevel =
  | "error"
  | "warn"
  | "info"
  | "http"
  | "verbose"
  | "debug"
  | "silly";

const defaultCfg: ILogConfiguration = {
  APP_NAME: "rs-logger",
  ENV: process.env.NODE_ENV || "development",
  LOG_DIR: "./logs",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  pretty: (process.env.NODE_ENV || "development") !== "production",
};
export class RSLogger {
  public logger: WinstonLogger | undefined;
  public config: ILogConfiguration | undefined;

  constructor() {
    this.config = { ...defaultCfg };
    this.logger = this.createWinstonLogger(this.config);
  }

  init(config: Partial<ILogConfiguration>) {
    this.config = (config as ILogConfiguration) || defaultCfg;
    this.logger = this.createWinstonLogger(this.config);
  }

  private createWinstonLogger(cfg: ILogConfiguration): WinstonLogger {
    const pretty = cfg.pretty && cfg.ENV !== "production";

    const jsonFormat = combine(
      formatErrors({ stack: true }),
      formatMetadata({
        fillExcept: ["message", "level", "timestamp", "service"],
      }),
      timestamp(),
      printf((info) => {
        // info.message may already be a string or an object
        const message =
          typeof info.message === "string"
            ? info.message
            : safeStringify(info.message);
        // Prefer info.stack (added by format.errors), fallback to message.stack or metadata.error.stack
        const stackSource =
          (info as any).stack ||
          (info.message && (info.message as any).stack
            ? (info.message as any).stack
            : undefined) ||
          ((info as any).metadata &&
          (info as any).metadata.error &&
          (info as any).metadata.error.stack
            ? (info as any).metadata.error.stack
            : undefined);
        const stack = stackSource ? `\n${stackSource}` : "";
        const meta =
          (info as any).metadata && Object.keys((info as any).metadata).length
            ? `\nmeta: ${safeStringify((info as any).metadata)}`
            : "";
        return `${info.timestamp} [${info.level}] ${info.service || cfg.APP_NAME} - ${message}${stack}${meta}`;
      })
    );

    const prettyFormat = combine(
      formatErrors({ stack: true }),
      timestamp(),
      printf((info) => {
        const message =
          typeof info.message === "string"
            ? info.message
            : safeStringify(info.message);
        const stack = (info as any).stack ? `\n${(info as any).stack}` : "";
        const meta =
          (info as any).metadata && Object.keys((info as any).metadata).length
            ? `\nmeta: ${safeStringify((info as any).metadata)}`
            : "";
        return `${info.timestamp} [${info.level}] ${info.service || cfg.APP_NAME} - ${message}${stack}${meta}`;
      })
    );

    const chosenFormat = pretty ? prettyFormat : jsonFormat;

    const logger = winstonCreateLogger({
      level: cfg.LOG_LEVEL || "info",
      format: chosenFormat,
      defaultMeta: { service: `${cfg.ENV}-${cfg.APP_NAME}` },
      transports: createTransports(cfg.APP_NAME),
    });

    return logger;
  }

  public child(defaults: Record<string, unknown>): RSLogger {
    // Create a child logger that inherits transports and level but has default meta
    const childLogger = new RSLogger();
    // merge defaultMeta
    childLogger.logger = this.logger?.child({
      ...((this.logger as any).defaultMeta || {}),
      ...defaults,
    });
    return childLogger;
  }

  public error(...args: unknown[]): void {
    const { message, meta } = this.normalizeArgs(args);

    console.log(
      message,
      meta,
      typeof message,
      typeof meta,
      meta instanceof Error
    );
    if (typeof message === "string") {
      this.logger?.log({ level: "error", message, ...(meta || {}) });
    } else {
      this.logger?.log({
        level: "error",
        message: safeStringify(message),
        meta: { ...(meta || {}), payload: message },
      });
    }
  }

  public warn(...args: unknown[]): void {
    const { message, meta } = this.normalizeArgs(args);
    if (typeof message === "string") {
      this.logger?.log({ level: "warn", message, ...(meta || {}) });
    } else {
      this.logger?.log({
        level: "warn",
        message: safeStringify(message),
        meta: { ...(meta || {}), payload: message },
      });
    }
  }

  public info(...args: unknown[]): void {
    const { message, meta } = this.normalizeArgs(args);
    if (typeof message === "string") {
      this.logger?.log({ level: "info", message, ...(meta || {}) });
    } else {
      this.logger?.log({
        level: "info",
        message: safeStringify(message),
        meta: { ...(meta || {}), payload: message },
      });
    }
  }

  public verbose(...args: unknown[]): void {
    const { message, meta } = this.normalizeArgs(args);
    if (typeof message === "string") {
      this.logger?.log({ level: "verbose", message, ...(meta || {}) });
    } else {
      this.logger?.log({
        level: "verbose",
        message: safeStringify(message),
        meta: { ...(meta || {}), payload: message },
      });
    }
  }

  public debug(...args: unknown[]): void {
    const { message, meta } = this.normalizeArgs(args);
    if (typeof message === "string") {
      this.logger?.log({ level: "debug", message, ...(meta || {}) });
    } else {
      this.logger?.log({
        level: "debug",
        message: safeStringify(message),
        meta: { ...(meta || {}), payload: message },
      });
    }
  }

  // Normalize arguments -> { message: string | object, meta?: object }
  private normalizeArgs(args: unknown[]): {
    message: string | object;
    meta?: object;
  } {
    // common patterns: (msg), (msg, meta), (error), (error, meta)
    if (args.length === 0) return { message: "" };

    const first = args[0];
    const rest = args.slice(1);

    if (first instanceof Error) {
      const err = first as Error;
      const errorObj = {
        name: err.name,
        message: err.message,
        stack: err.stack,
        ...extractOwnProps(err),
      };
      const meta = rest.length ? { extra: rest } : undefined;
      return {
        message: errorObj.message || err.name,
        meta: { error: errorObj, ...(meta || {}) },
      };
    }

    if (typeof first === "string") {
      if (rest.length === 0) return { message: first };
      // if second arg is object, treat as meta
      if (rest.length === 1 && typeof rest[0] === "object")
        return { message: first, meta: rest[0] as object };
      // otherwise join everything
      return {
        message: [first, ...rest]
          .map((x) => (typeof x === "string" ? x : safeStringify(x)))
          .join(" "),
      };
    }

    // first is object or other
    if (typeof first === "object") {
      const combined = Object.assign(
        {},
        ...([first, ...rest].filter((x) => typeof x === "object") as object[])
      );
      return { message: combined };
    }

    // fallback to safe string
    return { message: safeStringify(args) };
  }

  public async flush(timeoutMs = 2000): Promise<void> {
    // Winston logger.close() will flush and close transports; not all transports implement events
    return new Promise((resolve) => {
      try {
        // some transports support .flush or .on('finish'). We'll call close and resolve quickly
        (this.logger as any).close?.();
      } catch (e) {
        // ignore
      }
      // best-effort wait to let transports flush
      setTimeout(resolve, timeoutMs);
    });
  }
}

function extractOwnProps(err: Error): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.getOwnPropertyNames(err)) {
    try {
      (out as any)[k] = (err as any)[k];
    } catch {
      (out as any)[k] = "[unserializable]";
    }
  }
  return out;
}

// default exported instance for convenience
const defaultLogger = new RSLogger();
export default defaultLogger;
